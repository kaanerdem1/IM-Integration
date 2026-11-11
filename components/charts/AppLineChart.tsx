import { forwardRef, useMemo } from 'react';
import { LineChart, type LineChartProps, type LineChartSeries } from '@mantine/charts';
import { getThemeColor, useMantineTheme } from '@mantine/core';
import { useHighlightedChartItem } from './chartHighlightStore';
import {
  appCartesianChartProps,
  appLineChartDefaultProps,
  mergeChartTooltipProps,
} from './chartProps';
import { chartActiveDotProps } from './chartTheme';
import { ChartTooltipScope } from './tooltip/ChartTooltipScope';

export const AppLineChart = forwardRef<HTMLDivElement, LineChartProps>(
  (
    {
      activeDotProps,
      gridProps,
      lineProps,
      series,
      style,
      textColor,
      tooltipProps,
      xAxisProps,
      yAxisProps,
      ...props
    },
    ref
  ) => {
    const theme = useMantineTheme();
    const highlightedSeriesName = useHighlightedChartItem(series);
    const colorVariableStyle: LineChartProps['style'] = textColor
      ? (theme) => ({ '--chart-text-color': getThemeColor(textColor, theme) })
      : undefined;
    const resolvedLineProps = useMemo<LineChartProps['lineProps']>(() => {
      if (!highlightedSeriesName) {
        return lineProps;
      }

      return (item: LineChartSeries) => {
        const itemProps = typeof lineProps === 'function' ? lineProps(item) : lineProps;
        const activeDot = itemProps?.activeDot ?? {
          ...chartActiveDotProps,
          fill: getThemeColor(item.color, theme),
          ...activeDotProps,
        };

        if (!highlightedSeriesName || item.name === highlightedSeriesName) {
          return { ...itemProps, activeDot };
        }

        return {
          ...itemProps,
          activeDot: false,
          dot: false,
          fillOpacity: 0,
          strokeOpacity: 0.18,
        };
      };
    }, [activeDotProps, highlightedSeriesName, lineProps, theme]);

    return (
      <ChartTooltipScope>
        <LineChart
          ref={ref}
          {...props}
          activeDotProps={activeDotProps}
          gridProps={{ ...appCartesianChartProps.gridProps, ...gridProps }}
          lineProps={resolvedLineProps}
          series={series}
          style={
            colorVariableStyle ? [appLineChartDefaultProps.style, style, colorVariableStyle] : style
          }
          tooltipProps={mergeChartTooltipProps(tooltipProps)}
          xAxisProps={{ ...appCartesianChartProps.xAxisProps, ...xAxisProps }}
          yAxisProps={{ ...appCartesianChartProps.yAxisProps, ...yAxisProps }}
        />
      </ChartTooltipScope>
    );
  }
);

AppLineChart.displayName = 'AppLineChart';
