import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RequestListFilterValue } from '@/pages/requests/list/_config';
import { getDefaultRequestFilterValue } from '../_config/defaultRequestFilter';
import { resolveRelativeDateFilters } from '../_utils/relativeDateFilters';
import { useDefaultRequestFilter } from './useDefaultRequestFilter';
import { useResolvedDateFilters } from './useResolvedDateFilters';

afterEach(() => vi.useRealTimers());

describe('default request filter', () => {
  it('preserves hook order between missing, absolute and relative filters in StrictMode', () => {
    const root = createRoot(document.createElement('div'));
    const renderValue = vi.fn();
    const Probe = ({ value }: { value?: RequestListFilterValue }) => {
      renderValue(useResolvedDateFilters(value));
      return null;
    };
    const values: (RequestListFilterValue | undefined)[] = [
      undefined,
      { listCreatedQuickRange: 'last-year' },
      { listCreatedFrom: '123' },
      { listCreatedQuickRange: 'last-month' },
      undefined,
    ];
    try {
      for (const value of values) {
        act(() =>
          root.render(
            <StrictMode>
              <Probe value={value} />
            </StrictMode>
          )
        );
        expect(renderValue.mock.lastCall![0]).toEqual(
          value ? resolveRelativeDateFilters(value) : undefined
        );
        if (value?.listCreatedFrom) {
          expect(renderValue.mock.lastCall![0]).toBe(value);
        }
      }
      expect(renderValue).toHaveBeenCalledTimes(values.length * 2);
    } finally {
      act(() => root.unmount());
    }
  });

  it('uses creation dates from one calendar year ago through the end of today', () => {
    const preset = getDefaultRequestFilterValue();
    expect(preset).toEqual({ listCreatedQuickRange: 'last-year' });
    const value = resolveRelativeDateFilters(preset, new Date(2026, 8, 28, 14, 30));
    expect(Number(value.listCreatedFrom)).toBe(new Date(2025, 8, 28).getTime() / 1000);
    expect(Number(value.listCreatedTo)).toBe(
      Math.floor(new Date(2026, 8, 28, 23, 59, 59, 999).getTime() / 1000)
    );
  });

  it('handles leap days as a calendar year, not a fixed 365-day interval', () => {
    const value = resolveRelativeDateFilters(getDefaultRequestFilterValue(), new Date(2024, 1, 29));
    expect(Number(value.listCreatedFrom)).toBe(new Date(2023, 1, 28).getTime() / 1000);
  });

  it('retains object identity during the day and recalculates on a new day without persisting dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 28, 12));
    const renderValue = vi.fn();
    const Probe = () => {
      const preset = useDefaultRequestFilter();
      renderValue(preset, useResolvedDateFilters(preset));
      return null;
    };
    const root = createRoot(document.createElement('div'));
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    try {
      act(() => root.render(<Probe />));
      const first = renderValue.mock.lastCall![0];
      const resolved = renderValue.mock.lastCall![1];
      vi.setSystemTime(new Date(2026, 8, 28, 17));
      act(() => root.render(<Probe />));
      expect(renderValue.mock.lastCall![0]).toBe(first);
      expect(renderValue.mock.lastCall![1]).toBe(resolved);
      vi.setSystemTime(new Date(2026, 8, 29));
      act(() => root.render(<Probe />));
      expect(renderValue.mock.lastCall![0]).toBe(first);
      expect(renderValue.mock.lastCall![1]).not.toBe(resolved);
      expect(renderValue.mock.lastCall![1]).toEqual(resolveRelativeDateFilters(first));
      expect(renderValue.mock.lastCall![0]).toEqual(getDefaultRequestFilterValue());
      expect(writes).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      act(() => root.unmount());
      writes.mockRestore();
    }
  });
});
