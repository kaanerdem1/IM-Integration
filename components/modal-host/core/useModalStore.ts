import { create } from 'zustand';
import type { ModalOptionsMap } from '@/components/modal-host/definition';
import type { ModalState, ModalType } from './type';

type ModalStore = {
  currentModals: ModalState[];
  hasModalOptions: (modal: ModalState) => modal is Extract<ModalState, { options: unknown }>;

  openModal: {
    <T extends ModalType>(
      type: T,
      ...args: ModalOptionsMap[T] extends void
        ? []
        : undefined extends ModalOptionsMap[T]
          ? [options?: Exclude<ModalOptionsMap[T], undefined>]
          : [options: ModalOptionsMap[T]]
    ): void;
  };

  closeModal: (type?: ModalType) => void;
  isModalOpen: (type: ModalType) => boolean;
  getModalOption: <T extends ModalType>(type: T) => ModalOptionsMap[T] | undefined;
};

export const useModalStore = create<ModalStore>((set, get) => ({
  currentModals: [],

  hasModalOptions: (modal): modal is Extract<ModalState, { options: unknown }> => {
    return 'options' in modal;
  },

  openModal(type, ...args) {
    const options = args[0];

    set((state) => {
      const existingIndex = state.currentModals.findIndex((modal) => modal.type === type);
      const existingModal = state.currentModals[existingIndex];
      const existingOptions =
        existingModal && 'options' in existingModal ? existingModal.options : undefined;

      if (
        existingIndex !== -1 &&
        existingIndex === state.currentModals.length - 1 &&
        Object.is(existingOptions, options)
      ) {
        return state;
      }

      const modal: ModalState =
        options !== undefined ? ({ type, options } as ModalState) : ({ type } as ModalState);
      const remainingModals =
        existingIndex === -1
          ? state.currentModals
          : state.currentModals.filter((currentModal) => currentModal.type !== type);

      return { currentModals: [...remainingModals, modal] };
    });
  },

  closeModal(type) {
    if (!type) {
      set((state) => (state.currentModals.length ? { currentModals: [] } : state));
      return;
    }

    set((state) => {
      const index = state.currentModals.findIndex((modal) => modal.type === type);

      if (index === -1) {
        return state;
      }

      const next = [...state.currentModals];
      next.splice(index, 1);
      return { currentModals: next };
    });
  },

  isModalOpen(type) {
    return get().currentModals.some((m) => m.type === type);
  },

  getModalOption(type) {
    const modal = get().currentModals.find((m) => m.type === type);
    return modal && 'options' in modal
      ? (modal.options as ModalOptionsMap[typeof type])
      : undefined;
  },
}));
