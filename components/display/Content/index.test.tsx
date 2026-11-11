import { act } from 'react';
import { Content } from '.';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { theme } from '@/_assets/style/theme';

describe('Content', () => {
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

  it.each([undefined, false])(
    'does not add border or padding when withBorder is %s',
    (withBorder) => {
      act(() => {
        root.render(
          <MantineProvider theme={theme} env="test">
            <Content withBorder={withBorder}>Content</Content>
          </MantineProvider>
        );
      });

      const content = container.querySelector<HTMLElement>('.mantine-Paper-root');

      expect(content).not.toHaveAttribute('data-with-border');
      expect(content?.style.borderWidth).toBe('0rem');
      expect(content?.style.padding).toBe('');
      expect(content?.style.background).toBe('');
    }
  );

  it('uses the summary card appearance with withBorder and preserves section attributes', () => {
    act(() => {
      root.render(
        <MantineProvider theme={theme} env="test">
          <Content
            withBorder
            component="section"
            className="summary-section"
            data-pdf-avoid-break="true"
          >
            Summary
          </Content>
        </MantineProvider>
      );
    });

    const content = container.querySelector<HTMLElement>('section');

    expect(content).toHaveClass('summary-section', 'mantine-Paper-root');
    expect(content).toHaveAttribute('data-with-border');
    expect(content).toHaveAttribute('data-pdf-avoid-break', 'true');
    expect(content?.style.padding).toBe('0rem var(--mantine-spacing-md)');
    expect(content?.style.border).toContain('solid var(--mantine-color-gray-3)');
    expect(content?.style.background).toBe('var(--mantine-color-white)');
    expect(content?.style.getPropertyValue('--paper-radius')).toBe('var(--mantine-radius-md)');
    expect(content?.style.getPropertyValue('--paper-shadow')).toBe('var(--mantine-shadow-none)');
  });

  it.each([undefined, true])(
    'respects noBorder with a custom class when withBorder is %s',
    (withBorder) => {
      act(() => {
        root.render(
          <MantineProvider theme={theme} env="test">
            <Content noBorder withBorder={withBorder} p={0} className="empty-content">
              Empty
            </Content>
          </MantineProvider>
        );
      });

      const content = container.querySelector<HTMLElement>('.empty-content');

      expect(content).toHaveClass('noBorder');
      expect(content).not.toHaveAttribute('data-with-border');
      expect(content?.style.borderWidth).toBe('0rem');
      expect(content?.style.padding).toBe('0rem');
    }
  );

  it('allows callers to override the default appearance', () => {
    act(() => {
      root.render(
        <MantineProvider theme={theme} env="test">
          <Content withBorder p="md" radius="lg" bd="2px solid red.4" bg="gray.0">
            Preview
          </Content>
        </MantineProvider>
      );
    });

    const content = container.querySelector<HTMLElement>('.mantine-Paper-root');

    expect(content?.style.padding).toBe('var(--mantine-spacing-md)');
    expect(content?.style.getPropertyValue('--paper-radius')).toBe('var(--mantine-radius-lg)');
    expect(content?.style.border).toContain('solid var(--mantine-color-red-4)');
    expect(content?.style.background).toBe('var(--mantine-color-gray-0)');
  });
});
