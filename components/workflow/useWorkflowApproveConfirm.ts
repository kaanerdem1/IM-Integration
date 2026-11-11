import { useEffect } from 'react';
import { useCallbackRef } from '@mantine/hooks';
import { useModalActions } from '@/components/modal-host/_hook/useModal';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import type { WorkflowEntityReference } from './WorkflowEntityIdentity';

type Props = {
  entity: WorkflowEntityReference;
  recordId?: string;
  stepId?: string;
  stepName?: string;
  approverId?: string | null;
  enabled: boolean;
  onApprove: () => void | Promise<unknown>;
};

export const useWorkflowApproveConfirm = ({
  entity,
  recordId,
  stepId,
  stepName,
  approverId,
  enabled,
  onApprove,
}: Props) => {
  const { openModal } = useModalActions();
  const onConfirm = useCallbackRef(() => {
    if (enabled) {
      return onApprove();
    }
  });

  // The confirmation belongs to this record, step and approver only.
  useEffect(
    () => () => {
      const store = useModalStore.getState();
      if (store.getModalOption('WorkflowApproveConfirm')?.onConfirm === onConfirm) {
        store.closeModal('WorkflowApproveConfirm');
      }
    },
    [recordId, stepId, approverId, enabled, onConfirm]
  );

  return () => {
    if (enabled) {
      openModal('WorkflowApproveConfirm', { entity, stepName, onConfirm });
    }
  };
};
