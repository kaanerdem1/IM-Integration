import { act, Fragment, StrictMode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDefaultRequestFilterValue } from '@/components/request-filter/_config/defaultRequestFilter';
import { RequestFilterScope } from '@/components/request-filter/_config/requestFilterScope';
import * as filterBuilder from '@/pages/requests/list/_utils/buildRequestListPageFilter';
import { buildRequestListPageFilter } from '@/pages/requests/list/_utils/buildRequestListPageFilter';
import * as savedFilterParser from '@/pages/requests/list/_utils/savedRequestListFilter';
import type { DashboardGraphicConfiguration } from '../types';
import { useGraphicData } from './useGraphicData';

const mocks = vi.hoisted(() => ({
  fetchGraphic: vi.fn(),
  parameters: { Data: { Items: [{ Label: 'İş Birimi', Value: 'unit' }] } },
  filters: { Data: [{ Id: 'filter-1', Name: 'Filtre', Filter: '{"listNo":["REQ-1"]}' }] },
}));

vi.mock('@/_api/_core/api-gen/dashboard', () => ({
  getDashboard: () => ({ postApiDashboardGenericGraphics: mocks.fetchGraphic }),
}));
vi.mock('@/_api/hooks', async () => ({
  ...(await import('@/_api/hooks/dashboard.hooks')),
  useParameterDetail: () => ({ data: mocks.parameters, isPending: false, isError: false }),
}));
vi.mock('@/components/request-filter/_hooks/useSavedRequestFilterQuery', () => ({
  useSavedRequestFilterQuery: () => ({
    query: { data: mocks.filters, isPending: false, isError: false },
  }),
}));

const configuration: DashboardGraphicConfiguration = {
  PrimaryFieldValue: 'unit',
  GraphicType: 'stacked-horizontal-bar',
  UserFormFilterIds: ['filter-1'],
};

