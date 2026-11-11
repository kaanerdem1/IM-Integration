import { FC, ReactNode } from 'react';
import classes from './style.module.scss';
import { Box, BoxProps, ScrollArea } from '@mantine/core';

interface Props extends BoxProps {
  children: ReactNode;
}

export const Right: FC<Props> = ({ children, ...props }) => {
  return (
    <Box className={classes.drawerDetailBodyRight} {...props}>
      <ScrollArea h="100%" scrollbars="y">
        <Box className={classes.drawerDetailBodyRightContent}>{children}</Box>
      </ScrollArea>
    </Box>
  );
};
