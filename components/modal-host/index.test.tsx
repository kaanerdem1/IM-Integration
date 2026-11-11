import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';

import '@/_i18n/config';

import { ModalManagement } from './index';

const mocks = vi.hoisted(() => ({ requestDrawer: vi.fn(), taskDrawer: vi.fn() }));

vi.mock('@/pages/requests/RequestDrawerRouter', () => ({
  RequestDrawerRouter: () => {
    mocks.requestDrawer();
    return <div data-testid="hosted-request-drawer" />;
  },
}));
vi.mock('@/pages/tasks/form', () => ({
  Drawer_Task_Form: () => {
    mocks.taskDrawer();
    return <div data-testid="hosted-task-drawer" />;
  },
}));
vi.mock('@mantine/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@mantine/core')>()),
  Drawer: ({ children }: { children: ReactNode }) => (
    <section data-testid="service-inventory-drawer">{children}</section>
  ),
}));

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
};

describe('ModalManagement service inventory drawer', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    root = createRoot(container);
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = async (path: string) => {
    await act(async () => {
      root.render(
        <MantineProvider env="test">
          <MemoryRouter initialEntries={[path]}>
            <LocationProbe />
            <ModalManagement />
          </MemoryRouter>
        </MantineProvider>
      );
    });
    await act(async () => vi.dynamicImportSettled());
  };

  it.each([
    '/app/service-inventory',
    '/app/service-inventory/',
    '/APP/SERVICE-INVENTORY',
    '/app/service-inventory?modal=request&id=issue-id',
  ])('opens directly at %s without a task or request and closes to home', async (path) => {
    await render(path);

    expect(container.querySelector('[data-testid="service-inventory-drawer"]')).not.toBeNull();
    expect(mocks.taskDrawer).not.toHaveBeenCalled();
    expect(mocks.requestDrawer).not.toHaveBeenCalled();

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Servis envanterini kapat"]')
        ?.click();
    });

    expect(container.querySelector('[data-testid="location"]')).toHaveTextContent('/app/home');
    expect(container.querySelector('[data-testid="service-inventory-drawer"]')).toBeNull();
    expect(mocks.taskDrawer).not.toHaveBeenCalled();
    expect(mocks.requestDrawer).not.toHaveBeenCalled();
  });

  it('does not open service inventory from the removed task design query', async () => {
    await render('/app/tasks/task-id?drawer=design');
    expect(container.querySelector('[data-testid="hosted-task-drawer"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="service-inventory-drawer"]')).toBeNull();
    expect(mocks.requestDrawer).not.toHaveBeenCalled();
  });
});
