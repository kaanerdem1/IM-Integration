import type {
  RequestDistributionChartDatum,
  RequestDistributionChartModel,
} from '@/_helpers/dashboard/requestDistribution';
import { getRequestDistributionPrimaryLabel } from '@/_helpers/dashboard/requestDistribution';
import {
  requestDistributionGroupedBarSlotWidth,
  requestDistributionHorizontalBarSlotHeight,
} from '../config';
import type { RequestDistributionBarOrder } from './barProps';

export const requestDistributionGroupedHorizontalDataKey = 'groupedHorizontalRowKey';
export const requestDistributionGroupedVerticalDataKey = 'groupedVerticalColumnKey';
export const requestDistributionGroupedSeriesNameKey = 'groupedSeriesName';
export const requestDistributionGroupedValueKey = 'groupedValue';

type RequestDistributionGroupedCategory = {
  label: string;
  primaryMetric: string;
  offset: number;
};

export type RequestDistributionGroupedLayout = {
  categoryByTick: ReadonlyMap<string, RequestDistributionGroupedCategory>;
  data: RequestDistributionChartDatum[];
  series: RequestDistributionChartModel['series'];
};

type RequestDistributionGroupedLayoutOptions = {
  dataKey: string;
  slotSize: number;
  labelsAbove?: boolean;
};

const requestDistributionSpacerKey = 'spacer';

const createRequestDistributionGroupedLayout = (
  model: RequestDistributionChartModel,
  orderByPrimaryMetric: ReadonlyMap<string, RequestDistributionBarOrder>,
  options: RequestDistributionGroupedLayoutOptions
): RequestDistributionGroupedLayout => {
  const categories = model.data
    .map((datum, datumIndex) => ({
      datum,
      datumIndex,
      seriesNames: orderByPrimaryMetric.get(datum.primaryMetric)?.seriesNames ?? [],
    }))
    .filter((category) => category.seriesNames.length > 0);
  const categoryByTick = new Map<string, RequestDistributionGroupedCategory>();
  const data: RequestDistributionChartDatum[] = [];
  const seriesByName = new Map(model.series.map((series) => [series.name, series]));

  categories.forEach(({ datum, datumIndex, seriesNames }, categoryIndex) => {
    const labelSlotIndex = options.labelsAbove ? 0 : Math.floor((seriesNames.length - 1) / 2);

    seriesNames.forEach((seriesName, seriesIndex) => {
      const series = seriesByName.get(seriesName);

      if (!series) {
        return;
      }

      const slotKey = `${datumIndex.toString()}:${seriesIndex.toString()}`;

      data.push({
        [options.dataKey]: slotKey,
        [requestDistributionGroupedSeriesNameKey]: seriesName,
        [requestDistributionGroupedValueKey]: Number(datum[seriesName] ?? 0),
        color: series.color,
        primaryMetric: datum.primaryMetric,
        primaryLabel: getRequestDistributionPrimaryLabel(datum),
        total: datum.total,
      });

      if (seriesIndex === labelSlotIndex) {
        categoryByTick.set(slotKey, {
          label: getRequestDistributionPrimaryLabel(datum),
          primaryMetric: datum.primaryMetric,
          offset: !options.labelsAbove && seriesNames.length % 2 === 0 ? options.slotSize / 2 : 0,
        });
      }
    });

    if (categoryIndex < categories.length - 1) {
      data.push({
        [options.dataKey]: `${datumIndex.toString()}:${requestDistributionSpacerKey}`,
        isCategorySpacer: 1,
        primaryMetric: '',
        total: 0,
      });
    }
  });

  return {
    categoryByTick,
    data,
    series: [
      {
        color: model.series[0]?.color ?? 'blue',
        label: '',
        name: requestDistributionGroupedValueKey,
        total: model.series.reduce((total, series) => total + series.total, 0),
      },
    ],
  };
};

export const createRequestDistributionGroupedHorizontalLayout = (
  model: RequestDistributionChartModel,
  orderByPrimaryMetric: ReadonlyMap<string, RequestDistributionBarOrder>,
  labelsAbove = false
) =>
  createRequestDistributionGroupedLayout(model, orderByPrimaryMetric, {
    dataKey: requestDistributionGroupedHorizontalDataKey,
    slotSize: requestDistributionHorizontalBarSlotHeight,
    labelsAbove,
  });

export const createRequestDistributionGroupedVerticalLayout = (
  model: RequestDistributionChartModel,
  orderByPrimaryMetric: ReadonlyMap<string, RequestDistributionBarOrder>
) =>
  createRequestDistributionGroupedLayout(model, orderByPrimaryMetric, {
    dataKey: requestDistributionGroupedVerticalDataKey,
    slotSize: requestDistributionGroupedBarSlotWidth,
  });
