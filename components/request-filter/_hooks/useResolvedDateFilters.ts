import { useMemo } from 'react';
import { startOfDay } from 'date-fns';
import type { RequestListFilterValue } from '@/pages/requests/list/_config';
import { resolveRelativeDateFilters } from '../_utils/relativeDateFilters';

/** Stable within a day. A later render resolves presets for the new day without a timer. */
export const useResolvedDateFilters = <T extends RequestListFilterValue | undefined>(
  value: T
): T => {
  const today = startOfDay(new Date()).getTime();
  return useMemo(
    () => (value ? resolveRelativeDateFilters(value, new Date(today)) : value),
    [value, today]
  );
};
