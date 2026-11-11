import { barChartLayout, horizontalChartLabelLayout } from './chartTheme';

export const getHorizontalChartLayout = (
  width: number | undefined,
  {
    markHeight = barChartLayout.horizontalBarHeight,
    rightMargin = barChartLayout.numericAxisEndGutter,
    minPlotWidth = horizontalChartLabelLayout.minPlotWidth,
  }: {
    markHeight?: number;
    rightMargin?: number;
    minPlotWidth?: number;
  } = {}
) => {
  const rules = horizontalChartLabelLayout;
  const sideLabelWidth =
    width === undefined
      ? rules.maxWidth
      : Math.min(rules.maxWidth, Math.max(rules.minWidth, width * rules.widthRatio));
  const sideAxisWidth = sideLabelWidth + barChartLayout.tickLabelGap;
  const above =
    width !== undefined && width - rules.leftMargin - sideAxisWidth - rightMargin < minPlotWidth;
  // Recharts omits custom ticks on an axis with zero width.
  const axisWidth = above ? 1 : sideAxisWidth;
  const labelHeight = above ? rules.aboveHeight : barChartLayout.tickLabelHeight;
  const labelWidth = above
    ? Math.max(0, (width ?? 0) - rules.leftMargin - axisWidth - rightMargin)
    : sideLabelWidth;
  const rowHeight = above
    ? labelHeight + rules.aboveGap + markHeight + rules.rowGap
    : barChartLayout.rowHeight;
  const topMargin = above ? (labelHeight + rules.aboveGap - rules.rowGap) / 2 : 0;

  return {
    above,
    axisWidth,
    labelHeight,
    labelWidth,
    rowHeight,
    markHeight,
    margin: {
      left: rules.leftMargin,
      right: rightMargin,
      top: topMargin,
      bottom: barChartLayout.xAxisLabelMargin,
    },
  };
};

export type HorizontalChartLayout = ReturnType<typeof getHorizontalChartLayout>;
