import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { QueryKeys } from '@/_api/hooks/query-keys';
import { ENTITY_PERMISSION_CODES } from '@/_auth/role-management/entity';
import { dashboardQueryKeys } from '@/_hooks/_modules/dashboard/queryKeys';

import '@/_i18n/config';

import {
  DEFAULT_REQUEST_FILTER_ID,
  getDefaultRequestFilterValue,
} from '@/components/request-filter/_config/defaultRequestFilter';
import { savedFilterScopes } from '@/components/request-filter/_config/savedFilterScopes';
import { useSavedFilterSelection } from '@/components/request-filter/_hooks/useSavedFilterSelection';
import { useSavedFilterSelectionStore } from '@/components/request-filter/_store/useSavedFilterSelectionStore';
import { PendingAcceptanceCard } from '@/pages/home/_components/sections/summary-cards-section/PendingAcceptanceCard';
import { RequestTypeCard } from '@/pages/home/_components/sections/summary-cards-section/RequestTypeCard';
import { UpcomingRequestsCard } from '@/pages/home/_components/sections/summary-cards-section/UpcomingRequestsCard';
import { useHomeWelcomeStats } from '@/pages/home/_hooks/useHomeWelcomeStats';
import { PlannigFieldEnum } from '@/pages/requests/_shared/tabs/planning/types';
import { buildRequestListPath } from '@/pages/requests/list/_hooks/useOpenRequestList';
import { buildRequestListPageFilter } from '@/pages/requests/list/_utils/buildRequestListPageFilter';
import { PoolBreakdownCard } from './PoolBreakdownCard';

vi.mock('@/_hooks/_modules/auth/useSession', () => ({
  useSession: () => ({ me: { UserId: 'test-user' } }),
}));

const mocks = vi.hoisted(() => ({ request: vi.fn(), canView: true, filters: [] as unknown[] }));
vi.mock('@/_api-client/client', () => ({ apiClient: mocks.request }));
vi.mock('@/_api/hooks', async () => import('@/_api/hooks/user-form-filter.hooks'));
vi.mock('@/_auth/role-management/entity', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/_auth/role-management/entity')>()),
  useEntityPermissionControl: () => ({ canViewEntity: () => mocks.canView }),
}));

const first = {
  Id: 'one',
  Name: 'A Filtre',
  Filter: JSON.stringify({ listAssignedUser: ['user-a'], view: 'personal' }),
};
const secondValue = { listAssignedUser: ['user-b'], listRequestType: ['Operasyonel Talep'] };
const second = {
  Id: 'two',
  Name: 'B Filtre',
  Filter: JSON.stringify({ ...secondValue, view: 'all' }),
};
const WelcomeStats = () => {
  const { pageFilter } = useSavedFilterSelection('home.welcome');
  const stats = useHomeWelcomeStats(pageFilter);
  return <output data-testid="welcome-count">{stats.openRequestCount}</output>;
};
let root: Root;
let container: HTMLDivElement;
let client: QueryClient;
const graphRequests = () =>
  mocks.request.mock.calls.filter(([config]) => config.url === '/api/Dashboard/generic-graphics');
