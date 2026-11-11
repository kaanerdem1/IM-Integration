import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { theme } from '@/_assets/style/theme';
import { FormTabActionFooter } from './FormTabActionFooter';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('FormTabActionFooter', () => {
  it('runs previous and continue actions with standard controls', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onContinue = vi.fn();
    const onPrevious = vi.fn();

    try {
      act(() => {
        root.render(
          <MantineProvider env="test" theme={theme}>
            <FormTabActionFooter
              actionButtonLabel="İlerle"
              actionMode="continue"
              dividerLabel="Teknik Analiz"
              onActionClick={onContinue}
              onPrevious={onPrevious}
              previousLabel="Görev"
              showPrevious
            />
          </MantineProvider>
        );
      });

      const previousButton = container.querySelector<HTMLButtonElement>('#previous-button');
      const continueButton = container.querySelector<HTMLButtonElement>('#next-button');

      expect(previousButton?.style.getPropertyValue('--button-radius')).toBe(
        'var(--mantine-radius-xl)'
      );
      expect(continueButton?.style.getPropertyValue('--button-radius')).toBe(
        'var(--mantine-radius-xl)'
      );

      act(() => previousButton?.click());
      act(() => continueButton?.click());

      expect(onPrevious).toHaveBeenCalledOnce();
      expect(onContinue).toHaveBeenCalledOnce();
      expect(container.textContent).toContain('Teknik Analiz');
      expect(container.querySelector('.tabler-icon-arrow-right')).not.toBeNull();
    } finally {
      act(() => root.unmount());
    }
  });

  it('renders the final save action without previous navigation for a single-tab form', () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    try {
      act(() => {
        root.render(
          <MantineProvider env="test" theme={theme}>
            <FormTabActionFooter
              actionButtonId="task-save-button"
              actionButtonLabel="Kaydet ve Oluştur"
              actionMode="save"
              dividerLabel="Görevi Oluştur"
            />
          </MantineProvider>
        );
      });

      expect(container.querySelector('#previous-button')).toBeNull();
      expect(container.querySelector('#task-save-button')).not.toBeNull();
      expect(
        container
          .querySelector<HTMLElement>('#task-save-button')
          ?.style.getPropertyValue('--button-radius')
      ).toBe('var(--mantine-radius-xl)');
      expect(container.querySelector('.tabler-icon-check')).not.toBeNull();
    } finally {
      act(() => root.unmount());
    }
  });
});
