import classes from './content.module.scss';
import { IconFlagCheck } from '@tabler/icons-react';
import { Stack, Text, ThemeIcon, type MantineColor } from '@mantine/core';

type StatusSummaryProps = {
  color: MantineColor | undefined;
  subtitle: string;
  title: string;
};

export const StatusSummary = ({ color = 'gray', subtitle, title }: StatusSummaryProps) => {
  return (
    <div className={classes.personSummary}>
      <ThemeIcon variant="light" radius="md" color={color} size="sm">
        <IconFlagCheck size="12px" />
      </ThemeIcon>
      <Stack gap={2} className={classes.meta}>
        <Text size="xs" fw={700} c={`${color}.9`} truncate>
          {title}
        </Text>
        <Text size="10px" c="gray.7" truncate>
          {subtitle}
        </Text>
      </Stack>
    </div>
  );
};
