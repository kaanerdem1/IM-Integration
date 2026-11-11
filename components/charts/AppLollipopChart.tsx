import { useCallback, useMemo, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Rectangle,
  ResponsiveContainer,
  Scatter,
  XAxis,
  YAxis,
  type BarShapeProps,
  type ScatterShapeProps,
} from 'recharts';
import {
  Box,
  getThemeColor,
  Group,
  Text,
  Tooltip,
  useMantineTheme,
  type MantineColor,
} from '@mantine/core';
import { chartInteractionProps } from './chartInteractionProps';
import type { ChartLabelPresentation } from './chartLabelPresentation';
import { barChartLayout, chartElementTooltipProps, chartTooltipTitleProps } from './chartTheme';
import { ChartTooltipValue } from './ChartTooltipValue';
import { ChartWidthContainer } from './ChartWidthContainer';
import { getHorizontalChartLayout, type HorizontalChartLayout } from './horizontalChartLayout';
import { HorizontalChartTick } from './HorizontalChartTick';
import { ChartTooltipCard } from './tooltip/ChartTooltipCard';
import { ChartTooltipPopover } from './tooltip/ChartTooltipPopover';

export type AppLollipopChartOpenEvent = KeyboardEvent<Element> | MouseEvent<Element>;

export type AppLollipopChartProps<T> = {
  labelPresentation?: ChartLabelPresentation;
  ariaLabel?: string;
  color?: MantineColor;
  data: readonly T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getValue: (item: T) => number;
  minVisibleRowCount?: number;
  onItemOpen?: (item: T, event: AppLollipopChartOpenEvent) => void;
  getItemDisabledReason?: (item: T) => string | undefined;
  renderTooltip?: (item: T) => ReactNode;
  rowHeight?: number;
  valueFormatter?: (value: number) => string;
  xAxisLabel: string;
  availableWidth?: number;
};

type AppLollipopDatum<T> = {
  color: MantineColor;
  item: T;
  key: string;
  label: string;
  value: number;
};

type AppLollipopAxisTickProps<T> = {
  labelPresentation?: ChartLabelPresentation;
  getItemDisabledReason?: AppLollipopChartProps<T>['getItemDisabledReason'];
  dataByKey: ReadonlyMap<string, AppLollipopDatum<T>>;
  onItemOpen?: AppLollipopChartProps<T>['onItemOpen'];
  layout: HorizontalChartLayout;
  payload?: { value?: string };
  valueFormatter: (value: number) => string;
  xAxisLabel: string;
  x?: number;
  y?: number;
};

type AppLollipopShapeProps<T> = ScatterShapeProps & {
  getItemDisabledReason?: AppLollipopChartProps<T>['getItemDisabledReason'];
  onItemOpen?: AppLollipopChartProps<T>['onItemOpen'];
  renderTooltip?: AppLollipopChartProps<T>['renderTooltip'];
  valueFormatter: (value: number) => string;
};

const appLollipopLayout = {
  axisHeight: 42,
  minVisibleRowCount: 1,
  rowHeight: barChartLayout.rowHeight,
} as const;

const getAxisStep = (maxValue: number) => {
  if (maxValue <= 20) {
    return 5;
  }

  if (maxValue <= 100) {
    return 10;
  }

  return Math.max(20, Math.ceil(maxValue / 50) * 10);
};

const AppLollipopAxisTick = <T,>({
  labelPresentation,
  getItemDisabledReason,
  onItemOpen,
  dataByKey,
  layout,
  payload,
  valueFormatter,
  xAxisLabel,
  x = 0,
  y = 0,
}: AppLollipopAxisTickProps<T>) => {
  const datum = dataByKey.get(String(payload?.value ?? ''));

  if (!datum) {
    return <g />;
  }

  const displayText = `${datum.label} (${valueFormatter(datum.value)})`;
  const disabledReason = getItemDisabledReason?.(datum.item);

  return (
    <HorizontalChartTick layout={layout} x={x} y={y}>
      <Tooltip
        {...chartElementTooltipProps}
        label={
          disabledReason ?? (
            <>
              {labelPresentation?.renderTooltipLabel?.(datum.label, 'tick') ?? (
                <Text {...chartTooltipTitleProps} c="inherit">
                  {datum.label}
                </Text>
              )}
              <ChartTooltipValue label={xAxisLabel} value={valueFormatter(datum.value)} />
            </>
          )
        }
        interactive
      >
        <Group
          {...chartInteractionProps(onItemOpen, datum.item, displayText, disabledReason)}
          bg={layout.above ? 'var(--mantine-color-body)' : undefined}
          align="center"
          gap={4}
          h="100%"
          w={layout.above ? '100%' : 'fit-content'}
          maw="100%"
          ml="auto"
          justify={layout.above ? 'space-between' : 'flex-end'}
          wrap="nowrap"
        >
          <Text c="gray.8" fw={500} size="10px" lh={`${layout.labelHeight}px`} truncate>
            {labelPresentation?.renderTickLabel?.(datum.label) ??
              labelPresentation?.formatLabel?.(datum.label) ??
              datum.label}
          </Text>
          <Text
            c="dimmed"
            fw={700}
            size="10px"
            lh={`${layout.labelHeight}px`}
            style={{ flex: '0 0 auto' }}
          >
            ({valueFormatter(datum.value)})
          </Text>
        </Group>
      </Tooltip>
    </HorizontalChartTick>
  );
};

