import classes from './style.module.scss';
import type { TableTdProps, TableThProps } from '@mantine/core';

// Kaydırılabilir tablonun son işlem sütununda hem Th hem Td üzerine uygulanır.
export const stickyActionColumnProps = {
  className: classes.stickyActionColumn,
} satisfies TableThProps & TableTdProps;
