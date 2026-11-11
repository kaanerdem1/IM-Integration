import type {
  RequestDistributionChartDatum,
  RequestDistributionChartModel,
} from '@/_helpers/dashboard/requestDistribution';
import { getRequestDistributionPrimaryLabel } from '@/_helpers/dashboard/requestDistribution';
import { AppLollipopChart } from '@/components/charts/AppLollipopChart';
import { DashboardBarTooltip } from '@/components/charts/DashboardBarTooltip';
import type { OpenGraphicSelection } from './interactions';
import { useGraphicDisabledReason } from './useGraphicDisabledReason';
import { useGraphicLabels } from './useGraphicLabels';

type RequestDistributionLollipopChartProps = {
  onOpen?: OpenGraphicSelection;
  countLabel: string;
  model: RequestDistributionChartModel;
  availableWidth?: number;
};

const getDatumKey = (datum: RequestDistributionChartDatum) => datum.primaryMetric;
const getDatumLabel = getRequestDistributionPrimaryLabel;
const getDatumValue = (datum: RequestDistributionChartDatum) => datum.total;

export const RequestDistributionLollipopChart = ({
  countLabel,
  model,
  onOpen,
  availableWidth,
}: RequestDistributionLollipopChartProps) => {
  const getDisabledReason = useGraphicDisabledReason();
  const labels = useGraphicLabels();
  return (
    <AppLollipopChart
      availableWidth={availableWidth}
      labelPresentation={labels.primary}
      getItemDisabledReason={(item) => getDisabledReason({ primaryMetric: item.primaryMetric })}
      onItemOpen={
        onOpen ? (item, event) => onOpen({ primaryMetric: item.primaryMetric }, event) : undefined
      }
      data={model.data}
      getKey={getDatumKey}
      getLabel={getDatumLabel}
      getValue={getDatumValue}
      renderTooltip={(datum) => (
        <DashboardBarTooltip
          active
          listLabel={labels.secondaryFieldLabel}
          hideZeroValues
          {...labels.primary.getTooltipHeading(getRequestDistributionPrimaryLabel(datum))}
          renderSeriesLabel={labels.secondary.renderTooltipLabel}
          payload={model.series.map((series) => ({
            color: series.color,
            dataKey: series.name,
            name: series.label,
            value: Number(datum[series.name] ?? 0),
          }))}
          series={model.series}
        />
      )}
      xAxisLabel={countLabel}
    />
  );
};
