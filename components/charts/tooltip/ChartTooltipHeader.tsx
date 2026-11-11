import type { ReactNode } from 'react';
import { Group, Stack, Text } from '@mantine/core';

export const ChartTooltipHeader = ({
  fieldLabel,
  title,
  summary,
  total,
  details,
}: {
  fieldLabel?: ReactNode;
  title?: ReactNode;
  summary?: ReactNode;
  total?: ReactNode;
  details?: ReactNode;
}) => {
  const titleElement = title && (
    <Text component="div" size="sm" fw={600} style={{ flex: 1 }} miw={0}>
      {title}
    </Text>
  );
  const totalElement = total && (
    <Text size="xs" fw={700} style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
      {total}
    </Text>
  );
  return (
    <Stack gap={6}>
      <Group justify="space-between" align="flex-start" gap="md" wrap="nowrap">
        {fieldLabel ? (
          <Text size="10px" fw={600} c="dimmed" tt="uppercase" style={{ flex: 1 }} miw={0}>
            {fieldLabel}
          </Text>
        ) : (
          titleElement
        )}
        {totalElement}
      </Group>
      {fieldLabel && titleElement}
      {details}
      {summary}
    </Stack>
  );
};
