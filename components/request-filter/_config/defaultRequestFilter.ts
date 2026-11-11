import type { RequestListFilterValue } from '@/pages/requests/list/_config';

/** Local selection only: never sent to the saved-filter service as a record ID. */
export const DEFAULT_REQUEST_FILTER_ID = 'system:all-requests-last-year';
export const DEFAULT_REQUEST_FILTER_LABEL = 'label.requests.list.filters.defaultFilter';
export const DEFAULT_REQUEST_FILTER_DESCRIPTION =
  'label.requests.list.filters.defaultFilterDescription';

/** URL-only intent: distinguish an explicitly removed date from an omitted default. */
export const CLEARED_CREATED_DATE_QUICK_RANGE = 'none';

export const getDefaultRequestFilterValue = (): RequestListFilterValue => ({
  listCreatedQuickRange: 'last-year',
});
