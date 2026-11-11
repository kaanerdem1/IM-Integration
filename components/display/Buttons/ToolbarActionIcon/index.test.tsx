import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MantineProvider, Menu } from '@mantine/core';
import { ToolbarActionIcon } from './index';

describe('ToolbarActionIcon', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('hides the trigger tooltip while its menu is open and restores it after closing', async () => {
    await act(async () =>
      root.render(
        <MantineProvider env="test">
          <Menu>
            <Menu.Target>
              <ToolbarActionIcon label="Columns" icon={<span />} />
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item>Request number</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </MantineProvider>
      )
    );
    const trigger = container.querySelector<HTMLButtonElement>('button')!;
    await act(async () => trigger.dispatchEvent(new MouseEvent('mouseenter')));
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('Columns');

    await act(async () => trigger.click());
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-label', 'Columns');
    expect(document.querySelector('[role="menu"]')).toBeInTheDocument();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    await act(async () => document.querySelector<HTMLButtonElement>('[role="menuitem"]')!.click());
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await act(async () => trigger.dispatchEvent(new MouseEvent('mouseleave')));
    await act(async () => trigger.dispatchEvent(new MouseEvent('mouseenter')));
    expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('Columns');
  });

  it.each(['true', 'false'] as const)(
    'respects the string aria-expanded value %s',
    async (expanded) => {
      await act(async () =>
        root.render(
          <MantineProvider env="test">
            <ToolbarActionIcon aria-expanded={expanded} label="Columns" icon={<span />} />
          </MantineProvider>
        )
      );
      await act(async () =>
        container.querySelector('button')!.dispatchEvent(new MouseEvent('mouseenter'))
      );
      if (expanded === 'true') {
        expect(document.querySelector('[role="tooltip"]')).toBeNull();
      } else {
        expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('Columns');
      }
    }
  );

  it.each([
    { indicatorColor: undefined, expectedColor: 'var(--mantine-color-cyan-filled)' },
    { indicatorColor: 'indigo.8', expectedColor: 'var(--mantine-color-indigo-8)' },
  ])(
    'uses $expectedColor independently of the button color',
    ({ indicatorColor, expectedColor }) => {
      act(() => {
        root.render(
          <MantineProvider env="test">
            <ToolbarActionIcon
              active
              color="gray.7"
              indicatorColor={indicatorColor}
              icon={<span />}
              label="Pin"
            />
          </MantineProvider>
        );
      });

      const indicator = container.querySelector<HTMLElement>('.mantine-Indicator-root');
      expect(indicator?.style.getPropertyValue('--indicator-color')).toBe(expectedColor);
      expect(container.querySelector('button')?.hasAttribute('indicatorColor')).toBe(false);
    }
  );
});
