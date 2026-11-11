import type { DateQuickRangeKey } from '../fields/date-range/dateQuickRange';

const dateRangePrefixes = [
  'listCreated',
  'listCurrentAcceptanceTest',
  'listCurrentAlphaTest',
  'listCurrentAnalysisApproval',
  'listCurrentAnalysis',
  'listCurrentDevelopment',
  'listCurrentRelease',
  'listCurrentScope',
  'listEstimatedAcceptanceTest',
  'listEstimatedAlphaTest',
  'listEstimatedAnalysisApproval',
  'listEstimatedAnalysis',
  'listEstimatedDevelopment',
  'listEstimatedRelease',
  'listEstimatedScope',
  'listUpdated',
] as const;

type DateRangePrefix = (typeof dateRangePrefixes)[number];
export type RequestListDateFromKey = `${DateRangePrefix}From`;
export type RequestListDateToKey = `${DateRangePrefix}To`;
export type RequestListQuickRangeFilterKey = `${DateRangePrefix}QuickRange`;
export type RequestListQuickRangeFilters = Partial<
  Record<RequestListQuickRangeFilterKey, DateQuickRangeKey>
>;

export const requestDateRangeConfigs = dateRangePrefixes.map((prefix) => ({
  fromKey: `${prefix}From` as const,
  toKey: `${prefix}To` as const,
  quickRangeKey: `${prefix}QuickRange` as const,
}));

export const REQUEST_LIST_DATE_FILTER_KEYS = requestDateRangeConfigs.flatMap(
  ({ fromKey, toKey }) => [fromKey, toKey]
);
export const REQUEST_LIST_QUICK_RANGE_FILTER_KEYS = requestDateRangeConfigs.map(
  ({ quickRangeKey }) => quickRangeKey
);

export const getDateQuickRangeFilterKey = (
  fromKey: RequestListDateFromKey
): RequestListQuickRangeFilterKey =>
  `${fromKey.slice(0, -4)}QuickRange` as RequestListQuickRangeFilterKey;