describe('useGraphicData', () => {
  let root: Root;
  let container: HTMLDivElement;
  let client: QueryClient;
  const results = new Map<string, ReturnType<typeof useGraphicData>>();
  const Probe = ({ id, graphic }: { id: string; graphic?: DashboardGraphicConfiguration }) => {
    results.set(id, useGraphicData(graphic));
    return null;
  };
  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  };
  const render = async (
    graphic: DashboardGraphicConfiguration | undefined = configuration,
    withPreview = false,
    strict = false
  ) => {
    const Wrapper = strict ? StrictMode : Fragment;
    await act(async () =>
      root.render(
        <Wrapper>
          <QueryClientProvider client={client}>
            <Probe id="home" graphic={graphic} />
            {withPreview ? <Probe id="preview" graphic={graphic} /> : null}
          </QueryClientProvider>
        </Wrapper>
      )
    );
    await flush();
  };

  beforeEach(() => {
    mocks.filters = {
      Data: [{ Id: 'filter-1', Name: 'Filtre', Filter: '{"listNo":["REQ-1"]}' }],
    };
    mocks.fetchGraphic
      .mockReset()
      .mockResolvedValue({ Data: [{ PrimaryMetric: 'Birim', Count: 5 }] });
    // Match production defaults instead of hiding mount refetches with infinite stale time.
    client = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    results.clear();
  });
  afterEach(() => {
    act(() => root.unmount());
    client.clear();
    container.remove();
    vi.restoreAllMocks();
  });

  it('does not fetch for an empty or invalid configuration', async () => {
    await render({});
    expect(mocks.fetchGraphic).not.toHaveBeenCalled();
    expect(results.get('home')?.hasInvalidConfiguration).toBe(true);
    await act(async () =>
      root.render(
        <QueryClientProvider client={client}>
          <Probe id="home" />
        </QueryClientProvider>
      )
    );
    await flush();
    expect(mocks.fetchGraphic).not.toHaveBeenCalled();
  });

  it.each([undefined, null, []])(
    'preserves the default last-year preset for navigation without a saved filter (%j)',
    async (UserFormFilterIds) => {
      await render({ ...configuration, UserFormFilterIds }, true);
      const defaultFilter = getDefaultRequestFilterValue();
      expect(mocks.fetchGraphic).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ Filter: buildRequestListPageFilter(defaultFilter) }),
        { signal: expect.any(AbortSignal) }
      );
      for (const consumer of ['home', 'preview']) {
        expect(results.get(consumer)?.drilldown.filters).toEqual(defaultFilter);
      }
    }
  );

  it.each([
    { listCreatedQuickRange: 'last-month', listEstimatedAnalysisQuickRange: 'last-week' },
    { listCreatedFrom: '1759784400', listCreatedTo: '1791406799' },
    {},
  ] as const)(
    'preserves saved criteria instead of replacing them with resolved dates: %j',
    async (value) => {
      mocks.filters.Data[0].Filter = JSON.stringify(value);
      await render(configuration, true);
      expect(mocks.fetchGraphic).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ Filter: buildRequestListPageFilter(value) }),
        { signal: expect.any(AbortSignal) }
      );
      for (const consumer of ['home', 'preview']) {
        expect(results.get(consumer)?.drilldown).toMatchObject({
          filterIds: ['filter-1'],
          filters: value,
        });
        expect(results.get(consumer)?.drilldown.filters).toEqual(value);
      }
    }
  );

  it('rejects an old saved unspecified scope without broadening the graph filter', async () => {
    const saved = {
      listBreakdowns: JSON.stringify([
        { field: 'talep-boyutu', value: null, label: 'Belirtilmemiş' },
      ]),
    };
    mocks.filters.Data[0].Filter = JSON.stringify(saved);
    await render(configuration, true);
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(1);
    expect(mocks.fetchGraphic.mock.lastCall?.[0].Filter).toEqual({
      Field: 'No',
      Operator: 'in',
      Value: [],
      Logic: 'and',
      Filters: [],
    });
    expect(results.get('preview')?.isFetching).toBe(false);
  });

  it('shares an in-flight request between concurrent consumers in StrictMode', async () => {
    let resolveRequest:
      ((response: { Data: { PrimaryMetric: string; Count: number }[] }) => void) | undefined;
    mocks.fetchGraphic.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        })
    );
    await render(configuration, true, true);
    // StrictMode cancels its throwaway mount; both real consumers share the remaining request.
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(2);
    expect(mocks.fetchGraphic.mock.calls[0][1].signal.aborted).toBe(true);
    expect(mocks.fetchGraphic.mock.calls[1][1].signal.aborted).toBe(false);
    await act(async () => resolveRequest?.({ Data: [{ PrimaryMetric: 'Birim', Count: 5 }] }));
    await flush();
    expect(results.get('home')?.model.hasData).toBe(true);
    expect(results.get('preview')?.model.hasData).toBe(true);
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(2);
  });

  it('reuses recent results when the preview mounts and refreshes stale results', async () => {
    await render();
    await render({ ...configuration }, true);
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(1);
    await render();
    const query = client
      .getQueryCache()
      .find({ queryKey: ['dashboard-generic-graphics'], exact: false });
    expect(query).toBeDefined();
    client.setQueryData(query!.queryKey, query!.state.data, { updatedAt: Date.now() - 60_000 });
    await render(configuration, true);
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(2);
  });

  it('does not rebuild filters or models for equivalent settings and presentation changes', async () => {
    const buildFilter = vi.spyOn(filterBuilder, 'buildRequestListPageFilter');
    await render();
    const initialModel = results.get('home')?.model;
    const builds = buildFilter.mock.calls.length;
    expect(builds).toBeGreaterThan(0);
    await render({ ...configuration });
    await render({ ...configuration, GraphicType: 'donut' });
    expect(buildFilter).toHaveBeenCalledTimes(builds);
    expect(results.get('home')?.model).toBe(initialModel);
    expect(results.get('home')?.chartType).toBe('donut');
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(1);
    await render({ ...configuration, UserFormFilterIds: [] });
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(2);
    expect(mocks.fetchGraphic.mock.lastCall?.[0].Filter).toEqual(
      buildRequestListPageFilter(getDefaultRequestFilterValue())
    );
  });

  it('ignores filter metadata changes but rebuilds the request when the selected filter changes', async () => {
    const parseFilter = vi.spyOn(savedFilterParser, 'parseSavedRequestListFilter');
    const buildFilter = vi.spyOn(filterBuilder, 'buildRequestListPageFilter');
    await render();
    const parses = parseFilter.mock.calls.length;
    const builds = buildFilter.mock.calls.length;
    const initialModel = results.get('home')?.model;

    mocks.filters = {
      Data: [
        { ...mocks.filters.Data[0], Name: 'Yeni ad' },
        { Id: 'filter-2', Name: 'Başka filtre', Filter: '{"listNo":["REQ-2"]}' },
      ],
    };
    await render({ ...configuration });
    expect(parseFilter).toHaveBeenCalledTimes(parses);
    expect(buildFilter).toHaveBeenCalledTimes(builds);
    expect(results.get('home')?.model).toBe(initialModel);
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(1);

    mocks.filters = {
      Data: [{ ...mocks.filters.Data[0], Filter: '{"listNo":["REQ-3"]}' }],
    };
    await render({ ...configuration });
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(2);
    expect(mocks.fetchGraphic.mock.lastCall?.[0].Filter).toMatchObject({ Value: ['REQ-3'] });
  });

  it('keeps the existing normalization and last-valid-record behavior for saved filters', async () => {
    mocks.filters = {
      Data: [
        { Id: 'filter-1', Name: 'Önceki', Filter: '{"listNo":["REQ-0"]}' },
        { Id: ' filter-1 ', Name: 'Güncel', Filter: '{"listNo":["REQ-1"]}' },
        { Id: 'filter-1', Name: ' ', Filter: '{"listNo":["REQ-2"]}' },
      ],
    };
    await render();
    expect(mocks.fetchGraphic).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ Filter: expect.objectContaining({ Value: ['REQ-1'] }) }),
      { signal: expect.any(AbortSignal) }
    );
  });

  it('does not request chart data for a saved filter that is unavailable or unnamed', async () => {
    mocks.filters = { Data: [{ Id: 'filter-1', Name: '', Filter: '{}' }] };
    await render();
    expect(results.get('home')?.hasInvalidConfiguration).toBe(true);
    expect(mocks.fetchGraphic).not.toHaveBeenCalled();

    mocks.filters = { Data: [] };
    await render({ ...configuration });
    expect(results.get('home')?.hasInvalidConfiguration).toBe(true);
    expect(mocks.fetchGraphic).not.toHaveBeenCalled();
  });

  it('ORs complete software and operational filters in one request and reuses reordered selections', async () => {
    const software = {
      listIssueType: String(RequestFilterScope.SoftwareDevelopment),
      listSoftwareStep: ['11'],
      listNo: ['REQ-1'],
    };
    const operational = {
      listIssueType: String(RequestFilterScope.Operational),
      listOperationalStep: ['22'],
      listNo: ['REQ-2'],
    };
    mocks.filters.Data = [
      { Id: 'filter-1', Name: 'Yazılım', Filter: JSON.stringify(software) },
      { Id: 'filter-2', Name: 'Operasyonel', Filter: JSON.stringify(operational) },
    ];
    const buildFilter = vi.spyOn(filterBuilder, 'buildRequestListPageFilter');
    await render(
      { ...configuration, UserFormFilterIds: ['filter-2', 'filter-1', 'filter-1'] },
      true
    );
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(1);
    const body = mocks.fetchGraphic.mock.lastCall?.[0];
    expect(body.Filter).toMatchObject({
      Logic: 'or',
      Filters: [
        {
          Logic: 'and',
          Filters: expect.arrayContaining([
            expect.objectContaining({
              Field: 'Type',
              Value: RequestFilterScope.SoftwareDevelopment,
            }),
            expect.objectContaining({ Field: 'StepDefinationId', Value: [11] }),
            expect.objectContaining({ Field: 'No', Value: ['REQ-1'] }),
          ]),
        },
        {
          Logic: 'and',
          Filters: expect.arrayContaining([
            expect.objectContaining({ Field: 'Type', Value: RequestFilterScope.Operational }),
            expect.objectContaining({ Field: 'StepDefinationId', Value: [22] }),
            expect.objectContaining({ Field: 'No', Value: ['REQ-2'] }),
          ]),
        },
      ],
    });
    const builds = buildFilter.mock.calls.length;
    await render({ ...configuration, UserFormFilterIds: ['filter-1', 'filter-2'] }, true);
    expect(mocks.fetchGraphic).toHaveBeenCalledTimes(1);
    expect(buildFilter).toHaveBeenCalledTimes(builds);
    expect(results.get('home')?.drilldown.filterIds).toEqual(['filter-1', 'filter-2']);
  });

  it.each(['missing', 'invalid'])(
    'does not silently drop a %s filter from a multiple selection',
    async (id) => {
      mocks.filters.Data.push({ Id: 'invalid', Name: 'Bozuk filtre', Filter: 'not-json' });
      await render({ ...configuration, UserFormFilterIds: ['filter-1', id] });
      expect(mocks.fetchGraphic).not.toHaveBeenCalled();
      expect(results.get('home')?.hasInvalidConfiguration).toBe(true);
    }
  );

  it('cancels superseded selections and ignores late results', async () => {
    const resolveRequests: Array<
      (value: { Data: { PrimaryMetric: string; Count: number }[] }) => void
    > = [];
    mocks.fetchGraphic.mockImplementation(
      () => new Promise((resolve) => resolveRequests.push(resolve))
    );
    mocks.filters.Data.push({ Id: 'filter-2', Name: 'Diğer', Filter: '{"listNo":["REQ-2"]}' });
    await render();
    const oldSignal = mocks.fetchGraphic.mock.calls[0][1].signal as AbortSignal;
    await render({ ...configuration, UserFormFilterIds: ['filter-1', 'filter-2'] });
    expect(oldSignal.aborted).toBe(true);
    expect(mocks.fetchGraphic.mock.calls[1][1].signal.aborted).toBe(false);
    await act(async () => resolveRequests[1]({ Data: [{ PrimaryMetric: 'Güncel', Count: 7 }] }));
    await flush();
    const latestModel = results.get('home')?.model;
    await act(async () => resolveRequests[0]({ Data: [{ PrimaryMetric: 'Eski', Count: 100 }] }));
    await flush();
    expect(results.get('home')?.model).toBe(latestModel);
    expect(results.get('home')?.isError).toBe(false);
    expect(results.get('home')?.isFetching).toBe(false);
  });
});
