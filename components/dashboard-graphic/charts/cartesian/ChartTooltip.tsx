import { useMemo, type RefObject } from 'react';
import type { TooltipContentProps } from 'recharts';
import { Group, Text, Tooltip } from '@mantine/core';
import type { RequestDistributionChartModel } from '@/_helpers/dashboard/requestDistribution';
import { barChartLayout, chartElementTooltipProps } from '@/components/charts/chartTheme';
import { ChartTooltipValue } from '@/components/charts/ChartTooltipValue';
import { DashboardBarTooltip } from '@/components/charts/DashboardBarTooltip';
import type { HorizontalChartLayout } from '@/components/charts/horizontalChartLayout';
import { HorizontalChartTick } from '@/components/charts/HorizontalChartTick';
import { useRetainedTooltip } from '@/components/charts/tooltip/useRetainedTooltip';
import { graphicInteractionProps, type OpenGraphicSelection } from '../interactions';
import { useGraphicDisabledReason } from '../useGraphicDisabledReason';
import { useGraphicLabels } from '../useGraphicLabels';
import { requestDistributionGroupedSeriesNameKey } from './groupedLayout';

type RequestDistributionTooltipProps = TooltipContentProps<number, string> & {
  chartContainerRef: RefObject<HTMLDivElement | null>;
  series: RequestDistributionChartModel['series'];
};

type RequestDistributionCategoryByTick = ReadonlyMap<
  string,
  { label: string; offset: number; primaryMetric?: string }
>;

type RequestDistributionAxisTickProps = {
  layout: HorizontalChartLayout;
  countLabel: string;
  onOpen?: OpenGraphicSelection;
  categoryByTick?: RequestDistributionCategoryByTick;
  totalByPrimaryMetric?: ReadonlyMap<string, number>;
  x?: number;
  y?: number;
  payload?: {
    value?: string;
  };
};

type RequestDistributionXAxisTickProps = {
  chartWidth?: number;
  maxLabelWidth?: number;
  onOpen?: OpenGraphicSelection;
  angle: number;
  categoryByTick?: RequestDistributionCategoryByTick;
  payload?: {
    value?: unknown;
  };
  textAnchor: 'end' | 'middle';
  x?: number;
  y?: number;
};

export const RequestDistributionTooltip = ({
  active,
  chartContainerRef,
  coordinate: currentCoordinate,
  label: currentLabel,
  payload: currentPayload,
  series,
}: RequestDistributionTooltipProps) => {
  const labels = useGraphicLabels();
  const current = useMemo(
    () => ({ coordinate: currentCoordinate, label: currentLabel, payload: currentPayload }),
    [currentCoordinate, currentLabel, currentPayload]
  );
  const tooltip = useRetainedTooltip(
    Boolean(active && currentPayload.length && currentPayload[0]?.payload?.isCategorySpacer !== 1),
    current
  );
  const { coordinate, label, payload } = tooltip.value;
  const getDisabledReason = useGraphicDisabledReason();
  const chartContainer = chartContainerRef.current;

  if (
    !tooltip.visible ||
    payload.length === 0 ||
    !coordinate ||
    !chartContainer ||
    payload[0]?.payload?.isCategorySpacer === 1
  ) {
    return null;
  }

  const tooltipLabel =
    payload[0]?.payload?.primaryLabel ?? payload[0]?.payload?.primaryMetric ?? label;
  const normalizedPayload = payload.map((item) => {
    const groupedSeriesName = item.payload?.[requestDistributionGroupedSeriesNameKey];

    if (typeof groupedSeriesName !== 'string') {
      return item;
    }

    return {
      ...item,
      color: typeof item.payload?.color === 'string' ? item.payload.color : item.color,
      dataKey: groupedSeriesName,
      name: groupedSeriesName,
    };
  });

  const seenPayloadKeys = new Set<string>();
  const uniquePayload = normalizedPayload.filter((item, index) => {
    const itemKey = item.dataKey ?? item.name;

    if (itemKey === null || itemKey === undefined) {
      return true;
    }

    const payloadKey = typeof itemKey === 'function' ? String(item.name ?? index) : String(itemKey);

    if (seenPayloadKeys.has(payloadKey)) {
      return false;
    }

    seenPayloadKeys.add(payloadKey);
    return true;
  });
  const disabledReason = uniquePayload
    .filter((item) => Number(item.value ?? 0) > 0)
    .map((item) =>
      getDisabledReason({
        primaryMetric: item.payload?.primaryMetric,
        seriesName: String(item.dataKey ?? item.name),
      })
    )
    .find(Boolean);
  return (
    <DashboardBarTooltip
      surfaceProps={{
        coordinate,
        containerRef: chartContainerRef,
        onMouseEnter: tooltip.onMouseEnter,
        onMouseLeave: tooltip.onMouseLeave,
        onFocus: tooltip.onFocus,
        onBlur: tooltip.onBlur,
      }}
      active
      listLabel={labels.secondaryFieldLabel}
      description={disabledReason}
      hideZeroValues
      {...(typeof tooltipLabel === 'string'
        ? labels.primary.getTooltipHeading(tooltipLabel)
        : { label: tooltipLabel })}
      renderSeriesLabel={labels.secondary.renderTooltipLabel}
      payload={uniquePayload}
      series={series}
    />
  );
};

