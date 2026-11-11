import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useModalActions, useModalState } from '@/components/modal-host/_hook/useModal';
import { useModalStore } from '@/components/modal-host/core/useModalStore';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('useModalState', () => {
  beforeEach(() => {
    useModalStore.getState().closeModal();
  });

  it('keeps opened true and sets active false when another modal becomes topmost', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const snapshots: Array<{ active: boolean; opened: boolean }> = [];

    const Observer = () => {
      const { active, opened } = useModalState('UploadCancel');
      const { openModal } = useModalActions();

      snapshots.push({ active, opened });

      return (
        <>
          <button type="button" onClick={() => openModal('UploadCancel')}>
            Open upload
          </button>
          <button type="button" onClick={() => openModal('RequestDraftNotice')}>
            Open draft notice
          </button>
        </>
      );
    };

    document.body.appendChild(container);

    try {
      act(() => {
        root.render(<Observer />);
      });

      expect(snapshots.at(-1)).toEqual({ active: false, opened: false });

      act(() => {
        container.querySelectorAll('button')[0].click();
      });

      expect(snapshots.at(-1)).toEqual({ active: true, opened: true });

      act(() => {
        container.querySelectorAll('button')[1].click();
      });

      expect(snapshots.at(-1)).toEqual({ active: false, opened: true });
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it('does not rerender when unrelated stack updates keep the selected state unchanged', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onRender = vi.fn();

    const Observer = () => {
      useModalState('UploadCancel');
      onRender();
      return null;
    };

    document.body.appendChild(container);

    try {
      act(() => {
        root.render(<Observer />);
      });

      expect(onRender).toHaveBeenCalledOnce();

      act(() => {
        useModalStore.getState().openModal('RequestDraftNotice');
        useModalStore.getState().openModal('RequestDirtyCloseConfirm', { onConfirm: vi.fn() });
      });

      expect(onRender).toHaveBeenCalledOnce();
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it('does not rerender action-only consumers when modals open or close', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onRender = vi.fn();

    const Observer = () => {
      useModalActions();
      onRender();
      return null;
    };

    try {
      act(() => root.render(<Observer />));
      act(() => useModalStore.getState().openModal('RequestDraftNotice'));
      act(() => useModalStore.getState().openModal('UploadCancel'));
      act(() => useModalStore.getState().closeModal('UploadCancel'));
      act(() => useModalStore.getState().closeModal('RequestDraftNotice'));

      expect(onRender).toHaveBeenCalledOnce();
    } finally {
      act(() => root.unmount());
    }
  });
});
