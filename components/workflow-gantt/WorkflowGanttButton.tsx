import { IconTimelineEvent } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { IssueUrlDto } from '@/_api/_core/api-gen/types';
import { ToolbarActionIcon } from '@/components/display/Buttons/ToolbarActionIcon';
import { useWorkflowGanttModal } from '@/components/workflow-gantt/useWorkflowGanttModal';

type WorkflowGanttButtonProps = Pick<IssueUrlDto, 'No'> & {
  IssueId: NonNullable<IssueUrlDto['Id']>;
};

export const WorkflowGanttButton = ({ IssueId, No }: WorkflowGanttButtonProps) => {
  const { t } = useTranslation();
  const timelineTitle = t('label.requests.workflow.timeline.title');
  const { isFetching, openWorkflowGantt } = useWorkflowGanttModal();
  const issueId = IssueId.trim();

  return (
    <ToolbarActionIcon
      disabled={!issueId || isFetching}
      icon={<IconTimelineEvent size={16} stroke={1.5} />}
      label={timelineTitle}
      loading={isFetching}
      onClick={() => openWorkflowGantt({ issueId, No })}
    />
  );
};
