import { createElement, type CSSProperties } from 'react';
import type { IApi, IColumnConfig, IGanttTask, IScaleConfig, ITask } from '@svar-ui/react-gantt';
import type { TFunction } from 'i18next';
import { Text } from '@mantine/core';
import type { GanttChartResponse } from '@/_api/_core/api-gen/types';
import { getDate, normalizeTimestampToMilliseconds } from '@/_helpers/date';
import { slaStatusPresentations, type ActiveSlaStatusKey } from '@/_helpers/sla';
import {
  ganttChartConfig,
  ganttChartMainPlanBadgeColor,
  workflowGanttScaleModes,
  workflowGanttScalePresets,
} from '@/components/workflow-gantt/ganttChartConfig';
import type { WorkflowGanttScaleMode } from '@/components/workflow-gantt/ganttChartConfig';
import { workflowGanttSlaTaskTypeIds, type WorkflowGanttTimelineRange } from '../workflowGanttData';

export { workflowGanttScaleModes, workflowGanttScalePresets };
export type { WorkflowGanttScaleMode };

export const workflowGanttModes = {
  actual: 'actual',
  general: 'general',
  planned: 'planned',
} as const;

export type WorkflowGanttMode = (typeof workflowGanttModes)[keyof typeof workflowGanttModes];

type WorkflowGanttColumnModel = Pick<
  GanttChartResponse,
  'CurrentEndDate' | 'CurrentStartDate' | 'EndDate' | 'Sla' | 'StartDate' | 'StepName'
>;

type WorkflowGanttColumnConfig = Omit<IColumnConfig, 'id'> & {
  id: keyof WorkflowGanttColumnModel;
};

export const workflowGanttConfig = {
  actualBar: {
    minimumWidth: 8,
  },
  cellHeight: ganttChartConfig.cellHeight,
  headerAndScrollbarHeight: 88,
  mainPlan: ganttChartConfig.mainPlan,
  minimumHeight: 360,
  scaleHeight: ganttChartConfig.scaleHeight,
} as const;

export const workflowGanttMainPlanBadgeColor = ganttChartMainPlanBadgeColor;

const getScalePeriodEnd = (periodStart: Date, unit: IScaleConfig['unit']) => {
  const periodEnd = new Date(periodStart);

  switch (unit) {
    case 'hour':
      periodEnd.setHours(periodEnd.getHours() + 1);
      break;
    case 'day':
      periodEnd.setDate(periodEnd.getDate() + 1);
      break;
    case 'week':
      periodEnd.setDate(periodEnd.getDate() + 7);
      break;
    case 'month':
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      break;
    case 'year':
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      break;
    default:
      return null;
  }

  return periodEnd;
};

const addScalePeriod = (date: Date, unit: IScaleConfig['unit'], amount: number) => {
  const result = new Date(date);

  switch (unit) {
    case 'hour':
      result.setHours(result.getHours() + amount);
      break;
    case 'day':
      result.setDate(result.getDate() + amount);
      break;
    case 'week':
      result.setDate(result.getDate() + amount * 7);
      break;
    case 'month':
      result.setMonth(result.getMonth() + amount);
      break;
    case 'year':
      result.setFullYear(result.getFullYear() + amount);
      break;
    default:
      return null;
  }

  return result;
};

export const getWorkflowGanttTimelineBounds = (
  range: WorkflowGanttTimelineRange | null,
  unit: IScaleConfig['unit']
) => {
  if (!range) {
    return null;
  }

  const start = addScalePeriod(range.start, unit, -1);
  const end = addScalePeriod(range.end, unit, 1);

  return start && end ? { end, start } : null;
};

export const createWorkflowGanttHighlightTime = (
  today: Date,
  highlightedUnit: IScaleConfig['unit'],
  className: string
) => {
  const todayTimestamp = today.getTime();

  return (periodStart: Date, unit: IScaleConfig['unit']) => {
    if (unit !== highlightedUnit) {
      return '';
    }

    const periodEnd = getScalePeriodEnd(periodStart, unit);

    if (!periodEnd) {
      return '';
    }

    return todayTimestamp >= periodStart.getTime() && todayTimestamp < periodEnd.getTime()
      ? className
      : '';
  };
};

export const getWorkflowGanttGridWidth = (columns: IColumnConfig[]) =>
  columns.reduce((width, column) => width + (column.width ?? 0), 0);

const formatGanttDate = (value: GanttChartResponse['StartDate']) => {
  const timestamp = normalizeTimestampToMilliseconds(value);

  return timestamp === null ? '-' : getDate(new Date(timestamp), 'P');
};

export const getWorkflowGanttColumns = (
  t: TFunction,
  mode: WorkflowGanttMode,
  stepColumnWidth: number
): IColumnConfig[] => {
  const columns: WorkflowGanttColumnConfig[] = [
    {
      id: 'StepName',
      header: t('label.requests.workflow.timeline.workflowStep'),
      width: stepColumnWidth,
      flexgrow: 1,
      resize: true,
      sort: false,
      cell: ({ row }) => {
        const text = typeof row.StepName === 'string' ? row.StepName.trim() : '';

        return createElement(
          Text<'span'>,
          { component: 'span', inherit: true, miw: 0, title: text, truncate: 'end', w: '100%' },
          text
        );
      },
    },
  ];

  if (mode !== workflowGanttModes.planned) {
    columns.push({
      id: 'Sla',
      header: t('label.sla.title'),
      width: 56,
      align: 'center',
      resize: true,
      sort: false,
      template: (value) => (typeof value === 'number' ? `${value}` : '-'),
    });
  }

  const isActualMode = mode === workflowGanttModes.actual;

  columns.push(
    {
      id: isActualMode ? 'CurrentStartDate' : 'StartDate',
      header: t('label.requests.workflow.timeline.plannedStart'),
      width: 112,
      align: 'center',
      resize: true,
      sort: false,
      template: formatGanttDate,
    },
    {
      id: isActualMode ? 'CurrentEndDate' : 'EndDate',
      header: t('label.requests.workflow.timeline.plannedEnd'),
      width: 112,
      align: 'center',
      resize: true,
      sort: false,
      template: formatGanttDate,
    }
  );

  return columns;
};

