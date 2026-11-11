import { useShallow } from 'zustand/react/shallow';
import type { ModalState, ModalType } from '@/components/modal-host/core/type';
import { useModalStore } from '@/components/modal-host/core/useModalStore';
import type { ModalOptionsMap } from '@/components/modal-host/definition';

type ModalStateFor<T extends ModalType> = Extract<ModalState, { type: T }>;

export const useModal = () => {
  const closeModal = useModalStore((state) => state.closeModal);
  const getModalOption = useModalStore((state) => state.getModalOption);
  const hasModalOptions = useModalStore((state) => state.hasModalOptions);
  const isModalOpen = useModalStore((state) => state.isModalOpen);
  const openModal = useModalStore((state) => state.openModal);

  return {
    closeModal,
    getModalOption,
    hasModalOptions,
    isModalOpen,
    openModal,
  };
};

export const useModalActions = () =>
  useModalStore(
    useShallow((state) => ({
      closeModal: state.closeModal,
      openModal: state.openModal,
    }))
  );

export const useModalState = <T extends ModalType>(type: T) =>
  useModalStore(
    useShallow((state) => {
      const modal = state.currentModals.find((item) => item.type === type) as
        ModalStateFor<T> | undefined;
      const options =
        modal && 'options' in modal ? (modal.options as ModalOptionsMap[T] | undefined) : undefined;

      return {
        // `opened` means present in the stack; `active` means topmost and interactive.
        active: state.currentModals.at(-1)?.type === type,
        closeModal: state.closeModal,
        opened: Boolean(modal),
        options,
      };
    })
  );
