import { act, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { getDms } from '@/_api/_core/api-gen/dms';
import { theme } from '@/_assets/style/theme';
import { ModalLoadBoundary, ModalLoadingFallback } from '@/components/modal-host/ModalLoadBoundary';

vi.mock('@/_api/_core/api-gen/dms', () => ({ getDms: vi.fn() }));

describe('DocumentUploadModal integration', () => {
  it('opens a lazy upload modal with the real Dropzone under the app MantineProvider', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(true);
    const modalImport = import('./DocumentUploadModal');
    const LazyUploadModal = lazy(async () => ({
      default: (await modalImport).DocumentUploadModal,
    }));
    document.body.appendChild(container);

    try {
      await act(async () => {
        root.render(
          <MantineProvider env="test" theme={theme}>
            <ModalLoadBoundary resetKey="upload" onClose={onClose}>
              <Suspense fallback={<ModalLoadingFallback onClose={onClose} />}>
                <LazyUploadModal opened onClose={onClose} onSave={onSave} />
              </Suspense>
            </ModalLoadBoundary>
          </MantineProvider>
        );
        await modalImport;
      });

      expect(document.querySelector('.mantine-Dropzone-root')).not.toBeNull();
      expect(document.querySelector('input[type="file"]')).not.toBeNull();
      expect(document.querySelector('.mantine-Modal-title')?.textContent).toBe('Doküman Ekle');
      expect(document.body.textContent).not.toContain('Pencere yüklenemedi');
      expect(getDms).not.toHaveBeenCalled();
      expect(onSave).not.toHaveBeenCalled();

      act(() => document.querySelector<HTMLButtonElement>('#document-upload-cancel')!.click());
      expect(onClose).toHaveBeenCalledOnce();
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });
});
