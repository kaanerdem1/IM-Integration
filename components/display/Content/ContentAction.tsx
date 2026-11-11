import { FC, ReactNode } from 'react';
import { Box, BoxProps } from '@mantine/core';
import classes from '@/components/display/Content/style.module.scss';

interface Props extends BoxProps {
  children: ReactNode;
  gap?: number;
}

export const ContentAction: FC<Props> = ({ children, gap = 0, ...props }) => {
  return (
    <Box className={classes.contentAction} style={{ gap }} {...props}>
      {children}
    </Box>
  );
};
