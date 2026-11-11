import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { theme } from '@/_assets/style/theme';
import { getRequestDistributionChartModel } from '@/_helpers/dashboard/requestDistribution';
import { AppLollipopChart } from '@/components/charts/AppLollipopChart';
import * as barPresentation from '@/components/charts/bar/presentation';
import { RequestDistributionVisualization } from './Visualization';

const model = getRequestDistributionChartModel(
  [
    {
      PrimaryMetricId: 'unit-1',
      PrimaryMetric: 'Birim A',
      SecondaryMetricId: 'size-1',
      SecondaryMetric: 'Large',
      Count: 8,
    },
    {
      PrimaryMetricId: 'unit-1',
      PrimaryMetric: 'Birim A',
      SecondaryMetricId: null,
      SecondaryMetric: 'Belirtilmemiş',
      Count: 2,
    },
    {
      PrimaryMetricId: 'unit-2',
      PrimaryMetric: 'Birim B',
      SecondaryMetricId: 'size-1',
      SecondaryMetric: 'Large',
      Count: 4,
    },
  ],
  '',
  ''
);
const onOpen = vi.fn((_selection, event) => {
  event.preventDefault();
  event.stopPropagation();
});
const base: ComponentProps<typeof RequestDistributionVisualization> = {
  chartType: 'stacked-bar',
  countLabel: 'Talep',
  legendLabel: 'Gösterge',
  legendPosition: 'top',
  model,
  primaryFieldLabel: 'Birim',
  secondaryField: 'talep-boyutu',
  onOpen,
};

const unspecifiedModel = getRequestDistributionChartModel(
  [
    {
      PrimaryMetricId: 'unit-1',
      PrimaryMetric: 'Birim A',
      SecondaryMetricId: 'size-1',
      SecondaryMetric: 'Large',
      Count: 8,
    },
    {
      PrimaryMetricId: 'unit-1',
      PrimaryMetric: 'Birim A',
      SecondaryMetricId: null,
      SecondaryMetric: 'Belirtilmemiş',
      Count: 2,
    },
    {
      PrimaryMetricId: null,
      PrimaryMetric: 'Belirtilmemiş',
      SecondaryMetricId: 'size-1',
      SecondaryMetric: 'Large',
      Count: 3,
    },
  ],
  '',
  ''
);
const disabledMessage = 'Belirtilmemiş değerler için talep listesi filtrelemesi desteklenmiyor.';

