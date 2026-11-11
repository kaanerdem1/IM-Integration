import { forwardRef, useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type PieLabelRenderProps,
  type PieSectorDataItem,
  type TooltipProps,
} from 'recharts';
import { ChartTooltip } from '@mantine/charts';
import {
  Box,
  Center,
  getThemeColor,
  Paper,
  Text,
  useMantineTheme,
  type BoxProps,
  type MantineColor,
} from '@mantine/core';
import { useChartHighlightKey } from './chartHighlightStore';
import { chartInteractionProps, type ChartOpenEvent } from './chartInteractionProps';
import {
  appRadialChartCornerRadius,
  appSunburstChartDefaultProps,
  mergeChartTooltipProps,
} from './chartProps';
import { radialChartLayout } from './chartTheme';
import {
  getMinimumRadialSegmentAngle,
  getRadialCenterFontSize,
  getRadialRingThickness,
} from './radial/layout';
import { renderAdaptiveRadialSector } from './radial/sector';
import {
  createSunburstRings,
  getSunburstMetadata,
  resolveSunburstNodes,
  type AppSunburstChartData,
  type SunburstRingSegment,
} from './sunburst/layout';
import { ChartTooltipScope } from './tooltip/ChartTooltipScope';

export type { AppSunburstChartData } from './sunburst/layout';

type AppSunburstNativeProps = {
  outerRadius?: number;
  ringPadding?: number;
};

type SunburstLabelsType = 'value' | 'value-percent';

export type AppSunburstChartProps = Omit<BoxProps, 'children'> & {
  chartLabel?: ReactNode;
  chartLabelTitle?: ReactNode;
  children?: ReactNode;
  cornerRadius?: number;
  data: AppSunburstChartData[];
  dataKey?: string;
  descendantRingOpacity?: number;
  endAngle?: number;
  gap?: number;
  innerRadius?: number;
  ringThickness?: number;
  labelsType?: SunburstLabelsType;
  onItemOpen?: (item: AppSunburstChartData, event: ChartOpenEvent) => void;
  getItemDisabledReason?: (item: AppSunburstChartData) => string | undefined;
  rootRingPosition?: 'inner' | 'outer';
  size?: number;
  startAngle?: number;
  strokeColor?: MantineColor;
  sunburstChartProps?: AppSunburstNativeProps;
  tooltipAnimationDuration?: number;
  tooltipProps?: Omit<TooltipProps<number, string>, 'ref'>;
  valueFormatter?: (value: number) => ReactNode;
  withLabels?: boolean;
  withTooltip?: boolean;
};

const sunburstLabelMinimumAngle = 10;
const sunburstValuePercentageLabelMinimumAngle = 16;
const sunburstPercentageFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const defaultValueFormatter = (value: number) => value.toLocaleString();

const formatSunburstPercentage = (percent: number) => {
  const percentage = Number.isFinite(percent) ? Math.max(0, percent * 100) : 0;

  if (percentage > 0 && percentage < 0.1) {
    return `<${sunburstPercentageFormatter.format(0.1)}%`;
  }

  return `${sunburstPercentageFormatter.format(percentage)}%`;
};

