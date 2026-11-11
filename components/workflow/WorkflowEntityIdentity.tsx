import { IconClipboardCheck, IconListDetails } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Group, Text } from '@mantine/core';
import { FormEnum } from '@/_common/forms';
import { TASK_NUMBER_BADGE_COLOR } from '@/_common/tasks/presentation';
import { RequestNumberBadge } from '@/components/display/Table/RequestNumberBadge';
import { TaskNumberBadge } from '@/components/display/Table/TaskNumberBadge';
import {
  RequestCreationKind,
  requestCreationOptions,
} from '@/pages/requests/_shared/creation/requestCreationKind';

export type WorkflowEntityReference =
  | { kind: 'request'; number?: string | null; formCode?: string }
  | { kind: 'task'; number?: string | null; parentRequestNo?: string | null };

export const WorkflowEntityIdentity = ({ entity }: { entity: WorkflowEntityReference }) => {
  const { t } = useTranslation();
  const isTask = entity.kind === 'task';
  const creationKind = !isTask
    ? entity.formCode === FormEnum.OperationalRequestForm
      ? RequestCreationKind.Operational
      : entity.formCode === FormEnum.RequestForm
        ? RequestCreationKind.SoftwareDevelopment
        : undefined
    : undefined;
  const requestOption = requestCreationOptions.find(({ kind }) => kind === creationKind);
  const Icon = isTask ? IconClipboardCheck : (requestOption?.icon ?? IconListDetails);
  const label = isTask
    ? t('label.requests.tasks.tabs.task')
    : t(requestOption?.titleKey ?? 'entity.request');

  return (
    <Group gap={6} justify="center" wrap="wrap" data-workflow-entity={entity.kind}>
      <Group gap={6} wrap="nowrap" c={isTask ? TASK_NUMBER_BADGE_COLOR : 'dimmed'}>
        <Icon size={16} aria-hidden style={{ flexShrink: 0 }} />
        <Text size="xs" fw={600}>
          {label}
        </Text>
      </Group>
      {isTask ? (
        <TaskNumberBadge taskNo={entity.number} />
      ) : (
        <RequestNumberBadge requestNo={entity.number} />
      )}
    </Group>
  );
};
