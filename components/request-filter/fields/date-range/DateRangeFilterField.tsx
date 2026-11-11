import { useMemo } from 'react';
import { startOfDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Button, Group, Stack } from '@mantine/core';
import { DatePickerTimestampInput } from '@/components/form/DateTimestampInput';
import { filterInnerDropdownProps, type TimestampRangeValue } from './date-range-filter-utils';
import {
  dateQuickRangeOptions,
  getDateQuickRangeValue,
  type DateQuickRangeKey,
} from './dateQuickRange';

type DateRangeFilterFieldProps = {
  autoFocus?: boolean;
  clearable?: boolean;
  inputId?: string;
  testId?: string;
  label: string;
  value: TimestampRangeValue;
  quickRange?: DateQuickRangeKey;
  withHolidayRules?: boolean;
  onChange: (value: TimestampRangeValue) => void;
  onQuickRangeChange: (value: DateQuickRangeKey) => void;
};

export const DateRangeFilterField = ({
  autoFocus = false,
  clearable = true,
  inputId,
  label,
  testId,
  value,
  quickRange,
  withHolidayRules = true,
  onChange,
  onQuickRangeChange,
}: DateRangeFilterFieldProps) => {
  const { t } = useTranslation();
  const today = startOfDay(new Date()).getTime();
  const [from, to] = value;
  const displayedValue = useMemo<TimestampRangeValue>(
    () => (quickRange ? getDateQuickRangeValue(quickRange, new Date(today)) : [from, to]),
    [quickRange, today, from, to]
  );

  return (
    <Stack gap={4}>
      <DatePickerTimestampInput
        autoFocus={autoFocus}
        id={inputId}
        data-testid={testId}
        type="range"
        rangeTimeMode="fullDay"
        size="xs"
        label={label}
        clearable={clearable}
        popoverProps={filterInnerDropdownProps}
        value={displayedValue}
        withHolidayRules={withHolidayRules}
        onChange={onChange}
      />
      <Group gap={4}>
        {dateQuickRangeOptions.map((option) => (
          <Button
            key={option.value}
            id={inputId ? `${inputId}-quick-${option.value}` : undefined}
            data-testid={testId ? `${testId}-quick-${option.value}` : undefined}
            h={22}
            px="xs"
            size="xxs"
            type="button"
            variant={quickRange === option.value ? 'filled' : 'light'}
            color={quickRange === option.value ? 'dark' : 'gray.2'}
            onClick={() => onQuickRangeChange(option.value)}
          >
            {t(option.labelKey)}
          </Button>
        ))}
      </Group>
    </Stack>
  );
};
