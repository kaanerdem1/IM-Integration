import type { ReactNode } from 'react';
import classes from './style.module.scss';
import { Link } from 'react-router';
import { Box } from '@mantine/core';

export type StatusRowTone = 'success' | 'info';

export type StatusRowItem = {
  href?: string;
  label: string;
  value: number | string;
};

type StatusRowCardProps = {
  action?: ReactNode;
  description?: ReactNode;
  icon: ReactNode;
  items: StatusRowItem[];
  title: ReactNode;
  tone: StatusRowTone;
};

/** Tek satırlık durum kartı: ikon + başlık/açıklama + sağda sayaç pill'leri */
export const StatusRowCard = ({
  action,
  description,
  icon,
  items,
  title,
  tone,
}: StatusRowCardProps) => {
  return (
    <Box className={classes.card} data-padding="compact">
      <Box className={classes.statusRow}>
        <Box className={classes.statusHead}>
          <Box className={classes.statusIcon} data-tone={tone}>
            {icon}
          </Box>

          <Box className={classes.statusText}>
            <Box className={classes.statusTitle}>{title}</Box>
            {description ? <Box className={classes.statusDescription}>{description}</Box> : null}
          </Box>

          {action}
        </Box>

        <Box className={classes.pills}>
          {items.map((item) => {
            const content = (
              <>
                {item.label} <b>{item.value}</b>
              </>
            );

            if (item.href) {
              return (
                <Link key={item.label} to={item.href} className={classes.pill} data-link="true">
                  {content}
                </Link>
              );
            }

            return (
              <span key={item.label} className={classes.pill}>
                {content}
              </span>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};
