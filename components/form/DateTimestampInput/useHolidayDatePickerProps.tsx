import { useMemo } from 'react';
import { format } from 'date-fns';
import { HOLIDAY_ALL_QUERY_OPTIONS } from '@/_api-client/query-config';
import { useHolidayAll } from '@/_api/hooks';
import { HolidayDurationType } from '@/_helpers/holiday';
import {
  HolidayDatePickerDay,
  type HolidayInfo,
  type HolidayPickerDate,
} from './HolidayDatePickerDay';

type HolidayDateRules = {
  fullHolidayDateSet: Set<string>;
  fullRecurringDateSet: Set<string>;
  holidayInfoByDate: Map<string, HolidayInfo[]>;
  recurringHolidayInfoByDate: Map<string, HolidayInfo[]>;
};

export type DatePickerHighlight = { date: Date; label: string };

const normalizePickerDateKey = (date: HolidayPickerDate) => date.slice(0, 10);

const appendHolidayInfo = (map: Map<string, HolidayInfo[]>, key: string, holiday: HolidayInfo) => {
  const current = map.get(key);

  if (current) {
    current.push(holiday);
    return;
  }

  map.set(key, [holiday]);
};

const isHolidayHalfDay = (holiday: { IsHalfDay?: boolean; isHalfDay?: boolean }) =>
  holiday.IsHalfDay === true || holiday.isHalfDay === true;

const getHolidayType = (holiday: { Type?: number; type?: number }) => holiday.Type ?? holiday.type;

const getHolidayInfoIdentity = (holiday: HolidayInfo) =>
  `${holiday.name?.trim().toLocaleLowerCase('tr-TR') ?? ''}|${holiday.type ?? ''}`;

export const mergeHolidayInfos = (
  holidayInfosByDate?: HolidayInfo[],
  recurringHolidayInfosByDate?: HolidayInfo[]
) => {
  if (!holidayInfosByDate?.length) {
    return recurringHolidayInfosByDate;
  }

  if (!recurringHolidayInfosByDate?.length) {
    return holidayInfosByDate;
  }

  const holidayInfoByIdentity = new Map(
    holidayInfosByDate.map((holiday) => [getHolidayInfoIdentity(holiday), holiday])
  );

  for (const holiday of recurringHolidayInfosByDate) {
    const identity = getHolidayInfoIdentity(holiday);

    if (!holidayInfoByIdentity.has(identity)) {
      holidayInfoByIdentity.set(identity, holiday);
    }
  }

  return [...holidayInfoByIdentity.values()];
};

const getHolidayInfosByDate = (holidayDateRules: HolidayDateRules, date: HolidayPickerDate) => {
  const normalizedDate = normalizePickerDateKey(date);
  const holidayInfosByDate = holidayDateRules.holidayInfoByDate.get(normalizedDate);
  const recurringHolidayInfosByDate = holidayDateRules.recurringHolidayInfoByDate.get(
    normalizedDate.slice(5)
  );

  return mergeHolidayInfos(holidayInfosByDate, recurringHolidayInfosByDate);
};

export const mergeExcludeDate =
  (first?: (date: HolidayPickerDate) => boolean, second?: (date: HolidayPickerDate) => boolean) =>
  (date: HolidayPickerDate) =>
    Boolean(first?.(date) || second?.(date));

export function useHolidayDatePickerProps({
  enabled = true,
  highlightedDate,
  withHolidayRules = true,
}: { enabled?: boolean; highlightedDate?: DatePickerHighlight; withHolidayRules?: boolean } = {}) {
  const { data: holidays } = useHolidayAll({
    ...HOLIDAY_ALL_QUERY_OPTIONS,
    enabled,
  });
  const highlightedDateKey = highlightedDate
    ? format(highlightedDate.date, 'yyyy-MM-dd')
    : undefined;
  const highlightedDateLabel = highlightedDate?.label;

  const holidayDateRules = useMemo<HolidayDateRules>(() => {
    const fullHolidayDateSet = new Set<string>();
    const fullRecurringDateSet = new Set<string>();
    const holidayInfoByDate = new Map<string, HolidayInfo[]>();
    const recurringHolidayInfoByDate = new Map<string, HolidayInfo[]>();

    for (const holiday of holidays?.Data ?? []) {
      if (holiday.IsActive !== true) {
        continue;
      }

      const isHalfDayHoliday = isHolidayHalfDay(holiday);
      const holidayInfo: HolidayInfo = {
        dayValue: holiday.DayValue,
        description: holiday.Description,
        isHalfDay: isHalfDayHoliday,
        name: holiday.Name,
        type: getHolidayType(holiday),
      };
      const isFullDayHoliday =
        !isHalfDayHoliday && holiday.DayValue === HolidayDurationType.FullDay;

      if (holiday.IsRecurring && holiday.RecurringMonth && holiday.RecurringDay) {
        const recurringDateKey = `${String(holiday.RecurringMonth).padStart(2, '0')}-${String(holiday.RecurringDay).padStart(2, '0')}`;

        appendHolidayInfo(recurringHolidayInfoByDate, recurringDateKey, holidayInfo);

        if (isFullDayHoliday) {
          fullRecurringDateSet.add(recurringDateKey);
        }

        continue;
      }

      if (holiday.Date) {
        const dateKey = holiday.Date.slice(0, 10);

        appendHolidayInfo(holidayInfoByDate, dateKey, holidayInfo);

        if (isFullDayHoliday) {
          fullHolidayDateSet.add(dateKey);
        }
      }
    }

    return {
      fullHolidayDateSet,
      fullRecurringDateSet,
      holidayInfoByDate,
      recurringHolidayInfoByDate,
    };
  }, [holidays?.Data]);

  return useMemo(
    () => ({
      excludeDate: (date: HolidayPickerDate) => {
        const normalizedDate = normalizePickerDateKey(date);

        if (holidayDateRules.fullHolidayDateSet.has(normalizedDate)) {
          return true;
        }

        return holidayDateRules.fullRecurringDateSet.has(normalizedDate.slice(5));
      },
      renderDay: (date: HolidayPickerDate) => {
        const holidayInfos = withHolidayRules
          ? getHolidayInfosByDate(holidayDateRules, date)
          : undefined;

        return (
          <HolidayDatePickerDay
            date={date}
            holidayInfos={holidayInfos ?? []}
            highlightedDateLabel={
              normalizePickerDateKey(date) === highlightedDateKey ? highlightedDateLabel : undefined
            }
          />
        );
      },
    }),
    [holidayDateRules, highlightedDateKey, highlightedDateLabel, withHolidayRules]
  );
}
