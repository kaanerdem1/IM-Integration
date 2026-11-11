import { useTranslation } from 'react-i18next';
import type { TooltipContentProps } from 'recharts';
import { DashboardBarTooltip } from '@/components/charts/DashboardBarTooltip';
import type { SunburstRingSegment } from '@/components/charts/sunburst/layout';
import { useRetainedTooltip } from '@/components/charts/tooltip/useRetainedTooltip';
import { useGraphicLabels } from './useGraphicLabels';

type RadialTooltipItem = { name: string; label: string; color: string; value: number };

export const GraphicRadialTooltip = ({
  active,
  payload,
  coordinate,
  activeIndex,
  items,
  primaryLabel,
  primary = false,
  getDisabledReason,
}: TooltipContentProps<number, string> & {
  items: RadialTooltipItem[];
  primaryLabel?: string;
  primary?: boolean;
  getDisabledReason: (name: string) => string | undefined;
}) => {
  const labels = useGraphicLabels();
  const retained = useRetainedTooltip(Boolean(active && payload.length), {
    payload,
    coordinate,
    activeIndex,
  });
  const name = String(retained.value.payload[0]?.payload?.name ?? '');
  if (!retained.visible || !retained.value.payload.length) {
    return null;
  }
  return (
    <DashboardBarTooltip
      surfaceProps={{
        anchorMode: 'radial',
        radialAnchor: {
          itemId: retained.value.payload[0].graphicalItemId,
          index: retained.value.activeIndex ?? undefined,
        },
        coordinate: retained.value.coordinate,
        onMouseEnter: retained.onMouseEnter,
        onMouseLeave: retained.onMouseLeave,
        onFocus: retained.onFocus,
        onBlur: retained.onBlur,
      }}
      active
      listLabel={primaryLabel ? labels.secondaryFieldLabel : undefined}
      hideZeroValues
      {...(primaryLabel
        ? labels.primary.getTooltipHeading(primaryLabel)
        : { fieldLabel: primary ? labels.primaryFieldLabel : labels.secondaryFieldLabel })}
      payload={items.map((item) => ({ dataKey: item.name, value: item.value }))}
      series={items}
      renderSeriesLabel={(primary ? labels.primary : labels.secondary).renderTooltipLabel}
      description={getDisabledReason(name)}
    />
  );
};

export const GraphicSunburstTooltip = ({
  active,
  payload,
  coordinate,
  activeIndex,
  getDisabledReason,
  total,
}: TooltipContentProps<number, string> & {
  getDisabledReason: (segment: SunburstRingSegment) => string | undefined;
  total: number;
}) => {
  const { t } = useTranslation();
  const labels = useGraphicLabels();
  const retained = useRetainedTooltip(Boolean(active && payload.length), {
    payload,
    coordinate,
    activeIndex,
  });
  const segment = retained.value.payload[0]?.payload as SunburstRingSegment | undefined;
  if (!retained.visible || !segment || segment.isPlaceholder) {
    return null;
  }
  const primaryLabel = segment.data?.primaryLabel;
  const secondaryLabel = segment.data?.secondaryLabel;
  return (
    <DashboardBarTooltip
      surfaceProps={{
        anchorMode: 'radial',
        radialAnchor: {
          itemId: retained.value.payload[0].graphicalItemId,
          index: retained.value.activeIndex ?? undefined,
        },
        coordinate: retained.value.coordinate,
        onMouseEnter: retained.onMouseEnter,
        onMouseLeave: retained.onMouseLeave,
        onFocus: retained.onFocus,
        onBlur: retained.onBlur,
      }}
      active
      listLabel={typeof secondaryLabel === 'string' ? labels.secondaryFieldLabel : undefined}
      {...labels.primary.getTooltipHeading(
        typeof primaryLabel === 'string' ? primaryLabel : segment.name
      )}
      payload={[{ dataKey: 'value', value: segment.value }]}
      series={[
        {
          name: 'value',
          label:
            typeof secondaryLabel === 'string' ? secondaryLabel : t('label.home.requestCountAxis'),
          color: segment.color,
        },
      ]}
      subtitle={
        total > 0
          ? new Intl.NumberFormat(undefined, {
              style: 'percent',
              maximumFractionDigits: 1,
            }).format(segment.value / total)
          : undefined
      }
      renderSeriesLabel={labels.secondary.renderTooltipLabel}
      description={getDisabledReason(segment)}
    />
  );
};
