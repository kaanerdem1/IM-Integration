import { memo, useDeferredValue, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Flex, LoadingOverlay, ScrollArea, Tooltip } from '@mantine/core';
import {
  getRequestDistributionSeriesNamesByPrimaryMetric,
  type RequestDistributionChartModel,
} from '@/_helpers/dashboard/requestDistribution';
import { ChartHighlightProvider } from '@/components/charts/ChartHighlightProvider';
import { ChartLegend, type ChartLegendItem } from '@/components/charts/ChartLegend';
import { ChartScrollArea } from '@/components/charts/ChartScrollArea';
import {
  getAppChartTypeDefinition,
  type AppChartLegendPosition,
} from '@/components/charts/chartTypes';
import { ChartWidthContainer } from '@/components/charts/ChartWidthContainer';
import type { RequestDistributionChartType } from '@/components/dashboard-graphic/types';
import { RequestDistributionCartesianChart } from './cartesian/CartesianChart';
import {
  requestDistributionCategoryMinWidth,
  requestDistributionDonutCardGap,
  requestDistributionDonutCardWidth,
  requestDistributionGroupedBarSlotWidth,
  requestDistributionPrimaryRadialSize,
  requestDistributionSunburstSize,
  requestDistributionVerticalBarLayout,
} from './config';
import { RequestDistributionDonutChart } from './DonutChart';
import { GraphicInteractionProvider } from './GraphicInteractionProvider';
import { GraphicLabelProvider } from './GraphicLabelProvider';
import { RequestDistributionHeatmap } from './Heatmap';
import type { GraphicSelection, OpenGraphicSelection } from './interactions';
import { RequestDistributionLollipopChart } from './LollipopChart';
import { RequestDistributionSunburstChart } from './SunburstChart';
import { useGraphicDisabledReason } from './useGraphicDisabledReason';
import { useGraphicLabels } from './useGraphicLabels';
import { createRequestDistributionPrimaryDonutData } from './utils';

type RequestDistributionChartContentProps = {
  onOpen?: OpenGraphicSelection;
  chartType: RequestDistributionChartType;
  countLabel: string;
  legendLabel: string;
  legendPosition: AppChartLegendPosition;
  model: RequestDistributionChartModel;
  primaryFieldLabel: string;
  secondaryFieldLabel?: string;
  secondaryField: string | null;
  fitToContainer?: boolean;
};

const emptySeriesNamesByPrimaryMetric = new Map<string, readonly string[]>();
const requestDistributionHorizontalChartMinWidth = 720;
const plotHeight = 360;

