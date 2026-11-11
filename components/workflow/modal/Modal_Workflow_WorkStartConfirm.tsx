import { useTranslation } from 'react-i18next';
import { Text } from '@mantine/core';
import { TASK_NUMBER_BADGE_COLOR } from '@/_common/tasks/presentation';
import { getDate } from '@/_helpers/date';
import { ConfirmActionModal } from '@/components/display/Modal/ConfirmModal';
import { Modal } from '@/components/display/Modal/Modal';
import { useModalState } from '@/components/modal-host/_hook/useModal';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import { WorkflowEntityIdentity } from '@/components/workflow/WorkflowEntityIdentity';

export const Modal_Workflow_WorkStartConfirm = () => {
  const { t } = useTranslation();
  const { opened, options, closeModal } = useModalState('WorkflowWorkStartConfirm');
  const onClose = () => closeModal('WorkflowWorkStartConfirm');
  const plannedStartDate = getDate(options?.targetStartDate, 'd MMM yyyy');

  const handleConfirm = () => {
    // Ignore a second click or a callback from a confirmation that has been replaced.
    if (
      !options ||
      useModalStore.getState().getModalOption('WorkflowWorkStartConfirm') !== options
    ) {
      return;
    }
    onClose();
    options.onConfirm();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="sm"
      withCloseButton={false}
      closeOnClickOutside={false}
      returnFocus={false}
      attributes={{ content: { 'aria-label': t('label.requests.workflow.startWorkConfirmTitle') } }}
      data-testid="workflow-work-start-confirm"
    >
      {options ? (
        <ConfirmActionModal
          context={<WorkflowEntityIdentity entity={options.entity} />}
          title={t('label.requests.workflow.startWorkConfirmTitle')}
          description={t('label.requests.workflow.startWorkConfirmDescription')}
          loading={false}
          onCancel={onClose}
          onConfirm={handleConfirm}
          cancelLabel={t('label.giveUp')}
          confirmLabel={t('label.requests.workflow.startWork')}
          confirmColor={options.entity.kind === 'task' ? TASK_NUMBER_BADGE_COLOR : undefined}
          cancelButtonId="workflow-work-start-confirm-cancel-button"
          confirmButtonId="workflow-work-start-confirm-confirm-button"
        >
          {plannedStartDate ? (
            <Text size="xs" c="dimmed" ta="center" data-testid="workflow-work-start-confirm-plan">
              {t('label.requests.workflow.plannedStartDate')}:{' '}
              <time dateTime={getDate(options.targetStartDate, 'yyyy-MM-dd')}>
                {plannedStartDate}
              </time>
            </Text>
          ) : null}
        </ConfirmActionModal>
      ) : null}
    </Modal>
  );
};
