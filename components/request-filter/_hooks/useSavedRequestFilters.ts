import { useMemo } from 'react';
import { isSavedUserFormFilter } from '../_types';
import { useSavedRequestFilterQuery } from './useSavedRequestFilterQuery';

export const useSavedRequestFilters = (refetchOnMount?: 'always') => {
  const { query, userIdentity } = useSavedRequestFilterQuery({
    ...(refetchOnMount ? { refetchOnMount } : {}),
  });
  const filters = useMemo(
    () =>
      (query.data?.Data ?? [])
        .filter(isSavedUserFormFilter)
        .sort((left, right) => left.Name.localeCompare(right.Name)),
    [query.data?.Data]
  );

  return {
    filters,
    userIdentity,
    isError: query.isError || Boolean(query.data?.Error),
    isFetching: query.isFetching,
    isFetchedAfterMount: query.isFetchedAfterMount,
    isPending: query.isPending,
  };
};
