import { act, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDashboardAcceptanceQuery } from '@/_hooks/_modules/dashboard/useFilteredDashboardQueries';
import { buildRequestListPageFilter } from '@/pages/requests/list/_utils/buildRequestListPageFilter';
import {
  DEFAULT_REQUEST_FILTER_ID,
  getDefaultRequestFilterValue,
} from '../_config/defaultRequestFilter';
import { useSavedFilterSelectionStore as store } from '../_store/useSavedFilterSelectionStore';
import { useSavedFilterSelection } from './useSavedFilterSelection';
import { getSavedRequestFilterQueryKey } from './useSavedRequestFilterQuery';

const mocks = vi.hoisted(() => ({ request: vi.fn(), userId: 'user-a', renders: vi.fn() }));
vi.mock('@/_api-client/client', () => ({ apiClient: mocks.request }));
vi.mock('@/_hooks/_modules/auth/useSession', () => ({
  useSession: () => ({ me: mocks.userId ? { UserId: mocks.userId } : null }),
}));

const first = { Id: 'a-first', Name: 'A', Filter: JSON.stringify({ listAssignedUser: ['first'] }) };
const selected = {
  Id: 'a-selected',
  Name: 'B',
  Filter: JSON.stringify({ listAssignedUser: ['selected'] }),
};
const other = {
  Id: 'b-filter',
  Name: 'C',
  Filter: JSON.stringify({ listAssignedUser: ['other'] }),
};
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
const requests = (url: string) => mocks.request.mock.calls.filter(([config]) => config.url === url);
const Probe = () => {
  const { pageFilter, menuProps } = useSavedFilterSelection('home.acceptance');
  const { data } = useDashboardAcceptanceQuery(pageFilter);
  mocks.renders();
  return (
    <output
      data-selected={pageFilter ? menuProps.selectedFilterIds.join(',') : undefined}
      data-loaded={Boolean(data)}
    />
  );
};
const render = async (visible = true) => {
  await act(async () =>
    root.render(<QueryClientProvider client={client}>{visible && <Probe />}</QueryClientProvider>)
  );
};
const waitForSelection = async (id: string) => {
  await vi.waitFor(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(container.querySelector('output')).toHaveAttribute('data-selected', id);
    expect(container.querySelector('output')).toHaveAttribute('data-loaded', 'true');
    expect(client.isFetching()).toBe(0);
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userId = 'user-a';
  store.setState({ selectionsByUser: {} });
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  mocks.request.mockImplementation((config) =>
    Promise.resolve({
      Data:
        config.url === '/api/UserFormFilter/requests-list'
          ? mocks.userId === 'user-a'
            ? [selected, first]
            : [other]
          : {},
    })
  );
});
afterEach(() => {
  act(() => root.unmount());
  client.clear();
  store.persist.clearStorage();
  container.remove();
  vi.useRealTimers();
});

