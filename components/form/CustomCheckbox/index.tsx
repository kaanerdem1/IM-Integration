import { FC } from 'react';
import {
  IconSquareRounded,
  IconSquareRoundedCheck,
  IconSquareRoundedCheckFilled,
} from '@tabler/icons-react';
import { ActionIcon } from '@mantine/core';

interface Props {
  checked: boolean;
  onClick?: () => void;
  isLight?: boolean;
  disabled?: boolean;
}

export const CustomCheckbox: FC<Props> = ({ checked, onClick, isLight, disabled }) => {
  if (disabled) {
    return null;
  }

  const IconChecked = isLight ? IconSquareRoundedCheck : IconSquareRoundedCheckFilled;
  const Icon = checked ? IconChecked : IconSquareRounded;
  const iconColor = checked ? 'var(--mantine-color-blue-4)' : 'var(--mantine-color-gray-4)';
  return (
    <ActionIcon
      data-prevent-row-click
      variant="transparent"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick?.();
      }}
    >
      <Icon color={iconColor} stroke={1.5} />
    </ActionIcon>
  );
};
