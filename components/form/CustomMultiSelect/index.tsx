import { ReactNode, useCallback, useMemo } from 'react';
import classes from './style.module.scss';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  CheckIcon,
  ComboboxData,
  ComboboxItem,
  ComboboxParsedItem,
  getParsedComboboxData,
  Group,
  MultiSelect,
  MultiSelectProps,
  OptionsFilter,
  Stack,
} from '@mantine/core';
import { useUncontrolled } from '@mantine/hooks';
import { createLocaleOptionsFilter } from '@/_helpers/mantine/optionsFilter';
import { useSelectedOptions } from '../_select-shared/useSelectedOptions';
import { useSelectSearch, type RemoteSelectSearchProps } from '../_select-shared/useSelectSearch';

const selectAllActionValue = '__custom_multi_select_select_all__';
const EMPTY_SELECT_ALL_EXCLUDED_VALUES: readonly string[] = [];

export type CustomMultiSelectProps = MultiSelectProps &
  RemoteSelectSearchProps & {
    clearAllLabel?: string;
    /** Normalizes a selection before both the uncontrolled state and onChange are updated. */
    normalizeValue?: (nextValue: string[], previousValue: string[]) => string[];
    selectAllExcludedValues?: readonly string[];
    selectAllLabel?: string;
    withSelectionActions?: boolean;
  };

const isActionValue = (value: string) => value === selectAllActionValue;

const isParsedItemGroup = (
  item: ComboboxParsedItem<string>
): item is Extract<ComboboxParsedItem<string>, { items: ComboboxItem[] }> =>
  typeof item === 'object' && item !== null && 'items' in item;

const getSelectableValues = (options: ComboboxParsedItem<string>[] = []) => {
  const values = new Set<string>();

  for (const item of options) {
    if (isParsedItemGroup(item)) {
      for (const groupItem of item.items) {
        const value = groupItem.value;

        if (!groupItem.disabled && value && !isActionValue(value)) {
          values.add(value);
        }
      }
      continue;
    }

    const value = item.value;

    if (!item.disabled && value && !isActionValue(value)) {
      values.add(value);
    }
  }

  return [...values];
};

const getFlatOptions = (options: ComboboxParsedItem<string>[] = []) => {
  const items: ComboboxItem[] = [];

  for (const item of options) {
    if (isParsedItemGroup(item)) {
      for (const groupItem of item.items) {
        items.push(groupItem);
      }
      continue;
    }

    items.push(item);
  }

  return items;
};

const getOptionMap = (options: ComboboxItem[] = []) => {
  const optionMap = new Map<string, ComboboxItem>();

  for (const item of options) {
    if (item.value && !isActionValue(item.value) && !optionMap.has(item.value)) {
      optionMap.set(item.value, item);
    }
  }

  return optionMap;
};

const getGroupedOptions = ({
  options,
  resultGroupLabel,
  selectedItems,
  selectedGroupLabel,
  selectedValueSet,
}: {
  options: ComboboxParsedItem<string>[];
  resultGroupLabel: string;
  selectedItems: ComboboxItem[];
  selectedGroupLabel: string;
  selectedValueSet: Set<string>;
}) => {
  const resultItems: ComboboxItem[] = [];

  for (const item of getFlatOptions(options)) {
    if (!item.value || isActionValue(item.value) || selectedValueSet.has(item.value)) {
      continue;
    }

    resultItems.push(item);
  }

  const groupedOptions: ComboboxParsedItem<string>[] = [];

  if (selectedItems.length > 0) {
    groupedOptions.push({
      group: selectedGroupLabel,
      items: selectedItems,
    });
  }

  if (resultItems.length > 0) {
    groupedOptions.push({
      group: resultGroupLabel,
      items: resultItems,
    });
  }

  return groupedOptions;
};