describe('user-scoped saved filter restoration', () => {
  it('keeps two controlled cells independent without writing the fixed-card selection', async () => {
    store.getState().select('id:user-a', 'home.acceptance', first.Id);
    const Cells = () => {
      const [firstIds, setFirstIds] = useState([selected.Id]);
      const [secondIds, setSecondIds] = useState([first.Id]);
      const a = useSavedFilterSelection('home.acceptance', {
        filterIds: firstIds,
        onChange: setFirstIds,
      });
      const b = useSavedFilterSelection('home.acceptance', {
        filterIds: secondIds,
        onChange: setSecondIds,
      });
      return (
        <>
          <output data-cell="a">{a.menuProps.selectedFilterIds.join(',')}</output>
          <output data-cell="b">{b.menuProps.selectedFilterIds.join(',')}</output>
          <button type="button" onClick={() => a.menuProps.onChange(first)}>
            toggle
          </button>
        </>
      );
    };
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Cells />
        </QueryClientProvider>
      )
    );
    await vi.waitFor(() =>
      expect(container.querySelector('[data-cell="a"]')).toHaveTextContent('a-selected')
    );
    await act(async () => container.querySelector('button')!.click());
    expect(container.querySelector('[data-cell="a"]')).toHaveTextContent('a-first,a-selected');
    expect(container.querySelector('[data-cell="b"]')).toHaveTextContent('a-first');
    expect(store.getState().selectionsByUser['id:user-a']['home.acceptance']?.filterIds).toEqual([
      'a-first',
    ]);
  });

  it('keeps combined criteria stable across catalog edits and resolves every preset on a later day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 14));
    const a = { ...first, Filter: '{"listIssueType":"1","listCreatedQuickRange":"last-year"}' };
    const b = { ...selected, Filter: '{"listIssueType":"2","listCreatedQuickRange":"last-month"}' };
    mocks.request.mockImplementation((config) =>
      Promise.resolve({
        Data: config.url === '/api/UserFormFilter/requests-list' ? [a, b] : {},
      })
    );
    store.getState().select('id:user-a', 'home.acceptance', [b.Id, a.Id]);
    await render();
    await waitForSelection([a.Id, b.Id].join(','));
    const before = requests('/api/Dashboard/acceptance')[0][0].data;
    expect(before).toMatchObject({ Logic: 'or', Filters: [{ Logic: 'and' }, { Logic: 'and' }] });
    await act(async () =>
      client.setQueryData(getSavedRequestFilterQueryKey('id:user-a'), {
        Data: [{ ...a, Name: 'Renamed' }, b, other],
      })
    );
    await render();
    expect(requests('/api/Dashboard/acceptance')).toHaveLength(1);
    vi.setSystemTime(new Date(2026, 9, 15));
    await render();
    await waitForSelection([a.Id, b.Id].join(','));
    expect(requests('/api/Dashboard/acceptance')).toHaveLength(2);
    const after = requests('/api/Dashboard/acceptance')[1][0].data;
    expect(after.Filters[0]).not.toEqual(before.Filters[0]);
    expect(after.Filters[1]).not.toEqual(before.Filters[1]);
    expect(requests('/api/UserFormFilter/requests-list')).toHaveLength(1);
  });

  it.each(['1', '2', '-1'])(
    'restores saved issue scope %s in dashboard requests without duplicate fetches',
    async (listIssueType) => {
      const filter = {
        ...selected,
        Filter: JSON.stringify({
          listIssueType,
          listAssignedUser: ['selected'],
          listSoftwareStep: ['42'],
          listOperationalStep: ['84'],
          listStep: ['999'],
        }),
      };
      mocks.request.mockImplementation((config) =>
        Promise.resolve({
          Data: config.url === '/api/UserFormFilter/requests-list' ? [filter] : {},
        })
      );
      store.getState().select('id:user-a', 'home.acceptance', filter.Id);
      await render();
      await waitForSelection(filter.Id);
      expect(requests('/api/Dashboard/acceptance')[0][0].data).toEqual(
        buildRequestListPageFilter({
          listIssueType,
          listAssignedUser: ['selected'],
          listStep: listIssueType === '1' ? ['42'] : listIssueType === '2' ? ['84'] : undefined,
        })
      );
      await render();
      expect(requests('/api/Dashboard/acceptance')).toHaveLength(1);
      expect(requests('/api/UserFormFilter/requests-list')).toHaveLength(1);
    }
  );

  it('resolves a saved preset without duplicate requests and recalculates on a later day', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5));
    const preset = { ...selected, Filter: '{"listCreatedQuickRange":"last-month"}' };
    mocks.request.mockImplementation((config) =>
      Promise.resolve({ Data: config.url === '/api/UserFormFilter/requests-list' ? [preset] : {} })
    );
    store.getState().select('id:user-a', 'home.acceptance', preset.Id);
    await render();
    await waitForSelection(preset.Id);
    expect(requests('/api/Dashboard/acceptance')).toHaveLength(1);
    const firstRequest = requests('/api/Dashboard/acceptance')[0][0].data;
    expect(firstRequest).toEqual(
      buildRequestListPageFilter({ listCreatedQuickRange: 'last-month' })
    );
    await render();
    expect(requests('/api/Dashboard/acceptance')).toHaveLength(1);

    vi.setSystemTime(new Date(2026, 9, 6));
    await render();
    await waitForSelection(preset.Id);
    expect(requests('/api/Dashboard/acceptance')).toHaveLength(2);
    expect(requests('/api/Dashboard/acceptance')[1][0].data).not.toEqual(firstRequest);
    expect(requests('/api/UserFormFilter/requests-list')).toHaveLength(1);
  });

  it.each([[], [selected, first]])(
    'uses the built-in default without creating a record: %j',
    async (...filters) => {
      mocks.request.mockImplementation((config) =>
        Promise.resolve({
          Data: config.url === '/api/UserFormFilter/requests-list' ? filters : {},
        })
      );
      await render();
      await waitForSelection(DEFAULT_REQUEST_FILTER_ID);
      expect(requests('/api/Dashboard/acceptance')).toHaveLength(1);
      expect(requests('/api/Dashboard/acceptance')[0][0].data).toEqual(
        buildRequestListPageFilter(getDefaultRequestFilterValue())
      );
      expect(
        mocks.request.mock.calls.every(([config]) =>
          ['/api/UserFormFilter/requests-list', '/api/Dashboard/acceptance'].includes(config.url)
        )
      ).toBe(true);
    }
  );

  it('uses the restored selection on the first data request and retains it across logout/login', async () => {
    localStorage.setItem(
      store.persist.getOptions().name!,
      JSON.stringify({
        version: 1,
        state: {
          selectionsByUser: {
            'id:user-a': { 'home.acceptance': { filterId: selected.Id, explicit: true } },
          },
        },
      })
    );
    await store.persist.rehydrate();
    await render();
    await waitForSelection(selected.Id);
    const calls = requests('/api/Dashboard/acceptance');
    expect(calls).toHaveLength(1);
    expect(calls[0][0].data).toMatchObject({ Value: ['selected'] });
    mocks.userId = '';
    await render(false);
    mocks.userId = 'user-a';
    await render();
    await waitForSelection(selected.Id);
    expect(requests('/api/Dashboard/acceptance')).toHaveLength(1);
  });

  it('waits for a stale catalog refresh before resolving an uncached saved selection', async () => {
    const queryKey = getSavedRequestFilterQueryKey('id:user-a');
    client.setQueryData(queryKey, { Data: [first] });
    await client.invalidateQueries({ queryKey, refetchType: 'none' });
    store.getState().select('id:user-a', 'home.acceptance', selected.Id);
    const pending = Promise.withResolvers<{ Data: (typeof selected)[] }>();
    mocks.request.mockImplementation((config) =>
      config.url === '/api/UserFormFilter/requests-list'
        ? pending.promise
        : Promise.resolve({ Data: {} })
    );

    await render();
    expect(requests('/api/Dashboard/acceptance')).toHaveLength(0);
    await act(async () => pending.resolve({ Data: [first, selected] }));
    await waitForSelection(selected.Id);
    expect(requests('/api/Dashboard/acceptance')).toHaveLength(1);
    expect(requests('/api/Dashboard/acceptance')[0][0].data).toMatchObject({ Value: ['selected'] });
  });

  it("never resolves another user's selection against the previous account's cached catalog", async () => {
    store.getState().select('id:user-a', 'home.acceptance', selected.Id);
    store.getState().select('id:user-b', 'home.acceptance', other.Id);
    await render();
    await waitForSelection(selected.Id);
    const pending = Promise.withResolvers<{ Data: (typeof other)[] }>();
    mocks.request.mockImplementation((config) =>
      config.url === '/api/UserFormFilter/requests-list'
        ? pending.promise
        : Promise.resolve({ Data: {} })
    );
    mocks.userId = 'user-b';
    await render();
    expect(container.querySelector('output')).not.toHaveAttribute('data-selected');
    expect(requests('/api/Dashboard/acceptance')).toHaveLength(1);
    await act(async () => pending.resolve({ Data: [other] }));
    await waitForSelection(other.Id);
    expect(requests('/api/Dashboard/acceptance')).toHaveLength(2);
    expect(requests('/api/Dashboard/acceptance').at(-1)?.[0].data).toMatchObject({
      Value: ['other'],
    });
    mocks.userId = 'user-a';
    await render();
    await waitForSelection(selected.Id);
    expect(requests('/api/UserFormFilter/requests-list')).toHaveLength(2);
  });

  it("does not fetch without a user identity or rerender for another placement's selection", async () => {
    mocks.userId = '';
    await render();
    expect(mocks.request).not.toHaveBeenCalled();
    mocks.userId = 'user-a';
    await render();
    await waitForSelection(DEFAULT_REQUEST_FILTER_ID);
    const before = mocks.renders.mock.calls.length;
    await act(async () => store.getState().select('id:user-a', 'sla.pool', selected.Id));
    expect(mocks.renders).toHaveBeenCalledTimes(before);
    expect(requests('/api/Dashboard/acceptance')).toHaveLength(1);
  });
});
