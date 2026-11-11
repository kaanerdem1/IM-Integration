import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';

import '@/_i18n/config';

import { theme } from '@/_assets/style/theme';
import { getRequestDistributionChartModel } from '@/_helpers/dashboard/requestDistribution';
import { RequestDistributionVisualization } from './Visualization';

const model = getRequestDistributionChartModel(
  [
    ...Array.from({ length: 32 }, (_, index) => ({
      PrimaryMetricId: 'primary-1',
      PrimaryMetric: 'Uzun kategori adı ile ilk birim',
      SecondaryMetricId: `secondary-${index}`,
      SecondaryMetric: `Alt kırılım ${index + 1}`,
      Count: index + 1,
    })),
    {
      PrimaryMetricId: 'primary-2',
      PrimaryMetric: 'İkinci birim',
      SecondaryMetricId: 'secondary-0',
      SecondaryMetric: 'Alt kırılım 1',
      Count: 4,
    },
    {
      PrimaryMetricId: 'primary-2',
      PrimaryMetric: 'İkinci birim',
      SecondaryMetricId: null,
      SecondaryMetric: 'Belirtilmemiş',
      Count: 2,
    },
  ],
  '',
  'Talep'
);

describe('fitted dashboard charts', () => {
  let root: Root;
  let container: HTMLDivElement;
  let width: number;
  const resizeObservers = new Map<Element, () => void>();
  const onOpen = vi.fn();
  beforeEach(() => {
    onOpen.mockClear();
    width = 280;
    resizeObservers.clear();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      () => new DOMRect(0, 0, width, 360)
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private callback: ResizeObserverCallback) {}
        observe(target: Element) {
          const notify = () =>
            this.callback(
              [{ contentRect: new DOMRect(0, 0, width, 360), target } as ResizeObserverEntry],
              this as unknown as ResizeObserver
            );
          resizeObservers.set(target, notify);
          notify();
        }
        unobserve() {}
        disconnect() {}
      }
    );
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  const render = async (
    overrides: Partial<ComponentProps<typeof RequestDistributionVisualization>> = {}
  ) => {
    await act(async () =>
      root.render(
        <MantineProvider theme={theme} env="test">
          <RequestDistributionVisualization
            fitToContainer
            chartType="stacked-horizontal-bar"
            countLabel="Talep"
            legendLabel="Gösterge"
            legendPosition="top"
            model={model}
            primaryFieldLabel="Birim"
            secondaryFieldLabel="Boyut"
            secondaryField="size"
            onOpen={onOpen}
            {...overrides}
          />
        </MantineProvider>
      )
    );
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
  };

  const resize = async (nextWidth: number) => {
    await act(async () => {
      width = nextWidth;
      [...resizeObservers.values()].forEach((notify) => notify());
    });
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
  };

  it('fits heatmap cells by moving labels above, then restores left labels when space permits', async () => {
    const heatmapModel = getRequestDistributionChartModel(
      ['A', 'B'].flatMap((unit, row) =>
        [10, 3, 1].map((count, column) => ({
          PrimaryMetricId: unit,
          PrimaryMetric: `Uzun birim adı ${unit}`,
          SecondaryMetricId: `stage-${column}`,
          SecondaryMetric: `Aşama ${column}`,
          Count: count - row,
        }))
      ),
      '',
      'Talep'
    );
    await render({ chartType: 'heatmap', model: heatmapModel });
    const table = container.querySelector<HTMLElement>('[data-testid="graphic-heatmap"]')!;
    expect(table).toHaveAttribute('data-label-placement', 'above');
    expect(table.querySelectorAll('[role="columnheader"]')).toHaveLength(3);
    expect(table.querySelectorAll('[role="cell"]')).toHaveLength(6);
    const rowLabel = table.querySelector<HTMLElement>('[role="rowheader"]')!;
    expect(rowLabel.style.gridColumn).toBe('1 / -1');
    expect(rowLabel.style.position).toBe('sticky');
    expect(rowLabel).toHaveTextContent('Uzun birim adı A');

    await resize(760);
    expect(table).toHaveAttribute('data-label-placement', 'left');
    expect(table.querySelectorAll('[role="columnheader"]')).toHaveLength(4);
    expect(table.querySelectorAll('[role="cell"]')).toHaveLength(6);
    expect(rowLabel.style.gridColumn).toBe('');
    act(() => table.querySelector<HTMLButtonElement>('[role="cell"] button')!.click());
    expect(onOpen.mock.lastCall?.[0]).toEqual({ primaryMetric: 'id:A', seriesName: 'series_0' });
  });

  it('keeps every dense heatmap column in one horizontal scroll area without vertical scrolling', async () => {
    await render({ chartType: 'heatmap' });
    const table = container.querySelector<HTMLElement>('[data-testid="graphic-heatmap"]')!;
    expect(table).toHaveAttribute('data-label-placement', 'above');
    expect(table.querySelectorAll('[role="columnheader"]')).toHaveLength(model.series.length);
    expect(table.querySelectorAll('[role="cell"]')).toHaveLength(
      model.data.length * model.series.length
    );
    const viewports = container.querySelectorAll<HTMLElement>('.mantine-ScrollArea-viewport');
    expect(viewports).toHaveLength(1);
    expect(viewports[0].style.overflowY).toBe('hidden');
    await resize(1200);
    expect(table).toHaveAttribute('data-label-placement', 'above');
    expect(table.querySelectorAll('[role="cell"]')).toHaveLength(
      model.data.length * model.series.length
    );
  });

  it('moves category ticks above only when plot space is insufficient and preserves values', async () => {
    const sparseModel = getRequestDistributionChartModel(
      [
        {
          PrimaryMetricId: 'a',
          PrimaryMetric: 'Birim A',
          SecondaryMetricId: 'x',
          SecondaryMetric: 'Havuz 1',
          Count: 74,
        },
        {
          PrimaryMetricId: 'a',
          PrimaryMetric: 'Birim A',
          SecondaryMetricId: 'y',
          SecondaryMetric: 'Havuz 2',
          Count: 24,
        },
      ],
      '',
      'Talep'
    );
    await render({ model: sparseModel });
    expect(container.querySelector('input[aria-label="Birim"]')).toBeNull();
    expect(container.querySelectorAll('[role="list"][aria-label="Boyut"]')).toHaveLength(0);
    expect(
      [...container.querySelectorAll('.recharts-bar-rectangle text')].map(
        (node) => node.textContent
      )
    ).toEqual(['74', '24']);
    const narrowTickY = Number(container.querySelector('foreignObject')?.getAttribute('y'));
    expect(container.querySelector('foreignObject')).toHaveAttribute(
      'data-tick-placement',
      'above'
    );

    await resize(1200);
    expect(container.querySelector('foreignObject')).toHaveAttribute('data-tick-placement', 'left');
    expect(container.querySelector('input[aria-label="Birim"]')).toBeNull();
    expect(container.querySelectorAll('[role="list"][aria-label="Boyut"]')).toHaveLength(0);
    expect(
      [...container.querySelectorAll('.recharts-bar-rectangle text')].map(
        (node) => node.textContent
      )
    ).toEqual(['74', '24']);
    const legend = container.querySelector<HTMLElement>('[role="list"][aria-label="Gösterge"]');
    expect(legend?.dataset.layout).toBe('wrap');

    await resize(320);
    expect(container.querySelector('foreignObject')).toHaveAttribute(
      'data-tick-placement',
      'above'
    );
    expect(container.querySelector('input[aria-label="Birim"]')).toBeNull();
    expect(container.querySelectorAll('[role="list"][aria-label="Boyut"]')).toHaveLength(0);
    expect(
      [...container.querySelectorAll('.recharts-bar-rectangle text')].map(
        (node) => node.textContent
      )
    ).toEqual(['74', '24']);
    expect(Number(container.querySelector('foreignObject')?.getAttribute('y'))).toBe(narrowTickY);
    expect(
      container.querySelectorAll('[role="list"][aria-label="Gösterge"] [role="listitem"]')
    ).toHaveLength(2);
  });

  it('keeps every legend entry and category label in a narrow stacked chart', async () => {
    await render();
    expect(
      container.querySelectorAll('[role="list"][aria-label="Gösterge"] [role="listitem"]')
    ).toHaveLength(33);
    const ticks = [...container.querySelectorAll('foreignObject')].map((tick) => tick.textContent);
    expect(ticks).toContain('Uzun kategori adı ile ilk birim(528)');
    expect(ticks).toContain('İkinci birim(6)');
    expect(
      container.querySelectorAll('[role="list"][aria-label="Boyut"] [role="listitem"]')
    ).toHaveLength(0);
  });

  it.each(['grouped-horizontal-bar', 'lollipop'] as const)(
    'adapts %s main labels without duplicates or losing category actions',
    async (chartType) => {
      await render({ chartType });
      const ticks = () => [...container.querySelectorAll('foreignObject')];
      expect(ticks()).toHaveLength(2);
      ticks().forEach((tick) => expect(tick).toHaveAttribute('data-tick-placement', 'above'));
      await act(async () => {
        ticks()[0]
          .querySelector('[role="link"]')!
          .dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      expect(onOpen).toHaveBeenLastCalledWith(
        { primaryMetric: model.data[0].primaryMetric },
        expect.anything()
      );
      await resize(1200);
      expect(ticks()).toHaveLength(2);
      ticks().forEach((tick) => expect(tick).toHaveAttribute('data-tick-placement', 'left'));
    }
  );

  it('fits labels per row rather than hiding every value in a chart with many series', async () => {
    await render();
    const values = () =>
      [...container.querySelectorAll('.recharts-bar-rectangle text')].map(
        (node) => node.textContent
      );
    expect(values()).toEqual(['4', '2']);
    await resize(1200);
    expect(values()).toHaveLength(34);
  });

  it.each(['stacked-horizontal-bar', 'stacked-bar'] as const)(
    'keeps sparse %s rows readable even when the overall legend is dense',
    async (chartType) => {
      const sparseRowsModel = getRequestDistributionChartModel(
        Array.from({ length: 8 }, (_, index) => ({
          PrimaryMetricId: `primary-${index}`,
          PrimaryMetric: `Birim ${index}`,
          SecondaryMetricId: `secondary-${index}`,
          SecondaryMetric: `Kırılım ${index}`,
          Count: index + 1,
        })),
        '',
        'Talep'
      );
      await render({ chartType, model: sparseRowsModel });
      expect(container.querySelectorAll('.recharts-bar-rectangle text')).toHaveLength(8);
      const chart = container.querySelector<HTMLElement>('.mantine-BarChart-root')!;
      const height = chart.style.height;
      expect(height).not.toBe('');
      await resize(1200);
      expect(container.querySelectorAll('.recharts-bar-rectangle text')).toHaveLength(8);
      if (chartType === 'stacked-horizontal-bar') {
        expect(chart.style.height).not.toBe(height);
      } else {
        expect(chart.style.height).toBe(height);
      }
    }
  );

  it.each(['stacked-horizontal-bar', 'sunburst', 'donut'] as const)(
    'wraps the legend and lets the %s chart grow without vertical scrolling',
    async (chartType) => {
      await render({ chartType });
      const legend = container.querySelector<HTMLElement>('[role="list"][aria-label="Gösterge"]')!;
      expect(legend.dataset.layout).toBe('wrap');
      expect(legend.closest('.mantine-ScrollArea-root')).toBeNull();
      const viewports = [
        ...container.querySelectorAll<HTMLElement>('.mantine-ScrollArea-viewport'),
      ];
      expect(viewports).toHaveLength(1);
      expect(viewports[0].style.overflowY).toBe('hidden');
      expect(container.querySelector('[data-testid="graphic-breakdown"]')).toBeNull();
      expect(container.querySelector('[data-testid="graphic-breakdown-rows"]')).toBeNull();
      expect(container.querySelector('[role="combobox"], select')).toBeNull();
    }
  );

  it('restores donut value labels when the chart and external labels have room', async () => {
    const radialModel = getRequestDistributionChartModel(
      [
        { PrimaryMetricId: 'a', PrimaryMetric: 'Birim A', Count: 8 },
        { PrimaryMetricId: 'b', PrimaryMetric: 'Birim B', Count: 4 },
      ],
      '',
      'Talep'
    );
    const percentageLabels = () =>
      [...container.querySelectorAll('svg text')].filter((node) => node.textContent?.includes('%'));
    await render({ chartType: 'donut', secondaryField: null, model: radialModel });
    expect(percentageLabels()).toHaveLength(0);
    await resize(600);
    expect(percentageLabels()).toHaveLength(radialModel.data.length);
    await resize(320);
    expect(percentageLabels()).toHaveLength(0);
  });

  it('opens secondary details from bar segments and preserves drilldown restrictions', async () => {
    await render();
    expect(container.querySelector('[role="combobox"], select, input')).toBeNull();
    const segment = container.querySelector(
      '.recharts-bar-rectangle [role="link"][aria-label="İkinci birim: 4"]'
    );
    expect(segment).not.toBeNull();
    act(() => segment?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onOpen).toHaveBeenLastCalledWith(
      {
        primaryMetric: model.data[1].primaryMetric,
        seriesName: model.series.find((item) => item.label === 'Alt kırılım 1')?.name,
      },
      expect.anything()
    );
    const disabled = container.querySelector(
      '.recharts-bar-rectangle [role="link"][aria-label="İkinci birim: 2"]'
    );
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
    onOpen.mockClear();
    act(() => disabled?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it.each(['sunburst', 'donut'] as const)(
    'shows each primary group once without extra detail lists in a narrow %s chart',
    async (chartType) => {
      await render({ chartType });
      expect(container.querySelector('[role="combobox"], select, input')).toBeNull();
      expect(container.querySelectorAll('[role="list"][aria-label="Boyut"]')).toHaveLength(0);
      for (const row of model.data) {
        expect(
          [...container.querySelectorAll('p')].filter((node) =>
            node.textContent?.includes(row.primaryLabel ?? row.primaryMetric)
          )
        ).toHaveLength(1);
      }
      expect(
        container.querySelectorAll('[role="list"][aria-label="Gösterge"] [role="listitem"]')
      ).toHaveLength(chartType === 'sunburst' ? model.data.length : model.series.length);
      await resize(1200);
      expect(container.querySelectorAll('[role="list"][aria-label="Boyut"]')).toHaveLength(0);
    }
  );

  it.each(['line', 'area', 'stacked-area'] as const)(
    'keeps %s endpoints close to the numeric axis without dropping category labels',
    async (chartType) => {
      await render({ chartType });
      for (const nextWidth of [320, 1200]) {
        await resize(nextWidth);
        const firstDot = container.querySelector(
          '.recharts-line-dots circle, .recharts-area-dots circle'
        )!;
        const grid = container.querySelector('.recharts-cartesian-grid-horizontal line')!;
        expect(Number(firstDot.getAttribute('cx')) - Number(grid.getAttribute('x1'))).toBe(28);
        expect(container.querySelectorAll('[data-testid="graphic-category-tick"]')).toHaveLength(
          model.data.length
        );
      }
      await render({
        chartType,
        model: {
          ...model,
          data: model.data.map((row, index) => ({ ...row, primaryLabel: `Birim ${index + 1}` })),
        },
      });
      const firstDot = container.querySelector(
        '.recharts-line-dots circle, .recharts-area-dots circle'
      )!;
      const grid = container.querySelector('.recharts-cartesian-grid-horizontal line')!;
      expect(Number(firstDot.getAttribute('cx')) - Number(grid.getAttribute('x1'))).toBe(28);
    }
  );

  it.each(['stacked-bar', 'line', 'area'] as const)(
    'keeps all category ticks in a narrow %s chart',
    async (chartType) => {
      await render({ chartType });
      const ticks = [...container.querySelectorAll('[data-testid="graphic-category-tick"]')];
      expect(ticks.map((tick) => tick.getAttribute('aria-label'))).toEqual(
        model.data.map((row) => row.primaryLabel)
      );
      expect(ticks[0].querySelector('[data-truncate]')).not.toBeNull();
    }
  );
});
