import { Children, type ReactElement, type ReactNode } from 'react';
import type { BarShapeProps } from 'recharts';
import { describe, expect, it } from 'vitest';
import type { DashboardSlaChartRow } from '@/_helpers/sla';
import { barChartMinimumSize } from '../chartTheme';
import {
  createMinimumStackedBarLayout,
  getMinimumBarSize,
  renderBarWithValueLabel,
} from './presentation';

const statuses = ['onTrack', 'risky', 'exceeded'] as const;
const row: DashboardSlaChartRow = {
  onTrack: 1,
  onTrackRequestNos: ['YT-1'],
  onTrackUnits: { Team: 1 },
  risky: 2,
  riskyRequestNos: ['YT-2', 'YT-3'],
  riskyUnits: { Team: 2 },
  exceeded: 600,
  exceededRequestNos: [],
  exceededUnits: { Team: 600 },
  stepId: 2,
  team: 'Approval',
  order: 1,
  total: 603,
};

const createProps = (overrides: Partial<BarShapeProps> = {}) =>
  ({
    background: { x: 10, y: 0, height: 100, width: 300 },
    height: 24,
    width: 0.4,
    x: 10,
    y: 0,
    payload: row,
    ...overrides,
  }) as BarShapeProps;

describe('minimum stacked bar layout', () => {
  it('keeps small SLA segments visible without overlaps or modifying the data', () => {
    const getShape = createMinimumStackedBarLayout({
      orientation: 'horizontal',
      getSeriesNames: () => statuses,
    });
    const originalRow = structuredClone(row);
    const onTrack = getShape(createProps(), 'onTrack');
    const risky = getShape(createProps({ width: 0.8, x: 10.4 }), 'risky');
    const exceeded = getShape(createProps({ width: 240, x: 11.2 }), 'exceeded');

    expect(onTrack).toMatchObject({ x: 10, width: barChartMinimumSize });
    expect(risky).toMatchObject({ x: 30, width: barChartMinimumSize });
    expect(exceeded).toMatchObject({ x: 50, width: 240 });
    expect(row).toEqual(originalRow);
  });

  it('does not allocate width to zero or missing statuses', () => {
    const getShape = createMinimumStackedBarLayout({
      orientation: 'horizontal',
      getSeriesNames: () => statuses,
    });
    const props = createProps({ payload: { onTrack: 0, exceeded: 1 } });

    expect(getShape(props, 'exceeded')).toMatchObject({ x: 10, width: barChartMinimumSize });
  });

  it('offsets adjacent segments by their label-aware widths', () => {
    const getShape = createMinimumStackedBarLayout({
      orientation: 'horizontal',
      getSeriesNames: () => statuses,
    });
    const payload = { ...row, onTrack: 26, risky: 149, exceeded: 1000 };
    let nextX = 10;

    statuses.forEach((status) => {
      const value = payload[status];
      const shape = getShape(createProps({ payload, width: value * 0.001 }), status);
      const minimumWidth = getMinimumBarSize(value, 'horizontal');

      expect(shape).toMatchObject({ x: nextX, width: minimumWidth });
      nextX += minimumWidth;
    });
  });

  it('updates the cached layout when the chart is resized', () => {
    const getShape = createMinimumStackedBarLayout({
      orientation: 'horizontal',
      getSeriesNames: () => statuses,
    });

    expect(getShape(createProps({ width: 240 }), 'exceeded').width).toBe(240);
    expect(getShape(createProps({ width: 120 }), 'exceeded').width).toBe(120);
  });

  it.each([40, 80])(
    'reads a %s-series row linearly instead of rescanning it for every segment',
    (count) => {
      let reads = 0;
      const names = Array.from({ length: count }, (_, index) => `series-${index}`);
      const payload = Object.fromEntries(names.map((name) => [name, 10]));
      names.forEach((name) =>
        Object.defineProperty(payload, name, {
          get: () => {
            reads += 1;
            return 10;
          },
        })
      );
      const getShape = createMinimumStackedBarLayout({
        orientation: 'horizontal',
        getSeriesNames: () => names,
      });
      names.forEach((name) => getShape(createProps({ payload, width: 10 }), name));
      expect(reads).toBe(count * 2);
      reads = 0;
      names.forEach((name) => getShape(createProps({ payload, width: 10 }), name));
      expect(reads).toBe(count);
      reads = 0;
      names.forEach((name) => getShape(createProps({ payload, width: 20 }), name));
      expect(reads).toBe(count * 2);
    }
  );

  it('applies the same minimum and offsets to vertical stacks', () => {
    const getShape = createMinimumStackedBarLayout({
      orientation: 'vertical',
      getSeriesNames: () => statuses,
    });

    expect(getShape(createProps({ height: 0.4, width: 30 }), 'onTrack')).toMatchObject({
      y: 80,
      height: barChartMinimumSize,
    });
    expect(getShape(createProps({ height: 0.8, width: 30 }), 'risky')).toMatchObject({
      y: 60,
      height: barChartMinimumSize,
    });
  });

  it('enlarges only tiny segments when there is room, without overlaps or data changes', () => {
    const getShape = createMinimumStackedBarLayout({
      orientation: 'horizontal',
      getSeriesNames: () => statuses,
      fitToPlot: true,
    });
    const originalRow = structuredClone(row);
    const onTrack = getShape(createProps(), 'onTrack');
    const risky = getShape(createProps({ width: 0.8 }), 'risky');
    const exceeded = getShape(createProps({ width: 240 }), 'exceeded');

    expect(onTrack).toMatchObject({ x: 10, width: 20 });
    expect(risky).toMatchObject({ x: 30, width: 20 });
    expect(exceeded).toMatchObject({ x: 50, width: 240 });
    expect(row).toEqual(originalRow);
  });

  it('recalculates fitted segment sizes when only the plot boundary changes', () => {
    const getShape = createMinimumStackedBarLayout({
      orientation: 'horizontal',
      getSeriesNames: () => statuses,
      fitToPlot: true,
    });
    const props = createProps({ width: 240 });
    expect(getShape(props, 'exceeded').width).toBe(240);
    expect(
      getShape({ ...props, background: { x: 10, y: 0, height: 100, width: 120 } }, 'exceeded')
    ).toMatchObject({ x: 50, width: 80 });
  });

  it('keeps every segment within the plot even when the minimum widths cannot all fit', () => {
    const getShape = createMinimumStackedBarLayout({
      orientation: 'horizontal',
      getSeriesNames: () => statuses,
      fitToPlot: true,
    });
    statuses.forEach((status, index) => {
      const shape = getShape(
        createProps({
          width: Number(row[status] ?? 0) * 0.4,
          background: { x: 10, width: 12, y: 0, height: 24 },
        }),
        status
      );
      expect(shape).toMatchObject({ x: 10 + index * 4, width: 4 });
    });
  });
});

