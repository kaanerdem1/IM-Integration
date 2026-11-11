import type { ITask } from '@svar-ui/react-gantt';
import i18next from 'i18next';
import { describe, expect, it } from 'vitest';

import '@/_i18n/config';

import { activeSlaStatusKeys, slaStatusPresentations } from '@/_helpers/sla';
import { workflowGanttSlaTaskTypeIds } from '../workflowGanttData';
import { getActualDependencyPoints } from './workflowGanttActualLink';
import {
  createWorkflowGanttHighlightTime,
  getActualSlaBarStyle,
  getActualTaskBarStyle,
  getWorkflowGanttColumns,
  getWorkflowGanttGridWidth,
  getWorkflowGanttTimelineBounds,
  workflowGanttModes,
  workflowGanttScaleModes,
  workflowGanttScalePresets,
} from './workflowGanttConfig';

describe('workflow Gantt column sizing', () => {
  it.each([95, 171, 320])('sizes the grid from its content-sized step column (%i px)', (width) => {
    const generalColumns = getWorkflowGanttColumns(i18next.t, workflowGanttModes.general, width);
    const plannedColumns = getWorkflowGanttColumns(i18next.t, workflowGanttModes.planned, width);

    expect(generalColumns[0].width).toBe(width);
    expect(generalColumns[0].resize).toBe(true);
    expect(plannedColumns[0].width).toBe(width);
    expect(getWorkflowGanttGridWidth(generalColumns)).toBe(width + 56 + 112 + 112);
    expect(getWorkflowGanttGridWidth(plannedColumns)).toBe(width + 112 + 112);
  });
});

const createTask = (
  actualStart: Date,
  actualEnd: Date,
  position = {
    plannedEnd: new Date(2026, 7, 4),
    plannedStart: new Date(2026, 6, 31),
    taskWidth: 400,
    taskX: 0,
  }
): ITask => ({
  $w: position.taskWidth,
  $x: position.taskX,
  base_end: actualEnd,
  base_start: actualStart,
  end: position.plannedEnd,
  start: position.plannedStart,
  type: 'sla-on-track',
});

type TestScaleUnit = 'hour' | 'day' | 'week' | 'month';

const getScalePosition = (date: Date, minUnit: TestScaleUnit, scaleStart: Date) => {
  if (minUnit !== 'month') {
    const hours = minUnit === 'hour' ? 1 : minUnit === 'week' ? 24 * 7 : 24;
    return (date.getTime() - scaleStart.getTime()) / (hours * 60 * 60 * 1000);
  }

  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const nextMonthStart = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  const completedMonths =
    (date.getFullYear() - scaleStart.getFullYear()) * 12 + date.getMonth() - scaleStart.getMonth();

  return (
    completedMonths +
    (date.getTime() - monthStart.getTime()) / (nextMonthStart.getTime() - monthStart.getTime())
  );
};

const createGanttApi = (minUnit: TestScaleUnit, cellWidth: number, scaleStart: Date) => ({
  getState: () => ({
    cellWidth,
    _scales: {
      diff: (next: Date, previous: Date) =>
        getScalePosition(next, minUnit, scaleStart) -
        getScalePosition(previous, minUnit, scaleStart),
      lengthUnit: 'hour',
      minUnit,
      start: scaleStart,
    },
  }),
});

const getTaskPosition = (date: Date, minUnit: TestScaleUnit, cellWidth: number, scaleStart: Date) =>
  Math.round(getScalePosition(date, minUnit, scaleStart) * cellWidth);

