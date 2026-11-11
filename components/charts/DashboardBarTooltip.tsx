import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Stack, Text } from '@mantine/core';
import type { BadgeProps } from '@mantine/core';
import { numberFormat } from '@/_helpers/number';
import { ChartTooltipValue } from './ChartTooltipValue';
import { ChartTooltipHeader } from './tooltip/ChartTooltipHeader';
import { ChartTooltipStatus } from './tooltip/ChartTooltipStatus';
import { ChartTooltipSurface, type ChartTooltipSurfaceProps } from './tooltip/ChartTooltipSurface';

type DashboardBarTooltipPayloadItem = {
  color?: string;
  dataKey?: string | number | ((obj: unknown) => unknown);
  name?: string | number;
  payload?: Record<string, unknown>;
  value?: unknown;
};

export type DashboardBarTooltipSeries = {
  color: string;
  label: string;
  name: string;
};

type DashboardBarTooltipProps = {
  active?: boolean;
  badgeColor?: string;
  badgeProps?: Pick<BadgeProps, 'color' | 'style'>;
  breakdown?: Record<string, number>;
  breakdownLabels?: Record<string, string>;
  description?: string;
  fieldLabel?: ReactNode;
  hideTitle?: boolean;
  hideZeroValues?: boolean;
  label?: ReactNode;
  labelDetails?: ReactNode;
  renderSeriesLabel?: (label: string) => ReactNode;
  payload?: readonly DashboardBarTooltipPayloadItem[];
  series: DashboardBarTooltipSeries[];
  subtitle?: ReactNode;
  listLabel?: string;
  surfaceProps?: Omit<ChartTooltipSurfaceProps, 'children' | 'header'>;
};

type DashboardBarTooltipRow = {
  badgeProps: Pick<BadgeProps, 'color' | 'style'>;
  label: string;
  value: number;
};

const getDashboardBarTooltipValue = (item: DashboardBarTooltipPayloadItem) => {
  if (typeof item.value === 'number') {
    return item.value;
  }

  if (typeof item.value === 'string' && item.value.trim() !== '') {
    return Number(item.value);
  }

  const dataKey = typeof item.dataKey === 'function' ? item.name : (item.dataKey ?? item.name);
  const payloadValue = dataKey ? item.payload?.[String(dataKey)] : undefined;

  return typeof payloadValue === 'number' ? payloadValue : 0;
};

export const DashboardBarTooltip = ({
  active,
  badgeColor,
  badgeProps,
  breakdown,
  breakdownLabels,
  description,
  fieldLabel,
  hideTitle,
  hideZeroValues,
  label,
  labelDetails,
  renderSeriesLabel,
  payload = [],
  series,
  subtitle,
  listLabel,
  surfaceProps,
}: DashboardBarTooltipProps) => {
  const { t } = useTranslation();
  const seriesByName = useMemo(() => {
    const index = new Map<string, DashboardBarTooltipSeries>();
    for (const item of series) {
      const name = item.name;
      if (!index.has(name)) {
        index.set(name, item);
      }
    }
    return index;
  }, [series]);

  if (!active || payload.length === 0) {
    return null;
  }

  const item = payload[0];
  const seriesName = String(item.dataKey ?? item.name);
  const seriesItem = seriesByName.get(seriesName);
  const tooltipBadgeColor = badgeColor ?? seriesItem?.color ?? item.color ?? 'blue';
  const tooltipBadgeProps = badgeProps ?? { color: tooltipBadgeColor };
  const seriesLabel = seriesItem?.label ?? seriesName;
  const rows: DashboardBarTooltipRow[] = breakdown
    ? Object.entries(breakdown)
        .filter(([, rowValue]) => rowValue > 0)
        .map(([rowLabel, rowValue]) => ({
          badgeProps: tooltipBadgeProps,
          label: breakdownLabels?.[rowLabel] ?? rowLabel,
          value: rowValue,
        }))
    : payload.map((payloadItem) => {
        const payloadSeriesName = String(payloadItem.dataKey ?? payloadItem.name);
        const payloadSeriesItem = seriesByName.get(payloadSeriesName);

        return {
          badgeProps: badgeProps ?? {
            color: badgeColor ?? payloadSeriesItem?.color ?? payloadItem.color ?? 'blue',
          },
          label: payloadSeriesItem?.label ?? payloadSeriesName,
          value: getDashboardBarTooltipValue(payloadItem),
        };
      });
  const visibleRows = hideZeroValues ? rows.filter((row) => row.value > 0) : rows;
  const total = breakdown
    ? getDashboardBarTooltipValue(item)
    : visibleRows.reduce((sum, row) => sum + row.value, 0);
  const showHeader = ((fieldLabel || label || labelDetails) && !hideTitle) || subtitle || breakdown;

  return (
    <ChartTooltipSurface
      {...surfaceProps}
      header={
        showHeader && (
          <ChartTooltipHeader
            fieldLabel={!hideTitle ? fieldLabel : undefined}
            title={!hideTitle ? label : undefined}
            details={!hideTitle ? labelDetails : undefined}
            summary={
              (subtitle || breakdown) && (
                <ChartTooltipStatus
                  color={tooltipBadgeColor}
                  label={subtitle ?? seriesLabel}
                  detail={
                    breakdown &&
                    t('label.home.chartTooltipUnitCount', { count: visibleRows.length })
                  }
                />
              )
            }
            total={t('label.home.chartTooltipRequestCount', {
              count: total,
              formattedCount: numberFormat(total),
            })}
          />
        )
      }
    >
      {listLabel && visibleRows.length > 0 && (
        <Text c="dimmed" fw={600} mb={4} size="10px" tt="uppercase">
          {listLabel}
        </Text>
      )}
      <Stack gap={0}>
        {visibleRows.length > 0 ? (
          visibleRows.map((row, index) => (
            <ChartTooltipValue
              key={`${row.label}-${index.toString()}`}
              label={renderSeriesLabel?.(row.label) ?? row.label}
              value={row.value}
              badgeProps={row.badgeProps}
              withDivider={false}
            />
          ))
        ) : (
          <Text size="xs" c="dimmed">
            {t('helper.noData_')}
          </Text>
        )}
      </Stack>
      {description ? (
        <Text
          c="dimmed"
          size="xs"
          mt="xs"
          pt="xs"
          style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}
        >
          {description}
        </Text>
      ) : null}
    </ChartTooltipSurface>
  );
};
