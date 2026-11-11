import classes from './content.module.scss';
import { IconUser } from '@tabler/icons-react';
import { Avatar, Stack, Text } from '@mantine/core';
import { getUserAvatarUrl } from '@/_helpers/user/avatar';

type PersonSummaryProps = {
  subtitle: string;
  title: string;
  userCode?: string | null;
};

export const PersonSummary = ({ subtitle, title, userCode }: PersonSummaryProps) => {
  return (
    <div className={classes.personSummary}>
      <Avatar variant="light" radius="md" c="gray.5" size="sm" src={getUserAvatarUrl(userCode)}>
        <IconUser size="12px" />
      </Avatar>
      <Stack gap={2} className={classes.meta}>
        <Text size="xs" fw={700} c="blue.9" truncate>
          {title}
        </Text>
        <Text size="10px" c="gray.7" truncate>
          {subtitle}
        </Text>
      </Stack>
    </div>
  );
};
