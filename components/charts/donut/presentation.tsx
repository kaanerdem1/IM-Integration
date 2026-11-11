import { Curve, type CurveProps, type PieLabelRenderProps } from 'recharts';
import { radialChartLayout } from '../chartTheme';

const desiredMinimumSegmentAngle = 6;
const segmentGapAngleBudgetRatio = 0.15;
const minimumLabelSeparationAngle = 10;
const labelOffsetRadius = 12;
const labelTextGap = 4;
const percentageFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });

type DonutSegmentAngleLayoutOptions = {
  chartAngle: number;
  requestedMinimumAngle?: number;
  requestedPaddingAngle: number;
  segmentCount: number;
};

export const getDonutSegmentAngleLayout = ({
  chartAngle,
  requestedMinimumAngle = desiredMinimumSegmentAngle,
  requestedPaddingAngle,
  segmentCount,
}: DonutSegmentAngleLayoutOptions) => {
  if (segmentCount <= 1 || chartAngle <= 0) {
    return { minAngle: 0, paddingAngle: 0 };
  }

  // Preserve room for proportional angles while keeping every positive segment visible.
  return {
    minAngle: Math.min(
      requestedMinimumAngle,
      (chartAngle * radialChartLayout.minimumAngleBudgetRatio) / segmentCount
    ),
    paddingAngle: Math.min(
      requestedPaddingAngle,
      (chartAngle * segmentGapAngleBudgetRatio) / segmentCount
    ),
  };
};

export const formatDonutPercentage = (percent: number) => {
  const percentage = percent * 100;

  if (percentage > 0 && percentage < 0.1) {
    return `<${percentageFormatter.format(0.1)}%`;
  }

  return `${percentageFormatter.format(percentage)}%`;
};

type DonutLabelCandidate = {
  index: number;
  midAngle: number;
  minimumDistance: number;
  selected: boolean;
  value: number;
};

const getAngleDistance = (left: number, right: number, chartAngle: number) => {
  const distance = Math.abs(left - right);

  return chartAngle >= 360 ? Math.min(distance, 360 - distance) : distance;
};

export const getDonutLabelIndexes = (
  data: readonly { value: number }[],
  maxLabels: number | undefined,
  withLabels: boolean | undefined,
  chartAngle: number
) => {
  const resolvedChartAngle = Math.min(360, Math.abs(chartAngle));
  const total = data.reduce((sum, item) => {
    const value = Number(item.value);

    return sum + (Number.isFinite(value) && value > 0 ? value : 0);
  }, 0);

  if (withLabels !== true || total <= 0 || resolvedChartAngle <= 0) {
    return new Set<number>();
  }

  let currentAngle = 0;
  const candidates: DonutLabelCandidate[] = [];

  data.forEach((item, index) => {
    const value = Number(item.value);

    if (!Number.isFinite(value) || value <= 0) {
      return;
    }

    const segmentAngle = (value / total) * resolvedChartAngle;
    candidates.push({
      index,
      midAngle: currentAngle + segmentAngle / 2,
      minimumDistance: Number.POSITIVE_INFINITY,
      selected: false,
      value,
    });
    currentAngle += segmentAngle;
  });

  if (candidates.length <= 1) {
    return new Set<number>();
  }

  if (maxLabels === undefined) {
    return new Set(candidates.map((candidate) => candidate.index));
  }

  const labelLimit = Math.min(candidates.length, Math.max(0, Math.floor(maxLabels)));
  const selectedIndexes = new Set<number>();

  // The dashboard limits label count to a small constant. This O(n * limit) pass
  // favors larger values and spreads equal values around the ring without sorting.
  while (selectedIndexes.size < labelLimit) {
    let selectedCandidate: DonutLabelCandidate | undefined;

    candidates.forEach((candidate) => {
      if (candidate.selected || candidate.minimumDistance < minimumLabelSeparationAngle) {
        return;
      }

      if (
        !selectedCandidate ||
        candidate.value > selectedCandidate.value ||
        (candidate.value === selectedCandidate.value &&
          candidate.minimumDistance > selectedCandidate.minimumDistance)
      ) {
        selectedCandidate = candidate;
      }
    });

    if (!selectedCandidate) {
      break;
    }

    const confirmedCandidate = selectedCandidate;

    confirmedCandidate.selected = true;
    selectedIndexes.add(confirmedCandidate.index);

    candidates.forEach((candidate) => {
      if (candidate.selected) {
        return;
      }

      candidate.minimumDistance = Math.min(
        candidate.minimumDistance,
        getAngleDistance(candidate.midAngle, confirmedCandidate.midAngle, resolvedChartAngle)
      );
    });
  }

  return selectedIndexes;
};

