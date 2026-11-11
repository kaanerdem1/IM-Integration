import { describe, expect, it } from 'vitest';
import { createRequestListUrlState, pickRequestListUrlParams } from '@/pages/requests/list/_config';
import { buildRequestListPath } from '@/pages/requests/list/_hooks/useOpenRequestList';
import { buildRequestListPageFilter } from '@/pages/requests/list/_utils/buildRequestListPageFilter';
import { parseSavedRequestListFilter } from '@/pages/requests/list/_utils/savedRequestListFilter';
import {
  getRequestBreakdownFormState,
  parseRequestBreakdowns,
  removeRequestBreakdownField,
  serializeRequestBreakdowns,
  updateRequestFilterField,
} from './breakdownFilters';

const formFields = [
  ['proje-lideri-is-birimi', 'listProjectLeaderUnit', 'identity-1'],
  ['stepDefinationId', 'listStep', '42'],
  ['yazilim-direktoru', 'listSoftwareDirector', 'identity-1'],
  ['yazilim-birimi', 'listSoftwareUnit', 'identity-1'],
  ['yazilim-portfoy', 'listPortfolio', 'identity-1'],
  ['po-portfoy-yoneticisi', 'listPortfolioManager', 'identity-1'],
  ['proje-sponsoru', 'listProjectSponsor', 'identity-1'],
  ['uygulama', 'listApplication', 'Metric label'],
  ['talep-havuzu', 'listRequestPool', 'Metric label'],
  ['talep-boyutu', 'listRequestSize', 'identity-1'],
  ['talep-turu', 'listRequestType', 'Metric label'],
] as const;