describe('graphic interactions in the rendered chart', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(() => {
    onOpen.mockClear();
    // jsdom omits SVG transforms, including on sectors recreated during hover.
    Object.defineProperty(SVGElement.prototype, 'getScreenCTM', {
      configurable: true,
      value: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 900, 440)
    );
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private callback: ResizeObserverCallback) {}
        observe(target: Element) {
          this.callback(
            [{ contentRect: new DOMRect(0, 0, 900, 440), target } as ResizeObserverEntry],
            this as unknown as ResizeObserver
          );
        }
        disconnect() {}
        unobserve() {}
      }
    );
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    Reflect.deleteProperty(SVGElement.prototype, 'getScreenCTM');
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  const render = async (props: Partial<typeof base> = {}) => {
    await act(async () =>
      root.render(
        <MantineProvider theme={theme} env="test">
          <RequestDistributionVisualization {...base} {...props} />
        </MantineProvider>
      )
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  };
  it.each([
    'stacked-bar',
    'stacked-horizontal-bar',
    'grouped-bar',
    'grouped-horizontal-bar',
  ] as const)(
    '%s highlights by mouse and keyboard without rendering bars again',
    async (chartType) => {
      const renderBar = vi.spyOn(barPresentation, 'renderBarWithValueLabel');
      await render({ chartType });
      expect(renderBar).toHaveBeenCalled();
      renderBar.mockClear();
      const legend = container.querySelector<HTMLElement>('[role="list"]')!;
      const [first, second] = legend.querySelectorAll<HTMLElement>('[role="listitem"]');
      const paths = Array.from(container.querySelectorAll('.recharts-bar-rectangle path'));
      const geometry = paths.map((path) => path.getAttribute('d'));

      await act(async () => first.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
      expect(container.querySelector('[style*="--chart-highlight: 0"]')).not.toBeNull();
      expect(container.querySelector('[style*="--chart-highlight-0: 1"]')).not.toBeNull();
      await act(async () => second.dispatchEvent(new FocusEvent('focusin', { bubbles: true })));
      expect(container.querySelector('[style*="--chart-highlight-1: 1"]')).not.toBeNull();
      expect(container.querySelector('[style*="--chart-highlight-0: 1"]')).toBeNull();
      await act(async () =>
        legend.dispatchEvent(
          new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })
        )
      );
      expect(container.querySelector('[style*="--chart-highlight: 0"]')).toBeNull();
      expect(paths.map((path) => path.getAttribute('d'))).toEqual(geometry);
      expect(
        paths.every((path) => path.getAttribute('fill-opacity')?.includes('--chart-highlight-'))
      ).toBe(true);
      expect(renderBar).not.toHaveBeenCalled();
    }
  );

  const click = async (selector: string) => {
    const element = container.querySelector(selector);
    expect(element, selector).not.toBeNull();
    await act(async () =>
      element!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    );
    return element!;
  };

  const expectDisabled = async (element: Element) => {
    expect(element).toHaveAttribute('aria-disabled', 'true');
    await act(async () => {
      element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      element.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true })
      );
      element.dispatchEvent(
        new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 })
      );
      element.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter' })
      );
      element.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' })
      );
    });
    expect(onOpen).not.toHaveBeenCalled();
  };

  const hover = async (target: Element) => {
    await act(async () => {
      target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      target.dispatchEvent(new MouseEvent('mouseenter'));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
  };

  it.each([
    'stacked-horizontal-bar',
    'grouped-horizontal-bar',
    'lollipop',
    'heatmap',
    'standalone-lollipop',
  ] as const)(
    '%s closes the previous interactive tick tooltip when another tick opens',
    async (chartType) => {
      if (chartType === 'standalone-lollipop') {
        await act(async () =>
          root.render(
            <MantineProvider theme={theme} env="test">
              <AppLollipopChart
                data={[
                  { label: 'Birim A', value: 10 },
                  { label: 'Birim B', value: 4 },
                ]}
                getKey={(item) => item.label}
                getLabel={(item) => item.label}
                getValue={(item) => item.value}
                onItemOpen={onOpen}
                xAxisLabel="Talep Sayısı"
              />
            </MantineProvider>
          )
        );
        await act(async () => {
          await new Promise((resolve) => requestAnimationFrame(resolve));
        });
      } else {
        await render({ chartType, countLabel: 'Talep Sayısı' });
      }
      const firstTick = container.querySelector(
        chartType === 'heatmap'
          ? '[role="rowheader"][aria-label="Birim A"]'
          : '[role="link"][aria-label="Birim A (10)"]'
      );
      const nextTick = container.querySelector(
        chartType === 'heatmap'
          ? '[role="rowheader"][aria-label="Birim B"]'
          : '[role="link"][aria-label="Birim B (4)"]'
      );
      expect(firstTick).not.toBeNull();
      expect(nextTick).not.toBeNull();
      await hover(firstTick!);
      expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
      expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('Birim A');

      // The previous interactive tooltip can still be open when another target is entered.
      await hover(nextTick!);
      expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
      expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('Birim B');
      expect(document.querySelector('[role="tooltip"]')).not.toHaveTextContent('Birim A');
      expect(document.querySelector('[role="tooltip"]')).toHaveAttribute('data-interactive');
      expect(document.querySelector('[role="tooltip"]')).toHaveAttribute('data-fixed');

      if (chartType === 'lollipop' || chartType === 'standalone-lollipop') {
        const dot = container.querySelector('g[role="button"][aria-label="Birim A: 10"]');
        expect(dot).not.toBeNull();
        await hover(dot!);
        expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
        expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('Birim A');
      }
    }
  );

  it.each(['stacked-bar', 'grouped-bar', 'line', 'area', 'stacked-area', 'donut'] as const)(
    '%s shows only the current label tooltip with fixed positioning',
    async (chartType) => {
      const firstLabel = 'Kurumsal Uygulamalar Birinci Birim';
      const secondLabel = 'Kurumsal Uygulamalar İkinci Birim';
      await render({
        chartType,
        model: getRequestDistributionChartModel(
          [
            {
              PrimaryMetricId: 'unit-1',
              PrimaryMetric: firstLabel,
              SecondaryMetric: 'Large',
              Count: 8,
            },
            {
              PrimaryMetricId: 'unit-2',
              PrimaryMetric: secondLabel,
              SecondaryMetric: 'Large',
              Count: 4,
            },
          ],
          '',
          ''
        ),
      });
      const firstTick = container.querySelector(
        `${chartType === 'donut' ? 'p' : ''}[role="link"][aria-label="${firstLabel}"]`
      );
      const secondTick = container.querySelector(
        `${chartType === 'donut' ? 'p' : ''}[role="link"][aria-label="${secondLabel}"]`
      );
      expect(firstTick).not.toBeNull();
      expect(secondTick).not.toBeNull();
      await hover(firstTick!);
      expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
      await hover(secondTick!);
      const tooltip = document.querySelector('[role="tooltip"]');
      expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
      expect(tooltip).toHaveTextContent(secondLabel);
      expect(tooltip).toHaveAttribute('data-fixed');
    }
  );

  it('replaces the heatmap row tooltip when a cell opens', async () => {
    await render({ chartType: 'heatmap' });
    const row = container.querySelector('[role="rowheader"][aria-label="Birim A"]');
    const cell = container.querySelector('[aria-label="Birim B, Large: 4"]');
    expect(row).not.toBeNull();
    expect(cell).not.toBeNull();
    await hover(row!);
    await hover(cell!);
    expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('Birim B');
    expect(document.querySelector('[role="tooltip"]')).toHaveAttribute('data-fixed');
  });

  it.each(['stacked-bar', 'line', 'area', 'donut', 'sunburst', 'heatmap'] as const)(
    '%s replaces legend tooltips without leaving the previous label open',
    async (chartType) => {
      await render({
        chartType,
        legendPosition: 'left',
        model: getRequestDistributionChartModel(
          [
            {
              PrimaryMetricId: 'unit-1',
              PrimaryMetric: 'Birim A',
              SecondaryMetricId: 'size-1',
              SecondaryMetric: 'Large',
              Count: 8,
            },
            {
              PrimaryMetricId: 'unit-2',
              PrimaryMetric: 'Birim B',
              SecondaryMetricId: 'size-2',
              SecondaryMetric: 'Small',
              Count: 4,
            },
          ],
          '',
          ''
        ),
      });
      const legend = container.querySelector('[role="list"]');
      const labels = legend?.querySelectorAll('[role="listitem"] p');
      expect(labels).toHaveLength(2);
      await hover(labels![0]);
      expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
      await hover(labels![1]);
      expect(document.querySelectorAll('[role="tooltip"]')).toHaveLength(1);
      expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(labels![1].textContent!);
      expect(document.querySelector('[role="tooltip"]')).toHaveAttribute('data-fixed');
    }
  );

  it.each(['stacked-horizontal-bar', 'grouped-horizontal-bar', 'lollipop', 'heatmap'] as const)(
    '%s labels the tick tooltip count without changing the tick text',
    async (chartType) => {
      const label = 'Metis YG|Kurumsal Uygulamalar 1 YG';
      await render({
        chartType,
        countLabel: 'Talep Sayısı',
        primaryFieldLabel: 'Yazılım Birimi',
        secondaryField: null,
        model: getRequestDistributionChartModel(
          [{ PrimaryMetricId: 'unit-1|unit-2', PrimaryMetric: label, Count: 1 }],
          '',
          ''
        ),
      });
      const tick = container.querySelector(
        chartType === 'heatmap'
          ? `[role="rowheader"][aria-label="${label}"]`
          : `[role="link"][aria-label="${label} (1)"]`
      );
      expect(tick).toHaveTextContent('2 Yazılım Birimi');
      expect(tick).toHaveTextContent('(1)');
      expect(tick).toHaveStyle({
        width: chartType === 'heatmap' ? '100%' : 'fit-content',
        maxWidth: '100%',
      });
      const combinedLabel = tick!.querySelector('.tabler-icon-stack-2')?.parentElement;
      expect(combinedLabel).toHaveTextContent('2 Yazılım Birimi');
      expect(combinedLabel).not.toHaveTextContent('(1)');
      await hover(tick!);
      const tooltip = document.querySelector('[role="tooltip"]');
      expect(tooltip).toHaveTextContent('Talep Sayısı');
      expect(tooltip).not.toHaveTextContent('Talep Sayısı:');
      const countBadge = tooltip!.querySelector('.mantine-Badge-root');
      expect(countBadge).toHaveTextContent('1');
      expect(countBadge).toHaveAttribute('data-variant', 'light');
      expect(tooltip).not.toHaveTextContent('(1)');
      const countLabel = Array.from(tooltip!.querySelectorAll('.mantine-Text-root')).find(
        (element) => element.textContent === 'Talep Sayısı'
      );
      expect(countLabel).toHaveStyle({ fontWeight: '400' });
    }
  );

  it.each([
    'stacked-bar',
    'grouped-bar',
    'stacked-horizontal-bar',
    'grouped-horizontal-bar',
    'line',
    'area',
    'stacked-area',
    'donut',
    'sunburst',
    'heatmap',
    'lollipop',
  ] as const)('%s disables unspecified scopes on every rendered target', async (chartType) => {
    await render({ chartType, model: unspecifiedModel });
    const blocked = Array.from(container.querySelectorAll('[aria-disabled="true"]'));
    expect(blocked.length).toBeGreaterThan(1);
    for (const target of blocked) {
      await expectDisabled(target);
    }
    const targets = Array.from(
      container.querySelectorAll(
        '[role="link"], [role="button"], [role="list"] button, [role="cell"] button, [role="rowheader"], [role="columnheader"]'
      )
    );
    const unspecifiedTargets = targets.filter((target) =>
      (target.getAttribute('aria-label') ?? target.textContent ?? '').includes('Belirtilmemiş')
    );
    expect(unspecifiedTargets.length).toBeGreaterThan(1);
    for (const target of unspecifiedTargets) {
      await expectDisabled(target);
    }
  });

  it.each(['stacked-bar', 'heatmap', 'donut', 'sunburst', 'lollipop'] as const)(
    '%s shows the reason on hover without hiding unspecified data',
    async (chartType) => {
      await render({ chartType, model: unspecifiedModel });
      const target = container.querySelector(
        chartType === 'lollipop'
          ? 'g[role="button"][aria-disabled="true"]'
          : '[role="list"] button[aria-disabled="true"]'
      );
      expect(target).not.toBeNull();
      await hover(target!);
      expect(document.querySelector('[role="tooltip"]')).toHaveTextContent(disabledMessage);
      expect(container.textContent).toContain('Belirtilmemiş');
    }
  );

  it.each([
    ['stacked-bar', 'g[role="link"][aria-label="Birim A: 2"]'],
    ['stacked-bar', '[data-testid="graphic-category-tick"][aria-label="Belirtilmemiş"]'],
    ['stacked-horizontal-bar', '[role="link"][aria-label="Belirtilmemiş (3)"]'],
    ['heatmap', '[role="cell"] button[aria-label="Birim A, Belirtilmemiş: 2"]'],
    ['donut', 'path[role="link"][aria-label="Belirtilmemiş"]'],
    ['sunburst', 'path[role="link"][aria-label="Birim A · Belirtilmemiş"]'],
  ] as const)(
    '%s explains disabled segments and ticks on hover (%s)',
    async (chartType, selector) => {
      await render({ chartType, model: unspecifiedModel });
      const target = container.querySelector(selector);
      expect(target).not.toBeNull();
      await expectDisabled(target!);
      await hover(target!);
      expect(document.body.textContent).toContain(disabledMessage);
    }
  );

  it('keeps the ungrouped total legend available when some primary values are unspecified', async () => {
    await render({
      secondaryField: null,
      model: getRequestDistributionChartModel(
        [
          { PrimaryMetricId: 'unit-1', PrimaryMetric: 'Birim A', Count: 8 },
          { PrimaryMetricId: null, PrimaryMetric: 'Belirtilmemiş', Count: 2 },
        ],
        '',
        ''
      ),
    });
    const legend = container.querySelector<HTMLButtonElement>('[role="list"] button');
    expect(legend).not.toHaveAttribute('aria-disabled', 'true');
    await act(async () => legend!.click());
    expect(onOpen.mock.lastCall?.[0]).toEqual({ seriesName: 'series_0' });
  });

  it('keeps the disabled explanation and chart values inside one tooltip', async () => {
    await render({ chartType: 'stacked-horizontal-bar', model: unspecifiedModel });
    const target = container.querySelector('g[role="link"][aria-label="Birim A: 2"]');
    expect(target).not.toBeNull();
    await hover(target!);
    const descriptions = Array.from(document.querySelectorAll('p')).filter(
      (element) => element.textContent === disabledMessage
    );
    expect(descriptions).toHaveLength(1);
    const tooltip = descriptions[0].closest('.mantine-Paper-root');
    expect(tooltip).toHaveTextContent('Birim A');
    expect(tooltip).toHaveTextContent('Belirtilmemiş');
    expect(tooltip?.querySelector('.mantine-Badge-root')).toHaveTextContent('2');

    const normalTarget = container.querySelector('g[role="link"][aria-label="Birim A: 8"]');
    expect(normalTarget).not.toBeNull();
    await hover(normalTarget!);
    expect(document.body.textContent).not.toContain(disabledMessage);
  });

  it.each([
    'stacked-bar',
    'grouped-bar',
    'stacked-horizontal-bar',
    'grouped-horizontal-bar',
    'line',
    'area',
    'stacked-area',
    'donut',
    'sunburst',
    'heatmap',
    'lollipop',
  ] as const)(
    '%s keeps combinations intact and summarizes names by breakdown title',
    async (chartType) => {
      const combinedModel = getRequestDistributionChartModel(
        [
          {
            PrimaryMetricId: 'unit-1|unit-2',
            PrimaryMetric: 'Metis YG|Kurumsal Uygulamalar 1 YG',
            SecondaryMetricId: 'director-1|director-2',
            SecondaryMetric: 'Direktörlük A|Direktörlük B',
            Count: 1,
          },
        ],
        '',
        ''
      );
      await render({
        chartType,
        model: combinedModel,
        primaryFieldLabel: 'Yazılım Birimi',
        secondaryFieldLabel: 'Direktörlük',
        secondaryField: 'yazilim-direktoru',
      });
      expect(container.textContent).toContain('2 Yazılım Birimi');
      expect(container.textContent).not.toContain('|');
      if (chartType !== 'sunburst') {
        expect(container.querySelector('.tabler-icon-stack-2')).not.toBeNull();
      }
      const target =
        container.querySelector(
          '[role="link"][aria-label^="Metis YG"], [role="button"][aria-label^="Metis YG"], [role="rowheader"]'
        ) ?? container.querySelector('[role="list"] button');
      expect(target).not.toBeNull();
      await act(async () =>
        target!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      );
      expect(onOpen.mock.lastCall?.[0]).toMatchObject({ primaryMetric: 'id:unit-1|unit-2' });
      expect(combinedModel.data).toHaveLength(1);
      expect(combinedModel.data[0].total).toBe(1);
    }
  );

  it.each(['stacked-horizontal-bar', 'heatmap', 'lollipop'] as const)(
    '%s shows all tick names in one tooltip',
    async (chartType) => {
      await render({
        chartType,
        primaryFieldLabel: 'Yazılım Birimi',
        secondaryField: null,
        model: getRequestDistributionChartModel(
          [
            {
              PrimaryMetricId: 'unit-1|unit-2',
              PrimaryMetric: 'Metis YG|Kurumsal Uygulamalar 1 YG',
              Count: 1,
            },
          ],
          '',
          'Talep Sayısı'
        ),
      });
      const tick = container.querySelector(
        chartType === 'heatmap' ? '[role="rowheader"]' : 'foreignObject [role="link"]'
      );
      expect(tick).toHaveTextContent('2 Yazılım Birimi');
      await hover(tick!);
      const tooltip = document.querySelector('[role="tooltip"]');
      expect(tooltip).toHaveTextContent('Yazılım Birimi');
      expect(tooltip).toHaveTextContent('Metis YG');
      expect(tooltip).toHaveTextContent('Kurumsal Uygulamalar 1 YG');
      expect(tooltip?.querySelectorAll('[role="listitem"]')).toHaveLength(2);
    }
  );

  it.each([
    'stacked-bar',
    'grouped-bar',
    'stacked-horizontal-bar',
    'grouped-horizontal-bar',
    'line',
    'area',
    'stacked-area',
  ] as const)('%s opens segments, category ticks, and legends by identity', async (chartType) => {
    await render({ chartType });
    await click('g[role="link"][aria-label="Birim A: 8"]');
    expect(onOpen.mock.lastCall?.[0]).toEqual({
      primaryMetric: 'id:unit-1',
      seriesName: 'series_0',
    });
    await click(
      '[role="link"][aria-label^="Birim A"]:is(:not(g), [data-testid="graphic-category-tick"])'
    );
    expect(onOpen.mock.lastCall?.[0]).toEqual({ primaryMetric: 'id:unit-1' });
    const legend = Array.from(container.querySelectorAll('[role="list"] button')).find((item) =>
      item.textContent?.includes('Large')
    );
    expect(legend).toBeDefined();
    await act(async () => (legend as HTMLButtonElement).click());
    expect(onOpen.mock.lastCall?.[0]).toEqual({ seriesName: 'series_0' });
    expect(container.textContent).not.toContain('id:unit-1');
  });

  it('heatmap opens row, column and cell scopes', async () => {
    await render({ chartType: 'heatmap' });
    await click('[role="rowheader"][aria-label="Birim A"]');
    expect(onOpen.mock.lastCall?.[0]).toEqual({ primaryMetric: 'id:unit-1' });
    await click('[role="columnheader"][aria-label="Large"]');
    expect(onOpen.mock.lastCall?.[0]).toEqual({ seriesName: 'series_0' });
    await click('[role="cell"] button');
    expect(onOpen.mock.lastCall?.[0]).toEqual({
      primaryMetric: 'id:unit-1',
      seriesName: 'series_0',
    });
  });

  it.each(['line', 'area', 'stacked-area'] as const)(
    '%s curve represents the entire series, while points add the primary scope',
    async (chartType) => {
      await render({ chartType });
      await click('path[role="link"][aria-label="Large"]');
      expect(onOpen.mock.lastCall?.[0]).toEqual({ seriesName: 'series_0' });
    }
  );

  it('lollipop opens dots and category ticks for the primary total', async () => {
    await render({ chartType: 'lollipop' });
    await click('g[role="button"][aria-label="Birim A: 10"]');
    expect(onOpen.mock.lastCall?.[0]).toEqual({ primaryMetric: 'id:unit-1' });
    await click('[role="link"][aria-label="Birim A (10)"]');
    expect(onOpen.mock.lastCall?.[0]).toEqual({ primaryMetric: 'id:unit-1' });
  });

  it.each(['donut', 'sunburst'] as const)(
    '%s opens secondary sectors and primary sectors/titles',
    async (chartType) => {
      await render({ chartType });
      const segment = await click(
        `path[role="link"][aria-label="${chartType === 'donut' ? 'Large' : 'Birim A · Large'}"]`
      );
      expect(onOpen.mock.lastCall?.[0]).toEqual({
        primaryMetric: 'id:unit-1',
        seriesName: 'series_0',
      });
      expect(segment.getAttribute('tabindex')).toBe('0');
      await act(async () =>
        segment.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
        )
      );
      expect(onOpen).toHaveBeenCalledTimes(2);
      await click('[role="link"][aria-label="Birim A"]');
      expect(onOpen.mock.lastCall?.[0]).toEqual({
        primaryMetric: 'id:unit-1',
        ...(chartType === 'sunburst' ? { seriesName: undefined } : {}),
      });
      expect(container.textContent).not.toContain('id:unit-1');
      const legend = container.querySelector<HTMLButtonElement>('[role="list"] button');
      await act(async () => legend!.click());
      expect(onOpen.mock.lastCall?.[0]).toEqual(
        chartType === 'donut' ? { seriesName: 'series_0' } : { primaryMetric: 'id:unit-1' }
      );
    }
  );

  it.each(['donut', 'sunburst'] as const)(
    '%s without secondary breakdown opens primary sectors',
    async (chartType) => {
      await render({ chartType, secondaryField: null });
      await click('path[role="link"][aria-label="Birim A"]');
      expect(onOpen.mock.lastCall?.[0]).toEqual({ primaryMetric: 'id:unit-1' });
      const legend = container.querySelector<HTMLButtonElement>('[role="list"] button');
      await act(async () => legend!.click());
      expect(onOpen.mock.lastCall?.[0]).toEqual({ primaryMetric: 'id:unit-1' });
    }
  );

  it('opens the same scope from donut labels and sectors', async () => {
    await render({ chartType: 'donut' });
    await click('g[role="link"][aria-label="Large: 8"]');
    expect(onOpen.mock.lastCall?.[0]).toEqual({
      primaryMetric: 'id:unit-1',
      seriesName: 'series_0',
    });
  });
});