describe('bar value labels', () => {
  const getChildren = (shape: ReturnType<typeof renderBarWithValueLabel>) =>
    Children.toArray(shape?.props.children) as ReactElement<{
      children?: ReactNode;
      x?: number;
      fill?: string;
    }>[];

  it('places the real count in the center of an enlarged segment', () => {
    const children = getChildren(renderBarWithValueLabel(createProps({ width: 20 }), 1));

    expect(children).toHaveLength(2);
    expect(children[1].props).toMatchObject({ children: '1', x: 20 });
  });

  it('hides a label that cannot fit rather than clipping its digits', () => {
    expect(getChildren(renderBarWithValueLabel(createProps({ width: 20 }), 26))).toHaveLength(1);
    expect(getChildren(renderBarWithValueLabel(createProps({ width: 240 }), 600))).toHaveLength(2);
  });

  it.each([12, 26, 149, 1234, 1000000])(
    'keeps the full label for %s visible even when its scaled width is tiny',
    (value) => {
      const getShape = createMinimumStackedBarLayout({
        orientation: 'horizontal',
        getSeriesNames: () => statuses,
      });
      const payload = { ...row, exceeded: value };
      const shape = getShape(createProps({ payload, width: 0.1 }), 'exceeded');
      const children = getChildren(renderBarWithValueLabel(shape, value));

      expect(children).toHaveLength(2);
      expect(children[1].props).toMatchObject({
        children: value.toLocaleString(),
        x: shape.x + shape.width / 2,
      });
    }
  );

  it.each([0, -1, Number.NaN])('does not draw a bar for %s', (value) => {
    expect(renderBarWithValueLabel(createProps(), value)).toBeNull();
  });
});
