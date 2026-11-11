import { act } from 'react';
import { DatePickerTimestampInput } from '.';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, rem } from '@mantine/core';
import { theme } from '@/_assets/style/theme';
import { HolidayDurationType } from '@/_helpers/holiday';

const state = vi.hoisted(() => ({
  holidays: [] as { Name: string; Date: string; IsActive: boolean; DayValue: number }[],
  holidayQuery: vi.fn(),
}));

vi.mock('@/_api/hooks', () => ({
  useHolidayAll: (options: { enabled: boolean }) => {
    state.holidayQuery(options);
    return { data: { Data: state.holidays } };
  },
}));

describe('date picker highlighted delivery date', () => {
  let root: Root;
  let container: HTMLDivElement;
  const label = 'Talebin teslim tarihi';
  const changed = vi.fn();
  const day = (value: number) =>
    document.body.querySelector<HTMLButtonElement>(
      `[data-dates-dropdown] button[aria-label="2026-10-${String(value).padStart(2, '0')}"]`
    )!;

  const render = async ({
    type = 'default',
    deliveryDay = 15,
    withHolidayRules = false,
    excludeDate,
  }: {
    type?: 'default' | 'range';
    deliveryDay?: number | null;
    withHolidayRules?: boolean;
    excludeDate?: (date: string) => boolean;
  } = {}) => {
    const deliveryDate = deliveryDay === null ? undefined : new Date(2026, 9, deliveryDay);
    await act(async () =>
      root.render(
        <MantineProvider theme={theme} env="test">
          <DatePickerTimestampInput
            type={type}
            defaultDate={new Date(2026, 9, 8)}
            maxDate={deliveryDate}
            highlightedDate={deliveryDate ? { date: deliveryDate, label } : undefined}
            withHolidayRules={withHolidayRules}
            excludeDate={excludeDate}
            getDayProps={(date) => ({ 'aria-label': date })}
            onChange={changed}
            popoverProps={{ trapFocus: false, transitionProps: { duration: 0 } }}
          />
        </MantineProvider>
      )
    );
  };
  const open = () =>
    act(async () => container.querySelector<HTMLElement>('[data-dates-input]')!.click());
  const showTooltip = async () => {
    const marker = document.body.querySelector<HTMLElement>('[data-highlighted-date]')!;
    await act(async () => marker.dispatchEvent(new MouseEvent('mouseenter')));
    return document.body.querySelector('[role="tooltip"]');
  };

  beforeEach(() => {
    state.holidays = [];
    state.holidayQuery.mockClear();
    changed.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it.each(['default', 'range'] as const)(
    'marks delivery day and keeps maxDate for %s pickers',
    async (type) => {
      await render({ type });
      await open();
      expect(day(15)).toBeEnabled();
      expect(day(16)).toBeDisabled();
      expect(day(14).querySelector('[data-highlighted-date]')).toBeNull();
      const marker = day(15).querySelector<HTMLElement>('[data-highlighted-date]')!;
      expect(marker).toHaveAttribute('aria-label', label);
      expect(day(15).querySelector('.mantine-Indicator-indicator')).not.toBeNull();
      expect(marker.style.getPropertyValue('--indicator-size')).toBe(rem(10));
      expect(marker.style.getPropertyValue('--indicator-color')).toBe(
        'var(--mantine-color-violet-6)'
      );
      expect(await showTooltip()).toHaveTextContent(label);
      expect(changed).not.toHaveBeenCalled();
      expect(state.holidayQuery.mock.calls.every(([options]) => !options.enabled)).toBe(true);
    }
  );

  it('combines delivery and holiday information without enabling the holiday', async () => {
    state.holidays = [
      {
        Name: 'Test tatili',
        Date: '2026-10-15',
        IsActive: true,
        DayValue: HolidayDurationType.FullDay,
      },
    ];
    await render({ withHolidayRules: true });
    await open();
    expect(day(15)).toBeDisabled();
    expect(day(16)).toBeDisabled();
    const tooltip = await showTooltip();
    expect(tooltip).toHaveTextContent(label);
    expect(tooltip).toHaveTextContent('Test tatili');
    expect(changed).not.toHaveBeenCalled();
  });

  it('does not enable a delivery day excluded by another picker rule', async () => {
    await render({ excludeDate: (date) => date === '2026-10-15' });
    await open();
    expect(day(15)).toBeDisabled();
    expect(await showTooltip()).toHaveTextContent(label);
  });

  it('updates the mark and removes it when delivery date is removed', async () => {
    await render();
    await open();
    await render({ deliveryDay: 20 });
    expect(day(15).querySelector('[data-highlighted-date]')).toBeNull();
    expect(day(20).querySelector('[data-highlighted-date]')).not.toBeNull();
    expect(day(21)).toBeDisabled();

    await render({ deliveryDay: null });
    expect(document.body.querySelector('[data-highlighted-date]')).toBeNull();
    expect(day(21)).toBeEnabled();
    expect(changed).not.toHaveBeenCalled();
  });

  it('does not display cached holiday info when holiday rules are disabled', async () => {
    state.holidays = [
      {
        Name: 'Test tatili',
        Date: '2026-10-15',
        IsActive: true,
        DayValue: HolidayDurationType.FullDay,
      },
    ];
    await render();
    await open();
    expect(day(15)).toBeEnabled();
    const tooltip = await showTooltip();
    expect(tooltip).toHaveTextContent(label);
    expect(tooltip).not.toHaveTextContent('Test tatili');
  });
});
