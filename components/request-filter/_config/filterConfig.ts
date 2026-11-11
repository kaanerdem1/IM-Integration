import { DRAFT_WORKFLOW_STEP_ID } from '@/_common/workflow';
import {
  hasRequestListFilterValue,
  isRequestListApiFilterKey,
  REQUEST_LIST_COLUMNS,
} from '@/pages/requests/list/_config';
import type {
  RequestListColumnKey,
  RequestListFilterValue,
  RequestListNumberFilterKey,
} from '@/pages/requests/list/_config';
import {
  getRequestBreakdownFormState,
  removeRequestBreakdownField,
} from '../_utils/breakdownFilters';
import {
  getDateQuickRangeFilterKey,
  type RequestListDateFromKey,
  type RequestListDateToKey,
  type RequestListQuickRangeFilterKey,
} from './dateRangeFilters';
import { getRequestFilterScope, RequestFilterScope } from './requestFilterScope';

export type DateRangeFilterConfig = {
  fromKey: RequestListDateFromKey;
  toKey: RequestListDateToKey;
};

export type NumberRangeFilterConfig = {
  fromKey: RequestListNumberFilterKey;
  toKey: RequestListNumberFilterKey;
};

type RequestListFilterConfig = {
  columnKey?: RequestListColumnKey;
  key: keyof RequestListFilterValue;
  labelKey: string;
  dateRange?: DateRangeFilterConfig;
  numberRange?: NumberRangeFilterConfig;
  scopes: readonly RequestFilterScope[];
};

type RequestListColumnLabelKey = (typeof REQUEST_LIST_COLUMNS)[number]['labelKey'];

