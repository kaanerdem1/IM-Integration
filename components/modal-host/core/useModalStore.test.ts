import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useModalStore } from './useModalStore';

describe('useModalStore', () => {
  beforeEach(() => {
    useModalStore.getState().closeModal();
  });

  it('does not notify subscribers for state-preserving operations', () => {
    const listener = vi.fn();
    const unsubscribe = useModalStore.subscribe(listener);

    useModalStore.getState().closeModal();
    useModalStore.getState().openModal('UploadCancel');
    useModalStore.getState().openModal('UploadCancel');
    useModalStore.getState().closeModal('RequestDraftNotice');

    expect(listener).toHaveBeenCalledOnce();

    useModalStore.getState().closeModal('UploadCancel');
    useModalStore.getState().closeModal('UploadCancel');

    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('moves an already open modal to the top of the stack', () => {
    useModalStore.getState().openModal('UploadCancel');
    useModalStore.getState().openModal('RequestDraftNotice');
    useModalStore.getState().openModal('UploadCancel');

    expect(useModalStore.getState().currentModals.map(({ type }) => type)).toEqual([
      'RequestDraftNotice',
      'UploadCancel',
    ]);
  });
});
