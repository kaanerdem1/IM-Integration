import { describe, expect, it } from 'vitest';
import type { RequestDistributionChartModel } from '@/_helpers/dashboard/requestDistribution';
import { createRequestDistributionSunburstData } from './utils';

const model = {
  data: [
    { primaryMetric: 'Birim A', series_0: 2, series_1: 8, series_2: 0, total: 10 },
    { primaryMetric: 'Birim B', series_0: 4, series_1: 0, series_2: 1, total: 5 },
  ],
  hasData: true,
  series: [
    { color: '#2563EB', label: 'Tür 1', name: 'series_0', total: 6 },
    { color: '#DC2626', label: 'Tür 2', name: 'series_1', total: 8 },
    { color: '#16A34A', label: 'Tür 3', name: 'series_2', total: 1 },
  ],
} satisfies RequestDistributionChartModel;

describe('createRequestDistributionSunburstData', () => {
  it('creates value-sorted child sectors and excludes zero values', () => {
    const data = createRequestDistributionSunburstData(model, true);

    expect(data[0]).toMatchObject({
      highlightKey: 'Birim A',
      name: 'Birim A',
      children: [
        { highlightKey: 'Birim A', name: 'Birim A · Tür 2', value: 8 },
        { highlightKey: 'Birim A', name: 'Birim A · Tür 1', value: 2 },
      ],
    });
    expect(data[1].children).toEqual([
      {
        highlightKey: 'Birim B',
        name: 'Birim B · Tür 1',
        primaryLabel: 'Birim B',
        secondaryLabel: 'Tür 1',
        value: 4,
        selection: { primaryMetric: 'Birim B', seriesName: 'series_0' },
      },
      {
        highlightKey: 'Birim B',
        name: 'Birim B · Tür 3',
        primaryLabel: 'Birim B',
        secondaryLabel: 'Tür 3',
        value: 1,
        selection: { primaryMetric: 'Birim B', seriesName: 'series_2' },
      },
    ]);
  });

  it('creates a single proportional ring when there is no secondary field', () => {
    const data = createRequestDistributionSunburstData(model, false);

    expect(data).toMatchObject([
      { name: 'Birim A', value: 10 },
      { name: 'Birim B', value: 5 },
    ]);
    expect(data.every((item) => item.children === undefined)).toBe(true);
  });
});
