import classes from './Modal_Workflow_StepHistory.module.scss';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Group, Stack, Text, Timeline } from '@mantine/core';
import { TASK_WORKFLOW_STEP_BADGE_COLOR } from '@/_common/tasks/presentation';
import { WorkflowApproverStatusEnum } from '@/_hooks/_modules/workflow/workflow-view-model.types';
import { getStatusColor } from '@/_hooks/_modules/workflow/workflow-view-model.utils';
import { Modal } from '@/components/display/Modal/Modal';
import { ModalBody } from '@/components/display/Modal/ModalBody';
import { ModalFooter } from '@/components/display/Modal/ModalFooter';
import { ModalInfoBand } from '@/components/display/Modal/ModalInfoBand';
import { RequestNumberBadge } from '@/components/display/Table/RequestNumberBadge';
import { useModalState } from '@/components/modal-host/_hook/useModal';
import { WorkflowActivityTitle, WorkflowStatusIcon } from '../WorkflowActivity';
import { WorkflowEntityIdentity } from '../WorkflowEntityIdentity';

export const Modal_Workflow_StepHistory = () => {
  const { t } = useTranslation();
  const { opened, options, closeModal } = useModalState('WorkflowStepHistory');
  const onClose = () => closeModal('WorkflowStepHistory');

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={t('label.requests.workflow.stepHistory')}
      returnFocus
    >
      {options?.entity || options?.stepName ? (
        <ModalInfoBand>
          {options?.entity ? (
            <>
              <WorkflowEntityIdentity entity={options.entity} />
              {options.entity.kind === 'task' && options.entity.parentRequestNo ? (
                <Group gap={6} justify="center">
                  <Text size="xs" c="dimmed">
                    {t('label.requests.workflow.relatedRequest')}
                  </Text>
                  <RequestNumberBadge requestNo={options.entity.parentRequestNo} />
                </Group>
              ) : null}
            </>
          ) : null}
          {options?.stepName ? (
            <Group gap={6} justify="center">
              <Text size="xs" c="dimmed">
                {t('label.requests.workflow.timeline.workflowStep')}
              </Text>
              <Badge
                size="xs"
                variant="light"
                color={
                  options?.entity?.kind === 'task' ? TASK_WORKFLOW_STEP_BADGE_COLOR : undefined
                }
                maw="60vw"
                mod={{ truncate: true }}
                title={options.stepName}
              >
                {options?.stepName}
              </Badge>
            </Group>
          ) : null}
        </ModalInfoBand>
      ) : null}
      <Text size="xs" c="dimmed" px="lg" py={8} className={classes.summary}>
        {t('label.requests.workflow.stepHistoryCount', { count: options?.items.length ?? 0 })}
      </Text>
      <ModalBody>
        <Timeline
          role="list"
          bulletSize={14}
          lineWidth={1}
          active={(options?.items.length ?? 0) - 1}
          classNames={{
            root: classes.timeline,
            item: classes.item,
            itemTitle: classes.itemTitle,
          }}
        >
          {options?.items.map((item) => (
            <Timeline.Item
              key={item.key}
              role="listitem"
              color={getStatusColor(item.statusValue)}
              bullet={<WorkflowStatusIcon status={item.statusValue} />}
              title={<WorkflowActivityTitle item={item} showUnit />}
            >
              <Stack gap={4} style={{ overflowWrap: 'anywhere' }}>
                {item.statusValue === WorkflowApproverStatusEnum.Reject && item.returnTargetName ? (
                  <Text size="xs" c="gray.7">
                    <strong>{t('label.requests.workflow.returnTargetStep')}: </strong>
                    {item.returnTargetName}
                  </Text>
                ) : null}
                {(item.statusValue === WorkflowApproverStatusEnum.Reject ||
                  item.statusValue === WorkflowApproverStatusEnum.Cancel) &&
                item.note?.trim() ? (
                  <Text
                    size="xs"
                    c={`${getStatusColor(item.statusValue)}.9`}
                    className={classes.note}
                  >
                    <Text component="strong" inherit fw={600}>
                      {t(
                        item.statusValue === WorkflowApproverStatusEnum.Cancel
                          ? 'label.requests.workflow.actionNote.cancelNoteLabel'
                          : 'label.requests.workflow.actionNote.rejectNoteLabel'
                      )}
                      :{' '}
                    </Text>
                    {item.note.trim()}
                  </Text>
                ) : null}
              </Stack>
            </Timeline.Item>
          ))}
        </Timeline>
      </ModalBody>
      <ModalFooter>
        <Button variant="default" onClick={onClose}>
          {t('label.close')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