const AppLollipopShape = <T,>({
  getItemDisabledReason,
  cx,
  cy,
  onItemOpen,
  payload,
  renderTooltip,
  valueFormatter,
}: AppLollipopShapeProps<T>) => {
  const theme = useMantineTheme();
  const datum = payload as AppLollipopDatum<T> | undefined;

  if (cx === undefined || cy === undefined || !datum) {
    return <g />;
  }

  const disabledReason = getItemDisabledReason?.(datum.item);
  const isInteractive = Boolean(onItemOpen) && !disabledReason;
  const handleOpen = (event: AppLollipopChartOpenEvent) => {
    if (disabledReason) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onItemOpen?.(datum.item, event);
  };
  const tooltip = renderTooltip?.(datum.item) ?? (
    <ChartTooltipCard header={<Text {...chartTooltipTitleProps}>{datum.label}</Text>}>
      <Text size="xs">{valueFormatter(datum.value)}</Text>
    </ChartTooltipCard>
  );
  const valueColor =
    datum.color.includes('.') || datum.color.startsWith('#') || datum.color.startsWith('var(')
      ? getThemeColor(datum.color, theme)
      : getThemeColor(`${datum.color}.8`, theme);

  return (
    <ChartTooltipPopover
      content={
        disabledReason ? (
          <ChartTooltipCard>
            <Text size="xs">{disabledReason}</Text>
          </ChartTooltipCard>
        ) : (
          tooltip
        )
      }
    >
      <g
        aria-disabled={Boolean(disabledReason) || undefined}
        aria-description={disabledReason}
        aria-label={`${datum.label}: ${valueFormatter(datum.value)}`}
        onAuxClick={(event) => {
          if (event.button === 1) {
            handleOpen(event);
          }
        }}
        onClick={isInteractive ? handleOpen : undefined}
        onKeyDown={(event) => {
          if (isInteractive && (event.key === 'Enter' || event.key === ' ')) {
            handleOpen(event);
          }
        }}
        role={isInteractive || disabledReason ? 'button' : undefined}
        style={{
          cursor: disabledReason ? 'not-allowed' : isInteractive ? 'pointer' : 'default',
          outline: 'none',
        }}
        tabIndex={isInteractive || disabledReason ? 0 : -1}
      >
        <circle
          cx={cx}
          cy={cy}
          fill={getThemeColor(datum.color, theme)}
          r={8}
          stroke={theme.white}
          strokeWidth={2}
        />
        <text
          dominantBaseline="central"
          fill={valueColor}
          fontSize={10}
          fontWeight={800}
          pointerEvents="none"
          x={cx + 13}
          y={cy}
        >
          {valueFormatter(datum.value)}
        </text>
      </g>
    </ChartTooltipPopover>
  );
};

const defaultValueFormatter = (value: number) => value.toLocaleString();

