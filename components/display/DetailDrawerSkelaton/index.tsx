import { FC } from 'react';
import classes from './style.module.scss';
import { Box } from '@mantine/core';

interface Props {
  children: React.ReactNode;
}

export const DrawerDetailBody: FC<Props> = ({ children }) => {
  return (
    <>
      <Box className={classes.drawerDetailBody}>{children}</Box>
    </>
  );
};
