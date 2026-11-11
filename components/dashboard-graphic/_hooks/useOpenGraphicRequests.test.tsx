import { act, StrictMode, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRequestDistributionChartModel } from '@/_helpers/dashboard/requestDistribution';
import { getDefaultRequestFilterValue } from '@/components/request-filter/_config/defaultRequestFilter';
import { getActiveRequestListFilterKeys } from '@/components/request-filter/_config/filterConfig';
import {
  getRequestBreakdownFormState,
  parseRequestBreakdowns,
} from '@/components/request-filter/_utils/breakdownFilters';
import {
  hasRequestListApiFilterValue,
  pickRequestListUrlParams,
} from '@/pages/requests/list/_config';
import { buildRequestListPageFilter } from '@/pages/requests/list/_utils/buildRequestListPageFilter';
import type { GraphicSelection } from '../charts/interactions';
import { useOpenGraphicRequests } from './useOpenGraphicRequests';

const data = [
  {
    PrimaryMetricId: 'director-1',
    PrimaryMetric: 'Direktörlük',
    SecondaryMetricId: 'size-1',
    SecondaryMetric: 'XLarge',
    Count: 41,
  },
  {
    PrimaryMetricId: 'director-1',
    PrimaryMetric: 'Direktörlük',
    SecondaryMetricId: null,
    SecondaryMetric: 'Belirtilmemiş',
    Count: 174,
  },
  {
    PrimaryMetricId: 'director-2',
    PrimaryMetric: 'Direktörlük',
    SecondaryMetricId: 'size-2',
    SecondaryMetric: 'XLarge',
    Count: 3,
  },
  {
    PrimaryMetricId: null,
    PrimaryMetric: 'Belirtilmemiş',
    SecondaryMetricId: 'size-1',
    SecondaryMetric: 'XLarge',
    Count: 2,
  },
];
const chart = {
  model: getRequestDistributionChartModel(data, 'Belirtilmemiş', 'Belirtilmemiş'),
  drilldown: {
    filterIds: ['saved-filter'],
    filters: {
      listCreatedFrom: '1759784400',
      listCreatedTo: '1791406799',
      listRequestPool: ['Havuz'],
    },
    primaryField: 'yazilim-direktoru',
    secondaryField: 'talep-boyutu',
    primaryLabel: 'Direktörlük',
    secondaryLabel: 'Talep Boyutu',
  },
  hasInvalidConfiguration: false,
  isFetching: false,
  isError: false,
  chartType: 'stacked-horizontal-bar' as const,
  primaryFieldLabel: 'Direktörlük',
  secondaryFieldLabel: 'Talep Boyutu',
};
const navigated = vi.fn();
const callback = vi.fn();
const Probe = ({
  selection,
  result = chart,
}: {
  selection: GraphicSelection;
  result?: Parameters<typeof useOpenGraphicRequests>[0];
}) => {
  const onOpen = useOpenGraphicRequests(result, navigated);
  const location = useLocation();
  callback(onOpen);
  return (
    <>
      <button
        type="button"
        onClick={(event) => onOpen(selection, event)}
        onAuxClick={(event) => onOpen(selection, event)}
      >
        Open
      </button>
      <output>
        {location.pathname}
        {location.search}
      </output>
    </>
  );
};

