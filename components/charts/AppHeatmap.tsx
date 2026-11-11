import { useMemo, type MouseEvent, type ReactNode } from 'react';
import {
  Box,
  getThemeColor,
  Group,
  rgba,
  ScrollArea,
  Text,
  Tooltip,
  UnstyledButton,
  useMantineTheme,
  type MantineColor,
} from '@mantine/core';
import { useChartHighlightKey } from './chartHighlightStore';
import { chartInteractionProps, type ChartOpenEvent } from './chartInteractionProps';
import type { ChartLabelPresentation } from './chartLabelPresentation';
import {
  chartElementTooltipProps,
  chartTooltipTitleProps,
  heatmapChartLayout,
  horizontalChartLabelLayout,
} from './chartTheme';
import { ChartTooltipValue } from './ChartTooltipValue';
import { getHorizontalChartLayout } from './horizontalChartLayout';
import { ChartTooltipCard } from './tooltip/ChartTooltipCard';
import { ChartTooltipHeader } from './tooltip/ChartTooltipHeader';
import { ChartTooltipPopover } from './tooltip/ChartTooltipPopover';

export type AppHeatmapCellContext<TRow, TColumn> = {
  column: TColumn;
  columnIndex: number;
  row: TRow;
  rowIndex: number;
  value: number;
};

export type AppHeatmapProps<TRow, TColumn> = {
  ariaLabel: string;
  availableWidth?: number;
  cellMinWidth?: number;
  columns: readonly TColumn[];
  columnHeaderLabel: string;
  valueLabel?: string;
  compact?: boolean;
  formatColumnTotal?: (value: number) => ReactNode;
  formatRowTotal?: (value: number) => ReactNode;
  formatTooltipTotal?: (value: number) => ReactNode;
  formatValue?: (value: number) => ReactNode;
  getCellValue: (row: TRow, column: TColumn, columnIndex: number) => number;
  getCellDisabledReason?: (row: TRow, column: TColumn) => string | undefined;
  getColumnDisabledReason?: (column: TColumn) => string | undefined;
  getRowDisabledReason?: (row: TRow) => string | undefined;
  getColumnColor: (column: TColumn) => MantineColor;
  getColumnKey: (column: TColumn) => string;
  getColumnLabel: (column: TColumn) => string;
  getColumnTotal: (column: TColumn) => number;
  getRowKey: (row: TRow) => string;
  getRowLabel: (row: TRow) => string;
  getRowTotal: (row: TRow) => number;
  maxHeight?: number;
  maxValue?: number;
  minHeight?: number;
  onRowOpen?: (row: TRow, event: ChartOpenEvent) => void;
  onColumnOpen?: (column: TColumn, event: ChartOpenEvent) => void;
  onCellAuxClick?: (
    context: AppHeatmapCellContext<TRow, TColumn>,
    event: MouseEvent<HTMLButtonElement>
  ) => void;
  onCellClick?: (
    context: AppHeatmapCellContext<TRow, TColumn>,
    event: MouseEvent<HTMLButtonElement>
  ) => void;
  renderCellTooltip?: (context: AppHeatmapCellContext<TRow, TColumn>) => ReactNode;
  rowHeaderColumn?: string;
  rowHeaderWidth?: number;
  rowLabelPresentation?: ChartLabelPresentation;
  columnLabelPresentation?: ChartLabelPresentation;
  rows: readonly TRow[];
};

const normalizeHeatmapValue = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0);

const getHeatmapOpacity = (value: number, maxValue: number) => {
  if (value <= 0 || maxValue <= 0) {
    return 0;
  }

  return Math.min(0.92, Math.max(0.24, 0.24 + (value / maxValue) * 0.68));
};

const defaultFormatTotal = (value: number) => `(${value.toLocaleString()})`;
const defaultFormatValue = (value: number) => value.toLocaleString();

