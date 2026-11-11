import { act, Suspense, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { getRequestDistributionChartModel } from '@/_helpers/dashboard/requestDistribution';
import type { ChartLegend } from '@/components/charts/ChartLegend';
import { RequestDistributionVisualization } from './Visualization';

const mocks = vi.hoisted(() => ({
  cartesian: vi.fn(() => <div data-testid="cartesian-chart" />),
  donut: vi.fn(() => null),
  legend: vi.fn((_props: ComponentProps<typeof ChartLegend>) => null),
}));
vi.mock('./cartesian/CartesianChart', () => ({
  RequestDistributionCartesianChart: mocks.cartesian,
}));
vi.mock('./DonutChart', () => ({ RequestDistributionDonutChart: mocks.donut }));
vi.mock('./Heatmap', () => ({ RequestDistributionHeatmap: () => null }));
vi.mock('./LollipopChart', () => ({ RequestDistributionLollipopChart: () => null }));
vi.mock('./SunburstChart', () => ({ RequestDistributionSunburstChart: () => null }));
vi.mock('@/components/charts/ChartLegend', () => ({ ChartLegend: mocks.legend }));

const model = getRequestDistributionChartModel([{ PrimaryMetric: 'Birim', Count: 5 }], '', 'Talep');
const props: ComponentProps<typeof RequestDistributionVisualization> = {
  chartType: 'stacked-bar',
  countLabel: 'Talep',
  legendLabel: 'Gösterge',
  legendPosition: 'top',
  model,
  primaryFieldLabel: 'Birim',
  secondaryField: null,
};

describe('RequestDistributionVisualization render isolation', () => {
  let root: Root;
  let container: HTMLDivElement;
  const resizeCallbacks = new Map<Element, (width: number, height: number) => void>();
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.donut.mockReset().mockReturnValue(null);
    mocks.legend.mockReset().mockReturnValue(null);
    resizeCallbacks.clear();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private callback: ResizeObserverCallback) {}
        observe(target: Element) {
          resizeCallbacks.set(target, (width, height) =>
            this.callback(
              [{ target, contentRect: new DOMRect(0, 0, width, height) } as ResizeObserverEntry],
              this as unknown as ResizeObserver
            )
          );
        }
        unobserve(target: Element) {
          resizeCallbacks.delete(target);
        }
        disconnect() {}
      }
    );
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  const render = (overrides: Partial<typeof props> = {}) =>
    act(() =>
      root.render(
        <MantineProvider env="test">
          <Suspense fallback={<div data-testid="suspense-fallback" />}>
            <RequestDistributionVisualization {...props} {...overrides} />
          </Suspense>
        </MantineProvider>
      )
    );

  it('skips chart and legend rendering when parent status changes without changing chart props', () => {
    render();
    expect(mocks.cartesian).toHaveBeenCalledTimes(1);
    expect(mocks.legend).toHaveBeenCalledTimes(1);
    render();
    render();
    expect(mocks.cartesian).toHaveBeenCalledTimes(1);
    expect(mocks.legend).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
    expect(container.querySelector('[data-testid="graphic-width-container"]')).toBeNull();
  });

  it('does not redraw a fitted chart for height-only or repeated size notifications', async () => {
    render({ fitToContainer: true });
    expect(mocks.cartesian).not.toHaveBeenCalled();
    const measured = container.querySelector('[data-testid="graphic-width-container"]')!;
    const resize = async (width: number, height: number) =>
      act(async () => {
        resizeCallbacks.get(measured)?.(width, height);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      });
    await resize(320, 360);
    mocks.cartesian.mockClear();
    mocks.legend.mockClear();
    await resize(320, 600);
    await resize(320, 600);
    await resize(320, 240);
    render({ fitToContainer: true, loading: true });
    expect(mocks.cartesian).not.toHaveBeenCalled();
    expect(mocks.legend).not.toHaveBeenCalled();
    await resize(480, 240);
    expect(mocks.cartesian).toHaveBeenCalledTimes(1);
    expect(mocks.legend).toHaveBeenCalledTimes(1);
  });

  it('shows one overlay for a service request without redrawing unchanged chart content', () => {
    render({ viewportHeight: 440 });
    render({ loading: true, viewportHeight: 440 });
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(container.querySelectorAll('.mantine-LoadingOverlay-root')).toHaveLength(1);
    const overlay = container.querySelector('.mantine-LoadingOverlay-root');
    expect(overlay?.closest('.mantine-ScrollArea-root')).toBeNull();
    expect(mocks.cartesian).toHaveBeenCalledTimes(1);
    render({ loading: false, viewportHeight: 440 });
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
    expect(mocks.cartesian).toHaveBeenCalledTimes(1);
  });

  it('keeps the current chart under an overlay until a new chart type is ready', async () => {
    let finishRender: (() => void) | undefined;
    const pendingRender = new Promise<void>((resolve) => {
      finishRender = resolve;
    });
    mocks.donut.mockImplementation(() => {
      throw pendingRender;
    });
    render();
    await render({ chartType: 'donut' });
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="cartesian-chart"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="suspense-fallback"]')).toBeNull();
    mocks.donut.mockReturnValue(null);
    await act(async () => finishRender?.());
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
    expect(container.querySelector('[data-testid="cartesian-chart"]')).toBeNull();
  });

  it('discards an unfinished chart transition when another type is selected', async () => {
    let finishRender: (() => void) | undefined;
    const pendingRender = new Promise<void>((resolve) => {
      finishRender = resolve;
    });
    mocks.donut.mockImplementation(() => {
      throw pendingRender;
    });
    render();
    await render({ chartType: 'donut' });
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    await render({ chartType: 'line' });
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
    expect(container.querySelector('[data-testid="cartesian-chart"]')).not.toBeNull();
    mocks.donut.mockReturnValue(null);
    await act(async () => finishRender?.());
    expect(container.querySelector('[data-testid="cartesian-chart"]')).not.toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('still redraws for data, chart type, and legend placement changes', () => {
    render();
    render({
      model: getRequestDistributionChartModel([{ PrimaryMetric: 'Yeni', Count: 8 }], '', 'Talep'),
    });
    expect(mocks.cartesian).toHaveBeenCalledTimes(2);
    render({ chartType: 'donut' });
    expect(mocks.donut).toHaveBeenCalledTimes(1);
    render({ chartType: 'donut', legendPosition: 'left' });
    expect(mocks.donut).toHaveBeenCalledTimes(2);
    expect(mocks.legend).toHaveBeenCalledTimes(4);
  });
});
