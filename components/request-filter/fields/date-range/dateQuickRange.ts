import { endOfDay, startOfDay, subDays, subMonths, subYears } from 'date-fns';
import { toTimestamp } from '@/_helpers/date';

export type DateQuickRangeKey = 'last-week' | 'last-month' | 'last-year';

export const dateQuickRangeOptions = [
  { labelKey: 'label.requests.list.filters.quickRangeLastWeek', value: 'last-week' },
  { labelKey: 'label.requests.list.filters.quickRangeLastMonth', value: 'last-month' },
  { labelKey: 'label.requests.list.filters.quickRangeLastYear', value: 'last-year' },
] as const satisfies readonly { labelKey: string; value: DateQuickRangeKey }[];

export const isDateQuickRangeKey = (value: unknown): value is DateQuickRangeKey =>
  value === 'last-week' || value === 'last-month' || value === 'last-year';

export const getDateQuickRangeValue = (
  key: DateQuickRangeKey,
  now = new Date()
): [number, number] => {
  let startDate = now;

  if (key === 'last-week') {
    startDate = subDays(now, 7);
  }

  if (key === 'last-month') {
    startDate = subMonths(now, 1);
  }

  if (key === 'last-year') {
    startDate = subYears(now, 1);
  }

  return [toTimestamp(startOfDay(startDate))!, toTimestamp(endOfDay(now))!];
};
