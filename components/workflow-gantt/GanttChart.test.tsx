import { act, type ComponentProps, type ReactNode } from 'react';
import type * as SvarGantt from '@svar-ui/react-gantt';
import { createRoot } from 'react-dom/client';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { MantineProvider, Table } from '@mantine/core';
import { cssVariablesResolver, theme } from '@/_assets/style/theme';
import { GanttChart, type GanttChartConfig } from './GanttChart';

type GanttProps = ComponentProps<typeof SvarGantt.Gantt>;

vi.mock('@svar-ui/react-gantt', () => ({
  Gantt: ({ cellHeight, onResizeGrid }: GanttProps) => (
    <div className="wx-grid" data-cell-height={cellHeight} data-testid="svar-gantt">
      <div className="wx-body">
        <div className="wx-cell">31.07.2026</div>
      </div>
      <button
        type="button"
        data-testid="shrink-grid"
        onClick={() => onResizeGrid?.({ width: 320, inProgress: true })}
      >
        Shrink grid
      </button>
      <button
        type="button"
        data-testid="expand-grid"
        onClick={() => onResizeGrid?.({ width: 620, inProgress: false })}
      >
        Expand grid
      </button>
    </div>
  ),
  Willow: ({ children }: { children: ReactNode }) => (
    <div style={{ color: '#2c2f3c', fontFamily: '"Open Sans", Arial, Helvetica, sans-serif' }}>
      {children}
    </div>
  ),
}));

describe('GanttChart', () => {
  it('matches project table typography instead of inheriting the Willow theme defaults', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.append(container);

    try {
      act(() => {
        root.render(
          <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
            <span data-testid="project-font" style={{ fontFamily: theme.fontFamily }} />
            <Table>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td data-testid="project-cell">31.07.2026</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
            <GanttChart config={{}} testId="gantt-chart" />
          </MantineProvider>
        );
      });
      const chart = container.querySelector<HTMLElement>('[data-testid="gantt-chart"]')!;
      const projectFont = container.querySelector<HTMLElement>('[data-testid="project-font"]')!;
      const grid = container.querySelector<HTMLElement>('[data-testid="svar-gantt"]')!;
      const gridCell = grid.querySelector<HTMLElement>('.wx-body .wx-cell')!;
      const projectCell = container.querySelector<HTMLElement>('[data-testid="project-cell"]')!;
      const gridCellStyle = getComputedStyle(gridCell);
      const projectCellStyle = getComputedStyle(projectCell);

      expect(getComputedStyle(chart).fontFamily).toBe(getComputedStyle(projectFont).fontFamily);
      expect(getComputedStyle(grid).fontFamily).toBe(getComputedStyle(projectFont).fontFamily);
      expect(gridCellStyle.color).toBe(projectCellStyle.color);
      expect(gridCellStyle.fontSize).toBe(projectCellStyle.fontSize);
      expect(gridCellStyle.fontWeight).toBe(projectCellStyle.fontWeight);
      expect(gridCellStyle.lineHeight).toBe(projectCellStyle.lineHeight);
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it('accepts typed SVAR 2.8 event names and rejects lowercase or unknown event props', () => {
    expectTypeOf<keyof GanttChartConfig>()
      .extract<'onresizegrid' | 'onzoomscale' | 'onUnknownEvent'>()
      .toEqualTypeOf<never>();
    expectTypeOf<NonNullable<GanttChartConfig['onResizeGrid']>>()
      .parameter(0)
      .toEqualTypeOf<SvarGantt.TMethodsConfig['resize-grid']>();
    expectTypeOf<NonNullable<GanttChartConfig['onZoomScale']>>()
      .parameter(0)
      .toEqualTypeOf<SvarGantt.TMethodsConfig['zoom-scale']>();
  });

  it('keeps zoom controls aligned during grid resizing and forwards the resize event', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onResizeGrid = vi.fn();
    const renderChart = (gridWidth: number) => (
      <MantineProvider>
        <GanttChart config={{ gridWidth, onResizeGrid }} testId="gantt-chart" withZoom />
      </MantineProvider>
    );

    try {
      act(() => root.render(renderChart(500)));

      const controls = container.querySelector<HTMLElement>(
        '[data-testid="gantt-chart-zoom-controls"]'
      );
      const shrinkButton = container.querySelector<HTMLButtonElement>(
        '[data-testid="shrink-grid"]'
      );
      const expandButton = container.querySelector<HTMLButtonElement>(
        '[data-testid="expand-grid"]'
      );

      expect(controls?.style.left).toBe('calc(515px)');

      act(() => shrinkButton?.click());
      expect(controls?.style.left).toBe('calc(335px)');
      expect(onResizeGrid).toHaveBeenLastCalledWith({ width: 320, inProgress: true });

      act(() => expandButton?.click());
      expect(controls?.style.left).toBe('calc(635px)');
      expect(onResizeGrid).toHaveBeenLastCalledWith({ width: 620, inProgress: false });

      act(() => root.render(renderChart(400)));
      expect(controls?.style.left).toBe('calc(415px)');
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it('shares a custom cell height with SVAR and the bar alignment styles', () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    try {
      act(() => {
        root.render(
          <MantineProvider>
            <GanttChart barSize="expanded" config={{ cellHeight: 48 }} testId="gantt-chart" />
          </MantineProvider>
        );
      });

      const ganttChart = container.querySelector<HTMLElement>('[data-testid="gantt-chart"]');
      const svarGantt = container.querySelector<HTMLElement>('[data-testid="svar-gantt"]');

      expect(ganttChart?.style.getPropertyValue('--gantt-cell-height')).toBe('48px');
      expect(svarGantt?.dataset.cellHeight).toBe('48');
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });
});
