import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Group, Stack, Text, Tooltip } from '@mantine/core';

export type GanttTaskTooltipRow = {
  label: string;
  value: ReactNode;
};

type GanttTaskTooltipProps = {
  children: ReactElement;
  end: ReactNode;
  extraRows?: GanttTaskTooltipRow[];
  hint?: string;
  start: ReactNode;
  title?: ReactNode;
};

const renderValue = (value: ReactNode) =>
  typeof value === 'string' || typeof value === 'number' ? (
    <Text fw={600} size="xs">
      {value}
    </Text>
  ) : (
    value
  );

export const GanttTaskTooltip = ({
  children,
  end,
  extraRows = [],
  hint,
  start,
  title,
}: GanttTaskTooltipProps) => {
  const { t } = useTranslation();
  const rows: GanttTaskTooltipRow[] = [
    {
      label: t('label.requests.workflow.timeline.plannedStart'),
      value: start,
    },
    {
      label: t('label.requests.workflow.timeline.plannedEnd'),
      value: end,
    },
    ...extraRows,
  ];

  return (
    <Tooltip
      withArrow
      multiline
      position="bottom"
      events={{ hover: true, focus: true, touch: false }}
      label={
        <Stack gap={2}>
          {title ? (
            <Text fw={600} mb={2} size="xs">
              {title}
            </Text>
          ) : null}
          {rows.map((row) => (
            <Group key={row.label} gap="md" justify="space-between" wrap="nowrap">
              <Text c="gray.3" size="xs">
                {row.label}
              </Text>
              {renderValue(row.value)}
            </Group>
          ))}
          {hint ? (
            <Text c="gray.3" mt={4} size="xs">
              {hint}
            </Text>
          ) : null}
        </Stack>
      }
    >
      {children}
    </Tooltip>
  );
};
