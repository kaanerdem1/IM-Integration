import classes from './style.module.scss';
import { Sector } from 'recharts';
import { Box } from '@mantine/core';
import { getDonutSegmentAngleLayout } from '@/components/charts/donut/presentation';
import { getAdaptiveRadialCornerRadius } from '@/components/charts/radial/sector';
import type { BreakdownItem } from './breakdown';
import { BreakdownRows } from './BreakdownRows';

const donutSize = 112;
const donutCenter = donutSize / 2;
const donutRadius = 44;
const donutStrokeWidth = 14;
const donutInnerRadius = donutRadius - donutStrokeWidth / 2;
const donutOuterRadius = donutRadius + donutStrokeWidth / 2;
const donutCornerRadius = 3;
const donutCircumference = 2 * Math.PI * donutRadius;
const donutSegmentGap = 3;
const donutMinimumSegmentLength = 3;

type BreakdownDonutProps = {
  /** Halkanın ortasındaki birim etiketi (ör. "talep") */
  centerLabel: string;
  items: BreakdownItem[];
};

/** Halka grafik + dağılım satırları (tür / SLA durumu gibi paylar) */
export const BreakdownDonut = ({ centerLabel, items }: BreakdownDonutProps) => {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const positiveItems = items.filter((item) => item.count > 0);
  const { minAngle, paddingAngle } = getDonutSegmentAngleLayout({
    chartAngle: 360,
    requestedMinimumAngle: (donutMinimumSegmentLength / donutCircumference) * 360,
    requestedPaddingAngle: (donutSegmentGap / donutCircumference) * 360,
    segmentCount: positiveItems.length,
  });
  const excessAngles = positiveItems.map((item) =>
    Math.max(0, (item.count / total) * 360 - paddingAngle - minAngle)
  );
  const totalExcessAngle = excessAngles.reduce((sum, angle) => sum + angle, 0);
  const remainingAngle = 360 - positiveItems.length * (minAngle + paddingAngle);
  let offset = 0;
  const segments = positiveItems.map((item, index) => {
    // Redistribute only the room above the minimum; real counts stay unchanged.
    const angle = minAngle + (excessAngles[index] / totalExcessAngle) * remainingAngle;
    const segment = {
      color: item.color,
      startAngle: -offset,
      endAngle: -(offset + angle),
      label: item.label,
    };

    offset += angle + paddingAngle;

    return segment;
  });

  return (
    <Box className={classes.donutLayout}>
      <Box className={classes.donut}>
        <svg
          width={donutSize}
          height={donutSize}
          viewBox={`0 0 ${donutSize} ${donutSize}`}
          aria-hidden
        >
          <circle
            cx={donutCenter}
            cy={donutCenter}
            r={donutRadius}
            fill="none"
            stroke="var(--mantine-color-gray-1)"
            strokeWidth={donutStrokeWidth}
          />
          {segments.map((segment) => (
            <Sector
              key={segment.label}
              data-testid="breakdown-donut-segment"
              cx={donutCenter}
              cy={donutCenter}
              innerRadius={donutInnerRadius}
              outerRadius={donutOuterRadius}
              fill={segment.color}
              startAngle={segment.startAngle}
              endAngle={segment.endAngle}
              cornerRadius={getAdaptiveRadialCornerRadius({
                innerRadius: donutInnerRadius,
                outerRadius: donutOuterRadius,
                requestedCornerRadius: donutCornerRadius,
                startAngle: segment.startAngle,
                endAngle: segment.endAngle,
              })}
              forceCornerRadius
            />
          ))}
        </svg>
        <Box className={classes.donutCenter}>
          <Box className={classes.donutValue}>{total}</Box>
          <Box className={classes.donutLabel}>{centerLabel}</Box>
        </Box>
      </Box>

      <Box className={classes.donutRows}>
        <BreakdownRows items={items} total={total} />
      </Box>
    </Box>
  );
};
