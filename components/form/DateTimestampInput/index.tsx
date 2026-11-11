import dayjs from 'dayjs';
import { FC, ReactNode } from 'react';

import 'dayjs/locale/en';
import 'dayjs/locale/tr';

import localizedFormat from 'dayjs/plugin/localizedFormat';
import { IconCalendarClock, IconCalendarWeek } from '@tabler/icons-react';
import { endOfDay, parseISO, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useTranslation } from 'react-i18next';
import {
  DatePickerInput,
  DateTimePicker,
  getFormattedDate,
  type DateFormatter,
  type DatePickerInputProps,
  type DatePickerValue,
  type DateTimePickerProps,
} from '@mantine/dates';
import { BUSINESS_HOURS } from '@/_common/_constants/business-hours';
import {
  TimeUnit,
  toBusinessDayTimestamp,
  toTimestamp,
  type BusinessDayBoundary,
} from '@/_helpers/date';
import {
  mergeExcludeDate,
  useHolidayDatePickerProps,
  type DatePickerHighlight,
} from './useHolidayDatePickerProps';

dayjs.extend(localizedFormat);

const toDateValue = (
  value: number | null | undefined,
  unit: TimeUnit = 'seconds',
  timeZone?: string
): Date | null | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const ms = unit === 'seconds' ? value * 1000 : value;
  if (!Number.isFinite(ms)) {
    return undefined;
  }

  return timeZone ? toZonedTime(ms, timeZone) : new Date(ms);
};

export type TimestampRangeValue = [number | null, number | null];
export type DatePickerTimestampRangeInputValue = TimestampRangeValue | string[] | null;
type DateRangeValue = [Date | null, Date | null];
type RangeTimeMode = 'business' | 'fullDay';

const formatDateRange: DateFormatter = (input) => {
  const { date } = input;
  if (Array.isArray(date) && date[0] && date[1] && dayjs(date[0]).isSame(date[1], 'day')) {
    return getFormattedDate({ ...input, type: 'default', date: date[0] });
  }

  return getFormattedDate(input);
};

const toDateRangeValue = (
  value: DatePickerTimestampRangeInputValue | undefined,
  unit: TimeUnit,
  mode: RangeTimeMode
): DateRangeValue | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return [null, null];
  }

  const timeZone = mode === 'business' ? BUSINESS_HOURS.timeZone : undefined;
  const normalizeDateItem = (item: number | string | null | undefined) => {
    if (item === null || item === undefined || item === '') {
      return null;
    }

    if (typeof item === 'number') {
      return toDateValue(item, unit, timeZone) ?? null;
    }

    const numericItem = Number(item);
    if (Number.isFinite(numericItem) && /^\d+$/.test(item)) {
      return toDateValue(numericItem, unit, timeZone) ?? null;
    }

    const date = parseISO(item);
    if (!Number.isFinite(date.getTime())) {
      return null;
    }

    return timeZone && !/^\d{4}-\d{2}-\d{2}$/.test(item) ? toZonedTime(date, timeZone) : date;
  };

  if (!Array.isArray(value)) {
    return [normalizeDateItem(value), null];
  }

  return [normalizeDateItem(value[0]), normalizeDateItem(value[1])];
};

const toRangeBoundaryTimestamp = (
  value: Date | string | null,
  boundary: BusinessDayBoundary,
  unit: TimeUnit,
  mode: RangeTimeMode
) => {
  if (mode === 'business') {
    return toBusinessDayTimestamp(value, boundary, unit) ?? null;
  }

  const date = typeof value === 'string' ? parseISO(value) : value;
  return date
    ? (toTimestamp(boundary === 'start' ? startOfDay(date) : endOfDay(date), unit) ?? null)
    : null;
};

const toTimestampRangeValue = (
  value: [Date | string | null, Date | string | null],
  unit: TimeUnit,
  mode: RangeTimeMode
): TimestampRangeValue => [
  toRangeBoundaryTimestamp(value[0], 'start', unit, mode),
  toRangeBoundaryTimestamp(value[1], 'end', unit, mode),
];

export type SingleDatePickerTimestampInputProps = Omit<
  DatePickerInputProps<'default'>,
  'defaultValue' | 'onChange' | 'type' | 'value'
> & {
  type?: 'default';
  value?: number | null;
  defaultValue?: number | null;
  onChange?: (value: number | undefined) => void;
  unit?: TimeUnit;
  businessDayBoundary?: BusinessDayBoundary;
  withHolidayRules?: boolean;
  highlightedDate?: DatePickerHighlight;
};

export type RangeDatePickerTimestampInputProps = Omit<
  DatePickerInputProps<'range'>,
  'defaultValue' | 'onChange' | 'type' | 'value'
> & {
  type: 'range';
  value?: DatePickerTimestampRangeInputValue;
  defaultValue?: DatePickerTimestampRangeInputValue;
  onChange?: (value: TimestampRangeValue) => void;
  unit?: TimeUnit;
  rangeTimeMode?: RangeTimeMode;
  withHolidayRules?: boolean;
  highlightedDate?: DatePickerHighlight;
};

export type DatePickerTimestampInputProps =
  RangeDatePickerTimestampInputProps | SingleDatePickerTimestampInputProps;

