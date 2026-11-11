import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { UserFormFilterCreateDto, UserFormFilterUpdateDto } from '@/_api/_core/api-gen/types';
import { QueryKeys, useUserFormFilterCreate, useUserFormFilterUpdate } from '@/_api/hooks';
import type { UserFormFilterDetailResponse } from '@/_api/hooks';
import { getAuthUserIdentity } from '@/_auth/login-recovery';
import { useSession } from '@/_hooks/_modules/auth/useSession';
import { useMessage } from '@/_hooks/useMessage';
import type { SavedUserFormFilter } from '@/components/request-filter/_types';
import type { RequestListFilterValue } from '@/pages/requests/list/_config';
import {
  REQUEST_LIST_FILTER_SCREEN,
  serializeSavedRequestListFilter,
} from '@/pages/requests/list/_utils/savedRequestListFilter';
import { getSavedRequestFilterQueryKey } from './useSavedRequestFilterQuery';

type PersistSavedRequestFilterInput = {
  item?: SavedUserFormFilter;
  name: string;
  description: NonNullable<UserFormFilterCreateDto['Description']>;
  value: RequestListFilterValue;
};

export const useSavedRequestFilterPersistence = () => {
  const { t } = useTranslation();
  const { message } = useMessage();
  const queryClient = useQueryClient();
  const { me } = useSession();
  const userIdentity = getAuthUserIdentity(me);
  const { mutateAsync: create, isPending: isCreating } = useUserFormFilterCreate({
    invalidate: [QueryKeys.UserFormFilterDetail],
  });
  const { mutateAsync: update, isPending: isUpdating } = useUserFormFilterUpdate();

  const persist = useCallback(
    async ({ item, name, description, value }: PersistSavedRequestFilterInput) => {
      const payload = {
        Filter: serializeSavedRequestListFilter(value),
        Name: name,
        Description: description,
        Screen: item?.Screen || REQUEST_LIST_FILTER_SCREEN,
      } satisfies UserFormFilterCreateDto;
      // The API client reports request failures; this handler only controls the save flow.
      const response = await (
        item
          ? update({ ...payload, Id: item.Id } satisfies UserFormFilterUpdateDto)
          : create(payload)
      ).catch(() => undefined);

      if (response?.Error || !response?.Data) {
        return false;
      }

      if (item) {
        const queryKey = getSavedRequestFilterQueryKey(userIdentity);
        // Publish confirmed changes once; all selections resolve the same account-scoped catalog.
        await queryClient.cancelQueries({ queryKey, exact: true });
        queryClient.setQueryData<UserFormFilterDetailResponse>(queryKey, (current) =>
          current
            ? {
                ...current,
                Data: current.Data?.map((record) =>
                  record.Id === item.Id ? { ...record, ...payload } : record
                ),
              }
            : current
        );
        void queryClient.invalidateQueries({ queryKey, exact: true });
      }

      message(
        t(
          item
            ? 'label.requests.list.filters.savedFilterUpdated'
            : 'label.requests.list.filters.savedFilterSuccess'
        ),
        'success'
      );
      return true;
    },
    [create, message, t, update, queryClient, userIdentity]
  );

  return {
    isPending: isCreating || isUpdating,
    persist,
  };
};
