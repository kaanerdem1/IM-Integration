import { act, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider, Tabs } from '@mantine/core';
import { theme } from '@/_assets/style/theme';
import listClasses from '@/components/display/ListPage/style.module.scss';
import { DrawerDetailTabs } from './Tabs';

describe('DrawerDetailTabs', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const onChange = vi.fn();
  const scrollerRef = createRef<HTMLDivElement>();

  beforeEach(() => {
    onChange.mockClear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root.render(
        <MantineProvider theme={theme} env="test">
          <DrawerDetailTabs scrollerRef={scrollerRef} value="first" onChange={onChange}>
            <Tabs.Tab value="first">First</Tabs.Tab>
            <Tabs.Tab value="second">Second</Tabs.Tab>
            <Tabs.Tab value="locked" disabled>
              Locked
            </Tabs.Tab>
          </DrawerDetailTabs>
        </MantineProvider>
      );
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('uses centered, intrinsically sized content so overflowing tabs remain reachable', () => {
    const content = container.querySelector<HTMLElement>('.mantine-Scroller-content')!;
    expect(content.style.minWidth).toBe('100%');
    expect(content.style.width).toBe('max-content');
    expect(content.style.justifyContent).toBe('center');
    expect(scrollerRef.current).toBe(container.querySelector('.mantine-Scroller-root'));
    expect(
      container
        .querySelector<HTMLElement>('[role="tablist"]')!
        .style.getPropertyValue('--tabs-justify')
    ).toBe('center');
  });

  it('uses the request underline styling instead of the global pill style', () => {
    const tabs = container.querySelector('.mantine-Tabs-root');
    expect(tabs).toHaveClass(listClasses.modeTabs);
    expect(tabs).not.toHaveAttribute('data-app-tabs');
    expect(container.querySelector('[role="tablist"]')).toHaveClass(listClasses.modeTabsList);
    expect(container.querySelector('[role="tab"][data-active]')).toHaveClass(listClasses.modeTab);
    expect(
      container.querySelector<HTMLElement>('.mantine-Scroller-container')!.style.paddingBottom
    ).toBe('3px');
  });

  it('preserves selection callbacks and disabled tabs', () => {
    const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    act(() => tabs[1].click());
    expect(onChange).toHaveBeenCalledExactlyOnceWith('second');
    act(() => tabs[2].click());
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