export function DatePickerTimestampInput(props: DatePickerTimestampInputProps): ReactNode {
  const { i18n } = useTranslation();
  type RuntimeDatePickerInputProps =
    DatePickerInputProps<'default'> | DatePickerInputProps<'range'>;
  const RuntimeDatePickerInput = DatePickerInput as FC<RuntimeDatePickerInputProps>;

  const locale = props.locale ?? i18n.resolvedLanguage ?? i18n.language ?? 'tr';
  const withHolidayRules = props.withHolidayRules ?? true;
  const holidayDatePickerProps = useHolidayDatePickerProps({
    enabled: withHolidayRules && !props.disabled,
    highlightedDate: props.highlightedDate,
    withHolidayRules,
  });
  const commonProps = {
    rightSection: <IconCalendarWeek stroke={1} size={18} />,
    locale,
  };
  let runtimeProps: RuntimeDatePickerInputProps;

  if (props.type === 'range') {
    const {
      value,
      defaultValue,
      onChange,
      unit = 'seconds',
      rangeTimeMode = 'business',
      withHolidayRules: _withHolidayRules,
      highlightedDate,
      excludeDate,
      renderDay,
      ...datePickerProps
    } = props;
    const mappedValue = toDateRangeValue(value, unit, rangeTimeMode);
    const mappedDefaultValue = toDateRangeValue(defaultValue, unit, rangeTimeMode);

    runtimeProps = {
      ...datePickerProps,
      type: 'range',
      allowSingleDateInRange: datePickerProps.allowSingleDateInRange ?? true,
      valueFormatter: datePickerProps.valueFormatter ?? formatDateRange,
      ...(withHolidayRules || excludeDate
        ? { excludeDate: mergeExcludeDate(excludeDate, holidayDatePickerProps.excludeDate) }
        : {}),
      renderDay:
        renderDay ??
        (withHolidayRules || highlightedDate ? holidayDatePickerProps.renderDay : undefined),
      valueFormat: datePickerProps.valueFormat ?? 'LL',
      ...(mappedValue !== undefined ? { value: mappedValue } : {}),
      ...(mappedDefaultValue !== undefined ? { defaultValue: mappedDefaultValue } : {}),
      onChange: (next: DatePickerValue<'range', string>) =>
        onChange?.(toTimestampRangeValue(next, unit, rangeTimeMode)),
    };
  } else {
    const {
      value,
      defaultValue,
      onChange,
      unit = 'seconds',
      businessDayBoundary = 'start',
      withHolidayRules: _withHolidayRules,
      highlightedDate,
      excludeDate,
      renderDay,
      ...datePickerProps
    } = props;
    const mappedValue = toDateValue(value, unit, BUSINESS_HOURS.timeZone);
    const mappedDefaultValue = toDateValue(defaultValue, unit, BUSINESS_HOURS.timeZone);

    runtimeProps = {
      ...datePickerProps,
      ...(withHolidayRules || excludeDate
        ? { excludeDate: mergeExcludeDate(excludeDate, holidayDatePickerProps.excludeDate) }
        : {}),
      renderDay:
        renderDay ??
        (withHolidayRules || highlightedDate ? holidayDatePickerProps.renderDay : undefined),
      valueFormat: datePickerProps.valueFormat ?? 'LL',
      ...(mappedValue !== undefined ? { value: mappedValue } : {}),
      ...(mappedDefaultValue !== undefined ? { defaultValue: mappedDefaultValue } : {}),
      onChange: (next: DatePickerValue<'default', string>) =>
        onChange?.(toBusinessDayTimestamp(next, businessDayBoundary, unit)),
    };
  }

  return <RuntimeDatePickerInput {...runtimeProps} {...commonProps} />;
}

export type DateTimePickerTimestampInputProps = Omit<
  DateTimePickerProps,
  'value' | 'defaultValue' | 'onChange'
> & {
  value?: number | null;
  defaultValue?: number | null;
  onChange?: (value: number | undefined) => void;
  unit?: TimeUnit;
  withHolidayRules?: boolean;
};

export const DateTimePickerTimestampInput: FC<DateTimePickerTimestampInputProps> = ({
  value,
  defaultValue,
  onChange,
  unit = 'seconds',
  withHolidayRules = true,
  excludeDate,
  renderDay,
  ...props
}) => {
  const { i18n } = useTranslation();
  const holidayDatePickerProps = useHolidayDatePickerProps({
    enabled: withHolidayRules && !props.disabled,
  });
  const mappedValue = toDateValue(value, unit);
  const mappedDefaultValue = toDateValue(defaultValue, unit);
  const locale = props.locale ?? i18n.resolvedLanguage ?? i18n.language ?? 'tr';

  return (
    <DateTimePicker
      {...props}
      {...(withHolidayRules || excludeDate
        ? { excludeDate: mergeExcludeDate(excludeDate, holidayDatePickerProps.excludeDate) }
        : {})}
      renderDay={renderDay ?? (withHolidayRules ? holidayDatePickerProps.renderDay : undefined)}
      rightSection={<IconCalendarClock stroke={1} size={18} />}
      locale={locale}
      valueFormat={props.valueFormat ?? 'LLL'}
      {...(mappedValue !== undefined ? { value: mappedValue } : {})}
      {...(mappedDefaultValue !== undefined ? { defaultValue: mappedDefaultValue } : {})}
      onChange={(next) => onChange?.(toTimestamp(next, unit))}
    />
  );
};
