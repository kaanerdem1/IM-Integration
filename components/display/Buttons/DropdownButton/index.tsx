import { FC, ReactNode } from 'react';
import { IconDotsVertical } from '@tabler/icons-react';
import type { IconProps, TablerIcon } from '@tabler/icons-react';
import {
  ActionIcon,
  Box,
  Menu,
  type ActionIconProps,
  type BoxProps,
  type ElementProps,
  type MenuDropdownProps,
  type MenuProps,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

interface Props extends BoxProps {
  children: ReactNode;
  target?: ReactNode;
  className?: string;
  menuProps?: MenuProps;
  dropdownProps?: MenuDropdownProps;
  onOpen?: () => void;
  onClose?: () => void;
  onBeforeOpen?: () => void;
  icon?: TablerIcon;
  iconProps?: IconProps;
  actionIconProps?: ActionIconProps & ElementProps<'button'>;
}

export const DropdownButton: FC<Props> = ({
  children,
  target,
  className,
  menuProps,
  dropdownProps,
  onOpen,
  onClose,
  onBeforeOpen,
  icon,
  iconProps = {},
  actionIconProps = {},
  ...props
}) => {
  const [opened, handlers] = useDisclosure(false);
  const handleOpen = () => {
    onBeforeOpen?.();
    handlers.open();
    menuProps?.onOpen?.();
    onOpen?.();
  };
  const handleClose = () => {
    handlers.close();
    menuProps?.onClose?.();
    onClose?.();
  };

  const Icon = icon || IconDotsVertical;

  return (
    <Box className={className ?? ''} w="fit-content" {...props}>
      <Menu {...menuProps} onOpen={handleOpen} onClose={handleClose}>
        <Menu.Target>
          {target || (
            <ActionIcon
              variant={opened ? 'light' : 'subtle'}
              color="gray.6"
              onClick={(e) => e.stopPropagation()}
              {...actionIconProps}
            >
              <Icon size="15px" stroke={2} color="var(--mantine-color-gray-8)" {...iconProps} />
            </ActionIcon>
          )}
        </Menu.Target>
        <Menu.Dropdown {...dropdownProps} miw={180}>
          {children}
        </Menu.Dropdown>
      </Menu>
    </Box>
  );
};