// Keep form validation and request status updates outside the expensive chart render tree.
const RequestDistributionChartContent = memo(
  ({
    chartType,
    countLabel,
    legendLabel,
    legendPosition,
    model,
    primaryFieldLabel,
    secondaryField,
    onOpen,
    fitToContainer = false,
    containerWidth = 0,
  }: RequestDistributionChartContentProps & { containerWidth?: number }) => {
    const getDisabledReason = useGraphicDisabledReason();
    const labels = useGraphicLabels();
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const availableWidth = containerWidth || 320;
    const chartTypeDefinition = getAppChartTypeDefinition(chartType);
    const isHorizontalBarChart =
      chartTypeDefinition.family === 'bar' && chartTypeDefinition.orientation === 'horizontal';
    const isVerticalBarChart =
      chartTypeDefinition.family === 'bar' && chartTypeDefinition.orientation === 'vertical';
    const seriesNamesByPrimaryMetric = useMemo(
      () =>
        chartTypeDefinition.family === 'bar'
          ? getRequestDistributionSeriesNamesByPrimaryMetric(model.data, model.series)
          : emptySeriesNamesByPrimaryMetric,
      [chartTypeDefinition.family, model.data, model.series]
    );
    const groupedVerticalSlotCount = useMemo(() => {
      if (chartType !== 'grouped-bar') {
        return 0;
      }

      let categoryCount = 0;
      let visibleSeriesCount = 0;

      seriesNamesByPrimaryMetric.forEach((seriesNames) => {
        const itemSeriesCount = seriesNames.length;

        if (itemSeriesCount > 0) {
          categoryCount += 1;
          visibleSeriesCount += itemSeriesCount;
        }
      });

      return visibleSeriesCount + Math.max(0, categoryCount - 1);
    }, [chartType, seriesNamesByPrimaryMetric]);
    const categoryWidth = isVerticalBarChart
      ? requestDistributionVerticalBarLayout.categoryWidth
      : requestDistributionCategoryMinWidth;
    const verticalBarContentWidth =
      chartType === 'grouped-bar'
        ? groupedVerticalSlotCount * requestDistributionGroupedBarSlotWidth
        : model.data.length * requestDistributionVerticalBarLayout.categoryWidth;
    const secondaryDonutContentWidth =
      model.data.length * requestDistributionDonutCardWidth +
      Math.max(0, model.data.length - 1) * requestDistributionDonutCardGap;
    const chartWidth = isHorizontalBarChart
      ? requestDistributionHorizontalChartMinWidth
      : chartType === 'donut' && secondaryField
        ? Math.max(720, secondaryDonutContentWidth)
        : chartType === 'donut' ||
            chartType === 'heatmap' ||
            chartType === 'lollipop' ||
            chartType === 'sunburst'
          ? 720
          : isVerticalBarChart
            ? chartType === 'grouped-bar'
              ? verticalBarContentWidth + requestDistributionVerticalBarLayout.gutter
              : Math.max(
                  requestDistributionVerticalBarLayout.minWidth,
                  verticalBarContentWidth + requestDistributionVerticalBarLayout.gutter
                )
            : Math.max(720, model.data.length * categoryWidth);
    // These are space requirements for the original presentation, not fixed chart widths.
    const isRadialChart = chartType === 'donut' || chartType === 'sunburst';
    const fullPresentationWidth =
      chartType === 'sunburst' && secondaryField
        ? requestDistributionSunburstSize
        : chartType === 'donut' && secondaryField
          ? model.data.length > 1
            ? requestDistributionDonutCardWidth * 2 + requestDistributionDonutCardGap
            : requestDistributionDonutCardWidth
          : isRadialChart
            ? // Mantine reserves 80px; external value/percentage labels need another 40px per edge.
              requestDistributionPrimaryRadialSize + 160
            : chartWidth;
    const isSideLegend =
      (legendPosition === 'left' || legendPosition === 'right') &&
      (!fitToContainer || availableWidth >= fullPresentationWidth + 220);
    const plotWidth = availableWidth - (isSideLegend ? 220 : 0);
    const compact = fitToContainer && plotWidth < fullPresentationWidth;
    const fittedBarChart = fitToContainer && (isHorizontalBarChart || isVerticalBarChart);
    const primaryDonutData = useMemo(
      () =>
        chartType === 'sunburst' || (chartType === 'donut' && !secondaryField)
          ? createRequestDistributionPrimaryDonutData(model)
          : [],
      [chartType, model, secondaryField]
    );
    const legendItems = useMemo<(ChartLegendItem & { selection: GraphicSelection })[]>(
      () =>
        chartType === 'sunburst' || (chartType === 'donut' && !secondaryField)
          ? primaryDonutData.map((item, index) => ({
              color: item.color,
              highlightKey: item.name,
              label: item.label,
              name: `primary_${index.toString()}`,
              value: item.value,
              selection: { primaryMetric: item.primaryMetric },
              disabledReason: getDisabledReason({ primaryMetric: item.primaryMetric }),
            }))
          : model.series.map((item) => ({
              color: item.color,
              highlightKey: item.name,
              label: item.label,
              name: item.name,
              value: item.total,
              selection: { seriesName: item.name },
              disabledReason: getDisabledReason({ seriesName: item.name }),
            })),
      [chartType, model.series, primaryDonutData, secondaryField, getDisabledReason]
    );
    const fittedChartWidth =
      isHorizontalBarChart || ['donut', 'sunburst', 'heatmap', 'lollipop'].includes(chartType)
        ? plotWidth
        : Math.max(
            plotWidth,
            chartType === 'grouped-bar'
              ? groupedVerticalSlotCount * requestDistributionGroupedBarSlotWidth + 100
              : model.data.length * 18 + 100
          );
    const isLegendBeforeChart = legendPosition === 'left' || legendPosition === 'top';
    let chartContent;

    if (chartType === 'donut' || (chartType === 'sunburst' && !secondaryField)) {
      chartContent = (
        <RequestDistributionDonutChart
          model={model}
          primaryData={primaryDonutData}
          secondaryField={secondaryField}
          onOpen={onOpen}
          availableWidth={
            compact
              ? secondaryField
                ? plotWidth
                : Math.min(plotWidth, plotHeight - 32)
              : undefined
          }
        />
      );
    } else if (chartType === 'heatmap') {
      chartContent = (
        <RequestDistributionHeatmap
          availableWidth={fitToContainer ? plotWidth : undefined}
          countLabel={countLabel}
          model={model}
          primaryFieldLabel={primaryFieldLabel}
          onOpen={onOpen}
        />
      );
    } else if (chartType === 'lollipop') {
      chartContent = (
        <RequestDistributionLollipopChart
          countLabel={countLabel}
          model={model}
          onOpen={onOpen}
          availableWidth={fitToContainer ? plotWidth : undefined}
        />
      );
    } else if (chartType === 'sunburst') {
      chartContent = (
        <RequestDistributionSunburstChart
          model={model}
          secondaryField={secondaryField}
          onOpen={onOpen}
          availableWidth={compact ? Math.min(plotWidth, plotHeight - 32) : undefined}
        />
      );
    } else {
      chartContent = (
        <RequestDistributionCartesianChart
          chartContainerRef={chartContainerRef}
          onOpen={onOpen}
          chartType={chartType}
          countLabel={countLabel}
          model={model}
          primaryFieldLabel={primaryFieldLabel}
          seriesNamesByPrimaryMetric={seriesNamesByPrimaryMetric}
          availableWidth={fitToContainer ? fittedChartWidth : undefined}
          availableHeight={compact && !fittedBarChart ? plotHeight - 32 : undefined}
        />
      );
    }

    const chart = (
      <Box
        miw={0}
        w={isSideLegend ? 0 : '100%'}
        style={{ flex: isSideLegend ? '1 1 0' : undefined }}
      >
        <ChartScrollArea
          contentRef={chartContainerRef}
          minWidth={
            compact || fittedBarChart
              ? fittedChartWidth
              : fitToContainer && isRadialChart
                ? chartType === 'donut' && secondaryField
                  ? secondaryDonutContentWidth
                  : fullPresentationWidth
                : chartWidth
          }
        >
          {chartContent}
        </ChartScrollArea>
      </Box>
    );
    const legend =
      chartType === 'lollipop' ? null : (
        <ChartLegend
          ariaLabel={legendLabel}
          containerProps={{
            miw: 0,
            p: 'sm',
            w: isSideLegend ? 220 : '100%',
            style: { flex: isSideLegend ? '0 0 220px' : undefined },
          }}
          items={legendItems}
          labelPresentation={
            chartType === 'sunburst' || (chartType === 'donut' && !secondaryField)
              ? labels.primary
              : labels.secondary
          }
          onItemClick={onOpen ? (item, event) => onOpen(item.selection, event) : undefined}
          onItemAuxClick={
            onOpen
              ? (item, event) => {
                  if (event.button === 1) {
                    onOpen(item.selection, event);
                  }
                }
              : undefined
          }
          orientation={isSideLegend ? 'vertical' : 'horizontal'}
        />
      );

    const content = (
      <ChartHighlightProvider>
        <Flex
          align="stretch"
          direction={isSideLegend ? 'row' : 'column'}
          maw="100%"
          miw={0}
          w="100%"
        >
          {isLegendBeforeChart ? legend : null}
          {chart}
          {isLegendBeforeChart ? null : legend}
        </Flex>
      </ChartHighlightProvider>
    );

    return <Tooltip.Group>{content}</Tooltip.Group>;
  }
);