export type DonutLabelLineRenderProps = CurveProps & {
  cx?: number | string;
  cy?: number | string;
  index: number;
  midAngle?: number;
  outerRadius?: number | string;
};

export type DonutLabelLineStyle = Pick<
  CurveProps,
  'className' | 'stroke' | 'strokeDasharray' | 'strokeWidth'
>;

const getDonutLabelPoint = (
  cx: number | string | undefined,
  cy: number | string | undefined,
  midAngle: number | undefined,
  radius: number
) => {
  const resolvedCx = Number(cx);
  const resolvedCy = Number(cy);
  const resolvedMidAngle = Number(midAngle);

  if (
    !Number.isFinite(resolvedCx) ||
    !Number.isFinite(resolvedCy) ||
    !Number.isFinite(resolvedMidAngle) ||
    !Number.isFinite(radius)
  ) {
    return null;
  }

  const angleInRadians = (-resolvedMidAngle * Math.PI) / 180;

  return {
    x: resolvedCx + radius * Math.cos(angleInRadians),
    y: resolvedCy + radius * Math.sin(angleInRadians),
  };
};

export const renderDonutLabelLine = (
  props: DonutLabelLineRenderProps,
  labelIndexes: ReadonlySet<number>,
  style?: DonutLabelLineStyle
) => {
  if (!labelIndexes.has(props.index)) {
    return <g aria-hidden="true" />;
  }

  const outerRadius = Number(props.outerRadius);
  const startPoint = getDonutLabelPoint(props.cx, props.cy, props.midAngle, outerRadius);
  const endPoint = getDonutLabelPoint(
    props.cx,
    props.cy,
    props.midAngle,
    outerRadius + labelOffsetRadius
  );

  if (!startPoint || !endPoint) {
    return <g aria-hidden="true" />;
  }

  return (
    <Curve
      className={style?.className ?? 'recharts-pie-label-line'}
      fill="none"
      points={[startPoint, endPoint]}
      stroke={style?.stroke ?? props.stroke}
      strokeDasharray={style?.strokeDasharray}
      strokeWidth={style?.strokeWidth ?? props.strokeWidth}
      type="linear"
    />
  );
};

export const renderDonutValuePercentageLabel = (
  { cx, cy, index, midAngle, outerRadius, percent, value }: PieLabelRenderProps,
  labelIndexes?: ReadonlySet<number>
) => {
  const resolvedValue = Number(value);
  const resolvedPercent = Number(percent);
  const labelPoint = getDonutLabelPoint(
    cx,
    cy,
    Number(midAngle),
    Number(outerRadius) + labelOffsetRadius + labelTextGap
  );

  if (resolvedValue <= 0 || !labelPoint || (labelIndexes && !labelIndexes.has(index))) {
    return null;
  }

  return (
    <text
      dominantBaseline="central"
      fill="var(--chart-labels-color, var(--mantine-color-dimmed))"
      fontFamily="var(--mantine-font-family)"
      fontSize={12}
      textAnchor={labelPoint.x > Number(cx) ? 'start' : 'end'}
      x={labelPoint.x}
      y={labelPoint.y}
    >
      <tspan fontWeight={600}>{resolvedValue.toLocaleString()}</tspan>
      <tspan fontSize={11} fontWeight={500} opacity={0.8}>
        {' '}
        ({formatDonutPercentage(resolvedPercent)})
      </tspan>
    </text>
  );
};
