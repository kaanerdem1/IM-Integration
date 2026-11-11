import type { QueryClient } from '@tanstack/react-query';
import type {
  UserDashboardGraphicCreateDto,
  UserDashboardGraphicResponseDto,
} from '@/_api/_core/api-gen/types';
import type { UserDashboardGraphicListResponse } from '@/_api/hooks';
import { QueryKeys } from '@/_api/hooks/query-keys';
import { appChartLegendPositions, appChartTypeDefinitions } from '@/components/charts/chartTypes';
import { DEFAULT_REQUEST_FILTER_ID } from '@/components/request-filter/_config/defaultRequestFilter';
import { normalizeSavedFilterIds } from '@/components/request-filter/_utils/savedFilterSelection';
import { initialRequestDistributionFormValues } from './config';
import type {
  DashboardGraphicConfiguration,
  DashboardGraphicFormValues,
  SavedDashboardGraphic,
} from './types';

export const defaultDashboardGraphicConfiguration: DashboardGraphicConfiguration = {
  PrimaryFieldValue: initialRequestDistributionFormValues.primaryField,
  SecondaryFieldValue: null,
  GraphicType: initialRequestDistributionFormValues.chartType,
  LegendPosition: initialRequestDistributionFormValues.legendPosition,
};

export const getDashboardGraphicType = (value: UserDashboardGraphicResponseDto['GraphicType']) =>
  appChartTypeDefinitions.find((definition) => definition.value === value)?.value ?? null;

export const getDashboardGraphicLegendPosition = (
  value: UserDashboardGraphicResponseDto['LegendPosition']
) =>
  appChartLegendPositions.find((position) => position === value) ??
  initialRequestDistributionFormValues.legendPosition;

export const getDashboardGraphicFilterIds = (
  value: UserDashboardGraphicResponseDto['UserFormFilterIds']
) => normalizeSavedFilterIds(value ?? []).filter((id) => id !== DEFAULT_REQUEST_FILTER_ID);

export const getDashboardGraphicFormValues = (
  item: DashboardGraphicConfiguration = defaultDashboardGraphicConfiguration
): DashboardGraphicFormValues => ({
  PrimaryFieldValue: item.PrimaryFieldValue ?? null,
  SecondaryFieldValue: item.SecondaryFieldValue || null,
  GraphicType: getDashboardGraphicType(item.GraphicType),
  UserFormFilterIds: getDashboardGraphicFilterIds(item.UserFormFilterIds),
  LegendPosition: getDashboardGraphicLegendPosition(item.LegendPosition),
});

export const hasDashboardGraphicChanges = (
  current: DashboardGraphicConfiguration,
  saved: DashboardGraphicConfiguration
) =>
  current.PrimaryFieldValue !== saved.PrimaryFieldValue ||
  (current.SecondaryFieldValue || null) !== (saved.SecondaryFieldValue || null) ||
  current.GraphicType !== saved.GraphicType ||
  getDashboardGraphicLegendPosition(current.LegendPosition) !==
    getDashboardGraphicLegendPosition(saved.LegendPosition) ||
  JSON.stringify(getDashboardGraphicFilterIds(current.UserFormFilterIds)) !==
    JSON.stringify(getDashboardGraphicFilterIds(saved.UserFormFilterIds));

export const createDashboardGraphicOptions = (items?: UserDashboardGraphicResponseDto[] | null) => {
  const graphicById = new Map<string, SavedDashboardGraphic>();
  const graphicOptions: { label: string; value: string }[] = [];

  (items ?? []).forEach((item) => {
    if (!item.Id || graphicById.has(item.Id)) {
      return;
    }

    graphicById.set(item.Id, { ...item, Id: item.Id });
    graphicOptions.push({ label: item.Name?.trim() || item.Id, value: item.Id });
  });

  return {
    graphicById,
    graphicOptions,
    initialGraphicId: graphicOptions[0]?.value ?? null,
  };
};

export const createDashboardGraphicConfiguration = (
  values: DashboardGraphicFormValues,
  emptyLabels: Pick<UserDashboardGraphicCreateDto, 'PrimaryEmptyLabel' | 'SecondaryEmptyLabel'>
) =>
  ({
    PrimaryFieldValue: values.PrimaryFieldValue,
    SecondaryFieldValue: values.SecondaryFieldValue || null,
    GraphicType: values.GraphicType,
    // An explicit empty array clears saved associations; the built-in default is never an API ID.
    UserFormFilterIds: getDashboardGraphicFilterIds(values.UserFormFilterIds),
    LegendPosition: values.LegendPosition,
    ...emptyLabels,
  }) satisfies DashboardGraphicConfiguration;

export const cacheSavedDashboardGraphic = (
  queryClient: QueryClient,
  saved: UserDashboardGraphicResponseDto | undefined,
  deferPickerRefresh: boolean
) => {
  const listKey = [QueryKeys.UserDashboardGraphicList];
  const list = queryClient.getQueryState<UserDashboardGraphicListResponse>(listKey);
  const keepPickerData =
    deferPickerRefresh &&
    !!saved?.Id &&
    list?.status === 'success' &&
    list.fetchStatus === 'idle' &&
    !list.isInvalidated &&
    !list.data?.Error &&
    (list.data?.StatusCode ?? 0) < 400 &&
    Array.isArray(list.data?.Data);

  if (saved?.Id) {
    queryClient.setQueryData<UserDashboardGraphicListResponse>(listKey, (previous) => {
      const records = previous?.Data ?? [];
      const exists = records.some((record) => record.Id === saved.Id);
      return {
        ...previous,
        Data: exists
          ? records.map((record) => (record.Id === saved.Id ? { ...record, ...saved } : record))
          : [...records, saved],
      };
    });
  }
  if (keepPickerData) {
    // The picker already has the confirmed record. Keep it stale for the next open.
    void queryClient.invalidateQueries({ queryKey: listKey, exact: true, refetchType: 'none' });
    void queryClient.invalidateQueries({
      queryKey: listKey,
      predicate: (query) => query.queryKey.length > listKey.length,
    });
  } else {
    void queryClient.invalidateQueries({ queryKey: listKey });
  }
};
