import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentProps, CSSProperties } from 'react';

import '@svar-ui/react-gantt/all.css';

import classes from './style.module.scss';
import { Gantt, Willow, type IApi, type TMethodsConfig } from '@svar-ui/react-gantt';
import clsx from 'clsx';
import { Box } from '@mantine/core';
import type { BoxProps } from '@mantine/core';
import {
  ganttChartColorVariables,
  ganttChartConfig,
} from '@/components/workflow-gantt/ganttChartConfig';
import { GanttZoom } from './GanttZoom';

type SvarEventName<Action extends string> = Action extends `${infer Head}-${infer Tail}`
  ? `${Capitalize<Head>}${SvarEventName<Tail>}`
  : Capitalize<Action>;

// SVAR 2.8 emits onResizeGrid etc., but its typings allow lowercase names and arbitrary on* props.
export type GanttChartConfig = Omit<ComponentProps<typeof Gantt>, `on${string}`> & {
  [Action in keyof TMethodsConfig as `on${SvarEventName<Action>}`]?: (
    event: TMethodsConfig[Action]
  ) => void;
};

type Props = {
  barSize?: 'compact' | 'expanded';
  className?: string;
  config: GanttChartConfig;
  height?: BoxProps['h'];
  testId: string;
  withZoom?: boolean;
  zoomTestId?: string;
};

const GanttChartComponent = ({
  barSize = 'compact',
  className,
  config,
  height = '100%',
  testId,
  withZoom = false,
  zoomTestId = `${testId}-zoom-controls`,
}: Props) => {
  const apiRef = useRef<IApi | null>(null);
  const cellHeight = config.cellHeight ?? ganttChartConfig.cellHeight;
  const [renderedGridWidth, setRenderedGridWidth] = useState(config.gridWidth ?? 0);
  const ganttStyle = useMemo(
    () =>
      ({
        ...ganttChartColorVariables,
        '--gantt-cell-height': `${cellHeight}px`,
      }) as CSSProperties,
    [cellHeight]
  );
  const onInit = config.init;
  const onResizeGrid = config.onResizeGrid;

  useEffect(() => {
    setRenderedGridWidth(config.gridWidth ?? 0);
  }, [config.gridWidth]);

  const handleInit = useCallback(
    (api: IApi) => {
      apiRef.current = api;
      onInit?.(api);
    },
    [onInit]
  );
  const handleGridResize = useCallback(
    (resizeConfig: TMethodsConfig['resize-grid']) => {
      setRenderedGridWidth((currentWidth) =>
        currentWidth === resizeConfig.width ? currentWidth : resizeConfig.width
      );
      onResizeGrid?.(resizeConfig);
    },
    [onResizeGrid]
  );

  return (
    <Willow fonts={false}>
      <Box
        className={clsx(classes.gantt, className, {
          [classes.expandedBars]: barSize === 'expanded',
        })}
        data-testid={testId}
        h={height}
        miw={0}
        style={ganttStyle}
        w="100%"
      >
        <Gantt
          cellBorders="full"
          cellHeight={cellHeight}
          durationUnit="hour"
          lengthUnit="hour"
          readonly
          scaleHeight={ganttChartConfig.scaleHeight}
          unscheduledTasks
          {...config}
          init={handleInit}
          onResizeGrid={handleGridResize}
        />
        {withZoom ? (
          <GanttZoom apiRef={apiRef} gridWidth={renderedGridWidth} testId={zoomTestId} />
        ) : null}
      </Box>
    </Willow>
  );
};

export const GanttChart = memo(GanttChartComponent);