export const requestListFilterConfigs = [
  {
    scopes: [RequestFilterScope.Common],
    key: 'listNo',
    labelKey: 'label.requests.list.filters.requestNo',
  },
  {
    scopes: [RequestFilterScope.SoftwareDevelopment, RequestFilterScope.Operational],
    key: 'listStep',
    columnKey: 'workflowStep',
    labelKey: 'label.requests.list.filters.step',
  },
  {
    key: 'listWorkflowStatus',
    scopes: [RequestFilterScope.Common],
    columnKey: 'workflowStatus',
    labelKey: 'label.requests.list.filters.workflowStatus',
  },
  {
    key: 'listSlaStatus',
    scopes: [RequestFilterScope.Common],
    columnKey: 'slaStatus',
    labelKey: 'label.requests.list.column.slaStatus',
  },
  {
    key: 'listSoftwareDirector',
    scopes: [RequestFilterScope.Common],
    columnKey: 'softwareDirector',
    labelKey: 'label.requests.list.filters.softwareDirector',
  },
  {
    key: 'listSoftwareUnit',
    scopes: [RequestFilterScope.Common],
    columnKey: 'softwareUnit',
    labelKey: 'label.requests.list.filters.softwareUnit',
  },
  {
    key: 'listProjectLeaderUnit',
    scopes: [RequestFilterScope.Common],
    columnKey: 'projectLeaderBusinessUnit',
    labelKey: 'label.requests.list.filters.projectLeaderUnit',
  },
  {
    key: 'listPortfolio',
    scopes: [RequestFilterScope.Common],
    columnKey: 'portfolio',
    labelKey: 'label.requests.list.filters.portfolio',
  },
  {
    key: 'listProjectSponsor',
    scopes: [RequestFilterScope.Common],
    columnKey: 'projectSponsor',
    labelKey: 'label.requests.list.filters.projectSponsor',
  },
  {
    key: 'listPortfolioManager',
    scopes: [RequestFilterScope.Common],
    columnKey: 'portfolioManager',
    labelKey: 'label.requests.list.filters.portfolioManager',
  },
  {
    scopes: [RequestFilterScope.Common],
    key: 'listUnit',
    labelKey: 'label.requests.list.filters.includedUnit',
  },
  {
    key: 'listRequestType',
    scopes: [RequestFilterScope.Common],
    columnKey: 'requestType',
    labelKey: 'label.requests.list.filters.requestType',
  },
  {
    key: 'listRequestSize',
    scopes: [RequestFilterScope.Common],
    columnKey: 'requestSize',
    labelKey: 'label.requests.list.filters.requestSize',
  },
  {
    key: 'listCreatedBy',
    scopes: [RequestFilterScope.Common],
    columnKey: 'createdBy',
    labelKey: 'label.requests.list.filters.createdBy',
  },
  {
    key: 'listCreatedFrom',
    scopes: [RequestFilterScope.Common],
    columnKey: 'createdAt',
    labelKey: 'label.requests.list.filters.createdAt',
    dateRange: {
      fromKey: 'listCreatedFrom',
      toKey: 'listCreatedTo',
    },
  },
  {
    key: 'listUpdatedFrom',
    scopes: [RequestFilterScope.Common],
    columnKey: 'updatedAt',
    labelKey: 'label.requests.list.filters.updatedAt',
    dateRange: {
      fromKey: 'listUpdatedFrom',
      toKey: 'listUpdatedTo',
    },
  },
  {
    key: 'listUpdatedBy',
    scopes: [RequestFilterScope.Common],
    columnKey: 'updatedBy',
    labelKey: 'label.requests.list.filters.updatedBy',
  },
  {
    key: 'listEstimatedProjectEffortFrom',
    scopes: [RequestFilterScope.SoftwareDevelopment],
    columnKey: 'estimatedProjectEffort',
    labelKey: 'label.requests.list.filters.estimatedProjectEffort',
    numberRange: {
      fromKey: 'listEstimatedProjectEffortFrom',
      toKey: 'listEstimatedProjectEffortTo',
    },
  },
  {
    key: 'listCurrentProjectEffortFrom',
    scopes: [RequestFilterScope.SoftwareDevelopment],
    columnKey: 'definiteProjectEffort',
    labelKey: 'label.requests.list.filters.currentProjectEffort',
    numberRange: {
      fromKey: 'listCurrentProjectEffortFrom',
      toKey: 'listCurrentProjectEffortTo',
    },
  },
  {
    key: 'listEstimatedScopeFrom',
    scopes: [RequestFilterScope.SoftwareDevelopment],
    columnKey: 'estimatedScopeDate',
    labelKey: 'label.requests.list.filters.estimatedScope',
    dateRange: {
      fromKey: 'listEstimatedScopeFrom',
      toKey: 'listEstimatedScopeTo',
    },
  },
  {
    key: 'listEstimatedAnalysisFrom',
    scopes: [RequestFilterScope.SoftwareDevelopment],
    columnKey: 'estimatedAnalysisDate',
    labelKey: 'label.requests.list.filters.estimatedAnalysis',
    dateRange: {
      fromKey: 'listEstimatedAnalysisFrom',
      toKey: 'listEstimatedAnalysisTo',
    },
  },
  {
    key: 'listEstimatedAnalysisApprovalFrom',
    scopes: [RequestFilterScope.SoftwareDevelopment],
    columnKey: 'estimatedAnalysisApprovalDate',
    labelKey: 'label.requests.list.filters.estimatedAnalysisApproval',
    dateRange: {
      fromKey: 'listEstimatedAnalysisApprovalFrom',
      toKey: 'listEstimatedAnalysisApprovalTo',
    },
  },
  {
    key: 'listEstimatedDevelopmentFrom',
    scopes: [RequestFilterScope.SoftwareDevelopment],
    columnKey: 'estimatedDevelopmentDate',
    labelKey: 'label.requests.list.filters.estimatedDevelopment',
    dateRange: {
      fromKey: 'listEstimatedDevelopmentFrom',
      toKey: 'listEstimatedDevelopmentTo',
    },
  },
  {
    key: 'listEstimatedAlphaTestFrom',
    scopes: [RequestFilterScope.SoftwareDevelopment],
    columnKey: 'estimatedAlphaTestDate',
    labelKey: 'label.requests.list.filters.estimatedAlphaTest',
    dateRange: {
      fromKey: 'listEstimatedAlphaTestFrom',
      toKey: 'listEstimatedAlphaTestTo',
    },
  },
  {
    key: 'listEstimatedAcceptanceTestFrom',
    scopes: [RequestFilterScope.SoftwareDevelopment],
    columnKey: 'estimatedAcceptanceTestDate',
    labelKey: 'label.requests.list.filters.estimatedAcceptanceTest',
    dateRange: {
      fromKey: 'listEstimatedAcceptanceTestFrom',
      toKey: 'listEstimatedAcceptanceTestTo',
    },
  },
  {
    key: 'listEstimatedReleaseFrom',
    scopes: [RequestFilterScope.SoftwareDevelopment],
    columnKey: 'estimatedReleaseDate',
    labelKey: 'label.requests.list.filters.estimatedRelease',
    dateRange: {
      fromKey: 'listEstimatedReleaseFrom',
      toKey: 'listEstimatedReleaseTo',
    },
  },
  {
    key: 'listCurrentScopeFrom',
    scopes: [RequestFilterScope.SoftwareDevelopment],
    columnKey: 'definiteScopeDate',
    labelKey: 'label.requests.list.filters.currentScope',
    dateRange: {
      fromKey: 'listCurrentScopeFrom',
      toKey: 'listCurrentScopeTo',
    },
  },
  {
    key: 'listCurrentAnalysisFrom',
    scopes: [RequestFilterScope.SoftwareDevelopment],
    columnKey: 'definiteAnalysisDate',
    labelKey: 'label.requests.list.filters.currentAnalysis',
    dateRange: {
      fromKey: 'listCurrentAnalysisFrom',
      toKey: 'listCurrentAnalysisTo',
    },
  },
  {
    key: 'listCurrentAnalysisApprovalFrom',
    scopes: [RequestFilterScope.SoftwareDevelopment],
    columnKey: 'definiteAnalysisApprovalDate',
    labelKey: 'label.requests.list.filters.currentAnalysisApproval',
    dateRange: {
      fromKey: 'listCurrentAnalysisApprovalFrom',
      toKey: 'listCurrentAnalysisApprovalTo',
    },
  },
  {
    key: 'listCurrentDevelopmentFrom',
    scopes: [RequestFilterScope.SoftwareDevelopment],
    columnKey: 'definiteDevelopmentDate',
    labelKey: 'label.requests.list.filters.currentDevelopment',
    dateRange: {
      fromKey: 'listCurrentDevelopmentFrom',
      toKey: 'listCurrentDevelopmentTo',
    },
  },
  {
    key: 'listCurrentAlphaTestFrom',
    scopes: [RequestFilterScope.SoftwareDevelopment],
    columnKey: 'definiteAlphaTestDate',
    labelKey: 'label.requests.list.filters.currentAlphaTest',
    dateRange: {
      fromKey: 'listCurrentAlphaTestFrom',
      toKey: 'listCurrentAlphaTestTo',
    },
  },
  {
    key: 'listCurrentAcceptanceTestFrom',
    scopes: [RequestFilterScope.SoftwareDevelopment],
    columnKey: 'definiteAcceptanceTestDate',
    labelKey: 'label.requests.list.filters.currentAcceptanceTest',
    dateRange: {
      fromKey: 'listCurrentAcceptanceTestFrom',
      toKey: 'listCurrentAcceptanceTestTo',
    },
  },
  {
    key: 'listCurrentReleaseFrom',
    scopes: [RequestFilterScope.SoftwareDevelopment],
    columnKey: 'definiteReleaseDate',
    labelKey: 'label.requests.list.filters.currentRelease',
    dateRange: {
      fromKey: 'listCurrentReleaseFrom',
      toKey: 'listCurrentReleaseTo',
    },
  },
  {
    key: 'listAssignedUser',
    scopes: [RequestFilterScope.Common],
    columnKey: 'assignedUser',
    labelKey: 'label.requests.list.filters.assignedUser',
  },
  {
    key: 'listRequestPool',
    scopes: [RequestFilterScope.Common],
    columnKey: 'requestPool',
    labelKey: 'label.requests.list.filters.requestPool',
  },
  {
    key: 'listApplication',
    scopes: [RequestFilterScope.Common],
    columnKey: 'application',
    labelKey: 'label.requests.list.filters.application',
  },
] as const satisfies readonly RequestListFilterConfig[];

