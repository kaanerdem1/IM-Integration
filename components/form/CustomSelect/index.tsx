import { useMemo } from 'react';
import { getOptionsLockup, getParsedComboboxData, Select } from '@mantine/core';
import type { SelectProps } from '@mantine/core';
import { useUncontrolled } from '@mantine/hooks';
import { useSelectedOptions } from '../_select-shared/useSelectedOptions';
import { useSelectSearch, type RemoteSelectSearchProps } from '../_select-shared/useSelectSearch';

export type CustomSelectProps = SelectProps & RemoteSelectSearchProps;

export const CustomSelect = ({
  data,
  defaultValue,
  defaultSearchValue,
  onBlur,
  onChange,
  onDropdownClose,
  onInput,
  onSearch,
  onSearchChange,
  searchValue,
  value,
  ...props
}: CustomSelectProps) => {
  const [selectedValue, setSelectedValue] = useUncontrolled({
    value,
    defaultValue,
    finalValue: null,
    onChange,
  });
  const options = useMemo(
    () =>
      new Map(
        Object.values(getOptionsLockup(getParsedComboboxData<string>(data))).map((option) => [
          option.value,
          option,
        ])
      ),
    [data]
  );
  const selectedValues = useMemo(
    () => (selectedValue == null ? [] : [selectedValue]),
    [selectedValue]
  );
  const { selectedOptions, retainSelectedOptions } = useSelectedOptions(selectedValues, options);
  const resolvedData = useMemo(
    () => [...(data ?? []), ...selectedOptions.filter((option) => !options.has(option.value))],
    [data, options, selectedOptions]
  );
  const initialLabel = selectedOptions[0]?.label;
  const search = useSelectSearch({
    defaultSearchValue: defaultSearchValue ?? initialLabel,
    onSearch,
    onSearchChange,
    searchValue,
  });

  return (
    <Select
      {...props}
      data={resolvedData}
      defaultValue={defaultValue}
      value={value}
      searchValue={search.searchValue}
      onSearchChange={search.setSearchValue}
      onInput={(event) => {
        onInput?.(event);
        search.searchTypedText(event.currentTarget.value);
      }}
      onChange={(value, option) => {
        retainSelectedOptions(value == null ? [] : [value]);
        setSelectedValue(value, option);
        search.resetSearch();
      }}
      onBlur={(event) => {
        onBlur?.(event);
        search.resetSearch();
      }}
      onDropdownClose={() => {
        onDropdownClose?.();
        search.resetSearch();
      }}
    />
  );
};
