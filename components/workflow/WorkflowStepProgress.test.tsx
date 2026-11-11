import { act, forwardRef, useState, type ComponentProps, type ReactNode } from 'react';
import classes from './WorkflowStepProgress.module.scss';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, TextInput } from '@mantine/core';
import { useForm, type UseFormReturnType } from '@mantine/form';
import type {
  StepDefinationInformationDto,
  WorkflowInformationDto,
} from '@/_api/_core/api-gen/types';
import { theme } from '@/_assets/style/theme';
import { TASK_WORKFLOW_STEP_BADGE_COLOR } from '@/_common/tasks/presentation';
import { TaskWorkflowStep, WorkflowStatusEnum, WorkflowStep } from '@/_common/workflow';
import {
  WorkflowApproverStatusEnum,
  type WorkflowTimelineItemModel,
} from '@/_hooks/_modules/workflow/workflow-view-model.types';
import {
  buildTimelineItems,
  buildWorkflowCards,
} from '@/_hooks/_modules/workflow/workflow-view-model.utils';
import i18n from '@/_i18n/config';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import { WorkflowStepProgress } from './WorkflowStepProgress';
import { WorkflowWorkStartButton } from './WorkflowWorkStartButton';

const mocks = vi.hoisted(() => ({
  boxRender: vi.fn(),
  cardRender: vi.fn(),
  openTooltips: false,
  slaCountdown: vi.fn(),
  tooltipRender: vi.fn(),
}));
vi.mock('@mantine/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mantine/core')>();
  type TrackedBoxProps = { className?: string; 'data-state'?: string; children?: ReactNode };

  return {
    ...actual,
    Box: forwardRef<HTMLDivElement, TrackedBoxProps>((props, ref) => {
      mocks.boxRender(props.className, props['data-state']);
      return <actual.Box {...props} ref={ref} />;
    }),
    Tooltip: (props: ComponentProps<typeof actual.Tooltip>) => {
      mocks.tooltipRender(props.label);
      return <actual.Tooltip {...props} opened={mocks.openTooltips || undefined} />;
    },
  };
});
vi.mock('@/_hooks/_modules/workflow/use-workflow-sla-countdown', () => ({
  useWorkflowSlaCountdown: mocks.slaCountdown,
}));
vi.mock('./cards', () => ({
  CardContent: ({ card }: { card: { title: string } }) => {
    mocks.cardRender(card.title);
    return <span>card</span>;
  },
}));

const createTimelineItem = (
  item: Pick<WorkflowTimelineItemModel, 'key' | 'stepDefinitionName' | 'statusLabel'> &
    Partial<WorkflowTimelineItemModel>
): WorkflowTimelineItemModel => ({
  card: { kind: 'person', title: `${item.stepDefinitionName} onaycısı`, subtitle: 'Birim' },
  date: '',
  statusColor: 'gray',
  ...item,
});

const tooltipWith = (name: string, statusLabel: string, slaText?: string) =>
  expect.objectContaining({
    props: expect.objectContaining({ name, statusLabel, ...(slaText ? { slaText } : {}) }),
  });

// Zaman çizelgesi en yeniden eskiye sıralıdır (buildTimelineItems ile aynı)
const startedTimelineItems = [
  createTimelineItem({
    key: 'current',
    stepDefinitionName: 'Kapsam Kontrol',
    statusLabel: 'Onay Bekleniyor',
  }),
  createTimelineItem({
    key: 'history-2',
    note: 'Kapsam bilgileri eksik',
    stepDefinitionName: 'Yönetici Kontrol ve Onay',
    statusLabel: 'İade Edildi',
    statusValue: WorkflowApproverStatusEnum.Reject,
  }),
  createTimelineItem({
    key: 'history-1',
    stepDefinitionName: 'Talep Girişi',
    statusLabel: 'Akış Başlatıldı',
    statusValue: WorkflowApproverStatusEnum.Approved,
  }),
];

const serviceStepDefinitions: StepDefinationInformationDto[] = [
  { Name: 'Alfa Test', Order: 40 },
  { Name: 'Kapsam Kontrol', Order: 20 },
  { Name: 'Üretime Alma', Order: 50 },
  { Name: 'Talep Girişi', Order: 0 },
  { Name: 'Yazılım Geliştirme', Order: 30 },
  { Name: 'Yönetici Kontrol ve Onay', Order: 10 },
];

type CountdownSnapshot = {
  remainingSeconds: number | null;
  slaCountdown: string | null;
  slaCountdownColor: string | null;
};

