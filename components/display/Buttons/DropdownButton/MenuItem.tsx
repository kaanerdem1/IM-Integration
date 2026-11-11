import { FC, ReactNode } from 'react';
import type { TablerIcon } from '@tabler/icons-react';
import { MantineColor, Menu, MenuItemProps } from '@mantine/core';
import { iconProps_ddMenu } from '@/_common/_props/icon';

interface MenuItemCustomProps extends MenuItemProps {
  id?: string;
  label: string | ReactNode;
  iconLeft?: TablerIcon;
  iconRight?: TablerIcon;
  iconColor?: MantineColor;
  onClick?: () => void;
}

export const MenuItem: FC<MenuItemCustomProps> = ({
  id,
  label,
  iconLeft,
  iconColor,
  iconRight,
  onClick,
  ...props
}) => {
  const renderIcon = (Icon?: TablerIcon) => {
    if (!Icon) {
      return null;
    }

    return <Icon {...iconProps_ddMenu} {...(iconColor ? { color: iconColor } : {})} />;
  };

  return (
    <Menu.Item
      id={id}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.();
      }}
      leftSection={renderIcon(iconLeft)}
      rightSection={renderIcon(iconRight)}
      {...props}
    >
      {label}
    </Menu.Item>
  );
};
