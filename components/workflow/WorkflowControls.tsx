import type { ReactNode } from 'react';
import classes from './WorkflowControls.module.scss';
import {
  IconArrowBack,
  IconCancel,
  IconCheck,
  IconClock,
  IconUserCheck,
  IconUserMinus,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Divider, Flex, Group } from '@mantine/core';
import { WORKFLOW_STATUS_COLORS } from '@/_common/workflow/colors';
import { useWorkflowCountdown } from '@/_hooks/_modules/workflow/use-workflow-countdown';
import type { WorkflowViewModelResult } from '@/_hooks/_modules/workflow/workflow-view-model.types';
import { formatWorkflowCountdown } from '@/_hooks/_modules/workflow/workflow-view-model.utils';
import { WorkflowActionArea, type WorkflowPresentationAction } from './WorkflowActionArea';
import { WorkflowSlaCountdownText } from './WorkflowSlaCountdownText';

type WorkflowControlsProps = {
  viewModel: Pick<
    WorkflowViewModelResult,
    | 'assignmentStartedAt'
    | 'isAssignedToCurrentUser'
    | 'assignedCard'
    | 'pendingApproversCard'
    | 'statusCard'
    | 'flowDetailData'
  >;
  disabled: boolean;
  approveDisabledReason?: string;
  cancelDisabledReason?: string;
  withApprovalCountdown?: boolean;
  withSla?: boolean;
  approving?: boolean;
  releasing?: boolean;
  locked?: boolean;
  onApprove?: () => void;
  onCancel?: () => void;
  onReject?: () => void;
  onRelease?: () => void;
  onTakeOwnership?: () => void;
  onOpenTimeline?: () => void;
  leadingContent?: ReactNode;
  trailingContent?: ReactNode;
};

const AssignmentCountdown = ({
  assignmentStartedAt,
  isAssignedToCurrentUser,
}: Pick<WorkflowViewModelResult, 'assignmentStartedAt' | 'isAssignedToCurrentUser'>) => {
  const remainingSeconds = useWorkflowCountdown({
    assignmentStartedAt,
    isAssigned: isAssignedToCurrentUser,
  });
  const countdown = isAssignedToCurrentUser ? formatWorkflowCountdown(remainingSeconds) : null;

  return (
    <>
      <Divider orientation="vertical" mx="xs" color="currentColor" h={12} />
      <Flex align="center" gap={4}>
        <IconClock size={12} stroke={1.8} />
        {countdown ? ` ${countdown}` : ''}
      </Flex>
    </>
  );
};

// Presentation only: each workflow controller decides which callbacks are authorized.
export const WorkflowControls = ({
  viewModel,
  disabled,
  approveDisabledReason,
  cancelDisabledReason,
  withApprovalCountdown = false,
  withSla = false,
  approving,
  releasing,
  locked,
  onApprove,
  onCancel,
  onReject,
  onRelease,
  onTakeOwnership,
  onOpenTimeline,
  leadingContent,
  trailingContent,
}: WorkflowControlsProps) => {
  const { t } = useTranslation();
  const { assignmentStartedAt, isAssignedToCurrentUser, assignedCard, flowDetailData } = viewModel;
  const actions: WorkflowPresentationAction[] = [];
  const leadingActions: WorkflowPresentationAction[] = [];
  const countdownHint =
    withApprovalCountdown && isAssignedToCurrentUser
      ? t('label.requests.workflow.assignmentCountdownHint')
      : undefined;
  const countdownTooltip = (description?: string) =>
    description && countdownHint ? `${description} ${countdownHint}` : description || countdownHint;
  const countdownLabel = (label: string) =>
    withApprovalCountdown ? (
      <Group gap={0}>
        {label}
        <AssignmentCountdown
          assignmentStartedAt={assignmentStartedAt}
          isAssignedToCurrentUser={isAssignedToCurrentUser}
        />
      </Group>
    ) : (
      label
    );

  if (onTakeOwnership) {
    leadingActions.push({
      className: classes.takeOwnershipButton,
      disabled,
      icon: <IconUserCheck size={14} stroke={1.6} />,
      id: 'workflow-button-assignFlow',
      label: t('label.requests.workflow.assignFlow'),
      onClick: onTakeOwnership,
    });
  }
  if (onReject) {
    actions.push({
      color: WORKFLOW_STATUS_COLORS.returned,
      disabled,
      icon: <IconArrowBack size={14} stroke={1.6} />,
      id: 'workflow-button-reject',
      label: t('label.requests.workflow.reject'),
      loading: locked,
      onClick: onReject,
      variant: 'light',
    });
  }
  if (onCancel) {
    actions.push({
      color: WORKFLOW_STATUS_COLORS.canceled,
      disabled: disabled || Boolean(cancelDisabledReason),
      disabledReason: cancelDisabledReason,
      icon: <IconCancel size={14} stroke={1.6} />,
      id: 'workflow-button-cancel',
      label: t('label.cancel'),
      loading: locked,
      onClick: onCancel,
      variant: 'light',
    });
  }
  if (onApprove) {
    actions.push({
      disabled: disabled || Boolean(approveDisabledReason),
      disabledReason: countdownTooltip(approveDisabledReason),
      icon: <IconCheck size={14} stroke={1.8} />,
      id: 'workflow-button-approve',
      label: countdownLabel(t('label.requests.workflow.approve')),
      tooltip: countdownHint,
      loading: approving || locked,
      onClick: onApprove,
    });
  }
  if (onRelease) {
    actions.push({
      color: 'gray',
      disabled,
      icon: <IconUserMinus size={14} stroke={1.6} />,
      id: 'workflow-button-unAssign',
      presentation: 'icon',
      label: t('label.requests.workflow.unAssign'),
      loading: releasing || locked,
      onClick: onRelease,
      variant: 'light',
    });
  }

  return (
    <WorkflowActionArea
      actions={actions}
      leadingActions={leadingActions}
      assignmentCard={assignedCard}
      assignmentMeta={
        withSla ? (
          <WorkflowSlaCountdownText
            className={classes.assignmentCountdown}
            targetStartDate={flowDetailData?.NextStep?.Sla?.TargetStartDate}
            targetEndDate={flowDetailData?.NextStep?.Sla?.TargetEndDate}
            enabled={Boolean(assignedCard)}
          />
        ) : null
      }
      leadingContent={leadingContent}
      trailingContent={trailingContent}
      onOpenTimeline={onOpenTimeline}
      showTimelineAction={Boolean(onOpenTimeline)}
      pendingApproversCard={viewModel.pendingApproversCard}
      statusCard={viewModel.statusCard}
    />
  );
};
