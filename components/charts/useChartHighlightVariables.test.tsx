import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChartHighlightStoreContext, createChartHighlightStore } from './chartHighlightStore';
import { chartHighlightOpacity, useChartHighlightVariables } from './useChartHighlightVariables';

const series = [{ name: 'first' }, { name: 'second' }];
const renderProbe = vi.fn();
const Probe = ({ items = series, enabled = true } = {}) => {
  const ref = useRef<HTMLDivElement>(null);
  const variables = useChartHighlightVariables(ref, items, enabled);
  renderProbe();
  return <div ref={ref} data-testid="chart" data-variable={variables.get(items[0]?.name)} />;
};

describe('chart highlight variables', () => {
  let container: HTMLDivElement;
  let root: Root;
  let store: ReturnType<typeof createChartHighlightStore>;

  beforeEach(() => {
    renderProbe.mockClear();
    store = createChartHighlightStore();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  const render = (enabled = true, items = series) => {
    act(() =>
      root.render(
        <ChartHighlightStoreContext value={store}>
          <Probe enabled={enabled} items={items} />
        </ChartHighlightStoreContext>
      )
    );
    return container.querySelector<HTMLDivElement>('[data-testid="chart"]')!;
  };

  it('switches and clears highlights without rendering chart content', () => {
    const chart = render();
    act(() => store.getState().setHighlightedKey('first'));
    expect(chart.style.getPropertyValue('--chart-highlight')).toBe('0');
    expect(chart.style.getPropertyValue('--chart-highlight-0')).toBe('1');
    act(() => store.getState().setHighlightedKey('second'));
    expect(chart.style.getPropertyValue('--chart-highlight-0')).toBe('');
    expect(chart.style.getPropertyValue('--chart-highlight-1')).toBe('1');
    act(() => store.getState().setHighlightedKey(null));
    expect(chart.style.cssText).toBe('');
    expect(renderProbe).toHaveBeenCalledTimes(1);
  });

  it('performs a bounded number of style writes even with many series', () => {
    const items = Array.from({ length: 2000 }, (_, index) => ({ name: `series-${index}` }));
    const chart = render(true, items);
    const setProperty = vi.spyOn(chart.style, 'setProperty');
    const removeProperty = vi.spyOn(chart.style, 'removeProperty');
    act(() => store.getState().setHighlightedKey('series-0'));
    act(() => store.getState().setHighlightedKey('series-1999'));
    act(() => store.getState().setHighlightedKey('series-1999'));
    expect(setProperty).toHaveBeenCalledTimes(4);
    expect(removeProperty).toHaveBeenCalledTimes(1);
    expect(renderProbe).toHaveBeenCalledTimes(1);
  });

  it('restores normal presentation for unknown keys and disabled highlights', () => {
    const chart = render();
    act(() => store.getState().setHighlightedKey('first'));
    act(() => store.getState().setHighlightedKey('missing'));
    expect(chart.style.cssText).toBe('');
    act(() => store.getState().setHighlightedKey('first'));
    render(false);
    expect(chart.style.cssText).toBe('');
    act(() => store.getState().setHighlightedKey('second'));
    expect(chart.style.cssText).toBe('');
  });

  it('uses the current selection on mount and remaps it when series change', () => {
    store.getState().setHighlightedKey('first');
    const chart = render();
    expect(chart.style.getPropertyValue('--chart-highlight-0')).toBe('1');
    render(true, [...series].reverse());
    expect(chart.style.getPropertyValue('--chart-highlight-0')).toBe('');
    expect(chart.style.getPropertyValue('--chart-highlight-1')).toBe('1');
    render(true, [{ name: 'second' }]);
    expect(chart.style.cssText).toBe('');
  });

  it('isolates charts and removes its subscription when unmounted', () => {
    const otherStore = createChartHighlightStore();
    act(() =>
      root.render(
        <>
          <ChartHighlightStoreContext value={store}>
            <Probe />
          </ChartHighlightStoreContext>
          <ChartHighlightStoreContext value={otherStore}>
            <Probe />
          </ChartHighlightStoreContext>
        </>
      )
    );
    const [first, second] = container.querySelectorAll<HTMLDivElement>('[data-testid="chart"]');
    act(() => store.getState().setHighlightedKey('first'));
    expect(first.style.getPropertyValue('--chart-highlight')).toBe('0');
    expect(second.style.cssText).toBe('');
    act(() => root.render(null));
    const setProperty = vi.spyOn(first.style, 'setProperty');
    act(() => store.getState().setHighlightedKey('second'));
    expect(setProperty).not.toHaveBeenCalled();
    expect(first.style.cssText).toBe('');
  });

  it('keeps the original opacity and separate fill/stroke dimming values', () => {
    expect(chartHighlightOpacity('--chart-highlight-0', 0.94, 0.1)).toBe(
      'calc(0.1 + (0.94 - 0.1) * var(--chart-highlight-0, var(--chart-highlight, 1)))'
    );
    expect(chartHighlightOpacity('--chart-highlight-0', 1, 0.2)).toContain('(1 - 0.2)');
  });
});
