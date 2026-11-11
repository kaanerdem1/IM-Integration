import { useEffect } from 'react';
import { useSavedFilterSelectionStore } from '../_store/useSavedFilterSelectionStore';
import { useSavedRequestFilters } from './useSavedRequestFilters';

/** Reconcile all placements once per catalog update, without blocking application access. */
export const useSyncSavedFilterSelections = () => {
  const { filters, userIdentity, isFetchedAfterMount, isError, isFetching } =
    useSavedRequestFilters('always');

  useEffect(() => {
    if (!isFetchedAfterMount || isError || isFetching) {
      return;
    }
    useSavedFilterSelectionStore.getState().reconcile(
      userIdentity,
      filters.map((filter) => filter.Id)
    );
  }, [userIdentity, filters, isFetchedAfterMount, isError, isFetching]);
};
