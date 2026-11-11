import { useMemo, type SyntheticEvent } from 'react';
import classes from './DashboardGraphicFilterSelect.module.scss';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Group,
  MultiSelect,
  Stack,
  Text,
  Tooltip,
  type ComboboxData,
  type ComboboxItem,
  type MultiSelectProps,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import type { UserFormFilterResponseDto } from '@/_api/_core/api-gen/types';
import { dropdownScrollAreaProps, verticalListScrollAreaProps } from '@/_common/_props/scroll-area';
import { useTruncatedTooltipText } from '@/_hooks/useTruncatedTooltipText';
import {
  DEFAULT_REQUEST_FILTER_DESCRIPTION,
  DEFAULT_REQUEST_FILTER_ID,
  DEFAULT_REQUEST_FILTER_LABEL,
} from '@/components/request-filter/_config/defaultRequestFilter';
import { getRequestFilterScope } from '@/components/request-filter/_config/requestFilterScope';
import { groupSavedRequestFilters } from '@/components/request-filter/_utils/groupSavedRequestFilters';
import { normalizeSavedFilterIds } from '@/components/request-filter/_utils/savedFilterSelection';
import { SavedFilterGroupLabel } from '@/components/request-filter/saved-filter-menu/SavedFilterGroupLabel';
import { SavedFilterMenuTooltipLabel } from '@/components/request-filter/saved-filter-menu/SavedFilterMenuTooltipLabel';
import { SavedFilterSelectionIcon } from '@/components/request-filter/saved-filter-menu/SavedFilterSelectionIcon';
import { parseSavedRequestListFilter } from '@/pages/requests/list/_utils/savedRequestListFilter';
import { getDashboardGraphicFilterIds } from '../savedGraphics';

type DashboardGraphicFilterSelectProps = Pick<
  MultiSelectProps,
  'id' | 'disabled' | 'error' | 'label' | 'aria-label' | 'rightSection' | 'onBlur' | 'onFocus'
> & {
  savedFilterOptions: ComboboxItem[];
  savedFilterById: ReadonlyMap<string, UserFormFilterResponseDto>;
  value: string[];
  onChange: (value: string[]) => void;
};

const FilterOption = ({
  label,
  description,
  selected,
}: {
  label: string;
  description?: string;
  selected: boolean;
}) => {
  const { isTruncated, checkTruncation } = useTruncatedTooltipText();
  const measureName = (event: SyntheticEvent<HTMLDivElement>) => {
    checkTruncation(event.currentTarget.querySelector<HTMLElement>('[data-filter-name]'));
  };

  return (
    <Tooltip
      label={
        isTruncated ? (
          <Stack gap={4}>
            <Text c="inherit" size="xs" fw={600}>
              {label}
            </Text>
            {description && (
              <Text c="inherit" size="xs">
                {description}
              </Text>
            )}
          </Stack>
        ) : (
          description
        )
      }
      opened={!description && !isTruncated ? false : undefined}
      position="right"
      maw={320}
      multiline
      withArrow
      style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
    >
      <Group gap="xs" wrap="nowrap" flex={1} miw={0} onMouseEnter={measureName}>
        <SavedFilterSelectionIcon selected={selected} />
        <Box flex={1} miw={0}>
          <Text component="span" display="block" inherit truncate data-filter-name>
            {label}
          </Text>
          {description && (
            <Text component="span" c="dimmed" display="block" fw={400} fz={11} mt={2} truncate>
              {description}
            </Text>
          )}
        </Box>
      </Group>
    </Tooltip>
  );
};

export const DashboardGraphicFilterSelect = ({
  savedFilterOptions,
  savedFilterById,
  value,
  onChange,
  ...props
}: DashboardGraphicFilterSelectProps) => {
  const { t } = useTranslation();
  const [opened, { open, close }] = useDisclosure(false);
  const defaultLabel = t(DEFAULT_REQUEST_FILTER_LABEL);
  const defaultDescription = t(DEFAULT_REQUEST_FILTER_DESCRIPTION);
  const selectedIds = useMemo(() => normalizeSavedFilterIds(value), [value]);
  const groups = useMemo(
    () =>
      groupSavedRequestFilters(savedFilterOptions, (option) =>
        getRequestFilterScope(
          parseSavedRequestListFilter(savedFilterById.get(option.value)?.Filter)?.value
            .listIssueType
        )
      ),
    [savedFilterOptions, savedFilterById]
  );
  const options = useMemo<ComboboxData>(() => {
    const selectedIdSet = new Set(selectedIds);
    return [
      { value: DEFAULT_REQUEST_FILTER_ID, label: defaultLabel },
      ...groups.map((group) => ({
        group: (
          <SavedFilterGroupLabel
            scope={group.scope}
            labelKey={group.labelKey}
            count={group.items.length}
            selectedCount={group.items.reduce(
              (count, option) => count + (selectedIdSet.has(option.value) ? 1 : 0),
              0
            )}
          />
        ),
        items: group.items,
      })),
      // Missing records stay removable instead of silently falling back to an unrestricted chart.
      ...selectedIds
        .filter((id) => id !== DEFAULT_REQUEST_FILTER_ID && !savedFilterById.has(id))
        .map((id) => ({ value: id, label: id })),
    ];
  }, [defaultLabel, groups, savedFilterById, selectedIds]);
  const selectedFilters = selectedIds.map((id) => ({
    Id: id,
    Name:
      id === DEFAULT_REQUEST_FILTER_ID ? defaultLabel : savedFilterById.get(id)?.Name?.trim() || id,
    Description:
      id === DEFAULT_REQUEST_FILTER_ID ? defaultDescription : savedFilterById.get(id)?.Description,
  }));

  return (
    <Tooltip
      label={<SavedFilterMenuTooltipLabel selectedFilters={selectedFilters} />}
      disabled={opened || props.disabled}
      maw={300}
      multiline
      position="bottom"
      px="sm"
      py={8}
      radius="md"
      withArrow
    >
      <Box flex={1} miw={0} data-testid="graphic-filter-select">
        <MultiSelect
          {...props}
          radius="md"
          variant="default"
          searchable
          flex={1}
          miw={0}
          clearable={value.length > 0}
          clearButtonProps={{ 'aria-label': t('label.requests.list.filters.clearFilters') }}
          data={options}
          classNames={{ group: classes.group, groupLabel: classes.groupLabel }}
          scrollAreaProps={{ ...verticalListScrollAreaProps, ...dropdownScrollAreaProps }}
          value={selectedIds}
          onChange={(nextIds) => {
            // Selecting the built-in default replaces saved IDs; selecting a record replaces the default.
            onChange(
              nextIds.includes(DEFAULT_REQUEST_FILTER_ID) &&
                !selectedIds.includes(DEFAULT_REQUEST_FILTER_ID)
                ? []
                : getDashboardGraphicFilterIds(nextIds)
            );
          }}
          onDropdownOpen={open}
          onDropdownClose={close}
          renderOption={({ option, checked }) => {
            const description =
              option.value === DEFAULT_REQUEST_FILTER_ID
                ? defaultDescription
                : savedFilterById.get(option.value)?.Description?.trim();

            return (
              <FilterOption
                label={option.label}
                description={description}
                selected={Boolean(checked)}
              />
            );
          }}
        />
      </Box>
    </Tooltip>
  );
};
