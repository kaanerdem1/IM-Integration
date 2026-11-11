import { IconPlayerPlay } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Divider, Stack, Text, Tooltip, type MantineColor } from '@mantine/core';
import type { SlaInformationDto } from '@/_api/_core/api-gen/types';
import { getDate } from '@/_helpers/date';

type Props = {
  color?: MantineColor;
  disabled?: boolean;
  onClick: () => void;
  targetStartDate?: SlaInformationDto['TargetStartDate'];
};

export const WorkflowWorkStartButton = ({ color, disabled, onClick, targetStartDate }: Props) => {
  const { t } = useTranslation();
  const hint = t('label.requests.workflow.startWorkHint');
  const plannedStartDate = getDate(targetStartDate, 'd MMM yyyy');
  return (
    <Stack pt={8} gap={8} data-testid="workflow-work-start-section">
      <Divider my={0} variant="solid" />
      {plannedStartDate && (
        <Text size="xs" c="dimmed" ta="center" data-testid="workflow-planned-start">
          {t('label.requests.workflow.plannedStartDate')}:{' '}
          <time dateTime={getDate(targetStartDate, 'yyyy-MM-dd')}>{plannedStartDate}</time>
        </Text>
      )}
      <Tooltip label={hint} multiline maw={320} withArrow>
        <Button
          id="workflow-button-startWork"
          data-testid="workflow-work-start"
          aria-description={hint}
          color={color}
          disabled={disabled}
          fullWidth
          leftSection={<IconPlayerPlay size={12} stroke={1.8} />}
          radius="xl"
          size="xxs"
          style={{ alignSelf: 'center' }}
          onClick={onClick}
        >
          {t('label.requests.workflow.startWork')}
        </Button>
      </Tooltip>
    </Stack>
  );
};
