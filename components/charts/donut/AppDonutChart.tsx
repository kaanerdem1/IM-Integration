import {
  cloneElement,
  forwardRef,
  isValidElement,
  useMemo,
  type ReactNode,
  type SVGProps,
} from 'react';
import { DonutChart, type DonutChartCell, type DonutChartProps } from '@mantine/charts';
import { getThemeColor, Tooltip } from '@mantine/core';
import { useHighlightedChartItem } from '../chartHighlightStore';
import { chartInteractionProps, type ChartOpenEvent } from '../chartInteractionProps';
import {
  appDonutChartCellProps,
  appDonutChartDefaultProps,
  mergeChartTooltipProps,
} from '../chartProps';
import { chartElementTooltipProps, radialChartLayout } from '../chartTheme';
import {
  getMinimumRadialSegmentAngle,
  getRadialCenterFontSize,
  getRadialRingThickness,
} from '../radial/layout';
import { renderAdaptiveRadialSector } from '../radial/sector';
import { ChartTooltipScope } from '../tooltip/ChartTooltipScope';
import {
  formatDonutPercentage,
  getDonutLabelIndexes,
  getDonutSegmentAngleLayout,
  renderDonutLabelLine,
  renderDonutValuePercentageLabel,
  type DonutLabelLineRenderProps,
  type DonutLabelLineStyle,
} from './presentation';

type AppDonutChartDatum = DonutChartCell & { label?: string };

export type AppDonutChartProps = Omit<
  DonutChartProps,
  'labelsType' | 'chartLabel' | 'data' | 'cellProps'
> & {
  chartLabel?: ReactNode;
  chartLabelTitle?: string;
  data: AppDonutChartDatum[];
  onItemOpen?: (item: AppDonutChartDatum, event: ChartOpenEvent) => void;
  getItemDisabledReason?: (item: AppDonutChartDatum) => string | undefined;
  cellProps?:
    | ((item: AppDonutChartDatum) => Partial<Omit<SVGProps<SVGElement>, 'ref'>>)
    | Partial<Omit<SVGProps<SVGElement>, 'ref'>>;
  labelsType?: DonutChartProps['labelsType'] | 'value-percent';
  maxLabels?: number;
};

const defaultDonutSize = 160;
const centerLabelCharacterWidth = radialChartLayout.centerSecondaryFontSize * 0.65;

const getDonutLabelLineStyle = (labelLine: unknown): DonutLabelLineStyle | undefined => {
  if (!labelLine || typeof labelLine !== 'object' || isValidElement(labelLine)) {
    return undefined;
  }

  const { className, stroke, strokeDasharray, strokeWidth } = labelLine as DonutLabelLineStyle;

  return { className, stroke, strokeDasharray, strokeWidth };
};

const truncateCenterLabel = (label: string, maxLength: number) => {
  if (label.length <= maxLength) {
    return label;
  }

  return `${label.slice(0, Math.max(1, maxLength - 1))}…`;
};

