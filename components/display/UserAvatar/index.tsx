import { IconUser } from '@tabler/icons-react';
import { Avatar, type AvatarProps } from '@mantine/core';

type UserAvatarProps = Omit<AvatarProps, 'children'>;

export const UserAvatar = ({ src, ...props }: UserAvatarProps) => {
  return (
    <Avatar variant="light" radius="sm" c="gray.5" src={src ?? ''} {...props}>
      <IconUser size="15px" />
    </Avatar>
  );
};
