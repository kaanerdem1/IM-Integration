import type { ReactNode } from 'react';
import { Badge, Divider, Group, Text, type BadgeProps } from '@mantine/core';
import { chartTooltipDividerProps, chartTooltipRowPadding } from './chartTheme';
import classes from './tooltip/ChartTooltipSurface.module.css';

type ChartTooltipValueProps = {
  label: ReactNode;
  value: ReactNode;
  badgeProps?: Pick<BadgeProps, 'color' | 'style'>;
  withDivider?: boolean;
};

export const ChartTooltipValue = ({
  label,
  value,
  badgeProps,
  withDivider = true,
}: ChartTooltipValueProps) => (
  <>
    {withDivider && <Divider {...chartTooltipDividerProps} />}
    <Group
      className={classes.valueRow}
      align="flex-start"
      justify="space-between"
      gap="sm"
      wrap="nowrap"
      py={chartTooltipRowPadding}
    >
      <Text
        component="div"
        size="xs"
        fw={400}
        style={{ flex: 1, overflowWrap: 'anywhere' }}
        miw={0}
      >
        {label}
      </Text>
      <Badge
        {...badgeProps}
        color={badgeProps?.color ?? 'var(--mantine-color-cyan-8)'}
        radius="sm"
        variant="light"
        size="xs"
        style={[
          {
            // Composite against the chart surface so badges match on light and dark tooltips.
            backgroundColor:
              'color-mix(in srgb, var(--badge-color) 10%, var(--mantine-color-body))',
            flexShrink: 0,
          },
          badgeProps?.style,
        ]}
      >
        {value}
      </Badge>
    </Group>
  </>
);
