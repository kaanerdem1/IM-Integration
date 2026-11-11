import { useMemo, type ReactNode } from 'react';
import classes from './SavedFilterMenu.module.scss';
import { IconChevronDown, IconSettings } from '@tabler/icons-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Box,
  Group,
  Menu,
  Text,
  Tooltip,
  type ActionIconProps,
  type ElementProps,
  type MenuDropdownProps,
  type MenuProps,
  type TooltipProps,
} from '@mantine/core';
import { useUncontrolled } from '@mantine/hooks';
import {
  DEFAULT_REQUEST_FILTER_DESCRIPTION,
  DEFAULT_REQUEST_FILTER_ID,
  DEFAULT_REQUEST_FILTER_LABEL,
} from '../_config/defaultRequestFilter';
import { useSavedRequestFilters } from '../_hooks/useSavedRequestFilters';
import type { RequestFilterMenuOption } from '../_types';
import { defaultSavedFilterIds, toggleSavedFilterId } from '../_utils/savedFilterSelection';
import { RequestFilterCreateButton } from '../panel/RequestFilterCreateButton';
import { SavedFilterCombinationHint } from './SavedFilterCombinationHint';
import { SavedFilterMenuOptions } from './SavedFilterMenuOptions';
import { SavedFilterMenuTooltipLabel } from './SavedFilterMenuTooltipLabel';

export type SavedFilterMenuAppearance = 'default' | 'inverse' | 'on-danger';

export type SavedFilterMenuProps = {
  actionIconProps?: Omit<ActionIconProps & ElementProps<'button'>, 'children'>;
  appearance?: SavedFilterMenuAppearance;
  dropdownProps?: MenuDropdownProps;
  menuProps?: Omit<MenuProps, 'children'>;
  onChange?: (filter: RequestFilterMenuOption) => void;
  selectedFilterIds?: readonly string[];
  tooltipLabel?: ReactNode;
  tooltipProps?: Omit<TooltipProps, 'children' | 'label'>;
  withChevron?: boolean;
};

export const SavedFilterMenu = ({
  actionIconProps,
  appearance = 'default',
  dropdownProps,
  menuProps,
  onChange,
  selectedFilterIds,
  tooltipLabel,
  tooltipProps,
  withChevron = true,
}: SavedFilterMenuProps) => {
  const { t } = useTranslation();
  const { className: actionIconClassName, ...otherActionIconProps } = actionIconProps ?? {};
  const {
    opened: controlledOpened,
    defaultOpened,
    onChange: onOpenedChange,
    ...otherMenuProps
  } = menuProps ?? {};
  const [opened, setOpened] = useUncontrolled({
    value: controlledOpened,
    defaultValue: defaultOpened,
    finalValue: false,
    onChange: onOpenedChange,
  });
  const [activeFilterIds, setActiveFilterIds] = useUncontrolled<readonly string[]>({
    value: selectedFilterIds,
    finalValue: defaultSavedFilterIds,
  });
  const { filters, isFetching } = useSavedRequestFilters();
  const options = useMemo<RequestFilterMenuOption[]>(
    () => [
      {
        Id: DEFAULT_REQUEST_FILTER_ID,
        Name: t(DEFAULT_REQUEST_FILTER_LABEL),
        Description: t(DEFAULT_REQUEST_FILTER_DESCRIPTION),
      },
      ...filters,
    ],
    [filters, t]
  );
  const activeFilters = useMemo(() => {
    const selected = new Set(activeFilterIds);
    return options.filter((filter) => selected.has(filter.Id));
  }, [options, activeFilterIds]);

  const handleSelect = (filter: RequestFilterMenuOption) => {
    if (selectedFilterIds === undefined) {
      setActiveFilterIds(toggleSavedFilterId(activeFilterIds, filter.Id));
    }
    onChange?.(filter);
  };

  return (
    <Menu
      position="bottom-end"
      shadow="md"
      width={320}
      withinPortal
      {...otherMenuProps}
      closeOnItemClick={false}
      opened={opened}
      onChange={setOpened}
    >
      <Menu.Target>
        <Tooltip
          label={tooltipLabel ?? <SavedFilterMenuTooltipLabel selectedFilters={activeFilters} />}
          maw={300}
          multiline
          position="bottom"
          px="sm"
          py={8}
          radius="md"
          withArrow
          {...tooltipProps}
        >
          <ActionIcon
            aria-label={t('label.home.savedFilterMenuTrigger')}
            color="gray"
            radius={appearance === 'on-danger' ? 999 : 'xl'}
            size={appearance === 'on-danger' ? 22 : 25}
            variant="light"
            {...otherActionIconProps}
            className={clsx(classes.trigger, actionIconClassName)}
            data-appearance={appearance}
          >
            <span className={classes.triggerIcons} data-with-chevron={withChevron || undefined}>
              <IconSettings aria-hidden size={appearance === 'on-danger' ? 12 : 15} stroke={1.9} />
              {withChevron && <IconChevronDown aria-hidden size={10} stroke={2.2} />}
            </span>
          </ActionIcon>
        </Tooltip>
      </Menu.Target>

      <Menu.Dropdown {...dropdownProps}>
        <Menu.Label>
          <Group align="flex-start" gap="xs" wrap="nowrap">
            <Box flex={1} miw={0}>
              <Text c="gray.8" fw={600} size="xs">
                {t('label.home.savedFilterMenuTitle')}
              </Text>
              <Box mt={3}>
                <SavedFilterCombinationHint />
              </Box>
            </Box>
            <RequestFilterCreateButton onBeforeOpen={() => setOpened(false)} />
          </Group>
        </Menu.Label>
        {opened && (
          <SavedFilterMenuOptions
            filters={options}
            isFetching={isFetching}
            selectedFilterIds={activeFilterIds}
            onChange={handleSelect}
          />
        )}
      </Menu.Dropdown>
    </Menu>
  );
};
