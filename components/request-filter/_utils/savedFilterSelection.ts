import type { RequestListFilterValue } from '@/pages/requests/list/_config';
import { DEFAULT_REQUEST_FILTER_ID } from '../_config/defaultRequestFilter';

export const defaultSavedFilterIds: readonly string[] = [DEFAULT_REQUEST_FILTER_ID];

export const normalizeSavedFilterIds = (ids: readonly string[]): string[] => {
  // Canonical order makes the same selection share its URL and query cache regardless of click order.
  const savedIds = [...new Set(ids.filter((id) => id && id !== DEFAULT_REQUEST_FILTER_ID))].sort();
  return savedIds.length ? savedIds : [...defaultSavedFilterIds];
};

export const toggleSavedFilterId = (ids: readonly string[], id: string) => {
  if (id === DEFAULT_REQUEST_FILTER_ID) {
    return [...defaultSavedFilterIds];
  }
  return normalizeSavedFilterIds(
    ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]
  );
};

/** null means malformed, never an unrestricted list. */
export const parseSavedFilterIds = (value: string): string[] | null => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === 'string' && id.length > 0)) {
      return null;
    }
    return normalizeSavedFilterIds(parsed);
  } catch {
    return null;
  }
};

export const combineSavedFilterValues = (
  values: RequestListFilterValue[]
): RequestListFilterValue => (values.length === 1 ? values[0] : { listFilterGroups: values });
