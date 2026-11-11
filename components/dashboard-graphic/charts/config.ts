import { barChartLayout, barChartSpacingProps } from '@/components/charts/chartTheme';

export { barChartMinimumSize as requestDistributionMinimumBarSize } from '@/components/charts/chartTheme';

export const requestDistributionChartLayout = {
  minHeight: barChartLayout.minHeight,
  xAxisEdgePadding: 28,
  xAxisHeight: 140,
  xAxisLongLabelExtraHeight: 52,
  xAxisLongLabelThreshold: 18,
  xAxisTickAngle: -35,
} as const;

export const requestDistributionCategoryMinWidth = 72;
export const requestDistributionDonutCardGap = 16;
export const requestDistributionDonutCardWidth = 384;
export const requestDistributionDonutMaxLabels = 8;
export const requestDistributionSecondaryDonutMaxLabels = 5;
export const requestDistributionPrimaryRadialSize = 360;
export const requestDistributionSunburstSize = 480;
export const requestDistributionHorizontalBarHeight = barChartLayout.horizontalBarHeight;
export const requestDistributionVerticalBarWidth = barChartLayout.verticalBarWidth;
export const requestDistributionBarGap = barChartLayout.barGap;
export const requestDistributionBarChartProps = barChartSpacingProps;
export const requestDistributionHorizontalBarSlotHeight =
  requestDistributionHorizontalBarHeight + requestDistributionBarGap;
export const requestDistributionGroupedBarSlotWidth =
  requestDistributionVerticalBarWidth + requestDistributionBarGap;
export const requestDistributionVerticalBarLayout = {
  categoryWidth: 48,
  gutter: 120,
  minWidth: 360,
} as const;
