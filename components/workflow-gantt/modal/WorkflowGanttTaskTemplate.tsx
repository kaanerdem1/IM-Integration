import type { ComponentProps, ReactElement } from 'react';
import classes from './style.module.scss';
import { Gantt, type ITask } from '@svar-ui/react-gantt';
import { useTranslation } from 'react-i18next';
import { Badge } from '@mantine/core';
import type { GanttChartResponse } from '@/_api/_core/api-gen/types';
import { getDate } from '@/_helpers/date';
import { getSlaStatusLabels, slaStatusPresentations } from '@/_helpers/sla';
import { GanttTaskTooltip } from '@/components/workflow-gantt/GanttTaskTooltip';
import { getActualDependencyPoints } from './workflowGanttActualLink';
import {
  getActualSlaBarStyle,
  getActualSlaStatus,
  getActualTaskBarStyle,
} from './workflowGanttConfig';

type WorkflowGanttTaskTemplateComponent = NonNullable<ComponentProps<typeof Gantt>['taskTemplate']>;
type WorkflowGanttTooltipTask = ITask &
  Pick<GanttChartResponse, 'CurrentEndDate' | 'EndDate' | 'StartDate'>;

export const WorkflowGanttPlannedTaskTemplate: WorkflowGanttTaskTemplateComponent = ({
  data,
}: {
  data: WorkflowGanttTooltipTask;
}) => (
  <GanttTaskTooltip
    end={getDate(data.EndDate, 'P') || '-'}
    start={getDate(data.StartDate, 'P') || '-'}
    title={data.text}
  >
    <div className={classes.taskLabel}>
      <span>{data.text}</span>
    </div>
  </GanttTaskTooltip>
);

const ActualSlaTooltip = ({
  children,
  data,
}: {
  children: ReactElement;
  data: WorkflowGanttTooltipTask;
}) => {
  const { t } = useTranslation();
  const actualStart = data.base_start;
  const actualEnd = data.base_end;

  if (!actualStart || !actualEnd) {
    return children;
  }

  const actualSlaStatus = getActualSlaStatus(data.type);
  const statusLabels = getSlaStatusLabels(t);
  const isCompleted = data.CurrentEndDate !== null && data.CurrentEndDate !== undefined;
  const extraRows = actualSlaStatus
    ? [
        {
          label: t('label.requests.workflow.timeline.slaStatus'),
          value: (
            <Badge
              {...slaStatusPresentations[actualSlaStatus].badgeProps}
              size="xs"
              variant="light"
            >
              {statusLabels[actualSlaStatus]}
            </Badge>
          ),
        },
      ]
    : [];

  return (
    <GanttTaskTooltip
      end={
        isCompleted
          ? getDate(actualEnd, 'P, HH:mm')
          : t('label.requests.workflow.timeline.inProgress')
      }
      extraRows={extraRows}
      start={getDate(actualStart, 'P, HH:mm')}
      title={data.text}
    >
      {children}
    </GanttTaskTooltip>
  );
};

export const WorkflowGanttActualTaskTemplate: WorkflowGanttTaskTemplateComponent = ({
  api,
  data,
}) => {
  const actualTaskBarStyle = getActualTaskBarStyle(data, api);
  const dependency = getActualDependencyPoints(data, api);

  if (!actualTaskBarStyle) {
    return null;
  }

  return (
    <>
      {dependency ? (
        <svg aria-hidden className={classes.actualDependency} data-testid="actual-dependency">
          <polyline points={dependency.line} fill="none" stroke="currentColor" strokeWidth={2} />
          <polygon points={dependency.arrow} fill="currentColor" />
        </svg>
      ) : null}
      <ActualSlaTooltip data={data}>
        <div className={classes.actualTaskBar} style={actualTaskBarStyle}>
          <div className={classes.taskLabel}>
            <span>{data.text}</span>
          </div>
        </div>
      </ActualSlaTooltip>
    </>
  );
};

export const WorkflowGanttTaskTemplate: WorkflowGanttTaskTemplateComponent = (props) => {
  const { api, data } = props;
  const { t } = useTranslation();
  const actualSlaBarStyle = getActualSlaBarStyle(data, api);
  const plannedLabel = <WorkflowGanttPlannedTaskTemplate {...props} />;

  if (!actualSlaBarStyle || !data.base_start || !data.base_end) {
    return plannedLabel;
  }

  return (
    <>
      {plannedLabel}
      <ActualSlaTooltip data={data}>
        <button
          aria-label={t('label.requests.workflow.timeline.actualSla')}
          className={classes.actualSlaBar}
          style={actualSlaBarStyle}
          type="button"
        />
      </ActualSlaTooltip>
    </>
  );
};
