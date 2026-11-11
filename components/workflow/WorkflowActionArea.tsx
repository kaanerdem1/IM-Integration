import type { ReactNode } from 'react';
import classes from './WorkflowActionArea.module.scss';
import { IconGitBranch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Box, Button, Group, Tooltip } from '@mantine/core';
import type { WorkflowCardModel } from '@/_hooks/_modules/workflow/workflow-view-model.types';
import { ToolbarActionIcon } from '@/components/display/Buttons/ToolbarActionIcon';
import { CardContent } from './cards';

export type WorkflowPresentationAction = {
  className?: string;
  color?: string;
  disabled?: boolean;
  disabledReason?: string;
  tooltip?: string;
  id: string;
  loading?: boolean;
  onClick: () => void;
  variant?: 'filled' | 'light' | 'outline' | 'subtle';
} & (
  | { presentation: 'icon'; icon: ReactNode; label: string }
  | { presentation?: 'button'; icon?: ReactNode; label: ReactNode }
);

type WorkflowActionAreaProps = {
  actions: WorkflowPresentationAction[];
  assignmentCard?: WorkflowCardModel | null;
  assignmentMeta?: ReactNode;
  leadingActions?: WorkflowPresentationAction[];
  leadingContent?: ReactNode;
  onOpenTimeline?: () => void;
  pendingApproversCard?: WorkflowCardModel | null;
  showTimelineAction?: boolean;
  statusCard?: WorkflowCardModel | null;
  timelineDisabled?: boolean;
  trailingContent?: ReactNode;
};

const WorkflowActionButton = ({ action }: { action: WorkflowPresentationAction }) => {
  const description = (action.disabled && action.disabledReason) || action.tooltip;
  const button =
    action.presentation === 'icon' ? (
      <ActionIcon
        id={action.id}
        aria-label={action.label}
        className={action.className}
        color={action.color}
        disabled={action.disabled}
        aria-description={description}
        loading={action.loading}
        radius="xl"
        size={30}
        variant={action.variant ?? 'filled'}
        onClick={action.onClick}
      >
        {action.icon}
      </ActionIcon>
    ) : (
      <Button
        id={action.id}
        className={action.className}
        color={action.color}
        disabled={action.disabled}
        aria-description={description}
        leftSection={action.icon}
        loading={action.loading}
        size="xs"
        variant={action.variant ?? 'filled'}
        onClick={action.onClick}
      >
        {action.label}
      </Button>
    );

  if (description) {
    return (
      <Tooltip
        label={description}
        position="bottom"
        withArrow
        multiline
        w={320}
        maw="calc(100vw - 32px)"
        events={{ hover: true, focus: true, touch: false }}
      >
        {action.disabled ? <span className={classes.disabledAction}>{button}</span> : button}
      </Tooltip>
    );
  }

  if (action.presentation === 'icon') {
    return (
      <Tooltip label={action.label} position="bottom" withArrow>
        {button}
      </Tooltip>
    );
  }

  return button;
};

export const WorkflowActionArea = ({
  actions,
  assignmentCard,
  assignmentMeta,
  leadingActions = [],
  leadingContent,
  onOpenTimeline,
  pendingApproversCard,
  showTimelineAction = true,
  statusCard,
  timelineDisabled = false,
  trailingContent,
}: WorkflowActionAreaProps) => {
  const { t } = useTranslation();
  const timelineLabel = t('label.requests.workflow.stepsTitle');

  return (
    <Group wrap="nowrap" gap="xs" className={classes.actionsGroup}>
      {leadingContent}

      {leadingActions.map((action) => (
        <WorkflowActionButton key={action.id} action={action} />
      ))}

      {assignmentCard ? (
        <Group wrap="nowrap" gap="xs" className={classes.assignmentCard}>
          <CardContent card={assignmentCard} />
          {assignmentMeta}
        </Group>
      ) : null}

      {statusCard ? (
        <Box className={classes.summaryCard}>
          <CardContent card={statusCard} />
        </Box>
      ) : null}
      {pendingApproversCard ? (
        <Box className={classes.summaryCard}>
          <CardContent card={pendingApproversCard} />
        </Box>
      ) : null}

      {actions.map((action) => (
        <WorkflowActionButton key={action.id} action={action} />
      ))}

      {showTimelineAction ? (
        <ToolbarActionIcon
          aria-label={timelineLabel}
          disabled={timelineDisabled || !onOpenTimeline}
          icon={<IconGitBranch size={16} stroke={1.5} />}
          label={timelineLabel}
          onClick={onOpenTimeline}
        />
      ) : null}

      {trailingContent}
    </Group>
  );
};
