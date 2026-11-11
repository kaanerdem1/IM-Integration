import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { QueryKeys } from '@/_api/hooks/query-keys';
import { SavedFilterMenu } from './SavedFilterMenu';

vi.mock('@/_hooks/_modules/auth/useSession', () => ({
  useSession: () => ({ me: { UserId: 'test-user' } }),
}));

const mocks = vi.hoisted(() => ({ fetchFilters: vi.fn() }));

vi.mock('@/_api/_core/api-gen/user-form-filter', () => ({
  getUserFormFilter: () => ({ getApiUserFormFilterScreen: mocks.fetchFilters }),
}));
vi.mock('@/_api/hooks', async () => import('@/_api/hooks/user-form-filter.hooks'));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

let container: HTMLDivElement;
let root: Root;
let client: QueryClient;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mocks.fetchFilters.mockResolvedValue({ Data: [{ Id: 'filter-1', Name: 'Açık Talepler' }] });
});

afterEach(() => {
  act(() => root.unmount());
  client.clear();
  container.remove();
  vi.clearAllMocks();
});

const renderMenus = async (openedIndex: number | null, tooltipIndex: number | null = null) => {
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MantineProvider env="test">
          {[0, 1].map((index) => (
            <SavedFilterMenu
              key={index}
              selectedFilterIds={['filter-1']}
              menuProps={{ opened: index === openedIndex }}
              tooltipProps={{ opened: index === tooltipIndex }}
            />
          ))}
        </MantineProvider>
      </QueryClientProvider>
    );
  });
};

it('loads the default selection before opening, shares fresh cache, and respects invalidation', async () => {
  await renderMenus(null);
  expect(mocks.fetchFilters).toHaveBeenCalledTimes(1);

  await renderMenus(0);
  await act(async () => {
    await vi.waitFor(() =>
      expect(
        client.getQueryState([QueryKeys.UserFormFilterDetail, 'requests-list', 'id:test-user'])
          ?.status
      ).toBe('success')
    );
  });
  expect(mocks.fetchFilters).toHaveBeenCalledTimes(1);

  await renderMenus(null, 1);
  expect(document.querySelector('[role="tooltip"]')).toHaveTextContent('Açık Talepler');
  expect(document.querySelector('.mantine-ScrollArea-viewport')).toBeNull();
  expect(mocks.fetchFilters).toHaveBeenCalledTimes(1);

  await renderMenus(null);
  await renderMenus(1);
  expect(document.querySelector('[aria-current="true"]')).toHaveTextContent('Açık Talepler');
  expect(mocks.fetchFilters).toHaveBeenCalledTimes(1);

  mocks.fetchFilters.mockResolvedValue({ Data: [{ Id: 'filter-1', Name: 'Güncellenen Filtre' }] });
  await act(async () => {
    await client.invalidateQueries({ queryKey: [QueryKeys.UserFormFilterDetail] });
  });
  expect(mocks.fetchFilters).toHaveBeenCalledTimes(2);
  await renderMenus(1);
  expect(document.querySelector('[aria-current="true"]')).toHaveTextContent('Güncellenen Filtre');
});
