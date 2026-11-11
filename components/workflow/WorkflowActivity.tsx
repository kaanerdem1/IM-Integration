import classes from './WorkflowStepProgress.module.scss';
import {
  IconArrowBackUp,
  IconCheck,
  IconClockHour4,
  IconPlayerPause,
  IconX,
} from '@tabler/icons-react';
import { Box } from '@mantine/core';
import {
  WorkflowApproverStatusEnum,
  type WorkflowTimelineItemModel,
} from '@/_hooks/_modules/workflow/workflow-view-model.types';

export const WorkflowStatusIcon = ({ status }: { status?: WorkflowApproverStatusEnum | null }) => {
  switch (status) {
    case WorkflowApproverStatusEnum.Approved:
      return <IconCheck size={11} stroke={2.4} aria-hidden />;
    case WorkflowApproverStatusEnum.Reject:
      return <IconArrowBackUp size={11} stroke={2.2} aria-hidden />;
    case WorkflowApproverStatusEnum.Cancel:
      return <IconX size={11} stroke={2.4} aria-hidden />;
    case WorkflowApproverStatusEnum.NotWaitingProcess:
      return <IconPlayerPause size={11} stroke={2.2} aria-hidden />;
    default:
      return <IconClockHour4 size={11} stroke={2.2} aria-hidden />;
  }
};

export const WorkflowActivityTitle = ({
  item,
  statusLabel = item.statusLabel,
  showUnit = false,
}: {
  item: WorkflowTimelineItemModel;
  statusLabel?: string;
  showUnit?: boolean;
}) => (
  <Box className={classes.historyEvent}>
    <Box>{statusLabel}</Box>
    <Box className={classes.stepDate}>{item.date}</Box>
    {item.date.trim() && item.card.title.trim() ? (
      <Box component="span" className={classes.historySeparator} aria-hidden="true">
        ·
      </Box>
    ) : null}
    <Box className={classes.historyActor}>
      {item.card.title}
      {showUnit && item.card.subtitle?.trim() ? (
        <>
          {item.card.title.trim() ? (
            <Box component="span" className={classes.historySeparator} aria-hidden="true">
              {' · '}
            </Box>
          ) : null}
          <Box component="span" c="dimmed">
            {item.card.subtitle}
          </Box>
        </>
      ) : null}
    </Box>
  </Box>
);
