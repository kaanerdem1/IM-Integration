import { act, useEffect, useMemo, type ComponentProps, type ReactNode } from 'react';
import type * as SvarGantt from '@svar-ui/react-gantt';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, Modal } from '@mantine/core';

import '@/_i18n/config';

import classes from './style.module.scss';
import type { GanttChartResponse } from '@/_api/_core/api-gen/types';
import { theme } from '@/_assets/style/theme';
import { getDate } from '@/_helpers/date';
import { activeSlaStatusKeys, slaStatusPresentations } from '@/_helpers/sla';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import { Modal_Workflow_Gantt } from './Modal_Workflow_Gantt';

const { ganttExec } = vi.hoisted(() => ({
  ganttExec: vi.fn(),
}));

vi.mock('@mantine/hooks', async () => {
  const actual = await vi.importActual<typeof import('@mantine/hooks')>('@mantine/hooks');

  return {
    ...actual,
    useElementSize: () => ({ height: 0, ref: vi.fn(), width: 170.25 }),
  };
});

type GanttProps = ComponentProps<typeof SvarGantt.Gantt>;

const serviceGanttData = [
  {
    StepDefinationId: 1,
    StepName: 'Talep Giriş',
    Sla: 4,
    CurrentStartDate: 1785715200,
    CurrentEndDate: 1785888000,
    StartDate: 1785715200,
    EndDate: 1786060800,
    Order: 1,
  },
  {
    StepDefinationId: 2,
    StepName: 'Yönetici Kontrol ve Onay',
    Sla: 4,
    CurrentStartDate: 1786060800,
    CurrentEndDate: 1786060800 + 4 * 86400 - 2 * 3600,
    StartDate: 1786060800,
    EndDate: 1786492800,
    Order: 2,
  },
  {
    StepDefinationId: 3,
    StepName: 'Kapsam Kontrol',
    Sla: 3,
    CurrentStartDate: 1786492800,
    CurrentEndDate: 1787011200,
    StartDate: 1786492800,
    EndDate: 1786924800,
    Order: 3,
  },
] satisfies GanttChartResponse[];

