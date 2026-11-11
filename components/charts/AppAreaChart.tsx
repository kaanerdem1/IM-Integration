import { forwardRef, useMemo } from 'react';
import { AreaChart, type AreaChartProps, type AreaChartSeries } from '@mantine/charts';
import { getThemeColor, useMantineTheme } from '@mantine/core';
import { useHighlightedChartItem } from './chartHighlightStore';
import { appCartesianChartProps, mergeChartTooltipProps } from './chartProps';
import { chartActiveDotProps } from './chartTheme';
import { ChartTooltipScope } from './tooltip/ChartTooltipScope';

export const AppAreaChart = forwardRef<HTMLDivElement, AreaChartProps>(
  (
    {
      activeDotProps,
      areaProps,
      gridProps,
      series,
      tooltipProps,
      xAxisProps,
      yAxisProps,
      ...props
    },
    ref
  ) => {
    const theme = useMantineTheme();
    const highlightedSeriesName = useHighlightedChartItem(series);
    const resolvedAreaProps = useMemo<AreaChartProps['areaProps']>(() => {
      return (item: AreaChartSeries) => {
        const itemProps = typeof areaProps === 'function' ? areaProps(item) : areaProps;
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
    }, [activeDotProps, areaProps, highlightedSeriesName, theme]);

    return (
      <ChartTooltipScope>
        <AreaChart
          ref={ref}
          {...props}
          activeDotProps={activeDotProps}
          areaProps={resolvedAreaProps}
          gridProps={{ ...appCartesianChartProps.gridProps, ...gridProps }}
          series={series}
          tooltipProps={mergeChartTooltipProps(tooltipProps)}
          xAxisProps={{ ...appCartesianChartProps.xAxisProps, ...xAxisProps }}
          yAxisProps={{ ...appCartesianChartProps.yAxisProps, ...yAxisProps }}
        />
      </ChartTooltipScope>
    );
  }
);

AppAreaChart.displayName = 'AppAreaChart';
