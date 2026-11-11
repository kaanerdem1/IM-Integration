import { act, type ComponentProps } from 'react';
import { createInstance } from 'i18next';
import { createRoot, type Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MantineProvider } from '@mantine/core';
import tr from '@/_i18n/Tr';
import { ChartTooltipValue } from './ChartTooltipValue';
import { DashboardBarTooltip, type DashboardBarTooltipSeries } from './DashboardBarTooltip';

describe('DashboardBarTooltip', () => {
  let root: Root;
  let container: HTMLDivElement;
  const i18n = createInstance();

  beforeEach(async () => {
    await i18n.init({ lng: 'tr', resources: { tr: { translation: tr } } });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (props: ComponentProps<typeof DashboardBarTooltip>) => {
    act(() =>
      root.render(
        <I18nextProvider i18n={i18n}>
          <MantineProvider env="test">
            <DashboardBarTooltip {...props} />
          </MantineProvider>
        </I18nextProvider>
      )
    );
  };

  it('resolves large payloads with linear series reads and reuses the index on hover', () => {
    let nameReads = 0;
    const series: DashboardBarTooltipSeries[] = Array.from({ length: 200 }, (_, index) => ({
      color: 'cyan',
      label: `Label ${index}`,
      get name() {
        nameReads += 1;
        return `series-${index}`;
      },
    }));
    const payload = Array.from({ length: 200 }, (_, index) => ({
      dataKey: `series-${index}`,
      value: index + 1,
    }));
    render({ active: true, series, payload });
    expect(container).toHaveTextContent('Label 0');
    expect(container).toHaveTextContent('Label 199');
    expect(nameReads).toBeLessThanOrEqual(400);
    const firstRenderReads = nameReads;
    render({ active: true, series, payload: [...payload], label: 'Next category' });
    expect(container).toHaveTextContent('Next category');
    expect(nameReads).toBe(firstRenderReads);
  });

  it('keeps first-match labels, unknown-series fallbacks and zero filtering', () => {
    render({
      active: true,
      hideZeroValues: true,
      series: [
        { name: 'a', label: 'First label', color: 'cyan' },
        { name: 'a', label: 'Duplicate label', color: 'gray' },
      ],
      payload: [
        { dataKey: 'a', value: '4' },
        { dataKey: 'unknown', payload: { unknown: 3 } },
        { dataKey: 'zero', value: 0 },
      ],
    });
    expect(container).toHaveTextContent('First label');
    expect(container).not.toHaveTextContent('Duplicate label');
    expect(container).toHaveTextContent('unknown');
    expect(container).not.toHaveTextContent('zero');
    expect(
      Array.from(container.querySelectorAll('.mantine-Badge-label'), (badge) => badge.textContent)
    ).toEqual(['4', '3']);
  });

  it('updates the breakdown subtitle when series metadata changes', () => {
    const props = {
      active: true,
      payload: [{ dataKey: 'a', value: 5 }],
      breakdown: { Approved: 5, Empty: 0 },
    };
    render({ ...props, series: [{ name: 'a', label: 'Old label', color: 'cyan' }] });
    render({ ...props, series: [{ name: 'a', label: 'New label', color: 'gray' }] });
    expect(container).toHaveTextContent('New label');
    expect(container).not.toHaveTextContent('Old label');
    expect(container).toHaveTextContent('Approved');
    expect(container).not.toHaveTextContent('Empty');
  });

  it('shows names for distinct unit IDs and keeps the request total independent of unit counts', () => {
    render({
      active: true,
      label: 'Analiz',
      breakdown: { 'unit-a': 2, 'unit-b': 1 },
      breakdownLabels: { 'unit-a': 'Birim A', 'unit-b': 'Birim A' },
      payload: [{ dataKey: 'exceeded', value: 2 }],
      series: [{ name: 'exceeded', label: 'Aşan', color: 'red' }],
    });
    expect(container).toHaveTextContent('2 talep');
    expect(container).toHaveTextContent('2 birim');
    expect(container).not.toHaveTextContent('unit-a');
    expect(container).not.toHaveTextContent('unit-b');
    const viewport = container.querySelector('.mantine-ScrollArea-viewport')!;
    expect(viewport.textContent?.match(/Birim A/g)).toHaveLength(2);
    expect(
      Array.from(viewport.querySelectorAll('.mantine-Badge-label'), (badge) => badge.textContent)
    ).toEqual(['2', '1']);
  });

  it('keeps the heading outside the scrollable rows', () => {
    const props = {
      active: true,
      label: 'Metis YG',
      series: [{ name: 'count', label: 'Talep Sayısı', color: 'cyan' }],
      payload: [{ dataKey: 'count', value: 1 }],
    };
    render(props);
    expect(container.querySelector('.mantine-ScrollArea-viewport')).not.toHaveTextContent(
      'Metis YG'
    );
    expect(container).toHaveTextContent('Metis YG');
    expect(container.querySelector('.mantine-Badge-root')).toHaveTextContent('1');
    render({ ...props, hideTitle: true });
    expect(container).not.toHaveTextContent('Metis YG');
  });

  it('distinguishes the heading from the status summary', () => {
    render({
      active: true,
      label: 'Birim A',
      subtitle: 'Yolunda',
      series: [{ name: 'count', label: 'Talep Sayısı', color: 'cyan' }],
      payload: [{ dataKey: 'count', value: 1 }],
    });
    for (const text of ['Birim A', 'Yolunda']) {
      const title = Array.from(container.querySelectorAll<HTMLElement>('.mantine-Text-root')).find(
        (element) => element.textContent === text
      );
      expect(title).toHaveAttribute('data-size', text === 'Birim A' ? 'sm' : 'xs');
      expect(title?.style.fontWeight).toBe('600');
      expect(title?.style.color).toBe('');
    }
  });

  it('shares the count row appearance with tick tooltips', () => {
    act(() =>
      root.render(
        <I18nextProvider i18n={i18n}>
          <MantineProvider env="test">
            <section data-testid="tick">
              <ChartTooltipValue label="Talep Sayısı" value={1} />
            </section>
            <section data-testid="segment">
              <DashboardBarTooltip
                active
                label="Birim A"
                series={[{ name: 'count', label: 'Talep Sayısı', color: '#0C8599' }]}
                payload={[{ dataKey: 'count', value: 1 }]}
              />
            </section>
          </MantineProvider>
        </I18nextProvider>
      )
    );
    const tick = container.querySelector('[data-testid="tick"]')!;
    const segment = container.querySelector('[data-testid="segment"]')!;
    const tickBadge = tick.querySelector<HTMLElement>('.mantine-Badge-root')!;
    const segmentBadge = segment.querySelector<HTMLElement>('.mantine-Badge-root')!;
    expect(tickBadge.style.getPropertyValue('--badge-color')).toBe('var(--mantine-color-cyan-8)');
    expect(tickBadge.style.backgroundColor).toBe(segmentBadge.style.backgroundColor);
    expect(tickBadge.getAttribute('data-size')).toBe(segmentBadge.getAttribute('data-size'));
    expect(tick.querySelector('.mantine-Group-root')?.getAttribute('style')).toBe(
      segmentBadge.closest('.mantine-Group-root')?.getAttribute('style')
    );
    const label = (element: Element) =>
      Array.from(element.querySelectorAll<HTMLElement>('.mantine-Text-root')).find(
        (item) => item.textContent === 'Talep Sayısı'
      );
    expect(label(tick)?.style.fontWeight).toBe('400');
    expect(label(tick)?.getAttribute('style')).toBe(label(segment)?.getAttribute('style'));
  });

  it('keeps every unit in ScrollArea and summarizes its status and total outside it', () => {
    render({
      active: true,
      label: 'Yönetici Kontrol ve Onay',
      fieldLabel: 'İş Akışı Adımı',
      listLabel: 'Birim Dağılımı',
      subtitle: 'Aşan',
      breakdown: Object.fromEntries(
        Array.from({ length: 64 }, (_, index) => [`Birim ${index + 1}`, 1])
      ),
      payload: [{ dataKey: 'exceeded', value: 64 }],
      series: [{ name: 'exceeded', label: 'Aşan', color: 'red' }],
    });
    const viewport = container.querySelector('.mantine-ScrollArea-viewport');
    expect(viewport?.querySelectorAll('.mantine-Badge-root')).toHaveLength(64);
    expect(viewport).toHaveTextContent('Birim 64');
    expect(viewport).not.toHaveTextContent('Yönetici Kontrol ve Onay');
    expect(viewport).not.toHaveTextContent('64 talep');
    expect(viewport).toHaveTextContent('Birim Dağılımı');
    expect(viewport).not.toHaveTextContent('İş Akışı Adımı');
    expect(container).toHaveTextContent('64 birim');
    expect(container).toHaveTextContent('64 talep');
    expect(container).toHaveTextContent('Aşan');
  });

  it('aligns the title and total without an empty summary row and labels the breakdown field', () => {
    render({
      active: true,
      label: 'Ödeme Sistemleri Operasyon Müdürlüğü',
      fieldLabel: 'İş Birimi',
      listLabel: 'İş Akış Adımı',
      payload: [{ dataKey: 'workflow', value: 54 }],
      series: [{ name: 'workflow', label: 'Yönetici Kontrol ve Onay', color: 'cyan' }],
    });
    const field = Array.from(container.querySelectorAll('.mantine-Text-root')).find(
      (el) => el.textContent === 'İş Birimi'
    )!;
    expect(field.parentElement).toHaveTextContent('54 talep');
    expect(field.parentElement).not.toHaveTextContent('Ödeme Sistemleri Operasyon Müdürlüğü');
    expect(container.querySelector('.mantine-ScrollArea-viewport')).toHaveTextContent(
      'İş Akış Adımı'
    );
    expect(container.querySelector('.mantine-Badge-root')).toHaveTextContent('54');
  });

  it('preserves explicit SLA badge color overrides', () => {
    render({
      active: true,
      badgeProps: {
        color: 'teal',
        style: { backgroundColor: 'rgb(12, 166, 120)', color: 'white' },
      },
      series: [{ name: 'onTrack', label: 'Yolunda', color: 'teal' }],
      payload: [{ dataKey: 'onTrack', value: 1 }],
    });
    const badge = container.querySelector<HTMLElement>('.mantine-Badge-root');
    expect(badge?.style.backgroundColor).toBe('rgb(12, 166, 120)');
    expect(badge?.style.color).toBe('white');
  });
});