const renderSunburstLabel = (
  props: PieLabelRenderProps,
  labelsType: SunburstLabelsType,
  valueFormatter: (value: number) => ReactNode
) => {
  const segment = props.payload as SunburstRingSegment | undefined;

  if (!segment || segment.isPlaceholder) {
    return null;
  }

  const radius = (Number(props.innerRadius) + Number(props.outerRadius)) / 2;
  const angleInRadians = (-Number(props.midAngle) * Math.PI) / 180;
  const x = Number(props.cx) + radius * Math.cos(angleInRadians);
  const y = Number(props.cy) + radius * Math.sin(angleInRadians);
  const valueLabel = valueFormatter(segment.value);
  const percentageLabel = formatSunburstPercentage(Number(props.percent));
  if (typeof valueLabel !== 'string' && typeof valueLabel !== 'number') {
    return null;
  }
  // A label must fit the ring radially as well as the segment's angle.
  const halfWidth =
    Math.max(
      String(valueLabel).length * 7,
      labelsType === 'value-percent' ? percentageLabel.length * 6 : 0
    ) / 2;
  const halfHeight = labelsType === 'value-percent' ? 10 : 6;
  for (const dx of [-halfWidth, halfWidth]) {
    for (const dy of [-halfHeight, halfHeight]) {
      const cornerRadius = Math.hypot(x + dx - Number(props.cx), y + dy - Number(props.cy));
      if (
        cornerRadius < Number(props.innerRadius) + 1 ||
        cornerRadius > Number(props.outerRadius) - 1
      ) {
        return null;
      }
    }
  }

  return (
    <text
      dominantBaseline="central"
      fill="var(--mantine-color-white)"
      fontSize={10}
      fontWeight={700}
      paintOrder="stroke fill"
      pointerEvents="none"
      stroke="var(--mantine-color-body)"
      strokeWidth={2}
      textAnchor="middle"
      x={x}
      y={y}
    >
      {labelsType === 'value-percent' ? (
        <>
          <tspan x={x} dy="-0.4em">
            {valueLabel}
          </tspan>
          <tspan fontSize={8.5} fontWeight={600} opacity={0.9} x={x} dy="1.25em">
            {percentageLabel}
          </tspan>
        </>
      ) : (
        valueLabel
      )}
    </text>
  );
};

