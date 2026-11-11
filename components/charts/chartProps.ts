import type {
  AreaChartProps,
  BarChartProps,
  DonutChartProps,
  LineChartProps,
  SunburstChartProps,
} from '@mantine/charts';
import {
  barChartGridLine,
  barChartStyles,
  barChartTooltipProps,
  chartActiveDotProps,
  chartDotProps,
  chartMarkThickness,
} from './chartTheme';

type ChartTooltipProps = NonNullable<BarChartProps['tooltipProps']>;

export const appCartesianChartProps = {
  gridAxis: 'x',
  gridColor: barChartGridLine.color,
  gridProps: {
    strokeLinecap: barChartGridLine.lineCap,
    strokeWidth: barChartGridLine.width,
  },
  strokeDasharray: barChartGridLine.dashArray,
  style: {
    '--chart-text-color': 'var(--mantine-color-gray-7)',
  },
  styles: barChartStyles,
  tickLine: 'none',
  tooltipAnimationDuration: 0,
  valueFormatter: (value) => value.toLocaleString(),
  withLegend: false,
  xAxisProps: {
    axisLine: false,
    tickLine: false,
  },
  yAxisProps: {
    allowDecimals: false,
    axisLine: false,
    tickLine: false,
  },
} satisfies Partial<BarChartProps>;

export const appBarChartDefaultProps = {
  ...appCartesianChartProps,
  fillOpacity: 0.94,
  style: {
    ...appCartesianChartProps.style,
    '--chart-cursor-fill': 'var(--mantine-color-gray-1)',
  },
} satisfies Partial<BarChartProps>;

const appCurveChartDefaultProps = {
  ...appCartesianChartProps,
  activeDotProps: chartActiveDotProps,
  curveType: 'monotone',
  dotProps: chartDotProps,
  strokeWidth: 3,
  withDots: true,
} satisfies Partial<LineChartProps>;

export const appLineChartDefaultProps = appCurveChartDefaultProps;

export const appAreaChartDefaultProps = {
  ...appCurveChartDefaultProps,
  fillOpacity: 0.22,
  withGradient: true,
} satisfies Partial<AreaChartProps>;

export const appDonutChartCellProps = {
  style: {
    cursor: 'pointer',
    outline: 'none',
  },
} as const;

export const appRadialChartCornerRadius = 8;

export const appDonutChartStyles = {
  tooltipLabel: barChartStyles.tooltipLabel,
  label: {
    fill: 'var(--mantine-color-gray-8)',
    fontSize: 22,
    fontWeight: 800,
  },
} satisfies DonutChartProps['styles'];

export const appDonutChartDefaultProps = {
  cellProps: appDonutChartCellProps,
  paddingAngle: 3,
  pieProps: {
    cornerRadius: appRadialChartCornerRadius,
    minAngle: 3,
  },
  strokeColor: 'var(--mantine-color-body)',
  strokeWidth: 3,
  styles: appDonutChartStyles,
  thickness: chartMarkThickness,
  tooltipAnimationDuration: 0,
  tooltipDataSource: 'segment',
  tooltipProps: barChartTooltipProps,
  valueFormatter: (value) => value.toLocaleString(),
} satisfies Partial<DonutChartProps>;

export const appSunburstChartDefaultProps = {
  gap: 3,
  innerRadius: 58,
  size: 360,
  strokeColor: 'var(--mantine-color-body)',
  tooltipAnimationDuration: 0,
  tooltipProps: barChartTooltipProps,
  valueFormatter: (value) => value.toLocaleString(),
  withLabels: true,
} satisfies Partial<SunburstChartProps>;

export const mergeChartTooltipProps = (tooltipProps?: ChartTooltipProps): ChartTooltipProps => ({
  ...barChartTooltipProps,
  ...tooltipProps,
  wrapperStyle: {
    ...barChartTooltipProps.wrapperStyle,
    ...tooltipProps?.wrapperStyle,
  },
});
