import { describe, expect, it } from 'vitest';
import { appChartLegendPositions, appChartTypeDefinitions } from './chartTypes';

describe('appChartTypeDefinitions', () => {
  it('defines every chart option once and includes reusable custom chart types', () => {
    const values = appChartTypeDefinitions.map((definition) => definition.value);

    expect(new Set(values).size).toBe(values.length);
    expect(values).toContain('heatmap');
    expect(values).toContain('lollipop');
    expect(values).toContain('sunburst');
  });

  it('keeps bar direction and stacking behavior in chart metadata', () => {
    expect(
      appChartTypeDefinitions.find((definition) => definition.value === 'stacked-horizontal-bar')
    ).toMatchObject({ family: 'bar', orientation: 'horizontal', stacked: true });
    expect(
      appChartTypeDefinitions.find((definition) => definition.value === 'grouped-bar')
    ).toMatchObject({ family: 'bar', orientation: 'vertical', stacked: false });
  });
});

describe('appChartLegendPositions', () => {
  it('supports each chart edge', () => {
    expect(appChartLegendPositions).toEqual(['top', 'right', 'bottom', 'left']);
  });
});