describe('WorkflowStepProgress', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let tickClock: ((snapshot: CountdownSnapshot) => void) | undefined;

  const mockTickingClock = (initial: CountdownSnapshot) => {
    mocks.slaCountdown.mockImplementation(({ enabled }: { enabled: boolean }) => {
      const [snapshot, setSnapshot] = useState(initial);
      tickClock = setSnapshot;
      return enabled
        ? snapshot
        : { remainingSeconds: null, slaCountdown: null, slaCountdownColor: null };
    });
  };

  const render = (props: ComponentProps<typeof WorkflowStepProgress>) => {
    act(() =>
      root.render(
        <MantineProvider env="test" theme={theme}>
          <WorkflowStepProgress {...props} />
        </MantineProvider>
      )
    );
  };

  // Şeritteki bölümler boş kutulardır; adım kartları adı başlık olarak taşır
  const getStepCards = () =>
    Array.from(container.querySelectorAll<HTMLElement>('[data-state]')).filter((element) =>
      element.querySelector('[title]')
    );
  const getStepName = (card: HTMLElement) =>
    card.querySelector(`.${classes.stepNames} > .${classes.stepName}`)?.getAttribute('title');

  const mockNoteMeasurements = (dimensions: {
    clientWidth: number;
    clientHeight: number;
    scrollHeight: number;
  }) => {
    for (const property of ['clientWidth', 'clientHeight', 'scrollHeight'] as const) {
      vi.spyOn(HTMLElement.prototype, property, 'get').mockImplementation(function (
        this: HTMLElement
      ) {
        return this.classList.contains(classes.noteMeasure) ? dimensions[property] : 0;
      });
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useModalStore.setState({ currentModals: [] });
    mocks.openTooltips = false;
    tickClock = undefined;
    mocks.slaCountdown.mockReturnValue({
      remainingSeconds: null,
      slaCountdown: null,
      slaCountdownColor: null,
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([0, 1, 6])('renders one work action below returns and history (%s entries)', (count) => {
    const onStart = vi.fn();
    render({
      currentStepCode: 'ScopeControl',
      currentStepName: 'Kapsam Kontrol',
      currentStepOrder: 20,
      workflowStatus: WorkflowStatusEnum.Runnable,
      stepDefinitions: serviceStepDefinitions,
      timelineItems: [
        startedTimelineItems[0],
        ...(count ? [startedTimelineItems[1]] : []),
        ...Array.from({ length: count }, (_, index) =>
          createTimelineItem({
            key: `scope-${index}`,
            stepDefinitionName: 'Kapsam Kontrol',
            statusLabel: 'Onaylandı',
            statusValue: WorkflowApproverStatusEnum.Approved,
          })
        ),
      ],
      currentStepAction: <WorkflowWorkStartButton onClick={onStart} />,
    });
    expect(container.querySelectorAll('#workflow-button-startWork')).toHaveLength(1);
    const button = container.querySelector<HTMLButtonElement>('#workflow-button-startWork')!;
    const card = getStepCards().find((item) => item.dataset.state === 'current')!;
    expect(card.lastElementChild?.contains(button)).toBe(true);
    expect(button.closest('[data-state="current"]')).toBe(card);
    for (const section of card.querySelectorAll(`.${classes.currentReturn}, section`)) {
      expect(
        section.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    }
    if (count) {
      expect(card.querySelector(`.${classes.currentReturn}`)).not.toBeNull();
      expect(card.querySelector('section')).not.toBeNull();
    }
    act(() => button.click());
    expect(onStart).toHaveBeenCalledOnce();
  });

  it.each([WorkflowStatusEnum.Completed, WorkflowStatusEnum.Cancel])(
    'does not render the current action in a terminal flow (%s)',
    (status) => {
      render({
        currentStepName: 'Kapsam Kontrol',
        currentStepCode: 'ScopeControl',
        workflowStatus: status,
        timelineItems: startedTimelineItems,
        currentStepAction: <WorkflowWorkStartButton onClick={vi.fn()} />,
      });
      expect(container.querySelector('#workflow-button-startWork')).toBeNull();
      expect(
        container.querySelector<HTMLElement>('[data-testid="workflow-step-progress"]')?.dataset
          .expanded
      ).toBeUndefined();
    }
  );

  it('keeps operational fulfilment active until OperationalCompleted', () => {
    render({
      currentStepCode: 'OperationalDone',
      currentStepId: 45,
      currentStepName: 'Yerine Getirme',
      workflowStatus: WorkflowStatusEnum.Runnable,
      stepDefinitions: [
        { Code: 'OperationalDone', Name: 'Yerine Getirme', Order: 8 },
        { Code: 'OperationalAcceptenceTest', Name: 'Kabul Test', Order: 9 },
        { Code: 'OperationalCompleted', Name: 'Tamamlandı', Order: 10 },
      ],
    });
    const cards = getStepCards();
    expect(cards.map(getStepName)).toEqual(['Yerine Getirme', 'Kabul Test', 'Tamamlandı']);
    expect(cards.map((card) => card.dataset.state)).toEqual(['current', 'upcoming', 'upcoming']);
  });

  it('adds only the completion fallback when future service definitions are absent', () => {
    render({
      currentStepId: WorkflowStep.ScopeControl,
      currentStepName: 'Kapsam Kontrol',
      timelineItems: startedTimelineItems,
    });

    const cards = getStepCards();

    expect(cards.map(getStepName)).toEqual([
      'Talep Girişi',
      'Yönetici Kontrol ve Onay',
      'Kapsam Kontrol',
      'Tamamlandı',
    ]);
    expect(cards.map((card) => card.dataset.state)).toEqual([
      'done',
      'done',
      'current',
      'upcoming',
    ]);
    expect(cards.filter((card) => card.dataset.state === 'upcoming').map(getStepName)).toEqual([
      'Tamamlandı',
    ]);
    expect(container.textContent).toContain('3/4');
    expect(container.textContent).toContain('Kapsam bilgileri eksik');
  });

  it.each([
    'Completed',
    'OperationalCompleted',
    'AnalysisCompleted',
    'TestCompleted',
    'DevelopmentCompleted',
  ])('recognizes completion by service code %s without an ID or Order', (currentStepCode) => {
    render({
      currentStepCode,
      currentStepName: 'Tamamlandı',
      workflowStatus: WorkflowStatusEnum.Runnable,
      timelineItems: [
        createTimelineItem({
          key: 'last-approval',
          stepDefinitionName: 'Son Onay',
          statusLabel: 'Onaylandı',
          statusValue: WorkflowApproverStatusEnum.Approved,
        }),
      ],
    });
    const cards = getStepCards();
    expect(cards.map(getStepName)).toEqual(['Son Onay', 'Tamamlandı']);
    expect(cards.at(-1)?.dataset.state).toBe('done');
    expect(cards.at(-1)?.querySelector<HTMLElement>(`.${classes.dot}`)?.style.background).toContain(
      '--mantine-color-green'
    );
    expect(cards.at(-1)?.querySelector(`.${classes.person}`)).toBeNull();
    expect(cards.at(-1)?.querySelector(`.${classes.stepDate}`)).toBeNull();
    expect(container.querySelector('[data-state="current"]')).toBeNull();
    expect(container.textContent).toContain('2/2');
    expect(mocks.slaCountdown).toHaveBeenCalledWith({
      targetStartDate: undefined,
      targetEndDate: undefined,
      enabled: false,
    });
  });

  it.each([
    'Completed',
    'OperationalCompleted',
    'AnalysisCompleted',
    'TestCompleted',
    'DevelopmentCompleted',
  ])('reuses service completion %s without Order and preserves its real activity', (Code) => {
    const name = 'Servisten Gelen Tamamlanma';
    render({
      currentStepCode: Code,
      currentStepName: 'Kapsam Kontrol',
      workflowStatus: WorkflowStatusEnum.Completed,
      stepDefinitions: [...serviceStepDefinitions, { Code, Name: name }],
      timelineItems: [
        createTimelineItem({
          key: 'completed-activity',
          stepDefinitionName: name,
          statusLabel: 'Onaylandı',
          statusValue: WorkflowApproverStatusEnum.Approved,
          date: '02.10.2026 14:00',
          card: { kind: 'person', title: 'Gerçek Onaycı', subtitle: 'Gerçek Birim' },
        }),
        ...startedTimelineItems.slice(1),
      ],
    });
    const cards = getStepCards();
    expect(getStepName(cards.at(-1)!)).toBe(name);
    expect(cards.filter((card) => getStepName(card) === name)).toHaveLength(1);
    expect(cards.filter((card) => getStepName(card) === 'Tamamlandı')).toHaveLength(0);
    expect(cards.at(-1)?.textContent).toContain('Gerçek Onaycı');
    expect(cards.at(-1)?.textContent).toContain('02.10.2026 14:00');
  });

  it('keeps the service completion last even if its Order places it before the active step', () => {
    render({
      currentStepName: 'Kapsam Kontrol',
      currentStepOrder: 20,
      stepDefinitions: [
        { Code: 'Completed', Name: 'Tamamlandı', Order: -1 },
        ...serviceStepDefinitions,
      ],
      timelineItems: startedTimelineItems,
    });
    const cards = getStepCards();
    expect(getStepName(cards.at(-1)!)).toBe('Tamamlandı');
    expect(cards.at(-1)?.dataset.state).toBe('upcoming');
    expect(cards.filter((card) => getStepName(card) === 'Tamamlandı')).toHaveLength(1);
    expect(cards.findIndex((card) => card.dataset.state === 'current')).toBe(2);
    expect(container.textContent).toContain('3/7');
  });

  it('does not confuse a completion ID with the active service Order', () => {
    render({
      currentStepCode: 'Versioning',
      currentStepId: WorkflowStep.Versioning,
      currentStepName: 'Sürümleme',
      currentStepOrder: WorkflowStep.Completed,
      workflowStatus: WorkflowStatusEnum.Runnable,
      stepDefinitions: [{ Code: 'Versioning', Name: 'Sürümleme', Order: WorkflowStep.Completed }],
    });
    expect(getStepCards().map((card) => card.dataset.state)).toEqual(['current', 'upcoming']);
    expect(getStepCards().at(-1)?.querySelector(`.${classes.stepHead}`)?.textContent).toBe(
      'Sırada'
    );
  });

  it('leaves completion inactive after cancellation even if NextStep contains a completion code', () => {
    render({
      currentStepCode: 'Completed',
      currentStepName: 'Tamamlandı',
      workflowStatus: WorkflowStatusEnum.Cancel,
      timelineItems: [
        createTimelineItem({
          key: 'cancel',
          stepDefinitionName: 'Üretime Alma',
          statusLabel: 'İptal Edildi',
          statusValue: WorkflowApproverStatusEnum.Cancel,
          note: 'İptal açıklaması',
        }),
      ],
    });
    const last = getStepCards().at(-1)!;
    expect(getStepName(last)).toBe('Tamamlandı');
    expect(last.dataset.state).toBe('inactive');
    expect(last.querySelector(`.${classes.stepHead}`)?.textContent).toBe('İşlemde Değil');
    expect(last.querySelector<HTMLElement>(`.${classes.dot}`)?.style.background).toBe('');
    expect(container.textContent).toContain('1/2');
  });

  it('uses the service code instead of a stale detail ID or display name', () => {
    render({
      currentStepCode: 'AlfaTest',
      currentStepId: WorkflowStep.Completed,
      currentStepName: 'Eski adım adı',
      workflowStatus: WorkflowStatusEnum.Runnable,
      stepDefinitions: [
        { Code: 'AlfaTest', Name: 'Alfa Test', Order: 16 },
        { Code: 'Versioning', Name: 'Sürümleme', Order: 21 },
      ],
    });
    const cards = getStepCards();
    expect(cards.map(getStepName)).toEqual(['Alfa Test', 'Sürümleme', 'Tamamlandı']);
    expect(cards.map((card) => card.dataset.state)).toEqual(['current', 'upcoming', 'upcoming']);
    expect(container.textContent).not.toContain('Eski adım adı');
  });

  it('uses the localized completion label when the completion code has no name or history', () => {
    render({ currentStepCode: 'AnalysisCompleted', workflowStatus: WorkflowStatusEnum.Runnable });

    expect(getStepCards().map(getStepName)).toEqual(['Tamamlandı']);
    expect(getStepCards()[0].dataset.state).toBe('done');
    expect(container.textContent).toContain('1/1');
    expect(container.textContent).not.toContain('Talep Giriş');
  });

  it('shows AlfaTest at 16/22 for the shared service definition sequence', () => {
    const definitions = [
      ['IssueEntry', 'Talep Giriş'],
      ['ManagerControlAndApprove', 'Yönetici Kontrol ve Onay'],
      ['ScopeControl', 'Kapsam Kontrol'],
      ['IssueQualityControl', 'İç Kontrol Görüşü'],
      ['PoolPlanning', 'Havuz Planlama'],
      ['ProjectPlanningEstimate', 'Proje Planlama Tahmini'],
      ['ScopeDetailing', 'Kapsam Detaylandırma'],
      ['Analysis', 'Analiz'],
      ['AnalysisEfortControl', 'Analiz Kontrol'],
      ['PlanningDefinitive', 'Planlama Kesin'],
      ['CreateTestScenario', 'Test Senaryosu Oluşturma'],
      ['AnalysisScenarioQualityControl', 'Analiz ve Senaryo Kalite Kontrol'],
      ['BtSecurityApprove', 'BT Güvenlik Onay'],
      ['AnalysisScenarioApprove', 'Analiz ve Senaryo Onay'],
      ['SoftwareDevelopment', 'Yazılım Geliştirme'],
      ['AlfaTest', 'Alfa Test'],
      ['AlfaTestControl', 'Alfa Test Kontrol'],
      ['AcceptanceTest', 'Kabul Test'],
      ['AcceptanceApprovalControl', 'Kabul Test Kontrol'],
      ['Production', 'Üretime Alma'],
      ['Versioning', 'Sürümleme'],
    ].map(([Code, Name], index) => ({ Code, Name, Order: index + 1 }));
    const response = {
      Status: WorkflowStatusEnum.Runnable,
      NextStep: {
        StepDefinationCode: 'AlfaTest',
        StepDefinationName: 'Alfa Test',
        StepDefinationOrder: 16,
      },
      StepDefinations: definitions,
    } satisfies WorkflowInformationDto;

    render({
      currentStepCode: response.NextStep.StepDefinationCode,
      currentStepName: response.NextStep.StepDefinationName,
      currentStepOrder: response.NextStep.StepDefinationOrder,
      stepDefinitions: response.StepDefinations,
      workflowStatus: response.Status,
      timelineItems: definitions
        .slice(0, 15)
        .reverse()
        .map((definition) =>
          createTimelineItem({
            key: `history-${definition.Code}`,
            stepDefinitionName: definition.Name,
            statusLabel: 'Onaylandı',
            statusValue: WorkflowApproverStatusEnum.Approved,
          })
        ),
    });

    const cards = getStepCards();
    expect(container.textContent).toContain('16/22');
    expect(cards.map(getStepName)).toEqual([...definitions.map(({ Name }) => Name), 'Tamamlandı']);
    expect(cards[15].dataset.state).toBe('current');
    expect(cards.slice(16).every((card) => card.dataset.state === 'upcoming')).toBe(true);
  });

  it('updates the completion state when only the service code changes', () => {
    const props = {
      currentStepName: 'Tamamlandı',
      workflowStatus: WorkflowStatusEnum.Runnable,
      timelineItems: startedTimelineItems.slice(1),
    };
    render(props);
    expect(getStepCards().at(-1)?.dataset.state).toBe('upcoming');

    render({ ...props, currentStepCode: 'Completed' });
    expect(getStepCards().at(-1)?.dataset.state).toBe('done');
    expect(getStepCards().filter((card) => getStepName(card) === 'Tamamlandı')).toHaveLength(1);

    render({ ...props, currentStepCode: 'UnknownCompleted' });
    expect(getStepCards().at(-1)?.dataset.state).toBe('upcoming');
  });

  it.each([
    [WorkflowApproverStatusEnum.Cancel, 'İptal Edildi', null],
    [WorkflowApproverStatusEnum.Reject, 'İade Edildi', '-00:00:01:00'],
    [WorkflowApproverStatusEnum.Approved, 'Onaylandı', '00:00:01:00'],
  ] as const)(
    'stacks tooltip details below the bold step name (status: %s)',
    (statusValue, statusLabel, slaCountdown) => {
      mocks.openTooltips = true;
      mocks.slaCountdown.mockReturnValue({
        remainingSeconds: 60,
        slaCountdown,
        slaCountdownColor: 'green.6',
      });
      render({
        currentStepName: 'Kapsam Kontrol',
        currentStepOrder: 20,
        stepDefinitions: serviceStepDefinitions,
        timelineItems: [
          startedTimelineItems[0],
          { ...startedTimelineItems[1], statusValue, statusLabel },
          startedTimelineItems[2],
        ],
      });

      for (const [name, details] of [
        ['Yönetici Kontrol ve Onay', [statusLabel]],
        ['Kapsam Kontrol', ['Onay Bekleniyor', ...(slaCountdown ? [`SLA: ${slaCountdown}`] : [])]],
        ['Üretime Alma', ['Sırada']],
      ] as const) {
        const title = Array.from(
          document.querySelectorAll<HTMLElement>('[role="tooltip"] strong')
        ).find((element) => element.textContent === name);
        expect(title).toBeDefined();
        expect(title?.style.fontWeight).toBe('700');
        expect(title?.parentElement?.className).toContain('mantine-Stack-root');
        expect(
          Array.from(title?.parentElement?.children ?? [], (line) => line.textContent)
        ).toEqual([name, ...details]);
        expect(title?.closest('[role="tooltip"]')?.textContent).not.toContain(' · ');
      }
    }
  );

  it.each([20, undefined])(
    'orders actual service definitions and shows upcoming steps (current order: %s)',
    (currentStepOrder) => {
      const definitions = serviceStepDefinitions.map((definition) =>
        Object.freeze({ ...definition })
      );
      const originalDefinitions = structuredClone(definitions);
      Object.freeze(definitions);
      render({
        currentStepName: 'Kapsam Kontrol',
        currentStepOrder,
        stepDefinitions: definitions,
        timelineItems: startedTimelineItems,
      });

      const cards = getStepCards();
      expect(cards.map(getStepName)).toEqual([
        'Talep Girişi',
        'Yönetici Kontrol ve Onay',
        'Kapsam Kontrol',
        'Yazılım Geliştirme',
        'Alfa Test',
        'Üretime Alma',
        'Tamamlandı',
      ]);
      expect(cards.map((card) => card.dataset.state)).toEqual([
        'done',
        'done',
        'current',
        'upcoming',
        'upcoming',
        'upcoming',
        'upcoming',
      ]);
      expect(container.textContent).toContain('3/7');
      for (const card of cards.slice(3)) {
        expect(card.querySelector(`.${classes.stepHead}`)?.textContent).toBe('Sırada');
        expect(card.querySelector(`.${classes.person}`)).toBeNull();
        expect(card.querySelector('section')).toBeNull();
      }
      expect(mocks.tooltipRender).toHaveBeenCalledWith(tooltipWith('Üretime Alma', 'Sırada'));
      expect(definitions).toEqual(originalDefinitions);
    }
  );

  it("keeps only each upcoming step's own activity and preserves it on re-entry", () => {
    const timelineItems = [
      startedTimelineItems[0],
      createTimelineItem({
        key: 'development-return',
        stepDefinitionName: 'Yazılım Geliştirme',
        statusLabel: 'İade Edildi',
        statusValue: WorkflowApproverStatusEnum.Reject,
        date: '02.10.2026 12:19',
        note: 'Kapsam eksik',
        card: { kind: 'person', title: 'Son iade eden', subtitle: 'Birim' },
      }),
      createTimelineItem({
        key: 'alpha-return',
        stepDefinitionName: 'Alfa Test',
        statusLabel: 'İade Edildi',
        statusValue: WorkflowApproverStatusEnum.Reject,
        date: '01.10.2026 15:00',
        note: 'Geliştirme eksik',
        card: { kind: 'person', title: 'Test onaycısı', subtitle: 'Birim' },
      }),
      createTimelineItem({
        key: 'development-approved',
        stepDefinitionName: 'Yazılım Geliştirme',
        statusLabel: 'Onaylandı',
        statusValue: WorkflowApproverStatusEnum.Approved,
        date: '01.10.2026 13:00',
        card: { kind: 'person', title: 'Önceki onaycı', subtitle: 'Birim' },
      }),
      createTimelineItem({
        key: 'scope-approved',
        stepDefinitionName: 'Kapsam Kontrol',
        statusLabel: 'Onaylandı',
        statusValue: WorkflowApproverStatusEnum.Approved,
      }),
      startedTimelineItems[1],
      startedTimelineItems[2],
    ];
    const props = {
      currentStepName: 'Kapsam Kontrol',
      currentStepOrder: 20,
      stepDefinitions: serviceStepDefinitions,
      timelineItems,
    };
    render(props);

    const cards = getStepCards();
    const development = cards.find((card) => getStepName(card) === 'Yazılım Geliştirme')!;
    expect(development.dataset.state).toBe('upcoming');
    expect(development.querySelector(`.${classes.stepHead}`)?.textContent).toBe('Sırada');
    expect(development.querySelector(`.${classes.person}`)).toBeNull();
    expect(development.querySelector(':scope > [data-action]')).toBeNull();
    expect(development.querySelector('[data-return-target]')).toBeNull();
    const events = development.querySelectorAll('[role="listitem"]');
    expect(events).toHaveLength(2);
    expect(events[0].textContent).toContain('İade Edildi02.10.2026 12:19·Son iade eden');
    expect(events[0].textContent).toContain('İade Edilen Adım: Kapsam Kontrol');
    expect(events[0].textContent).toContain('İade Nedeni: Kapsam eksik');
    expect(events[1].textContent).toContain('Onaylandı01.10.2026 13:00·Önceki onaycı');
    expect(events[1].textContent).not.toContain('İade Edilen Adım');
    expect(development.querySelector('section')?.textContent).not.toContain('İadenin Geldiği Adım');
    expect(development.querySelector('section')?.textContent).not.toContain('Geliştirme eksik');
    const alpha = cards.find((card) => getStepName(card) === 'Alfa Test')!;
    const alphaHistory = alpha.querySelector('section');
    expect(alphaHistory?.textContent).toContain('İade Edilen Adım: Yazılım Geliştirme');
    expect(alphaHistory?.textContent).toContain('İade Nedeni: Geliştirme eksik');
    const scope = cards.find((card) => card.dataset.state === 'current')!;
    expect(scope.querySelector(`.${classes.currentReturn}`)?.textContent).toContain(
      'İadenin Geldiği Adım: Yazılım Geliştirme'
    );
    expect(scope.querySelector('section')?.textContent).not.toContain('İadenin Geldiği Adım');
    expect(container.querySelector('[role="img"] [data-returned]')).not.toBeNull();
    const upcomingSegments = container.querySelectorAll<HTMLElement>(
      '[role="img"] [data-state="upcoming"]'
    );
    expect(upcomingSegments).toHaveLength(4);
    expect(Array.from(upcomingSegments).every((segment) => !segment.dataset.returned)).toBe(true);

    render({
      ...props,
      currentStepName: 'Yazılım Geliştirme',
      currentStepOrder: 30,
      timelineItems: [
        { ...startedTimelineItems[0], stepDefinitionName: 'Yazılım Geliştirme' },
        createTimelineItem({
          key: 'scope-approved-again',
          stepDefinitionName: 'Kapsam Kontrol',
          statusLabel: 'Onaylandı',
          statusValue: WorkflowApproverStatusEnum.Approved,
        }),
        ...timelineItems.slice(1),
      ],
    });
    const revisited = getStepCards().find((card) => getStepName(card) === 'Yazılım Geliştirme')!;
    expect(revisited.dataset.state).toBe('current');
    expect(revisited.querySelector(`.${classes.stepHead}`)?.textContent).toBe('Onay Bekleniyor');
    expect(revisited.querySelectorAll('[role="listitem"]')).toHaveLength(2);
    expect(revisited.querySelector('section')?.textContent).not.toContain('İadenin Geldiği Adım');
    expect(revisited.querySelector('section')?.textContent).toContain(
      'İade Edilen Adım: Kapsam Kontrol'
    );
    expect(getStepCards().find((card) => getStepName(card) === 'Alfa Test')?.dataset.state).toBe(
      'upcoming'
    );
    expect(container.textContent).toContain('4/7');
  });

  it('does not invent a return target when no transition is available in history', () => {
    render({
      currentStepName: 'Kapsam Kontrol',
      currentStepOrder: 20,
      stepDefinitions: serviceStepDefinitions,
      timelineItems: [
        startedTimelineItems[0],
        createTimelineItem({
          key: 'development-approved',
          stepDefinitionName: 'Yazılım Geliştirme',
          statusLabel: 'Onaylandı',
          statusValue: WorkflowApproverStatusEnum.Approved,
        }),
        createTimelineItem({
          key: 'development-return',
          stepDefinitionName: 'Yazılım Geliştirme',
          statusLabel: 'İade Edildi',
          statusValue: WorkflowApproverStatusEnum.Reject,
          note: 'Eksik bilgi',
        }),
      ],
    });

    const history = getStepCards()
      .find((card) => getStepName(card) === 'Yazılım Geliştirme')
      ?.querySelector('section');
    expect(history?.textContent).toContain('İade Nedeni: Eksik bilgi');
    expect(history?.textContent).not.toContain('İade Edilen Adım');
  });

  it('uses zero-based service order to resolve the current definition without fabricating approvals', () => {
    render({
      currentStepOrder: 0,
      currentStepName: 'Eski adım adı',
      stepDefinitions: serviceStepDefinitions,
      creatorName: 'Talep sahibi',
    });
    expect(getStepCards()[0].dataset.state).toBe('current');
    expect(getStepName(getStepCards()[0])).toBe('Talep Girişi');
    expect(
      getStepCards()
        .slice(1)
        .every((card) => card.dataset.state === 'upcoming')
    ).toBe(true);
    expect(container.textContent).toContain('1/7');
    expect(container.textContent).not.toContain('Onaylandı');
  });

  it('shows a previously approved future step as upcoming with its approval only in history', () => {
    render({
      currentStepName: 'Kapsam Kontrol',
      currentStepOrder: 20,
      stepDefinitions: serviceStepDefinitions,
      timelineItems: [
        startedTimelineItems[0],
        createTimelineItem({
          key: 'alpha-return',
          stepDefinitionName: 'Alfa Test',
          statusLabel: 'İade Edildi',
          statusValue: WorkflowApproverStatusEnum.Reject,
          note: 'Kapsam tekrar incelenmeli',
        }),
        createTimelineItem({
          key: 'development-approved',
          stepDefinitionName: 'Yazılım Geliştirme',
          statusLabel: 'Onaylandı',
          statusValue: WorkflowApproverStatusEnum.Approved,
          date: '01.10.2026 13:00',
          card: { kind: 'person', title: 'Önceki onaycı', subtitle: 'Birim' },
        }),
      ],
    });
    const card = getStepCards().find((step) => getStepName(step) === 'Yazılım Geliştirme')!;
    expect(card.dataset.state).toBe('upcoming');
    expect(card.querySelector(`.${classes.stepHead}`)?.textContent).toBe('Sırada');
    expect(card.querySelector(`.${classes.person}`)).toBeNull();
    expect(card.querySelectorAll('[role="listitem"]')).toHaveLength(1);
    expect(card.querySelector('section')?.textContent).toContain(
      'Onaylandı01.10.2026 13:00·Önceki onaycı'
    );
    expect(mocks.tooltipRender).toHaveBeenCalledWith(tooltipWith('Yazılım Geliştirme', 'Sırada'));
    expect(mocks.tooltipRender).not.toHaveBeenCalledWith(
      tooltipWith('Yazılım Geliştirme', 'Onaylandı')
    );
  });

  it.each([WorkflowStatusEnum.Cancel, WorkflowStatusEnum.Completed])(
    'preserves terminal history and keeps canceled definitions inactive (status: %s)',
    (workflowStatus) => {
      render({
        currentStepName: 'Kapsam Kontrol',
        currentStepOrder: 20,
        stepDefinitions: serviceStepDefinitions,
        workflowStatus,
        timelineItems: [...startedTimelineItems].reverse(),
      });
      expect(getStepCards().map(getStepName)).toEqual([
        'Talep Girişi',
        'Yönetici Kontrol ve Onay',
        'Kapsam Kontrol',
        ...(workflowStatus === WorkflowStatusEnum.Cancel
          ? ['Yazılım Geliştirme', 'Alfa Test', 'Üretime Alma']
          : []),
        'Tamamlandı',
      ]);
      expect(
        getStepCards()
          .slice(0, 3)
          .every((card) => card.dataset.state === 'done')
      ).toBe(true);
      expect(getStepCards().at(-1)?.dataset.state).toBe(
        workflowStatus === WorkflowStatusEnum.Completed ? 'done' : 'inactive'
      );
      expect(getStepCards()).toHaveLength(workflowStatus === WorkflowStatusEnum.Cancel ? 7 : 4);
      expect(container.querySelector('[data-state="upcoming"]')).toBeNull();
    }
  );

  it('does not guess upcoming steps when the active order cannot be resolved', () => {
    render({
      currentStepName: 'Başka Adım',
      stepDefinitions: serviceStepDefinitions,
      timelineItems: [
        { ...startedTimelineItems[0], stepDefinitionName: 'Başka Adım' },
        startedTimelineItems[2],
      ],
    });
    expect(getStepCards().map(getStepName)).toEqual(['Talep Girişi', 'Başka Adım', 'Tamamlandı']);
    expect(
      getStepCards()
        .filter((card) => card.dataset.state === 'upcoming')
        .map(getStepName)
    ).toEqual(['Tamamlandı']);
  });

  it('preserves legacy history when service definitions have no usable name or order', () => {
    render({
      currentStepName: 'Kapsam Kontrol',
      currentStepOrder: 20,
      stepDefinitions: [{ Name: 'Kapsam Kontrol' }, { Order: 30 }, { Name: ' ', Order: 40 }],
      timelineItems: startedTimelineItems,
    });
    expect(getStepCards().map(getStepName)).toEqual([
      'Talep Girişi',
      'Yönetici Kontrol ve Onay',
      'Kapsam Kontrol',
      'Tamamlandı',
    ]);
    expect(
      getStepCards()
        .filter((card) => card.dataset.state === 'upcoming')
        .map(getStepName)
    ).toEqual(['Tamamlandı']);
  });

  it.each([
    [WorkflowApproverStatusEnum.Approved, 'Onaylandı', 'green'],
    [WorkflowApproverStatusEnum.Reject, 'İade Edildi', 'orange'],
    [WorkflowApproverStatusEnum.Cancel, 'İptal Edildi', 'red'],
    [WorkflowApproverStatusEnum.NotWaitingProcess, 'İşlem Beklenmiyor', 'gray'],
  ] as const)(
    'colors historical nodes by their latest status (%s)',
    (statusValue, statusLabel, color) => {
      render({
        timelineItems: [
          createTimelineItem({
            key: 'latest-action',
            stepDefinitionName: 'Alfa Test',
            statusValue,
            statusLabel,
          }),
        ],
      });

      const card = getStepCards()[0];
      const dot = card.querySelector<HTMLElement>(`.${classes.dot}`);
      expect(dot?.style.background).toContain(`--mantine-color-${color}`);
      expect(card.dataset.exceeded).toBeUndefined();
      expect(dot?.dataset.exceeded).toBeUndefined();
      const segment = container.querySelector<HTMLElement>('[role="img"] [data-state="done"]');
      expect(segment?.dataset.returned).toBe(
        statusValue === WorkflowApproverStatusEnum.Reject ? 'true' : undefined
      );
      expect(segment?.dataset.cancelled).toBe(
        statusValue === WorkflowApproverStatusEnum.Cancel ? 'true' : undefined
      );
    }
  );

  it('marks only the return source in the strip and includes the latest status in tooltips', () => {
    render({
      currentStepName: 'Kapsam Kontrol',
      timelineItems: startedTimelineItems,
    });

    const segments = container.querySelectorAll<HTMLElement>('[role="img"] [data-state]');
    expect(segments).toHaveLength(4);
    expect(segments[0].dataset.returned).toBeUndefined();
    expect(segments[1].dataset.returned).toBe('true');
    expect(segments[2].dataset.state).toBe('current');
    expect(segments[2].dataset.returned).toBeUndefined();
    expect(segments[2].dataset.exceeded).toBeUndefined();
    expect(mocks.tooltipRender).toHaveBeenCalledWith(
      tooltipWith('Talep Girişi', 'Akış Başlatıldı')
    );
    expect(mocks.tooltipRender).toHaveBeenCalledWith(
      tooltipWith('Yönetici Kontrol ve Onay', 'İade Edildi')
    );
    expect(mocks.tooltipRender).toHaveBeenCalledWith(
      tooltipWith('Kapsam Kontrol', 'Onay Bekleniyor')
    );
  });

  it('clears the return marker when the same step is later approved', () => {
    render({
      currentStepName: 'Kapsam Kontrol',
      timelineItems: [
        startedTimelineItems[0],
        createTimelineItem({
          key: 'manager-approved',
          stepDefinitionName: 'Yönetici Kontrol ve Onay',
          statusLabel: 'Onaylandı',
          statusValue: WorkflowApproverStatusEnum.Approved,
        }),
        ...startedTimelineItems.slice(1),
      ],
    });

    expect(container.querySelector('[role="img"] [data-returned]')).toBeNull();
    expect(mocks.tooltipRender).toHaveBeenCalledWith(
      tooltipWith('Yönetici Kontrol ve Onay', 'Onaylandı')
    );
    expect(mocks.tooltipRender).not.toHaveBeenCalledWith(
      tooltipWith('Yönetici Kontrol ve Onay', 'İade Edildi')
    );
    expect(container.querySelector('[role="listitem"]')?.textContent).toContain('İade Edildi');
    const approvedCard = getStepCards().find(
      (card) => getStepName(card) === 'Yönetici Kontrol ve Onay'
    );
    expect(approvedCard?.querySelector<HTMLElement>(`.${classes.dot}`)?.style.background).toContain(
      '--mantine-color-green'
    );
    expect(getStepCards().every((card) => !card.querySelector('[data-return-target]'))).toBe(true);
  });

  it.each([60, -60])(
    'keeps the active node controlled by SLA after a previous return (%s seconds)',
    (remainingSeconds) => {
      mocks.slaCountdown.mockReturnValue({
        remainingSeconds,
        slaCountdown: remainingSeconds < 0 ? '-00:00:01:00' : '00:00:01:00',
        slaCountdownColor: remainingSeconds < 0 ? 'red.6' : 'green.6',
      });
      render({
        currentStepName: 'Kapsam Kontrol',
        currentStepTargetStartDate: 1_788_710_400,
        currentStepTargetEndDate: 1_788_969_600,
        timelineItems: [
          startedTimelineItems[0],
          createTimelineItem({
            key: 'scope-previous-return',
            stepDefinitionName: 'Kapsam Kontrol',
            statusValue: WorkflowApproverStatusEnum.Reject,
            statusLabel: 'İade Edildi',
          }),
        ],
      });

      const card = getStepCards().find((item) => item.dataset.state === 'current');
      const dot = card?.querySelector<HTMLElement>(`.${classes.dot}`);
      expect(dot?.style.background).toBe('');
      expect(dot?.dataset.exceeded).toBe(remainingSeconds < 0 ? 'true' : undefined);
      expect(card?.dataset.exceeded).toBe(dot?.dataset.exceeded);
      const currentSegment = container.querySelector<HTMLElement>(
        '[role="img"] [data-state="current"]'
      );
      expect(currentSegment?.dataset.returned).toBeUndefined();
      expect(currentSegment?.dataset.cancelled).toBeUndefined();
      expect(currentSegment?.dataset.exceeded).toBe(dot?.dataset.exceeded);
    }
  );

  it('shows SLA beside the current status, preserves other dates and marks only the exceeded step', () => {
    mocks.slaCountdown.mockReturnValue({
      remainingSeconds: -60,
      slaCountdown: '-00:00:01:00',
      slaCountdownColor: 'red.6',
    });

    render({
      currentStepTargetStartDate: 1_788_710_400,
      currentStepId: WorkflowStep.ScopeControl,
      currentStepName: 'Kapsam Kontrol',
      currentStepTargetEndDate: 1_788_969_600,
      timelineItems: [
        startedTimelineItems[0],
        { ...startedTimelineItems[1], date: '23.09.2026 17:10' },
        startedTimelineItems[2],
      ],
    });

    const cards = getStepCards();
    const currentCard = cards.find((card) => card.dataset.state === 'current');

    expect(mocks.slaCountdown).toHaveBeenCalledWith({
      targetStartDate: 1_788_710_400,
      enabled: true,
      targetEndDate: 1_788_969_600,
    });
    expect(currentCard?.textContent).toContain('SLA: -00:00:01:00');
    const currentHead = currentCard?.querySelector('.mantine-Badge-root')?.parentElement;
    expect(currentHead?.textContent).toContain('Onay Bekleniyor');
    expect(currentHead?.lastElementChild?.textContent).toBe('SLA: -00:00:01:00');
    expect(currentCard?.lastElementChild?.textContent).not.toContain('SLA:');
    const previousHead = cards[1].querySelector('.mantine-Badge-root')?.parentElement;
    expect(previousHead?.lastElementChild?.textContent).toBe('23.09.2026 17:10');
    expect(currentCard?.querySelector('section[aria-label="Önceki işlemler"]')).toBeNull();
    expect(currentCard?.querySelector(`.${classes.currentReturn}`)).not.toBeNull();
    expect(currentCard?.dataset.exceeded).toBe('true');
    expect(cards.filter((card) => card.dataset.exceeded)).toHaveLength(1);
    const currentSegment = container.querySelector<HTMLElement>(
      '[role="img"] [data-state="current"]'
    );
    expect(currentSegment?.dataset.exceeded).toBe('true');
    expect(currentSegment?.dataset.returned).toBeUndefined();
    expect(mocks.tooltipRender).toHaveBeenCalledWith(
      tooltipWith('Kapsam Kontrol', 'Onay Bekleniyor', 'SLA: -00:00:01:00')
    );
  });

  it.each([
    TaskWorkflowStep.AnalysisEnter,
    TaskWorkflowStep.TestEnter,
    TaskWorkflowStep.DevelopmentEnter,
  ])('allows explicitly disabling SLA for task entry step %s', (currentStepId) => {
    render({
      color: TASK_WORKFLOW_STEP_BADGE_COLOR,
      creatorName: 'Ayşe Yılmaz',
      creatorUnit: 'Yazılım Birimi',
      currentStepId,
      currentStepName: 'Giriş',
      currentStepTargetStartDate: 1_788_710_400,
      currentStepTargetEndDate: 1_788_969_600,
      withSla: false,
    });

    const cards = getStepCards();
    expect(cards.map(getStepName)).toEqual(['Giriş', 'Tamamlandı']);
    expect(cards[0].textContent).toContain('Ayşe Yılmaz');
    expect(cards[0].textContent).toContain('Yazılım Birimi');
    expect(cards[0].querySelector<HTMLElement>('.mantine-Badge-root')?.style.cssText).toContain(
      '--mantine-color-blue-light'
    );
    expect(
      container.querySelector<HTMLElement>('[data-testid="workflow-step-progress"]')?.style.cssText
    ).toContain(`--mantine-color-${TASK_WORKFLOW_STEP_BADGE_COLOR}-8`);
    expect(mocks.slaCountdown).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain('SLA:');
    expect(container.querySelector('[data-exceeded]')).toBeNull();
  });

  it.each([undefined, WorkflowStep.IssueEntry])(
    'shows only the creator on the first step before the workflow starts (step id: %s)',
    (currentStepId) => {
      render({
        creatorName: 'Ayşe Yılmaz',
        creatorUnit: '05 Bankacılık',
        currentStepId,
        timelineItems: [],
      });

      const cards = getStepCards();
      const currentCard = cards.find((card) => card.dataset.state === 'current');

      expect(cards.indexOf(currentCard!)).toBe(0);
      expect(currentCard?.textContent).toContain('Talep Giriş');
      expect(currentCard?.textContent).toContain('Ayşe Yılmaz');
      expect(currentCard?.textContent).toContain('Oluşturuluyor');
      expect(cards).toHaveLength(2);
      expect(container.textContent).toContain('1/2');
      expect(mocks.slaCountdown).toHaveBeenCalledWith({
        targetStartDate: undefined,
        enabled: true,
        targetEndDate: undefined,
      });
    }
  );

  it('does not show future steps or an active step for a completed workflow', () => {
    render({
      currentStepTargetStartDate: 1_788_710_400,
      currentStepId: WorkflowStep.ScopeControl,
      currentStepName: 'Kapsam Kontrol',
      currentStepTargetEndDate: 1_788_969_600,
      timelineItems: startedTimelineItems,
      workflowStatus: WorkflowStatusEnum.Completed,
    });

    expect(getStepCards().every((card) => card.dataset.state === 'done')).toBe(true);
    expect(getStepCards()).toHaveLength(4);
    expect(mocks.slaCountdown).toHaveBeenCalledWith({
      targetStartDate: 1_788_710_400,
      enabled: false,
      targetEndDate: 1_788_969_600,
    });
  });

  it('does not fabricate future definitions or run an SLA clock when a canceled response lacks definitions', () => {
    render({
      currentStepTargetStartDate: 1_788_710_400,
      currentStepId: WorkflowStep.ScopeControl,
      currentStepName: 'Kapsam Kontrol',
      currentStepTargetEndDate: 1_788_969_600,
      timelineItems: startedTimelineItems,
      workflowStatus: WorkflowStatusEnum.Cancel,
    });

    expect(
      getStepCards()
        .slice(0, -1)
        .every((card) => card.dataset.state === 'done')
    ).toBe(true);
    expect(getStepCards().at(-1)?.dataset.state).toBe('inactive');
    expect(getStepCards()).toHaveLength(4);
    expect(container.textContent).toContain('3/4');
    expect(mocks.slaCountdown).toHaveBeenCalledWith({
      targetStartDate: 1_788_710_400,
      enabled: false,
      targetEndDate: 1_788_969_600,
    });
  });

  it.each(['Test', 'Analysis', 'Development'])(
    'renders the complete %s flow when canceled at entry without NextStep',
    (prefix) => {
      const flow: WorkflowInformationDto = {
        Status: WorkflowStatusEnum.Cancel,
        StepDefinations: [
          { Code: `${prefix}Test`, Name: 'Test', Order: 3 },
          { Code: `${prefix}Enter`, Name: 'Giriş', Order: 1 },
          { Code: `${prefix}ManagerApprove`, Name: 'Yönetici Onay', Order: 2 },
        ],
        Steps: [
          {
            StepDefinationName: 'Giriş',
            Status: WorkflowApproverStatusEnum.Cancel,
            Approvers: [
              {
                User: { Code: 'waiting', FullName: 'Diğer Onaycı' },
                Status: WorkflowApproverStatusEnum.NotWaitingProcess,
              },
              {
                User: { Code: 'actor', FullName: 'İptal Eden' },
                Status: WorkflowApproverStatusEnum.Cancel,
                Note: 'test iptal',
                Updated: { At: 1791387198 },
              },
            ],
          },
        ],
      };
      const workflowCards = buildWorkflowCards({
        currentApprover: null,
        currentStepLabel: '',
        flowDetailData: flow,
        nextStepApprovers: [],
        t: i18n.t,
      });
      const timelineItems = buildTimelineItems({
        assignedApprover: null,
        assignedUserCode: '',
        assignedUserName: '',
        currentApprover: null,
        currentStepLabel: '',
        flowDetailData: flow,
        isAssigned: false,
        nextStepApprovers: [],
        pendingApproversCard: null,
        t: i18n.t,
        workflowCards,
      });
      render({ workflowStatus: flow.Status, stepDefinitions: flow.StepDefinations, timelineItems });
      const cards = getStepCards();
      expect(cards.map(getStepName)).toEqual(['Giriş', 'Yönetici Onay', 'Test', 'Tamamlandı']);
      expect(cards.map((card) => card.dataset.state)).toEqual([
        'done',
        'inactive',
        'inactive',
        'inactive',
      ]);
      expect(cards[0].dataset.cancelled).toBe('true');
      expect(cards[0].textContent).toContain('İptal Edildi');
      expect(cards[0].textContent).toContain('İptal Eden');
      expect(cards[0].textContent).toContain('İptal Nedeni: test iptal');
      expect(cards[0].querySelector<HTMLElement>(`.${classes.dot}`)?.style.background).toBe(
        'var(--mantine-color-red-filled)'
      );
      for (const card of cards.slice(1)) {
        expect(card.textContent).toContain('İşlemde Değil');
      }
      expect(container.textContent).not.toContain('Akış Başlatıldı');
      expect(container.textContent).not.toContain('Diğer Onaycı');
      expect(container.textContent).toContain('1/4');
      expect(container.querySelectorAll(`.${classes.segment}`)).toHaveLength(4);
      expect(mocks.tooltipRender).toHaveBeenCalledWith(tooltipWith('Giriş', 'İptal Edildi'));
      expect(mocks.tooltipRender).toHaveBeenCalledWith(
        tooltipWith('Yönetici Onay', 'İşlemde Değil')
      );
      expect(mocks.slaCountdown).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    }
  );

  it('anchors cancellation at the returned step and keeps later visits in inactive history', () => {
    render({
      workflowStatus: WorkflowStatusEnum.Cancel,
      stepDefinitions: serviceStepDefinitions,
      timelineItems: [
        createTimelineItem({
          key: 'cancel',
          stepDefinitionName: 'Kapsam Kontrol',
          statusLabel: 'İptal Edildi',
          statusValue: WorkflowApproverStatusEnum.Cancel,
          note: 'İptal açıklaması',
        }),
        createTimelineItem({
          key: 'returned',
          stepDefinitionName: 'Alfa Test',
          statusLabel: 'İade Edildi',
          statusValue: WorkflowApproverStatusEnum.Reject,
          note: 'İade açıklaması',
        }),
        createTimelineItem({
          key: 'development',
          stepDefinitionName: 'Yazılım Geliştirme',
          statusLabel: 'Onaylandı',
          statusValue: WorkflowApproverStatusEnum.Approved,
        }),
        ...startedTimelineItems.slice(1),
      ],
    });
    const cards = getStepCards();
    expect(cards.map((card) => card.dataset.state)).toEqual([
      'done',
      'done',
      'done',
      'inactive',
      'inactive',
      'inactive',
      'inactive',
    ]);
    expect(container.textContent).toContain('3/7');
    expect(cards[2].dataset.cancelled).toBe('true');
    expect(cards[3].querySelector('section')?.textContent).toContain('Onaylandı');
    expect(cards[4].querySelector('section')?.textContent).toContain('İade Edildi');
    expect(cards[4].querySelector('section')?.textContent).toContain('İade açıklaması');
    expect(cards[3].querySelector(`.${classes.stepHead}`)?.textContent).toBe('İşlemde Değil');
    expect(container.querySelector('[data-state="upcoming"]')).toBeNull();
    expect(container.querySelector('[data-state="current"]')).toBeNull();
  });

  it('keeps actor and date of each repeated step visit accessible', () => {
    render({
      currentStepId: WorkflowStep.ScopeControl,
      currentStepName: 'Kapsam Kontrol',
      timelineItems: [
        startedTimelineItems[0],
        createTimelineItem({
          key: 'history-3',
          stepDefinitionName: 'Yönetici Kontrol ve Onay',
          statusLabel: 'Onaylandı',
          date: '03.09.2026',
          card: { kind: 'person', title: 'Mehmet', subtitle: 'Birim' },
        }),
        startedTimelineItems[1],
        createTimelineItem({
          key: 'history-1',
          stepDefinitionName: 'Yönetici Kontrol ve Onay',
          statusLabel: 'Onaylandı',
          statusValue: WorkflowApproverStatusEnum.Approved,
          date: '01.09.2026',
          card: { kind: 'person', title: 'Ayşe', subtitle: 'Birim' },
        }),
      ],
    });

    const repeated = getStepCards().find(
      (card) => getStepName(card) === 'Yönetici Kontrol ve Onay'
    );
    expect(repeated?.textContent).toContain('Ayşe');
    expect(repeated?.textContent).toContain('01.09.2026');
    expect(repeated?.textContent).toContain('Mehmet');
    expect(repeated?.textContent).toContain('03.09.2026');
    const history = repeated?.querySelectorAll<HTMLElement>('[role="listitem"]');
    expect(history).toHaveLength(2);
    expect(history?.[0].textContent).toContain('Kapsam bilgileri eksik');
    expect(history?.[0].style.getPropertyValue('--tli-color')).toContain('orange');
    expect(history?.[1].textContent).toContain('Ayşe');
    expect(history?.[1].style.getPropertyValue('--tli-color')).toContain('green');
  });

  it('keeps a revisited active step in its first-visit position and shows the actual return source', () => {
    render({
      currentStepId: WorkflowStep.ScopeControl,
      currentStepName: 'Kapsam Kontrol',
      timelineItems: [
        startedTimelineItems[0],
        createTimelineItem({
          key: 'development-return',
          stepDefinitionName: 'Yazılım Geliştirme',
          date: '23.09.2026 17:10',
          statusLabel: 'İade Edildi',
          statusValue: WorkflowApproverStatusEnum.Reject,
          note: 'Kapsam yeniden değerlendirilmeli',
          card: { kind: 'person', title: 'Son işlem yapan', subtitle: 'Birim' },
        }),
        createTimelineItem({
          key: 'alpha-return',
          stepDefinitionName: 'Alfa Test',
          date: '22.09.2026 13:44',
          statusLabel: 'İade Edildi',
          statusValue: WorkflowApproverStatusEnum.Reject,
          note: 'Geliştirme yeniden değerlendirilmeli',
          card: { kind: 'person', title: 'Mine Özmısır', subtitle: 'Birim' },
        }),
        createTimelineItem({
          key: 'development-approved',
          stepDefinitionName: 'Yazılım Geliştirme',
          date: '22.09.2026 13:43',
          statusLabel: 'Onaylandı',
          statusValue: WorkflowApproverStatusEnum.Approved,
          card: { kind: 'person', title: 'Önceki onaycı', subtitle: 'Birim' },
        }),
        createTimelineItem({
          key: 'analysis-approved',
          stepDefinitionName: 'Analiz',
          statusLabel: 'Onaylandı',
          statusValue: WorkflowApproverStatusEnum.Approved,
        }),
        createTimelineItem({
          key: 'scope-approved',
          stepDefinitionName: 'Kapsam Kontrol',
          statusLabel: 'Onaylandı',
          statusValue: WorkflowApproverStatusEnum.Approved,
          card: { kind: 'person', title: 'Önceki kapsam onaycısı', subtitle: 'Birim' },
        }),
        createTimelineItem({
          key: 'manager-approved',
          stepDefinitionName: 'Yönetici Kontrol ve Onay',
          statusLabel: 'Onaylandı',
          statusValue: WorkflowApproverStatusEnum.Approved,
        }),
        startedTimelineItems[2],
      ],
    });

    const cards = getStepCards();
    const currentCard = cards.find((card) => card.dataset.state === 'current');
    const developmentCard = cards.find((card) => getStepName(card) === 'Yazılım Geliştirme');
    const alphaCard = cards.find((card) => getStepName(card) === 'Alfa Test');
    const history = currentCard?.querySelector('section[aria-label="Önceki işlemler"]');
    const events = history?.querySelectorAll<HTMLElement>('[role="listitem"]');

    expect(cards.map(getStepName)).toEqual([
      'Talep Girişi',
      'Yönetici Kontrol ve Onay',
      'Kapsam Kontrol',
      'Analiz',
      'Yazılım Geliştirme',
      'Alfa Test',
      'Tamamlandı',
    ]);
    expect(cards.indexOf(currentCard!)).toBe(2);
    expect(container.textContent).toContain('3/7');
    expect(events).toHaveLength(1);
    expect(events?.[0].textContent).toContain('Önceki kapsam onaycısı');
    expect(events?.[0].style.getPropertyValue('--tli-color')).toContain('green');
    expect(events?.[0].querySelector(`.${classes.historyReturnSource}`)).toBeNull();
    expect(history?.textContent).not.toContain('İade Edildi');
    expect(history?.textContent).not.toContain('Son işlem yapan');
    const incomingReturn = currentCard?.querySelector(`.${classes.currentReturn}`);
    expect(incomingReturn?.querySelector(`.${classes.historyEvent}`)?.textContent).toBe(
      'İade ile geldi23.09.2026 17:10·Son işlem yapan'
    );
    expect(incomingReturn?.querySelector(`.${classes.historyReturnSource}`)?.textContent).toBe(
      'İadenin Geldiği Adım: Yazılım Geliştirme'
    );
    expect(incomingReturn?.textContent).toContain('İade Nedeni: Kapsam yeniden değerlendirilmeli');
    expect(incomingReturn?.textContent).not.toContain('İade Edildi');
    expect(incomingReturn?.querySelectorAll('[role="listitem"]')).toHaveLength(1);
    expect(incomingReturn?.querySelector('.mantine-Badge-root')).toBeNull();
    expect(
      incomingReturn
        ?.querySelector<HTMLElement>('[role="listitem"]')
        ?.style.getPropertyValue('--tli-color')
    ).toContain('orange');
    expect(incomingReturn?.querySelector(`.${classes.historyHeading}`)).toBeNull();
    expect(incomingReturn?.querySelector(`.${classes.historyContent}`)).not.toBeNull();
    expect(incomingReturn?.querySelector('svg.tabler-icon-arrow-back-up')).not.toBeNull();
    expect(incomingReturn?.closest('section')).toBeNull();
    expect(incomingReturn?.nextElementSibling).toBe(history);
    expect(incomingReturn?.previousElementSibling?.className).toBe(classes.stepNames);
    expect(currentCard?.querySelector(`.${classes.stepHead}`)?.textContent).toContain(
      'Onay Bekleniyor'
    );
    expect(container.textContent).not.toContain('Son geçiş');
    expect(container.textContent).not.toContain('İade sonrası');
    expect(developmentCard?.textContent).toContain('Son işlem yapan');
    expect(developmentCard?.textContent).toContain('23.09.2026 17:10');
    expect(developmentCard?.textContent).toContain('Kapsam yeniden değerlendirilmeli');
    expect(developmentCard?.textContent).toContain('Önceki onaycı');
    expect(developmentCard?.textContent).toContain('22.09.2026 13:43');
    const developmentReturnPath = developmentCard?.querySelector(`:scope > .${classes.stepNames}`);
    expect(
      Array.from(
        developmentReturnPath?.querySelectorAll(`.${classes.stepName}`) ?? [],
        (badge) => badge.textContent
      )
    ).toEqual(['Yazılım Geliştirme', 'Kapsam Kontrol']);
    expect(developmentReturnPath?.querySelector('[data-return-target]')?.textContent).toBe(
      'Kapsam Kontrol'
    );
    expect(developmentReturnPath?.querySelectorAll('svg')).toHaveLength(1);
    expect(
      developmentReturnPath?.nextElementSibling?.querySelector(`.${classes.noteText}`)?.textContent
    ).toBe('İade Nedeni: Kapsam yeniden değerlendirilmeli');
    const developmentHistory = developmentCard?.querySelector('section');
    const developmentEvents = developmentHistory?.querySelectorAll('[role="listitem"]');
    expect(developmentEvents).toHaveLength(1);
    expect(developmentEvents?.[0].textContent).toContain('Önceki onaycı');
    expect(developmentHistory?.textContent).not.toContain('İadenin Geldiği Adım');
    expect(developmentHistory?.textContent).not.toContain('Mine Özmısır');
    expect(developmentHistory?.textContent).not.toContain('Geliştirme yeniden değerlendirilmeli');
    expect(developmentHistory?.textContent).not.toContain('Son işlem yapan');
    expect(developmentHistory?.textContent).not.toContain('Kapsam yeniden değerlendirilmeli');
    expect(alphaCard?.textContent).toContain('Geliştirme yeniden değerlendirilmeli');
    const alphaReturnPath = alphaCard?.querySelector(`:scope > .${classes.stepNames}`);
    expect(
      Array.from(
        alphaReturnPath?.querySelectorAll(`.${classes.stepName}`) ?? [],
        (badge) => badge.textContent
      )
    ).toEqual(['Alfa Test', 'Yazılım Geliştirme']);
    expect(
      alphaReturnPath?.nextElementSibling?.querySelector(`.${classes.noteText}`)?.textContent
    ).toBe('İade Nedeni: Geliştirme yeniden değerlendirilmeli');
    expect(currentCard?.querySelector('[data-return-target]')).toBeNull();
    expect(
      currentCard?.querySelectorAll(`.${classes.stepNames} .${classes.stepName}`)
    ).toHaveLength(1);
    expect(alphaCard?.querySelector('section')).toBeNull();
    expect(alphaCard?.textContent).not.toContain('Önceki işlemler');
    expect(
      getStepCards()
        .filter((card) => card.dataset.state === 'upcoming')
        .map(getStepName)
    ).toEqual(['Tamamlandı']);
  });

  it('shows the latest return destination even without a reason and after an earlier return elsewhere', () => {
    render({
      currentStepName: 'Kapsam Kontrol',
      timelineItems: [
        startedTimelineItems[0],
        createTimelineItem({
          key: 'development-return-latest',
          stepDefinitionName: 'Yazılım Geliştirme',
          statusLabel: 'İade Edildi',
          statusValue: WorkflowApproverStatusEnum.Reject,
        }),
        createTimelineItem({
          key: 'alpha-approved',
          stepDefinitionName: 'Alfa Test',
          statusLabel: 'Onaylandı',
          statusValue: WorkflowApproverStatusEnum.Approved,
        }),
        createTimelineItem({
          key: 'development-return-first',
          stepDefinitionName: 'Yazılım Geliştirme',
          statusLabel: 'İade Edildi',
          statusValue: WorkflowApproverStatusEnum.Reject,
          note: 'Önceki iade gerekçesi',
        }),
      ],
    });

    const development = getStepCards().find((card) => getStepName(card) === 'Yazılım Geliştirme');
    const returnPath = development?.querySelector(`:scope > .${classes.stepNames}`);
    expect(
      Array.from(
        returnPath?.querySelectorAll(`.${classes.stepName}`) ?? [],
        (badge) => badge.textContent
      )
    ).toEqual(['Yazılım Geliştirme', 'Kapsam Kontrol']);
    expect(returnPath?.textContent).not.toContain('Alfa Test');
    expect(development?.querySelector(':scope > [data-action="reject"]')).toBeNull();
    expect(development?.querySelector('section')?.textContent).toContain('Önceki iade gerekçesi');
  });

  it('does not infer a return destination from a terminal current placeholder', () => {
    render({
      currentStepName: 'Kapsam Kontrol',
      workflowStatus: WorkflowStatusEnum.Cancel,
      timelineItems: [startedTimelineItems[0], startedTimelineItems[1]],
    });

    expect(getStepCards().every((card) => !card.querySelector('[data-return-target]'))).toBe(true);
  });

  it('shows only the latest incoming return on the active step, not earlier incoming returns', () => {
    const completedVisits = [
      createTimelineItem({
        key: 'development-approved-1',
        stepDefinitionName: 'Yazılım Geliştirme',
        statusLabel: 'Onaylandı',
        statusValue: WorkflowApproverStatusEnum.Approved,
        card: { kind: 'person', title: 'İlk onaycı', subtitle: 'Birim' },
      }),
      createTimelineItem({
        key: 'alpha-return-1',
        stepDefinitionName: 'Alfa Test',
        statusLabel: 'İade Edildi',
        statusValue: WorkflowApproverStatusEnum.Reject,
        note: 'İlk iade gerekçesi',
      }),
      createTimelineItem({
        key: 'development-approved-2',
        stepDefinitionName: 'Yazılım Geliştirme',
        statusLabel: 'Onaylandı',
        statusValue: WorkflowApproverStatusEnum.Approved,
        card: { kind: 'person', title: 'İkinci onaycı', subtitle: 'Birim' },
      }),
      createTimelineItem({
        key: 'alpha-return-2',
        stepDefinitionName: 'Alfa Test',
        statusLabel: 'İade Edildi',
        statusValue: WorkflowApproverStatusEnum.Reject,
        note: 'İkinci iade gerekçesi',
      }),
      createTimelineItem({
        key: 'development-return',
        stepDefinitionName: 'Yazılım Geliştirme',
        statusLabel: 'İade Edildi',
        statusValue: WorkflowApproverStatusEnum.Reject,
        note: 'Kapsama iade gerekçesi',
      }),
    ];
    render({
      currentStepName: 'Kapsam Kontrol',
      timelineItems: [startedTimelineItems[0], ...[...completedVisits].reverse()],
    });

    const cards = getStepCards();
    const development = cards.find((card) => getStepName(card) === 'Yazılım Geliştirme');
    const events = development?.querySelectorAll('[role="listitem"]');
    expect(events).toHaveLength(2);
    expect(events?.[0].textContent).toContain('İkinci onaycı');
    expect(events?.[1].textContent).toContain('İlk onaycı');
    expect(development?.querySelector('section')?.textContent).not.toContain('İlk iade gerekçesi');
    expect(development?.querySelector('section')?.textContent).not.toContain(
      'İkinci iade gerekçesi'
    );
    expect(development?.querySelector('section')?.textContent).not.toContain(
      'Kapsama iade gerekçesi'
    );
    const current = cards.find((card) => card.dataset.state === 'current');
    expect(current?.querySelector('section')).toBeNull();
    expect(current?.querySelector(`.${classes.currentReturn}`)?.textContent).toContain(
      'Kapsama iade gerekçesi'
    );

    render({
      currentStepName: 'Yazılım Geliştirme',
      timelineItems: [
        { ...startedTimelineItems[0], stepDefinitionName: 'Yazılım Geliştirme' },
        ...completedVisits.slice(0, -1).reverse(),
      ],
    });

    const revisited = getStepCards().find((card) => card.dataset.state === 'current');
    const revisitedHistory = revisited?.querySelector('section');
    expect(revisitedHistory?.querySelectorAll('[role="listitem"]')).toHaveLength(2);
    expect(revisitedHistory?.textContent).toContain('İlk onaycı');
    expect(revisitedHistory?.textContent).toContain('İkinci onaycı');
    expect(revisitedHistory?.textContent).not.toContain('İadenin Geldiği Adım');
    const incomingReturn = revisited?.querySelector(`.${classes.currentReturn}`);
    expect(incomingReturn?.textContent).toContain('İadenin Geldiği Adım: Alfa Test');
    expect(incomingReturn?.textContent).toContain('İkinci iade gerekçesi');
    expect(incomingReturn?.textContent).not.toContain('İlk iade gerekçesi');
    expect(revisitedHistory?.textContent).not.toContain('İlk iade gerekçesi');
  });

  it('does not label an approval transition as a return because of an older rejection', () => {
    render({
      currentStepId: WorkflowStep.ScopeControl,
      currentStepName: 'Kapsam Kontrol',
      timelineItems: [
        startedTimelineItems[0],
        createTimelineItem({
          key: 'manager-approved',
          stepDefinitionName: 'Yönetici Kontrol ve Onay',
          statusLabel: 'Onaylandı',
          statusValue: WorkflowApproverStatusEnum.Approved,
        }),
        startedTimelineItems[1],
        startedTimelineItems[2],
      ],
    });

    const currentCard = getStepCards().find((card) => card.dataset.state === 'current');
    expect(currentCard?.querySelector('[role="list"]')).toBeNull();
    expect(currentCard?.querySelector(`.${classes.currentReturn}`)).toBeNull();
    expect(currentCard?.textContent).not.toContain('Kapsam bilgileri eksik');
    expect(container.textContent).not.toContain('İade sonrası');
  });

  it.each([
    ['approved', WorkflowApproverStatusEnum.Approved, '23 Eyl 2026, 14:18', 'Aykut Sezgin', true],
    ['returned', WorkflowApproverStatusEnum.Reject, '28 Eyl 2026, 15:14', 'Aykut Sezgin', true],
    ['missing date', WorkflowApproverStatusEnum.Approved, '', 'Aykut Sezgin', false],
    ['missing name', WorkflowApproverStatusEnum.Approved, '23 Eyl 2026, 14:18', '', false],
    ['blank date', WorkflowApproverStatusEnum.Approved, '  ', 'Aykut Sezgin', false],
    ['blank name', WorkflowApproverStatusEnum.Approved, '23 Eyl 2026, 14:18', '  ', false],
  ] as const)(
    'separates history dates and names only when both are present (%s)',
    (_, statusValue, date, actor, hasSeparator) => {
      render({
        currentStepName: 'Kapsam Kontrol',
        timelineItems: [
          startedTimelineItems[0],
          createTimelineItem({
            key: 'previous-scope-action',
            stepDefinitionName: 'Kapsam Kontrol',
            statusLabel:
              statusValue === WorkflowApproverStatusEnum.Reject ? 'İade Edildi' : 'Onaylandı',
            statusValue,
            date,
            card: { kind: 'person', title: actor, subtitle: 'Birim' },
          }),
        ],
      });

      const historyEvent = container.querySelector(`.${classes.historyEvent}`);
      const separator = historyEvent?.querySelector(`.${classes.historySeparator}`);
      if (hasSeparator) {
        expect(separator?.textContent).toBe('·');
        expect(separator?.getAttribute('aria-hidden')).toBe('true');
        expect(separator?.previousElementSibling?.textContent).toBe(date);
        expect(separator?.nextElementSibling?.textContent).toBe(actor);
      } else {
        expect(separator).toBeNull();
      }
      expect(
        container.querySelector(`.${classes.stepHead} .${classes.historySeparator}`)
      ).toBeNull();
    }
  );

  it('keeps prior actor and date when the current step is revisited', () => {
    render({
      currentStepId: WorkflowStep.ScopeControl,
      currentStepName: 'Kapsam Kontrol',
      timelineItems: [
        startedTimelineItems[0],
        createTimelineItem({
          key: 'history-current',
          date: '02.09.2026',
          stepDefinitionName: 'Kapsam Kontrol',
          statusLabel: 'İade Edildi',
          statusValue: WorkflowApproverStatusEnum.Reject,
          note: 'Önceki kontrolün gerekçesi',
          card: { kind: 'person', title: 'Zeynep', subtitle: 'Birim' },
        }),
      ],
    });

    const current = getStepCards().find((card) => card.dataset.state === 'current');
    expect(current?.textContent).toContain('Zeynep');
    expect(current?.textContent).toContain('02.09.2026');
    expect(current?.textContent).toContain('Önceki kontrolün gerekçesi');
    expect(current?.querySelectorAll('[role="listitem"]')).toHaveLength(1);
    expect(current?.querySelector(`.${classes.historyReturnSource}`)).toBeNull();
  });

  it('shows mixed history newest first and keeps the latest cancellation outside history', () => {
    render({
      currentStepName: 'Kapsam Kontrol',
      workflowStatus: WorkflowStatusEnum.Cancel,
      timelineItems: [
        createTimelineItem({
          key: 'scope-cancel',
          stepDefinitionName: 'Kapsam Kontrol',
          date: '24.09.2026',
          statusLabel: 'İptal Edildi',
          statusValue: WorkflowApproverStatusEnum.Cancel,
          card: { kind: 'person', title: 'Son onaycı', subtitle: 'Birim' },
          note: 'Talebe ihtiyaç kalmadı',
        }),
        createTimelineItem({
          key: 'scope-approved',
          stepDefinitionName: 'Kapsam Kontrol',
          date: '23.09.2026',
          statusLabel: 'Onaylandı',
          statusValue: WorkflowApproverStatusEnum.Approved,
        }),
        createTimelineItem({
          key: 'scope-return',
          stepDefinitionName: 'Kapsam Kontrol',
          date: '22.09.2026',
          statusLabel: 'İade Edildi',
          statusValue: WorkflowApproverStatusEnum.Reject,
          note: 'İlk iade gerekçesi',
        }),
      ],
    });

    const card = getStepCards()[0];
    const history = card.querySelector('section');
    const events = history?.querySelectorAll<HTMLElement>('[role="listitem"]');
    expect(events).toHaveLength(2);
    expect(events?.[0].textContent).toContain('23.09.2026');
    expect(events?.[0].textContent).toContain('Onaylandı');
    expect(events?.[1].textContent).toContain('İlk iade gerekçesi');
    expect(history?.textContent).not.toContain('Son onaycı');
    expect(history?.textContent).not.toContain('Talebe ihtiyaç kalmadı');
    expect(card.textContent).toContain('Son onaycı');
    expect(
      card.querySelector(`:scope > [data-action="cancel"] .${classes.noteText}`)?.textContent
    ).toBe('İptal Nedeni: Talebe ihtiyaç kalmadı');
  });

  it.each([
    [WorkflowApproverStatusEnum.Reject, 'İade Edildi', 'reject'],
    [WorkflowApproverStatusEnum.Cancel, 'İptal Edildi', 'cancel'],
  ] as const)(
    'shows a single latest action without a previous activity section (status: %s)',
    (statusValue, statusLabel, action) => {
      render({
        timelineItems: [
          createTimelineItem({
            key: 'single-action',
            stepDefinitionName: 'Alfa Test',
            date: '23.09.2026 17:10',
            card: { kind: 'person', title: 'Son işlemi yapan', subtitle: 'Birim' },
            statusValue,
            statusLabel,
            note: '  İşlem gerekçesi  ',
          }),
        ],
      });

      const card = getStepCards()[0];
      expect(card.textContent?.split(statusLabel)).toHaveLength(2);
      expect(card.textContent?.split('23.09.2026 17:10')).toHaveLength(2);
      expect(card.textContent?.split('Son işlemi yapan')).toHaveLength(2);
      const note = card.querySelector(`:scope > [data-action="${action}"]`);
      expect(note?.querySelector(`.${classes.noteText}`)?.textContent).toBe(
        action === 'reject' ? 'İade Nedeni: İşlem gerekçesi' : 'İptal Nedeni: İşlem gerekçesi'
      );
      expect(note?.querySelector('strong')?.textContent?.trim()).toBe(
        action === 'reject' ? 'İade Nedeni:' : 'İptal Nedeni:'
      );
      expect(card.querySelector('section')).toBeNull();
      expect(card.querySelector('[data-return-target]')).toBeNull();
      expect(card.querySelectorAll(`.${classes.stepNames} .${classes.stepName}`)).toHaveLength(1);
      expect(card.textContent).not.toContain('Önceki işlemler');
    }
  );

  it('keeps previously visited steps when the current step moves backwards', () => {
    render({
      currentStepId: WorkflowStep.ScopeControl,
      currentStepName: 'Kapsam Kontrol',
      timelineItems: [
        startedTimelineItems[0],
        createTimelineItem({
          key: 'history-future',
          stepDefinitionName: 'Analiz',
          statusLabel: 'Onaylandı',
        }),
      ],
    });

    expect(getStepCards().map(getStepName)).toEqual(['Analiz', 'Kapsam Kontrol', 'Tamamlandı']);
  });

  it.each([20, 100, 1000])(
    'bounds each step preview for %s visits without mutating input',
    (visitCount) => {
      const historicalVisits = Array.from({ length: visitCount }, (_, index) =>
        createTimelineItem({
          key: `visit-${index}`,
          stepDefinitionName: index % 2 === 0 ? 'Yazılım Geliştirme' : 'Alfa Test',
          statusLabel: 'İade Edildi',
          statusValue: WorkflowApproverStatusEnum.Reject,
          note: `İade ${index}`,
        })
      );
      const timelineItems = [startedTimelineItems[0], ...historicalVisits.reverse()];
      const originalKeys = timelineItems.map((item) => item.key);
      Object.freeze(timelineItems);

      render({ currentStepName: 'Kapsam Kontrol', timelineItems });

      expect(getStepCards()).toHaveLength(4);
      expect(container.querySelectorAll('section [role="listitem"]')).toHaveLength(4);
      expect(
        container.querySelectorAll(`.${classes.currentReturn} [role="listitem"]`)
      ).toHaveLength(1);
      expect(container.querySelectorAll(`.${classes.currentReturn}`)).toHaveLength(1);
      const scrollArea = container.querySelector(`.${classes.flowScroll}`);
      expect(scrollArea?.querySelector('[data-scrollbars="x"]')).not.toBeNull();
      expect(scrollArea?.querySelector('[data-orientation="vertical"]')).toBeNull();
      expect(scrollArea?.querySelector('[data-orientation="horizontal"]')).not.toBeNull();
      expect(timelineItems.map((item) => item.key)).toEqual(originalKeys);
    }
  );

  it.each([0, 1, 2, 3, 100, 1000])(
    'previews the latest two of %s records and opens all records from memory',
    (count) => {
      const history = Array.from({ length: count }, (_, index) =>
        createTimelineItem({
          key: `scope-${index}`,
          stepDefinitionName: 'Kapsam Kontrol',
          statusLabel: 'Onaylandı',
          statusValue: WorkflowApproverStatusEnum.Approved,
          card: { kind: 'person', title: `Onaycı ${index}`, subtitle: 'Birim' },
        })
      );
      const originalKeys = history.map((item) => item.key);
      render({
        currentStepName: 'Kapsam Kontrol',
        timelineItems: [startedTimelineItems[0], ...history],
      });
      const card = getStepCards().find((item) => item.dataset.state === 'current')!;
      const section = card.querySelector('section');
      expect(section?.querySelectorAll('[role="listitem"]').length ?? 0).toBe(Math.min(2, count));
      const viewAll = section?.querySelector<HTMLButtonElement>(`.${classes.historyViewAll}`);
      if (count === 0) {
        expect(section).toBeNull();
      } else {
        expect(section?.querySelector(`.${classes.historyHeadingLabel}`)?.textContent?.trim()).toBe(
          count > 2 ? 'Önceki işlemler (Son 2 işlem)' : 'Önceki işlemler'
        );
        expect(
          Array.from(
            section!.querySelectorAll(`.${classes.historyActor}`),
            (actor) => actor.textContent
          )
        ).toEqual(history.slice(0, 2).map((item) => item.card.title));
      }
      if (count > 2) {
        expect(section?.querySelector(`.${classes.historyCount}`)?.textContent).toBe(
          '(Son 2 işlem)'
        );
        expect(viewAll?.textContent).toBe(`Tümünü Gör (${count})`);
        expect(section?.textContent).not.toContain('Onaycı 2');
        act(() => viewAll?.click());
        const options = useModalStore.getState().getModalOption('WorkflowStepHistory');
        expect(options?.stepName).toBe('Kapsam Kontrol');
        expect(options?.items.map((item) => item.key)).toEqual(originalKeys);
      } else {
        expect(section?.querySelector(`.${classes.historyCount}`) ?? null).toBeNull();
        expect(viewAll).toBeFalsy();
      }
      expect(history.map((item) => item.key)).toEqual(originalKeys);
    }
  );

  it.each([
    {
      action: 'reject',
      statusValue: WorkflowApproverStatusEnum.Reject,
      statusLabel: 'İade Edildi',
    },
    {
      action: 'cancel',
      statusValue: WorkflowApproverStatusEnum.Cancel,
      statusLabel: 'İptal Edildi',
    },
  ] as const)(
    'preserves an uncontrolled draft and stable previews while viewing $action and history dialogs',
    ({ action, statusValue, statusLabel }) => {
      mockNoteMeasurements({ clientWidth: 280, clientHeight: 30, scrollHeight: 60 });
      const submit = vi.fn();
      const formRender = vi.fn();
      let formApi: UseFormReturnType<{ title: string }> | undefined;
      const timelineItems = [
        startedTimelineItems[0],
        ...Array.from({ length: 3 }, (_, index) =>
          createTimelineItem({
            key: `return-${index}`,
            stepDefinitionName: 'Kapsam Kontrol',
            statusLabel,
            statusValue,
            note: `İşlem gerekçesi ${index}`,
          })
        ),
      ];
      const DraftForm = () => {
        formRender();
        const form = useForm({ mode: 'uncontrolled', initialValues: { title: '' } });
        formApi = form;
        return (
          <form onSubmit={form.onSubmit(submit)}>
            <TextInput key={form.key('title')} label="Başlık" {...form.getInputProps('title')} />
            <WorkflowStepProgress currentStepName="Kapsam Kontrol" timelineItems={timelineItems} />
          </form>
        );
      };
      act(() =>
        root.render(
          <MantineProvider env="test" theme={theme}>
            <DraftForm />
          </MantineProvider>
        )
      );
      const input = container.querySelector<HTMLInputElement>('input')!;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      act(() => {
        setter.call(input, 'Kaydedilmemiş başlık');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(formApi?.getValues().title).toBe('Kaydedilmemiş başlık');
      expect(formApi?.isDirty()).toBe(true);
      const previewRenders = () =>
        mocks.boxRender.mock.calls.filter(([className]) =>
          [classes.historyEvent, classes.historyHeading, classes.note].includes(className)
        ).length;
      const renderCount = previewRenders();
      const formRenderCount = formRender.mock.calls.length;
      expect(renderCount).toBeGreaterThan(0);

      const viewAll = container.querySelector<HTMLButtonElement>(`.${classes.historyViewAll}`)!;
      expect(viewAll.type).toBe('button');
      act(() => viewAll.click());
      expect(useModalStore.getState().getModalOption('WorkflowStepHistory')?.items).toHaveLength(3);
      act(() => useModalStore.getState().closeModal('WorkflowStepHistory'));
      const viewNote = container.querySelector<HTMLButtonElement>(
        `[data-testid="workflow-${action}-note-view"]`
      )!;
      expect(viewNote.type).toBe('button');
      act(() => viewNote.click());
      expect(useModalStore.getState().getModalOption('WorkflowActionNote')).toEqual({
        action,
        note: 'İşlem gerekçesi 0',
      });
      act(() => useModalStore.getState().closeModal('WorkflowActionNote'));

      expect(previewRenders()).toBe(renderCount);
      expect(formRender).toHaveBeenCalledTimes(formRenderCount);
      expect(container.querySelector('input')).toBe(input);
      expect(input).toHaveValue('Kaydedilmemiş başlık');
      expect(formApi?.getValues().title).toBe('Kaydedilmemiş başlık');
      expect(formApi?.isDirty()).toBe(true);
      expect(submit).not.toHaveBeenCalled();
    }
  );

  it('opens all earlier returns with their own destinations and unchanged notes', () => {
    const entity = { kind: 'request', number: 'YT-11873' } as const;
    const returns = [0, 1, 2].map((index) =>
      createTimelineItem({
        key: `alpha-return-${index}`,
        stepDefinitionName: 'Alfa Test',
        statusLabel: 'İade Edildi',
        statusValue: WorkflowApproverStatusEnum.Reject,
        note: `İade gerekçesi ${index}`,
      })
    );
    const timelineItems = [
      startedTimelineItems[0],
      returns[0],
      createTimelineItem({
        key: 'scope-approved',
        stepDefinitionName: 'Kapsam Kontrol',
        statusLabel: 'Onaylandı',
        statusValue: WorkflowApproverStatusEnum.Approved,
      }),
      returns[1],
      createTimelineItem({
        key: 'development-approved',
        stepDefinitionName: 'Yazılım Geliştirme',
        statusLabel: 'Onaylandı',
        statusValue: WorkflowApproverStatusEnum.Approved,
      }),
      returns[2],
    ];
    const originalItems = structuredClone(timelineItems);
    Object.freeze(timelineItems);
    timelineItems.forEach(Object.freeze);
    render({
      entity,
      currentStepName: 'Kapsam Kontrol',
      stepDefinitions: serviceStepDefinitions,
      timelineItems,
    });

    const alpha = getStepCards().find((card) => getStepName(card) === 'Alfa Test')!;
    expect(alpha.querySelectorAll('section [role="listitem"]')).toHaveLength(2);
    expect(alpha.textContent).not.toContain('İade gerekçesi 2');
    const viewAll = alpha.querySelector<HTMLButtonElement>(`.${classes.historyViewAll}`)!;
    act(() => viewAll.click());

    expect(useModalStore.getState().getModalOption('WorkflowStepHistory')).toEqual({
      entity,
      stepName: 'Alfa Test',
      items: returns.map((item, index) => ({
        ...item,
        returnTargetName: index === 2 ? 'Yazılım Geliştirme' : 'Kapsam Kontrol',
      })),
    });
    expect(timelineItems).toEqual(originalItems);
  });

  it('keeps a fully visible 200-character reason readable without a view button', () => {
    mockNoteMeasurements({ clientWidth: 560, clientHeight: 30, scrollHeight: 30 });
    const note = 'A'.repeat(200);
    render({
      currentStepName: 'Kapsam Kontrol',
      timelineItems: [startedTimelineItems[0], { ...startedTimelineItems[1], note }],
    });
    const preview = container.querySelector(`.${classes.currentReturn} .${classes.note}`)!;
    expect(preview.querySelector(`.${classes.noteText}`)?.textContent).toBe(`İade Nedeni: ${note}`);
    expect(preview.querySelector('button')).toBeNull();
    expect(useModalStore.getState().currentModals).toHaveLength(0);
  });

  it('uses the same two-line preview for current and past reasons and opens the unchanged full note', () => {
    mockNoteMeasurements({ clientWidth: 280, clientHeight: 30, scrollHeight: 60 });
    const note =
      'Alfa test senaryolarında çalışma koşulları ve firma bazlı istisnalar eksik. Rapor filtreleri güncellenmeli, yetki kontrolleri doğrulanmalı ve test sonuçları eklenerek talep yine onaya gönderilmelidir.';
    expect(note).toHaveLength(200);
    render({
      currentStepName: 'Kapsam Kontrol',
      timelineItems: [
        startedTimelineItems[0],
        { ...startedTimelineItems[1], note },
        createTimelineItem({
          key: 'own-return',
          stepDefinitionName: 'Kapsam Kontrol',
          statusLabel: 'İade Edildi',
          statusValue: WorkflowApproverStatusEnum.Reject,
          note,
        }),
      ],
    });
    const card = getStepCards().find((item) => item.dataset.state === 'current')!;
    const currentNote = card.querySelector<HTMLElement>(
      `.${classes.currentReturn} [data-action="reject"]`
    )!;
    const historyNote = card.querySelector<HTMLElement>('section [data-action="reject"]')!;
    const viewButton = currentNote.querySelector<HTMLButtonElement>(
      '[data-testid="workflow-reject-note-view"]'
    )!;
    expect(viewButton).toHaveTextContent('Tamamını Gör');
    expect(viewButton).toHaveAccessibleName('İade Nedeni: Tamamını Gör');
    expect(viewButton).toHaveAttribute('type', 'button');
    expect(viewButton).toHaveAttribute('aria-haspopup', 'dialog');
    expect(viewButton).toHaveAttribute('data-variant', 'transparent');
    expect(viewButton).toHaveAttribute('data-size', 'compact-xs');
    expect(viewButton.querySelector('svg')).toBeNull();
    expect(currentNote.querySelector(`.${classes.noteText}`)?.textContent).toBe(
      `İade Nedeni: ${note}`
    );
    for (const preview of [currentNote, historyNote]) {
      expect(preview.querySelector(`.${classes.noteText}`)).toHaveAttribute(
        'data-line-clamp',
        'true'
      );
      expect(preview.querySelector(`.${classes.noteText}`)?.getAttribute('style')).toContain(
        '--text-line-clamp: 2'
      );
      expect(preview.querySelector(`.${classes.noteMeasure}`)?.getAttribute('style')).toContain(
        '--text-line-clamp: 2'
      );
    }
    act(() => currentNote.querySelector('button')?.click());
    expect(useModalStore.getState().getModalOption('WorkflowActionNote')).toEqual({
      action: 'reject',
      note,
    });
    act(() => historyNote.querySelector('button')?.click());
    expect(useModalStore.getState().currentModals).toHaveLength(1);
    expect(useModalStore.getState().getModalOption('WorkflowActionNote')).toEqual({
      action: 'reject',
      note,
    });
  });

  it('shows the view action only while the full-width note overflows, including after resizing', () => {
    const dimensions = { clientWidth: 280, clientHeight: 30, scrollHeight: 30 };
    mockNoteMeasurements(dimensions);
    const resizeChecks = new Set<() => void>();
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly callback: () => void) {}
        observe(element: Element) {
          if (element.classList.contains(classes.noteMeasure)) {
            resizeChecks.add(this.callback);
          }
        }
        unobserve() {}
        disconnect() {
          resizeChecks.delete(this.callback);
          disconnect();
        }
      }
    );
    render({ currentStepName: 'Kapsam Kontrol', timelineItems: startedTimelineItems });
    const note = container.querySelector(`.${classes.currentReturn} .${classes.note}`)!;
    expect(note.querySelector('button')).toBeNull();
    expect(note.querySelector(`.${classes.noteText}`)?.textContent).toContain(
      'Kapsam bilgileri eksik'
    );
    expect(note.querySelector(`.${classes.noteMeasure}`)?.getAttribute('aria-hidden')).toBe('true');

    dimensions.clientWidth = 120;
    dimensions.scrollHeight = 60;
    act(() => resizeChecks.forEach((check) => check()));
    expect(note.querySelector('button')).toHaveTextContent('Tamamını Gör');
    // Aksiyonun görünmesi ölçümü daraltmaz; tekrarlanan ölçüm sonucu değiştirmemeli.
    const previewRenders = () =>
      mocks.boxRender.mock.calls.filter(([className]) => className === classes.note).length;
    const renderCount = previewRenders();
    const observedChecks = [...resizeChecks];
    for (let index = 0; index < 10; index += 1) {
      act(() => resizeChecks.forEach((check) => check()));
    }
    expect(note.querySelector('button')).not.toBeNull();
    expect(previewRenders()).toBe(renderCount);
    expect([...resizeChecks]).toEqual(observedChecks);

    dimensions.clientWidth = 280;
    dimensions.scrollHeight = 30;
    act(() => resizeChecks.forEach((check) => check()));
    expect(note.querySelector('button')).toBeNull();
    expect(useModalStore.getState().currentModals).toHaveLength(0);

    render({ timelineItems: [] });
    expect(resizeChecks.size).toBe(0);
    expect(disconnect).toHaveBeenCalled();
  });

  it('rechecks a hidden note after it becomes measurable and removes font listeners on unmount', () => {
    const dimensions = { clientWidth: 0, clientHeight: 30, scrollHeight: 60 };
    mockNoteMeasurements(dimensions);
    const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
    const fonts = new EventTarget();
    const addListener = vi.spyOn(fonts, 'addEventListener');
    const removeListener = vi.spyOn(fonts, 'removeEventListener');
    Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });

    try {
      render({
        timelineItems: [
          createTimelineItem({
            key: 'return',
            stepDefinitionName: 'Alfa Test',
            statusLabel: 'İade Edildi',
            statusValue: WorkflowApproverStatusEnum.Reject,
            note: 'Font yüklendiğinde yeniden ölçülmesi gereken gerekçe',
          }),
        ],
      });
      const note = container.querySelector(`.${classes.note}`)!;
      expect(note.querySelector('button')).toBeNull();
      expect(addListener).toHaveBeenCalledOnce();
      const [eventName, listener] = addListener.mock.calls[0];
      expect(eventName).toBe('loadingdone');

      dimensions.clientWidth = 280;
      act(() => fonts.dispatchEvent(new Event('loadingdone')));
      expect(note.querySelector('button')).toHaveTextContent('Tamamını Gör');

      dimensions.scrollHeight = 30;
      act(() => fonts.dispatchEvent(new Event('loadingdone')));
      expect(note.querySelector('button')).toBeNull();
      expect(addListener).toHaveBeenCalledOnce();

      render({ timelineItems: [] });
      expect(removeListener).toHaveBeenCalledExactlyOnceWith(eventName, listener);
      const measurements = vi.mocked(
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')!.get!
      ).mock.calls.length;
      act(() => fonts.dispatchEvent(new Event('loadingdone')));
      expect(
        vi.mocked(Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth')!.get!)
      ).toHaveBeenCalledTimes(measurements);
    } finally {
      if (originalFonts) {
        Object.defineProperty(document, 'fonts', originalFonts);
      } else {
        Reflect.deleteProperty(document, 'fonts');
      }
    }
  });

  it('rechecks truncation when the reason changes without a container resize', () => {
    const dimensions = { clientWidth: 280, clientHeight: 30, scrollHeight: 60 };
    mockNoteMeasurements(dimensions);
    render({ currentStepName: 'Kapsam Kontrol', timelineItems: startedTimelineItems });
    expect(container.querySelector(`.${classes.currentReturn} button`)).not.toBeNull();

    dimensions.scrollHeight = 30;
    render({
      currentStepName: 'Kapsam Kontrol',
      timelineItems: startedTimelineItems.map((item) =>
        item.note ? { ...item, note: 'Eksik' } : item
      ),
    });
    expect(container.querySelector(`.${classes.currentReturn} button`)).toBeNull();
  });

  it('keeps the initial card stable when timeline data is omitted and only SLA props change', () => {
    const props = {
      creatorName: 'Talep sahibi',
      currentStepId: WorkflowStep.IssueEntry,
      currentStepTargetStartDate: 1_788_710_400,
      currentStepTargetEndDate: 1_788_969_600,
    };
    render(props);
    const cardClass = getStepCards()[0].className;
    const initialRenders = mocks.boxRender.mock.calls.filter(([name]) => name === cardClass).length;
    expect(initialRenders).toBeGreaterThan(0);

    render({ ...props, currentStepTargetStartDate: props.currentStepTargetStartDate + 1 });

    expect(mocks.boxRender.mock.calls.filter(([name]) => name === cardClass)).toHaveLength(
      initialRenders
    );
  });

  it('keeps historical person cards stable when the current SLA changes', () => {
    const props = {
      currentStepTargetStartDate: 1_788_710_400,
      currentStepId: WorkflowStep.ScopeControl,
      currentStepName: 'Kapsam Kontrol',
      currentStepTargetEndDate: 1_788_969_600,
      timelineItems: startedTimelineItems,
    };
    mocks.slaCountdown.mockReturnValue({
      remainingSeconds: 100,
      slaCountdown: '00:00:01:40',
      slaCountdownColor: 'cyan.8',
    });
    render(props);
    const cardClass = getStepCards()[0].className;
    const priorRenders = mocks.boxRender.mock.calls.filter(
      ([name, state]) => name === cardClass && state === 'done'
    ).length;
    expect(priorRenders).toBeGreaterThan(0);

    mocks.slaCountdown.mockReturnValue({
      remainingSeconds: 99,
      slaCountdown: '00:00:01:39',
      slaCountdownColor: 'cyan.8',
    });
    render({ ...props, currentStepTargetStartDate: props.currentStepTargetStartDate + 1 });

    expect(
      mocks.boxRender.mock.calls.filter(([name, state]) => name === cardClass && state === 'done')
    ).toHaveLength(priorRenders);
    expect(getStepCards().find((card) => card.dataset.state === 'current')?.textContent).toContain(
      '00:00:01:39'
    );
  });

  it('updates only the active SLA consumers over consecutive clock ticks', () => {
    mockTickingClock({
      remainingSeconds: 100,
      slaCountdown: '00:00:01:40',
      slaCountdownColor: 'cyan.8',
    });
    render({
      currentStepTargetStartDate: 1_788_710_400,
      currentStepId: WorkflowStep.ScopeControl,
      currentStepName: 'Kapsam Kontrol',
      currentStepOrder: 20,
      stepDefinitions: serviceStepDefinitions,
      currentStepTargetEndDate: 1_788_969_600,
      timelineItems: [
        {
          ...startedTimelineItems[0],
          card: {
            kind: 'pending-approvers',
            title: 'Kapsam Kontrol',
            subtitle: 'Proje Ofisi',
            dropdownLabel: 'Onaycılar',
            approvers: [],
          },
        },
        ...startedTimelineItems.slice(1),
      ],
    });

    const bandClass = container.querySelector('[data-testid="workflow-step-progress"]')?.className;
    const segmentClass = container.querySelector('[data-state="done"]')?.className;
    const currentCard = getStepCards().find((card) => card.dataset.state === 'current');
    const cardClass = currentCard?.className;
    const bandRenders = mocks.boxRender.mock.calls.filter(([name]) => name === bandClass).length;
    const staticSegmentRenders = mocks.boxRender.mock.calls.filter(
      ([name, state]) => name === segmentClass && state !== 'current'
    ).length;
    const cardRenders = mocks.boxRender.mock.calls.filter(([name]) => name === cardClass).length;
    const cardContentRenders = mocks.cardRender.mock.calls.length;
    expect(getStepCards().filter((card) => card.dataset.state === 'upcoming')).toHaveLength(4);
    expect(cardContentRenders).toBeGreaterThan(0);
    const tooltipRenders = mocks.tooltipRender.mock.calls.length;

    for (let second = 39; second >= 0; second -= 1) {
      act(() =>
        tickClock?.({
          remainingSeconds: 60 + second,
          slaCountdown: `00:00:01:${String(second).padStart(2, '0')}`,
          slaCountdownColor: 'cyan.8',
        })
      );
    }

    expect(mocks.boxRender.mock.calls.filter(([name]) => name === bandClass)).toHaveLength(
      bandRenders
    );
    expect(
      mocks.boxRender.mock.calls.filter(
        ([name, state]) => name === segmentClass && state !== 'current'
      )
    ).toHaveLength(staticSegmentRenders);
    expect(mocks.boxRender.mock.calls.filter(([name]) => name === cardClass)).toHaveLength(
      cardRenders
    );
    expect(mocks.cardRender).toHaveBeenCalledTimes(cardContentRenders);
    expect(mocks.tooltipRender.mock.calls.length).toBe(tooltipRenders + 40);
    expect(mocks.tooltipRender.mock.lastCall?.[0]).toEqual(
      tooltipWith('Kapsam Kontrol', 'Onay Bekleniyor', 'SLA: 00:00:01:00')
    );
    expect(getStepCards().find((card) => card.dataset.state === 'current')?.textContent).toContain(
      '00:00:01:00'
    );
  });

  it('preserves an uncontrolled form without rendering it when SLA starts, ticks and becomes risky', () => {
    mockTickingClock({
      remainingSeconds: null,
      slaCountdown: null,
      slaCountdownColor: null,
    });
    const formRender = vi.fn();
    const submit = vi.fn();
    let formApi: UseFormReturnType<{ title: string }> | undefined;
    const DraftForm = () => {
      formRender();
      const form = useForm({ mode: 'uncontrolled', initialValues: { title: '' } });
      formApi = form;
      return (
        <form onSubmit={form.onSubmit(submit)}>
          <TextInput key={form.key('title')} label="Başlık" {...form.getInputProps('title')} />
          <WorkflowStepProgress
            currentStepTargetStartDate={1_789_574_400}
            currentStepTargetEndDate={1_789_704_000}
            currentStepId={WorkflowStep.ScopeControl}
            currentStepName="Kapsam Kontrol"
            timelineItems={startedTimelineItems}
          />
        </form>
      );
    };
    act(() =>
      root.render(
        <MantineProvider env="test" theme={theme}>
          <DraftForm />
        </MantineProvider>
      )
    );
    expect(container.textContent).not.toContain('SLA:');
    expect(mocks.tooltipRender).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({ name: 'Kapsam Kontrol', slaText: undefined }),
      })
    );
    const input = container.querySelector<HTMLInputElement>('input')!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    act(() => {
      setter.call(input, 'Kaydedilmemiş başlık');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const formRenders = formRender.mock.calls.length;
    const cardContentRenders = mocks.cardRender.mock.calls.length;

    for (let second = 59; second >= 50; second -= 1) {
      act(() =>
        tickClock?.({
          remainingSeconds: 129540 + second,
          slaCountdown: `01:11:59:${second}`,
          slaCountdownColor: 'green.6',
        })
      );
    }

    for (const [remainingSeconds, slaCountdown, slaCountdownColor] of [
      [7201, '00:02:00:01', 'green.6'],
      [7200, '00:02:00:00', 'orange.6'],
      [7199, '00:01:59:59', 'orange.6'],
    ] as const) {
      act(() => tickClock?.({ remainingSeconds, slaCountdown, slaCountdownColor }));
    }

    expect(formRender).toHaveBeenCalledTimes(formRenders);
    expect(mocks.cardRender).toHaveBeenCalledTimes(cardContentRenders);
    expect(container.querySelector('input')).toBe(input);
    expect(input).toHaveValue('Kaydedilmemiş başlık');
    expect(formApi?.getValues().title).toBe('Kaydedilmemiş başlık');
    expect(formApi?.isDirty()).toBe(true);
    expect(submit).not.toHaveBeenCalled();
    expect(container.textContent).toContain('SLA: 00:01:59:59');
    expect(mocks.tooltipRender).toHaveBeenCalledWith(
      tooltipWith('Kapsam Kontrol', 'Onay Bekleniyor', 'SLA: 00:01:59:59')
    );
  });

  it('changes only the active step markers when the SLA passes zero', () => {
    mockTickingClock({
      remainingSeconds: 1,
      slaCountdown: '00:00:00:01',
      slaCountdownColor: 'orange.6',
    });
    render({
      currentStepTargetStartDate: 1_788_710_400,
      currentStepId: WorkflowStep.ScopeControl,
      currentStepName: 'Kapsam Kontrol',
      currentStepTargetEndDate: 1_788_969_600,
      timelineItems: startedTimelineItems,
    });
    const activeCard = getStepCards().find((card) => card.dataset.state === 'current');
    const activeSegment = container.querySelector<HTMLElement>(
      '[role="img"] [data-state="current"]'
    );
    const cardClass = activeCard?.className;
    const initialCardRenders = mocks.boxRender.mock.calls.filter(
      ([name]) => name === cardClass
    ).length;

    act(() =>
      tickClock?.({
        remainingSeconds: 0,
        slaCountdown: '00:00:00:00',
        slaCountdownColor: 'orange.6',
      })
    );
    expect(activeCard?.dataset.exceeded).toBeUndefined();
    expect(activeSegment?.dataset.exceeded).toBeUndefined();
    expect(mocks.boxRender.mock.calls.filter(([name]) => name === cardClass)).toHaveLength(
      initialCardRenders
    );
    const zeroSla = Array.from(activeCard?.querySelectorAll<HTMLElement>('*') ?? []).find(
      (element) =>
        element.textContent?.trim() === 'SLA: 00:00:00:00' && element.hasAttribute('style')
    );
    expect(zeroSla?.getAttribute('style')).toContain('orange-6');

    act(() =>
      tickClock?.({
        remainingSeconds: -1,
        slaCountdown: '-00:00:00:01',
        slaCountdownColor: 'red.6',
      })
    );
    expect(activeCard?.dataset.exceeded).toBe('true');
    expect(activeCard?.querySelector('[data-state="current"]')?.getAttribute('data-exceeded')).toBe(
      'true'
    );
    expect(activeSegment?.dataset.exceeded).toBe('true');
    expect(activeCard?.textContent).toContain('SLA: -00:00:00:01');
    expect(getStepCards().filter((card) => card.dataset.exceeded)).toHaveLength(1);
    expect(mocks.boxRender.mock.calls.filter(([name]) => name === cardClass)).toHaveLength(
      initialCardRenders + 1
    );
  });

  it('follows the new step clock and disables the clock after completion', () => {
    mockTickingClock({
      remainingSeconds: -10,
      slaCountdown: '-00:00:00:10',
      slaCountdownColor: 'red.6',
    });
    const props = {
      currentStepTargetStartDate: 1_788_710_400,
      currentStepId: WorkflowStep.ScopeControl,
      currentStepName: 'Kapsam Kontrol',
      currentStepTargetEndDate: 1_788_969_600,
      timelineItems: startedTimelineItems,
    };
    render(props);
    expect(getStepCards().find((card) => card.dataset.state === 'current')?.dataset.exceeded).toBe(
      'true'
    );
    render({
      ...props,
      currentStepTargetStartDate: props.currentStepTargetStartDate + 100,
      currentStepId: WorkflowStep.Analysis,
      currentStepName: 'Analiz',
    });
    act(() =>
      tickClock?.({ remainingSeconds: 9, slaCountdown: '00:00:00:09', slaCountdownColor: 'cyan.8' })
    );
    expect(mocks.slaCountdown).toHaveBeenLastCalledWith({
      targetStartDate: props.currentStepTargetStartDate + 100,
      enabled: true,
      targetEndDate: 1_788_969_600,
    });
    expect(getStepCards().find((card) => card.dataset.state === 'current')?.textContent).toContain(
      'Analiz'
    );
    expect(getStepCards().find((card) => card.dataset.state === 'current')?.textContent).toContain(
      '00:00:00:09'
    );
    expect(
      getStepCards().find((card) => card.dataset.state === 'current')?.dataset.exceeded
    ).toBeUndefined();

    render({ ...props, workflowStatus: WorkflowStatusEnum.Completed });
    expect(mocks.slaCountdown).toHaveBeenLastCalledWith({
      targetStartDate: props.currentStepTargetStartDate,
      enabled: false,
      targetEndDate: 1_788_969_600,
    });
    expect(getStepCards().every((card) => card.dataset.state === 'done')).toBe(true);
    expect(container.textContent).not.toContain('SLA:');
  });
});
