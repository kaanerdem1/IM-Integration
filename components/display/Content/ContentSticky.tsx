import { FC, ReactNode } from 'react';
import clsx from 'clsx';
import { Box, BoxProps } from '@mantine/core';
import classes from '@/components/display/Content/style.module.scss';

interface Props extends BoxProps {
  children: ReactNode;
  isBottom?: boolean;
  noRadius?: boolean;
}

export const ContentSticky: FC<Props> = ({ children, isBottom, noRadius, ...props }) => {
  return (
    <Box
      className={clsx({
        [classes.contentStickyTop]: !isBottom,
        [classes.contentStickyBottom]: isBottom,
        [classes.noRadius]: noRadius,
      })}
      {...props}
    >
      {children}
    </Box>
  );
};
