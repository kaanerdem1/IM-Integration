import { act, type ComponentProps } from 'react';
import { createInstance } from 'i18next';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import en from '@/_i18n/En';
import tr from '@/_i18n/Tr';
import { ModalFooter } from './ModalFooter';

describe('ModalFooter translations', () => {
  const i18n = createInstance();
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(async () => {
    await i18n.init({
      lng: 'tr',
      resources: { tr: { translation: tr }, en: { translation: en } },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (props: ComponentProps<typeof ModalFooter> = {}) => {
    act(() => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <MantineProvider env="test">
            <ModalFooter cancelButtonId="cancel" submitButtonId="submit" {...props} />
          </MantineProvider>
        </I18nextProvider>
      );
    });
  };

  it.each([
    { language: 'tr', create: 'Oluştur', update: 'Güncelle', delete: 'Sil', cancel: 'İptal' },
    { language: 'en', create: 'Create', update: 'Update', delete: 'Delete', cancel: 'Cancel' },
  ])('renders complete default labels in $language', async (labels) => {
    await i18n.changeLanguage(labels.language);
    for (const [props, expected] of [
      [{}, labels.create],
      [{ isUpdate: true }, labels.update],
      [{ isDelete: true }, labels.delete],
    ] as const) {
      render(props);
      expect(container.querySelector('#submit')?.textContent).toBe(expected);
      expect(container.querySelector('#cancel')?.textContent).toBe(labels.cancel);
      expect(container.textContent).not.toContain('{{');
    }
  });

  it.each([false, true])('preserves custom confirmation text with isUpdate=%s', (isUpdate) => {
    render({ isUpdate, okText: 'Özel işlem' });
    expect(container.querySelector('#submit')?.textContent).toBe('Özel işlem');
    expect(container.querySelector('#submit')).toHaveAttribute('type', 'submit');
  });

  it('preserves cancel handling and disables actions while loading', () => {
    const onClose = vi.fn();
    render({ onClose });
    act(() => container.querySelector<HTMLButtonElement>('#cancel')?.click());
    expect(onClose).toHaveBeenCalledOnce();

    render({ onClose, loading: true });
    expect(container.querySelector('#cancel')).toBeDisabled();
    expect(container.querySelector('#submit')).toBeDisabled();
    act(() => container.querySelector<HTMLButtonElement>('#cancel')?.click());
    expect(onClose).toHaveBeenCalledOnce();
  });
});