const renderActionButton = (
  label: ReactNode,
  onClick: () => void,
  disabled?: boolean,
  color = 'gray'
) => (
  <Box
    className={disabled ? classes.disabledActionButton : undefined}
    component="span"
    onMouseDown={(event) => {
      event.preventDefault();
      event.stopPropagation();
    }}
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled) {
        return;
      }

      onClick();
    }}
  >
    <Button
      size="compact-xs"
      variant={disabled ? 'subtle' : 'light'}
      color={color}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      style={{
        opacity: disabled ? 0.45 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {label}
    </Button>
  </Box>
);

const renderActionOption = ({
  clearAllLabel,
  hasAllOptionsSelected,
  hasSelectedOptions,
  hasVisibleOptions,
  onClearAll,
  onSelectAll,
  selectAllLabel,
  withSelectionActions,
}: {
  clearAllLabel: ReactNode;
  hasAllOptionsSelected: boolean;
  hasSelectedOptions: boolean;
  hasVisibleOptions: boolean;
  onClearAll: () => void;
  onSelectAll: () => void;
  selectAllLabel: ReactNode;
  withSelectionActions: boolean;
}) => (
  <Box
    className={classes.actions}
    data-custom-multi-select-actions
    data-with-visible-options={hasVisibleOptions || undefined}
    py={4}
    onMouseDown={(event) => {
      event.preventDefault();
      event.stopPropagation();
    }}
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();
    }}
  >
    <Stack gap={6}>
      {withSelectionActions && (
        <Group gap={6} wrap="nowrap">
          {renderActionButton(selectAllLabel, onSelectAll, hasAllOptionsSelected)}
          {renderActionButton(clearAllLabel, onClearAll, !hasSelectedOptions, 'red')}
        </Group>
      )}
    </Stack>
  </Box>
);

const renderDefaultOption = ({
  checked,
  checkIconPosition,
  label,
  withCheckIcon,
}: {
  checked?: boolean;
  checkIconPosition: 'left' | 'right';
  label: ReactNode;
  withCheckIcon?: boolean;
}) => {
  const check = withCheckIcon ? (
    checked ? (
      <CheckIcon
        style={{
          height: '0.8em',
          minWidth: '0.8em',
          opacity: 0.4,
          width: '0.8em',
        }}
      />
    ) : null
  ) : null;

  return (
    <>
      {checkIconPosition === 'left' && check}
      <span>{label}</span>
      {checkIconPosition === 'right' && check}
    </>
  );
};

