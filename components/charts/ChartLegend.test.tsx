import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { ChartHighlightProvider } from './ChartHighlightProvider';
import { useChartHighlightKey } from './chartHighlightStore';
import { ChartLegend } from './ChartLegend';

const HighlightProbe = () => {
  const highlightedKey = useChartHighlightKey();

  return <span data-testid="highlight-key">{highlightedKey ?? 'none'}</span>;
};

describe('ChartLegend highlight behavior', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('publishes the hovered item key and clears it when the legend is left', () => {
    act(() => {
      root.render(
        <MantineProvider env="test">
          <ChartHighlightProvider>
            <ChartLegend
              ariaLabel="Chart legend"
              items={[
                {
                  badgeProps: { 'data-testid': 'series-count' },
                  color: 'blue',
                  highlightKey: 'series-key',
                  label: 'Series',
                  name: 'series-name',
                  value: 12,
                },
              ]}
            />
            <HighlightProbe />
          </ChartHighlightProvider>
        </MantineProvider>
      );
    });

    const legend = container.querySelector<HTMLElement>('[role="list"]');
    const legendItem = container.querySelector<HTMLElement>('[role="listitem"]');
    const highlightProbe = container.querySelector<HTMLElement>('[data-testid="highlight-key"]');

    expect(container.querySelector('[data-testid="series-count"]')?.textContent).toBe('12');

    act(() => {
      legendItem?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    expect(highlightProbe?.textContent).toBe('series-key');

    act(() => {
      legend?.dispatchEvent(
        new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })
      );
    });
    expect(highlightProbe?.textContent).toBe('none');
  });

  it('does not re-render legend content when only the highlight key changes', () => {
    const renderLabel = vi.fn(() => <span>Series</span>);
    const LegendLabel = () => renderLabel();

    act(() => {
      root.render(
        <MantineProvider env="test">
          <ChartHighlightProvider>
            <ChartLegend
              items={[
                {
                  color: 'blue',
                  label: <LegendLabel />,
                  name: 'series-name',
                  value: 12,
                },
              ]}
            />
            <HighlightProbe />
          </ChartHighlightProvider>
        </MantineProvider>
      );
    });

    const legend = container.querySelector<HTMLElement>('[role="list"]');
    const legendItem = container.querySelector<HTMLElement>('[role="listitem"]');

    expect(renderLabel).toHaveBeenCalledTimes(1);

    act(() => {
      legendItem?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    act(() => {
      legend?.dispatchEvent(
        new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })
      );
    });

    expect(renderLabel).toHaveBeenCalledTimes(1);
  });

  it('renders side legends vertically', () => {
    act(() => {
      root.render(
        <MantineProvider env="test">
          <ChartHighlightProvider>
            <ChartLegend
              items={Array.from({ length: 8 }, (_, index) => ({
                color: 'blue',
                label: `Series ${index}`,
                name: `series-${index}`,
                value: 12,
              }))}
              orientation="vertical"
            />
          </ChartHighlightProvider>
        </MantineProvider>
      );
    });

    const legend = container.querySelector<HTMLElement>('[role="list"]');
    const legendItem = container.querySelector<HTMLElement>('[role="listitem"]');

    expect(legend?.style.flexDirection).toBe('column');
    expect(legend?.dataset.layout).toBe('vertical');
    expect(legendItem?.style.width).toBe('100%');
  });

  it.each([1, 2, 4, 7, 8])('wraps %s entries without losing labels or item actions', (count) => {
    const items = Array.from({ length: count }, (_, index) => ({
      color: 'blue',
      label: `Uzun bir kırılım adı ${index}`,
      name: `series-${index}`,
      value: index + 1,
    }));
    const onItemClick = vi.fn();
    const onItemAuxClick = vi.fn();
    act(() => {
      root.render(
        <MantineProvider env="test">
          <ChartHighlightProvider>
            <ChartLegend items={items} onItemClick={onItemClick} onItemAuxClick={onItemAuxClick} />
          </ChartHighlightProvider>
        </MantineProvider>
      );
    });
    const legend = container.querySelector<HTMLElement>('[role="list"]')!;
    expect(legend.dataset.layout).toBe('wrap');
    expect(legend.style.flexWrap).toBe('wrap');
    expect(
      [...legend.querySelectorAll<HTMLElement>('[role="listitem"]')].every(
        (item) => item.style.width === 'max-content' && item.style.maxWidth === '100%'
      )
    ).toBe(true);
    expect(legend.querySelectorAll('[role="listitem"]')).toHaveLength(count);
    expect(legend.closest('.mantine-ScrollArea-root')).toBeNull();
    const labels = [...legend.querySelectorAll<HTMLElement>('.mantine-Text-root')];
    expect(labels.map((label) => label.textContent)).toEqual(items.map((item) => item.label));
    expect(labels.every((label) => label.style.whiteSpace === 'normal')).toBe(true);
    expect(labels.every((label) => label.style.flex === '0 1 auto')).toBe(true);
    expect(
      [...legend.querySelectorAll<HTMLElement>('.mantine-Badge-root')].every(
        (badge) => badge.style.flexShrink === '0'
      )
    ).toBe(true);
    act(() => legend.querySelector('button')!.click());
    expect(onItemClick).toHaveBeenCalledWith(items[0], expect.anything());
    act(() =>
      legend
        .querySelector('button')!
        .dispatchEvent(new MouseEvent('auxclick', { bubbles: true, button: 1 }))
    );
    expect(onItemAuxClick).toHaveBeenCalledWith(items[0], expect.anything());
  });
});
