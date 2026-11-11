import type { IApi } from '@svar-ui/react-gantt';
import { getActualBarGeometry, type PositionedGanttTask } from './workflowGanttConfig';

// Workflow links connect adjacent rows only. The task template follows SVAR's
// virtualized rows and scroll position, without a second subscription or DOM measurements.
export const getActualDependencyPoints = (
  target: PositionedGanttTask & { actualPredecessorId?: string },
  api: Pick<IApi, 'getState' | 'getTask'>
) => {
  if (!target.actualPredecessorId || target.$x === undefined || target.$y === undefined) {
    return null;
  }

  const source: PositionedGanttTask | undefined = api.getTask(target.actualPredecessorId);

  if (!source || source.unscheduled || source.$skip || source.$y === undefined) {
    return null;
  }

  const sourceBar = getActualBarGeometry(source, api);
  const targetBar = getActualBarGeometry(target, api);

  if (!sourceBar || !targetBar) {
    return null;
  }

  // Coordinates are relative to the target's native bar, at its vertical center.
  const startX = sourceBar.left + sourceBar.width - target.$x;
  const startY = source.$y - target.$y;
  const endX = targetBar.left - target.$x;
  const gap = 20;
  const turnX = startX + gap;
  const approachX = endX - gap;
  const turnY = approachX > turnX ? 0 : startY / 2;

  return {
    line: `${startX},${startY} ${turnX},${startY} ${turnX},${turnY} ${approachX},${turnY} ${approachX},0 ${endX},0`,
    arrow: `${endX - 5},-3 ${endX},0 ${endX - 5},3`,
  };
};