describe('workflow Gantt actual dependency endpoints', () => {
  it.each([
    ['hour', 50],
    ['day', 25],
    ['day', 200],
    ['week', 56],
    ['week', 336],
    ['month', 248],
    ['month', 600],
  ] as const)('follows visible edges in %s at %i px, without changing dates', (unit, cellWidth) => {
    const scaleStart = new Date(2026, 6, 1);
    const ranges = [
      [new Date(2026, 6, 31, 16, 36), new Date(2026, 6, 31, 16, 36)],
      [new Date(2026, 6, 31, 16, 36), new Date(2026, 6, 31, 16, 36, 20)],
      [new Date(2026, 6, 31, 23, 59, 58), new Date(2026, 6, 31, 23, 59, 59)],
      [new Date(2026, 6, 31, 16, 36), new Date(2026, 7, 3, 16, 36)],
    ];

    ranges.forEach(([start, end]) => {
      const source = { ...createTask(start, end), id: 'source', $y: 3 };
      const targetStart = new Date(end.getTime() + 60_000);
      const target = {
        ...createTask(targetStart, new Date(targetStart.getTime() + 20_000)),
        id: 'target',
        actualPredecessorId: source.id,
        $x: 100,
        $y: 37,
      };
      const api = { ...createGanttApi(unit, cellWidth, scaleStart), getTask: () => source };
      const timestamps = [start.getTime(), end.getTime(), targetStart.getTime()];
      const sourceStyle = getActualTaskBarStyle(source, api as never);
      const targetStyle = getActualTaskBarStyle(target, api as never);
      const dependency = getActualDependencyPoints(target, api as never);
      const points = dependency?.line.split(' ').map((point) => point.split(',').map(Number));
      const first = points?.[0];
      const last = points?.at(-1);

      expect(first?.[0]).toBeCloseTo(
        Number.parseFloat(String(sourceStyle?.left)) +
          Number.parseFloat(String(sourceStyle?.width)) -
          target.$x
      );
      expect(first?.[1]).toBe(source.$y - target.$y);
      expect(last?.[0]).toBeCloseTo(Number.parseFloat(String(targetStyle?.left)));
      expect(last?.[1]).toBe(0);
      expect(dependency?.arrow.split(' ')[1]).toBe(`${last?.[0]},0`);
      expect([start.getTime(), end.getTime(), targetStart.getTime()]).toEqual(timestamps);
    });
  });

  it('does not connect missing or unrendered actual steps', () => {
    const date = new Date(2026, 6, 31, 16, 36);
    const source = { ...createTask(date, date), $y: 3 };
    const target = { ...createTask(date, date), actualPredecessorId: 'source', $y: 37 };
    const scaleApi = createGanttApi('day', 100, new Date(2026, 6, 31));

    for (const missingSource of [
      undefined,
      { ...source, unscheduled: true },
      { ...source, $skip: true },
    ]) {
      expect(
        getActualDependencyPoints(target, { ...scaleApi, getTask: () => missingSource } as never)
      ).toBeNull();
    }

    const api = { ...scaleApi, getTask: () => source };
    expect(
      getActualDependencyPoints({ ...target, actualPredecessorId: undefined }, api as never)
    ).toBeNull();
    expect(getActualDependencyPoints({ ...target, $y: undefined }, api as never)).toBeNull();
    expect(
      getActualDependencyPoints({ ...target, base_start: undefined }, api as never)
    ).toBeNull();
  });
});

