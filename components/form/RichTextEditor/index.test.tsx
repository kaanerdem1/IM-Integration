import { act } from 'react';
import { RichTextEditor } from '.';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';

describe('RichTextEditor list controls', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    // jsdom has no selection geometry for Tiptap's deferred focus scrolling.
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 0)
    );
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it.each([
    { label: 'Bullet list', tag: 'ul' },
    { label: 'Ordered list', tag: 'ol' },
  ])('toggles $label without mixing ProseMirror models', async ({ label, tag }) => {
    const onChange = vi.fn();

    await act(async () => {
      root.render(
        <MantineProvider env="test">
          <RichTextEditor defaultValue="<p>ada</p>" onChange={onChange} />
        </MantineProvider>
      );
    });

    const button = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    expect(button).not.toBeNull();

    await act(async () => button?.click());

    expect(container.querySelector(`.tiptap ${tag} > li > p`)).toHaveTextContent('ada');
    expect(onChange).toHaveBeenLastCalledWith(`<${tag}><li><p>ada</p></li></${tag}><p></p>`);

    await act(async () => button?.click());

    expect(container.querySelector(`.tiptap ${tag}`)).toBeNull();
    expect(onChange).toHaveBeenLastCalledWith('<p>ada</p><p></p>');
  });
});
