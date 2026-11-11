import type { CSSProperties } from 'react';
import type { IConfig, IScaleConfig, IZoomConfig } from '@svar-ui/react-gantt';
import { getQuarter } from 'date-fns';
import i18next from 'i18next';
import type { MantineColor, MantineColorShade } from '@mantine/core';
import { getDate } from '@/_helpers/date';

export const ganttChartConfig = {
  cellHeight: 34,
  mainPlan: {
    color: 'blue' satisfies MantineColor,
    shade: 4 satisfies MantineColorShade,
  },
  scaleHeight: 30,
} as const;

export const ganttChartMainPlanBadgeColor =
  `${ganttChartConfig.mainPlan.color}.${ganttChartConfig.mainPlan.shade}` satisfies MantineColor;

export const ganttChartColorVariables = {
  '--workflow-gantt-main-plan': `var(--mantine-color-${ganttChartConfig.mainPlan.color}-${ganttChartConfig.mainPlan.shade})`,
} as CSSProperties;

export const workflowGanttScaleModes = {
  daily: 'daily',
  monthly: 'monthly',
  weekly: 'weekly',
} as const;

export type WorkflowGanttScaleMode =
  (typeof workflowGanttScaleModes)[keyof typeof workflowGanttScaleModes];

type WorkflowGanttScalePreset = Pick<Required<IConfig>, 'cellWidth' | 'scales'> & {
  zoom: IZoomConfig;
};

const createWorkflowGanttScalePreset = (
  cellWidth: number,
  minimumCellWidth: number,
  maximumCellWidth: number,
  scales: IScaleConfig[]
): WorkflowGanttScalePreset => ({
  cellWidth,
  scales,
  zoom: {
    level: 0,
    levels: [
      {
        minCellWidth: minimumCellWidth,
        maxCellWidth: maximumCellWidth,
        scales,
      },
    ],
  },
});

export const workflowGanttScalePresets = {
  [workflowGanttScaleModes.daily]: createWorkflowGanttScalePreset(50, 25, 200, [
    {
      unit: 'month',
      step: 1,
      format: (date) => getDate(date, 'MMM yyyy'),
    },
    {
      unit: 'day',
      step: 1,
      format: (date) => getDate(date, 'd'),
    },
  ]),
  [workflowGanttScaleModes.weekly]: createWorkflowGanttScalePreset(84, 56, 336, [
    {
      unit: 'month',
      step: 1,
      format: (date) => getDate(date, 'MMM yyyy'),
    },
    {
      unit: 'week',
      step: 1,
      format: (date) => getDate(date, 'd MMM'),
    },
  ]),
  [workflowGanttScaleModes.monthly]: createWorkflowGanttScalePreset(248, 248, 600, [
    {
      unit: 'year',
      step: 1,
      format: (date) => getDate(date, 'yyyy'),
    },
    {
      unit: 'quarter',
      step: 1,
      format: (date) =>
        i18next.t('label.requests.workflow.timeline.scaleMode.quarter', {
          value: getQuarter(date),
        }),
    },
    {
      unit: 'month',
      step: 1,
      format: (date) => getDate(date, 'MMM'),
    },
  ]),
} satisfies Record<WorkflowGanttScaleMode, WorkflowGanttScalePreset>;