describe('graphic request navigation', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });
  const render = (props: ComponentProps<typeof Probe>) =>
    act(() =>
      root.render(
        <StrictMode>
          <MemoryRouter initialEntries={['/app/home']}>
            <Probe {...props} />
          </MemoryRouter>
        </StrictMode>
      )
    );
  const click = (keys: MouseEventInit = {}) =>
    act(() =>
      container.querySelector('button')!.dispatchEvent(
        new MouseEvent(keys.button === 1 ? 'auxclick' : 'click', {
          bubbles: true,
          cancelable: true,
          ...keys,
        })
      )
    );
  const getFilters = () => {
    const url = new URL(container.querySelector('output')!.textContent!, 'https://test.local');
    expect(url.pathname).toBe('/app/requests');
    expect(url.searchParams.get('listFilterId')).toBe('saved-filter');
    expect(url.searchParams.get('listCreatedFrom')).toBe('1759784400');
    expect(url.searchParams.get('listCreatedTo')).toBe('1791406799');
    expect(url.searchParams.get('listRequestPool')).toBe('["Havuz"]');
    return parseRequestBreakdowns(url.searchParams.get('listBreakdowns') ?? undefined);
  };

  it.each([
    {},
    { primaryMetric: 'id:director-1' },
    { seriesName: 'series_0' },
    { primaryMetric: 'id:director-1', seriesName: 'series_0' },
  ])('retains the default date preset for the selected chart scope %j', async (selection) => {
    render({
      result: {
        ...chart,
        drilldown: {
          ...chart.drilldown,
          filterIds: [],
          filters: getDefaultRequestFilterValue(),
        },
      },
      selection,
    });
    await click();
    const url = new URL(container.querySelector('output')!.textContent!, 'https://test.local');
    expect(url.pathname).toBe('/app/requests');
    expect(url.searchParams.get('listCreatedQuickRange')).toBe('last-year');
    expect(url.searchParams.has('listCreatedFrom')).toBe(false);
    expect(url.searchParams.has('listCreatedTo')).toBe(false);
    const scopes = parseRequestBreakdowns(url.searchParams.get('listBreakdowns') ?? undefined);
    expect(scopes).toHaveLength(Object.keys(selection).length);
    expect(navigated).toHaveBeenCalledOnce();
  });

  it('preserves all saved IDs and ANDs the clicked slice with the complete OR group', async () => {
    const groups = [
      { listIssueType: '1', listSoftwareStep: ['11'], listRequestPool: ['Yazılım'] },
      { listIssueType: '2', listOperationalStep: ['22'], listRequestPool: ['Operasyonel'] },
    ];
    render({
      result: {
        ...chart,
        drilldown: {
          ...chart.drilldown,
          filterIds: ['filter-2', 'filter-1'],
          filters: { listFilterGroups: groups },
        },
      },
      selection: { primaryMetric: 'id:director-1' },
    });
    await click();
    const url = new URL(container.querySelector('output')!.textContent!, 'https://test.local');
    expect(url.searchParams.get('listFilterIds')).toBe('["filter-1","filter-2"]');
    expect(url.searchParams.has('listFilterId')).toBe(false);
    expect(url.searchParams.has('listFilterGroups')).toBe(false);
    // The list resolves these IDs; the URL only adds the chart slice outside the OR group.
    const filter = buildRequestListPageFilter({
      ...pickRequestListUrlParams(Object.fromEntries(url.searchParams)),
      listFilterGroups: groups,
    });
    expect(filter).toMatchObject({
      Logic: 'and',
      Filters: [
        { Logic: 'or', Filters: groups.map((group) => buildRequestListPageFilter(group)) },
        {
          Logic: 'and',
          Filters: [
            expect.objectContaining({
              Field: 'IssueFieldItems.Field.Value',
              Value: 'yazilim-direktoru',
            }),
            {
              Logic: 'or',
              Filters: [
                expect.objectContaining({ Field: 'IssueFieldItems.Value', Value: 'director-1' }),
              ],
            },
          ],
        },
      ],
    });
  });

  it.each([
    ['proje-lideri-is-birimi', 'listProjectLeaderUnit', '42', '43'],
    ['stepDefinationId', 'listStep', '42', '43'],
    ['yazilim-direktoru', 'listSoftwareDirector', '42', '43'],
    ['yazilim-birimi', 'listSoftwareUnit', '42', '43'],
    ['yazilim-portfoy', 'listPortfolio', '42', '43'],
    ['po-portfoy-yoneticisi', 'listPortfolioManager', '42', '43'],
    ['proje-sponsoru', 'listProjectSponsor', '42', '43'],
    ['uygulama', 'listApplication', 'Ana değer', 'Alt değer'],
    ['talep-havuzu', 'listRequestPool', 'Ana değer', 'Alt değer'],
    ['talep-boyutu', 'listRequestSize', '42', '43'],
    ['talep-turu', 'listRequestType', 'Ana değer', 'Alt değer'],
  ] as const)(
    'routes both primary and secondary %s selections into %s',
    async (field, key, primaryValue, secondaryValue) => {
      const model = getRequestDistributionChartModel(
        [
          {
            PrimaryMetricId: '42',
            PrimaryMetric: 'Ana değer',
            SecondaryMetricId: '43',
            SecondaryMetric: 'Alt değer',
            Count: 5,
          },
        ],
        '',
        ''
      );
      const result = {
        ...chart,
        model,
        drilldown: { ...chart.drilldown, primaryField: field, secondaryField: null },
      };
      render({ result, selection: { primaryMetric: 'id:42' } });
      await click();
      expect(getFilters()).toEqual([expect.objectContaining({ field, value: '42' })]);
      let url = new URL(container.querySelector('output')!.textContent!, 'https://test.local');
      let filters = pickRequestListUrlParams(Object.fromEntries(url.searchParams));
      expect(getRequestBreakdownFormState(filters.listBreakdowns).values[key]).toEqual([
        primaryValue,
      ]);
      expect(getActiveRequestListFilterKeys(filters)).toContain(key);

      const contextField = field === 'talep-turu' ? 'talep-havuzu' : 'talep-turu';
      const contextKey = field === 'talep-turu' ? 'listRequestPool' : 'listRequestType';
      const groupedResult = {
        ...result,
        drilldown: { ...result.drilldown, primaryField: contextField, secondaryField: field },
      };
      render({ result: groupedResult, selection: { seriesName: 'series_0' } });
      await click();
      expect(getFilters()).toEqual([expect.objectContaining({ field, value: '43' })]);
      url = new URL(container.querySelector('output')!.textContent!, 'https://test.local');
      filters = pickRequestListUrlParams(Object.fromEntries(url.searchParams));
      expect(getRequestBreakdownFormState(filters.listBreakdowns).values[key]).toEqual([
        secondaryValue,
      ]);
      expect(getActiveRequestListFilterKeys(filters)).toContain(key);

      render({
        result: groupedResult,
        selection: { primaryMetric: 'id:42', seriesName: 'series_0' },
      });
      await click();
      expect(getFilters()).toEqual([
        expect.objectContaining({ field: contextField, value: '42' }),
        expect.objectContaining({ field, value: '43' }),
      ]);
      url = new URL(container.querySelector('output')!.textContent!, 'https://test.local');
      filters = pickRequestListUrlParams(Object.fromEntries(url.searchParams));
      expect(getRequestBreakdownFormState(filters.listBreakdowns).values).toEqual({
        [contextKey]: ['Ana değer'],
        [key]: [secondaryValue],
      });
      expect(getActiveRequestListFilterKeys(filters)).toEqual(
        expect.arrayContaining([key, contextKey])
      );
    }
  );

  it.each([
    [{ primaryMetric: 'id:director-1' }, [['yazilim-direktoru', 'director-1']]],
    [{ seriesName: 'series_0' }, [['talep-boyutu', 'size-1']]],
    [
      { primaryMetric: 'id:director-1', seriesName: 'series_0' },
      [
        ['yazilim-direktoru', 'director-1'],
        ['talep-boyutu', 'size-1'],
      ],
    ],
    [
      { primaryMetric: 'id:director-2', seriesName: 'series_2' },
      [
        ['yazilim-direktoru', 'director-2'],
        ['talep-boyutu', 'size-2'],
      ],
    ],
    [{}, []],
  ] satisfies [GraphicSelection, [string, string][]][])(
    'maps %j without losing saved criteria or confusing duplicate labels',
    async (selection, expected) => {
      render({ selection });
      await click();
      expect(getFilters()?.map(({ field, value }) => [field, value])).toEqual(expected);
      expect(navigated).toHaveBeenCalledOnce();
    }
  );

  it.each([
    { primaryMetric: 'empty:' },
    { seriesName: 'series_1' },
    { primaryMetric: 'id:director-1', seriesName: 'series_1' },
    { primaryMetric: 'empty:', seriesName: 'series_0' },
  ])('does not navigate for an unspecified scope %j', async (selection) => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render({ selection });
    await click();
    await click({ ctrlKey: true });
    await click({ button: 1 });
    expect(navigated).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
    expect(container.querySelector('output')).toHaveTextContent('/app/home');
  });

  it('uses only primary scope for ungrouped charts and base scope for their count legend', async () => {
    const result = { ...chart, drilldown: { ...chart.drilldown, secondaryField: null } };
    render({ result, selection: { primaryMetric: 'id:director-1', seriesName: 'series_0' } });
    await click();
    expect(getFilters()).toHaveLength(1);
    render({ result, selection: { seriesName: 'series_0' } });
    await click();
    expect(getFilters()).toEqual([]);
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }])(
    'opens in a new tab and keeps the preview open (%j)',
    async (keys) => {
      const open = vi.spyOn(window, 'open').mockReturnValue(null);
      render({ selection: { primaryMetric: 'id:director-1' } });
      await click(keys);
      expect(open).toHaveBeenCalledWith(
        expect.stringContaining('listFilterId=saved-filter'),
        '_blank',
        'noopener,noreferrer'
      );
      expect(navigated).not.toHaveBeenCalled();
      expect(container.querySelector('output')).toHaveTextContent('/app/home');
    }
  );

  it.each(['isFetching', 'isError', 'hasInvalidConfiguration'] as const)(
    'does not navigate using stale or invalid data when %s',
    async (key) => {
      render({ result: { ...chart, [key]: true }, selection: { primaryMetric: 'id:director-1' } });
      await click();
      expect(navigated).not.toHaveBeenCalled();
      expect(container.querySelector('output')).toHaveTextContent('/app/home');
    }
  );

  it('does not interpret an omitted ID as an unspecified metric', async () => {
    render({
      result: {
        ...chart,
        model: getRequestDistributionChartModel(
          [{ PrimaryMetric: 'Direktörlük', Count: 5 }],
          '',
          ''
        ),
      },
      selection: { primaryMetric: 'Direktörlük' },
    });
    await click();
    expect(navigated).not.toHaveBeenCalled();
  });

  it('retains stable callbacks for equivalent chart data', () => {
    render({ selection: {} });
    const first = callback.mock.lastCall![0];
    render({ selection: {}, result: { ...chart } });
    expect(callback.mock.lastCall![0]).toBe(first);
  });

  it.each([
    { primaryMetric: 'id:unit-1|unit-2' },
    { seriesName: 'series_0' },
    { primaryMetric: 'id:unit-1|unit-2', seriesName: 'series_0' },
  ])('splits combined identities and names for the clicked scope %j', async (selection) => {
    const model = getRequestDistributionChartModel(
      [
        {
          PrimaryMetricId: 'unit-1|unit-2',
          PrimaryMetric: 'Metis YG|Kurumsal Uygulamalar 1 YG',
          SecondaryMetricId: 'director-1|director-2',
          SecondaryMetric: 'Direktörlük A|Direktörlük B',
          Count: 1,
        },
      ],
      '',
      ''
    );
    render({
      result: {
        ...chart,
        model,
        drilldown: {
          ...chart.drilldown,
          primaryField: 'yazilim-birimi',
          primaryLabel: 'Yazılım Birimi',
          secondaryField: 'yazilim-direktoru',
          secondaryLabel: 'Direktörlük',
        },
      },
      selection,
    });
    await click();
    const filters = getFilters();
    expect(filters).toEqual([
      ...('primaryMetric' in selection
        ? [
            { field: 'yazilim-birimi', value: 'unit-1', label: 'Yazılım Birimi: Metis YG' },
            {
              field: 'yazilim-birimi',
              value: 'unit-2',
              label: 'Yazılım Birimi: Kurumsal Uygulamalar 1 YG',
            },
          ]
        : []),
      ...('seriesName' in selection
        ? [
            {
              field: 'yazilim-direktoru',
              value: 'director-1',
              label: 'Direktörlük: Direktörlük A',
            },
            {
              field: 'yazilim-direktoru',
              value: 'director-2',
              label: 'Direktörlük: Direktörlük B',
            },
          ]
        : []),
    ]);
    const state = getRequestBreakdownFormState(JSON.stringify(filters));
    if ('primaryMetric' in selection) {
      expect(state.values.listSoftwareUnit).toEqual(['unit-1', 'unit-2']);
      expect(state.options.listSoftwareUnit).toEqual([
        { value: 'unit-1', label: 'Metis YG' },
        { value: 'unit-2', label: 'Kurumsal Uygulamalar 1 YG' },
      ]);
    }
    const request = buildRequestListPageFilter({ listBreakdowns: JSON.stringify(filters) });
    expect(JSON.stringify(request)).not.toContain('|');
    expect(request).toEqual(buildRequestListPageFilter(state.values));
    // Both chart navigation and manual selection use the existing form's OR semantics.
    expect(
      buildRequestListPageFilter({ listSoftwareUnit: ['unit-1', 'unit-2'] })?.Filters?.[1]
    ).toMatchObject({
      Logic: 'or',
      Filters: [
        { Operator: 'contains', Value: 'unit-1' },
        { Operator: 'contains', Value: 'unit-2' },
      ],
    });
    expect(model.data).toHaveLength(1);
    expect(model.data[0].total).toBe(1);
  });

  it('does not navigate when combined names and IDs cannot be paired', async () => {
    render({
      result: {
        ...chart,
        model: getRequestDistributionChartModel(
          [{ PrimaryMetricId: 'id-1|id-2', PrimaryMetric: 'Only one label', Count: 1 }],
          '',
          ''
        ),
      },
      selection: { primaryMetric: 'id:id-1|id-2' },
    });
    await click();
    expect(navigated).not.toHaveBeenCalled();
    expect(container.querySelector('output')).toHaveTextContent('/app/home');
  });

  it('does not widen a saved chart scope when another combination is clicked', async () => {
    const savedBreakdowns = JSON.stringify([
      { field: 'yazilim-birimi', value: 'unit-1', label: 'Birim: A' },
      { field: 'yazilim-birimi', value: 'unit-2', label: 'Birim: B' },
    ]);
    const saved = { ...chart.drilldown.filters, listBreakdowns: savedBreakdowns };
    render({
      result: {
        ...chart,
        model: getRequestDistributionChartModel(
          [{ PrimaryMetricId: 'unit-2|unit-3', PrimaryMetric: 'B|C', Count: 1 }],
          '',
          ''
        ),
        drilldown: {
          ...chart.drilldown,
          primaryField: 'yazilim-birimi',
          secondaryField: null,
          filters: saved,
        },
      },
      selection: { primaryMetric: 'id:unit-2|unit-3' },
    });
    await click();
    const scopes = getFilters();
    expect(scopes?.map(({ value, group }) => [value, group])).toEqual([
      ['unit-1', undefined],
      ['unit-2', undefined],
      ['unit-2', 1],
      ['unit-3', 1],
    ]);
    expect(buildRequestListPageFilter({ listBreakdowns: JSON.stringify(scopes) })).toEqual({
      Logic: 'and',
      Filters: [
        buildRequestListPageFilter({ listSoftwareUnit: ['unit-1', 'unit-2'] }),
        buildRequestListPageFilter({ listSoftwareUnit: ['unit-2', 'unit-3'] }),
      ],
    });
    expect(saved.listBreakdowns).toBe(savedBreakdowns);
  });

  it('preserves an all-request total without injecting the list default date range', async () => {
    render({ result: { ...chart, drilldown: { ...chart.drilldown, filters: {} } }, selection: {} });
    await click();
    const url = new URL(container.querySelector('output')!.textContent!, 'https://test.local');
    const filters = pickRequestListUrlParams({
      listBreakdowns: url.searchParams.get('listBreakdowns')!,
    });
    expect(hasRequestListApiFilterValue(filters)).toBe(true);
    expect(buildRequestListPageFilter(filters)).toBeUndefined();
  });
});
