import { useMemo } from 'react';
import { parseSavedRequestListFilter } from '@/pages/requests/list/_utils/savedRequestListFilter';
import { DEFAULT_REQUEST_FILTER_ID } from '../_config/defaultRequestFilter';
import type { SavedUserFormFilter } from '../_types';
import { useDefaultRequestFilter } from './useDefaultRequestFilter';

/** Only selected criteria invalidate parsing; renames and unrelated catalog edits do not. */
export const useSavedFilterValues = (
  ids: readonly string[] | null | undefined,
  filtersById: ReadonlyMap<string, SavedUserFormFilter>
) => {
  const defaultValue = useDefaultRequestFilter();
  const content = useMemo(
    () =>
      ids
        ? JSON.stringify(
            ids.map((id) =>
              id === DEFAULT_REQUEST_FILTER_ID
                ? JSON.stringify(defaultValue)
                : (filtersById.get(id)?.Filter ?? null)
            )
          )
        : null,
    [ids, filtersById, defaultValue]
  );
  return useMemo(() => {
    if (!content) {
      return null;
    }
    const contents: (string | null)[] = JSON.parse(content);
    const parsed = contents.map((value) => parseSavedRequestListFilter(value));
    return parsed.every((filter) => filter !== null) ? parsed.map((filter) => filter.value) : null;
  }, [content]);
};
