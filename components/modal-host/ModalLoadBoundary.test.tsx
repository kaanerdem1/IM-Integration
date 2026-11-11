import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { theme } from '@/_assets/style/theme';
import modalClasses from '@/components/display/Modal/_style/style.module.scss';
import { ModalLoadBoundary, ModalLoadingFallback } from '@/components/modal-host/ModalLoadBoundary';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const BrokenModal = () => {
  throw new Error('chunk failed');
};

describe('ModalLoadBoundary', () => {
  it('allows dismissing a failed modal with Escape', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onClose = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    document.body.appendChild(container);
    try {
      act(() =>
        root.render(
          <MantineProvider env="test" theme={theme}>
            <ModalLoadBoundary resetKey="failed" onClose={onClose}>
              <BrokenModal />
            </ModalLoadBoundary>
          </MantineProvider>
        )
      );
      expect(document.querySelector('.mantine-Modal-close')).not.toBeNull();
      act(() =>
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      );
      expect(onClose).toHaveBeenCalledOnce();
    } finally {
      consoleError.mockRestore();
      act(() => root.unmount());
      container.remove();
    }
  });

  it('uses the standard padded body and footer for errors with the app theme', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onClose = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    document.body.appendChild(container);

    try {
      act(() => {
        root.render(
          <MantineProvider env="test" theme={theme}>
            <ModalLoadBoundary resetKey="broken" onClose={onClose}>
              <BrokenModal />
            </ModalLoadBoundary>
          </MantineProvider>
        );
      });

      expect(document.body.textContent).toContain('Pencere yüklenemedi');
      const viewport = document.querySelector<HTMLElement>('.mantine-ScrollArea-viewport');
      expect(viewport?.style.padding).toBe('var(--mantine-spacing-lg)');
      expect(viewport?.textContent).toContain('İçerik yüklenirken bir hata oluştu.');

      const closeButton = Array.from(document.body.querySelectorAll('button')).find(
        (button) => button.textContent === 'Kapat'
      );
      expect(closeButton).toBeDefined();
      expect(closeButton?.closest(`.${modalClasses.customModalFooter}`)).not.toBeNull();
      expect(viewport?.contains(closeButton!)).toBe(false);

      act(() => closeButton?.click());
      expect(onClose).toHaveBeenCalledOnce();
    } finally {
      consoleError.mockRestore();
      act(() => root.unmount());
      container.remove();
    }
  });

  it('keeps the loading indicator inside the standard padded body', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.appendChild(container);

    try {
      act(() =>
        root.render(
          <MantineProvider env="test" theme={theme}>
            <ModalLoadingFallback onClose={vi.fn()} />
          </MantineProvider>
        )
      );

      const viewport = document.querySelector<HTMLElement>('.mantine-ScrollArea-viewport');
      expect(viewport?.style.padding).toBe('var(--mantine-spacing-lg)');
      expect(viewport?.querySelector('.mantine-Loader-root')).not.toBeNull();
      expect(document.querySelector('.mantine-Modal-close')).toBeNull();
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });
});
