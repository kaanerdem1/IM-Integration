import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { Modal } from '@mantine/core';
import { lazyWithRetry } from '@/_root/lazyWithRetry';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import {
  HostedModalStackCleanupProvider,
  HostedModalStackProvider,
} from '@/components/modal-host/HostedModalStackContext';
import { resolveActiveModalEntries } from '@/components/modal-host/modal-registry';
import { ModalLoadBoundary, ModalLoadingFallback } from '@/components/modal-host/ModalLoadBoundary';
import {
  shouldKeepRequestFormRendered,
  shouldRenderRequestForm,
  shouldRenderServiceInventoryDrawer,
  shouldRenderTaskForm,
} from './modalRendering';

const RequestDrawerRouter = lazyWithRetry(() =>
  import('@/pages/requests/RequestDrawerRouter').then((module) => ({
    default: module.RequestDrawerRouter,
  }))
);
const Drawer_Task_Form = lazyWithRetry(() =>
  import('@/pages/tasks/form').then((module) => ({
    default: module.Drawer_Task_Form,
  }))
);
const ServiceInventoryDrawer = lazyWithRetry(() =>
  import('@/pages/service-inventory/ServiceInventoryDrawer').then((module) => ({
    default: module.ServiceInventoryDrawer,
  }))
);

export const ModalManagement = () => {
  const location = useLocation();
  const currentModals = useModalStore((state) => state.currentModals);
  const closeModal = useModalStore((state) => state.closeModal);
  useEffect(() => () => closeModal(), [closeModal]);
  const activeModalEntries = useMemo(
    () => resolveActiveModalEntries(currentModals),
    [currentModals]
  );
  const shouldRenderRequestFormNow = shouldRenderRequestForm(location.pathname, location.search);
  const shouldRenderTaskFormNow = shouldRenderTaskForm(location.pathname);
  const shouldRenderServiceInventoryDrawerNow = shouldRenderServiceInventoryDrawer(
    location.pathname
  );
  const [hasRenderedRequestForm, setHasRenderedRequestForm] = useState(false);
  // The request form intentionally stays mounted to preserve its long-lived draft state.
  const renderRequestForm = shouldKeepRequestFormRendered(
    hasRenderedRequestForm,
    shouldRenderRequestFormNow
  );

  useLayoutEffect(() => {
    if (shouldRenderRequestFormNow) {
      setHasRenderedRequestForm(true);
    }
  }, [shouldRenderRequestFormNow]);

  return (
    <>
      {renderRequestForm ? (
        <Suspense fallback={null}>
          <RequestDrawerRouter />
        </Suspense>
      ) : null}

      {shouldRenderTaskFormNow ? (
        <Suspense fallback={null}>
          <Drawer_Task_Form />
        </Suspense>
      ) : null}

      {shouldRenderServiceInventoryDrawerNow ? (
        <Suspense fallback={null}>
          <ServiceInventoryDrawer />
        </Suspense>
      ) : null}

      <Modal.Stack>
        <HostedModalStackCleanupProvider>
          {activeModalEntries.map((entry) => {
            const ModalComponent = entry.component;
            const handleClose = () => closeModal(entry.type);

            return (
              <HostedModalStackProvider key={entry.key} modalType={entry.type}>
                <ModalLoadBoundary resetKey={entry.key} onClose={handleClose}>
                  <Suspense fallback={<ModalLoadingFallback onClose={handleClose} />}>
                    <ModalComponent />
                  </Suspense>
                </ModalLoadBoundary>
              </HostedModalStackProvider>
            );
          })}
        </HostedModalStackCleanupProvider>
      </Modal.Stack>
    </>
  );
};
