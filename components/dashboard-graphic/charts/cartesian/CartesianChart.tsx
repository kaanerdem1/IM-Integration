import { useMemo, useRef, type KeyboardEvent, type MouseEvent, type RefObject } from 'react';
import type { TooltipContentProps } from 'recharts';
import { getThemeColor, Text, useMantineTheme } from '@mantine/core';
import type { RequestDistributionChartModel } from '@/_helpers/dashboard/requestDistribution';
import { getRequestDistributionPrimaryLabel } from '@/_helpers/dashboard/requestDistribution';
import { AppAreaChart } from '@/components/charts/AppAreaChart';
import { AppBarChart } from '@/components/charts/AppBarChart';
import { AppLineChart } from '@/components/charts/AppLineChart';
import {
  barChartLayout,
  horizontalBarChartProps,
  horizontalChartLabelLayout,
} from '@/components/charts/chartTheme';
import { getAppChartTypeDefinition } from '@/components/charts/chartTypes';
import { getHorizontalChartLayout } from '@/components/charts/horizontalChartLayout';
import { useChartHighlightVariables } from '@/components/charts/useChartHighlightVariables';
import type { RequestDistributionChartType } from '@/components/dashboard-graphic/types';
import {
  requestDistributionBarChartProps,
  requestDistributionChartLayout,
  requestDistributionHorizontalBarSlotHeight,
  requestDistributionMinimumBarSize,
  requestDistributionVerticalBarWidth,
} from '../config';
import { graphicInteractionProps, type OpenGraphicSelection } from '../interactions';
import { useGraphicDisabledReason } from '../useGraphicDisabledReason';
import { useGraphicLabels } from '../useGraphicLabels';
import { requestDistributionTooltipProps } from '../utils';
import { getRequestDistributionBarProps, type RequestDistributionBarOrder } from './barProps';
import {
  RequestDistributionTooltip,
  RequestDistributionXAxisTick,
  RequestDistributionYAxisTick,
} from './ChartTooltip';
import { GraphicPoint } from './GraphicPoint';
import {
  createRequestDistributionGroupedHorizontalLayout,
  createRequestDistributionGroupedVerticalLayout,
  requestDistributionGroupedHorizontalDataKey,
  requestDistributionGroupedVerticalDataKey,
} from './groupedLayout';

type RequestDistributionCartesianChartProps = {
  onOpen?: OpenGraphicSelection;
  chartContainerRef: RefObject<HTMLDivElement | null>;
  chartType: RequestDistributionChartType;
  countLabel: string;
  model: RequestDistributionChartModel;
  primaryFieldLabel: string;
  seriesNamesByPrimaryMetric: ReadonlyMap<string, readonly string[]>;
  availableWidth?: number;
  availableHeight?: number;
};

const emptyBarOrderByPrimaryMetric = new Map<string, RequestDistributionBarOrder>();
const emptyTotalByPrimaryMetric = new Map<string, number>();
const verticalBarLayoutProps = {
  ...requestDistributionBarChartProps,
  margin: { bottom: barChartLayout.xAxisLabelMargin, left: 10, right: 5 },
};

