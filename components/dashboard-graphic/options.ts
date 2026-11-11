import type { UIEnumItemDto, UserFormFilterResponseDto } from '@/_api/_core/api-gen/types';
import type { SavedUserFormFilter } from '@/components/request-filter/_types';

export const createRequestDistributionFieldOptions = (
  items: UIEnumItemDto[] | null | undefined
) => {
  const options: Array<{ label: string; value: string }> = [];
  const optionByValue = new Map<string, { label: string; value: string }>();

  (items ?? []).forEach((item) => {
    const label = item.Label?.trim() ?? '';
    const value = item.Value?.trim() ?? '';

    if (!label || !value || optionByValue.has(value)) {
      return;
    }

    const option = { label, value };

    optionByValue.set(value, option);
    options.push(option);
  });

  return { fieldOptionByValue: optionByValue, fieldOptions: options };
};

export const createRequestDistributionSavedFilterMap = (
  savedFilters: UserFormFilterResponseDto[] | null | undefined
) => {
  const filterById = new Map<string, SavedUserFormFilter>();

  (savedFilters ?? []).forEach((savedFilter) => {
    const value = savedFilter.Id?.trim() ?? '';
    const label = savedFilter.Name?.trim() ?? '';

    if (!value || !label) {
      return;
    }

    filterById.set(value, { ...savedFilter, Id: value, Name: label });
  });

  return filterById;
};

export const createRequestDistributionSavedFilterOptions = (
  savedFilters: UserFormFilterResponseDto[] | null | undefined
) => {
  const filterById = createRequestDistributionSavedFilterMap(savedFilters);
  const options = [...filterById.values()].map(({ Id, Name }) => ({ value: Id, label: Name }));
  options.sort((left, right) => left.label.localeCompare(right.label));

  return { savedFilterById: filterById, savedFilterOptions: options };
};
