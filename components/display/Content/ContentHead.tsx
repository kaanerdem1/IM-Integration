import { FC, ReactNode } from 'react';
import clsx from 'clsx';
import { Box, BoxProps } from '@mantine/core';
import classes from '@/components/display/Content/style.module.scss';

interface Props extends BoxProps {
  children: ReactNode;
}

export const ContentHead: FC<Props> = ({ children, className, ...props }) => {
  return (
    <Box className={clsx(classes.contentHead, className)} {...props}>
      {children}
    </Box>
  );
};
