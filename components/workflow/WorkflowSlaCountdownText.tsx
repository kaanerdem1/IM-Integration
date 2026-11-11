import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, type TextProps } from '@mantine/core';
import type { SlaInformationDto } from '@/_api/_core/api-gen/types';
import { slaStatusPresentations } from '@/_helpers/sla/presentation';
import { useWorkflowSlaCountdown } from '@/_hooks/_modules/workflow/use-workflow-sla-countdown';

type Props = {
  className?: string;
  targetStartDate?: SlaInformationDto['TargetStartDate'];
  targetEndDate?: SlaInformationDto['TargetEndDate'];
  enabled: boolean;
  size?: TextProps['size'];
};

export const WorkflowSlaCountdownText = memo(
  ({ className, targetStartDate, targetEndDate, enabled, size }: Props) => {
    const { t } = useTranslation();
    const { slaCountdown, slaCountdownColor } = useWorkflowSlaCountdown({
      targetStartDate,
      targetEndDate,
      enabled,
    });

    if (!slaCountdown) {
      return null;
    }

    return (
      <Text
        className={className}
        c={slaCountdownColor ?? slaStatusPresentations.exceeded.textColor}
        fw={700}
        size={size}
      >
        {t('label.requests.workflow.slaCountdown', { value: slaCountdown })}
      </Text>
    );
  }
);
