import { act } from 'react';
import classes from './_style/style.module.scss';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import {
  Modal as MantineModal,
  ModalStackContext as MantineModalStackContext,
  MantineProvider,
} from '@mantine/core';
import { Modal } from '@/components/display/Modal/Modal';
import {
  HostedModalStackCleanupProvider,
  HostedModalStackProvider,
} from '@/components/modal-host/HostedModalStackContext';
import { useHostedModalStackCleanup } from '@/components/modal-host/useHostedModalStackCleanup';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('Modal stack ownership', () => {
  it('does not update the stack when an automatic modal is initially closed', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const addModal = vi.fn();
    const removeModal = vi.fn();
    document.body.appendChild(container);

    try {
      act(() => {
        root.render(
          <MantineProvider>
            <MantineModalStackContext.Provider
              value={{
                stack: [],
                addModal,
                removeModal,
                getZIndex: () => '201',
                handledEscapeEvents: new WeakSet<KeyboardEvent>(),
                currentId: '',
                maxZIndex: 200,
              }}
            >
              <HostedModalStackCleanupProvider>
                <HostedModalStackProvider modalType="RequestDraftNotice">
                  <Modal opened={false} onClose={vi.fn()}>
                    Closed modal
                  </Modal>
                </HostedModalStackProvider>
              </HostedModalStackCleanupProvider>
            </MantineModalStackContext.Provider>
          </MantineProvider>
        );
      });

      expect(addModal).not.toHaveBeenCalled();
      expect(removeModal).not.toHaveBeenCalled();
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it('does not propagate Mantine stack updates through the cleanup context', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onCleanupConsumerRender = vi.fn();
    const CleanupConsumer = () => {
      useHostedModalStackCleanup();
      onCleanupConsumerRender();
      return null;
    };
    document.body.appendChild(container);

    try {
      act(() => {
        root.render(
          <MantineProvider>
            <MantineModal.Stack>
              <HostedModalStackCleanupProvider>
                <CleanupConsumer />
                <MantineModal opened stackId="performance-test" onClose={vi.fn()}>
                  Modal content
                </MantineModal>
              </HostedModalStackCleanupProvider>
            </MantineModal.Stack>
          </MantineProvider>
        );
      });

      expect(onCleanupConsumerRender).toHaveBeenCalledOnce();
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it('keeps a hosted modal visible when it renders a closed nested modal', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.appendChild(container);

    try {
      act(() => {
        root.render(
          <MantineProvider>
            <MantineModal.Stack>
              <HostedModalStackCleanupProvider>
                <HostedModalStackProvider modalType="RequestDraftNotice">
                  <Modal opened onClose={vi.fn()} title="Parent" transitionProps={{ duration: 0 }}>
                    Parent modal
                    <Modal
                      opened={false}
                      onClose={vi.fn()}
                      title="Selector"
                      transitionProps={{ duration: 0 }}
                    >
                      Selector content
                    </Modal>
                  </Modal>
                  <Modal
                    opened={false}
                    onClose={vi.fn()}
                    title="Sibling selector"
                    transitionProps={{ duration: 0 }}
                  >
                    Sibling selector content
                  </Modal>
                </HostedModalStackProvider>
              </HostedModalStackCleanupProvider>
            </MantineModal.Stack>
          </MantineProvider>
        );
      });

      const modalContent = document.body.querySelector('[data-modal-content]');

      expect(modalContent).not.toBeNull();
      expect(modalContent?.hasAttribute('data-hidden')).toBe(false);
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it('allows only the top modal to handle Escape and unregisters it on unmount', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onParentClose = vi.fn();
    const onChildClose = vi.fn();
    document.body.appendChild(container);

    try {
      act(() => {
        root.render(
          <MantineProvider>
            <MantineModal.Stack>
              <HostedModalStackCleanupProvider>
                <HostedModalStackProvider modalType="RequestDraftNotice">
                  <Modal
                    opened
                    onClose={onParentClose}
                    title="Parent"
                    transitionProps={{ duration: 0 }}
                  >
                    Parent modal
                  </Modal>
                </HostedModalStackProvider>
                <HostedModalStackProvider modalType="RequestDirtyCloseConfirm">
                  <Modal
                    opened
                    onClose={onChildClose}
                    title="Child"
                    transitionProps={{ duration: 0 }}
                  >
                    Child modal
                  </Modal>
                </HostedModalStackProvider>
              </HostedModalStackCleanupProvider>
            </MantineModal.Stack>
          </MantineProvider>
        );
      });

      const modalContents = [
        ...document.body.querySelectorAll<HTMLElement>('[data-modal-content]'),
      ];
      const parentContent = modalContents.find((content) =>
        content.textContent?.includes('Parent modal')
      );
      const childContent = modalContents.find((content) =>
        content.textContent?.includes('Child modal')
      );

      if (!parentContent || !childContent) {
        throw new Error('Expected parent and child modal contents to be rendered');
      }

      expect(parentContent.hasAttribute('data-hidden')).toBe(true);
      expect(parentContent.classList.contains(classes.stackModalContent)).toBe(true);
      expect(childContent.hasAttribute('data-hidden')).toBe(false);

      act(() => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
      });

      expect(onChildClose).toHaveBeenCalledOnce();
      expect(onParentClose).not.toHaveBeenCalled();

      act(() => {
        root.render(
          <MantineProvider>
            <MantineModal.Stack>
              <HostedModalStackCleanupProvider>
                <HostedModalStackProvider modalType="RequestDraftNotice">
                  <Modal
                    opened
                    onClose={onParentClose}
                    title="Parent"
                    transitionProps={{ duration: 0 }}
                  >
                    Parent modal
                  </Modal>
                </HostedModalStackProvider>
              </HostedModalStackCleanupProvider>
            </MantineModal.Stack>
          </MantineProvider>
        );
      });

      act(() => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
      });

      expect(onParentClose).toHaveBeenCalledOnce();
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });
});
