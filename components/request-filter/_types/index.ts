import type { ComboboxData } from '@mantine/core';
import type {
  UserFormFilterCreateDto,
  UserFormFilterResponseDto,
} from '@/_api/_core/api-gen/types';
import type { RequestListFilterValue } from '@/pages/requests/list/_config';

export type SavedRequestFilter = {
  value: RequestListFilterValue;
};

export const requestFilterModes = {
  apply: 'apply',
  create: 'create',
  edit: 'edit',
} as const;

export type RequestFilterMode = (typeof requestFilterModes)[keyof typeof requestFilterModes];

type RequestFilterSharedOptions = {
  /** Talep no seçeneklerinin etiketleri; verilmezse yalnızca seçili değerler listelenir */
  requestNoOptions?: ComboboxData;
};

export type SavedUserFormFilter = UserFormFilterResponseDto & {
  Id: NonNullable<UserFormFilterResponseDto['Id']>;
  Name: NonNullable<UserFormFilterResponseDto['Name']>;
};

/** A menu entry can be a saved record or the application's built-in default. */
export type RequestFilterMenuOption = Pick<
  SavedUserFormFilter,
  'Id' | 'Name' | 'Description' | 'Filter'
>;

export const isSavedUserFormFilter = (
  item: UserFormFilterResponseDto
): item is SavedUserFormFilter =>
  typeof item.Id === 'string' &&
  item.Id.length > 0 &&
  typeof item.Name === 'string' &&
  item.Name.length > 0;

export type RequestFilterModalOptions = RequestFilterSharedOptions &
  (
    | {
        item?: SavedUserFormFilter;
        items?: SavedUserFormFilter[];
        mode: typeof requestFilterModes.apply;
        value: RequestListFilterValue;
        onApply: (value: RequestListFilterValue) => void;
        onReset: () => void;
        canReset?: boolean;
      }
    | {
        item?: never;
        mode: typeof requestFilterModes.create;
        initialName?: NonNullable<UserFormFilterCreateDto['Name']>;
        initialDescription?: UserFormFilterCreateDto['Description'];
        value?: RequestListFilterValue;
        onApply?: never;
        onReset?: never;
      }
    | {
        item: SavedUserFormFilter;
        mode: typeof requestFilterModes.edit;
        value: RequestListFilterValue;
        onApply?: never;
        onReset?: never;
      }
  );
