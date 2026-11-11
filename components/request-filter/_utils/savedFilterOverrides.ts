import { isRecord } from '@/_helpers/object';
import type { RequestListFilterValue } from '@/pages/requests/list/_config';
import { createRequestListSearch } from '@/pages/requests/list/_config';
import {
  parseSavedRequestListFilter,
  serializeSavedRequestListFilter,
} from '@/pages/requests/list/_utils/savedRequestListFilter';

type SavedFilterOverride = { source: string; value: RequestListFilterValue };
export type SavedFilterOverrides = Record<string, SavedFilterOverride>;

/** Canonical URL fields exclude metadata and keep equivalent criteria stable across saves. */
export const getSavedFilterCriteriaKey = (value: RequestListFilterValue) =>
  createRequestListSearch(value);

export const parseSavedFilterOverrides = (raw?: string): SavedFilterOverrides | null => {
  if (raw === undefined) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return null;
    }
    const entries: Array<[string, SavedFilterOverride]> = [];
    for (const [id, entry] of Object.entries(parsed)) {
      if (
        !id ||
        !isRecord(entry) ||
        typeof entry.source !== 'string' ||
        typeof entry.value !== 'string'
      ) {
        return null;
      }
      const filter = parseSavedRequestListFilter(entry.value);
      if (!filter) {
        return null;
      }
      entries.push([id, { source: entry.source, value: filter.value }]);
    }
    return Object.fromEntries(entries);
  } catch {
    return null;
  }
};

export const serializeSavedFilterOverrides = (
  ids: readonly string[],
  savedValues: readonly RequestListFilterValue[],
  appliedValues: readonly RequestListFilterValue[]
): string | undefined => {
  const entries = ids.flatMap((id, index) => {
    const source = getSavedFilterCriteriaKey(savedValues[index]);
    const value = appliedValues[index];
    return source === getSavedFilterCriteriaKey(value)
      ? []
      : [[id, { source, value: serializeSavedRequestListFilter(value) }] as const];
  });
  return entries.length ? JSON.stringify(Object.fromEntries(entries)) : undefined;
};

export const resolveSavedFilterOverrides = (
  ids: readonly string[],
  values: RequestListFilterValue[],
  overrides: SavedFilterOverrides
) => {
  if (!Object.keys(overrides).length) {
    return values;
  }
  return values.map((value, index) => {
    const override = Object.hasOwn(overrides, ids[index]) ? overrides[ids[index]] : undefined;
    // A newer saved record wins over a temporary override based on an older revision.
    return override && override.source === getSavedFilterCriteriaKey(value)
      ? override.value
      : value;
  });
};
