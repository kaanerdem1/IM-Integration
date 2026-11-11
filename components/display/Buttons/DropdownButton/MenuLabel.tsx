import { FC } from 'react';
import { Menu, MenuLabelProps, TreeNodeData } from '@mantine/core';

interface MenuItemProps extends MenuLabelProps {
  label: TreeNodeData['label'];
}

export const MenuLabel: FC<MenuItemProps> = ({ label, ...props }) => {
  return <Menu.Label {...props}>{label}</Menu.Label>;
};
