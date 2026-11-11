import type { CSSProperties } from 'react';
import type { BarChartProps } from '@mantine/charts';
import type { BadgeProps, DividerProps, TextProps, TooltipProps } from '@mantine/core';

type BarChartGridProps = NonNullable<BarChartProps['gridProps']>;
type BarChartGridLine = {
  color: NonNullable<BarChartProps['gridColor']>;
  dashArray: NonNullable<BarChartProps['strokeDasharray']>;
  lineCap: NonNullable<BarChartGridProps['strokeLinecap']>;
  width: NonNullable<BarChartGridProps['strokeWidth']>;
};

// Use a CSS color value because Mantine gridColor and custom CSS borders share this source.
export const barChartGridLine = {
  color: 'var(--mantine-color-gray-3)',
  dashArray: '1 6',
  lineCap: 'round',
  width: 2,
} satisfies BarChartGridLine;

export const barChartLegendTextProps = {
  fz: 12,
  lh: 1.4,
  size: 'xs',
  style: { cursor: 'pointer', whiteSpace: 'nowrap' },
} satisfies TextProps;

export const chartLegendLayout = {
  rowGap: 8,
  columnGap: 16,
  markerTextGap: 6,
} as const;

export const chartLegendMarkerStyle = {
  width: 10,
  height: 10,
  borderRadius: 3,
  flexShrink: 0,
  marginInlineEnd: chartLegendLayout.markerTextGap,
  alignSelf: 'baseline',
  // Match the label's capital-letter center, independently of line height.
  transform: 'translateY(calc(50% - 0.5cap))',
} satisfies CSSProperties;

export const barChartLegendBadgeProps = {
  radius: 'xl',
  size: 'xs',
  style: { cursor: 'pointer' },
} satisfies BadgeProps;

export const chartTooltipTitleProps = {
  c: 'var(--mantine-color-text)',
  fw: 600,
  size: 'sm',
} satisfies TextProps;

export const chartTooltipRowPadding = 3;

export const chartElementTooltipProps = {
  events: { hover: true, focus: true, touch: true },
  floatingStrategy: 'fixed',
  maw: 'min(360px, calc(100vw - 24px))',
  multiline: true,
  position: 'top',
  transitionProps: { duration: 0 },
  withinPortal: true,
  withArrow: true,
} satisfies Partial<TooltipProps>;

export const chartTooltipDividerProps = {
  my: 8,
  color: 'color-mix(in srgb, currentColor 18%, transparent)',
} satisfies DividerProps;

export const chartMarkThickness = 24;
export const radialChartLayout = {
  minimumThickness: chartMarkThickness,
  singleThicknessRatio: 0.11,
  singleMaximumThickness: 40,
  nestedThicknessRatio: 0.075,
  nestedMaximumThickness: 32,
  centerFontRatio: 0.09,
  centerFontToHoleRatio: 0.3,
  centerContentWidthRatio: 0.8,
  centerMinimumDiameter: 56,
  centerMinimumFontSize: 22,
  centerMaximumFontSize: 36,
  centerSecondaryFontSize: 12,
  minimumSegmentLength: 6,
  minimumAngleBudgetRatio: 0.4,
} as const;

export const barChartLayout = {
  minHeight: 300,
  rowHeight: 32,
  tickLabelHeight: 20,
  tickLabelGap: 12,
  horizontalTickFontSize: 10,
  numericAxisEndGutter: 28,
  xAxisLabelMargin: 30,
  horizontalBarHeight: chartMarkThickness,
  verticalBarWidth: 30,
  barGap: 4,
} as const;

export const horizontalChartLabelLayout = {
  minWidth: 112,
  maxWidth: 160,
  widthRatio: 0.28,
  minPlotWidth: 260,
  aboveHeight: 14,
  aboveGap: 4,
  rowGap: 8,
  leftMargin: 4,
  numericAxisHeight: 30,
} as const;

export const heatmapChartLayout = {
  cellMinWidth: 64,
  cellHeight: 30,
  columnGap: 6,
} as const;

export const barChartSpacingProps = {
  barCategoryGap: '12%',
  barGap: 0,
} satisfies NonNullable<BarChartProps['barChartProps']>;

export const horizontalBarChartProps = {
  gridAxis: 'y',
  maxBarWidth: barChartLayout.horizontalBarHeight,
  orientation: 'vertical',
  xAxisProps: { allowDecimals: false },
} satisfies Partial<BarChartProps>;

export const barChartStyles = {
  tooltipLabel: {
    color: 'var(--mantine-color-dimmed)',
    fontSize: 'var(--mantine-font-size-xs)',
    fontWeight: chartTooltipTitleProps.fw,
  },
  tooltipItemColor: {
    paddingTop: 3,
  },
  tooltipItemData: {
    paddingTop: 5,
  },
  tooltipItemName: {
    paddingTop: 5,
  },
} satisfies BarChartProps['styles'];

export const barChartTooltipProps = {
  wrapperStyle: { zIndex: 99 },
} satisfies NonNullable<BarChartProps['tooltipProps']>;

export const barChartBarProps = {
  radius: 10,
  stroke: 'var(--mantine-color-body)',
  strokeOpacity: 1,
  strokeWidth: 3,
} as const;

export const barChartMinimumSize = 20;
export const barChartMinimumVisibleSize = 6;

export const barChartValueLabel = {
  fontSize: 12,
  fontWeight: 700,
  minHeight: 16,
  characterWidth: 7,
  horizontalPadding: 8,
} as const;

export const chartDotProps = {
  r: 5,
  stroke: 'var(--mantine-color-body)',
  strokeWidth: 2,
} as const;

export const chartActiveDotProps = {
  r: 8,
  stroke: 'var(--mantine-color-body)',
  strokeWidth: 3,
} as const;

export const barChartDistributionBar = {
  segmentBoxShadow: '0 0 0 3px var(--mantine-color-body)',
  segmentFontSize: barChartValueLabel.fontSize,
  segmentFontWeight: barChartValueLabel.fontWeight,
  segmentRadius: 999,
  trackBorderTop: `${barChartGridLine.width}px dotted ${barChartGridLine.color}`,
} as const;