export const getActualSlaStatus = (taskType: ITask['type']): ActiveSlaStatusKey | null => {
  if (taskType === workflowGanttSlaTaskTypeIds.onTrack) {
    return 'onTrack';
  }

  if (taskType === workflowGanttSlaTaskTypeIds.risky) {
    return 'risky';
  }

  if (taskType === workflowGanttSlaTaskTypeIds.exceeded) {
    return 'exceeded';
  }

  return null;
};

const getActualSlaBarColor = (taskType: ITask['type']) => {
  const status = getActualSlaStatus(taskType);

  if (status) {
    return slaStatusPresentations[status].ganttBarStyle.backgroundColor;
  }

  return 'var(--workflow-gantt-sla-unknown)';
};

const getActualSlaBarTextColor = (taskType: ITask['type']) => {
  const status = getActualSlaStatus(taskType);

  if (status) {
    return slaStatusPresentations[status].ganttBarStyle.color;
  }

  return 'var(--workflow-gantt-sla-unknown-text)';
};

export type PositionedGanttTask = ITask & Partial<Pick<IGanttTask, '$x' | '$y' | '$skip'>>;
type WorkflowGanttApi = Pick<IApi, 'getState'>;

export const getActualBarGeometry = (
  task: PositionedGanttTask,
  api: WorkflowGanttApi
): { left: number; width: number } | null => {
  const { $x: taskPosition, base_start: actualStart, base_end: actualEnd } = task;
  const { _scales: scales, cellWidth } = api.getState();

  if (
    !actualStart ||
    !actualEnd ||
    typeof taskPosition !== 'number' ||
    !Number.isFinite(taskPosition) ||
    !scales ||
    typeof cellWidth !== 'number' ||
    !Number.isFinite(cellWidth) ||
    cellWidth <= 0 ||
    actualEnd < actualStart
  ) {
    return null;
  }

  const getScalePosition = (date: Date) => {
    const hourStart = new Date(date);
    hourStart.setMinutes(0, 0, 0);
    const nextHourStart = new Date(hourStart.getTime() + 60 * 60 * 1000);
    const hourStartPosition = scales.diff(hourStart, scales.start, scales.lengthUnit) * cellWidth;
    const nextHourStartPosition =
      scales.diff(nextHourStart, scales.start, scales.lengthUnit) * cellWidth;
    const elapsedHourRatio =
      (date.getTime() - hourStart.getTime()) / (nextHourStart.getTime() - hourStart.getTime());

    return hourStartPosition + (nextHourStartPosition - hourStartPosition) * elapsedHourRatio;
  };
  const visibleStart = new Date(actualStart);
  const visibleEnd = new Date(actualEnd);
  const preservesTimePrecision = scales.minUnit === 'day' || scales.minUnit === 'hour';

  if (!preservesTimePrecision) {
    visibleStart.setHours(0, 0, 0, 0);
    visibleEnd.setHours(0, 0, 0, 0);
  }

  let visibleStartPosition = getScalePosition(visibleStart);
  const visibleEndPosition = getScalePosition(visibleEnd);
  const actualWidth = visibleEndPosition - visibleStartPosition;
  const minimumWidth = Math.min(workflowGanttConfig.actualBar.minimumWidth, cellWidth);
  const visibleWidth = Math.max(actualWidth, minimumWidth);

  if (actualWidth < minimumWidth && preservesTimePrecision) {
    const periodStart = new Date(actualStart);

    if (scales.minUnit === 'hour') {
      periodStart.setMinutes(0, 0, 0);
    } else {
      periodStart.setHours(0, 0, 0, 0);
    }

    const periodEnd = getScalePeriodEnd(periodStart, scales.minUnit);

    if (periodEnd) {
      const periodStartPosition = getScalePosition(periodStart);
      const periodEndPosition = getScalePosition(periodEnd);
      visibleStartPosition = Math.max(
        periodStartPosition,
        Math.min(visibleStartPosition, periodEndPosition - visibleWidth)
      );
    }
  }

  return {
    left: visibleStartPosition,
    width: visibleWidth,
  };
};

export const getActualSlaBarStyle = (
  task: PositionedGanttTask,
  api: WorkflowGanttApi
): CSSProperties | null => {
  const geometry = getActualBarGeometry(task, api);

  if (!geometry || task.$x === undefined) {
    return null;
  }

  return {
    backgroundColor: getActualSlaBarColor(task.type),
    left: `${geometry.left - task.$x}px`,
    width: `${geometry.width}px`,
  };
};

export const getActualTaskBarStyle = (task: ITask, api: WorkflowGanttApi): CSSProperties | null => {
  const barStyle = getActualSlaBarStyle(task, api);

  if (!barStyle) {
    return null;
  }

  return {
    color: getActualSlaBarTextColor(task.type),
    ...barStyle,
  };
};
