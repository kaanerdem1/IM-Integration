import { IconCircleDot } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Badge, Box, Center, Divider, Group, Indicator, Stack, Text, Tooltip } from '@mantine/core';
import {
  findHolidayOption,
  getHolidayDurationPresentation,
  HolidayDurationType,
  holidayDurationTypeOptions,
  holidayTypeOptions,
} from '@/_helpers/holiday';

export type HolidayInfo = {
  dayValue?: number;
  description?: string | null;
  isHalfDay?: boolean;
  name?: string | null;
  type?: number;
};

export type HolidayPickerDate = string;

type Props = {
  date: HolidayPickerDate;
  holidayInfos: HolidayInfo[];
  highlightedDateLabel?: string;
};

export function HolidayDatePickerDay({ date, holidayInfos, highlightedDateLabel }: Props) {
  const { t } = useTranslation();
  const normalizedDate = date.slice(0, 10);
  const dayText = String(Number(normalizedDate.slice(8, 10)));

  if (!holidayInfos.length && !highlightedDateLabel) {
    return dayText;
  }

  const markerPresentation = getHolidayDurationPresentation(
    holidayInfos.find(
      (holiday) =>
        holiday.dayValue === HolidayDurationType.FullDay ||
        (holiday.isHalfDay === true &&
          (holiday.dayValue === HolidayDurationType.HalfDayMorning ||
            holiday.dayValue === HolidayDurationType.HalfDayAfternoon))
    )?.dayValue
  );

  return (
    <Tooltip
      withinPortal
      withArrow
      zIndex={10000}
      label={
        <Stack gap={6}>
          {highlightedDateLabel ? (
            <Text size="xs" fw={600}>
              {highlightedDateLabel}
            </Text>
          ) : null}
          {highlightedDateLabel && holidayInfos.length > 0 ? <Divider color="dark.4" /> : null}
          {holidayInfos.map((holiday, index) => {
            const presentation = getHolidayDurationPresentation(holiday.dayValue);
            const durationOption = findHolidayOption(holidayDurationTypeOptions, holiday.dayValue);
            const typeOption = findHolidayOption(holidayTypeOptions, holiday.type);

            return (
              <Box key={`${holiday.name ?? 'holiday'}-${index}`}>
                <Group gap={6} align="flex-start" wrap="nowrap">
                  <Center c={presentation?.color ?? 'gray.4'} h={15} flex="0 0 auto">
                    <IconCircleDot size={10} />
                  </Center>
                  <Stack gap={2}>
                    <Text size="xs" fw={600}>
                      {holiday.name}
                    </Text>
                    {holiday.description ? (
                      <Text size="xs" c="gray.1">
                        {holiday.description}
                      </Text>
                    ) : null}
                    <Group gap={4} wrap="nowrap">
                      {typeOption ? (
                        <Badge size="xs" variant="light" color="gray">
                          {t(typeOption.labelKey)}
                        </Badge>
                      ) : null}
                      {presentation && durationOption ? (
                        <Badge size="xs" variant="light" color={presentation.color}>
                          {t(durationOption.labelKey)}
                        </Badge>
                      ) : null}
                    </Group>
                  </Stack>
                </Group>
                {index < holidayInfos.length - 1 ? <Divider color="dark.4" mt={6} /> : null}
              </Box>
            );
          })}
        </Stack>
      }
    >
      <Indicator
        component="span"
        inline
        color="violet.6"
        size={10}
        withBorder
        disabled={!highlightedDateLabel}
        aria-label={highlightedDateLabel}
        data-highlighted-date={highlightedDateLabel ? normalizedDate : undefined}
      >
        <Box
          component="span"
          pos="relative"
          style={{ display: 'inline-flex', justifyContent: 'center', minWidth: 18 }}
        >
          {dayText}
          {holidayInfos.length > 0 ? (
            <Box
              component="span"
              pos="absolute"
              bottom={-3}
              w={5}
              h={5}
              bdrs="xl"
              bg={markerPresentation?.color}
            />
          ) : null}
        </Box>
      </Indicator>
    </Tooltip>
  );
}
