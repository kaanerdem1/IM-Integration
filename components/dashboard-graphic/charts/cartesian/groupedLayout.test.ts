import { describe, expect, it } from 'vitest';
import type { RequestDistributionChartModel } from '@/_helpers/dashboard/requestDistribution';
import type { RequestDistributionBarOrder } from './barProps';
import {
  createRequestDistributionGroupedHorizontalLayout,
  createRequestDistributionGroupedVerticalLayout,
  requestDistributionGroupedHorizontalDataKey,
  requestDistributionGroupedSeriesNameKey,
  requestDistributionGroupedValueKey,
  requestDistributionGroupedVerticalDataKey,
} from './groupedLayout';

describe('request distribution grouped layouts', () => {
  it('allocates rows only for visible bars and one spacer between categories', () => {
    const model: RequestDistributionChartModel = {
      data: [
        { primaryMetric: 'Birim A', series_0: 3, series_1: 1, total: 4 },
        { primaryMetric: 'Birim B', series_0: 0, series_1: 2, total: 2 },
      ],
      hasData: true,
      series: [
        { color: 'blue', label: 'Seri A', name: 'series_0', total: 3 },
        { color: 'red', label: 'Seri B', name: 'series_1', total: 3 },
      ],
    };
    const orderByPrimaryMetric = new Map<string, RequestDistributionBarOrder>([
      [
        'Birim A',
        {
          seriesNames: ['series_0', 'series_1'],
        },
      ],
      [
        'Birim B',
        {
          seriesNames: ['series_1'],
        },
      ],
    ]);

    const layout = createRequestDistributionGroupedHorizontalLayout(model, orderByPrimaryMetric);

    expect(layout.data).toHaveLength(4);
    expect(layout.data.map((row) => row[requestDistributionGroupedHorizontalDataKey])).toEqual([
      '0:0',
      '0:1',
      '0:spacer',
      '1:0',
    ]);
    expect(layout.data[0]).toMatchObject({
      [requestDistributionGroupedSeriesNameKey]: 'series_0',
      [requestDistributionGroupedValueKey]: 3,
      color: 'blue',
    });
    expect(layout.data[2]).toMatchObject({ isCategorySpacer: 1 });
    expect(layout.categoryByTick.get('0:0')).toEqual({
      label: 'Birim A',
      primaryMetric: 'Birim A',
      offset: 14,
    });
    expect(layout.categoryByTick.get('1:0')).toEqual({
      label: 'Birim B',
      primaryMetric: 'Birim B',
      offset: 0,
    });
    expect(layout.series).toHaveLength(1);
    expect(layout.series[0]?.name).toBe(requestDistributionGroupedValueKey);

    const above = createRequestDistributionGroupedHorizontalLayout(
      model,
      orderByPrimaryMetric,
      true
    );
    expect(above.data).toEqual(layout.data);
    expect([...above.categoryByTick.keys()]).toEqual(['0:0', '1:0']);
    expect(above.categoryByTick.get('0:0')).toMatchObject({ offset: 0 });
  });

  it('uses dynamic column slots for vertical groups', () => {
    const model: RequestDistributionChartModel = {
      data: [
        { primaryMetric: 'Birim A', series_0: 3, series_1: 1, total: 4 },
        { primaryMetric: 'Birim B', series_0: 0, series_1: 2, total: 2 },
      ],
      hasData: true,
      series: [
        { color: 'blue', label: 'Seri A', name: 'series_0', total: 3 },
        { color: 'red', label: 'Seri B', name: 'series_1', total: 3 },
      ],
    };
    const orderByPrimaryMetric = new Map<string, RequestDistributionBarOrder>([
      [
        'Birim A',
        {
          seriesNames: ['series_0', 'series_1'],
        },
      ],
      [
        'Birim B',
        {
          seriesNames: ['series_1'],
        },
      ],
    ]);

    const layout = createRequestDistributionGroupedVerticalLayout(model, orderByPrimaryMetric);

    expect(layout.data.map((item) => item[requestDistributionGroupedVerticalDataKey])).toEqual([
      '0:0',
      '0:1',
      '0:spacer',
      '1:0',
    ]);
    expect(layout.categoryByTick.get('0:0')).toEqual({
      label: 'Birim A',
      primaryMetric: 'Birim A',
      offset: 17,
    });
    expect(layout.series).toHaveLength(1);
    expect(layout.series[0]?.name).toBe(requestDistributionGroupedValueKey);
  });
});
