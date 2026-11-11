import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { PieLabelRenderProps } from 'recharts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { AppSunburstChart, type AppSunburstChartProps } from './AppSunburstChart';
import { ChartHighlightStoreContext, createChartHighlightStore } from './chartHighlightStore';
import { chartMarkThickness } from './chartTheme';
import type { SunburstRingSegment } from './sunburst/layout';

type Ring = {
  children: ReactNode;
  data: SunburstRingSegment[];
  innerRadius: number;
  outerRadius: number;
  label: false | ((props: PieLabelRenderProps) => ReactNode);
};
const mocks = vi.hoisted(() => ({ rings: [] as Ring[] }));
vi.mock('recharts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('recharts')>()),
  ResponsiveContainer: ({ children }: { children: ReactNode }) => children,
  PieChart: ({ children }: { children: ReactNode }) => <svg>{children}</svg>,
  Pie: (props: Ring) => {
    mocks.rings.push(props);
    return <g>{props.children}</g>;
  },
  Cell: ({ fill }: { fill: string }) => <path fill={fill} />,
  Tooltip: () => null,
}));

describe('sunburst ring thickness', () => {
  let root: Root;
  let container: HTMLDivElement;
  const data = [
    {
      name: 'Ana kırılım',
      value: 100,
      children: [
        { name: 'A', value: 50 },
        { name: 'B', value: 50 },
      ],
    },
  ];
  beforeEach(() => {
    mocks.rings = [];
    container = document.createElement('div');
    root = createRoot(container);
  });
  afterEach(() => act(() => root.unmount()));
  const render = (size: number, overrides: Partial<AppSunburstChartProps> = {}) =>
    act(() =>
      root.render(
        <MantineProvider env="test">
          <AppSunburstChart
            data={data}
            chartLabel="100"
            chartLabelTitle="Toplam"
            size={size}
            innerRadius={size / 4}
            labelsType="value-percent"
            rootRingPosition="outer"
            sunburstChartProps={{ ringPadding: 6 }}
            {...overrides}
          />
        </MantineProvider>
      )
    );

  it.each([
    [160, 24],
    [200, 24],
    [320, 24],
    [360, 27],
    [480, 32],
  ])('keeps both rings equally thick and bounded in a %spx chart', (size, thickness) => {
    render(size);
    const [outer, inner] = mocks.rings;
    expect(outer.outerRadius - outer.innerRadius).toBe(thickness);
    expect(inner.outerRadius - inner.innerRadius).toBe(thickness);
    expect(outer.innerRadius - inner.outerRadius).toBe(6);
    expect(outer.outerRadius).toBe(size / 2 - 4);
  });

  it('uses the single-ring proportions when there is no child breakdown', () => {
    render(360, { data: [{ name: 'A', value: 100 }] });
    expect(mocks.rings).toHaveLength(1);
    expect(mocks.rings[0].outerRadius - mocks.rings[0].innerRadius).toBe(40);
  });

  it('scales from the actual radius override and preserves an explicit ring thickness', () => {
    render(480, { sunburstChartProps: { outerRadius: 160 } });
    expect(mocks.rings[0].outerRadius - mocks.rings[0].innerRadius).toBe(24);
    mocks.rings = [];
    render(480, { ringThickness: 28 });
    expect(mocks.rings[0].outerRadius - mocks.rings[0].innerRadius).toBe(28);
  });

  it('shrinks the center hole instead of the rings in a very small chart', () => {
    render(120);
    const [outer, inner] = mocks.rings;
    expect(outer.outerRadius - outer.innerRadius).toBe(chartMarkThickness);
    expect(inner.innerRadius).toBe(2);
    expect(outer.innerRadius - inner.outerRadius).toBe(6);
  });

  it('enforces a drawable minimum diameter without negative radii or center text overflow', () => {
    render(80);
    const [outer, inner] = mocks.rings;
    expect(outer.outerRadius - outer.innerRadius).toBe(chartMarkThickness);
    expect(inner.innerRadius).toBe(0);
    expect(outer.outerRadius).toBe(54);
    expect(container.textContent).not.toContain('Toplam');
  });

  it('omits labels that would extend outside a thin ring while retaining fitted labels', () => {
    render(480);
    const ring = mocks.rings[0];
    expect(typeof ring.label).toBe('function');
    if (typeof ring.label !== 'function') {
      return;
    }
    const props = {
      innerRadius: ring.innerRadius,
      outerRadius: ring.outerRadius,
      cx: 240,
      cy: 240,
      midAngle: 90,
      percent: 0.5,
      payload: { value: 50 },
    };
    expect(ring.label(props as unknown as PieLabelRenderProps)).not.toBeNull();
    expect(
      ring.label({
        ...props,
        midAngle: 0,
        payload: { value: 1234567 },
      } as unknown as PieLabelRenderProps)
    ).toBeNull();
  });

  it('reuses ring geometry during legend highlighting and preserves inherited colors and placeholders', () => {
    const store = createChartHighlightStore();
    act(() =>
      root.render(
        <MantineProvider env="test">
          <ChartHighlightStoreContext value={store}>
            <AppSunburstChart
              data={[
                {
                  name: 'A',
                  color: '#008080',
                  highlightKey: 'A',
                  children: [
                    { name: 'A1', value: 900 },
                    { name: 'A2', value: 1 },
                  ],
                },
                {
                  name: 'B',
                  color: '#6060cc',
                  highlightKey: 'B',
                  children: [{ name: 'B1', value: 90 }],
                },
                { name: 'C', color: '#00bb88', highlightKey: 'C', value: 9 },
              ]}
            />
          </ChartHighlightStoreContext>
        </MantineProvider>
      )
    );
    const initialRings = mocks.rings.slice();
    const initialFills = Array.from(container.querySelectorAll('path'), (path) =>
      path.getAttribute('fill')
    );
    mocks.rings = [];
    act(() => store.getState().setHighlightedKey('A'));
    expect(mocks.rings).toHaveLength(2);
    mocks.rings.forEach((ring, index) => expect(ring.data).toBe(initialRings[index].data));
    const dimmed = 'var(--mantine-color-gray-1)';
    expect(
      Array.from(container.querySelectorAll('path'), (path) => path.getAttribute('fill'))
    ).toEqual(['#008080', dimmed, dimmed, '#008080', '#008080', dimmed, 'transparent']);
    act(() => store.getState().setHighlightedKey(null));
    expect(
      Array.from(container.querySelectorAll('path'), (path) => path.getAttribute('fill'))
    ).toEqual(initialFills);
  });
});