export const RequestDistributionCartesianChart = ({
  onOpen,
  chartContainerRef,
  chartType,
  countLabel,
  model,
  primaryFieldLabel,
  seriesNamesByPrimaryMetric,
  availableWidth,
  availableHeight,
}: RequestDistributionCartesianChartProps) => {
  const theme = useMantineTheme();
  const getDisabledReason = useGraphicDisabledReason();
  const labels = useGraphicLabels();
  const chartTypeDefinition = getAppChartTypeDefinition(chartType);
  const isBarChart = chartTypeDefinition.family === 'bar';
  const isHorizontalBarChart = isBarChart && chartTypeDefinition.orientation === 'horizontal';
  const fitToContainer = availableWidth !== undefined;
  const horizontalLayout = useMemo(
    () => getHorizontalChartLayout(availableWidth),
    [availableWidth]
  );
  const horizontalBarLayoutProps = useMemo(
    () => ({
      ...requestDistributionBarChartProps,
      margin: {
        ...horizontalLayout.margin,
        top:
          chartType === 'grouped-horizontal-bar' && horizontalLayout.above
            ? horizontalLayout.markHeight / 2 +
              horizontalChartLabelLayout.aboveGap +
              horizontalLayout.labelHeight -
              requestDistributionHorizontalBarSlotHeight / 2
            : horizontalLayout.margin.top,
      },
    }),
    [chartType, horizontalLayout]
  );
  const baseChartHeight = availableHeight ?? requestDistributionChartLayout.minHeight;
  const barLayout =
    chartType === 'grouped-horizontal-bar'
      ? ('horizontal-rows' as const)
      : chartType === 'grouped-bar'
        ? ('vertical-slots' as const)
        : isHorizontalBarChart
          ? ('horizontal-bars' as const)
          : ('vertical-columns' as const);
  const barChartRef = useRef<HTMLDivElement>(null);
  const groupedHighlightVariables = useChartHighlightVariables(
    barChartRef,
    model.series,
    chartType === 'grouped-horizontal-bar' || chartType === 'grouped-bar'
  );
  const hasLongXAxisLabels = useMemo(
    () =>
      !isHorizontalBarChart &&
      model.data.some(
        (item) =>
          labels.primary.formatLabel(getRequestDistributionPrimaryLabel(item)).length >=
          requestDistributionChartLayout.xAxisLongLabelThreshold
      ),
    [isHorizontalBarChart, model.data, labels.primary]
  );
  const barOrderByPrimaryMetric = useMemo(() => {
    if (!isBarChart) {
      return emptyBarOrderByPrimaryMetric;
    }

    return new Map(
      model.data.map((datum) => {
        const seriesNames = seriesNamesByPrimaryMetric.get(datum.primaryMetric) ?? [];

        return [
          datum.primaryMetric,
          {
            seriesNames,
          },
        ] as const;
      })
    );
  }, [isBarChart, model.data, seriesNamesByPrimaryMetric]);
  const barProps = useMemo(() => {
    if (!isBarChart) {
      return undefined;
    }

    return getRequestDistributionBarProps({
      getDisabledReason,
      onOpen,
      highlightVariables: groupedHighlightVariables,
      layout: barLayout,
      orderByPrimaryMetric: barOrderByPrimaryMetric,
      stacked: chartTypeDefinition.stacked,
    });
  }, [
    getDisabledReason,
    onOpen,
    barOrderByPrimaryMetric,
    barLayout,
    chartTypeDefinition.stacked,
    groupedHighlightVariables,
    isBarChart,
  ]);
  const groupedHorizontalLayout = useMemo(
    () =>
      chartType === 'grouped-horizontal-bar'
        ? createRequestDistributionGroupedHorizontalLayout(
            model,
            barOrderByPrimaryMetric,
            horizontalLayout.above
          )
        : null,
    [barOrderByPrimaryMetric, chartType, model, horizontalLayout.above]
  );
  const groupedVerticalLayout = useMemo(
    () =>
      chartType === 'grouped-bar'
        ? createRequestDistributionGroupedVerticalLayout(model, barOrderByPrimaryMetric)
        : null,
    [barOrderByPrimaryMetric, chartType, model]
  );
  const longXAxisLabelExtraHeight =
    hasLongXAxisLabels && !fitToContainer
      ? requestDistributionChartLayout.xAxisLongLabelExtraHeight
      : 0;
  const maximumStackedSeriesCount = useMemo(
    () =>
      chartType === 'stacked-bar'
        ? Array.from(seriesNamesByPrimaryMetric.values()).reduce(
            (maximum, seriesNames) => Math.max(maximum, seriesNames.length),
            0
          )
        : 0,
    [chartType, seriesNamesByPrimaryMetric]
  );
  const stackedVerticalBaseChartHeight =
    Math.max(baseChartHeight, maximumStackedSeriesCount * requestDistributionMinimumBarSize + 120) +
    longXAxisLabelExtraHeight;
  const chartHeight = isHorizontalBarChart
    ? (groupedHorizontalLayout
        ? groupedHorizontalLayout.data.length * requestDistributionHorizontalBarSlotHeight
        : model.data.length * horizontalLayout.rowHeight) +
      horizontalBarLayoutProps.margin.top +
      horizontalBarLayoutProps.margin.bottom +
      horizontalChartLabelLayout.numericAxisHeight
    : chartType === 'stacked-bar'
      ? stackedVerticalBaseChartHeight
      : baseChartHeight + longXAxisLabelExtraHeight;
  const totalByPrimaryMetric = useMemo(
    () =>
      isHorizontalBarChart
        ? new Map(model.data.map((item) => [item.primaryMetric, item.total]))
        : emptyTotalByPrimaryMetric,
    [isHorizontalBarChart, model.data]
  );
  const tickSlotWidth =
    availableWidth === undefined
      ? undefined
      : (availableWidth - 100) / Math.max(1, model.data.length);
  const xAxisTickAngle =
    tickSlotWidth !== undefined
      ? tickSlotWidth < 60
        ? -65
        : hasLongXAxisLabels
          ? -35
          : 0
      : hasLongXAxisLabels
        ? requestDistributionChartLayout.xAxisTickAngle
        : 0;
  const categoryByTick = useMemo(
    () =>
      new Map(
        model.data.map((row) => [
          row.primaryMetric,
          {
            label: getRequestDistributionPrimaryLabel(row),
            primaryMetric: row.primaryMetric,
            offset: 0,
          },
        ])
      ),
    [model.data]
  );
  const curveProps = (series: { name: string; label?: string; color?: string }) => {
    const color = getThemeColor(series.color, theme);
    const interaction = graphicInteractionProps(
      onOpen,
      { seriesName: series.name },
      series.label,
      getDisabledReason({ seriesName: series.name })
    );
    return {
      ...interaction,
      onClick: (_props: unknown, event: MouseEvent<SVGPathElement>) => interaction.onClick?.(event),
      onAuxClick: (_props: unknown, event: MouseEvent<SVGPathElement>) => {
        interaction.onAuxClick?.(event);
      },
      onKeyDown: (_props: unknown, event: KeyboardEvent<SVGPathElement>) => {
        interaction.onKeyDown?.(event);
      },
      dot: <GraphicPoint color={color} onOpen={onOpen} seriesName={series.name} />,
      activeDot: <GraphicPoint color={color} onOpen={onOpen} seriesName={series.name} active />,
    };
  };
  const xAxisTickTextAnchor = xAxisTickAngle !== 0 ? ('end' as const) : ('middle' as const);
  const chartProps = {
    data: model.data,
    dataKey: 'primaryMetric',
    h: chartHeight,
    series: model.series,
    tooltipProps: {
      ...requestDistributionTooltipProps,
      content: (props: TooltipContentProps<number, string>) => (
        <RequestDistributionTooltip
          {...props}
          chartContainerRef={chartContainerRef}
          series={model.series}
        />
      ),
      shared: false,
    },
    valueFormatter: (value: number) => value.toLocaleString(),
    xAxisLabel: primaryFieldLabel,
    xAxisProps: {
      angle: xAxisTickAngle,
      height: xAxisTickAngle !== 0 ? requestDistributionChartLayout.xAxisHeight : undefined,
      interval: 0,
      padding:
        hasLongXAxisLabels || !isBarChart
          ? {
              left: requestDistributionChartLayout.xAxisEdgePadding,
              right: requestDistributionChartLayout.xAxisEdgePadding,
            }
          : undefined,
      textAnchor: xAxisTickTextAnchor,
      tick: (
        <RequestDistributionXAxisTick
          chartWidth={availableWidth}
          angle={xAxisTickAngle}
          categoryByTick={groupedVerticalLayout?.categoryByTick ?? categoryByTick}
          onOpen={onOpen}
          textAnchor={xAxisTickTextAnchor}
          maxLabelWidth={fitToContainer ? (xAxisTickAngle === 0 ? tickSlotWidth : 110) : undefined}
        />
      ),
      tickMargin: hasLongXAxisLabels ? 10 : undefined,
    },
    yAxisLabel: countLabel,
    yAxisProps: {
      allowDecimals: false,
      interval: 0,
    },
  };

  switch (chartType) {
    case 'line':
      return <AppLineChart {...chartProps} lineProps={curveProps} />;
    case 'area':
    case 'stacked-area':
      return (
        <AppAreaChart
          {...chartProps}
          areaProps={curveProps}
          type={chartTypeDefinition.stacked ? 'stacked' : 'default'}
        />
      );
    case 'grouped-horizontal-bar':
    case 'stacked-horizontal-bar':
      return (
        <>
          <Text size="xs" c="dimmed" mb={8}>
            {primaryFieldLabel}
          </Text>
          <AppBarChart
            ref={barChartRef}
            {...chartProps}
            {...horizontalBarChartProps}
            barChartProps={horizontalBarLayoutProps}
            barProps={barProps}
            data={groupedHorizontalLayout?.data ?? model.data}
            dataKey={
              groupedHorizontalLayout
                ? requestDistributionGroupedHorizontalDataKey
                : 'primaryMetric'
            }
            series={groupedHorizontalLayout?.series ?? model.series}
            type={chartTypeDefinition.stacked ? 'stacked' : 'default'}
            withLegendHighlight={!groupedHorizontalLayout}
            xAxisLabel={countLabel}
            xAxisProps={{
              ...horizontalBarChartProps.xAxisProps,
              interval: 0,
              height: horizontalChartLabelLayout.numericAxisHeight,
            }}
            yAxisLabel={undefined}
            yAxisProps={{
              tick: (
                <RequestDistributionYAxisTick
                  countLabel={countLabel}
                  categoryByTick={groupedHorizontalLayout?.categoryByTick ?? categoryByTick}
                  onOpen={onOpen}
                  totalByPrimaryMetric={totalByPrimaryMetric}
                  layout={horizontalLayout}
                />
              ),
              interval: 0,
              minTickGap: 0,
              tickSize: 0,
              tickMargin: 0,
              width: horizontalLayout.axisWidth,
            }}
          />
        </>
      );
    case 'grouped-bar':
    case 'stacked-bar':
      return (
        <AppBarChart
          ref={barChartRef}
          {...chartProps}
          barChartProps={verticalBarLayoutProps}
          barProps={barProps}
          data={groupedVerticalLayout?.data ?? model.data}
          dataKey={
            groupedVerticalLayout ? requestDistributionGroupedVerticalDataKey : 'primaryMetric'
          }
          maxBarWidth={requestDistributionVerticalBarWidth}
          series={groupedVerticalLayout?.series ?? model.series}
          type={chartTypeDefinition.stacked ? 'stacked' : 'default'}
          withLegendHighlight={!groupedVerticalLayout}
        />
      );
    case 'donut':
    case 'heatmap':
    case 'lollipop':
    case 'sunburst':
      return null;
  }
};
