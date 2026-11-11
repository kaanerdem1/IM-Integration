import { act, type ReactNode } from 'react';
import stepClasses from './WorkflowStepProgress.module.scss';
import { createInstance } from 'i18next';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { theme } from '@/_assets/style/theme';
import { WorkflowStatusEnum } from '@/_common/workflow';
import {
  WorkflowApproverStatusEnum,
  type WorkflowPendingApproversCardModel,
  type WorkflowTimelineItemModel,
} from '@/_hooks/_modules/workflow/workflow-view-model.types';
import { label as enLabels } from '@/_i18n/En/_label';
import { label as trLabels } from '@/_i18n/Tr/_label';
import { WorkflowActionArea } from './WorkflowActionArea';
import { WorkflowSlaCountdownText } from './WorkflowSlaCountdownText';
import { WorkflowStepProgress } from './WorkflowStepProgress';
import { WorkflowTimeline } from './WorkflowTimeline';
import { WorkflowTimelinePanel } from './WorkflowTimelinePanel';

const mocks = vi.hoisted(() => ({ openModal: vi.fn() }));
vi.mock('@/components/modal-host/_hook/useModal', () => ({
  useModal: () => ({ openModal: mocks.openModal }),
  useModalActions: () => ({ openModal: mocks.openModal }),
}));
vi.mock('@/_hooks/_modules/workflow/use-workflow-sla-countdown', () => ({
  useWorkflowSlaCountdown: () => ({ slaCountdown: '03:00:00:00', slaCountdownColor: 'green' }),
}));

