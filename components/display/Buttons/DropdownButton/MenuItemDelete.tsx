import { FC } from 'react';
import { IconTrash } from '@tabler/icons-react';
import type { TablerIcon } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Menu, MenuItemProps } from '@mantine/core';
import { iconProps_ddMenu } from '@/_common/_props/icon';

interface MenuItemCustomProps extends MenuItemProps {
  id?: string;
  label?: string;
  icon?: TablerIcon;
  onClick?: () => void;
}

export const MenuItemDelete: FC<MenuItemCustomProps> = ({
  id,
  label,
  icon = IconTrash,
  onClick,
  ...props
}) => {
  const { t } = useTranslation();

  const Icon = icon;

  return (
    <Menu.Item
      id={id}
      c="var(--mantine-color-red-6)"
      leftSection={<Icon {...iconProps_ddMenu} color="var(--mantine-color-red-6)" />}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      {...props}
    >
      {label || t('label.delete_')}
    </Menu.Item>
  );
};
