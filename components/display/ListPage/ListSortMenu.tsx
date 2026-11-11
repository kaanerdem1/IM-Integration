import { IconArrowsSort, IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Menu } from '@mantine/core';
import { ToolbarActionIcon } from '@/components/display/Buttons/ToolbarActionIcon';
import { LIST_DEFAULT_SORT, LIST_SORT_OPTIONS, type ListSortOption } from './listSort';

type ListSortMenuProps = {
  defaultValue?: string;
  options?: readonly ListSortOption[];
  triggerTestId?: string;
  value?: string;
  onChange: (value?: string) => void;
};

export function ListSortMenu({
  defaultValue = LIST_DEFAULT_SORT,
  options = LIST_SORT_OPTIONS,
  triggerTestId,
  value,
  onChange,
}: ListSortMenuProps) {
  const { t } = useTranslation();
  const selectedValue = value ?? defaultValue;
  const hasActiveSort = Boolean(value);

  return (
    <Menu position="bottom-end" shadow="md" arrowOffset={20}>
      <Menu.Target>
        <ToolbarActionIcon
          data-testid={triggerTestId}
          active={hasActiveSort}
          icon={<IconArrowsSort stroke={1.5} size={16} />}
          label={t('label.sortBy')}
        />
      </Menu.Target>

      <Menu.Dropdown>
        {options.map((item) => {
          const active = selectedValue === item.value;

          return (
            <Menu.Item
              key={item.value}
              leftSection={active ? <IconCheck size={14} /> : undefined}
              onClick={() => onChange(item.value === defaultValue ? undefined : item.value)}
            >
              {t(item.labelKey)}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