vi.mock('@svar-ui/react-gantt', () => ({
  Gantt: ({
    cellWidth,
    columns = [],
    durationUnit,
    end,
    gridWidth,
    highlightTime,
    init,
    lengthUnit,
    scales = [],
    start,
    taskTemplate: TaskTemplate,
    tasks = [],
    zoom,
  }: GanttProps) => {
    const positionedTasks = useMemo(
      () =>
        tasks.map((task, index) => ({
          ...task,
          $w: 100,
          $w_base: 100,
          $x: index * 100,
          $x_base: 0,
          $y: index * 34 + 3,
        })),
      [tasks]
    );
    const ganttApi = useMemo(
      () =>
        ({
          exec: ganttExec,
          getTask: (id: SvarGantt.ITask['id']) => positionedTasks.find((task) => task.id === id),
          getState: () => ({
            cellWidth,
            _scales: {
              diff: (next: Date, previous: Date) =>
                (next.getTime() - previous.getTime()) / (24 * 60 * 60 * 1000),
              lengthUnit: 'hour',
              minUnit: scales.at(-1)?.unit ?? 'day',
              start: new Date(2026, 0, 1),
            },
          }),
        }) as unknown as SvarGantt.IApi,
      [cellWidth, scales, positionedTasks]
    );

    useEffect(() => {
      if (init) {
        init(ganttApi);
      }
    }, [ganttApi, init]);

    const StepCell = columns && columns.find((column) => column.id === 'StepName')?.cell;

    return (
      <div
        data-cell-width={cellWidth}
        data-column-ids={(columns || []).map((column) => column.id).join(',')}
        data-duration-unit={durationUnit}
        data-end={end?.getTime()}
        data-grid-width={gridWidth}
        data-length-unit={lengthUnit}
        data-scale-units={scales.map((scale) => scale.unit).join(',')}
        data-start={start?.getTime()}
        data-step-column-width={columns && columns[0]?.width}
        data-task-ranges={tasks
          .map((task) => `${task.start?.getTime() ?? ''}-${task.end?.getTime() ?? ''}`)
          .join(',')}
        data-task-types={tasks.map((task) => task.type).join(',')}
        data-testid="workflow-gantt-chart"
        data-today-highlight={highlightTime ? 'configured' : ''}
        data-zoom-level-count={typeof zoom === 'object' ? zoom.levels?.length : 0}
      >
        {StepCell &&
          tasks.map((task) => (
            <div key={task.id} data-testid="workflow-step-cell">
              <StepCell
                api={{} as never}
                column={columns[0] as never}
                row={task as never}
                onaction={vi.fn()}
              />
            </div>
          ))}
        {TaskTemplate &&
          positionedTasks.map((task) => (
            <TaskTemplate key={task.id} api={ganttApi} data={task} onAction={vi.fn()} />
          ))}
      </div>
    );
  },
  Willow: ({ children }: { children: ReactNode }) => children,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('Modal_Workflow_Gantt', () => {
  beforeEach(() => {
    ganttExec.mockReset();
    useModalStore.getState().closeModal();
  });

  it.each([
    { mode: 'general', hasActual: true },
    { mode: 'general', hasActual: false },
    { mode: 'planned', hasActual: true },
    { mode: 'planned', hasActual: false },
  ])(
    'shows service plan dates without SLA in $mode (actual: $hasActual)',
    async ({ mode, hasActual }) => {
      const container = document.createElement('div');
      const root = createRoot(container);
      const task = {
        ...serviceGanttData[0],
        EndDate: hasActual ? serviceGanttData[0].EndDate : serviceGanttData[0].StartDate,
        CurrentStartDate: hasActual ? serviceGanttData[0].CurrentStartDate : null,
        CurrentEndDate: hasActual ? serviceGanttData[0].CurrentEndDate : null,
      } satisfies GanttChartResponse;
      document.body.appendChild(container);
      useModalStore.getState().openModal('WorkflowGantt', { No: 'YT-2486', Data: [task] });

      try {
        act(() => {
          root.render(
            <MantineProvider theme={theme}>
              <Modal.Stack>
                <Modal_Workflow_Gantt />
              </Modal.Stack>
            </MantineProvider>
          );
        });
        const modeInput = document.body.querySelector<HTMLInputElement>(`input[value="${mode}"]`);

        if (!modeInput) {
          throw new Error('Expected workflow Gantt mode control');
        }

        act(() => modeInput.click());
        const label = document.body.querySelector<HTMLElement>(
          `[data-testid="workflow-gantt-chart"] .${classes.taskLabel}`
        );

        if (!label) {
          throw new Error('Expected main plan bar label');
        }

        expect(label.querySelector(':scope > span')).toHaveTextContent(task.StepName);
        await act(async () => label.dispatchEvent(new MouseEvent('mouseenter')));
        await vi.waitFor(() => {
          const tooltip = document.body.querySelector('[role="tooltip"]');
          expect(tooltip).toHaveTextContent(task.StepName);
          expect(tooltip).toHaveTextContent('Başlangıç');
          expect(tooltip).toHaveTextContent('Bitiş');
          const values = Array.from(
            tooltip?.querySelectorAll('[style*="font-weight: 600"]') ?? [],
            (element) => element.textContent
          );
          expect(values).toEqual([
            task.StepName,
            getDate(task.StartDate, 'P'),
            getDate(task.EndDate, 'P'),
          ]);
          expect(tooltip).not.toHaveTextContent('SLA Durumu');
        });
      } finally {
        act(() => root.unmount());
        container.remove();
        useModalStore.getState().closeModal();
      }
    }
  );

  it.each([false, true])(
    'keeps the request badge informational and the modal open on click (ctrlKey: %s)',
    async (ctrlKey) => {
      const container = document.createElement('div');
      const root = createRoot(container);
      document.body.appendChild(container);
      useModalStore.getState().openModal('WorkflowGantt', {
        Id: 'issue-42',
        No: 'YT-2486',
        Data: serviceGanttData,
      });

      try {
        act(() => {
          root.render(
            <MantineProvider theme={theme}>
              <Modal.Stack>
                <Modal_Workflow_Gantt />
              </Modal.Stack>
            </MantineProvider>
          );
        });

        const requestGroup = document.body.querySelector<HTMLElement>(
          '[data-testid="workflow-gantt-header-request"]'
        );
        const requestLabel = requestGroup?.querySelector('strong');
        const requestBadge = requestGroup?.querySelector<HTMLElement>('.mantine-Badge-root');

        if (!requestBadge) {
          throw new Error('Expected the informational request number badge');
        }

        expect(requestGroup?.textContent).toBe('Talep No: YT-2486');
        expect(requestGroup?.getAttribute('aria-label')).toBe('Talep No YT-2486');
        expect(requestGroup?.style.textTransform).toBe('none');
        expect(requestLabel?.textContent).toBe('Talep No:');
        expect(requestLabel?.getAttribute('data-size')).toBe('xs');
        expect(requestLabel?.style.fontWeight).toBe('700');
        expect(requestLabel?.style.color).toContain('gray-8');
        expect(requestBadge?.getAttribute('data-size')).toBe('xs');
        expect(requestBadge?.getAttribute('data-variant')).toBe('default');
        expect(requestBadge.textContent).toBe('YT-2486');
        expect(requestBadge.style.fontWeight).toBe('600');
        expect(requestGroup?.querySelector('a, button, [role="link"]')).toBeNull();

        act(() => {
          requestBadge.dispatchEvent(
            new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey })
          );
        });

        expect(useModalStore.getState().isModalOpen('WorkflowGantt')).toBe(true);
        await act(async () => requestBadge.dispatchEvent(new MouseEvent('mouseenter')));
        expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
      } finally {
        act(() => root.unmount());
        container.remove();
        useModalStore.getState().closeModal();
      }
    }
  );

  it('shows the LoaderOrNoData empty state when modal data is missing', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.appendChild(container);
    useModalStore.getState().openModal('WorkflowGantt', { Data: null });

    try {
      act(() => {
        root.render(
          <MantineProvider theme={theme}>
            <Modal.Stack>
              <Modal_Workflow_Gantt />
            </Modal.Stack>
          </MantineProvider>
        );
      });

      expect(document.body.textContent).toContain(
        'Talep zaman çizelgesinde gösterilecek bir iş akışı adımı bulunamadı.'
      );
      expect(
        document.body.querySelector('[data-testid="workflow-gantt-header-request"]')
      ).toBeNull();
    } finally {
      act(() => root.unmount());
      container.remove();
      useModalStore.getState().closeModal();
    }
  });

  it('shows the Mantine main plan color in the legend and chart', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.appendChild(container);
    useModalStore.getState().openModal('WorkflowGantt', {
      No: 'YT-2486',
      Data: serviceGanttData,
    });

    try {
      act(() => {
        root.render(
          <MantineProvider theme={theme}>
            <Modal.Stack>
              <Modal_Workflow_Gantt />
            </Modal.Stack>
          </MantineProvider>
        );
      });

      const mainPlanBadge = Array.from(
        document.body.querySelectorAll('[data-variant="filled"]')
      ).find((element) => element.textContent === 'Ana Plan');
      const modalHeader = document.body.querySelector('.mantine-Modal-header');
      const generalModeInput =
        modalHeader?.querySelector<HTMLInputElement>('input[value="general"]');
      const plannedModeInput =
        modalHeader?.querySelector<HTMLInputElement>('input[value="planned"]');
      const actualModeInput = modalHeader?.querySelector<HTMLInputElement>('input[value="actual"]');
      const generalModeLabel = modalHeader?.querySelector<HTMLElement>(
        '.mantine-SegmentedControl-label'
      );
      const viewModeControl = generalModeInput?.closest<HTMLElement>(
        '.mantine-SegmentedControl-root'
      );
      const ganttContainer = document.body.querySelector<HTMLElement>(
        '[style*="--workflow-gantt-main-plan"]'
      );
      const ganttChart = document.body.querySelector<HTMLElement>(
        '[data-testid="workflow-gantt-chart"]'
      );
      const dailyScaleInput = document.body.querySelector<HTMLInputElement>('input[value="daily"]');
      const weeklyScaleInput =
        document.body.querySelector<HTMLInputElement>('input[value="weekly"]');
      const monthlyScaleInput =
        document.body.querySelector<HTMLInputElement>('input[value="monthly"]');
      const periodControl = dailyScaleInput?.closest<HTMLElement>('.mantine-SegmentedControl-root');
      const zoomControls = document.body.querySelector<HTMLElement>(
        '[data-testid="workflow-gantt-zoom-controls"]'
      );

      expect(mainPlanBadge).toBeDefined();
      expect(modalHeader?.textContent).toContain('YT-2486');
      expect(modalHeader?.textContent).not.toContain('Kapsam Kontrol');
      expect(modalHeader?.textContent).toContain('Genel');
      expect(modalHeader?.textContent).toContain('Planlanan');
      expect(modalHeader?.textContent).toContain('Gerçekleşen');
      expect(modalHeader?.querySelectorAll('.mantine-Badge-root')).toHaveLength(1);
      expect(generalModeInput?.checked).toBe(true);
      expect(viewModeControl?.dataset.size).toBe('sm');
      expect(periodControl?.dataset.size).toBe('xs');
      expect(ganttChart?.dataset.columnIds).toBe('StepName,Sla,StartDate,EndDate');
      expect(ganttChart?.dataset.stepColumnWidth).toBe('171');
      expect(ganttChart?.dataset.gridWidth).toBe('451');
      const stepLabels = document.body.querySelectorAll<HTMLElement>(
        '[data-testid="workflow-step-cell"] [data-truncate="end"]'
      );
      expect(Array.from(stepLabels, (label) => label.textContent)).toEqual(
        serviceGanttData.map(({ StepName }) => StepName)
      );
      expect(Array.from(stepLabels, (label) => label.title)).toEqual(
        serviceGanttData.map(({ StepName }) => StepName)
      );
      expect(ganttChart?.dataset.durationUnit).toBe('hour');
      expect(ganttChart?.dataset.lengthUnit).toBe('hour');
      expect(Number(ganttChart?.dataset.start)).toBeLessThan(1785715200 * 1000);
      expect(Number(ganttChart?.dataset.end)).toBeGreaterThan(1787011200 * 1000);
      expect(ganttChart?.dataset.cellWidth).toBe('84');
      expect(ganttChart?.dataset.scaleUnits).toBe('month,week');
      expect(ganttChart?.dataset.todayHighlight).not.toBe('');
      expect(ganttChart?.dataset.zoomLevelCount).toBe('1');
      expect(dailyScaleInput?.checked).toBe(false);
      expect(weeklyScaleInput?.checked).toBe(true);
      expect(ganttContainer?.contains(zoomControls)).toBe(true);
      expect(zoomControls?.dataset.orientation).toBe('vertical');
      expect(zoomControls?.style.left).toBe('calc(466px)');
      expect(generalModeLabel?.style.textTransform).toBe('none');
      expect(ganttContainer?.style.getPropertyValue('--workflow-gantt-main-plan')).toBe(
        'var(--mantine-color-blue-4)'
      );
      expect(document.body.querySelectorAll('button[aria-label="Gerçekleşen SLA"]')).toHaveLength(
        3
      );
      activeSlaStatusKeys.forEach((status) => {
        const expectedColor = slaStatusPresentations[status].ganttBarStyle.backgroundColor;
        const statusBadge = Array.from(
          document.body.querySelectorAll<HTMLElement>('[data-variant="light"]')
        ).find(
          (element) =>
            element.textContent ===
            {
              exceeded: 'Aşan',
              onTrack: 'Yolunda',
              risky: 'Riskli',
            }[status]
        );
        const actualSlaBar = document.body.querySelector<HTMLElement>(
          `button[aria-label="Gerçekleşen SLA"][style*="background-color: ${expectedColor}"]`
        );

        expect(statusBadge?.style.backgroundColor).toBe(
          slaStatusPresentations[status].badgeProps.style.backgroundColor
        );
        expect(statusBadge?.style.color).toBe(
          slaStatusPresentations[status].badgeProps.style.color
        );
        expect(actualSlaBar?.style.backgroundColor).toBe(expectedColor);
        expect(actualSlaBar?.style.backgroundColor).not.toBe(statusBadge?.style.backgroundColor);
      });

      if (!plannedModeInput || !actualModeInput || !weeklyScaleInput || !monthlyScaleInput) {
        throw new Error('Expected workflow Gantt mode controls');
      }

      act(() => weeklyScaleInput.click());
      expect(ganttChart?.dataset.cellWidth).toBe('84');
      expect(ganttChart?.dataset.scaleUnits).toBe('month,week');

      act(() => monthlyScaleInput.click());
      expect(ganttChart?.dataset.cellWidth).toBe('248');
      expect(ganttChart?.dataset.scaleUnits).toBe('year,quarter,month');

      const zoomOutButton = document.body.querySelector<HTMLButtonElement>(
        'button[aria-label="Uzaklaştır"]'
      );
      const zoomInButton = document.body.querySelector<HTMLButtonElement>(
        'button[aria-label="Yakınlaştır"]'
      );

      if (!zoomOutButton || !zoomInButton) {
        throw new Error('Expected workflow Gantt zoom controls');
      }

      expect(Array.from(zoomControls?.querySelectorAll('button') ?? [])).toEqual([
        zoomInButton,
        zoomOutButton,
      ]);
      expect(zoomInButton.querySelector('.tabler-icon-plus')).not.toBeNull();
      expect(zoomOutButton.querySelector('.tabler-icon-minus')).not.toBeNull();

      act(() => zoomOutButton.click());
      act(() => zoomInButton.click());
      expect(ganttExec).toHaveBeenNthCalledWith(1, 'zoom-scale', { dir: -1 });
      expect(ganttExec).toHaveBeenNthCalledWith(2, 'zoom-scale', { dir: 1 });

      act(() => plannedModeInput.click());
      expect(ganttChart?.dataset.columnIds).toBe('StepName,StartDate,EndDate');
      expect(ganttChart?.dataset.stepColumnWidth).toBe('171');
      expect(ganttChart?.dataset.gridWidth).toBe('395');
      expect(document.body.querySelectorAll('button[aria-label="Gerçekleşen SLA"]')).toHaveLength(
        0
      );
      expect(document.body.textContent).not.toContain('Gerçekleşen SLA:');

      act(() => actualModeInput.click());
      expect(document.body.querySelectorAll('[data-testid="actual-dependency"]')).toHaveLength(2);
      expect(ganttChart?.dataset.columnIds).toBe('StepName,Sla,CurrentStartDate,CurrentEndDate');
      expect(ganttChart?.dataset.stepColumnWidth).toBe('171');
      expect(ganttChart?.dataset.gridWidth).toBe('451');
      expect(ganttChart?.dataset.durationUnit).toBe('hour');
      expect(ganttChart?.dataset.lengthUnit).toBe('hour');
      expect(ganttChart?.dataset.taskRanges).toBe(
        serviceGanttData
          .map(
            (task) =>
              `${Number(task.CurrentStartDate) * 1000}-${Number(task.CurrentEndDate) * 1000}`
          )
          .join(',')
      );
      expect(ganttChart?.dataset.taskTypes).toBe('sla-on-track,sla-risky,sla-exceeded');
      const actualBars = document.body.querySelectorAll<HTMLElement>(`.${classes.actualTaskBar}`);
      expect(actualBars).toHaveLength(activeSlaStatusKeys.length);
      activeSlaStatusKeys.forEach((status, index) => {
        expect(actualBars[index].style.backgroundColor).toBe(
          slaStatusPresentations[status].ganttBarStyle.backgroundColor
        );
        expect(actualBars[index].style.color).toBe(
          slaStatusPresentations[status].ganttBarStyle.color
        );
      });
      expect(document.body.querySelectorAll('button[aria-label="Gerçekleşen SLA"]')).toHaveLength(
        0
      );
      expect(
        Array.from(document.body.querySelectorAll('[data-variant="filled"]')).find(
          (element) => element.textContent === 'Ana Plan'
        )
      ).toBeUndefined();
    } finally {
      act(() => root.unmount());
      container.remove();
      useModalStore.getState().closeModal();
    }
  });
});
