import { useCallback, useContext, useRef, type ReactNode } from 'react';
import { ModalStackContext as MantineModalStackContext } from '@mantine/core';
import type { ModalType } from '@/components/modal-host/core/type';
import {
  HostedModalStackCleanupContext,
  HostedModalStackContext,
} from '@/components/modal-host/hosted-modal-stack-context-value';

export const HostedModalStackCleanupProvider = ({ children }: { children: ReactNode }) => {
  const modalStackContext = useContext(MantineModalStackContext);
  const modalStackContextRef = useRef(modalStackContext);

  modalStackContextRef.current = modalStackContext;

  const removeModal = useCallback((stackId: string) => {
    modalStackContextRef.current?.removeModal(stackId);
  }, []);

  return (
    <HostedModalStackCleanupContext.Provider value={removeModal}>
      {children}
    </HostedModalStackCleanupContext.Provider>
  );
};

export const HostedModalStackProvider = ({
  children,
  modalType,
}: {
  children: ReactNode;
  modalType: ModalType;
}) => (
  <HostedModalStackContext.Provider value={modalType}>{children}</HostedModalStackContext.Provider>
);
