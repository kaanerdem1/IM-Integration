import { useMemo } from 'react';
import { skipToken, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getDashboard } from '@/_api/_core/api-gen/dashboard';
import type { DashboardGenericGraphicRequestDto } from '@/_api/_core/api-gen/types';
import { useParameterDetail } from '@/_api/hooks';
import { getRequestDistributionChartModel } from '@/_helpers/dashboard/requestDistribution';
import { dashboardQueryKeys } from '@/_hooks/_modules/dashboard/queryKeys';
import { useSlaAccess } from '@/_hooks/_modules/sla/useSlaAccess';
import { requestDistributionParameterKey } from '@/components/dashboard-graphic/config';
import {
  createRequestDistributionFieldOptions,
  createRequestDistributionSavedFilterMap,
} from '@/components/dashboard-graphic/options';
import { getDashboardGraphicType } from '@/components/dashboard-graphic/savedGraphics';
import type { DashboardGraphicConfiguration } from '@/components/dashboard-graphic/types';
import { DEFAULT_REQUEST_FILTER_ID } from '@/components/request-filter/_config/defaultRequestFilter';
import { useResolvedDateFilters } from '@/components/request-filter/_hooks/useResolvedDateFilters';
import { useSavedFilterValues } from '@/components/request-filter/_hooks/useSavedFilterValues';
import { useSavedRequestFilterQuery } from '@/components/request-filter/_hooks/useSavedRequestFilterQuery';
import {
  combineSavedFilterValues,
  normalizeSavedFilterIds,
} from '@/components/request-filter/_utils/savedFilterSelection';
import { buildRequestListPageFilter } from '@/pages/requests/list/_utils/buildRequestListPageFilter';

const dashboard = getDashboard();

export const useGraphicData = (graphic: DashboardGraphicConfiguration | undefined) => {
  const { t } = useTranslation();
  const filterIds = useMemo(
    () => normalizeSavedFilterIds(graphic?.UserFormFilterIds ?? []),
    [graphic?.UserFormFilterIds]
  );
  const hasSavedFilters = filterIds[0] !== DEFAULT_REQUEST_FILTER_ID;
  const parameters = useParameterDetail(requestDistributionParameterKey, {
    enabled: Boolean(graphic),
  });
  const { query: filters } = useSavedRequestFilterQuery({
    enabled: Boolean(graphic && hasSavedFilters),
  });
  const { fieldOptionByValue } = useMemo(
    () => createRequestDistributionFieldOptions(parameters.data?.Data?.Items),
    [parameters.data?.Data?.Items]
  );
  // Data requests need a lookup, not sorted dropdown options or one request per filter.
  const filterById = useMemo(
    () => createRequestDistributionSavedFilterMap(filters.data?.Data),
    [filters.data?.Data]
  );
  const values = useSavedFilterValues(filterIds, filterById);
  const primaryFieldLabel = fieldOptionByValue.get(graphic?.PrimaryFieldValue ?? '')?.label ?? '';
  const secondaryFieldLabel =
    fieldOptionByValue.get(graphic?.SecondaryFieldValue ?? '')?.label ?? '';
  const primaryEmptyLabel =
    graphic?.PrimaryEmptyLabel ||
    t('label.home.requestDistributionUnspecifiedField', { field: primaryFieldLabel });
  const secondaryEmptyLabel =
    graphic?.SecondaryEmptyLabel ||
    (graphic?.SecondaryFieldValue
      ? t('label.home.requestDistributionUnspecifiedField', { field: secondaryFieldLabel })
      : t('label.home.requestCountAxis'));
  const chartType = getDashboardGraphicType(graphic?.GraphicType);
  const filterValue = useMemo(
    () => (values ? combineSavedFilterValues(values) : undefined),
    [values]
  );
  const isLoadingOptions =
    Boolean(graphic) && (parameters.isPending || (hasSavedFilters && filters.isPending));
  const hasOptionsError =
    parameters.isError ||
    Boolean(parameters.data?.Error) ||
    (hasSavedFilters && (filters.isError || Boolean(filters.data?.Error)));
  const hasInvalidConfiguration =
    Boolean(graphic) &&
    !isLoadingOptions &&
    !hasOptionsError &&
    (!chartType ||
      !primaryFieldLabel ||
      Boolean(graphic?.SecondaryFieldValue && !secondaryFieldLabel) ||
      graphic?.PrimaryFieldValue === graphic?.SecondaryFieldValue ||
      !filterValue);
  const canFetch =
    Boolean(graphic) && !isLoadingOptions && !hasOptionsError && !hasInvalidConfiguration;
  const primaryField = graphic?.PrimaryFieldValue;
  const secondaryField = graphic?.SecondaryFieldValue || null;
  const canViewSla = useSlaAccess();
  const resolvedFilters = useResolvedDateFilters(filterValue);
  // Presentation changes must not rebuild the request or its saved filter.
  const request = useMemo<DashboardGenericGraphicRequestDto | null>(() => {
    if (!canFetch || !resolvedFilters) {
      return null;
    }

    return {
      PrimaryFieldValue: primaryField,
      SecondaryFieldValue: secondaryField,
      PrimaryEmptyLabel: primaryEmptyLabel,
      SecondaryEmptyLabel: secondaryEmptyLabel,
      Filter: buildRequestListPageFilter(resolvedFilters, false, new Date(), canViewSla),
      All: true,
    };
  }, [
    canViewSla,
    canFetch,
    primaryField,
    secondaryField,
    primaryEmptyLabel,
    secondaryEmptyLabel,
    resolvedFilters,
  ]);
  // Consume the query signal so obsolete selections cancel their HTTP requests.
  const query = useQuery({
    queryKey: [dashboardQueryKeys.genericGraphics, request],
    queryFn: request
      ? ({ signal }) => dashboard.postApiDashboardGenericGraphics(request, { signal })
      : skipToken,
    // Reuse recent data when opening the modal or applying its preview to the dashboard.
    staleTime: 30_000,
  });
  const model = useMemo(
    () =>
      getRequestDistributionChartModel(query.data?.Data, primaryEmptyLabel, secondaryEmptyLabel),
    [query.data?.Data, primaryEmptyLabel, secondaryEmptyLabel]
  );

  const drilldown = useMemo(
    () => ({
      filterIds,
      // Preserve preset intent in navigation; resolve dates only for the service request.
      filters: filterValue,
      primaryField,
      secondaryField,
      primaryLabel: primaryFieldLabel,
      secondaryLabel: secondaryFieldLabel,
    }),
    [filterIds, filterValue, primaryField, secondaryField, primaryFieldLabel, secondaryFieldLabel]
  );

  return {
    drilldown,
    chartType,
    hasInvalidConfiguration,
    isError: Boolean(graphic) && (hasOptionsError || query.isError || Boolean(query.data?.Error)),
    isFetching: Boolean(graphic) && (isLoadingOptions || query.isFetching),
    model,
    primaryFieldLabel,
    secondaryFieldLabel,
  };
};
