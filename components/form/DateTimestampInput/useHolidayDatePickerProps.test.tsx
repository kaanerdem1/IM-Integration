import { act } from 'react';
import { DatePickerTimestampInput } from '.';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { theme } from '@/_assets/style/theme';
import { mergeHolidayInfos } from './useHolidayDatePickerProps';

const getHolidayAllMock = vi.hoisted(() => vi.fn(async () => ({ Data: [] })));

vi.mock('@/_api/_core/api-gen/holiday', () => ({
  getHoliday: () => ({
    getApiHolidayAll: getHolidayAllMock,
  }),
}));

const HolidayPicker = ({ pickerKey }: { pickerKey: string }) => (
  <MantineProvider theme={theme}>
    <DatePickerTimestampInput key={pickerKey} withHolidayRules />
  </MantineProvider>
);

describe('useHolidayDatePickerProps', () => {
  it('keeps a saved past date visible when new selections start today', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    document.body.appendChild(container);

    try {
      await act(async () => {
        root.render(
          <QueryClientProvider client={queryClient}>
            <MantineProvider theme={theme}>
              <DatePickerTimestampInput
                defaultValue={Math.floor(new Date(2026, 8, 7).getTime() / 1000)}
                minDate={new Date(2026, 8, 8)}
                label="Başlangıç Tarihi"
                withHolidayRules={false}
              />
            </MantineProvider>
          </QueryClientProvider>
        );
      });

      expect(container.querySelector('input')?.value).toContain('7');
    } finally {
      await act(async () => root.unmount());
      queryClient.clear();
      container.remove();
    }
  });

  it('prefers a date-specific holiday over the matching recurring holiday', () => {
    const dateSpecificHoliday = {
      dayValue: 1,
      isHalfDay: false,
      name: '15 Temmuz',
      type: 3,
    };

    expect(
      mergeHolidayInfos([dateSpecificHoliday], [{ ...dateSpecificHoliday, name: '15 TEMMUZ' }])
    ).toEqual([dateSpecificHoliday]);
  });

  it('does not request holiday data for a disabled date picker', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    document.body.appendChild(container);
    getHolidayAllMock.mockClear();

    try {
      await act(async () => {
        root.render(
          <QueryClientProvider client={queryClient}>
            <MantineProvider theme={theme}>
              <DatePickerTimestampInput disabled withHolidayRules />
            </MantineProvider>
          </QueryClientProvider>
        );
      });
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      });

      expect(getHolidayAllMock).not.toHaveBeenCalled();
    } finally {
      await act(async () => {
        root.unmount();
      });
      queryClient.clear();
      container.remove();
    }
  });

  it('uses fresh cached holiday data when a date picker remounts', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    document.body.appendChild(container);
    getHolidayAllMock.mockClear();

    try {
      await act(async () => {
        root.render(
          <QueryClientProvider client={queryClient}>
            <HolidayPicker pickerKey="first" />
          </QueryClientProvider>
        );
      });

      await vi.waitFor(() => {
        expect(getHolidayAllMock).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        root.render(
          <QueryClientProvider client={queryClient}>
            <HolidayPicker pickerKey="second" />
          </QueryClientProvider>
        );
      });
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      });

      expect(getHolidayAllMock).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => {
        root.unmount();
      });
      queryClient.clear();
      container.remove();
    }
  });
});