export const AppDonutChart = forwardRef<HTMLDivElement, AppDonutChartProps>(
  (
    {
      cellProps,
      chartLabel,
      chartLabelTitle,
      children,
      data,
      endAngle = 360,
      labelColor,
      labelsType,
      maxLabels,
      onItemOpen,
      getItemDisabledReason,
      paddingAngle = appDonutChartDefaultProps.paddingAngle,
      pieProps,
      size = defaultDonutSize,
      startAngle = 0,
      style,
      strokeWidth = appDonutChartDefaultProps.strokeWidth,
      thickness = getRadialRingThickness(size),
      tooltipProps,
      withLabels,
      withLabelsLine,
      ...props
    },
    ref
  ) => {
    const highlightedSegmentName = useHighlightedChartItem(data);
    const colorVariableStyle: DonutChartProps['style'] = labelColor
      ? (theme) => ({ '--chart-labels-color': getThemeColor(labelColor, theme) })
      : undefined;
    const visibleSegmentCount = useMemo(
      () => data.reduce((count, item) => count + (item.value > 0 ? 1 : 0), 0),
      [data]
    );
    const total = useMemo(
      () => data.reduce((sum, item) => sum + Math.max(0, item.value), 0),
      [data]
    );
    const highlightedSegment = useMemo(
      () => data.find((item) => item.name === highlightedSegmentName),
      [data, highlightedSegmentName]
    );
    const chartAngle = Math.min(360, Math.abs(Number(endAngle) - Number(startAngle)));
    const labelIndexes = useMemo(
      () => getDonutLabelIndexes(data, maxLabels, withLabels, chartAngle),
      [chartAngle, data, maxLabels, withLabels]
    );
    const shouldShowLabels = labelIndexes.size > 0;
    const innerDiameter = Math.max(0, size - Number(thickness) * 2);
    const centerWidth = innerDiameter * radialChartLayout.centerContentWidthRatio;
    const centerFontSize = getRadialCenterFontSize(size, innerDiameter);
    const centerLabelMaxLength = Math.max(1, Math.floor(centerWidth / centerLabelCharacterWidth));
    const centerValue = highlightedSegment
      ? highlightedSegment.value.toLocaleString()
      : typeof chartLabel === 'string' || typeof chartLabel === 'number'
        ? String(chartLabel)
        : total.toLocaleString();
    const centerValueWidth = centerValue.length * centerFontSize * 0.65;
    const centerTitle = highlightedSegment
      ? truncateCenterLabel(
          highlightedSegment.label ?? highlightedSegment.name,
          centerLabelMaxLength
        )
      : chartLabelTitle;
    const resolvedPieProps = useMemo<DonutChartProps['pieProps']>(() => {
      const resolvedStartAngle = Number(pieProps?.startAngle ?? startAngle);
      const resolvedEndAngle = Number(pieProps?.endAngle ?? endAngle);
      const chartAngle = Math.min(360, Math.abs(resolvedEndAngle - resolvedStartAngle));
      const requestedPaddingAngle = Math.abs(Number(pieProps?.paddingAngle ?? paddingAngle ?? 0));
      const angleLayout = getDonutSegmentAngleLayout({
        chartAngle,
        requestedMinimumAngle:
          pieProps?.minAngle === undefined
            ? getMinimumRadialSegmentAngle((size - Number(thickness)) / 2, Number(strokeWidth))
            : Math.abs(Number(pieProps.minAngle)),
        requestedPaddingAngle,
        segmentCount: visibleSegmentCount,
      });
      const valuePercentageLabelProps =
        shouldShowLabels && labelsType === 'value-percent' && pieProps?.label === undefined
          ? {
              label: (labelProps: Parameters<typeof renderDonutValuePercentageLabel>[0]) => {
                const item = data[labelProps.index];
                const label = renderDonutValuePercentageLabel(
                  { ...labelProps, percent: total > 0 && item ? item.value / total : 0 },
                  labelIndexes
                );
                return label && item ? (
                  <Tooltip
                    {...chartElementTooltipProps}
                    label={getItemDisabledReason?.(item)}
                    disabled={!getItemDisabledReason?.(item)}
                  >
                    <g
                      {...chartInteractionProps(
                        onItemOpen,
                        item,
                        `${item.label ?? item.name}: ${item.value}`,
                        getItemDisabledReason?.(item)
                      )}
                    >
                      {label}
                    </g>
                  </Tooltip>
                ) : (
                  label
                );
              },
              labelLine: (lineProps: DonutLabelLineRenderProps) => {
                const requestedLabelLine = pieProps?.labelLine;

                if (typeof requestedLabelLine === 'function') {
                  return labelIndexes.has(lineProps.index) ? (
                    requestedLabelLine(lineProps)
                  ) : (
                    <g aria-hidden="true" />
                  );
                }

                if (isValidElement<DonutLabelLineRenderProps>(requestedLabelLine)) {
                  return labelIndexes.has(lineProps.index) ? (
                    cloneElement(requestedLabelLine, lineProps)
                  ) : (
                    <g aria-hidden="true" />
                  );
                }

                return renderDonutLabelLine(
                  lineProps,
                  labelIndexes,
                  getDonutLabelLineStyle(requestedLabelLine)
                );
              },
            }
          : {};

      return {
        ...appDonutChartDefaultProps.pieProps,
        ...pieProps,
        ...valuePercentageLabelProps,
        cornerRadius:
          visibleSegmentCount <= 1
            ? 0
            : (pieProps?.cornerRadius ?? appDonutChartDefaultProps.pieProps.cornerRadius),
        minAngle: angleLayout.minAngle,
        paddingAngle: angleLayout.paddingAngle,
        shape: pieProps?.shape ?? renderAdaptiveRadialSector,
        ...(shouldShowLabels ? {} : { label: false, labelLine: false }),
      };
    }, [
      data,
      onItemOpen,
      getItemDisabledReason,
      endAngle,
      labelsType,
      labelIndexes,
      paddingAngle,
      pieProps,
      shouldShowLabels,
      startAngle,
      size,
      strokeWidth,
      thickness,
      total,
      visibleSegmentCount,
    ]);
    const resolvedCellProps = useMemo<DonutChartProps['cellProps']>(() => {
      const baseCellProps = cellProps ?? appDonutChartCellProps;

      return (item: AppDonutChartDatum) => ({
        ...(typeof baseCellProps === 'function' ? baseCellProps(item) : baseCellProps),
        ...chartInteractionProps(
          onItemOpen,
          item,
          item.label ?? item.name,
          getItemDisabledReason?.(item)
        ),
        ...(highlightedSegmentName
          ? { fillOpacity: item.name === highlightedSegmentName ? 1 : 0.2 }
          : {}),
      });
    }, [cellProps, highlightedSegmentName, onItemOpen, getItemDisabledReason]);

    return (
      <ChartTooltipScope>
        <DonutChart
          ref={ref}
          {...props}
          cellProps={resolvedCellProps}
          data={data}
          endAngle={endAngle}
          labelsType={labelsType === 'value-percent' ? 'value' : labelsType}
          paddingAngle={resolvedPieProps?.paddingAngle}
          pieProps={resolvedPieProps}
          size={size}
          startAngle={startAngle}
          style={colorVariableStyle ? [style, colorVariableStyle] : style}
          strokeWidth={visibleSegmentCount <= 1 ? 0 : strokeWidth}
          thickness={thickness}
          tooltipProps={mergeChartTooltipProps(tooltipProps)}
          withLabels={shouldShowLabels}
          withLabelsLine={shouldShowLabels && (withLabelsLine ?? true)}
        >
          {innerDiameter >= radialChartLayout.centerMinimumDiameter &&
          chartLabel !== undefined &&
          chartLabel !== null ? (
            <text
              dominantBaseline="middle"
              fill="var(--mantine-color-gray-8)"
              fontFamily="var(--mantine-font-family)"
              pointerEvents="none"
              textAnchor="middle"
              x="50%"
              y="50%"
            >
              {centerTitle ? (
                <tspan
                  fontSize={radialChartLayout.centerSecondaryFontSize}
                  fontWeight={600}
                  x="50%"
                  dy={-(centerFontSize / 2 + 8)}
                >
                  {centerTitle}
                </tspan>
              ) : null}
              <tspan
                fontSize={centerFontSize}
                fontWeight={800}
                x="50%"
                dy={centerTitle ? centerFontSize / 2 + 8 : 0}
                textLength={centerValueWidth > centerWidth ? centerWidth : undefined}
                lengthAdjust="spacingAndGlyphs"
              >
                {highlightedSegment ? centerValue : chartLabel}
              </tspan>
              {highlightedSegment ? (
                <tspan
                  fontSize={radialChartLayout.centerSecondaryFontSize}
                  fontWeight={600}
                  opacity={0.75}
                  x="50%"
                  dy={centerFontSize / 2 + 8}
                >
                  ({formatDonutPercentage(total > 0 ? highlightedSegment.value / total : 0)})
                </tspan>
              ) : null}
            </text>
          ) : null}
          {children}
        </DonutChart>
      </ChartTooltipScope>
    );
  }
);

AppDonutChart.displayName = 'AppDonutChart';
