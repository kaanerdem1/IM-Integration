import { useEffect, useMemo, type Ref, type SyntheticEvent } from 'react';
import classes from './SavedFilterMenu.module.scss';
import { useTranslation } from 'react-i18next';
import { Box, Loader, Menu, ScrollArea, Stack, Text, Tooltip } from '@mantine/core';
import { useScrollIntoView } from '@mantine/hooks';
import { dropdownScrollAreaProps, verticalListScrollAreaProps } from '@/_common/_props/scroll-area';
import { useTruncatedTooltipText } from '@/_hooks/useTruncatedTooltipText';
import { parseSavedRequestListFilter } from '@/pages/requests/list/_utils/savedRequestListFilter';
import { DEFAULT_REQUEST_FILTER_ID } from '../_config/defaultRequestFilter';
import { getRequestFilterScope } from '../_config/requestFilterScope';
import type { RequestFilterMenuOption } from '../_types';
import { groupSavedRequestFilters } from '../_utils/groupSavedRequestFilters';
import { SavedFilterGroupLabel } from './SavedFilterGroupLabel';
import { SavedFilterSelectionIcon } from './SavedFilterSelectionIcon';

type SavedFilterMenuOptionsProps = {
  filters: RequestFilterMenuOption[];
  isFetching: boolean;
  selectedFilterIds: readonly string[];
  onChange: (filter: RequestFilterMenuOption) => void;
};

const SavedFilterMenuOption = ({
  filter,
  isSelected,
  itemRef,
  onChange,
}: {
  filter: RequestFilterMenuOption;
  isSelected: boolean;
  itemRef?: Ref<HTMLButtonElement>;
  onChange: SavedFilterMenuOptionsProps['onChange'];
}) => {
  const description = filter.Description?.trim();
  const { isTruncated, checkTruncation } = useTruncatedTooltipText();
  const measureName = (event: SyntheticEvent<HTMLButtonElement>) => {
    checkTruncation(event.currentTarget.querySelector<HTMLElement>('[data-filter-name]'));
  };

  return (
    <Tooltip
      label={
        isTruncated ? (
          <Stack gap={4}>
            <Text c="inherit" size="xs" fw={600}>
              {filter.Name}
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
      events={{ hover: true, focus: true, touch: false }}
      position="right"
      maw={320}
      multiline
      withArrow
      withinPortal
      style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
    >
      <Menu.Item
        ref={itemRef}
        aria-current={isSelected ? 'true' : undefined}
        aria-label={filter.Name}
        className={classes.item}
        classNames={{ itemLabel: classes.itemLabel }}
        data-selected={isSelected ? 'true' : undefined}
        leftSection={<SavedFilterSelectionIcon selected={isSelected} />}
        onMouseEnter={measureName}
        onFocusCapture={measureName}
        onClick={() => onChange(filter)}
      >
        <Text component="span" display="block" inherit truncate data-filter-name>
          {filter.Name}
        </Text>
        {description && (
          <Text component="span" c="dimmed" display="block" fw={400} fz={11} mt={2} truncate>
            {description}
          </Text>
        )}
      </Menu.Item>
    </Tooltip>
  );
};

/** Mount the scroll viewport and list only while the menu is open. */
export const SavedFilterMenuOptions = ({
  filters: savedFilters,
  isFetching,
  selectedFilterIds,
  onChange,
}: SavedFilterMenuOptionsProps) => {
  const { t } = useTranslation();
  const { defaultFilter, groups, orderedFilters } = useMemo(() => {
    const defaultFilter = savedFilters.find((filter) => filter.Id === DEFAULT_REQUEST_FILTER_ID);
    const groups = groupSavedRequestFilters(savedFilters, (filter) =>
      filter.Id === DEFAULT_REQUEST_FILTER_ID
        ? undefined
        : getRequestFilterScope(parseSavedRequestListFilter(filter.Filter)?.value.listIssueType)
    );
    return {
      defaultFilter,
      groups,
      orderedFilters: [
        ...(defaultFilter ? [defaultFilter] : []),
        ...groups.flatMap((group) => group.items),
      ],
    };
  }, [savedFilters]);
  const selectedIds = useMemo(() => new Set(selectedFilterIds), [selectedFilterIds]);
  const firstSelectedId = orderedFilters.find((filter) => selectedIds.has(filter.Id))?.Id;
  const { scrollableRef, targetRef, scrollIntoView } = useScrollIntoView<
    HTMLButtonElement,
    HTMLDivElement
  >({ duration: 0 });

  useEffect(() => {
    const viewport = scrollableRef.current;

    if (!viewport || !targetRef.current) {
      return;
    }

    const scrollToSelectedItem = () => {
      if (viewport.clientHeight === 0) {
        return;
      }

      scrollIntoView({ alignment: 'center' });
    };

    const frame = window.requestAnimationFrame(scrollToSelectedItem);
    const observer = new ResizeObserver(scrollToSelectedItem);
    observer.observe(viewport);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [savedFilters, firstSelectedId, scrollableRef, scrollIntoView, targetRef]);

  return (
    <ScrollArea.Autosize
      {...verticalListScrollAreaProps}
      {...dropdownScrollAreaProps}
      mah="min(400px, 60dvh)"
      viewportRef={scrollableRef}
      data-testid="saved-filter-menu-scroll"
    >
      {defaultFilter && (
        <SavedFilterMenuOption
          filter={defaultFilter}
          isSelected={selectedIds.has(defaultFilter.Id)}
          itemRef={defaultFilter.Id === firstSelectedId ? targetRef : undefined}
          onChange={onChange}
        />
      )}
      {groups.map((group) => (
        <Box key={group.scope} role="group" aria-label={t(group.labelKey)}>
          <Menu.Divider />
          <Menu.Label>
            <SavedFilterGroupLabel
              scope={group.scope}
              labelKey={group.labelKey}
              count={group.items.length}
              selectedCount={group.items.reduce(
                (count, filter) => count + (selectedIds.has(filter.Id) ? 1 : 0),
                0
              )}
            />
          </Menu.Label>
          {group.items.map((filter) => (
            <SavedFilterMenuOption
              key={filter.Id}
              filter={filter}
              isSelected={selectedIds.has(filter.Id)}
              itemRef={filter.Id === firstSelectedId ? targetRef : undefined}
              onChange={onChange}
            />
          ))}
        </Box>
      ))}
      {isFetching && (
        <Menu.Item disabled leftSection={<Loader size={13} />}>
          {t('label.root.nav.savedListsLoading')}
        </Menu.Item>
      )}
    </ScrollArea.Autosize>
  );
};
