import type {
  GanttChartResponse,
  GanttChartResponseIEnumerableIResponse,
} from '@/_api/_core/api-gen/types';
import { normalizeTimestampToMilliseconds } from '@/_helpers/date';
import {
  dayMs,
  getSlaStatusByDuration,
  slaStatusKeyByStatus,
  type ActiveSlaStatusKey,
} from '@/_helpers/sla';

export const workflowGanttSlaTaskTypeIds = {
  exceeded: 'sla-exceeded',
  onTrack: 'sla-on-track',
  risky: 'sla-risky',
} as const satisfies Record<ActiveSlaStatusKey, string>;

type WorkflowGanttActualDateModel = Pick<GanttChartResponse, 'CurrentEndDate' | 'CurrentStartDate'>;
type WorkflowGanttTaskIdentityModel = Pick<GanttChartResponse, 'Order' | 'StepDefinationId'>;

export type WorkflowGanttTimelineRange = {
  end: Date;
  start: Date;
};

const getDateValue = (value: GanttChartResponse['StartDate']) => {
  const timestamp = normalizeTimestampToMilliseconds(value);

  return timestamp === null ? undefined : new Date(timestamp);
};

const getStartOfDay = (date: Date) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  return result;
};

const getNextDayStart = (date: Date) => {
  const result = getStartOfDay(date);
  result.setDate(result.getDate() + 1);

  return result;
};

const getRenderEnd = (start?: Date, end?: Date) => {
  if (!start || !end || end > start) {
    return end;
  }

  return new Date(end.getTime() + 1);
};

const getDateRange = (
  startValue: GanttChartResponse['StartDate'],
  endValue: GanttChartResponse['EndDate']
) => {
  const start = getDateValue(startValue);
  const end = getDateValue(endValue);

  if (!start || !end || end < start) {
    return null;
  }

  return {
    end: getNextDayStart(end),
    start: getStartOfDay(start),
  };
};

const getActualDateRange = (row: WorkflowGanttActualDateModel, now: number) => {
  const start = getDateValue(row.CurrentStartDate);
  const completedEnd = getDateValue(row.CurrentEndDate);
  const end = completedEnd ?? new Date(now);

  if (!start || end < start) {
    return null;
  }

  return { end, start };
};

const getSlaTaskType = (
  actualRange: ReturnType<typeof getActualDateRange>,
  slaDays: GanttChartResponse['Sla']
) => {
  if (!actualRange || !slaDays || slaDays <= 0) {
    return 'task' as const;
  }

  const status = getSlaStatusByDuration(
    actualRange.end.getTime() - actualRange.start.getTime(),
    slaDays * dayMs
  );

  return status !== null
    ? workflowGanttSlaTaskTypeIds[slaStatusKeyByStatus[status]]
    : ('task' as const);
};

const getTaskId = (row: WorkflowGanttTaskIdentityModel, index: number) => {
  const stepDefinationId = row.StepDefinationId ?? 'unknown';
  const order = row.Order ?? index + 1;

  return `step-${stepDefinationId}-${order}-${index}`;
};

export const buildWorkflowGanttData = (
  data: GanttChartResponseIEnumerableIResponse['Data'],
  getUnnamedStepLabel: (order: number) => string,
  now = Date.now()
) => {
  const rows = [...(data ?? [])].sort(
    (left, right) =>
      (left.Order ?? Number.MAX_SAFE_INTEGER) - (right.Order ?? Number.MAX_SAFE_INTEGER)
  );
  const tasks = rows.map((row, index) => {
    const plannedRange = getDateRange(row.StartDate, row.EndDate);
    const actualRange = getActualDateRange(row, now);

    return {
      ...row,
      id: getTaskId(row, index),
      text: row.StepName?.trim() || getUnnamedStepLabel(row.Order ?? index + 1),
      start: plannedRange?.start,
      end: plannedRange?.end,
      base_start: actualRange?.start,
      base_end: actualRange?.end,
      type: getSlaTaskType(actualRange, row.Sla),
      unscheduled: !plannedRange,
    };
  });
  const actualTasks = tasks.map((task, index) => ({
    ...task,
    actualPredecessorId: tasks[index - 1]?.id,
    end: getRenderEnd(task.base_start, task.base_end),
    start: task.base_start,
    unscheduled: !task.base_start || !task.base_end,
  }));
  const getTimelineRange = (
    includePlannedDates: boolean,
    includeActualDates: boolean
  ): WorkflowGanttTimelineRange | null => {
    let rangeEnd: Date | undefined;
    let rangeStart: Date | undefined;

    tasks.forEach((task) => {
      const dates = [
        includePlannedDates ? task.start : undefined,
        includePlannedDates ? task.end : undefined,
        includeActualDates ? task.base_start : undefined,
        includeActualDates ? task.base_end : undefined,
      ];

      dates.forEach((date) => {
        if (!date) {
          return;
        }

        if (!rangeStart || date < rangeStart) {
          rangeStart = date;
        }

        if (!rangeEnd || date > rangeEnd) {
          rangeEnd = date;
        }
      });
    });

    return rangeStart && rangeEnd ? { end: rangeEnd, start: rangeStart } : null;
  };
  const timelineRanges = {
    actual: getTimelineRange(false, true),
    general: getTimelineRange(true, true),
    planned: getTimelineRange(true, false),
  } as const;
  const buildLinks = (linkTasks: typeof tasks) =>
    linkTasks.slice(1).flatMap((task, index) => {
      const previousTask = linkTasks[index];

      if (previousTask.unscheduled || task.unscheduled) {
        return [];
      }

      return [
        {
          id: `link-${previousTask.id}-${task.id}`,
          source: previousTask.id,
          target: task.id,
          type: 'e2s' as const,
        },
      ];
    });
  const links = buildLinks(tasks);
  const actualLinks = buildLinks(actualTasks);

  return { actualLinks, actualTasks, links, tasks, timelineRanges };
};
