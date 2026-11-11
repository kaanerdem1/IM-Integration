import type { ParseKeysWithoutVariables } from 'i18next';

export type ListSortOption = {
  labelKey: ParseKeysWithoutVariables;
  value: string;
};

export const LIST_DEFAULT_SORT = 'created-desc';

export const LIST_SORT_OPTIONS = [
  { labelKey: 'label.requests.list.sort.createdDesc', value: LIST_DEFAULT_SORT },
  { labelKey: 'label.requests.list.sort.createdAsc', value: 'created-asc' },
  { labelKey: 'label.requests.list.sort.updatedDesc', value: 'updated-desc' },
  { labelKey: 'label.requests.list.sort.updatedAsc', value: 'updated-asc' },
] as const satisfies readonly ListSortOption[];
