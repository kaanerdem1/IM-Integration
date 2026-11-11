import { cloneElement } from 'react';
import type { BarShapeProps } from 'recharts';
import {
  createMinimumStackedBarLayout,
  getMinimumBarSize,
  renderBarWithValueLabel,
} from '@/components/charts/bar/presentation';
import { barChartBarProps } from '@/components/charts/chartTheme';
import { chartHighlightOpacity } from '@/components/charts/useChartHighlightVariables';
import {
  requestDistributionHorizontalBarHeight,
  requestDistributionVerticalBarWidth,
} from '../config';
import {
  graphicInteractionProps,
  type GraphicSelection,
  type OpenGraphicSelection,
} from '../interactions';
import { requestDistributionGroupedSeriesNameKey } from './groupedLayout';

type RequestDistributionBarLayout =
  'horizontal-bars' | 'horizontal-rows' | 'vertical-columns' | 'vertical-slots';

export type RequestDistributionBarOrder = {
  seriesNames: readonly string[];
};

type RequestDistributionBarPropsOptions = {
  getDisabledReason?: (selection: GraphicSelection) => string | undefined;
  onOpen?: OpenGraphicSelection;
  highlightVariables?: ReadonlyMap<string, string>;
  layout: RequestDistributionBarLayout;
  orderByPrimaryMetric: ReadonlyMap<string, RequestDistributionBarOrder>;
  stacked: boolean;
};

const getRequestDistributionBarOrder = (
  props: BarShapeProps,
  orderByPrimaryMetric: RequestDistributionBarPropsOptions['orderByPrimaryMetric']
) => {
  const primaryMetric = props.payload?.primaryMetric;

  if (typeof primaryMetric !== 'string') {
    return undefined;
  }

  return orderByPrimaryMetric.get(primaryMetric);
};

export const getRequestDistributionBarProps = (options: RequestDistributionBarPropsOptions) => {
  const orientation =
    options.layout === 'vertical-columns' || options.layout === 'vertical-slots'
      ? 'vertical'
      : 'horizontal';
  const getStackedShapeProps = createMinimumStackedBarLayout({
    orientation,
    fitToPlot: true,
    getSeriesNames: (props) =>
      getRequestDistributionBarOrder(props, options.orderByPrimaryMetric)?.seriesNames,
  });
  const standardBarSize =
    orientation === 'vertical'
      ? requestDistributionVerticalBarWidth
      : requestDistributionHorizontalBarHeight;
  const usesGroupedSlots =
    options.layout === 'horizontal-rows' || options.layout === 'vertical-slots';

  return (series: { name: string }) => ({
    ...barChartBarProps,
    ...(options.stacked || usesGroupedSlots ? { barSize: standardBarSize } : {}),
    minPointSize: options.stacked
      ? 0
      : (value: number | null | undefined) => getMinimumBarSize(value ?? 0, orientation),
    shape: (props: BarShapeProps) => {
      const value = Number(props.payload?.[series.name] ?? 0);

      if (value <= 0) {
        return null;
      }

      let shapeProps = options.stacked ? getStackedShapeProps(props, series.name) : props;

      const groupedSeriesName = usesGroupedSlots
        ? props.payload?.[requestDistributionGroupedSeriesNameKey]
        : undefined;
      const groupedColor = usesGroupedSlots ? props.payload?.color : undefined;

      if (typeof groupedColor === 'string') {
        shapeProps = {
          ...shapeProps,
          fill: groupedColor,
        };
      }

      const highlightVariable =
        typeof groupedSeriesName === 'string'
          ? options.highlightVariables?.get(groupedSeriesName)
          : undefined;

      if (highlightVariable) {
        shapeProps = {
          ...shapeProps,
          fillOpacity: chartHighlightOpacity(highlightVariable, shapeProps.fillOpacity ?? 1, 0.1),
          strokeOpacity: chartHighlightOpacity(
            highlightVariable,
            shapeProps.strokeOpacity ?? 0,
            0.2
          ),
        };
      }

      const shape = renderBarWithValueLabel(shapeProps, value);
      const selection = {
        primaryMetric: props.payload?.primaryMetric,
        seriesName: typeof groupedSeriesName === 'string' ? groupedSeriesName : series.name,
      };
      return shape
        ? cloneElement(
            shape,
            graphicInteractionProps(
              options.onOpen,
              selection,
              `${props.payload?.primaryLabel ?? props.payload?.primaryMetric}: ${value}`,
              options.getDisabledReason?.(selection)
            )
          )
        : null;
    },
  });
};