describe('workflow localization', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let i18n: ReturnType<typeof createInstance>;
  const emptyTimeline = { timelineItems: [] };
  const onClose = vi.fn();
  const render = (content: ReactNode) => {
    act(() => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <MantineProvider env="test" theme={theme}>
            {content}
          </MantineProvider>
        </I18nextProvider>
      );
    });
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    i18n = createInstance();
    await i18n.init({
      lng: 'tr',
      fallbackLng: false,
      resources: structuredClone({ tr: { translation: trLabels }, en: { translation: enLabels } }),
      react: { useSuspense: false },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('updates the timeline heading, empty state and accessible labels when the language changes', async () => {
    render(
      <>
        <WorkflowActionArea actions={[]} onOpenTimeline={vi.fn()} />
        <WorkflowTimeline viewModel={emptyTimeline} onClose={onClose} />
      </>
    );
    expect(container.textContent).toContain('İş Akış Adımları');
    expect(container.textContent).toContain('İş akışı adımı bulunamadı.');
    expect(container.querySelector('button[aria-label="İş Akış Adımları"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="Akışı kapat"]')).not.toBeNull();

    await act(async () => {
      await i18n.changeLanguage('en');
    });

    expect(container.textContent).toContain('Workflow Steps');
    expect(container.textContent).toContain('No workflow steps found.');
    expect(container.querySelector('button[aria-label="Workflow Steps"]')).not.toBeNull();
    expect(container.querySelector('button[aria-label="İş Akış Adımları"]')).toBeNull();
    const closeButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Close workflow panel"]'
    );
    expect(closeButton).not.toBeNull();
    act(() => closeButton?.click());
    expect(onClose).toHaveBeenCalledOnce();
  });

  it.each([
    ['tr', 'İptal Nedenini Gör', 'İade Nedenini Gör'],
    ['en', 'View Cancellation Reason', 'View Return Reason'],
  ])(
    'translates note controls in %s without changing their payloads or service labels',
    async (language, cancelLabel, rejectLabel) => {
      await i18n.changeLanguage(language);
      const items: WorkflowTimelineItemModel[] = [
        {
          key: 'cancel',
          card: { kind: 'person', title: 'Onaycı Adı', subtitle: 'Birim Adı' },
          date: '',
          stepDefinitionName: 'Yönetici Onay',
          statusColor: 'red',
          statusLabel: 'İptal',
          statusValue: WorkflowApproverStatusEnum.Cancel,
          note: 'İptal açıklaması',
        },
        {
          key: 'reject',
          card: { kind: 'person', title: 'Onaycı Adı', subtitle: 'Birim Adı' },
          date: '',
          stepDefinitionName: 'Yönetici Onay',
          statusColor: 'orange',
          statusLabel: 'İade',
          statusValue: WorkflowApproverStatusEnum.Reject,
          note: 'İade açıklaması',
        },
      ];
      render(<WorkflowTimelinePanel items={items} title="Workflow" onClose={onClose} />);
      expect(container.textContent).toContain('Onaycı Adı');
      expect(container.textContent).toContain('Birim Adı');
      expect(container.textContent).toContain('Yönetici Onay');

      for (const [label, action, note] of [
        [cancelLabel, 'cancel', 'İptal açıklaması'],
        [rejectLabel, 'reject', 'İade açıklaması'],
      ]) {
        const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
        expect(button).not.toBeNull();
        act(() => button?.click());
        expect(mocks.openModal).toHaveBeenLastCalledWith('WorkflowActionNote', { action, note });
      }
      expect(mocks.openModal).toHaveBeenCalledTimes(2);
    }
  );

  it('preserves custom panel titles and empty messages', () => {
    render(
      <WorkflowTimelinePanel
        items={[]}
        title="Custom title"
        emptyText="Custom empty"
        onClose={onClose}
      />
    );
    expect(container.textContent).toContain('Custom title');
    expect(container.textContent).toContain('Custom empty');
    expect(container.textContent).not.toContain('İş akışı adımı bulunamadı.');
  });

  it.each([
    {
      action: 'reject',
      status: WorkflowApproverStatusEnum.Reject,
      trLabel: 'Tamamını Gör',
      enLabel: 'View Full Text',
      trReason: 'İade Nedeni',
      enReason: 'Return Reason',
    },
    {
      action: 'cancel',
      status: WorkflowApproverStatusEnum.Cancel,
      trLabel: 'Tamamını Gör',
      enLabel: 'View Full Text',
      trReason: 'İptal Nedeni',
      enReason: 'Cancellation Reason',
    },
  ] as const)(
    'localizes the inline $action action and its accessible name without changing the note',
    async ({ action, status, trLabel, enLabel, trReason, enReason }) => {
      const dimensions = { clientWidth: 280, clientHeight: 30, scrollHeight: 60 };
      for (const property of ['clientWidth', 'clientHeight', 'scrollHeight'] as const) {
        vi.spyOn(HTMLElement.prototype, property, 'get').mockImplementation(function (
          this: HTMLElement
        ) {
          return this.classList.contains(stepClasses.noteMeasure) ? dimensions[property] : 0;
        });
      }
      const note = 'İşlem açıklaması değişmeden gösterilmeli.';
      render(
        <WorkflowStepProgress
          timelineItems={[
            {
              key: 'last-action',
              stepDefinitionName: 'Alfa Test',
              card: { kind: 'person', title: 'Onaycı', subtitle: 'Birim' },
              date: '21 Eki 2026',
              statusColor: action === 'reject' ? 'orange' : 'red',
              statusLabel: 'Servisten gelen durum',
              statusValue: status,
              note,
            },
          ]}
        />
      );
      container.querySelector<HTMLDivElement>('.mantine-ScrollArea-viewport')!.scrollTo = vi.fn();

      for (const [language, label, reason] of [
        ['tr', trLabel, trReason],
        ['en', enLabel, enReason],
      ]) {
        await act(async () => i18n.changeLanguage(language));
        const button = container.querySelector<HTMLButtonElement>(
          `[data-testid="workflow-${action}-note-view"]`
        )!;
        expect(button).toHaveTextContent(label);
        expect(button).toHaveAccessibleName(`${reason}: ${label}`);
        expect(button).toHaveAttribute('aria-haspopup', 'dialog');
        expect(button).toHaveAttribute('type', 'button');
        expect(button).toHaveAttribute('data-variant', 'transparent');
        expect(button).toHaveAttribute('data-size', 'compact-xs');
        expect(button.querySelector('svg')).toBeNull();

        act(() => button.click());
        expect(mocks.openModal).toHaveBeenLastCalledWith('WorkflowActionNote', { action, note });
        expect(container.textContent).toContain('Servisten gelen durum');
        expect(container.textContent).toContain(note);
      }
      expect(mocks.openModal).toHaveBeenCalledTimes(2);
    }
  );

  it.each([2, 3])(
    'localizes the previous activity header and only labels truncated histories (%s records)',
    async (count) => {
      const item: WorkflowTimelineItemModel = {
        key: 'current',
        stepDefinitionName: 'Alfa Test',
        card: { kind: 'person', title: 'Onaycı', subtitle: 'Birim' },
        date: '',
        statusLabel: 'Onay Bekleniyor',
        statusColor: 'gray',
        statusValue: WorkflowApproverStatusEnum.WaitingProcess,
      };
      const history = Array.from({ length: count }, (_, index) => ({
        ...item,
        key: `history-${index}`,
        statusValue: WorkflowApproverStatusEnum.Approved,
        statusLabel: 'Onaylandı',
      }));
      render(
        <WorkflowStepProgress currentStepName="Alfa Test" timelineItems={[item, ...history]} />
      );
      const section = container.querySelector('section')!;
      for (const [language, heading, suffix, viewAll] of [
        ['tr', 'Önceki işlemler', '(Son 2 işlem)', 'Tümünü Gör (3)'],
        ['en', 'Previous activity', '(last 2 activities)', 'View all (3)'],
      ]) {
        await act(async () => i18n.changeLanguage(language));
        expect(section.getAttribute('aria-label')).toBe(heading);
        expect(
          section.querySelector(`.${stepClasses.historyHeadingLabel}`)?.textContent?.trim()
        ).toBe(count > 2 ? `${heading} ${suffix}` : heading);
        const button = section.querySelector<HTMLButtonElement>(`.${stepClasses.historyViewAll}`);
        if (count > 2) {
          expect(button?.textContent).toBe(viewAll);
          act(() => button!.click());
          expect(mocks.openModal).toHaveBeenLastCalledWith('WorkflowStepHistory', {
            stepName: 'Alfa Test',
            items: history.map((entry) => ({ ...entry, returnTargetName: undefined })),
          });
        } else {
          expect(button).toBeNull();
          expect(mocks.openModal).not.toHaveBeenCalled();
        }
      }
    }
  );

  it.each([false, true])(
    'uses the localized approvers title only in the horizontal card and preserves its menu (system: %s)',
    async (isSystem) => {
      const unitName = isSystem ? 'Sistem' : 'Proje Ofisi Müdürlüğü';
      const card: WorkflowPendingApproversCardModel = {
        kind: 'pending-approvers',
        title: 'Kapsam Kontrol',
        subtitle: unitName,
        dropdownLabel: 'Kapsam Kontrol - Onaycılar',
        approvers: [
          {
            Id: 'approver-1',
            User: {
              Code: isSystem ? 'system' : 'approver',
              FullName: isSystem ? 'system system' : 'Bekleyen Kullanıcı',
            },
            UnitName: unitName,
          },
        ],
      };
      Object.freeze(card);
      const items: WorkflowTimelineItemModel[] = [
        {
          card,
          key: 'current',
          date: '',
          stepDefinitionName: 'Kapsam Kontrol',
          statusColor: 'gray',
          statusLabel: 'Onay Bekleniyor',
          statusValue: WorkflowApproverStatusEnum.WaitingProcess,
        },
      ];
      render(
        <>
          <div data-testid="header">
            <WorkflowActionArea actions={[]} pendingApproversCard={card} onOpenTimeline={vi.fn()} />
          </div>
          <div data-testid="vertical">
            <WorkflowTimelinePanel items={items} title="İş Akışı" onClose={onClose} />
          </div>
          <div data-testid="horizontal">
            <WorkflowStepProgress currentStepName="Kapsam Kontrol" timelineItems={items} />
          </div>
        </>
      );

      const horizontal = container.querySelector('[data-testid="horizontal"]');
      const header = container.querySelector('[data-testid="header"]');
      const vertical = container.querySelector('[data-testid="vertical"]');
      expect(horizontal?.textContent).toContain('Onaycılar');
      expect(horizontal?.textContent).toContain(unitName);
      expect(horizontal?.textContent?.match(/Kapsam Kontrol/g)).toHaveLength(1);
      expect(header?.textContent).toContain('Kapsam Kontrol');
      expect(vertical?.textContent).toContain('Kapsam Kontrol');
      expect(header?.textContent).not.toContain('Onaycılar');
      expect(vertical?.textContent).not.toContain('Onaycılar');

      const menuTarget = horizontal?.querySelector<HTMLElement>('[aria-haspopup="menu"]');
      expect(menuTarget).not.toBeNull();
      act(() => menuTarget?.click());
      expect(menuTarget?.getAttribute('aria-expanded')).toBe('true');
      expect(document.body.textContent).toContain(
        isSystem
          ? i18n.t('label.requests.workflow.systemApproverMissingTitle')
          : 'Bekleyen Kullanıcı'
      );
      expect(document.body.textContent).not.toContain('system system');
      act(() => menuTarget?.click());

      await act(async () => {
        await i18n.changeLanguage('en');
      });

      expect(horizontal?.textContent).toContain('Approvers');
      expect(horizontal?.textContent).not.toContain('Onaycılar');
      expect(horizontal?.textContent).toContain(unitName);
      expect(horizontal?.textContent?.match(/Kapsam Kontrol/g)).toHaveLength(1);
      expect(header?.textContent).toContain('Kapsam Kontrol');
      expect(vertical?.textContent).toContain('Kapsam Kontrol');
      expect(header?.textContent).not.toContain('Approvers');
      expect(vertical?.textContent).not.toContain('Approvers');
      expect(card.title).toBe('Kapsam Kontrol');
    }
  );

  it('translates incoming return details separately from step history', async () => {
    const item: WorkflowTimelineItemModel = {
      card: { kind: 'person', title: 'Onaycı', subtitle: 'Birim' },
      date: '23.09.2026',
      key: 'development-return',
      stepDefinitionName: 'Yazılım Geliştirme',
      statusColor: 'orange',
      statusLabel: 'İade Edildi',
      statusValue: WorkflowApproverStatusEnum.Reject,
      note: 'Kapsam bilgileri eksik',
    };
    render(
      <WorkflowStepProgress
        currentStepName="Kapsam Kontrol"
        currentStepOrder={20}
        stepDefinitions={[
          { Name: 'Kapsam Kontrol', Order: 20 },
          { Name: 'Yazılım Geliştirme', Order: 30 },
        ]}
        timelineItems={[
          {
            ...item,
            key: 'current',
            stepDefinitionName: 'Kapsam Kontrol',
            statusLabel: 'Onay Bekleniyor',
            statusValue: WorkflowApproverStatusEnum.WaitingProcess,
            note: null,
          },
          item,
        ]}
      />
    );

    expect(container.querySelector('section[aria-label="Önceki işlemler"]')).not.toBeNull();
    const incomingReturn = container.querySelector('[role="group"][aria-label="İade ile geldi"]');
    expect(incomingReturn?.textContent).toContain('İade ile geldi');
    expect(incomingReturn?.textContent).toContain('İadenin Geldiği Adım: Yazılım Geliştirme');
    expect(incomingReturn?.closest('section')).toBeNull();
    expect(container.querySelector('[data-action="reject"] strong')?.textContent?.trim()).toBe(
      'İade Nedeni:'
    );
    expect(container.textContent).not.toContain('İade sonrası');
    expect(container.textContent).not.toContain('Son geçiş');
    const outgoingHistory = container.querySelector(
      '[data-state="upcoming"][data-history] section'
    );
    expect(outgoingHistory?.textContent).toContain('İade Edilen Adım: Kapsam Kontrol');

    await act(async () => {
      await i18n.changeLanguage('en');
    });

    expect(incomingReturn?.getAttribute('aria-label')).toBe('Returned to this step');
    expect(incomingReturn?.textContent).toContain('Returned to this step');
    expect(incomingReturn?.textContent).toContain('Returned From: Yazılım Geliştirme');
    expect(incomingReturn?.textContent).not.toContain('İade ile geldi');
    expect(incomingReturn?.textContent).not.toContain('Kapsam Kontrol');
    expect(incomingReturn?.textContent).toContain('Onaycı');
    expect(incomingReturn?.textContent).toContain('Kapsam bilgileri eksik');
    expect(incomingReturn?.closest('[data-state="current"]')?.querySelector('section')).toBeNull();
    expect(
      incomingReturn?.querySelector('[data-action="reject"] strong')?.textContent?.trim()
    ).toBe('Return Reason:');
    expect(container.textContent).not.toContain('After return');
    expect(container.textContent).not.toContain('Latest transition');
    expect(outgoingHistory?.textContent).toContain('Returned To: Kapsam Kontrol');
    expect(outgoingHistory?.textContent).not.toContain('İade Edilen Adım');
  });

  it('translates cancellation reason labels on both cards and history, and upcoming status', async () => {
    const cancellation: WorkflowTimelineItemModel = {
      key: 'cancel',
      stepDefinitionName: 'Kapsam Kontrol',
      card: { kind: 'person', title: 'Onaycı', subtitle: 'Birim' },
      date: '',
      statusValue: WorkflowApproverStatusEnum.Cancel,
      statusLabel: 'İptal Edildi',
      statusColor: 'red',
      note: 'İşlem gerekçesi',
    };
    render(
      <>
        <WorkflowStepProgress
          timelineItems={[cancellation]}
          workflowStatus={WorkflowStatusEnum.Cancel}
          withSla={false}
        />
        <WorkflowStepProgress
          currentStepName="Kapsam Kontrol"
          currentStepOrder={10}
          stepDefinitions={[
            { Name: 'Kapsam Kontrol', Order: 10 },
            { Name: 'Alfa Test', Order: 20 },
          ]}
          timelineItems={[
            {
              ...cancellation,
              key: 'current',
              statusValue: WorkflowApproverStatusEnum.WaitingProcess,
              statusLabel: 'Onay Bekleniyor',
              note: null,
            },
            cancellation,
          ]}
          withSla={false}
        />
      </>
    );
    const labels = () =>
      Array.from(
        container.querySelectorAll('[data-action="cancel"] :not([aria-hidden="true"]) > strong'),
        (node) => node.textContent
      );
    expect(labels()).toEqual(['İptal Nedeni: ', 'İptal Nedeni: ']);
    expect(container.textContent).toContain('Sırada');
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    expect(labels()).toEqual(['Cancellation Reason: ', 'Cancellation Reason: ']);
    expect(container.textContent).toContain('Upcoming');
    expect(container.textContent).toContain('İşlem gerekçesi');
    expect(container.textContent).not.toContain('Sırada');
  });

  it('localizes the completion fallback without changing service step names', async () => {
    render(<WorkflowStepProgress currentStepName="Kapsam Kontrol" withSla={false} />);
    expect(container.querySelectorAll('[title="Tamamlandı"]')).toHaveLength(1);
    expect(container.querySelector('[title="Kapsam Kontrol"]')).not.toBeNull();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    expect(container.querySelectorAll('[title="Completed"]')).toHaveLength(1);
    expect(container.querySelector('[title="Tamamlandı"]')).toBeNull();
    expect(container.querySelector('[title="Kapsam Kontrol"]')).not.toBeNull();
  });

  it('uses the localized SLA template without changing the countdown value', async () => {
    i18n.addResource(
      'en',
      'translation',
      'label.requests.workflow.slaCountdown',
      'Remaining SLA: {{value}}'
    );
    render(
      <WorkflowSlaCountdownText
        enabled
        targetStartDate={1_788_710_400}
        targetEndDate={1_788_969_600}
      />
    );
    expect(container.querySelector('.mantine-Text-root')?.textContent).toBe('SLA: 03:00:00:00');
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    expect(container.querySelector('.mantine-Text-root')?.textContent).toBe(
      'Remaining SLA: 03:00:00:00'
    );
  });
});
