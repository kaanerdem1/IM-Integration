import type { ReactNode } from 'react';
import classes from './style.module.scss';
import type { TablerIcon } from '@tabler/icons-react';
import clsx from 'clsx';
import { Box, Table, Tooltip, type TableScrollContainerProps } from '@mantine/core';
import { LoaderOrNoData } from '@/components/display/Nodata/LoaderOrNo';

type TableCardProps = {
  children: ReactNode;
  /** Kart çerçevesine eklenecek yerleşim sınıfı (dış boşluk, yükseklik vb.) */
  className?: string;
  emptyIcon?: TablerIcon;
  emptyText?: string;
  /** Kart bulunduğu alanı doldurur; kaydırma kartın içinde kalır */
  fill?: boolean;
  hasData: boolean;
  isLoading?: boolean;
  /** Kaydırma alanının en fazla yüksekliği; verilmezse tablo kendi boyunda büyür */
  maxHeight?: number | string;
  minWidth?: number | string;
  scrollAreaProps?: TableScrollContainerProps['scrollAreaProps'];
};

/** Yuvarlatılmış çerçeve içinde kaydırılabilir tablo; boş ve yükleniyor durumlarını da kapsar */
export const TableCard = ({
  children,
  className,
  emptyIcon,
  emptyText,
  fill = false,
  hasData,
  isLoading = false,
  maxHeight,
  minWidth = '100%',
  scrollAreaProps,
}: TableCardProps) => (
  <Box
    bd={hasData ? undefined : 0}
    className={clsx(classes.card, fill && classes.fill, className)}
    data-empty={!hasData || undefined}
  >
    <LoaderOrNoData
      fallbackProps={fill ? { h: '100%', mih: 0 } : undefined}
      hasData={hasData}
      icon={emptyIcon}
      loading={isLoading}
      noDataProps={fill ? { w: 'auto' } : undefined}
      text={emptyText}
    >
      <Table.ScrollContainer
        minWidth={minWidth}
        maxHeight={maxHeight}
        scrollAreaProps={scrollAreaProps}
        flex={fill ? 1 : undefined}
        h={fill ? 0 : undefined}
        mih={fill ? 0 : undefined}
      >
        <Tooltip.Group openDelay={250} closeDelay={0}>
          {children}
        </Tooltip.Group>
      </Table.ScrollContainer>
    </LoaderOrNoData>
  </Box>
);
