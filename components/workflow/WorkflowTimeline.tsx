import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { WorkflowViewModelResult } from '@/_hooks/_modules/workflow/workflow-view-model.types';
import { WorkflowSlaCountdownText } from './WorkflowSlaCountdownText';
import { WorkflowTimelinePanel } from './WorkflowTimelinePanel';

type WorkflowTimelineProps = {
  onClose: () => void;
  viewModel: Pick<WorkflowViewModelResult, 'flowDetailData' | 'timelineItems'>;
  withSla?: boolean;
};

const WorkflowTimelineComponent = ({
  onClose,
  viewModel,
  withSla = false,
}: WorkflowTimelineProps) => {
  const { t } = useTranslation();
  const { flowDetailData, timelineItems } = viewModel;

  return (
    <WorkflowTimelinePanel
      items={timelineItems}
      title={t('label.requests.workflow.stepsTitle')}
      onClose={onClose}
      renderItemMeta={(item) =>
        withSla && item.key === 'current' ? (
          <WorkflowSlaCountdownText
            targetStartDate={flowDetailData?.NextStep?.Sla?.TargetStartDate}
            targetEndDate={flowDetailData?.NextStep?.Sla?.TargetEndDate}
            enabled
            size="10px"
          />
        ) : null
      }
    />
  );
};

export const WorkflowTimeline = memo(WorkflowTimelineComponent);