describe('request breakdown filters', () => {
  it.each(formFields)('projects %s into its existing form field %s', (field, key, value) => {
    const identity = field === 'stepDefinationId' ? '42' : 'identity-1';
    const serialized = serializeRequestBreakdowns([
      { field, value: identity, label: 'Field label: Metric label' },
    ]);
    expect(getRequestBreakdownFormState(serialized)).toEqual({
      values: { [key]: [value] },
      options: { [key]: [{ value, label: 'Metric label' }] },
    });
    expect(parseRequestBreakdowns(serialized)?.[0].value).toBe(identity);
  });

  it.each(formFields)('rejects unspecified %s instead of adding a form option', (field) => {
    const serialized = JSON.stringify([
      { field, value: null, label: 'Field label: Belirtilmemiş' },
    ]);
    expect(parseRequestBreakdowns(serialized)).toBeNull();
    expect(getRequestBreakdownFormState(serialized)).toEqual({ values: {}, options: {} });
    expect(buildRequestListPageFilter({ listBreakdowns: serialized })).toMatchObject({
      Field: 'No',
      Operator: 'in',
      Value: [],
    });
  });

  it('deduplicates form selections and preserves colons within metric labels', () => {
    const selection = { field: 'talep-havuzu', value: 'pool-1', label: 'Havuz: Ek: Havuz' };
    expect(
      getRequestBreakdownFormState(serializeRequestBreakdowns([selection, selection]))
    ).toEqual({
      values: { listRequestPool: ['Ek: Havuz'] },
      options: { listRequestPool: [{ value: 'Ek: Havuz', label: 'Ek: Havuz' }] },
    });
  });

  it('replaces only the edited field restriction, preserving other identities and saved criteria', () => {
    const size = { field: 'talep-boyutu', value: 'size-1', label: 'Talep Boyutu: XLarge' };
    const base = {
      listSoftwareDirector: ['director-1', 'director-2'],
      listCreatedQuickRange: 'last-year' as const,
      listBreakdowns: serializeRequestBreakdowns([
        { field: 'yazilim-direktoru', value: 'director-1', label: 'Direktörlük: 01' },
        size,
      ]),
    };
    const next = updateRequestFilterField(base, 'listSoftwareDirector', ['director-3']);
    expect(next).toEqual({
      ...base,
      listSoftwareDirector: ['director-3'],
      listBreakdowns: serializeRequestBreakdowns([size]),
    });
    expect(base.listSoftwareDirector).toEqual(['director-1', 'director-2']);
    expect(parseRequestBreakdowns(base.listBreakdowns)).toHaveLength(2);
    expect(removeRequestBreakdownField(base, 'listNo')).toBe(base);
    expect(updateRequestFilterField(next, 'listRequestSize', [])).toEqual({
      ...next,
      listRequestSize: undefined,
      listBreakdowns: undefined,
    });
  });

  it.each(formFields)(
    'uses identical API predicates for chart and manual %s selections',
    (field, key, selectedValue) => {
      const identity = field === 'stepDefinationId' ? '42' : '019d8ce4-3d90-707d-9479-3c2735f9133d';
      const value = selectedValue === 'Metric label' ? selectedValue : identity;
      const base = { listCreatedFrom: '1759784400', listCreatedTo: '1791406799' };
      const result = buildRequestListPageFilter({
        ...base,
        listBreakdowns: serializeRequestBreakdowns([
          { field, value: identity, label: 'Field: Metric label' },
        ]),
      });
      expect(result).toEqual(buildRequestListPageFilter({ ...base, [key]: [value] }));
    }
  );

  it('intersects saved criteria and clicked identities without replacing multi-value filters', () => {
    const base = {
      listSoftwareDirector: ['director-1', 'director-2'],
      listRequestSize: ['XLarge'],
      listCreatedFrom: '1759784400',
      listCreatedTo: '1791406799',
    };
    const listBreakdowns = serializeRequestBreakdowns([
      { field: 'yazilim-direktoru', value: 'director-3', label: 'Direktörlük: 03' },
      {
        field: 'talep-boyutu',
        value: '019d8ce4-3d90-707d-9479-3c2735f9133d',
        label: 'Talep Boyutu: XSmall',
      },
    ]);
    const result = buildRequestListPageFilter({ ...base, listBreakdowns });
    expect(result?.Logic).toBe('and');
    expect(result?.Filters).toEqual([
      buildRequestListPageFilter({ listRequestSize: base.listRequestSize }),
      buildRequestListPageFilter({ listRequestSize: ['019d8ce4-3d90-707d-9479-3c2735f9133d'] }),
      buildRequestListPageFilter({ listSoftwareDirector: base.listSoftwareDirector }),
      buildRequestListPageFilter({ listSoftwareDirector: ['director-3'] }),
      ...buildRequestListPageFilter({
        listCreatedFrom: base.listCreatedFrom,
        listCreatedTo: base.listCreatedTo,
      })!.Filters!,
    ]);
    expect(base.listSoftwareDirector).toEqual(['director-1', 'director-2']);
  });

  it('round-trips identities and Turkish labels through URLs and saved filters', () => {
    const value = {
      listNo: ['YT-11785'],
      listBreakdowns: serializeRequestBreakdowns([
        { field: 'talep-boyutu', value: 'size-1', label: 'Talep Boyutu: Büyük' },
      ]),
    };
    const url = new URL(buildRequestListPath(value, 'saved-filter'), 'https://test.local');
    expect(url.searchParams.get('listFilterId')).toBe('saved-filter');
    expect(url.searchParams.get('listBreakdowns')).toBe(value.listBreakdowns);
    expect(pickRequestListUrlParams(createRequestListUrlState(value))).toMatchObject(value);
    expect(parseSavedRequestListFilter(JSON.stringify(value))?.value).toMatchObject(value);
    expect(parseRequestBreakdowns(value.listBreakdowns)?.[0].value).toBe('size-1');
    expect(createRequestListUrlState({}).listBreakdowns).toBeUndefined();
  });

  it.each([
    'bad-json',
    '{}',
    '[{"field":"unsupported","value":null,"label":"x"}]',
    '[{"field":"talep-boyutu","label":"x"}]',
    '[{"field":"yazilim-birimi","value":"a","label":"A","group":-1}]',
    '[{"field":"yazilim-birimi","value":"a","label":"A","group":"1"}]',
    '[{"field":"yazilim-birimi","value":"a","label":"A","group":1.5}]',
  ])('fails closed for invalid criteria %s', (value) => {
    expect(parseRequestBreakdowns(value)).toBeNull();
    expect(buildRequestListPageFilter({ listBreakdowns: value })).toMatchObject({
      Field: 'No',
      Operator: 'in',
      Value: [],
    });
  });
});