const waitFor = async (assertion: () => void) => {
  await vi.waitFor(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assertion();
  });
};
const expectStableStatusIcons = () => {
  expect(
    container.querySelector(
      '[data-testid="acceptance"] [data-tone="info"] .tabler-icon-clock-check'
    )
  ).not.toBeNull();
  expect(
    container.querySelector('[data-testid="coming"] [data-tone="info"] .tabler-icon-calendar-time')
  ).not.toBeNull();
};
const render = async () => {
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <MantineProvider env="test">
          <MemoryRouter>
            <div data-testid="home-pool">
              <PoolBreakdownCard
                filterScope="home.pool"
                entityPermissionCode={ENTITY_PERMISSION_CODES.dashboard.requestPool}
              />
            </div>
            <div data-testid="sla-pool">
              <PoolBreakdownCard
                filterScope="sla.pool"
                entityPermissionCode={ENTITY_PERMISSION_CODES.sla.pool}
              />
            </div>
            <div data-testid="request-type">
              <RequestTypeCard />
            </div>
            <div data-testid="acceptance">
              <PendingAcceptanceCard />
            </div>
            <div data-testid="coming">
              <UpcomingRequestsCard />
            </div>
            <WelcomeStats />
          </MemoryRouter>
        </MantineProvider>
      </QueryClientProvider>
    )
  );
  await waitFor(() =>
    expect(
      client.getQueryState([QueryKeys.UserFormFilterDetail, 'requests-list', 'id:test-user'])
        ?.status
    ).toBe('success')
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.canView = true;
  mocks.filters = [second, first];
  useSavedFilterSelectionStore.setState({ selectionsByUser: {} });
  for (const scope of savedFilterScopes) {
    useSavedFilterSelectionStore.getState().select('id:test-user', scope, first.Id);
  }
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  mocks.request.mockImplementation((config) => {
    if (config.url === '/api/UserFormFilter/requests-list') {
      return Promise.resolve({ Data: mocks.filters });
    }
    if (config.url === '/api/Dashboard/generic-graphics') {
      const isFirstFilter = config.data.Filter?.Value?.includes('user-a');
      return Promise.resolve({
        Data:
          config.data.PrimaryFieldValue === 'talep-havuzu'
            ? [
                { PrimaryMetric: 'Havuz 1', Count: isFirstFilter ? 4 : 9 },
                { PrimaryMetric: 'Havuz 2', Count: 3 },
              ]
            : [
                { PrimaryMetric: 'Operasyonel Talep', Count: 4 },
                { PrimaryMetric: 'İş Birimi Talebi', Count: isFirstFilter ? 3 : 0 },
              ],
      });
    }
    if (config.url === '/api/Dashboard/acceptance') {
      return Promise.resolve({
        Data: {
          Acceptance: {
            Count: JSON.stringify(config.data).includes('user-b') ? 0 : 4,
            IssueIds: ['issue-1'],
          },
        },
      });
    }
    if (config.url === '/api/Dashboard/coming') {
      return Promise.resolve({
        Data: [
          {
            Field: PlannigFieldEnum.Development,
            Count: JSON.stringify(config.data).includes('user-b') ? 0 : 4,
            NoStep: [{ No: 'YT-123' }],
          },
        ],
      });
    }
    return Promise.resolve({ Data: config.url === '/api/Dashboard/rejectList' ? [] : {} });
  });
});
afterEach(() => {
  act(() => root.unmount());
  client.clear();
  container.remove();
  vi.useRealTimers();
});