RequestDistributionChartContent.displayName = 'RequestDistributionChartContent';

const FittedChartContent = (props: RequestDistributionChartContentProps) => (
  <ChartWidthContainer testId="graphic-width-container">
    {(width) => <RequestDistributionChartContent {...props} containerWidth={width} />}
  </ChartWidthContainer>
);

type RequestDistributionVisualizationProps = RequestDistributionChartContentProps & {
  loading?: boolean;
  viewportHeight?: number;
};

export const RequestDistributionVisualization = memo(
  (props: RequestDistributionVisualizationProps) => {
    const { t } = useTranslation();
    // Defer the chart tree, not the overlay, so feedback can paint before an expensive redraw.
    const deferredProps = useDeferredValue(props);
    const { loading: _loading, viewportHeight: _viewportHeight, ...chartProps } = deferredProps;
    const isRendering = props !== deferredProps;
    const isBusy = Boolean(props.loading || isRendering);
    const content = (
      <Box inert={isBusy}>
        <GraphicInteractionProvider
          model={chartProps.model}
          secondaryField={chartProps.secondaryField}
        >
          <GraphicLabelProvider
            primaryFieldLabel={chartProps.primaryFieldLabel}
            secondaryFieldLabel={chartProps.secondaryFieldLabel ?? ''}
          >
            {chartProps.fitToContainer ? (
              <FittedChartContent {...chartProps} />
            ) : (
              <RequestDistributionChartContent {...chartProps} />
            )}
          </GraphicLabelProvider>
        </GraphicInteractionProvider>
      </Box>
    );

    return (
      <Box pos="relative" miw={0} w="100%" aria-busy={isBusy}>
        <LoadingOverlay
          visible={isBusy}
          zIndex={10}
          loaderProps={{ 'aria-label': t('label.home.requestDistributionLoading'), type: 'dots' }}
          overlayProps={{ backgroundOpacity: 0.35, blur: 1, radius: 'sm' }}
          transitionProps={{ duration: 0 }}
        />
        {props.viewportHeight ? (
          <ScrollArea h={props.viewportHeight} scrollbars="y" type="auto" offsetScrollbars="y">
            {content}
          </ScrollArea>
        ) : (
          content
        )}
      </Box>
    );
  }
);

RequestDistributionVisualization.displayName = 'RequestDistributionVisualization';
