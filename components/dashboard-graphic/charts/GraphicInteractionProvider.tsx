import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { parseGraphicMetric } from '@/_helpers/dashboard/graphicMetrics';
import {
  getRequestDistributionPrimaryLabel,
  type RequestDistributionChartModel,
} from '@/_helpers/dashboard/requestDistribution';
import type { GraphicSelection } from './interactions';
import { GraphicInteractionContext } from './useGraphicDisabledReason';

export const GraphicInteractionProvider = ({
  model,
  secondaryField,
  children,
}: {
  model: RequestDistributionChartModel;
  secondaryField: string | null;
  children: ReactNode;
}) => {
  const { t } = useTranslation();
  const getDisabledReason = useMemo(() => {
    const reason = t('label.home.requestDistributionUnspecifiedFilterUnavailable');
    const invalidReason = t('label.home.requestDistributionInvalidMetricFilterUnavailable');
    const getReason = (id: string | null | undefined, label: string) =>
      !id?.trim() ? reason : !parseGraphicMetric(id, label) ? invalidReason : undefined;
    const primary = new Map(
      model.data.map((row) => [
        row.primaryMetric,
        getReason(row.primaryMetricId, getRequestDistributionPrimaryLabel(row)),
      ])
    );
    const secondary = new Map(
      model.series.map((series) => [series.name, getReason(series.metricId, series.label)])
    );
    return (selection: GraphicSelection) =>
      (selection.primaryMetric !== undefined ? primary.get(selection.primaryMetric) : undefined) ??
      (secondaryField && selection.seriesName !== undefined
        ? secondary.get(selection.seriesName)
        : undefined);
  }, [model.data, model.series, secondaryField, t]);

  return (
    <GraphicInteractionContext value={getDisabledReason}>{children}</GraphicInteractionContext>
  );
};
