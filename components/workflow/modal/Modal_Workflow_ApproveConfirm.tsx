import { useTranslation } from 'react-i18next';
import { TASK_NUMBER_BADGE_COLOR } from '@/_common/tasks/presentation';
import { ConfirmActionModal } from '@/components/display/Modal/ConfirmModal';
import { Modal } from '@/components/display/Modal/Modal';
import { useModalState } from '@/components/modal-host/_hook/useModal';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import { WorkflowEntityIdentity } from '../WorkflowEntityIdentity';

export const Modal_Workflow_ApproveConfirm = () => {
  const { t } = useTranslation();
  const { opened, options, closeModal } = useModalState('WorkflowApproveConfirm');
  const onClose = () => closeModal('WorkflowApproveConfirm');
  const title = t('label.requests.workflow.approve');
  const stepName = options?.stepName?.trim();

  const handleConfirm = () => {
    if (!options || useModalStore.getState().getModalOption('WorkflowApproveConfirm') !== options) {
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
      attributes={{ content: { 'aria-label': title } }}
      data-testid="workflow-approve-confirm"
    >
      {options ? (
        <ConfirmActionModal
          context={<WorkflowEntityIdentity entity={options.entity} />}
          title={title}
          description={
            stepName
              ? t('label.requests.workflow.approveStepConfirmDescription', { stepName })
              : t('label.requests.workflow.approveConfirmDescription')
          }
          loading={false}
          onCancel={onClose}
          onConfirm={handleConfirm}
          cancelLabel={t('label.giveUp')}
          confirmLabel={title}
          confirmColor={options.entity.kind === 'task' ? TASK_NUMBER_BADGE_COLOR : undefined}
          cancelButtonId="workflow-approve-confirm-cancel-button"
          confirmButtonId="workflow-approve-confirm-confirm-button"
        />
      ) : null}
    </Modal>
  );
};