describe('generic graph breakdown cards', () => {
  it('shows SLA pool loading for the first and uncached filters, then reuses a ready result', async () => {
    const initialPool = Promise.withResolvers<{
      Data: { PrimaryMetric: string; Count: number }[];
    }>();
    const filteredPool = Promise.withResolvers<{
      Data: { PrimaryMetric: string; Count: number }[];
    }>();
    const request = mocks.request.getMockImplementation()!;
    mocks.request.mockImplementation((config, options) => {
      if (
        config.url === '/api/Dashboard/generic-graphics' &&
        config.data.PrimaryFieldValue === 'talep-havuzu'
      ) {
        return config.data.Filter?.Value?.includes('user-a')
          ? initialPool.promise
          : filteredPool.promise;
      }
      return request(config, options);
    });
    await render();
    const slaPool = container.querySelector('[data-testid="sla-pool"]')!;
    const homePool = container.querySelector('[data-testid="home-pool"]')!;
    const loader = () => slaPool.querySelector('.mantine-Loader-root');
    expect(loader()).not.toBeNull();
    expect(slaPool).not.toHaveTextContent('0 talebin havuz dağılımı');

    await act(async () => initialPool.resolve({ Data: [{ PrimaryMetric: 'Havuz 1', Count: 4 }] }));
    await waitFor(() => expect(slaPool).toHaveTextContent('4 talebin havuz dağılımı'));
    expect(loader()).toBeNull();

    const select = (id: string) =>
      act(async () =>
        useSavedFilterSelectionStore.getState().select('id:test-user', 'sla.pool', id)
      );
    await select(second.Id);
    expect(loader()).not.toBeNull();
    expect(slaPool).not.toHaveTextContent('4 talebin havuz dağılımı');
    expect(homePool).toHaveTextContent('4 talebin havuz dağılımı');

    await act(async () => filteredPool.resolve({ Data: [] }));
    await waitFor(() => expect(slaPool).toHaveTextContent('Henüz açık talep bulunmuyor'));
    expect(loader()).toBeNull();

    await select(first.Id);
    expect(slaPool).toHaveTextContent('4 talebin havuz dağılımı');
    expect(loader()).toBeNull();

    const poolRequest = graphRequests().find(
      ([config]) => config.data.PrimaryFieldValue === 'talep-havuzu'
    )!;
    const queryKey = [dashboardQueryKeys.genericGraphics, poolRequest[0].data];
    mocks.request.mockRejectedValueOnce(new Error('Pool refresh failed'));
    await act(async () => client.refetchQueries({ queryKey, exact: true }));
    await waitFor(() => {
      expect(client.getQueryState(queryKey)?.status).toBe('error');
      expect(slaPool).toHaveTextContent('4 talebin havuz dağılımı');
    });
  });

  it.each(['home-pool', 'sla-pool'])(
    'keeps pool bars tooltip-free while retaining proportions and rows in %s',
    async (section) => {
      await render();
      await waitFor(() =>
        expect(
          container.querySelector(`[data-testid="${section}"] [aria-label="Havuz 1: 4"]`)
        ).not.toBeNull()
      );
      const segment = container.querySelector<HTMLElement>(
        `[data-testid="${section}"] [aria-label="Havuz 1: 4"]`
      )!;
      vi.useFakeTimers();
      act(() => {
        segment.dispatchEvent(new MouseEvent('mouseenter'));
        segment.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        segment.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      });
      await act(async () => vi.advanceTimersByTimeAsync(800));
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
      expect(segment).not.toHaveAttribute('title');
      expect(segment).not.toHaveAttribute('tabindex');
      expect(parseFloat(segment.style.width)).toBeCloseTo((4 / 7) * 100);
      const card = container.querySelector(`[data-testid="${section}"]`)!;
      expect(card).toHaveTextContent('Havuz 1');
      expect(card).toHaveTextContent('%57');
      expect(card.querySelectorAll('a')).toHaveLength(2);
      expect(graphRequests()).toHaveLength(2);
    }
  );

  it.each([first.Id, DEFAULT_REQUEST_FILTER_ID])(
    'carries selection %s in all available card links',
    async (filterId) => {
      if (filterId === DEFAULT_REQUEST_FILTER_ID) {
        mocks.filters = [];
        useSavedFilterSelectionStore.setState({ selectionsByUser: {} });
      }
      await render();
      await waitFor(() => {
        for (const section of ['home-pool', 'sla-pool', 'request-type', 'acceptance', 'coming']) {
          const links = container.querySelectorAll<HTMLAnchorElement>(
            `[data-testid="${section}"] a`
          );
          expect(links.length).toBeGreaterThan(0);
          for (const link of links) {
            const params = new URL(link.href).searchParams;
            expect(params.get('listFilterId')).toBe(filterId);
          }
        }
      });
    }
  );

  it('sends the fixed primary fields with the selected filter and shares the pool request with SLA and welcome', async () => {
    await render();
    await waitFor(() => {
      expect(container.querySelector('[data-testid="home-pool"]')).toHaveTextContent(
        '7 talebin havuz dağılımı'
      );
      expect(container.querySelector('[data-testid="request-type"]')).toHaveTextContent(
        '7 talebin tür dağılımı'
      );
      expect(container.querySelector('[data-testid="welcome-count"]')).toHaveTextContent('7');
    });
    const calls = graphRequests();
    expect(calls).toHaveLength(2);
    expect(calls.map(([config]) => config.data.PrimaryFieldValue).sort()).toEqual([
      'talep-havuzu',
      'talep-turu',
    ]);
    for (const [config, options] of calls) {
      expect(config).toMatchObject({
        method: 'POST',
        data: {
          SecondaryFieldValue: null,
          All: true,
          Filter: { Field: 'AssigneUserCode', Operator: 'in', Value: ['user-a'] },
        },
      });
      expect(options.signal).toBeInstanceOf(AbortSignal);
    }
    expect(
      mocks.request.mock.calls.some(([config]) =>
        ['/api/Dashboard/pool', '/api/Dashboard/requesttype'].includes(config.url)
      )
    ).toBe(false);
    await render();
    expect(graphRequests()).toHaveLength(2);
  });

  it('applies a dropdown selection only to its own card and preserves filter conditions in row links', async () => {
    await render();
    await waitFor(() =>
      expect(container.querySelector('[data-testid="welcome-count"]')).toHaveTextContent('7')
    );
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-testid="home-pool"] button')?.click()
    );
    const option = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(
      (item) => item.textContent === second.Name
    );
    expect(option).toBeDefined();
    await act(async () => option!.click());
    await waitFor(() =>
      expect(container.querySelector('[data-testid="home-pool"]')).toHaveTextContent(
        '12 talebin havuz dağılımı'
      )
    );
    expect(graphRequests()).toHaveLength(3);
    expect(graphRequests().at(-1)?.[0].data).toMatchObject({
      PrimaryFieldValue: 'talep-havuzu',
      All: true,
    });
    expect(container.querySelector('[data-testid="sla-pool"]')).toHaveTextContent(
      '7 talebin havuz dağılımı'
    );
    expect(container.querySelector('[data-testid="welcome-count"]')).toHaveTextContent('7');
    expect(container.querySelector('[data-testid="home-pool"] a')).toHaveAttribute(
      'href',
      buildRequestListPath({ listRequestPool: ['Havuz 1'] }, [first.Id, second.Id])
    );

    await act(async () =>
      useSavedFilterSelectionStore.getState().select('id:test-user', 'home.requestType', second.Id)
    );
    await waitFor(() =>
      expect(container.querySelector('[data-testid="request-type"] a')).toHaveAttribute(
        'href',
        buildRequestListPath(secondValue, second.Id)
      )
    );
    expect(graphRequests().at(-1)?.[0].data).toMatchObject({
      PrimaryFieldValue: 'talep-turu',
      All: true,
    });
  });

  it('uses the shared last-year default without any saved filters and preserves it in row links', async () => {
    mocks.filters = [];
    useSavedFilterSelectionStore.setState({ selectionsByUser: {} });
    await render();
    expect(graphRequests()).toHaveLength(2);
    for (const [config] of graphRequests()) {
      expect(config.data.Filter).toEqual(
        buildRequestListPageFilter(getDefaultRequestFilterValue())
      );
    }
    await waitFor(() =>
      expect(container.querySelector('[data-testid="home-pool"] a')).toHaveAttribute(
        'href',
        buildRequestListPath(
          { ...getDefaultRequestFilterValue(), listRequestPool: ['Havuz 1'] },
          DEFAULT_REQUEST_FILTER_ID
        )
      )
    );
    expectStableStatusIcons();
  });

  it('selects the built-in default in the menu and data query after the active filter is deleted', async () => {
    await render();
    await act(async () =>
      useSavedFilterSelectionStore.getState().select('id:test-user', 'home.pool', second.Id)
    );
    await waitFor(() =>
      expect(container.querySelector('[data-testid="home-pool"]')).toHaveTextContent(
        '12 talebin havuz dağılımı'
      )
    );
    const third = { ...first, Id: 'three', Name: 'C Filtre' };
    await act(async () => {
      client.setQueryData([QueryKeys.UserFormFilterDetail, 'requests-list', 'id:test-user'], {
        Data: [third, first],
      });
    });
    await waitFor(() =>
      expect(graphRequests().at(-1)?.[0].data.Filter).toEqual(
        buildRequestListPageFilter(getDefaultRequestFilterValue())
      )
    );
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-testid="home-pool"] button')?.click()
    );
    expect(document.querySelector('[role="menuitem"][aria-current="true"]')).toHaveTextContent(
      'Tüm Talepler (Son 1 yıl)'
    );
    expect(document.querySelector('[role="menu"]')).not.toHaveTextContent(second.Name);
  });

  it('updates link identity without refetching identical filter criteria', async () => {
    await render();
    await waitFor(() =>
      expect(container.querySelector('[data-testid="home-pool"] a')).not.toBeNull()
    );
    const requestCount = graphRequests().length;
    const sameCriteria = { ...first, Id: 'same-criteria', Name: 'Aynı koşullu diğer filtre' };
    await act(async () => {
      client.setQueryData([QueryKeys.UserFormFilterDetail, 'requests-list', 'id:test-user'], {
        Data: [first, second, sameCriteria],
      });
      useSavedFilterSelectionStore.getState().select('id:test-user', 'home.pool', sameCriteria.Id);
    });
    await waitFor(() => {
      const link = container.querySelector<HTMLAnchorElement>('[data-testid="home-pool"] a')!;
      expect(new URL(link.href).searchParams.get('listFilterId')).toBe(sameCriteria.Id);
    });
    expect(graphRequests()).toHaveLength(requestCount);
  });

  it('keeps the acceptance and upcoming icons unchanged when filter results become empty', async () => {
    await render();
    await waitFor(() => {
      expect(container.querySelector('[data-testid="acceptance"]')).toHaveTextContent(
        'Toplam 4 talep'
      );
      expect(container.querySelector('[data-testid="coming"]')).toHaveTextContent('Toplam 4 talep');
    });
    expectStableStatusIcons();
    await act(async () => {
      useSavedFilterSelectionStore.getState().select('id:test-user', 'home.acceptance', second.Id);
      useSavedFilterSelectionStore.getState().select('id:test-user', 'home.coming', second.Id);
    });
    await waitFor(() => {
      expect(container.querySelector('[data-testid="acceptance"]')).not.toHaveTextContent(
        'Toplam 4 talep'
      );
      expect(container.querySelector('[data-testid="coming"]')).not.toHaveTextContent(
        'Toplam 4 talep'
      );
    });
    expectStableStatusIcons();
  });

  it('does not request breakdown data for unauthorized cards', async () => {
    mocks.canView = false;
    await render();
    expect(graphRequests()).toHaveLength(0);
    expect(container.querySelector('[data-testid="home-pool"]')).toBeEmptyDOMElement();
    expect(container.querySelector('[data-testid="request-type"]')).toBeEmptyDOMElement();
  });
});