const LollipopChartContent = <T,>({
  labelPresentation,
  getItemDisabledReason,
  ariaLabel,
  color = 'blue',
  data,
  getKey,
  getLabel,
  getValue,
  minVisibleRowCount = appLollipopLayout.minVisibleRowCount,
  onItemOpen,
  renderTooltip,
  rowHeight = appLollipopLayout.rowHeight,
  valueFormatter = defaultValueFormatter,
  xAxisLabel,
  availableWidth,
}: AppLollipopChartProps<T>) => {
  const layout = useMemo(
    () => getHorizontalChartLayout(availableWidth, { markHeight: 16, rightMargin: 44 }),
    [availableWidth]
  );
  const chartData = useMemo(
    () =>
      data
        .map<AppLollipopDatum<T>>((item) => ({
          color,
          item,
          key: getKey(item),
          label: getLabel(item),
          value: getValue(item),
        }))
        .filter((item) => Number.isFinite(item.value) && item.value > 0),
    [color, data, getKey, getLabel, getValue]
  );
  const maxValue = chartData.reduce((current, item) => Math.max(current, item.value), 0);
  const axisStep = getAxisStep(maxValue);
  const axisMax = Math.max(axisStep, Math.ceil(maxValue / axisStep) * axisStep);
  const axisTicks = useMemo(
    () => Array.from({ length: axisMax / axisStep + 1 }, (_, index) => index * axisStep),
    [axisMax, axisStep]
  );
  const dataByKey = useMemo(() => new Map(chartData.map((item) => [item.key, item])), [chartData]);
  const chartHeight =
    appLollipopLayout.axisHeight +
    layout.margin.top +
    Math.max(minVisibleRowCount, chartData.length) * Math.max(rowHeight, layout.rowHeight);
  const renderDot = useCallback(
    (shapeProps: ScatterShapeProps) => (
      <AppLollipopShape
        {...shapeProps}
        onItemOpen={onItemOpen}
        getItemDisabledReason={getItemDisabledReason}
        renderTooltip={renderTooltip}
        valueFormatter={valueFormatter}
      />
    ),
    [onItemOpen, renderTooltip, valueFormatter, getItemDisabledReason]
  );

  const chart = (
    <Box aria-label={ariaLabel} h={chartHeight} role="group">
      <ResponsiveContainer height="100%" width="100%">
        <ComposedChart data={chartData} layout="vertical" margin={{ ...layout.margin, bottom: 0 }}>
          <CartesianGrid
            horizontal={false}
            stroke="var(--mantine-color-gray-3)"
            strokeDasharray="3 4"
          />
          <XAxis
            allowDecimals={false}
            axisLine={{
              stroke: 'var(--mantine-color-gray-3)',
              strokeDasharray: '3 4',
            }}
            dataKey="value"
            domain={[0, axisMax]}
            height={appLollipopLayout.axisHeight}
            label={{
              fill: 'var(--mantine-color-gray-6)',
              fontSize: 10,
              offset: 8,
              position: 'insideBottom',
              value: xAxisLabel,
            }}
            tick={{ fontSize: 10 }}
            tickLine={false}
            ticks={axisTicks}
            type="number"
          />
          <YAxis
            axisLine={false}
            dataKey="key"
            interval={0}
            tick={
              <AppLollipopAxisTick
                labelPresentation={labelPresentation}
                getItemDisabledReason={getItemDisabledReason}
                onItemOpen={onItemOpen}
                dataByKey={dataByKey}
                layout={layout}
                valueFormatter={valueFormatter}
                xAxisLabel={xAxisLabel}
              />
            }
            tickLine={false}
            tickSize={0}
            tickMargin={0}
            type="category"
            width={layout.axisWidth}
          />
          <Bar
            shape={(props: BarShapeProps) => {
              const datum = props.payload as AppLollipopDatum<T>;
              const disabledReason = getItemDisabledReason?.(datum.item);
              return (
                <Tooltip
                  {...chartElementTooltipProps}
                  label={disabledReason}
                  disabled={!disabledReason}
                >
                  <g
                    {...chartInteractionProps(onItemOpen, datum.item, datum.label, disabledReason)}
                  >
                    <Rectangle {...props} radius={2} />
                  </g>
                </Tooltip>
              );
            }}
            barSize={3}
            dataKey="value"
            fill="var(--mantine-color-gray-4)"
            isAnimationActive={false}
            radius={2}
          />
          <Scatter isAnimationActive={false} shape={renderDot} />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );

  return <Tooltip.Group>{chart}</Tooltip.Group>;
};

export const AppLollipopChart = <T,>(props: AppLollipopChartProps<T>) =>
  props.availableWidth === undefined ? (
    <ChartWidthContainer testId="lollipop-chart-width-container">
      {(width) => <LollipopChartContent {...props} availableWidth={width} />}
    </ChartWidthContainer>
  ) : (
    <LollipopChartContent {...props} />
  );