export const RequestDistributionXAxisTick = ({
  chartWidth,
  maxLabelWidth,
  onOpen,
  angle,
  categoryByTick,
  payload,
  textAnchor,
  x = 0,
  y = 0,
}: RequestDistributionXAxisTickProps) => {
  const labels = useGraphicLabels();
  const getDisabledReason = useGraphicDisabledReason();
  const tickValue = String(payload?.value ?? '');
  const category = categoryByTick?.get(tickValue);

  if (categoryByTick && !category) {
    return null;
  }

  const label = category?.label ?? tickValue;
  const tickX = x + (category?.offset ?? 0);
  const disabledReason = getDisabledReason({ primaryMetric: category?.primaryMetric ?? tickValue });
  const interactionProps = graphicInteractionProps(
    onOpen,
    { primaryMetric: category?.primaryMetric ?? tickValue },
    label,
    disabledReason
  );
  const transform = angle === 0 ? undefined : `rotate(${angle}, ${tickX}, ${y})`;
  // Bound the rotated label box itself; character counts cannot predict glyph widths.
  const edgeSpace =
    textAnchor === 'end'
      ? (tickX - 4) / Math.cos((angle * Math.PI) / 180)
      : Math.min(tickX - 4, (chartWidth ?? Infinity) - tickX - 4) * 2;
  const labelWidth = Math.max(1, Math.min(maxLabelWidth ?? 170, edgeSpace));

  return (
    <Tooltip
      {...chartElementTooltipProps}
      label={disabledReason ?? labels.primary.renderTooltipLabel(label, 'tick')}
      interactive
      openDelay={250}
      position="top"
    >
      <g
        {...interactionProps}
        data-testid="graphic-category-tick"
        onFocus={(event) => event.stopPropagation()}
        transform={transform}
      >
        <foreignObject
          x={textAnchor === 'end' ? tickX - labelWidth : tickX - labelWidth / 2}
          y={y + 2}
          width={labelWidth}
          height={22}
        >
          <Text
            fz={12}
            lh="20px"
            c="gray.7"
            ta={textAnchor === 'end' ? 'right' : 'center'}
            truncate
          >
            {labels.primary.renderTickLabel(label)}
          </Text>
        </foreignObject>
      </g>
    </Tooltip>
  );
};

export const RequestDistributionYAxisTick = ({
  layout,
  countLabel,
  onOpen,
  categoryByTick,
  payload,
  totalByPrimaryMetric,
  x = 0,
  y = 0,
}: RequestDistributionAxisTickProps) => {
  const labels = useGraphicLabels();
  const getDisabledReason = useGraphicDisabledReason();
  const tickValue = payload?.value ?? '';
  const category = categoryByTick?.get(tickValue);

  if (categoryByTick && !category) {
    return null;
  }

  const value = category?.label ?? tickValue;
  const tickY = y + (category?.offset ?? 0);
  const total = totalByPrimaryMetric?.get(category?.primaryMetric ?? tickValue) ?? 0;
  const totalText = `(${total})`;
  const displayText = `${value} ${totalText}`;
  const disabledReason = getDisabledReason({ primaryMetric: category?.primaryMetric ?? tickValue });

  return (
    <HorizontalChartTick layout={layout} x={x} y={tickY}>
      <Tooltip
        {...chartElementTooltipProps}
        label={
          disabledReason ?? (
            <>
              {labels.primary.renderTooltipLabel(value, 'tick')}{' '}
              <ChartTooltipValue label={countLabel} value={total} />
            </>
          )
        }
        interactive
      >
        <Group
          align="center"
          gap={3}
          justify={layout.above ? 'space-between' : 'flex-end'}
          bg={layout.above ? 'var(--mantine-color-body)' : undefined}
          wrap="nowrap"
          w={layout.above ? '100%' : 'fit-content'}
          maw="100%"
          ml="auto"
          h="100%"
          {...graphicInteractionProps(
            onOpen,
            { primaryMetric: category?.primaryMetric ?? tickValue },
            displayText,
            disabledReason
          )}
          style={{
            overflow: 'hidden',
            cursor: disabledReason ? 'not-allowed' : onOpen ? 'pointer' : undefined,
          }}
        >
          <Text
            c="gray.8"
            component="span"
            fw={500}
            fz={barChartLayout.horizontalTickFontSize}
            lh={`${layout.labelHeight}px`}
            truncate
            style={{ flex: '0 1 auto', minWidth: 0 }}
          >
            {labels.primary.renderTickLabel(value)}
          </Text>
          <Text
            c="gray.8"
            component="span"
            fw={500}
            fz={barChartLayout.horizontalTickFontSize}
            lh={`${layout.labelHeight}px`}
            style={{ flex: '0 0 auto' }}
          >
            {totalText}
          </Text>
        </Group>
      </Tooltip>
    </HorizontalChartTick>
  );
};
