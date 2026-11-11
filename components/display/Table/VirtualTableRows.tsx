import { useCallback, type Key, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Table } from '@mantine/core';

type VirtualRowMeasurement = {
  'data-index': number;
  ref: (element: HTMLTableRowElement | null) => void;
};

type Props<T> = {
  rows: readonly T[];
  viewport: HTMLDivElement | null;
  headerHeight: number;
  columnCount: number;
  getRowKey: (row: T, index: number) => Key;
  renderRow: (row: T, key: Key, measurement: VirtualRowMeasurement) => ReactNode;
};

const initialRect = { width: 0, height: 380 };
const estimateSize = () => 42;

// Keep rows in normal table flow so cells can wrap and be measured at their actual height.
export const VirtualTableRows = <T,>({
  rows,
  viewport,
  headerHeight,
  columnCount,
  getRowKey,
  renderRow,
}: Props<T>) => {
  const getItemKey = useCallback(
    (index: number) => getRowKey(rows[index], index),
    [getRowKey, rows]
  );
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    getScrollElement: () => viewport,
    getItemKey,
    estimateSize,
    initialRect,
    overscan: 6,
    scrollMargin: headerHeight,
  });

  const items = virtualizer.getVirtualItems();
  const top = Math.max(0, (items[0]?.start ?? headerHeight) - headerHeight);
  const bottom = Math.max(
    0,
    virtualizer.getTotalSize() - (items.at(-1)?.end ?? headerHeight) + headerHeight
  );

  return (
    <Table.Tbody>
      {top > 0 && (
        <Table.Tr aria-hidden="true" style={{ border: 0 }}>
          <Table.Td colSpan={columnCount} p={0} h={top} />
        </Table.Tr>
      )}
      {items.map(({ index, key }) =>
        renderRow(rows[index], key, { 'data-index': index, ref: virtualizer.measureElement })
      )}
      {bottom > 0 && (
        <Table.Tr aria-hidden="true" style={{ border: 0 }}>
          <Table.Td colSpan={columnCount} p={0} h={bottom} />
        </Table.Tr>
      )}
    </Table.Tbody>
  );
};
