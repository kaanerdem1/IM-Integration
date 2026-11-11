import { useCallback, useMemo } from 'react';
import { useSlaAccess } from '@/_hooks/_modules/sla/useSlaAccess';
import { buildRequestListPageFilter } from '@/pages/requests/list/_utils/buildRequestListPageFilter';
import { DEFAULT_REQUEST_FILTER_ID } from '../_config/defaultRequestFilter';
import type { SavedFilterScope } from '../_config/savedFilterScopes';
import { useSavedFilterSelectionStore } from '../_store/useSavedFilterSelectionStore';
import type { RequestFilterMenuOption } from '../_types';
import {
  combineSavedFilterValues,
  defaultSavedFilterIds,
  normalizeSavedFilterIds,
  toggleSavedFilterId,
} from '../_utils/savedFilterSelection';
import { useResolvedDateFilters } from './useResolvedDateFilters';
import { useSavedFilterValues } from './useSavedFilterValues';
import { useSavedRequestFilters } from './useSavedRequestFilters';

/** Selection is derived, so arrival/removal of a filter never requires a synchronizing effect. */
export type SavedFilterSelectionControl = {
  filterIds: readonly string[];
  onChange: (filterIds: string[]) => void;
};

export const useSavedFilterSelection = (
  scope: SavedFilterScope,
  control?: SavedFilterSelectionControl
) => {
  const { filters, isPending, isFetching, isError, userIdentity } = useSavedRequestFilters();
  const selection = useSavedFilterSelectionStore((state) =>
    control ? undefined : state.selectionsByUser[userIdentity]?.[scope]
  );
  const toggle = useSavedFilterSelectionStore((state) => state.toggle);
  const controlledIds = control?.filterIds;
  const ids = useMemo(
    () =>
      controlledIds
        ? normalizeSavedFilterIds(controlledIds)
        : (selection?.filterIds ?? defaultSavedFilterIds),
    [controlledIds, selection?.filterIds]
  );
  const filterById = useMemo(
    () => new Map(filters.map((filter) => [filter.Id, filter])),
    [filters]
  );
  const missingSelection = ids.some(
    (id) => id !== DEFAULT_REQUEST_FILTER_ID && !filterById.has(id)
  );
  // Do not send a temporary default request while restoring a saved selection.
  const awaitingSelection = Boolean(missingSelection && (isPending || isFetching || isError));
  const effectiveIds = useMemo(
    () =>
      missingSelection && !awaitingSelection
        ? normalizeSavedFilterIds(
            ids.filter((id) => id === DEFAULT_REQUEST_FILTER_ID || filterById.has(id))
          )
        : ids,
    [ids, missingSelection, awaitingSelection, filterById]
  );
  const values = useSavedFilterValues(awaitingSelection ? null : effectiveIds, filterById);
  const savedFilter = useMemo(
    () => (values ? { value: combineSavedFilterValues(values) } : null),
    [values]
  );
  const canViewSla = useSlaAccess();
  const resolvedFilters = useResolvedDateFilters(savedFilter?.value);
  const pageFilter = useMemo(
    () =>
      userIdentity && resolvedFilters
        ? (buildRequestListPageFilter(resolvedFilters, false, new Date(), canViewSla) ?? {})
        : undefined,
    [userIdentity, resolvedFilters, canViewSla]
  );
  const onChange = useCallback(
    (filter: RequestFilterMenuOption) => {
      if (control) {
        control.onChange(toggleSavedFilterId(effectiveIds, filter.Id));
      } else {
        toggle(userIdentity, scope, filter.Id);
      }
    },
    [control, effectiveIds, userIdentity, scope, toggle]
  );

  return {
    pageFilter,
    savedFilter,
    hasExplicitSelection: Boolean(control) || selection?.explicit === true,
    isPending: awaitingSelection && (isPending || isFetching),
    isError: awaitingSelection && isError && !isFetching,
    menuProps: {
      selectedFilterIds: effectiveIds,
      onChange,
    },
  };
};
