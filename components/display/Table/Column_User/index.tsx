import { FC } from 'react';
import classes from './style.module.scss';
import { Box, BoxProps, Group, Text, TextProps } from '@mantine/core';
import { UserAvatar } from '@/components/display/UserAvatar';

interface Props extends BoxProps {
  fullName?: string;
  avatar?: string | null;
  textProps?: TextProps;
}

export const Column_User: FC<Props> = ({ fullName, avatar, textProps, ...props }) => {
  if (!fullName) {
    return '';
  }

  const hasTextLimit = Boolean(textProps?.truncate || textProps?.lineClamp);

  return (
    <Box className={`${classes.tableUser}`} w={hasTextLimit ? '100%' : 'max-content'} {...props}>
      <Group gap="xs" align="center" justify="flex-start" wrap="nowrap" w="100%" miw={0}>
        <UserAvatar size="xs" src={avatar} flex="0 0 auto" />

        <Text
          truncate={false}
          textWrap={textProps?.lineClamp ? 'wrap' : 'nowrap'}
          flex={1}
          miw={0}
          maw="100%"
          {...textProps}
        >
          {fullName}
        </Text>
      </Group>
    </Box>
  );
};
