import { FC, ReactNode } from 'react';
import classes from './style.module.scss';
import { Box, BoxProps } from '@mantine/core';

interface Props extends BoxProps {
  children: ReactNode;
}

export const DrawerDetailHeadTab: FC<Props> = ({ children, ...props }) => {
  return (
    <>
      <Box className={classes.drawerDetailHeadTab} {...props}>
        {children}
      </Box>
    </>
  );
};
