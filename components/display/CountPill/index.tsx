import type { ReactNode } from 'react';
import classes from './style.module.scss';
import clsx from 'clsx';
import { Box, type BoxProps } from '@mantine/core';

type CountPillProps = BoxProps & {
  children: ReactNode;
  title?: string;
};

/** Başlık yanında sayaç (ör. toplam talep) */
export const CountPill = ({ children, className, ...props }: CountPillProps) => (
  <Box component="span" className={clsx(classes.pill, className)} {...props}>
    {children}
  </Box>
);
