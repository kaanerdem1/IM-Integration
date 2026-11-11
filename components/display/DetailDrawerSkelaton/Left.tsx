import { FC, ReactNode } from 'react';
import classes from './style.module.scss';
import { Box, BoxProps } from '@mantine/core';

interface Props extends BoxProps {
  children: ReactNode;
}

export const Left: FC<Props> = ({ children, ...props }) => {
  return (
    <Box className={classes.drawerDetailBodyLeft} {...props}>
      {children}
    </Box>
  );
};
