import { describe, expect, it } from 'vitest';
import type { GanttChartResponseIEnumerableIResponse } from '@/_api/_core/api-gen/types';
import { dayMs } from '@/_helpers/sla';
import { buildWorkflowGanttData } from './workflowGanttData';

const getUnnamedStepLabel = (order: number) => `Workflow Step ${order}`;

const getExpectedPlannedStart = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  date.setHours(0, 0, 0, 0);

  return date;
};

const getExpectedPlannedEnd = (timestamp: number) => {
  const date = getExpectedPlannedStart(timestamp);
  date.setDate(date.getDate() + 1);

  return date;
};

describe('buildWorkflowGanttData', () => {
  it('sorts service rows and maps planned dates with SLA-colored actual baselines', () => {
    const response: GanttChartResponseIEnumerableIResponse = {
      StatusCode: 200,
      Data: [
        {
          StepDefinationId: 2,
          StepName: 'Onay',
          Sla: 8,
          StartDate: 1787043764,
          EndDate: 1787734964,
          Order: 2,
        },
        {
          StepDefinationId: 1,
          StepName: 'Kontrol',
          Sla: 4,
          StartDate: 1785488564,
          EndDate: 1787043764,
          CurrentStartDate: 1785488565,
          CurrentEndDate: 1785488587,
          Order: 1,
        },
      ],
    };

    const result = buildWorkflowGanttData(response.Data, getUnnamedStepLabel);

    expect(result.tasks.map((task) => task.StepName)).toEqual(['Kontrol', 'Onay']);
    expect(result.tasks[0]).toEqual(
      expect.objectContaining({
        id: 'step-1-1-0',
        text: 'Kontrol',
        start: getExpectedPlannedStart(1785488564),
        end: getExpectedPlannedEnd(1787043764),
        base_start: new Date(1785488565 * 1000),
        base_end: new Date(1785488587 * 1000),
        type: 'sla-on-track',
        unscheduled: false,
      })
    );
    expect(result.links).toEqual([
      {
        id: 'link-step-1-1-0-step-2-2-1',
        source: 'step-1-1-0',
        target: 'step-2-2-1',
        type: 'e2s',
      },
    ]);
    expect(result.actualTasks[0]).toEqual(
      expect.objectContaining({
        start: new Date(1785488565 * 1000),
        end: new Date(1785488587 * 1000),
        type: 'sla-on-track',
        unscheduled: false,
      })
    );
    expect(result.actualTasks[1].unscheduled).toBe(true);
    expect(result.actualTasks[0].actualPredecessorId).toBeUndefined();
    expect(result.actualTasks[1].actualPredecessorId).toBe(result.actualTasks[0].id);
    expect(result.actualLinks).toEqual([]);
  });

  it('creates unique task ids from service fields and the sorted row index', () => {
    const response: GanttChartResponseIEnumerableIResponse = {
      StatusCode: 200,
      Data: [
        {
          StepDefinationId: 19,
          StepName: ' ',
          StartDate: 1796299962,
          EndDate: 1796731962,
          Order: 20,
        },
        {
          StepDefinationId: 20,
          StepName: 'Sürümleme',
          StartDate: 1796731962,
          EndDate: 1797250362,
          Order: 21,
        },
      ],
    };

    const result = buildWorkflowGanttData(response.Data, getUnnamedStepLabel);
    const taskIds = result.tasks.map((task) => task.id);

    expect(taskIds).toEqual(['step-19-20-0', 'step-20-21-1']);
    expect(result.tasks[0].text).toBe('Workflow Step 20');
    expect(new Set(taskIds).size).toBe(taskIds.length);
  });

  it('keeps the service timestamp while giving a zero-duration actual task a renderable range', () => {
    const actualTimestamp = 1785499962;
    const response: GanttChartResponseIEnumerableIResponse = {
      StatusCode: 200,
      Data: [
        {
          StepDefinationId: 1,
          StepName: 'Talep Giriş',
          Sla: 1,
          CurrentStartDate: actualTimestamp,
          CurrentEndDate: actualTimestamp,
          StartDate: actualTimestamp,
          EndDate: actualTimestamp,
          Order: 1,
        },
      ],
    };

    const result = buildWorkflowGanttData(response.Data, getUnnamedStepLabel);
    const actualDate = new Date(actualTimestamp * 1000);

    expect(result.actualTasks[0].base_start).toEqual(actualDate);
    expect(result.actualTasks[0].base_end).toEqual(actualDate);
    expect(result.tasks[0].start).toEqual(getExpectedPlannedStart(actualTimestamp));
    expect(result.tasks[0].end).toEqual(getExpectedPlannedEnd(actualTimestamp));
    expect(result.actualTasks[0].start).toEqual(actualDate);
    expect(result.actualTasks[0].end).toEqual(new Date(actualDate.getTime() + 1));
  });

  it('uses now for an active step actual range and marks the SLA as risky', () => {
    const response: GanttChartResponseIEnumerableIResponse = {
      StatusCode: 200,
      Data: [
        {
          StepDefinationId: 17,
          StepName: 'Kabul Test',
          Sla: 3,
          CurrentStartDate: 1785500343,
          CurrentEndDate: null,
          StartDate: 1795522362,
          EndDate: 1795781562,
          Order: 18,
        },
      ],
    };
    const now = 1785500343 * 1000 + dayMs * 3 - 2 * 3600_000;

    const result = buildWorkflowGanttData(response.Data, getUnnamedStepLabel, now);

    expect(result.tasks[0]).toEqual(
      expect.objectContaining({
        id: 'step-17-18-0',
        start: getExpectedPlannedStart(1795522362),
        end: getExpectedPlannedEnd(1795781562),
        base_start: new Date(1785500343 * 1000),
        base_end: new Date(now),
        type: 'sla-risky',
        unscheduled: false,
      })
    );
    expect(result.actualTasks[0]).toEqual(
      expect.objectContaining({
        start: new Date(1785500343 * 1000),
        end: new Date(now),
        type: 'sla-risky',
        unscheduled: false,
      })
    );
  });

  it('marks an actual duration that exceeds SLA as exceeded', () => {
    const actualStart = 1785500343;
    const response: GanttChartResponseIEnumerableIResponse = {
      StatusCode: 200,
      Data: [
        {
          StepDefinationId: 17,
          StepName: 'Kabul Test',
          Sla: 3,
          CurrentStartDate: actualStart,
          CurrentEndDate: actualStart + (dayMs * 4) / 1000,
          StartDate: 1795522362,
          EndDate: 1795781562,
          Order: 18,
        },
      ],
    };

    const result = buildWorkflowGanttData(response.Data, getUnnamedStepLabel);

    expect(result.tasks[0].type).toBe('sla-exceeded');
  });

  it('includes actual dates outside the planned range in the general timeline', () => {
    const response: GanttChartResponseIEnumerableIResponse = {
      StatusCode: 200,
      Data: [
        {
          StepDefinationId: 1,
          StepName: 'Talep Giriş',
          Sla: 1,
          CurrentStartDate: 1782835200,
          CurrentEndDate: 1782921600,
          StartDate: 1785456000,
          EndDate: 1785542400,
          Order: 1,
        },
      ],
    };

    const result = buildWorkflowGanttData(response.Data, getUnnamedStepLabel);

    expect(result.timelineRanges.general).toEqual({
      start: new Date(1782835200 * 1000),
      end: getExpectedPlannedEnd(1785542400),
    });
    expect(result.timelineRanges.planned).toEqual({
      start: getExpectedPlannedStart(1785456000),
      end: getExpectedPlannedEnd(1785542400),
    });
    expect(result.timelineRanges.actual).toEqual({
      start: new Date(1782835200 * 1000),
      end: new Date(1782921600 * 1000),
    });
  });
});
