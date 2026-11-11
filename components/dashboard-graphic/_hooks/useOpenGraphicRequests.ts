import { useCallback, useMemo } from 'react';
import { parseGraphicMetric } from '@/_helpers/dashboard/graphicMetrics';
import { getRequestDistributionPrimaryLabel } from '@/_helpers/dashboard/requestDistribution';
import {
  isRequestBreakdownField,
  parseRequestBreakdowns,
  serializeRequestBreakdowns,
  type RequestBreakdownFilter,
} from '@/components/request-filter/_utils/breakdownFilters';
import {
  isNewTabRequestListEvent,
  useOpenRequestList,
} from '@/pages/requests/list/_hooks/useOpenRequestList';
import type { OpenGraphicSelection } from '../charts/interactions';
import type { useGraphicData } from './useGraphicData';

export const useOpenGraphicRequests = (
  chart: ReturnType<typeof useGraphicData>,
  onNavigate?: () => void
) => {
  const { model, drilldown, isFetching, isError, hasInvalidConfiguration } = chart;
  const { openRequestList } = useOpenRequestList(drilldown.filterIds);
  const primaryByKey = useMemo(
    () => new Map(model.data.map((row) => [row.primaryMetric, row])),
    [model.data]
  );
  const seriesByName = useMemo(
    () => new Map(model.series.map((series) => [series.name, series])),
    [model.series]
  );

  return useCallback<OpenGraphicSelection>(
    (selection, event) => {
      if (isFetching || isError || hasInvalidConfiguration || !drilldown.filters) {
        return;
      }
      const filters = parseRequestBreakdowns(drilldown.filters.listBreakdowns);
      if (!filters) {
        return;
      }
      // Keep a saved chart scope separate from the new click's multi-value selection.
      const group = filters.length
        ? filters.reduce((max, filter) => Math.max(max, filter.group ?? 0), 0) + 1
        : undefined;
      const add = (
        field: string | null | undefined,
        value: string | null | undefined,
        label: string,
        fieldLabel: string
      ) => {
        if (
          !field ||
          !isRequestBreakdownField(field) ||
          typeof value !== 'string' ||
          !value.trim()
        ) {
          return false;
        }
        const metrics = parseGraphicMetric(value, label);
        if (!metrics) {
          return false;
        }
        filters.push(
          ...metrics.map(
            (metric) =>
              ({
                field,
                value: metric.value,
                label: `${fieldLabel}: ${metric.label}`,
                ...(group !== undefined ? { group } : {}),
              }) satisfies RequestBreakdownFilter
          )
        );
        return true;
      };
      if (selection.primaryMetric !== undefined) {
        const row = primaryByKey.get(selection.primaryMetric);
        if (
          !row ||
          !add(
            drilldown.primaryField,
            row.primaryMetricId,
            getRequestDistributionPrimaryLabel(row),
            drilldown.primaryLabel
          )
        ) {
          return;
        }
      }
      if (selection.seriesName !== undefined && drilldown.secondaryField) {
        const series = seriesByName.get(selection.seriesName);
        if (
          !series ||
          !add(drilldown.secondaryField, series.metricId, series.label, drilldown.secondaryLabel)
        ) {
          return;
        }
      }
      // An explicit empty scope prevents the list from injecting its default date filter.
      openRequestList(
        { ...drilldown.filters, listBreakdowns: serializeRequestBreakdowns(filters) ?? '[]' },
        event
      );
      if (!isNewTabRequestListEvent(event)) {
        onNavigate?.();
      }
    },
    [
      drilldown,
      hasInvalidConfiguration,
      isError,
      isFetching,
      openRequestList,
      primaryByKey,
      seriesByName,
      onNavigate,
    ]
  );
};
