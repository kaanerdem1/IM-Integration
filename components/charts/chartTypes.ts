export const appChartTypeDefinitions = [
  { family: 'bar', orientation: 'vertical', stacked: true, value: 'stacked-bar' },
  { family: 'bar', orientation: 'vertical', stacked: false, value: 'grouped-bar' },
  {
    family: 'bar',
    orientation: 'horizontal',
    stacked: true,
    value: 'stacked-horizontal-bar',
  },
  {
    family: 'bar',
    orientation: 'horizontal',
    stacked: false,
    value: 'grouped-horizontal-bar',
  },
  { family: 'donut', orientation: null, stacked: false, value: 'donut' },
  { family: 'sunburst', orientation: null, stacked: false, value: 'sunburst' },
  { family: 'heatmap', orientation: null, stacked: false, value: 'heatmap' },
  { family: 'lollipop', orientation: 'horizontal', stacked: false, value: 'lollipop' },
  { family: 'line', orientation: 'vertical', stacked: false, value: 'line' },
  { family: 'area', orientation: 'vertical', stacked: false, value: 'area' },
  { family: 'area', orientation: 'vertical', stacked: true, value: 'stacked-area' },
] as const;

export type AppChartType = (typeof appChartTypeDefinitions)[number]['value'];
export type AppChartTypeDefinition = (typeof appChartTypeDefinitions)[number];

export const appChartLegendPositions = ['top', 'right', 'bottom', 'left'] as const;
export type AppChartLegendPosition = (typeof appChartLegendPositions)[number];

const appChartTypeDefinitionByValue = new Map<AppChartType, AppChartTypeDefinition>(
  appChartTypeDefinitions.map((definition) => [definition.value, definition])
);

export const getAppChartTypeDefinition = (chartType: AppChartType) => {
  const definition = appChartTypeDefinitionByValue.get(chartType);

  if (!definition) {
    throw new Error(`Unsupported chart type: ${chartType}`);
  }

  return definition;
};