export type RequestListFilterKey = (typeof requestListFilterConfigs)[number]['key'];

export const requestListFilterScopesByKey = new Map<
  RequestListFilterKey,
  readonly RequestFilterScope[]
>(requestListFilterConfigs.map(({ key, scopes }) => [key, scopes]));

export const isRequestListFilterInScope = (
  key: RequestListFilterKey,
  scope: RequestFilterScope
) => {
  const fieldScopes = requestListFilterScopesByKey.get(key);
  return fieldScopes?.includes(RequestFilterScope.Common) || fieldScopes?.includes(scope) || false;
};

/** Project the modal draft at submit time; hidden scope values never leave the modal. */
export const getScopedRequestListFilterValue = (
  value: RequestListFilterValue
): RequestListFilterValue => {
  const scope = getRequestFilterScope(value.listIssueType);
  let result = { ...value };
  if (scope === RequestFilterScope.Common) {
    delete result.listIssueType;
  }
  for (const config of requestListFilterConfigs) {
    if (isRequestListFilterInScope(config.key, scope)) {
      continue;
    }
    delete result[config.key];
    if ('dateRange' in config) {
      delete result[config.dateRange.toKey];
      delete result[getDateQuickRangeFilterKey(config.dateRange.fromKey)];
    } else if ('numberRange' in config) {
      delete result[config.numberRange.toKey];
    } else {
      result = removeRequestBreakdownField(result, config.key);
    }
  }
  // A shared draft shortcut remains editable without exposing type-specific steps in Common.
  if (
    scope === RequestFilterScope.Common &&
    value.listStep?.includes(String(DRAFT_WORKFLOW_STEP_ID))
  ) {
    result.listStep = [String(DRAFT_WORKFLOW_STEP_ID)];
  }
  return result;
};

