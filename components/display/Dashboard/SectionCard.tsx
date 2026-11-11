import type { ReactNode } from 'react';
import classes from './style.module.scss';
import clsx from 'clsx';
import { Box, type BoxProps } from '@mantine/core';

type SectionCardProps = BoxProps & {
  action?: ReactNode;
  bodyClassName?: string;
  children: ReactNode;
  description?: ReactNode;
  padding?: 'default' | 'compact';
  size?: 'md' | 'sm';
  title: ReactNode;
};

export type DashboardCardCustomization = {
  title?: string;
  description?: string;
  action?: ReactNode;
};

/** Dashboard kartı: başlık + açıklama + sağ aksiyon şeridi ve gövde */
export const SectionCard = ({
  action,
  bodyClassName,
  children,
  className,
  description,
  padding = 'default',
  size = 'md',
  title,
  ...props
}: SectionCardProps) => {
  return (
    <Box
      className={clsx(classes.card, className)}
      data-padding={padding}
      data-size={size}
      {...props}
    >
      <Box className={classes.cardHead}>
        <Box className={classes.cardHeadText}>
          <Box className={classes.cardTitle}>{title}</Box>
          {description ? <Box className={classes.cardSubtitle}>{description}</Box> : null}
        </Box>
        {action}
      </Box>

      <Box className={clsx(classes.cardBody, bodyClassName)}>{children}</Box>
    </Box>
  );
};
