import { useEffect, useEffectEvent } from 'react';
import { useBlocker, type BlockerFunction } from 'react-router';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import type { ModalOptionsMap } from '@/components/modal-host/definition';

// Mounted by the active drawer while it owns unsaved changes.
export const FormTabRouteGuard = ({
  shouldBlock,
  onDiscard,
}: {
  shouldBlock: BlockerFunction;
  onDiscard: () => boolean;
}) => {
  const blocker = useBlocker(shouldBlock);
  const discardChanges = useEffectEvent(onDiscard);

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      return;
    }

    const options: ModalOptionsMap['RequestDirtyCloseConfirm'] = {
      mode: 'tab-change',
      onCancel: blocker.reset,
      onConfirm: () => {
        if (discardChanges()) {
          blocker.proceed();
        } else {
          blocker.reset();
        }
      },
    };
    useModalStore.getState().openModal('RequestDirtyCloseConfirm', options);
    return () => {
      const modals = useModalStore.getState();
      if (modals.getModalOption('RequestDirtyCloseConfirm') === options) {
        modals.closeModal('RequestDirtyCloseConfirm');
      }
    };
  }, [blocker]);

  return null;
};
