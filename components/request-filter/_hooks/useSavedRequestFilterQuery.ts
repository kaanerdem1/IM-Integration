import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { SAVED_REQUEST_FILTER_QUERY_OPTIONS } from '@/_api-client/query-config';
import { getUserFormFilter } from '@/_api/_core/api-gen/user-form-filter';
import type { UserFormFilterDetailResponse } from '@/_api/hooks';
import { QueryKeys } from '@/_api/hooks/query-keys';
import { getAuthUserIdentity } from '@/_auth/login-recovery';
import { useSession } from '@/_hooks/_modules/auth/useSession';
import { REQUEST_LIST_FILTER_SCREEN } from '@/pages/requests/list/_utils/savedRequestListFilter';

type Options<TData> = Pick<
  UseQueryOptions<UserFormFilterDetailResponse, Error, TData>,
  'enabled' | 'refetchOnMount' | 'select'
>;

export const getSavedRequestFilterQueryKey = (userIdentity: string) =>
  [QueryKeys.UserFormFilterDetail, REQUEST_LIST_FILTER_SCREEN, userIdentity] as const;

/** All request-filter consumers share the catalog, but never another account's cached list. */
export const useSavedRequestFilterQuery = <TData = UserFormFilterDetailResponse>(
  options: Options<TData> = {}
) => {
  const { me } = useSession();
  const userIdentity = getAuthUserIdentity(me);
  const query = useQuery<UserFormFilterDetailResponse, Error, TData>({
    ...SAVED_REQUEST_FILTER_QUERY_OPTIONS,
    ...options,
    queryKey: getSavedRequestFilterQueryKey(userIdentity),
    queryFn: ({ signal }) =>
      getUserFormFilter().getApiUserFormFilterScreen(REQUEST_LIST_FILTER_SCREEN, { signal }),
    enabled: Boolean(userIdentity) && options.enabled !== false,
  });
  return { query, userIdentity };
};