export const AppHeatmap = <TRow, TColumn>({
  ariaLabel,
  availableWidth,
  cellMinWidth = heatmapChartLayout.cellMinWidth,
  columns,
  columnHeaderLabel,
  valueLabel,
  compact = false,
  formatColumnTotal = defaultFormatTotal,
  formatRowTotal = defaultFormatTotal,
  formatTooltipTotal,
  formatValue = defaultFormatValue,
  getCellValue,
  getCellDisabledReason,
  getColumnDisabledReason,
  getRowDisabledReason,
  getColumnColor,
  getColumnKey,
  getColumnLabel,
  getColumnTotal,
  getRowKey,
  getRowLabel,
  getRowTotal,
  maxHeight,
  maxValue,
  minHeight,
  onCellAuxClick,
  onCellClick,
  onRowOpen,
  onColumnOpen,
  renderCellTooltip,
  rowHeaderColumn,
  rowHeaderWidth,
  rowLabelPresentation,
  columnLabelPresentation,
  rows,
}: AppHeatmapProps<TRow, TColumn>) => {
  const theme = useMantineTheme();
  const highlightedColumnKey = useChartHighlightKey();
  // Hover updates only affect opacity; cache static accessors and normalized values.
  const columnMetadata = useMemo(
    () =>
      columns.map((column, columnIndex) => ({
        color: getColumnColor(column),
        column,
        columnIndex,
        key: getColumnKey(column),
        label: getColumnLabel(column),
        total: getColumnTotal(column),
      })),
    [columns, getColumnColor, getColumnKey, getColumnLabel, getColumnTotal]
  );
  const rowMetadata = useMemo(
    () =>
      rows.map((row, rowIndex) => ({
        key: getRowKey(row),
        label: getRowLabel(row),
        row,
        rowIndex,
        total: getRowTotal(row),
      })),
    [getRowKey, getRowLabel, getRowTotal, rows]
  );
  const cellValues = useMemo(
    () =>
      rows.map((row) =>
        columnMetadata.map(({ column, columnIndex }) =>
          normalizeHeatmapValue(getCellValue(row, column, columnIndex))
        )
      ),
    [columnMetadata, getCellValue, rows]
  );
  const hasHighlightedColumn =
    highlightedColumnKey !== null &&
    columnMetadata.some((column) => column.key === highlightedColumnKey);
  const resolvedMaxValue = useMemo(() => {
    if (maxValue !== undefined) {
      return normalizeHeatmapValue(maxValue);
    }

    let maximum = 0;

    cellValues.forEach((rowValues) => {
      rowValues.forEach((value) => {
        maximum = Math.max(maximum, value);
      });
    });

    return maximum;
  }, [cellValues, maxValue]);

  const gap = heatmapChartLayout.columnGap;
  const cellsWidth =
    Math.max(1, columns.length) * cellMinWidth + Math.max(0, columns.length - 1) * gap;
  const layout = getHorizontalChartLayout(availableWidth, {
    markHeight: heatmapChartLayout.cellHeight,
    rightMargin: 0,
    minPlotWidth: Math.max(horizontalChartLabelLayout.minPlotWidth, cellsWidth),
  });
  const resolvedRowHeaderWidth = rowHeaderWidth ?? layout.labelWidth;
  const gridTemplateColumns = `${layout.above ? '' : `${rowHeaderColumn ?? `${resolvedRowHeaderWidth}px`} `}repeat(${columns.length}, minmax(${cellMinWidth}px, 1fr))`;
  const minWidth = cellsWidth + (layout.above ? 0 : resolvedRowHeaderWidth + gap);
  const content = (
    <Box
      aria-label={ariaLabel}
      data-testid="graphic-heatmap"
      data-label-placement={layout.above ? 'above' : 'left'}
      mih={minHeight}
      miw={minWidth}
      role="table"
    >
      <Box
        pb={compact ? 5 : 'xs'}
        role="row"
        style={{
          backgroundColor: 'var(--mantine-color-body)',
          borderBottom: '1px solid var(--mantine-color-gray-2)',
          display: 'grid',
          gap,
          gridTemplateColumns,
          position: maxHeight === undefined ? undefined : 'sticky',
          top: maxHeight === undefined ? undefined : 0,
          zIndex: maxHeight === undefined ? undefined : 2,
        }}
      >
        {!layout.above && (
          <Text
            c="dimmed"
            fw={700}
            px={compact ? 4 : 'xs'}
            role="columnheader"
            size={compact ? '10px' : 'xs'}
          >
            {columnHeaderLabel}
          </Text>
        )}
        {columnMetadata.map((column) => {
          const disabledReason = getColumnDisabledReason?.(column.column);
          const isDimmed = hasHighlightedColumn && column.key !== highlightedColumnKey;

          return (
            <Tooltip
              {...chartElementTooltipProps}
              key={column.key}
              label={
                disabledReason ?? (
                  <>
                    {columnLabelPresentation?.renderTooltipLabel?.(column.label, 'tick') ?? (
                      <Text {...chartTooltipTitleProps} c="inherit">
                        {column.label}
                      </Text>
                    )}
                    {valueLabel ? (
                      <ChartTooltipValue label={valueLabel} value={column.total.toLocaleString()} />
                    ) : (
                      ` (${column.total.toLocaleString()})`
                    )}
                  </>
                )
              }
              interactive
            >
              <Box
                miw={0}
                {...chartInteractionProps(
                  onColumnOpen,
                  column.column,
                  column.label,
                  disabledReason
                )}
                role="columnheader"
                ta="center"
                style={{
                  opacity: isDimmed ? 0.2 : 1,
                  cursor: disabledReason ? 'not-allowed' : onColumnOpen ? 'pointer' : undefined,
                  transition: 'opacity 120ms ease',
                }}
              >
                <Group gap={compact ? 3 : 5} justify="center" miw={0} wrap="nowrap">
                  <Box
                    bg={column.color}
                    h={compact ? 6 : 8}
                    w={compact ? 6 : 8}
                    style={{ borderRadius: '50%', flex: '0 0 auto' }}
                  />
                  <Text fw={700} size={compact ? '9px' : 'xs'} truncate>
                    {columnLabelPresentation?.renderTickLabel?.(column.label) ??
                      columnLabelPresentation?.formatLabel?.(column.label) ??
                      column.label}
                  </Text>
                </Group>
                <Text c="dimmed" fw={compact ? 400 : 700} size={compact ? '9px' : '10px'}>
                  {formatColumnTotal(column.total)}
                </Text>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {rowMetadata.map((row) => {
        const disabledReason = getRowDisabledReason?.(row.row);
        const tooltipHeading = rowLabelPresentation?.getTooltipHeading?.(row.label);
        return (
          <Box
            key={row.key}
            py={horizontalChartLabelLayout.rowGap / 2}
            role="row"
            style={{
              borderTop: row.rowIndex === 0 ? undefined : '1px dashed var(--mantine-color-gray-2)',
              display: 'grid',
              gap,
              rowGap: horizontalChartLabelLayout.aboveGap,
              gridTemplateColumns,
            }}
          >
            <Tooltip
              {...chartElementTooltipProps}
              label={
                disabledReason ?? (
                  <>
                    {rowLabelPresentation?.renderTooltipLabel?.(row.label, 'tick') ?? (
                      <Text {...chartTooltipTitleProps} c="inherit">
                        {row.label}
                      </Text>
                    )}
                    {valueLabel ? (
                      <ChartTooltipValue label={valueLabel} value={row.total.toLocaleString()} />
                    ) : (
                      ` (${row.total.toLocaleString()})`
                    )}
                  </>
                )
              }
              interactive
            >
              <Group
                {...chartInteractionProps(onRowOpen, row.row, row.label, disabledReason)}
                gap={compact ? 3 : 4}
                miw={0}
                w={layout.above ? availableWidth : '100%'}
                maw="100%"
                px={horizontalChartLabelLayout.leftMargin}
                role="rowheader"
                wrap="nowrap"
                align={layout.above ? 'flex-start' : 'center'}
                style={{
                  gridColumn: layout.above ? '1 / -1' : undefined,
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  backgroundColor: 'var(--mantine-color-body)',
                  boxSizing: 'border-box',
                }}
              >
                <Text
                  fw={compact ? 500 : 550}
                  size={compact ? '10px' : 'xs'}
                  lh={1.4}
                  truncate={!layout.above}
                  style={{ minWidth: 0, overflowWrap: 'anywhere' }}
                >
                  {rowLabelPresentation?.renderTickLabel?.(row.label) ??
                    rowLabelPresentation?.formatLabel?.(row.label) ??
                    row.label}
                </Text>
                <Text
                  c="dimmed"
                  fw={700}
                  size={compact ? '9px' : '10px'}
                  style={{ flex: '0 0 auto', marginLeft: layout.above ? 'auto' : undefined }}
                >
                  {formatRowTotal(row.total)}
                </Text>
              </Group>
            </Tooltip>

            {columnMetadata.map((column) => {
              const cellDisabledReason = getCellDisabledReason?.(row.row, column.column);
              const tooltipListLabel = columnLabelPresentation?.getTooltipHeading?.(
                column.label
              ).fieldLabel;
              const value = cellValues[row.rowIndex]?.[column.columnIndex] ?? 0;
              const opacity = getHeatmapOpacity(value, resolvedMaxValue);
              const context = {
                column: column.column,
                columnIndex: column.columnIndex,
                row: row.row,
                rowIndex: row.rowIndex,
                value,
              };
              const backgroundColor =
                value > 0
                  ? rgba(getThemeColor(column.color, theme), opacity)
                  : 'var(--mantine-color-default-hover)';
              const color =
                value > 0 && opacity >= 0.62
                  ? 'var(--mantine-color-white)'
                  : 'var(--mantine-color-text)';
              const cellStyle = {
                alignItems: 'center',
                backgroundColor,
                borderRadius: 'var(--mantine-radius-sm)',
                color,
                display: 'flex',
                justifyContent: 'center',
                minHeight: heatmapChartLayout.cellHeight,
                width: '100%',
              } as const;
              const isInteractive = value > 0 && Boolean(onCellClick || onCellAuxClick);
              const isDimmed = hasHighlightedColumn && column.key !== highlightedColumnKey;
              const cellContent = isInteractive ? (
                <UnstyledButton
                  aria-label={`${row.label}, ${column.label}: ${value.toLocaleString()}`}
                  aria-disabled={Boolean(cellDisabledReason) || undefined}
                  aria-description={cellDisabledReason}
                  onAuxClick={
                    cellDisabledReason ? undefined : (event) => onCellAuxClick?.(context, event)
                  }
                  onClick={
                    cellDisabledReason ? undefined : (event) => onCellClick?.(context, event)
                  }
                  style={{ ...cellStyle, cursor: cellDisabledReason ? 'not-allowed' : undefined }}
                >
                  <Text fw={750} size={compact ? '10px' : 'xs'}>
                    {formatValue(value)}
                  </Text>
                </UnstyledButton>
              ) : (
                <Box
                  aria-label={`${row.label}, ${column.label}: ${value.toLocaleString()}`}
                  style={cellStyle}
                >
                  <Text fw={value > 0 ? 750 : 600} size={compact ? '10px' : 'xs'}>
                    {formatValue(value)}
                  </Text>
                </Box>
              );

              return (
                <Box
                  key={`${row.key}-${column.key}`}
                  role="cell"
                  style={{
                    opacity: isDimmed ? 0.2 : 1,
                    transition: 'opacity 120ms ease',
                  }}
                >
                  <ChartTooltipPopover
                    content={
                      <ChartTooltipCard
                        header={
                          !cellDisabledReason &&
                          !renderCellTooltip && (
                            <ChartTooltipHeader
                              fieldLabel={tooltipHeading?.fieldLabel ?? columnHeaderLabel}
                              title={tooltipHeading ? tooltipHeading.label : row.label}
                              details={tooltipHeading?.labelDetails}
                              total={formatTooltipTotal?.(value)}
                            />
                          )
                        }
                      >
                        {cellDisabledReason ? (
                          <Text size="xs">{cellDisabledReason}</Text>
                        ) : (
                          (renderCellTooltip?.(context) ?? (
                            <>
                              {tooltipListLabel && (
                                <Text c="dimmed" fw={600} mb={4} size="10px" tt="uppercase">
                                  {tooltipListLabel}
                                </Text>
                              )}
                              <ChartTooltipValue
                                label={
                                  columnLabelPresentation?.renderTooltipLabel?.(column.label) ??
                                  column.label
                                }
                                value={value.toLocaleString()}
                                withDivider={false}
                              />
                            </>
                          ))
                        )}
                      </ChartTooltipCard>
                    }
                  >
                    {cellContent}
                  </ChartTooltipPopover>
                </Box>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );

  if (maxHeight !== undefined) {
    return (
      <ScrollArea.Autosize mah={maxHeight} scrollbars="y" type="auto">
        {content}
      </ScrollArea.Autosize>
    );
  }

  return content;
};
