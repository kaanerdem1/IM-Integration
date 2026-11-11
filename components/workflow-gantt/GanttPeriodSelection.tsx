import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Group, Input, SegmentedControl } from '@mantine/core';
import type { SegmentedControlProps } from '@mantine/core';
import { formLabelTextProps } from '@/_common/_props/form-label';
import {
  workflowGanttScaleModes,
  type WorkflowGanttScaleMode,
} from '@/components/workflow-gantt/ganttChartConfig';

type Props = {
  className?: string;
  size?: SegmentedControlProps['size'];
  value: WorkflowGanttScaleMode;
  onChange: (value: WorkflowGanttScaleMode) => void;
};

export const GanttPeriodSelection = ({ className, size = 'sm', value, onChange }: Props) => {
  const { t } = useTranslation();
  const options = useMemo(
    () => [
      {
        label: t('label.requests.workflow.timeline.scaleMode.daily'),
        value: workflowGanttScaleModes.daily,
      },
      {
        label: t('label.requests.workflow.timeline.scaleMode.weekly'),
        value: workflowGanttScaleModes.weekly,
      },
      {
        label: t('label.requests.workflow.timeline.scaleMode.monthly'),
        value: workflowGanttScaleModes.monthly,
      },
    ],
    [t]
  );

  return (
    <Group className={className} gap={6} align="center" wrap="nowrap">
      <Input.Label {...formLabelTextProps} fz="xs" labelElement="div">
        {t('label.requests.workflow.timeline.scaleMode.viewLabel')}
      </Input.Label>
      <SegmentedControl<WorkflowGanttScaleMode>
        aria-label={t('label.requests.workflow.timeline.scaleMode.label')}
        data={options}
        radius="xl"
        size={size}
        value={value}
        onChange={onChange}
      />
    </Group>
  );
};
