import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { LeftContent } from './LeftContent';

describe('LeftContent', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('keeps the Mantine viewport ref while scrollbars are toggled', () => {
    const viewportRef = createRef<HTMLDivElement>();

    act(() => {
      root.render(
        <MantineProvider env="test">
          <LeftContent ref={viewportRef}>Content</LeftContent>
        </MantineProvider>
      );
    });

    expect(viewportRef.current).toBeInstanceOf(HTMLDivElement);
    expect(viewportRef.current?.hasAttribute('data-scrollarea-viewport')).toBe(true);
    expect(container.querySelector('.mantine-ScrollArea-root')).not.toBeNull();

    act(() => {
      root.render(
        <MantineProvider env="test">
          <LeftContent ref={viewportRef} scrollbars={false}>
            Content
          </LeftContent>
        </MantineProvider>
      );
    });

    expect(viewportRef.current?.hasAttribute('data-scrollarea-viewport')).toBe(true);
    expect(container.querySelector('.mantine-ScrollArea-root')).not.toBeNull();
  });
});
