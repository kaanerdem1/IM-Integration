import { act, type ComponentProps, type PropsWithChildren } from 'react';
import { createInstance } from 'i18next';
import { createRoot, type Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import * as graphicMetrics from '@/_helpers/dashboard/graphicMetrics';
import tr from '@/_i18n/Tr';
import { ChartTooltipValue } from '@/components/charts/ChartTooltipValue';
import { DashboardBarTooltip } from '@/components/charts/DashboardBarTooltip';
import classes from '@/components/charts/tooltip/ChartTooltipSurface.module.css';
import { RequestDistributionTooltip } from './cartesian/ChartTooltip';
import { GraphicLabelProvider } from './GraphicLabelProvider';
import { GraphicMetricLabel } from './GraphicMetricLabel';
import { GraphicTickLabel } from './GraphicTickLabel';
import { useGraphicLabels } from './useGraphicLabels';

const i18n = createInstance();
const TestProviders = ({ children }: PropsWithChildren) => (
  <I18nextProvider i18n={i18n}>
    <MantineProvider env="test">{children}</MantineProvider>
  </I18nextProvider>
);

const CombinedHeadingTooltip = ({ label }: { label: string }) => {
  const labels = useGraphicLabels();
  return (
    <DashboardBarTooltip
      active
      {...labels.primary.getTooltipHeading(label)}
      listLabel="İş Akış Adımı"
      series={[{ name: 'workflow', label: 'Planlama Kesin', color: 'cyan' }]}
      payload={[{ dataKey: 'workflow', value: 1 }]}
    />
  );
};

describe('combined metric tooltip presentation', () => {
  let root: Root;
  let container: HTMLDivElement;
  beforeEach(async () => {
    await i18n.init({ lng: 'tr', resources: { tr: { translation: tr } } });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 900, 440)
    );
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('shows every name equally in a bounded, keyboard-scrollable list', () => {
    const names = Array.from({ length: 30 }, (_, index) => `Birim ${index.toString()}`);
    act(() =>
      root.render(
        <TestProviders>
          <GraphicMetricLabel label={names.join('|')} fieldLabel="Yazılım Birimi" context="title" />
        </TestProviders>
      )
    );
    expect(container.textContent).toContain('Yazılım Birimi');
    expect(container.textContent).toContain('30 yazılım birimi birlikte');
    expect(container.textContent).not.toContain('|');
    expect(
      Array.from(container.querySelectorAll('[role="listitem"]'), (item) => item.textContent)
    ).toEqual(names);
    expect(container.querySelector('[role="list"]')).toHaveAttribute('tabindex', '0');
    expect(container.querySelector('[role="list"]')).toHaveClass('mantine-ScrollArea-viewport');
    const scrollContainer = container
      .querySelector('[role="list"]')
      ?.closest<HTMLElement>('[style*="max-height"]');
    expect(scrollContainer?.style.maxHeight).toBe('min(160px, 30vh)');
  });

  it('only decorates combined ticks, preserving the plain single-metric label', () => {
    const render = (label: string) =>
      act(() =>
        root.render(
          <TestProviders>
            <GraphicTickLabel label={label} fieldLabel="Yazılım Birimi" />
          </TestProviders>
        )
      );
    render('Metis YG');
    expect(container).toHaveTextContent('Metis YG');
    expect(container.querySelector('svg')).toBeNull();
    render('Metis YG|Kurumsal Uygulamalar 1 YG');
    expect(container.querySelector('svg')?.parentElement?.textContent).toBe('2 Yazılım Birimi');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it.each([false, true])('memoizes unchanged metric lists (detailsOnly: %s)', (detailsOnly) => {
    const split = vi.spyOn(graphicMetrics, 'splitGraphicMetric');
    const render = (label: string) =>
      act(() =>
        root.render(
          <TestProviders>
            <GraphicMetricLabel
              label={label}
              fieldLabel="Yazılım Birimi"
              context="title"
              detailsOnly={detailsOnly}
            />
          </TestProviders>
        )
      );
    render('Metis YG|Kurumsal Uygulamalar 1 YG');
    const calls = split.mock.calls.length;
    expect(calls).toBeGreaterThan(0);
    render('Metis YG|Kurumsal Uygulamalar 1 YG');
    expect(split).toHaveBeenCalledTimes(calls);
    render('Metis YG|Başka Birim');
    expect(split).toHaveBeenCalledTimes(calls + 1);
    expect(container).toHaveTextContent('Başka Birim');
  });

  it('aligns the shared request total with the heading, above the full-width member list', () => {
    const render = (label: string) =>
      act(() =>
        root.render(
          <TestProviders>
            <GraphicLabelProvider
              primaryFieldLabel="Yazılım Direktörlüğü"
              secondaryFieldLabel="İş Akış Adımı"
            >
              <CombinedHeadingTooltip label={label} />
            </GraphicLabelProvider>
          </TestProviders>
        )
      );
    render('01 Bankacılık|04 Bankacılık|05 Bankacılık');
    const header = container.querySelector(`.${classes.header}`)!;
    const heading = Array.from(header.querySelectorAll('.mantine-Text-root')).find(
      (element) => element.textContent === 'Yazılım Direktörlüğü'
    )!;
    const headingRow = heading.parentElement!;
    expect(headingRow).toHaveTextContent('1 talep');
    expect(headingRow).not.toHaveTextContent('01 Bankacılık');
    expect(header).toHaveTextContent('3 yazılım direktörlüğü birlikte');
    const members = header.querySelector('[role="list"]')!;
    expect(members.closest(`.${classes.header}`)).toBe(header);
    expect(headingRow.contains(members)).toBe(false);
    expect(members).not.toHaveTextContent('talep');
    expect(
      Array.from(members.querySelectorAll('[role="listitem"]'), (item) => item.textContent)
    ).toEqual(['01 Bankacılık', '04 Bankacılık', '05 Bankacılık']);
    expect(container.querySelectorAll('.mantine-Badge-root')).toHaveLength(1);
    expect(container.querySelector('.mantine-Badge-root')).toHaveTextContent('1');

    render('01 Bankacılık');
    expect(header).toHaveTextContent('Yazılım Direktörlüğü');
    expect(headingRow).toHaveTextContent('1 talep');
    expect(headingRow).not.toHaveTextContent('01 Bankacılık');
    expect(header).toHaveTextContent('01 Bankacılık');
    expect(header).toHaveTextContent('1 talep');
    expect(header).not.toHaveTextContent('birlikte');
    expect(header.querySelector('[role="list"]')).toBeNull();
  });

  it('uses subtle shared row separators instead of a separate heading divider', () => {
    act(() =>
      root.render(
        <TestProviders>
          <GraphicMetricLabel
            label="Metis YG|Kurumsal Uygulamalar 1 YG"
            fieldLabel="Yazılım Birimi"
          />
          <ChartTooltipValue label="Talep Sayısı" value={1} />
        </TestProviders>
      )
    );
    const separators = container.querySelectorAll('[role="separator"]');
    expect(separators).toHaveLength(1);
    for (const separator of separators) {
      expect(separator).toHaveClass('mantine-Divider-root');
    }
    expect(container).toHaveTextContent('Talep Sayısı');
    expect(container).not.toHaveTextContent('Talep Sayısı:');
    expect(container.querySelector('.mantine-Badge-root')).toHaveTextContent('1');
    const countRow = container.querySelector<HTMLElement>('.mantine-Group-root')!;
    for (const row of container.querySelectorAll<HTMLElement>('[role="listitem"]')) {
      expect(row).toHaveClass(classes.valueRow);
      expect(row.style.paddingBlock).toBe(countRow.style.paddingBlock);
    }
    expect(countRow.style.paddingBlock).not.toBe('');
  });

  it('uses the same muted field caption for single and combined values without dimming the names', () => {
    const render = (label: string) =>
      act(() =>
        root.render(
          <TestProviders>
            <GraphicMetricLabel label={label} fieldLabel="Yazılım Birimi" context="title" />
          </TestProviders>
        )
      );
    for (const label of ['Metis YG', 'Metis YG|Kurumsal Uygulamalar 1 YG']) {
      render(label);
      const heading = container.querySelector<HTMLElement>('.mantine-Text-root');
      expect(heading).toHaveTextContent('Yazılım Birimi');
      expect(heading?.style.fontWeight).toBe('600');
      expect(heading?.style.color).toBe('var(--mantine-color-dimmed)');
    }
    const metric = container.querySelector<HTMLElement>('[role="listitem"]');
    expect(metric?.style.fontWeight).toBe('400');
    expect(metric?.style.color).toBe('');
  });

  it.each(['Metis YG', 'Metis YG|Kurumsal Uygulamalar 1 YG'])(
    'preserves the tick tooltip heading color for %s',
    (label) => {
      act(() =>
        root.render(
          <TestProviders>
            <GraphicMetricLabel label={label} fieldLabel="Yazılım Birimi" context="tick" />
          </TestProviders>
        )
      );
      expect(container.querySelector<HTMLElement>('.mantine-Text-root')?.style.color).toBe('');
    }
  );

  it('keeps the same chart tooltip open while reading it, then closes on leave', async () => {
    vi.useFakeTimers();
    const parentMouseMove = vi.fn();
    const parentFocus = vi.fn();
    const props: ComponentProps<typeof RequestDistributionTooltip> = {
      active: true,
      accessibilityLayer: true,
      activeIndex: '0',
      chartContainerRef: { current: container },
      coordinate: { x: 300, y: 100 },
      label: 'primary',
      payload: [
        {
          graphicalItemId: 'bar-0',
          dataKey: 'series_0',
          value: 1,
          payload: {
            primaryMetric: 'primary',
            primaryLabel: 'Metis YG|Kurumsal Uygulamalar 1 YG',
          },
        },
      ],
      series: [
        {
          name: 'series_0',
          label: 'Direktörlük A|Direktörlük B',
          metricId: 'a|b',
          color: 'blue',
          total: 1,
        },
      ],
    };
    const render = (overrides: Partial<typeof props> = {}) =>
      act(() =>
        root.render(
          <TestProviders>
            <div onMouseMove={parentMouseMove} onFocus={parentFocus}>
              <GraphicLabelProvider
                primaryFieldLabel="Yazılım Birimi"
                secondaryFieldLabel="Direktörlük"
              >
                <RequestDistributionTooltip {...props} {...overrides} />
              </GraphicLabelProvider>
            </div>
          </TestProviders>
        )
      );
    render();
    const primaryList = document.querySelector('[role="list"][aria-label="Yazılım Birimi"]');
    expect(primaryList).toHaveTextContent('Metis YG');
    expect(primaryList).toHaveTextContent('Kurumsal Uygulamalar 1 YG');
    expect(document.querySelector('[role="list"][aria-label="Direktörlük"]')).toHaveTextContent(
      'Direktörlük B'
    );
    const surface = primaryList!.closest('[style*="pointer-events: auto"]')!;
    expect(surface).not.toBeNull();
    render({ active: false, payload: [], coordinate: undefined });
    act(() => surface.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })));
    await act(async () => vi.advanceTimersByTime(250));
    expect(document.querySelectorAll('[role="list"][aria-label="Yazılım Birimi"]')).toHaveLength(1);
    expect(surface.querySelector('.mantine-Badge-root')).toHaveTextContent('1');
    act(() => {
      surface.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
      primaryList!.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    });
    expect(parentMouseMove).not.toHaveBeenCalled();
    expect(parentFocus).not.toHaveBeenCalled();
    act(() =>
      surface.dispatchEvent(
        new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })
      )
    );
    await act(async () => vi.advanceTimersByTime(250));
    expect(document.querySelector('[role="list"][aria-label="Yazılım Birimi"]')).not.toBeNull();
    act(() =>
      primaryList!.dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body })
      )
    );
    await act(async () => vi.advanceTimersByTime(250));
    expect(document.querySelector('[role="list"][aria-label="Yazılım Birimi"]')).toBeNull();
  });
});
