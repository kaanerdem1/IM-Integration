import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DonutChartProps } from '@mantine/charts';
import { MantineProvider } from '@mantine/core';
import { ChartHighlightStoreContext, createChartHighlightStore } from '../chartHighlightStore';
import { AppDonutChart, type AppDonutChartProps } from './AppDonutChart';

const mocks = vi.hoisted(() => ({ chart: vi.fn() }));
vi.mock('@mantine/charts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@mantine/charts')>()),
  DonutChart: (props: DonutChartProps) => {
    mocks.chart(props);
    return (
      <div>
        <svg>{props.children}</svg>
      </div>
    );
  },
}));

describe('adaptive donut proportions', () => {
  let root: Root;
  let container: HTMLDivElement;
  const store = createChartHighlightStore();
  const data = [
    { name: 'A', value: 871, color: 'cyan.6' },
    { name: 'B', value: 540, color: 'blue.6' },
  ];
  beforeEach(() => {
    mocks.chart.mockClear();
    store.getState().setHighlightedKey(null);
    container = document.createElement('div');
    root = createRoot(container);
  });
  afterEach(() => act(() => root.unmount()));
  const render = (size: number, overrides: Partial<AppDonutChartProps> = {}) =>
    act(() =>
      root.render(
        <MantineProvider env="test">
          <ChartHighlightStoreContext value={store}>
            <AppDonutChart
              data={data}
              size={size}
              chartLabel="1,411"
              chartLabelTitle="Toplam"
              {...overrides}
            />
          </ChartHighlightStoreContext>
        </MantineProvider>
      )
    );
  const center = () => Array.from(container.querySelectorAll('text > tspan'));

  it.each([
    [160, 24, 22],
    [200, 24, 22],
    [320, 35, 29],
    [360, 40, 32],
    [480, 40, 36],
  ])('keeps the ring and center text balanced at %spx', (size, thickness, fontSize) => {
    render(size);
    expect(mocks.chart.mock.lastCall?.[0]).toMatchObject({ size, thickness, data });
    expect(center()[0]).toHaveTextContent('Toplam');
    expect(center()[1]).toHaveTextContent('1,411');
    expect(center()[1]).toHaveAttribute('font-size', String(fontSize));
  });

  it('updates ring and text sizes on resize without changing the data', () => {
    render(200);
    render(480);
    expect(mocks.chart.mock.lastCall?.[0].data).toBe(data);
    expect(mocks.chart.mock.lastCall?.[0].thickness).toBe(40);
    expect(center()[1]).toHaveAttribute('font-size', '36');
  });

  it('preserves explicit thickness and keeps center text out of an undersized hole', () => {
    render(360, { thickness: 30 });
    expect(mocks.chart.mock.lastCall?.[0].thickness).toBe(30);
    render(80);
    expect(container.querySelector('text')).toBeNull();
  });

  it('keeps the same value scale on highlight and puts the percentage on its own line', () => {
    render(360);
    act(() => store.getState().setHighlightedKey('A'));
    expect(center().map((item) => item.textContent)).toEqual(['A', '871', '(61.7%)']);
    expect(center()[1]).toHaveAttribute('font-size', '32');
    expect(Number(center()[2].getAttribute('dy'))).toBeGreaterThan(0);
    act(() => store.getState().setHighlightedKey(null));
    expect(center()[1]).toHaveTextContent('1,411');
  });

  it('fits long center values inside the hole while retaining the complete value', () => {
    render(160, {
      data: [{ name: 'A', value: 123456789012, color: 'cyan.6' }],
      chartLabel: '123,456,789,012',
    });
    const value = center()[1];
    expect(value).toHaveTextContent('123,456,789,012');
    expect(Number(value.getAttribute('textLength'))).toBeLessThan(112);
    expect(value).toHaveAttribute('lengthAdjust', 'spacingAndGlyphs');
  });
});