export const CustomMultiSelect = ({
  checkIconPosition = 'left',
  clearAllLabel = 'Tüm Seçimi Kaldır',
  data = [],
  defaultValue,
  defaultSearchValue,
  filter,
  normalizeValue,
  onChange,
  onBlur,
  onInput,
  onDropdownClose,
  onSearch,
  onSearchChange,
  renderOption,
  renderPill,
  searchValue,
  searchable,
  selectAllExcludedValues = EMPTY_SELECT_ALL_EXCLUDED_VALUES,
  selectAllLabel = 'Tümünü Seç',
  styles,
  value,
  withAlignedLabels,
  withCheckIcon = true,
  withSelectionActions = false,
  ...props
}: CustomMultiSelectProps) => {
  const { i18n, t } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'tr-TR';
  const defaultFilter = useMemo(() => createLocaleOptionsFilter(locale), [locale]);
  const [_value, setValue] = useUncontrolled({
    value,
    defaultValue,
    finalValue: [],
    onChange,
  });
  const {
    searchValue: _searchValue,
    setSearchValue,
    searchTypedText,
    resetSearch,
  } = useSelectSearch({
    searchValue,
    defaultSearchValue,
    onSearchChange,
    onSearch,
  });

  const parsedData = useMemo(
    () => getParsedComboboxData(data) as ComboboxParsedItem<string>[],
    [data]
  );
  const flatParsedData = useMemo(() => getFlatOptions(parsedData), [parsedData]);
  const optionMap = useMemo(() => getOptionMap(flatParsedData), [flatParsedData]);
  const { selectedOptions, retainSelectedOptions } = useSelectedOptions(_value, optionMap);
  const selectedValueSet = useMemo(() => new Set(_value), [_value]);
  const selectedItems = useMemo(
    () => selectedOptions.filter((option) => !option.disabled),
    [selectedOptions]
  );
  const selectableValues = useMemo(() => {
    if (!withSelectionActions) {
      return [];
    }

    const search = _searchValue.trim();

    if (!search) {
      return getSelectableValues(flatParsedData).filter(
        (item) => !selectAllExcludedValues.includes(item)
      );
    }

    const filteredOptions = filter
      ? filter({ options: parsedData, search, limit: Infinity })
      : (defaultFilter({
          options: parsedData,
          search,
          limit: Infinity,
        }) as ComboboxParsedItem<string>[]);

    return getSelectableValues(filteredOptions).filter(
      (item) => !selectAllExcludedValues.includes(item)
    );
  }, [
    _searchValue,
    defaultFilter,
    filter,
    flatParsedData,
    parsedData,
    selectAllExcludedValues,
    withSelectionActions,
  ]);
  const hasSelectableOptions = selectableValues.length > 0;
  const hasSelectedOptions = _value.length > 0;
  const shouldShowSelectionActions = withSelectionActions && hasSelectableOptions;
  const hasAllOptionsSelected = useMemo(() => {
    if (!hasSelectableOptions) {
      return false;
    }

    return selectableValues.every((item) => selectedValueSet.has(item));
  }, [hasSelectableOptions, selectableValues, selectedValueSet]);

  const actionOptions = useMemo<ComboboxData>(() => {
    if (!shouldShowSelectionActions) {
      return [];
    }

    return [{ disabled: true, label: selectAllLabel, value: selectAllActionValue }];
  }, [selectAllLabel, shouldShowSelectionActions]);

  const mergedData = useMemo<ComboboxData>(
    () => [
      ...actionOptions,
      ...data,
      ...selectedOptions.filter((option) => !optionMap.has(option.value)),
    ],
    [actionOptions, data, optionMap, selectedOptions]
  );
  const optionsFilter = useMemo<OptionsFilter<string> | undefined>(() => {
    return (input) => {
      const actionOption = input.options[0];
      const hasActionOption = Boolean(
        actionOption && 'value' in actionOption && isActionValue(String(actionOption.value))
      );
      const options = hasActionOption ? input.options.slice(1) : input.options;
      const filteredDataOptions = filter
        ? filter({ ...input, options })
        : (defaultFilter({ ...input, options }) as ComboboxParsedItem<string>[]);
      const groupedDataOptions = getGroupedOptions({
        options: filteredDataOptions,
        resultGroupLabel: input.search.trim() ? t('label.searchResults') : t('label.otherOptions'),
        selectedItems,
        selectedGroupLabel: t('label.selectedOptions'),
        selectedValueSet,
      });

      return hasActionOption ? [actionOption, ...groupedDataOptions] : groupedDataOptions;
    };
  }, [defaultFilter, filter, selectedItems, selectedValueSet, t]);
  const handleChange = useCallback(
    (nextValue: string[]) => {
      const selectableValue = nextValue.filter((item) => !isActionValue(item));
      const nextSelection = normalizeValue?.(selectableValue, _value) ?? selectableValue;
      retainSelectedOptions(nextSelection);
      setValue(nextSelection);
    },
    [_value, normalizeValue, retainSelectedOptions, setValue]
  );
  const handleClearAll = useCallback(() => handleChange([]), [handleChange]);
  const handleSelectAll = useCallback(() => {
    handleChange([
      ...new Set([
        ..._value.filter((item) => !selectAllExcludedValues.includes(item)),
        ...selectableValues,
      ]),
    ]);
  }, [_value, selectAllExcludedValues, selectableValues, handleChange]);

  return (
    <MultiSelect
      {...props}
      checkIconPosition={checkIconPosition}
      data={mergedData}
      filter={optionsFilter}
      searchValue={_searchValue}
      searchable={searchable}
      styles={styles}
      value={_value}
      withAlignedLabels={withAlignedLabels}
      withCheckIcon={withCheckIcon}
      onChange={handleChange}
      onSearchChange={setSearchValue}
      onInput={(event) => {
        onInput?.(event);
        searchTypedText(event.currentTarget.value);
      }}
      onBlur={(event) => {
        onBlur?.(event);
        resetSearch();
      }}
      onDropdownClose={() => {
        onDropdownClose?.();
        resetSearch();
      }}
      renderPill={
        renderPill
          ? (input) =>
              renderPill({
                ...input,
                // Initial/external values may arrive before their options are fetched.
                option: input.option ?? { value: input.value, label: String(input.value) },
              })
          : undefined
      }
      renderOption={(input) => {
        if (input.option.value === selectAllActionValue) {
          return renderActionOption({
            clearAllLabel,
            hasAllOptionsSelected,
            hasSelectedOptions,
            hasVisibleOptions: hasSelectableOptions,
            onClearAll: handleClearAll,
            onSelectAll: handleSelectAll,
            selectAllLabel,
            withSelectionActions: shouldShowSelectionActions,
          });
        }

        return (
          renderOption?.(input) ??
          renderDefaultOption({
            checked: input.checked,
            checkIconPosition,
            label: input.option.label,
            withCheckIcon,
          })
        );
      }}
    />
  );
};
