import { memo, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import type { ComboboxData, ComboboxItem } from '@mantine/core';
import { getOptionsLockup, getParsedComboboxData, Loader } from '@mantine/core';
import { useIssueSearch } from '@/_api/hooks';
import {
  formatRequestNoOptionLabel,
  getRequestNoOptionLabel,
  getUniqueRequestNoOptions,
  type RequestNoOption,
} from '@/_helpers/mantine/requestNoOptions';
import { CustomMultiSelect } from '@/components/form/CustomMultiSelect';
import { CustomSelect } from '@/components/form/CustomSelect';
import { RequestNoPill } from '@/components/form/RequestNoPill';
import {
  dateRangeFilterConfigMap,
  numberRangeFilterConfigMap,
} from '@/components/request-filter/_config/filterConfig';
import type { RequestListFilterKey } from '@/components/request-filter/_config/filterConfig';
import type { RequestListFilterOptionState } from '@/components/request-filter/_hooks/useRequestListFilterOptions';
import {
  filterInnerDropdownProps,
  toTimestampRangeFilterValue,
  toTimestampRangeValue,
} from '@/components/request-filter/fields/date-range/date-range-filter-utils';
import { DateRangeFilterField } from '@/components/request-filter/fields/date-range/DateRangeFilterField';
import { NumberRangeFilterField } from '@/components/request-filter/fields/number-range/NumberRangeFilterField';
import type { RequestListFilterValue } from '@/pages/requests/list/_config';
import { updateRequestFilterField } from '../_utils/breakdownFilters';

type RequestListArrayFilterKey = {
  [Key in RequestListFilterKey]: RequestListFilterValue[Key] extends string[] | undefined
    ? Key
    : never;
}[RequestListFilterKey];

type StaticFilterOptions = {
  applicationOptions: ComboboxData;
  requestNoOptions: ComboboxData;
  requestPoolOptions: ComboboxData;
  requestSizeOptions: ComboboxData;
  requestTypeOptions: ComboboxData;
  stepOptions: ComboboxData;
  workflowStatusOptions: ComboboxData;
  slaStatusOptions: ComboboxData;
};

export type RequestListFilterFieldOptions = StaticFilterOptions &
  RequestListFilterOptionState & {
    breakdownOptions?: Partial<Record<RequestListFilterKey, ComboboxItem[]>>;
  };

type MultiSelectFieldConfig = {
  data: ComboboxData;
  filterKey: RequestListArrayFilterKey;
  loading?: boolean;
};

type MultiSelectFilterFieldProps = {
  autoFocus?: boolean;
  data: ComboboxData;
  filterKey: RequestListArrayFilterKey;
  inputId?: string;
  label: string;
  loading?: boolean;
  placeholder?: string;
  testId?: string;
  value?: string[];
  onChange: (key: RequestListArrayFilterKey, value: string[]) => void;
  onSearch?: (key: RequestListArrayFilterKey, searchValue: string) => void;
};

const REQUEST_NO_SEARCH_MAX_COUNT = 20;
const emptyOptions: ComboboxData = [];

const uniqueStrings = (values: string[]) => Array.from(new Set(values));

const MultiSelectFilterField = ({
  autoFocus = false,
  data,
  filterKey,
  inputId,
  label,
  loading,
  placeholder,
  testId,
  value,
  onChange,
  onSearch,
}: MultiSelectFilterFieldProps) => (
  <CustomMultiSelect
    autoFocus={autoFocus}
    id={inputId}
    size="xs"
    label={label}
    data-testid={testId}
    data={data}
    searchable
    clearable
    loading={loading}
    placeholder={placeholder}
    comboboxProps={filterInnerDropdownProps}
    {...(filterKey === 'listRequestSize' ? { value: value ?? [] } : { defaultValue: value ?? [] })}
    onChange={(nextValue) => onChange(filterKey, nextValue)}
    onSearch={(searchValue) => onSearch?.(filterKey, searchValue)}
  />
);

type RequestNoFilterFieldProps = {
  autoFocus?: boolean;
  inputId?: string;
  label: string;
  selectedOptions: ComboboxData;
  testId?: string;
  value?: string[];
  onChange: (value: string[]) => void;
};

const RequestNoFilterField = ({
  autoFocus = false,
  inputId,
  label,
  selectedOptions,
  testId,
  value,
  onChange,
}: RequestNoFilterFieldProps) => {
  const { t } = useTranslation();
  // The filter draft can normalize legacy issue IDs to request numbers independently of the input.
  const [selectedValues, setSelectedValues] = useState(value ?? []);
  const [searchValue, setSearchValue] = useState('');
  const searchText = searchValue.trim();
  const { data, isLoading } = useIssueSearch(searchText, 0, REQUEST_NO_SEARCH_MAX_COUNT, {
    enabled: searchText.length > 0,
  });
  const options = useMemo<RequestNoOption[]>(() => {
    const requestNoOptions: RequestNoOption[] = [];
    const requestNoByValue = new Map<string, string>();
    const selectedValueSet = new Set(selectedValues);

    selectedOptions.forEach((option) => {
      if (typeof option === 'string') {
        requestNoOptions.push({
          label: option,
          value: option,
        });
        return;
      }

      if (!('value' in option)) {
        return;
      }

      requestNoOptions.push({
        label: option.label,
        value: option.value,
      });
    });

    // Saved filters can contain request numbers while initial options still use issue IDs.
    // Preserve the selected identity when both refer to the same request.
    const optionByRequestNo = new Map<string, RequestNoOption>();
    requestNoOptions.forEach((option) => {
      const requestNo = getRequestNoOptionLabel(option);
      if (!optionByRequestNo.has(requestNo)) {
        optionByRequestNo.set(requestNo, option);
      }
    });
    selectedValues.forEach((selectedValue) => {
      const alias = optionByRequestNo.get(selectedValue);
      if (alias && alias.value !== selectedValue) {
        requestNoOptions.push({ ...alias, value: selectedValue });
      }
    });

    (data?.Data ?? []).forEach((issue) => {
      const requestNo = issue.No ?? '';

      if (!requestNo) {
        return;
      }

      const optionLabel = formatRequestNoOptionLabel(requestNo, issue.Subject) || requestNo;

      requestNoByValue.set(requestNo, requestNo);

      if (issue.Id) {
        requestNoByValue.set(issue.Id, requestNo);

        if (selectedValueSet.has(issue.Id)) {
          requestNoOptions.push({
            label: optionLabel,
            value: issue.Id,
          });
        }
      }

      requestNoOptions.push({
        label: optionLabel,
        value: requestNo,
      });
    });

    return getUniqueRequestNoOptions(requestNoOptions, selectedValueSet, requestNoByValue);
  }, [data?.Data, selectedOptions, selectedValues]);

  return (
    <CustomMultiSelect
      autoFocus={autoFocus}
      id={inputId}
      size="xs"
      label={label}
      data-testid={testId}
      data={options}
      searchable
      clearable
      loading={isLoading}
      placeholder={t('label.requests.list.filters.requestSearchPlaceholder')}
      nothingFoundMessage={data ? t('label.noResult') : ''}
      comboboxProps={filterInnerDropdownProps}
      defaultValue={value ?? []}
      onChange={(nextValue) => {
        setSelectedValues(nextValue);
        onChange(nextValue);
      }}
      onSearch={setSearchValue}
      renderPill={(props) => <RequestNoPill {...props} />}
    />
  );
};

const getMultiSelectFieldConfig = (
  key: RequestListFilterKey,
  options: RequestListFilterFieldOptions
): MultiSelectFieldConfig | null => {
  switch (key) {
    case 'listApplication':
      return { data: options.applicationOptions, filterKey: key };
    case 'listAssignedUser':
      return {
        data: options.assignedUserOptions,
        filterKey: key,
        loading: options.isLoadingAssignedUserOptions,
      };
    case 'listCreatedBy':
      return {
        data: options.createdByOptions,
        filterKey: key,
        loading: options.isLoadingCreatedByOptions,
      };
    case 'listUpdatedBy':
      return {
        data: options.updatedByOptions,
        filterKey: key,
        loading: options.isLoadingUpdatedByOptions,
      };
    case 'listPortfolio':
      return {
        data: options.portfolioOptions,
        filterKey: key,
        loading: options.isLoadingPortfolioOptions,
      };
    case 'listPortfolioManager':
      return {
        data: options.portfolioManagerOptions,
        filterKey: key,
        loading: options.isLoadingPortfolioManagerOptions,
      };
    case 'listProjectLeaderUnit':
      return {
        data: options.businessUnitIdOptions,
        filterKey: key,
        loading: options.isLoadingUnitOptions,
      };
    case 'listProjectSponsor':
      return {
        data: options.projectSponsorOptions,
        filterKey: key,
        loading: options.isLoadingProjectSponsorOptions,
      };
    case 'listRequestPool':
      return { data: options.requestPoolOptions, filterKey: key };
    case 'listRequestSize':
      return { data: options.requestSizeOptions, filterKey: key };
    case 'listRequestType':
      return { data: options.requestTypeOptions, filterKey: key };
    case 'listSoftwareUnit':
      return {
        data: options.softwareUnitIdOptions,
        filterKey: key,
        loading: options.isLoadingUnitOptions,
      };
    case 'listStep':
      return { data: options.stepOptions, filterKey: key };
    case 'listUnit':
      return {
        data: options.unitIdOptions,
        filterKey: key,
        loading: options.isLoadingUnitOptions,
      };
    case 'listWorkflowStatus':
      return { data: options.workflowStatusOptions, filterKey: key };
    case 'listSlaStatus':
      return { data: options.slaStatusOptions, filterKey: key };
    default:
      return null;
  }
};

const getOptionLabelByValue = (options: ComboboxData) => {
  const labelByValue = new Map<string, string>();

  options.forEach((option) => {
    if (typeof option === 'string') {
      labelByValue.set(option, option);
      return;
    }

    if (!('value' in option)) {
      return;
    }

    labelByValue.set(option.value, option.label);
  });

  return labelByValue;
};

type RequestListFilterFieldProps = {
  autoFocus?: boolean;
  filterKey: RequestListFilterKey;
  getFilterLabel: (key: RequestListFilterKey) => string;
  options: RequestListFilterFieldOptions;
  setDraft: Dispatch<SetStateAction<RequestListFilterValue>>;
  value: RequestListFilterValue;
  onSearch?: (key: RequestListArrayFilterKey, searchValue: string) => void;
};

export const RequestListFilterField = ({
  autoFocus = false,
  filterKey,
  getFilterLabel,
  options,
  setDraft,
  value,
  onSearch,
}: RequestListFilterFieldProps) => {
  const { t } = useTranslation();
  const dateRangeFilterConfig = dateRangeFilterConfigMap.get(filterKey);
  const label = getFilterLabel(filterKey);
  const inputId = `request-list-filter-${filterKey}`;
  const testId = `${inputId}-field`;
  const multiSelectConfig = getMultiSelectFieldConfig(filterKey, options);
  const baseData =
    filterKey === 'listSoftwareDirector'
      ? options.softwareDirectorIdOptions
      : (multiSelectConfig?.data ?? emptyOptions);
  const selectedOptions = options.breakdownOptions?.[filterKey];
  const data = useMemo(() => {
    if (!selectedOptions?.length) {
      return baseData;
    }
    const existing = new Set(
      Object.keys(getOptionsLockup(getParsedComboboxData<string>(baseData)))
    );
    const additions: ComboboxItem[] = [];
    for (const option of selectedOptions ?? []) {
      if (!existing.has(option.value)) {
        additions.push(option);
        existing.add(option.value);
      }
    }
    return additions.length ? [...baseData, ...additions] : baseData;
  }, [baseData, selectedOptions]);

  const numberRangeConfig = numberRangeFilterConfigMap.get(filterKey);

  if (numberRangeConfig) {
    return (
      <NumberRangeFilterField
        autoFocus={autoFocus}
        inputId={inputId}
        testId={testId}
        label={label}
        fromValue={value[numberRangeConfig.fromKey]}
        toValue={value[numberRangeConfig.toKey]}
        onChange={(fromValue, toValue) =>
          setDraft((current) => ({
            ...current,
            [numberRangeConfig.fromKey]: fromValue,
            [numberRangeConfig.toKey]: toValue,
          }))
        }
      />
    );
  }

  if (dateRangeFilterConfig) {
    return (
      <DateRangeFilterField
        autoFocus={autoFocus}
        inputId={inputId}
        testId={testId}
        label={label}
        quickRange={value[dateRangeFilterConfig.quickRangeKey]}
        onQuickRangeChange={(quickRange) => {
          setDraft((current) => ({
            ...current,
            [dateRangeFilterConfig.quickRangeKey]: quickRange,
            [dateRangeFilterConfig.fromKey]: undefined,
            [dateRangeFilterConfig.toKey]: undefined,
          }));
        }}
        value={toTimestampRangeValue(
          value[dateRangeFilterConfig.fromKey],
          value[dateRangeFilterConfig.toKey]
        )}
        onChange={(next) => {
          const rangeValue = toTimestampRangeFilterValue(next);

          setDraft((current) => ({
            ...current,
            [dateRangeFilterConfig.quickRangeKey]: undefined,
            [dateRangeFilterConfig.fromKey]: rangeValue.from,
            [dateRangeFilterConfig.toKey]: rangeValue.to,
          }));
        }}
      />
    );
  }

  if (filterKey === 'listNo') {
    return (
      <RequestNoFilterField
        autoFocus={autoFocus}
        inputId={inputId}
        label={label}
        selectedOptions={options.requestNoOptions}
        testId={testId}
        value={value.listNo ?? value.listIssueId ?? []}
        onChange={(nextValue) => {
          const optionLabelByValue = getOptionLabelByValue(options.requestNoOptions);
          const normalized = uniqueStrings(
            nextValue
              .map((item) =>
                getRequestNoOptionLabel({
                  label: optionLabelByValue.get(item) ?? item,
                  value: item,
                })
              )
              .map((item) => item.trim())
              .filter(Boolean)
          );

          setDraft((current) => ({
            ...current,
            listIssueId: undefined,
            listNo: normalized.length ? normalized : undefined,
          }));
        }}
      />
    );
  }

  if (filterKey === 'listSoftwareDirector') {
    return (
      <CustomSelect
        autoFocus={autoFocus}
        id={inputId}
        data-testid={testId}
        size="xs"
        label={label}
        data={data}
        searchable
        clearable
        comboboxProps={filterInnerDropdownProps}
        defaultValue={value.listSoftwareDirector?.[0] ?? null}
        rightSection={options.isLoadingSoftwareDirectorOptions ? <Loader size={13} /> : undefined}
        onChange={(nextValue) =>
          setDraft((current) =>
            updateRequestFilterField(current, 'listSoftwareDirector', nextValue ? [nextValue] : [])
          )
        }
        onSearch={(searchValue) => onSearch?.(filterKey, searchValue)}
      />
    );
  }

  if (!multiSelectConfig) {
    return null;
  }

  let placeholder: string | undefined;

  if (
    filterKey === 'listProjectLeaderUnit' ||
    filterKey === 'listSoftwareUnit' ||
    filterKey === 'listUnit'
  ) {
    placeholder = t('label.requests.list.filters.unitSearchPlaceholder');
  } else if (
    filterKey === 'listAssignedUser' ||
    filterKey === 'listCreatedBy' ||
    filterKey === 'listUpdatedBy'
  ) {
    placeholder = t('label.requests.list.filters.personSearchPlaceholder');
  }

  return (
    <MultiSelectFilterField
      autoFocus={autoFocus}
      data={data}
      filterKey={multiSelectConfig.filterKey}
      inputId={inputId}
      label={label}
      loading={multiSelectConfig.loading}
      placeholder={placeholder}
      testId={testId}
      value={value[multiSelectConfig.filterKey]}
      onChange={(key, nextValue) =>
        setDraft((current) => updateRequestFilterField(current, key, nextValue))
      }
      onSearch={onSearch}
    />
  );
};

const areArrayValuesEqual = (left?: string[], right?: string[]) => {
  if (left === right) {
    return true;
  }

  if (!left?.length && !right?.length) {
    return true;
  }

  const leftValue = left ?? [];
  const rightValue = right ?? [];

  if (leftValue.length !== rightValue.length) {
    return false;
  }

  return leftValue.every((item, index) => item === rightValue[index]);
};

const areRequestListFilterFieldPropsEqual = (
  previous: RequestListFilterFieldProps,
  next: RequestListFilterFieldProps
) => {
  if (
    previous.autoFocus !== next.autoFocus ||
    previous.filterKey !== next.filterKey ||
    previous.getFilterLabel !== next.getFilterLabel ||
    previous.onSearch !== next.onSearch ||
    previous.options !== next.options ||
    previous.setDraft !== next.setDraft
  ) {
    return false;
  }

  const rangeConfig =
    dateRangeFilterConfigMap.get(previous.filterKey) ??
    numberRangeFilterConfigMap.get(previous.filterKey);

  if (rangeConfig) {
    return (
      previous.value[rangeConfig.fromKey] === next.value[rangeConfig.fromKey] &&
      previous.value[rangeConfig.toKey] === next.value[rangeConfig.toKey] &&
      (!('quickRangeKey' in rangeConfig) ||
        previous.value[rangeConfig.quickRangeKey] === next.value[rangeConfig.quickRangeKey])
    );
  }

  return areArrayValuesEqual(
    previous.value[previous.filterKey] as string[] | undefined,
    next.value[next.filterKey] as string[] | undefined
  );
};

export const MemoizedRequestListFilterField = memo(
  RequestListFilterField,
  areRequestListFilterFieldPropsEqual
);