describe('workflow Gantt actual bar styles', () => {
  it.each(activeSlaStatusKeys)('keeps %s bars visible with dark text in both modes', (status) => {
    const start = new Date(2026, 6, 31, 9);
    const end = new Date(2026, 6, 31, 17);
    const task = { ...createTask(start, end), type: workflowGanttSlaTaskTypeIds[status] };
    const api = createGanttApi('day', 100, new Date(2026, 6, 31));
    const presentation = slaStatusPresentations[status];
    const generalBar = getActualSlaBarStyle(task, api as never);
    const actualBar = getActualTaskBarStyle(task, api as never);

    expect(generalBar?.backgroundColor).toBe(presentation.ganttBarStyle.backgroundColor);
    expect(generalBar?.backgroundColor).not.toBe(presentation.badgeProps.style.backgroundColor);
    expect(actualBar).toMatchObject(presentation.ganttBarStyle);
    expect(actualBar?.left).toBe(generalBar?.left);
    expect(actualBar?.width).toBe(generalBar?.width);
  });

  it('keeps a zero-duration actual range at the minimum interactive width', () => {
    const actualDate = new Date(2026, 6, 31, 16, 31);
    const scaleStart = new Date(2026, 6, 31);
    const api = createGanttApi('day', 100, scaleStart);
    const style = getActualSlaBarStyle(createTask(actualDate, actualDate), api as never);

    expect(style).toEqual(
      expect.objectContaining({
        backgroundColor: slaStatusPresentations.onTrack.ganttBarStyle.backgroundColor,
        width: '8px',
      })
    );
  });

  it('uses minute and second precision inside the actual hour range', () => {
    const actualStart = new Date(2026, 6, 31, 16, 31, 0);
    const actualEnd = new Date(2026, 6, 31, 16, 31, 15);
    const cellWidth = 100;
    const scaleStart = new Date(2026, 6, 31);
    const taskPosition = getTaskPosition(actualStart, 'day', cellWidth, scaleStart);
    const style = getActualTaskBarStyle(
      createTask(actualStart, actualEnd, {
        plannedEnd: new Date(2026, 7, 4),
        plannedStart: new Date(2026, 6, 31),
        taskWidth: cellWidth,
        taskX: taskPosition,
      }),
      createGanttApi('day', cellWidth, scaleStart) as never
    );

    const globalStartPosition = taskPosition + Number.parseFloat(String(style?.left));

    expect(globalStartPosition).toBeCloseTo(((16 * 60 + 31) / (24 * 60)) * cellWidth);
    expect(style?.width).toBe('8px');
    expect(style).toEqual(
      expect.objectContaining({
        ...slaStatusPresentations.onTrack.ganttBarStyle,
      })
    );
  });

  it('keeps the minimum interactive width inside the actual day', () => {
    const actualStart = new Date(2026, 6, 31, 23, 59, 59);
    const actualEnd = new Date(actualStart.getTime() + 500);
    const cellWidth = 100;
    const scaleStart = new Date(2026, 6, 31);
    const task = createTask(actualStart, actualEnd);
    const style = getActualSlaBarStyle(task, createGanttApi('day', cellWidth, scaleStart) as never);
    const globalEndPosition =
      Number(task.$x) +
      Number.parseFloat(String(style?.left)) +
      Number.parseFloat(String(style?.width));

    expect(style?.width).toBe('8px');
    expect(globalEndPosition).toBeCloseTo(cellWidth);
  });

  it('does not position the actual bar before SVAR provides task coordinates', () => {
    const actualStart = new Date(2026, 6, 31, 16, 31, 0);
    const actualEnd = new Date(2026, 6, 31, 16, 31, 15);
    const task: ITask = {
      base_end: actualEnd,
      base_start: actualStart,
      type: 'sla-on-track',
    };
    const style = getActualTaskBarStyle(
      task,
      createGanttApi('day', 100, new Date(2026, 6, 31)) as never
    );

    expect(style).toBeNull();
  });

  it('keeps chronological order when rows have different planned ranges', () => {
    const dayWidth = 100;
    const scaleStart = new Date(2026, 6, 31);
    const api = createGanttApi('day', dayWidth, scaleStart);
    const firstActualStart = new Date(2026, 6, 31, 16, 36);
    const secondActualStart = new Date(2026, 6, 31, 16, 37);
    const firstTask = createTask(firstActualStart, new Date(firstActualStart.getTime() + 15_000), {
      plannedEnd: new Date(2026, 7, 4),
      plannedStart: new Date(2026, 6, 31),
      taskWidth: 4 * dayWidth,
      taskX: getTaskPosition(new Date(2026, 6, 31), 'day', dayWidth, scaleStart),
    });
    const secondTask = createTask(
      secondActualStart,
      new Date(secondActualStart.getTime() + 15_000),
      {
        plannedEnd: new Date(2026, 7, 21),
        plannedStart: new Date(2026, 7, 18),
        taskWidth: 3 * dayWidth,
        taskX: getTaskPosition(new Date(2026, 7, 18), 'day', dayWidth, scaleStart),
      }
    );
    const firstStyle = getActualSlaBarStyle(firstTask, api as never);
    const secondStyle = getActualSlaBarStyle(secondTask, api as never);
    const getGlobalX = (task: ITask, left: string) => Number(task.$x) + Number.parseFloat(left);
    const firstX = getGlobalX(firstTask, String(firstStyle?.left));
    const secondX = getGlobalX(secondTask, String(secondStyle?.left));

    expect(secondX).toBeGreaterThan(firstX);
    expect(secondX - firstX).toBeCloseTo(dayWidth / (24 * 60));
  });

  it('aligns the same actual date across planned tasks in the monthly scale', () => {
    const cellWidth = 248;
    const scaleStart = new Date(2026, 6, 1);
    const actualStart = new Date(2026, 6, 31, 16, 36);
    const actualEnd = new Date(actualStart.getTime() + 15_000);
    const api = createGanttApi('month', cellWidth, scaleStart);
    const julyTask = createTask(actualStart, actualEnd, {
      plannedEnd: new Date(2026, 7, 4),
      plannedStart: new Date(2026, 6, 31),
      taskWidth: cellWidth,
      taskX: getTaskPosition(new Date(2026, 6, 31), 'month', cellWidth, scaleStart),
    });
    const augustTask = createTask(actualStart, actualEnd, {
      plannedEnd: new Date(2026, 7, 21),
      plannedStart: new Date(2026, 7, 18),
      taskWidth: cellWidth,
      taskX: getTaskPosition(new Date(2026, 7, 18), 'month', cellWidth, scaleStart),
    });
    const julyStyle = getActualSlaBarStyle(julyTask, api as never);
    const augustStyle = getActualSlaBarStyle(augustTask, api as never);
    const getGlobalX = (task: ITask, left: string) => Number(task.$x) + Number.parseFloat(left);

    expect(getGlobalX(julyTask, String(julyStyle?.left))).toBeCloseTo(
      getGlobalX(augustTask, String(augustStyle?.left))
    );
    expect(getGlobalX(julyTask, String(julyStyle?.left))).toBeCloseTo(
      getTaskPosition(new Date(2026, 6, 31), 'month', cellWidth, scaleStart)
    );
    expect(
      getGlobalX(julyTask, String(julyStyle?.left)) + Number.parseFloat(String(julyStyle?.width))
    ).toBeLessThanOrEqual(cellWidth);
  });

  it('aligns short and long actual ranges that start on the same day in coarse scales', () => {
    const cellWidth = 248;
    const scaleStart = new Date(2026, 6, 1);
    const actualStart = new Date(2026, 6, 31, 16, 36);
    const api = createGanttApi('month', cellWidth, scaleStart);
    const shortTask = createTask(actualStart, new Date(actualStart.getTime() + 15_000));
    const longTask = createTask(actualStart, new Date(2026, 7, 12, 16, 36));
    const shortStyle = getActualSlaBarStyle(shortTask, api as never);
    const longStyle = getActualSlaBarStyle(longTask, api as never);
    const getGlobalX = (task: ITask, left: string) => Number(task.$x) + Number.parseFloat(left);

    expect(getGlobalX(shortTask, String(shortStyle?.left))).toBeCloseTo(
      getGlobalX(longTask, String(longStyle?.left))
    );
    expect(Number.parseFloat(String(longStyle?.width))).toBeCloseTo(
      getTaskPosition(new Date(2026, 7, 12), 'month', cellWidth, scaleStart) -
        getTaskPosition(new Date(2026, 6, 31), 'month', cellWidth, scaleStart)
    );
  });
});

