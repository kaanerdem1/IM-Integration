import {
  appChartLegendPositions,
  appChartTypeDefinitions,
  type AppChartLegendPosition,
  type AppChartType,
} from '@/components/charts/chartTypes';
import { FormEnterFieldEnum } from '@/pages/requests/software-development/form/types';
import type { RequestDistributionFormValues } from './types';

export const requestDistributionParameterKey = 'talep-dashboard-grafik';

const requestDistributionChartTypeLabelKeys = {
  area: 'label.home.requestDistributionAreaChart',
  donut: 'label.home.requestDistributionDonutChart',
  'grouped-bar': 'label.home.requestDistributionGroupedBarChart',
  'grouped-horizontal-bar': 'label.home.requestDistributionGroupedHorizontalBarChart',
  heatmap: 'label.home.requestDistributionHeatmapChart',
  line: 'label.home.requestDistributionLineChart',
  lollipop: 'label.home.requestDistributionLollipopChart',
  'stacked-area': 'label.home.requestDistributionStackedAreaChart',
  'stacked-bar': 'label.home.requestDistributionStackedBarChart',
  'stacked-horizontal-bar': 'label.home.requestDistributionStackedHorizontalBarChart',
  sunburst: 'label.home.requestDistributionSunburstChart',
} as const satisfies Record<AppChartType, string>;

export const requestDistributionChartTypeDefinitions = appChartTypeDefinitions.map(
  (definition) => ({
    ...definition,
    labelKey: requestDistributionChartTypeLabelKeys[definition.value],
  })
);

const requestDistributionLegendPositionLabelKeys = {
  bottom: 'label.home.requestDistributionLegendPositionBottom',
  left: 'label.home.requestDistributionLegendPositionLeft',
  right: 'label.home.requestDistributionLegendPositionRight',
  top: 'label.home.requestDistributionLegendPositionTop',
} as const satisfies Record<AppChartLegendPosition, string>;

export const requestDistributionLegendPositionDefinitions = appChartLegendPositions.map(
  (value) => ({
    labelKey: requestDistributionLegendPositionLabelKeys[value],
    value,
  })
);

export const initialRequestDistributionFormValues: RequestDistributionFormValues = {
  chartType: 'stacked-horizontal-bar',
  legendPosition: 'top',
  primaryField: FormEnterFieldEnum.ProjectLeaderBusinessUnit,
  savedFilterId: null,
  secondaryField: null,
};
