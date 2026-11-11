import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSavedRequestFilterPersistence } from './useSavedRequestFilterPersistence';
import { getSavedRequestFilterQueryKey } from './useSavedRequestFilterQuery';

const mocks = vi.hoisted(() => ({ update: vi.fn(), create: vi.fn(), message: vi.fn() }));
vi.mock('@/_api/hooks', () => ({
  QueryKeys: { UserFormFilterDetail: 'UserFormFilterDetail' },
  useUserFormFilterCreate: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUserFormFilterUpdate: () => ({ mutateAsync: mocks.update, isPending: false }),
}));
vi.mock('react-i18next', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/_hooks/useMessage', () => ({ useMessage: () => ({ message: mocks.message }) }));
vi.mock('@/_hooks/_modules/auth/useSession', () => ({
  useSession: () => ({ me: { UserId: 'current-user' } }),
}));

describe('confirmed saved filter updates', () => {
  let root: Root;
  let container: HTMLDivElement;
  let client: QueryClient;
  let state: ReturnType<typeof useSavedRequestFilterPersistence>;
  const item = { Id: 'a', Name: 'A', Description: 'Original', Filter: '{"listNo":["A"]}' };
  const other = { Id: 'b', Name: 'B', Filter: '{"listNo":["B"]}' };
  const key = getSavedRequestFilterQueryKey('id:current-user');
  const otherKey = getSavedRequestFilterQueryKey('id:other-user');
  const Probe = () => {
    state = useSavedRequestFilterPersistence();
    return null;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(key, { Data: [item, other] });
    client.setQueryData(otherKey, { Data: [item, other] });
    mocks.update.mockResolvedValue({ Data: true });
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe />
        </QueryClientProvider>
      )
    );
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    client.clear();
    container.remove();
    vi.restoreAllMocks();
  });

  it('updates only the confirmed record in the current account and invalidates the shared catalog', async () => {
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    await act(async () => {
      expect(
        await state.persist({
          item,
          name: 'Updated A',
          description: 'New description',
          value: { listNo: ['NEW-A'] },
        })
      ).toBe(true);
    });
    expect(client.getQueryData(key)).toEqual({
      Data: [
        {
          ...item,
          Name: 'Updated A',
          Description: 'New description',
          Filter: '{"listNo":["NEW-A"]}',
          Screen: 'requests-list',
        },
        other,
      ],
    });
    expect(client.getQueryData(otherKey)).toEqual({ Data: [item, other] });
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({ queryKey: key, exact: true });
    expect(mocks.message).toHaveBeenCalledOnce();
  });

  it.each([{ Data: false }, { Error: { Message: 'Rejected' } }])(
    'does not publish failed updates: %j',
    async (response) => {
      const invalidate = vi.spyOn(client, 'invalidateQueries');
      mocks.update.mockResolvedValue(response);
      await act(async () => {
        expect(
          await state.persist({
            item,
            name: 'Failed',
            description: '',
            value: { listNo: ['FAILED'] },
          })
        ).toBe(false);
      });
      expect(client.getQueryData(key)).toEqual({ Data: [item, other] });
      expect(invalidate).not.toHaveBeenCalled();
      expect(mocks.message).not.toHaveBeenCalled();
    }
  );
});
