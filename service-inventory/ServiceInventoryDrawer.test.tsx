import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider, type DrawerProps } from '@mantine/core';
import drawerClasses from '@/components/display/DetailDrawerSkelaton/style.module.scss';

import '@/_i18n/config';

import { SERVICE_INVENTORY_PATH } from './routes';
import { ServiceInventoryDrawer } from './ServiceInventoryDrawer';

const mocks = vi.hoisted(() => ({ drawerProps: vi.fn() }));

vi.mock('@mantine/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@mantine/core')>()),
  Drawer: ({ children, ...props }: DrawerProps) => {
    mocks.drawerProps(props);
    return <section data-testid="service-inventory-drawer">{children}</section>;
  },
}));

describe('ServiceInventoryDrawer', () => {
  it('fills the viewport with an inset, rounded corners, empty content and a close button', () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    document.body.appendChild(container);

    try {
      act(() => {
        root.render(
          <MantineProvider env="test">
            <MemoryRouter initialEntries={[SERVICE_INVENTORY_PATH]}>
              <Routes>
                <Route path={SERVICE_INVENTORY_PATH} element={<ServiceInventoryDrawer />} />
                <Route path="/app/home" element={<div data-testid="home" />} />
              </Routes>
            </MemoryRouter>
          </MantineProvider>
        );
      });

      const drawer = container.querySelector('[data-testid="service-inventory-drawer"]');
      expect(mocks.drawerProps).toHaveBeenLastCalledWith(
        expect.objectContaining({
          size: 'var(--detail-drawer-size)',
          radius: 14,
          offset: 10,
          position: 'right',
          overlayProps: { backgroundOpacity: 0.2, blur: 4 },
          classNames: {
            ...drawerClasses,
            root: drawerClasses.responsiveServiceInventoryRoot,
            content: `${drawerClasses.content} ${drawerClasses.responsiveContent}`,
            body: `${drawerClasses.body} ${drawerClasses.responsiveBody}`,
          },
        })
      );
      expect(drawer?.querySelector('input')).toBeNull();
      expect(drawer?.querySelector('[role="tablist"]')).toBeNull();
      expect(drawer?.querySelectorAll('button')).toHaveLength(1);

      act(() => {
        drawer
          ?.querySelector<HTMLButtonElement>('[aria-label="Servis envanterini kapat"]')
          ?.click();
      });
      expect(container.querySelector('[data-testid="service-inventory-drawer"]')).toBeNull();
      expect(container.querySelector('[data-testid="home"]')).not.toBeNull();
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });
});
