import type { MouseEvent, ReactNode } from 'react';
import clsx from 'clsx';
import {
  Badge,
  Box,
  Flex,
  Group,
  Text,
  Tooltip,
  UnstyledButton,
  type BadgeProps,
  type FlexProps,
  type MantineColor,
} from '@mantine/core';
import { useSetChartHighlightKey, type ChartHighlightKey } from './chartHighlightStore';
import type { ChartLabelPresentation } from './chartLabelPresentation';
import {
  barChartLegendBadgeProps,
  barChartLegendTextProps,
  chartElementTooltipProps,
  chartLegendLayout,
  chartLegendMarkerStyle,
  chartTooltipTitleProps,
} from './chartTheme';
import classes from './ChartLegend.module.css';

export type ChartLegendItem = {
  disabledReason?: string;
  badgeProps?: BadgeProps & { 'data-testid'?: string };
  color: MantineColor;
  highlightKey?: ChartHighlightKey;
  label: ReactNode;
  name: string;
  value: ReactNode;
};

type ChartLegendProps<T extends ChartLegendItem> = {
  labelPresentation?: ChartLabelPresentation;
  ariaLabel?: string;
  containerProps?: Omit<FlexProps, 'children' | 'direction'>;
  items: readonly T[];
  onItemAuxClick?: (item: T, event: MouseEvent<HTMLButtonElement>) => void;
  onItemClick?: (item: T, event: MouseEvent<HTMLButtonElement>) => void;
  orientation?: 'horizontal' | 'vertical';
};

const ChartLegendItemContent = ({
  fullWidth,
  item,
  labelPresentation,
}: {
  fullWidth: boolean;
  item: ChartLegendItem;
  labelPresentation?: ChartLabelPresentation;
}) => {
  const displayLabel =
    typeof item.label === 'string'
      ? (labelPresentation?.formatLabel?.(item.label) ?? item.label)
      : item.label;
  const tooltipLabel =
    typeof item.label === 'string'
      ? (labelPresentation?.renderTooltipLabel?.(item.label, 'tick') ?? (
          <Text {...chartTooltipTitleProps} c="inherit">
            {item.label}
          </Text>
        ))
      : item.label;
  return (
    <Group
      align="flex-start"
      fz={barChartLegendTextProps.fz}
      gap={0}
      wrap="nowrap"
      w="100%"
      miw={0}
    >
      <Box aria-hidden bg={item.color} style={chartLegendMarkerStyle} />
      <Tooltip
        {...chartElementTooltipProps}
        disabled={Boolean(item.disabledReason) || (!fullWidth && displayLabel === item.label)}
        label={tooltipLabel}
        interactive
      >
        <Text
          {...barChartLegendTextProps}
          truncate={fullWidth}
          style={{
            ...barChartLegendTextProps.style,
            alignSelf: 'baseline',
            marginInlineEnd: 4,
            flex: fullWidth ? '1 1 auto' : '0 1 auto',
            minWidth: 0,
            whiteSpace: fullWidth ? 'nowrap' : 'normal',
            overflowWrap: 'anywhere',
          }}
        >
          {displayLabel}
        </Text>
      </Tooltip>
      <Badge
        color={item.color}
        variant="light"
        {...barChartLegendBadgeProps}
        {...item.badgeProps}
        style={{ ...barChartLegendBadgeProps.style, ...item.badgeProps?.style, flexShrink: 0 }}
      >
        {item.value}
      </Badge>
    </Group>
  );
};

export const ChartLegend = <T extends ChartLegendItem>({
  ariaLabel,
  containerProps,
  items,
  labelPresentation,
  onItemAuxClick,
  onItemClick,
  orientation = 'horizontal',
}: ChartLegendProps<T>) => {
  const setHighlightedKey = useSetChartHighlightKey();
  const { className, onMouseLeave, ...resolvedContainerProps } = containerProps ?? {};
  const isVertical = orientation === 'vertical';

  return (
    <Flex
      w="100%"
      {...resolvedContainerProps}
      className={clsx(classes.container, className)}
      onMouseLeave={(event) => {
        onMouseLeave?.(event);
        setHighlightedKey(null);
      }}
    >
      <Flex
        align="flex-start"
        aria-label={ariaLabel}
        className={classes.items}
        direction={isVertical ? 'column' : 'row'}
        rowGap={chartLegendLayout.rowGap}
        columnGap={chartLegendLayout.columnGap}
        role="list"
        wrap={isVertical ? 'nowrap' : 'wrap'}
        w="100%"
        miw={0}
        data-layout={isVertical ? 'vertical' : 'wrap'}
      >
        {items.map((item) => {
          const highlightKey = item.highlightKey ?? item.name;

          return (
            <Box
              key={item.name}
              onBlur={() => setHighlightedKey(null)}
              onFocus={() => setHighlightedKey(highlightKey)}
              onMouseEnter={() => setHighlightedKey(highlightKey)}
              role="listitem"
              w={isVertical ? '100%' : 'max-content'}
              maw="100%"
              miw={0}
            >
              {onItemClick || onItemAuxClick ? (
                <Tooltip
                  {...chartElementTooltipProps}
                  label={item.disabledReason}
                  disabled={!item.disabledReason}
                >
                  <UnstyledButton
                    aria-disabled={Boolean(item.disabledReason) || undefined}
                    aria-description={item.disabledReason}
                    onAuxClick={
                      item.disabledReason ? undefined : (event) => onItemAuxClick?.(item, event)
                    }
                    onClick={
                      item.disabledReason ? undefined : (event) => onItemClick?.(item, event)
                    }
                    style={{ cursor: item.disabledReason ? 'not-allowed' : undefined }}
                    w="100%"
                    maw="100%"
                  >
                    <ChartLegendItemContent
                      fullWidth={isVertical}
                      item={item}
                      labelPresentation={labelPresentation}
                    />
                  </UnstyledButton>
                </Tooltip>
              ) : (
                <ChartLegendItemContent
                  fullWidth={isVertical}
                  item={item}
                  labelPresentation={labelPresentation}
                />
              )}
            </Box>
          );
        })}
      </Flex>
    </Flex>
  );
};
