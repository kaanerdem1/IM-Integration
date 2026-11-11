import { FC, ReactNode } from 'react';
import classes from './style.module.scss';
import { Box } from '@mantine/core';

interface Props {
  children: ReactNode;
}

export const DrawerDetailHeadAction: FC<Props> = ({ children }) => {
  return (
    <>
      <Box className={classes.headAction}>{children}</Box>
    </>
  );
};
