import type { DotProps } from 'recharts';
import type { RequestDistributionChartDatum } from '@/_helpers/dashboard/requestDistribution';
import { graphicInteractionProps, type OpenGraphicSelection } from '../interactions';
import { useGraphicDisabledReason } from '../useGraphicDisabledReason';

type GraphicPointProps = DotProps & {
  active?: boolean;
  color: string;
  onOpen?: OpenGraphicSelection;
  payload?: RequestDistributionChartDatum;
  seriesName: string;
};

export const GraphicPoint = ({
  active,
  color,
  cx,
  cy,
  onOpen,
  payload,
  seriesName,
}: GraphicPointProps) => {
  const getDisabledReason = useGraphicDisabledReason();
  if (!payload || Number(payload[seriesName] ?? 0) <= 0 || cx === undefined || cy === undefined) {
    return null;
  }
  return (
    <g
      {...graphicInteractionProps(
        onOpen,
        { primaryMetric: payload.primaryMetric, seriesName },
        `${payload.primaryLabel ?? payload.primaryMetric}: ${payload[seriesName]}`,
        getDisabledReason({ primaryMetric: payload.primaryMetric, seriesName })
      )}
    >
      <circle cx={cx} cy={cy} r={9} fill="transparent" />
      <circle
        cx={cx}
        cy={cy}
        r={active ? 5 : 3}
        fill={color}
        stroke="var(--mantine-color-body)"
        strokeWidth={2}
      />
    </g>
  );
};
