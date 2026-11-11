import { IconStack2 } from '@tabler/icons-react';
import { Box, Text } from '@mantine/core';
import { formatGraphicMetricLabel } from '@/_helpers/dashboard/graphicMetrics';

export const GraphicTickLabel = ({ label, fieldLabel }: { label: string; fieldLabel: string }) => {
  const summary = formatGraphicMetricLabel(label, fieldLabel);
  if (summary === label) {
    return label;
  }

  return (
    <Box
      component="span"
      bg="gray.1"
      c="gray.7"
      px={4}
      style={{
        alignItems: 'center',
        border: '1px solid var(--mantine-color-gray-3)',
        borderRadius: 'var(--mantine-radius-xl)',
        display: 'inline-flex',
        gap: 4,
        maxWidth: '100%',
        verticalAlign: 'middle',
      }}
    >
      <IconStack2 aria-hidden size={12} stroke={1.6} style={{ flexShrink: 0 }} />
      <Text component="span" inherit fw={600} lh={1.5} truncate>
        {summary}
      </Text>
    </Box>
  );
};
