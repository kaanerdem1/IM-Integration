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
  it('opens the catalog shell inside the fullscreen drawer and closes back to home', () => {
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
      expect(drawer?.querySelector('[data-testid="catalog-shell"]')).not.toBeNull();
      expect(drawer?.querySelector('[data-testid="module-tree"]')).not.toBeNull();
      expect(drawer?.querySelector('[data-testid="service-stage"]')).not.toBeNull();
      expect(drawer?.querySelector('[data-testid="impact-summary"]')).not.toBeNull();
      expect(drawer?.textContent).toContain('CONS_DSS_APPLICATION_SEARCH_POPUP_LIST');

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
