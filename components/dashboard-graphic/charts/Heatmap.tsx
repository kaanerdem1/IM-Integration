import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  RequestDistributionChartDatum,
  RequestDistributionChartModel,
  RequestDistributionChartSeries,
} from '@/_helpers/dashboard/requestDistribution';
import { getRequestDistributionPrimaryLabel } from '@/_helpers/dashboard/requestDistribution';
import { numberFormat } from '@/_helpers/number';
import { AppHeatmap } from '@/components/charts/AppHeatmap';
import type { OpenGraphicSelection } from './interactions';
import { useGraphicDisabledReason } from './useGraphicDisabledReason';
import { useGraphicLabels } from './useGraphicLabels';

type RequestDistributionHeatmapProps = {
  onOpen?: OpenGraphicSelection;
  countLabel: string;
  model: RequestDistributionChartModel;
  primaryFieldLabel: string;
  availableWidth?: number;
};

const getColumnColor = (column: RequestDistributionChartSeries) => column.color;
const getColumnKey = (column: RequestDistributionChartSeries) => column.name;
const getColumnLabel = (column: RequestDistributionChartSeries) => column.label;
const getColumnTotal = (column: RequestDistributionChartSeries) => column.total;
const getRowKey = (row: RequestDistributionChartDatum) => row.primaryMetric;
const getRowLabel = getRequestDistributionPrimaryLabel;
const getRowTotal = (row: RequestDistributionChartDatum) => row.total;
const getCellValue = (row: RequestDistributionChartDatum, column: RequestDistributionChartSeries) =>
  Number(row[column.name] ?? 0);

export const RequestDistributionHeatmap = memo(
  ({
    countLabel,
    model,
    primaryFieldLabel,
    onOpen,
    availableWidth,
  }: RequestDistributionHeatmapProps) => {
    const { t } = useTranslation();
    const getDisabledReason = useGraphicDisabledReason();
    const labels = useGraphicLabels();
    const rows = useMemo(() => model.data.filter((item) => item.total > 0), [model.data]);

    return (
      <AppHeatmap
        availableWidth={availableWidth}
        valueLabel={countLabel}
        formatTooltipTotal={(value) =>
          t('label.home.chartTooltipRequestCount', {
            count: value,
            formattedCount: numberFormat(value),
          })
        }
        rowLabelPresentation={labels.primary}
        columnLabelPresentation={labels.secondary}
        getRowDisabledReason={(row) => getDisabledReason({ primaryMetric: row.primaryMetric })}
        getColumnDisabledReason={(column) => getDisabledReason({ seriesName: column.name })}
        getCellDisabledReason={(row, column) =>
          getDisabledReason({ primaryMetric: row.primaryMetric, seriesName: column.name })
        }
        onCellClick={
          onOpen
            ? ({ row, column }, event) =>
                onOpen({ primaryMetric: row.primaryMetric, seriesName: column.name }, event)
            : undefined
        }
        onCellAuxClick={
          onOpen
            ? ({ row, column }, event) => {
                if (event.button === 1) {
                  onOpen({ primaryMetric: row.primaryMetric, seriesName: column.name }, event);
                }
              }
            : undefined
        }
        onRowOpen={
          onOpen ? (row, event) => onOpen({ primaryMetric: row.primaryMetric }, event) : undefined
        }
        onColumnOpen={
          onOpen ? (column, event) => onOpen({ seriesName: column.name }, event) : undefined
        }
        ariaLabel={`${primaryFieldLabel} - ${countLabel}`}
        columns={model.series}
        columnHeaderLabel={primaryFieldLabel}
        getCellValue={getCellValue}
        getColumnColor={getColumnColor}
        getColumnKey={getColumnKey}
        getColumnLabel={getColumnLabel}
        getColumnTotal={getColumnTotal}
        getRowKey={getRowKey}
        getRowLabel={getRowLabel}
        getRowTotal={getRowTotal}
        rows={rows}
      />
    );
  }
);

RequestDistributionHeatmap.displayName = 'RequestDistributionHeatmap';
