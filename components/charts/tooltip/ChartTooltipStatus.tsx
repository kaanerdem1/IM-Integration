import type { ReactNode } from 'react';
import { Box, Group, Text } from '@mantine/core';

export const ChartTooltipStatus = ({
  color,
  label,
  detail,
}: {
  color: string;
  label: ReactNode;
  detail?: ReactNode;
}) => (
  <Group gap={6} wrap="nowrap" miw={0}>
    <Box w={8} h={8} bg={color} style={{ borderRadius: '50%', flexShrink: 0 }} />
    <Text component="div" size="xs" fw={600}>
      {label}
    </Text>
    {detail && (
      <Text size="xs" c="dimmed">
        · {detail}
      </Text>
    )}
  </Group>
);
