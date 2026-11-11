import { forwardRef, useMemo, useRef } from 'react';
import { BarChart, type BarChartProps, type BarChartSeries } from '@mantine/charts';
import { getThemeColor, useMantineTheme } from '@mantine/core';
import { useMergedRef } from '@mantine/hooks';
import {
  appBarChartDefaultProps,
  appCartesianChartProps,
  mergeChartTooltipProps,
} from './chartProps';
import { ChartTooltipScope } from './tooltip/ChartTooltipScope';
import { chartHighlightOpacity, useChartHighlightVariables } from './useChartHighlightVariables';

export type AppBarChartProps = BarChartProps & {
  withLegendHighlight?: boolean;
};

export const AppBarChart = forwardRef<HTMLDivElement, AppBarChartProps>(
  (
    {
      barLabelColor,
      barProps,
      cursorFill,
      fillOpacity,
      gridProps,
      series,
      style,
      tooltipProps,
      withLegendHighlight = true,
      xAxisProps,
      yAxisProps,
      ...props
    },
    ref
  ) => {
    const theme = useMantineTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const mergedRef = useMergedRef(ref, containerRef);
    const highlightVariables = useChartHighlightVariables(
      containerRef,
      series,
      withLegendHighlight
    );
    const defaultFillOpacity =
      fillOpacity ?? theme.components.BarChart?.defaultProps?.fillOpacity ?? 1;
    const colorVariableStyle: BarChartProps['style'] =
      cursorFill || barLabelColor
        ? (theme) => ({
            '--chart-bar-label-color': barLabelColor
              ? getThemeColor(barLabelColor, theme)
              : undefined,
            '--chart-cursor-fill': cursorFill ? getThemeColor(cursorFill, theme) : undefined,
          })
        : undefined;
    const resolvedBarProps = useMemo<BarChartProps['barProps']>(() => {
      if (!withLegendHighlight) {
        return barProps;
      }

      return (item: BarChartSeries) => {
        const itemProps = typeof barProps === 'function' ? barProps(item) : barProps;

        const variable = highlightVariables.get(item.name);

        if (!variable) {
          return itemProps ?? {};
        }

        return {
          ...itemProps,
          fillOpacity: chartHighlightOpacity(
            variable,
            itemProps?.fillOpacity ?? defaultFillOpacity,
            0.1
          ),
          strokeOpacity: chartHighlightOpacity(variable, itemProps?.strokeOpacity ?? 0, 0.2),
        };
      };
    }, [barProps, defaultFillOpacity, highlightVariables, withLegendHighlight]);

    return (
      <ChartTooltipScope>
        <BarChart
          ref={mergedRef}
          {...props}
          barProps={resolvedBarProps}
          fillOpacity={fillOpacity}
          gridProps={{ ...appCartesianChartProps.gridProps, ...gridProps }}
          series={series}
          style={
            colorVariableStyle ? [appBarChartDefaultProps.style, style, colorVariableStyle] : style
          }
          tooltipProps={mergeChartTooltipProps(tooltipProps)}
          xAxisProps={{ ...appCartesianChartProps.xAxisProps, ...xAxisProps }}
          yAxisProps={{ ...appCartesianChartProps.yAxisProps, ...yAxisProps }}
        />
      </ChartTooltipScope>
    );
  }
);

AppBarChart.displayName = 'AppBarChart';
