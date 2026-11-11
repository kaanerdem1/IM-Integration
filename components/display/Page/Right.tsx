import { FC, ReactNode } from 'react';
import { Box, BoxProps, ScrollArea } from '@mantine/core';
import classes from '@/components/display/Page/style.module.scss';

interface Props extends BoxProps {
  children: ReactNode;
  isDragging?: boolean;
}

export const Right: FC<Props> = ({ children, isDragging, ...props }) => {
  return (
    <Box className={classes.pageRight} component={ScrollArea} {...props}>
      {children}
    </Box>
  );
};