type RequestListFilterLabelKey =
  RequestListColumnLabelKey | (typeof requestListFilterConfigs)[number]['labelKey'];

const requestListColumnLabelKeyByKey = new Map<RequestListColumnKey, RequestListColumnLabelKey>(
  REQUEST_LIST_COLUMNS.map((column) => [column.key, column.labelKey] as const)
);

export const getRequestListFilterLabelKey = (
  config: (typeof requestListFilterConfigs)[number]
): RequestListFilterLabelKey => {
  const columnKey = 'columnKey' in config ? config.columnKey : undefined;

  return (columnKey && requestListColumnLabelKeyByKey.get(columnKey)) ?? config.labelKey;
};

export const requestListFilterKeys = requestListFilterConfigs.map((config) => config.key);

export const requestListFilterKeySet = new Set<string>(requestListFilterKeys);

export const isRequestListFilterKey = (key: string): key is RequestListFilterKey =>
  requestListFilterKeySet.has(key);

export const dateRangeFilterConfigMap = new Map<
  RequestListFilterKey,
  DateRangeFilterConfig & { quickRangeKey: RequestListQuickRangeFilterKey }
>(
  requestListFilterConfigs
    .filter(
      (
        config
      ): config is (typeof requestListFilterConfigs)[number] & {
        dateRange: DateRangeFilterConfig;
      } => 'dateRange' in config
    )
    .map((config) => [
      config.key,
      { ...config.dateRange, quickRangeKey: getDateQuickRangeFilterKey(config.dateRange.fromKey) },
    ])
);

export const numberRangeFilterConfigMap = new Map<RequestListFilterKey, NumberRangeFilterConfig>(
  requestListFilterConfigs
    .filter(
      (
        config
      ): config is (typeof requestListFilterConfigs)[number] & {
        numberRange: NumberRangeFilterConfig;
      } => 'numberRange' in config
    )
    .map((config) => [config.key, config.numberRange])
);

export const getActiveRequestListFilterKeys = (
  value: RequestListFilterValue
): RequestListFilterKey[] => {
  const activeKeys = requestListFilterKeys.filter((key) => {
    if (!isRequestListApiFilterKey(key)) {
      return false;
    }

    const rangeConfig = dateRangeFilterConfigMap.get(key) ?? numberRangeFilterConfigMap.get(key);
    if (rangeConfig) {
      return Boolean(
        value[rangeConfig.fromKey] ||
        value[rangeConfig.toKey] ||
        ('quickRangeKey' in rangeConfig && value[rangeConfig.quickRangeKey])
      );
    }

    if (key === 'listNo') {
      return hasRequestListFilterValue(value, key) || Boolean(value.listIssueId?.length);
    }

    return hasRequestListFilterValue(value, key);
  });
  const scopedValue = getRequestBreakdownFormState(value.listBreakdowns).values;
  const activeKeySet = new Set(activeKeys);
  return [
    ...activeKeys,
    ...requestListFilterKeys.filter(
      (key) => !activeKeySet.has(key) && hasRequestListFilterValue(scopedValue, key)
    ),
  ];
};