export const AppSunburstChart = forwardRef<HTMLDivElement, AppSunburstChartProps>(
  (
    {
      chartLabel,
      chartLabelTitle,
      children,
      cornerRadius = appRadialChartCornerRadius,
      data,
      dataKey = 'value',
      descendantRingOpacity = 1,
      endAngle = 360,
      gap = appSunburstChartDefaultProps.gap,
      innerRadius = appSunburstChartDefaultProps.innerRadius,
      ringThickness,
      labelsType = 'value',
      onItemOpen,
      getItemDisabledReason,
      rootRingPosition = 'inner',
      size = appSunburstChartDefaultProps.size,
      startAngle = 0,
      strokeColor = appSunburstChartDefaultProps.strokeColor,
      sunburstChartProps,
      tooltipAnimationDuration = appSunburstChartDefaultProps.tooltipAnimationDuration,
      tooltipProps,
      valueFormatter = appSunburstChartDefaultProps.valueFormatter ?? defaultValueFormatter,
      withLabels = appSunburstChartDefaultProps.withLabels,
      withTooltip = true,
      ...props
    },
    ref
  ) => {
    const theme = useMantineTheme();
    const highlightedKey = useChartHighlightKey();
    const [hoveredSegment, setHoveredSegment] = useState<SunburstRingSegment | null>(null);
    const resolvedNodes = useMemo(
      () => resolveSunburstNodes(data, dataKey, theme),
      [data, dataKey, theme]
    );
    const { depth, highlightKeys } = useMemo(
      () => getSunburstMetadata(resolvedNodes),
      [resolvedNodes]
    );
    const activeHighlightedKey =
      highlightedKey && highlightKeys.has(highlightedKey) ? highlightedKey : null;
    const dimmedColor = getThemeColor('gray.1', theme);
    const total = useMemo(
      () => resolvedNodes.reduce((sum, node) => sum + node.value, 0),
      [resolvedNodes]
    );
    const ringPadding = Math.max(0, Number(sunburstChartProps?.ringPadding ?? 0));
    const resolvedDescendantRingOpacity = Math.min(1, Math.max(0, Number(descendantRingOpacity)));
    const diameter =
      sunburstChartProps?.outerRadius === undefined
        ? Number(size)
        : sunburstChartProps.outerRadius * 2;
    const ringWidth = Math.max(1, ringThickness ?? getRadialRingThickness(diameter, depth));
    const ringsWidth = ringWidth * depth + Math.max(0, depth - 1) * ringPadding;
    // Shrink the center hole, never the rings. Below this diameter the rings
    // physically cannot fit, so retain their minimum drawable size.
    const outerRadius = Math.max(
      ringsWidth,
      Number(innerRadius),
      Number(sunburstChartProps?.outerRadius ?? Number(size) / 2 - 4)
    );
    const chartSize = Math.max(Number(size), outerRadius * 2 + 8);
    const ringInnerRadius = outerRadius - ringsWidth;
    const centerFontSize = getRadialCenterFontSize(diameter, ringInnerRadius * 2);
    const centerWidth = ringInnerRadius * 2 * radialChartLayout.centerContentWidthRatio;
    const withCenterLabel = ringInnerRadius * 2 >= radialChartLayout.centerMinimumDiameter;
    const chartAngle = Math.min(360, Math.abs(Number(endAngle) - Number(startAngle)));
    const minimumSegmentRatio =
      chartAngle > 0
        ? getMinimumRadialSegmentAngle(ringInnerRadius + ringWidth / 2, gap) / chartAngle
        : 0;
    const rings = useMemo(
      () => createSunburstRings(resolvedNodes, depth, minimumSegmentRatio),
      [resolvedNodes, depth, minimumSegmentRatio]
    );
    const minimumLabelAngle =
      labelsType === 'value-percent'
        ? sunburstValuePercentageLabelMinimumAngle
        : sunburstLabelMinimumAngle;
    const shouldShowLabels = useMemo(() => {
      if (!withLabels || chartAngle <= 0 || total <= 0) {
        return false;
      }

      const pendingNodes = [...resolvedNodes];

      for (let index = 0; index < pendingNodes.length; index += 1) {
        const node = pendingNodes[index];

        if ((node.value / total) * chartAngle < minimumLabelAngle) {
          return false;
        }

        pendingNodes.push(...node.children);
      }

      return pendingNodes.length > 0;
    }, [chartAngle, minimumLabelAngle, resolvedNodes, total, withLabels]);
    const resolvedStrokeColor = getThemeColor(strokeColor, theme);
    const renderLabel = useCallback(
      (labelProps: PieLabelRenderProps) =>
        renderSunburstLabel(
          {
            ...labelProps,
            percent: total > 0 ? Number(labelProps.payload?.value ?? 0) / total : 0,
          },
          labelsType,
          valueFormatter
        ),
      [labelsType, valueFormatter, total]
    );
    const handleSegmentMouseEnter = useCallback((sector: PieSectorDataItem) => {
      const segment = sector.payload as SunburstRingSegment | undefined;

      if (!segment || segment.isPlaceholder) {
        return;
      }

      setHoveredSegment(segment);
    }, []);
    const handleSegmentMouseLeave = useCallback(() => setHoveredSegment(null), []);
    const resolvedTooltipProps = mergeChartTooltipProps(tooltipProps);
    const withHoverDetails = labelsType === 'value-percent';

    // Recharts Sunburst does not expose Sector corner props. Aligned Pie rings let all
    // radial charts share the same adaptive corner and force-corner implementation.
    return (
      <ChartTooltipScope>
        <Box ref={ref} h={chartSize} pos="relative" w={chartSize} {...props}>
          <ResponsiveContainer height="100%" width="100%">
            <PieChart accessibilityLayer>
              {rings.map((ring, ringIndex) => {
                const radiusIndex =
                  rootRingPosition === 'outer' ? rings.length - ringIndex - 1 : ringIndex;
                const resolvedInnerRadius =
                  ringInnerRadius + radiusIndex * (ringWidth + ringPadding);
                const resolvedOuterRadius = resolvedInnerRadius + ringWidth;

                return (
                  <Pie
                    key={ringIndex}
                    cornerRadius={ring.visibleSegmentCount <= 1 ? 0 : cornerRadius}
                    data={ring.segments}
                    dataKey="layoutValue"
                    endAngle={endAngle}
                    innerRadius={resolvedInnerRadius}
                    isAnimationActive={false}
                    label={shouldShowLabels ? renderLabel : false}
                    labelLine={false}
                    nameKey="name"
                    onMouseEnter={withHoverDetails ? handleSegmentMouseEnter : undefined}
                    onMouseLeave={withHoverDetails ? handleSegmentMouseLeave : undefined}
                    outerRadius={resolvedOuterRadius}
                    paddingAngle={0}
                    shape={renderAdaptiveRadialSector}
                    startAngle={startAngle}
                  >
                    {ring.segments.map((segment) => (
                      <Cell
                        key={segment.key}
                        {...(segment.data
                          ? chartInteractionProps(
                              onItemOpen,
                              segment.data,
                              segment.name,
                              getItemDisabledReason?.(segment.data)
                            )
                          : {})}
                        fill={
                          !segment.isPlaceholder &&
                          activeHighlightedKey &&
                          segment.highlightKey !== activeHighlightedKey
                            ? dimmedColor
                            : segment.color
                        }
                        fillOpacity={
                          activeHighlightedKey || ringIndex === 0
                            ? 1
                            : resolvedDescendantRingOpacity
                        }
                        stroke={segment.isPlaceholder ? 'transparent' : resolvedStrokeColor}
                        strokeWidth={
                          segment.isPlaceholder || ring.visibleSegmentCount <= 1 ? 0 : gap
                        }
                        style={{
                          pointerEvents: segment.isPlaceholder ? 'none' : 'auto',
                          cursor:
                            segment.data && getItemDisabledReason?.(segment.data)
                              ? 'not-allowed'
                              : onItemOpen
                                ? 'pointer'
                                : undefined,
                        }}
                      />
                    ))}
                  </Pie>
                );
              })}

              {withTooltip ? (
                <Tooltip
                  animationDuration={tooltipAnimationDuration}
                  isAnimationActive={false}
                  content={({ payload }) => {
                    const segment = payload?.[0]?.payload as SunburstRingSegment | undefined;

                    if (!segment || segment.isPlaceholder) {
                      return null;
                    }
                    const disabledReason = segment.data && getItemDisabledReason?.(segment.data);
                    if (disabledReason) {
                      return (
                        <Paper p="sm" withBorder>
                          <Text size="xs">{disabledReason}</Text>
                        </Paper>
                      );
                    }

                    return (
                      <ChartTooltip
                        payload={[
                          {
                            color: segment.color,
                            name: segment.name,
                            value: segment.value,
                          },
                        ]}
                        type="radial"
                        valueFormatter={
                          labelsType === 'value-percent'
                            ? (value) => (
                                <>
                                  <Text span fw={600}>
                                    {valueFormatter(value)}
                                  </Text>
                                  <Text span c="dimmed" fz="xs" fw={500}>
                                    {' '}
                                    {`(${formatSunburstPercentage(
                                      total > 0 ? segment.value / total : 0
                                    )})`}
                                  </Text>
                                </>
                              )
                            : valueFormatter
                        }
                      />
                    );
                  }}
                  {...resolvedTooltipProps}
                />
              ) : null}
              {children}
            </PieChart>
          </ResponsiveContainer>

          {withCenterLabel && hoveredSegment && withHoverDetails ? (
            <Center inset={0} pos="absolute" style={{ pointerEvents: 'none' }}>
              <Box maw={centerWidth} ta="center">
                <Text
                  fz={radialChartLayout.centerSecondaryFontSize}
                  fw={600}
                  title={hoveredSegment.name}
                  truncate
                >
                  {hoveredSegment.name}
                </Text>
                <Text fz={centerFontSize} fw={800} lh={1.2} truncate>
                  {valueFormatter(hoveredSegment.value)}
                </Text>
                <Text c="dimmed" fz={radialChartLayout.centerSecondaryFontSize} fw={600}>
                  {`(${formatSunburstPercentage(total > 0 ? hoveredSegment.value / total : 0)})`}
                </Text>
              </Box>
            </Center>
          ) : withCenterLabel && chartLabel !== undefined && chartLabel !== null ? (
            <Center inset={0} pos="absolute" style={{ pointerEvents: 'none' }}>
              <Box maw={centerWidth} ta="center">
                {chartLabelTitle ? (
                  <Text c="dimmed" fz={radialChartLayout.centerSecondaryFontSize} fw={600}>
                    {chartLabelTitle}
                  </Text>
                ) : null}
                <Text fw={800} lh={1.2} fz={centerFontSize} truncate>
                  {chartLabel}
                </Text>
              </Box>
            </Center>
          ) : null}
        </Box>
      </ChartTooltipScope>
    );
  }
);

AppSunburstChart.displayName = 'AppSunburstChart';
