import { FC, ReactNode } from 'react';
import { Box, BoxProps } from '@mantine/core';
import classes from '@/components/display/Page/style.module.scss';

interface Props extends BoxProps {
  children: ReactNode;
  autoH?: boolean;
}

export const PageHead: FC<Props> = ({ children, autoH, ...props }) => {
  return (
    <Box className={classes.pageHead} {...props}>
      {children}
    </Box>
  );
};
