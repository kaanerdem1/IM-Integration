import classes from './style.module.scss';
import { Link } from 'react-router';
import { Box } from '@mantine/core';
import { chartLegendMarkerStyle } from '@/components/charts/chartTheme';
import { getBreakdownPercent, type BreakdownItem } from './breakdown';

type BreakdownRowsProps = {
  items: BreakdownItem[];
  total: number;
};

/** Renk işareti + etiket + yüzde + sayı satırları (havuz / tür dağılımı) */
export const BreakdownRows = ({ items, total }: BreakdownRowsProps) => {
  return (
    <Box className={classes.breakdownRows}>
      {items.map((item) => {
        const content = (
          <>
            <span aria-hidden style={{ ...chartLegendMarkerStyle, background: item.color }} />
            <span
              className={classes.breakdownLabel}
              title={item.description ? `${item.label} (${item.description})` : item.label}
            >
              {item.label}
              {item.description ? (
                <span className={classes.breakdownDescription}>({item.description})</span>
              ) : null}
            </span>
            <span className={classes.breakdownPct}>%{getBreakdownPercent(item.count, total)}</span>
            <span className={classes.breakdownValue}>{item.count}</span>
          </>
        );

        if (item.href) {
          return (
            <Link key={item.label} to={item.href} className={classes.breakdownRow} data-link="true">
              {content}
            </Link>
          );
        }

        return (
          <Box key={item.label} className={classes.breakdownRow}>
            {content}
          </Box>
        );
      })}
    </Box>
  );
};
