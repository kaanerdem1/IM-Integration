import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { theme } from '@/_assets/style/theme';
import { FormFieldNote } from './FormFieldNote';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('FormFieldNote', () => {
  it.each(['info', 'warning'] as const)(
    'centers the %s icon in the first text line without shrinking it',
    (tone) => {
      const container = document.createElement('div');
      document.body.append(container);
      const root = createRoot(container);

      try {
        act(() => {
          root.render(
            <MantineProvider env="test" theme={theme}>
              <FormFieldNote tone={tone}>
                İlk satır
                <br />
                İkinci satır
              </FormFieldNote>
            </MantineProvider>
          );
        });

        const note = container.querySelector<HTMLElement>('[data-form-field-note]')!;
        const icon = note.querySelector('svg')!;
        const text = note.querySelector<HTMLElement>('.mantine-Text-root')!;
        expect(note.style.fontSize).toBe('var(--mantine-font-size-xs)');
        expect(note.style.lineHeight).toBe('1.35');
        expect(note).toHaveStyle('--group-align: flex-start; --group-wrap: nowrap;');
        expect(icon.parentElement!.style.height).toBe('1lh');
        expect(icon.parentElement).toHaveStyle('align-items: center; flex-shrink: 0;');
        expect(icon).toHaveAttribute('width', '13');
        expect(icon).toHaveAttribute('height', '13');
        expect(text).toHaveAttribute('data-size', 'xs');
        expect(text.style.lineHeight).toBe('inherit');
        expect(text.querySelector('br')).not.toBeNull();
      } finally {
        act(() => root.unmount());
        container.remove();
      }
    }
  );
});