describe('workflow Gantt time scales', () => {
  it('adds one visible scale period around the selected timeline range', () => {
    const bounds = getWorkflowGanttTimelineBounds(
      {
        start: new Date(2026, 5, 30, 16, 31),
        end: new Date(2026, 6, 10, 16, 31),
      },
      'day'
    );

    expect(bounds).toEqual({
      start: new Date(2026, 5, 29, 16, 31),
      end: new Date(2026, 6, 11, 16, 31),
    });
  });

  it('uses one zoom level for each time scale mode', () => {
    expect(workflowGanttScalePresets[workflowGanttScaleModes.daily]).toMatchObject({
      cellWidth: 50,
      scales: [{ unit: 'month' }, { unit: 'day' }],
      zoom: { level: 0, levels: [{ minCellWidth: 25, maxCellWidth: 200 }] },
    });
    expect(workflowGanttScalePresets[workflowGanttScaleModes.weekly]).toMatchObject({
      cellWidth: 84,
      scales: [{ unit: 'month' }, { unit: 'week' }],
      zoom: { level: 0, levels: [{ minCellWidth: 56, maxCellWidth: 336 }] },
    });
    expect(workflowGanttScalePresets[workflowGanttScaleModes.monthly]).toMatchObject({
      cellWidth: 248,
      scales: [{ unit: 'year' }, { unit: 'quarter' }, { unit: 'month' }],
      zoom: { level: 0, levels: [{ minCellWidth: 248, maxCellWidth: 600 }] },
    });
    const quarterFormat =
      workflowGanttScalePresets[workflowGanttScaleModes.monthly].scales[1].format;

    expect(quarterFormat).toBeTypeOf('function');
    if (typeof quarterFormat !== 'function') {
      throw new Error('Expected a formatter for the quarterly Gantt scale');
    }

    expect(quarterFormat(new Date(2026, 6, 1))).toBe('3. Çeyrek');
  });

  it('highlights the period containing today for each scale mode', () => {
    const highlightDay = createWorkflowGanttHighlightTime(
      new Date(2026, 7, 11, 12),
      'day',
      'workflow-gantt-today'
    );
    const highlightWeek = createWorkflowGanttHighlightTime(
      new Date(2026, 7, 11, 12),
      'week',
      'workflow-gantt-today'
    );
    const highlightMonth = createWorkflowGanttHighlightTime(
      new Date(2026, 7, 11, 12),
      'month',
      'workflow-gantt-today'
    );

    expect(highlightDay(new Date(2026, 7, 11), 'day')).toBe('workflow-gantt-today');
    expect(highlightDay(new Date(2026, 7, 1), 'month')).toBe('');
    expect(highlightWeek(new Date(2026, 7, 9), 'week')).toBe('workflow-gantt-today');
    expect(highlightWeek(new Date(2026, 7, 1), 'month')).toBe('');
    expect(highlightMonth(new Date(2026, 7, 1), 'month')).toBe('workflow-gantt-today');
    expect(highlightMonth(new Date(2026, 0, 1), 'year')).toBe('');
    expect(highlightMonth(new Date(2026, 6, 1), 'month')).toBe('');
  });
});
