import { FC, ReactNode } from 'react';
import classes from './style.module.scss';
import { Box, BoxProps, ScrollArea } from '@mantine/core';

interface Props extends BoxProps {
  children: ReactNode;
}

export const Left: FC<Props> = ({ children, ...props }) => {
  return (
    <Box className={classes.pageLeft} component={ScrollArea.Autosize} {...props}>
      {children}
    </Box>
  );
};
