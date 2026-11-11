import {
  getRequestDistributionPrimaryLabel,
  getRequestDistributionSeriesColor,
  type RequestDistributionChartModel,
} from '@/_helpers/dashboard/requestDistribution';
import type { AppSunburstChartData } from '@/components/charts/AppSunburstChart';
import { barChartTooltipProps } from '@/components/charts/chartTheme';

export const requestDistributionTooltipProps = {
  ...barChartTooltipProps,
  isAnimationActive: false as const,
  wrapperStyle: {
    ...barChartTooltipProps.wrapperStyle,
    pointerEvents: 'auto' as const,
    visibility: 'visible' as const,
  },
};

export const createRequestDistributionPrimaryDonutData = (model: RequestDistributionChartModel) =>
  model.data
    .filter((item) => item.total > 0)
    .map((item, index) => ({
      color: getRequestDistributionSeriesColor(index),
      name: item.primaryMetric,
      label: getRequestDistributionPrimaryLabel(item),
      primaryMetric: item.primaryMetric,
      value: item.total,
    }));

export const createRequestDistributionSunburstData = (
  model: RequestDistributionChartModel,
  hasSecondaryField: boolean
): AppSunburstChartData[] =>
  model.data
    .filter((item) => item.total > 0)
    .map((item, primaryIndex) => {
      const color = getRequestDistributionSeriesColor(primaryIndex);
      const baseItem = {
        color,
        highlightKey: item.primaryMetric,
        name: getRequestDistributionPrimaryLabel(item),
        selection: { primaryMetric: item.primaryMetric },
        primaryLabel: getRequestDistributionPrimaryLabel(item),
      };

      if (!hasSecondaryField) {
        return { ...baseItem, value: item.total };
      }

      const children = model.series
        .map((series, seriesIndex) => ({
          highlightKey: item.primaryMetric,
          name: `${getRequestDistributionPrimaryLabel(item)} · ${series.label}`,
          selection: { primaryMetric: item.primaryMetric, seriesName: series.name },
          primaryLabel: getRequestDistributionPrimaryLabel(item),
          secondaryLabel: series.label,
          seriesIndex,
          value: Number(item[series.name] ?? 0),
        }))
        .filter((series) => series.value > 0)
        .sort((left, right) => right.value - left.value || left.seriesIndex - right.seriesIndex)
        .map(({ seriesIndex: _seriesIndex, ...series }) => series);

      return { ...baseItem, children };
    });
