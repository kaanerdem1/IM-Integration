import type { ReactNode } from 'react';
import classes from './style.module.scss';
import type { TablerIcon } from '@tabler/icons-react';
import { Box, Pagination } from '@mantine/core';
import { TableCard } from '@/components/display/TableCard';

type ListPageProps = { children: ReactNode };

// Sayfa kökü: kabuk içeriğini doldurur, başlık/gövde/altlık dikey sıralanır
export const ListPage = ({ children }: ListPageProps) => (
  <Box className={classes.listPage} data-list-page w="100%">
    {children}
  </Box>
);

// Gövde: başlıktan kalan alanı tablo kartı ve altlık paylaşır.
export const ListPageBody = ({ children }: ListPageProps) => (
  <Box className={classes.listBody}>{children}</Box>
);

type ListTableCardProps = {
  children: ReactNode;
  emptyIcon?: TablerIcon;
  emptyText?: string;
  hasData: boolean;
  isLoading: boolean;
  minWidth?: number;
};

// Tablo kalan alanı doldurur; kaydırma kartın içinde kalır.
export const ListTableCard = ({
  children,
  emptyIcon,
  emptyText,
  hasData,
  isLoading,
  minWidth = 500,
}: ListTableCardProps) => (
  <TableCard
    className={classes.tableArea}
    emptyIcon={emptyIcon}
    emptyText={emptyText}
    fill
    hasData={hasData}
    isLoading={isLoading}
    minWidth={minWidth}
  >
    {children}
  </TableCard>
);

type ListPageFooterProps = {
  disabled?: boolean;
  pageNumber: number;
  totalPages: number;
  onPageChange: (pageNumber: number) => void;
};

// Yapışkan sayfalama altlığı; tek sayfada gösterilmez
export const ListPageFooter = ({
  disabled,
  pageNumber,
  totalPages,
  onPageChange,
}: ListPageFooterProps) => {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <Box className={classes.listFooter}>
      <Pagination
        size="sm"
        radius="xl"
        total={totalPages}
        value={pageNumber + 1}
        onChange={(value) => onPageChange(value - 1)}
        disabled={disabled}
      />
    </Box>
  );
};
