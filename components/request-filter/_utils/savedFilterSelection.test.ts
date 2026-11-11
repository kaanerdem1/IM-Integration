import { describe, expect, it } from 'vitest';
import { FilterOperator } from '@/_common/_constants/filter-operators';
import type { RequestListFilterValue } from '@/pages/requests/list/_config';
import { buildRequestListPath } from '@/pages/requests/list/_hooks/useOpenRequestList';
import { buildRequestListPageFilter } from '@/pages/requests/list/_utils/buildRequestListPageFilter';
import { DEFAULT_REQUEST_FILTER_ID } from '../_config/defaultRequestFilter';
import {
  combineSavedFilterValues,
  normalizeSavedFilterIds,
  parseSavedFilterIds,
  toggleSavedFilterId,
} from './savedFilterSelection';

describe('shared saved-filter selection rules', () => {
  it('canonicalizes IDs for stable URLs/cache keys and keeps the default exclusive', () => {
    expect(normalizeSavedFilterIds(['b', DEFAULT_REQUEST_FILTER_ID, 'a', 'b'])).toEqual(['a', 'b']);
    expect(toggleSavedFilterId(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleSavedFilterId(['b'], 'b')).toEqual([DEFAULT_REQUEST_FILTER_ID]);
    expect(toggleSavedFilterId(['a', 'b'], DEFAULT_REQUEST_FILTER_ID)).toEqual([
      DEFAULT_REQUEST_FILTER_ID,
    ]);
    expect(parseSavedFilterIds('["b","a","a"]')).toEqual(['a', 'b']);
    for (const invalid of ['invalid', '{}', 'null', '[1]', '[""]']) {
      expect(parseSavedFilterIds(invalid)).toBeNull();
    }
  });

  it('serializes multiple IDs separately from drilldown criteria and preserves single URLs', () => {
    const url = new URL(
      buildRequestListPath({ listNo: ['YT-1', 'OT-2'] }, ['b', 'a']),
      'https://test.local'
    );
    expect(url.searchParams.get('listFilterIds')).toBe('["a","b"]');
    expect(url.searchParams.has('listFilterId')).toBe(false);
    expect(url.searchParams.get('listNo')).toBe('["YT-1","OT-2"]');
    expect(buildRequestListPath({}, ['a'])).toBe(buildRequestListPath({}, 'a'));
  });

  it('ORs intact typed branches and ANDs external drilldown conditions', () => {
    const yt: RequestListFilterValue = {
      listIssueType: '1',
      listStep: ['99', '42'],
      listAssignedUser: ['a'],
      listCreatedQuickRange: 'last-year',
    };
    const ot: RequestListFilterValue = {
      listIssueType: '2',
      listStep: ['84'],
      listAssignedUser: ['b'],
      listCreatedQuickRange: 'last-month',
    };
    const now = new Date(2026, 9, 14);
    const combined = combineSavedFilterValues([yt, ot]);
    expect(buildRequestListPageFilter(combined, false, now)).toEqual({
      Logic: 'or',
      Filters: [
        buildRequestListPageFilter(yt, false, now),
        buildRequestListPageFilter(ot, false, now),
      ],
    });
    const constrained = buildRequestListPageFilter(
      { ...combined, listNo: ['YT-1', 'OT-2'] },
      true,
      now
    );
    expect(constrained).toMatchObject({ Logic: 'and' });
    expect(constrained?.Filters).toContainEqual(buildRequestListPageFilter(combined, false, now));
    expect(constrained?.Filters).toContainEqual({
      Field: 'No',
      Operator: FilterOperator.In,
      Value: ['YT-1', 'OT-2'],
      Logic: 'and',
      Filters: [],
    });
    expect(constrained?.Filters).toContainEqual(
      expect.objectContaining({ Field: 'IsFavorite', Value: true })
    );
    expect(yt.listCreatedQuickRange).toBe('last-year');
    expect(ot.listCreatedQuickRange).toBe('last-month');
  });

  it('fails closed for unresolved groups and honors a valid unrestricted branch', () => {
    expect(buildRequestListPageFilter({ listFilterGroups: [] })).toMatchObject({
      Field: 'No',
      Value: [],
    });
    expect(
      buildRequestListPageFilter({ listFilterGroups: [{}, { listNo: ['YT-1'] }] })
    ).toBeUndefined();
    expect(
      buildRequestListPageFilter({
        listFilterGroups: [{}, { listNo: ['YT-1'] }],
        listAssignedUser: ['me'],
      })
    ).toEqual(buildRequestListPageFilter({ listAssignedUser: ['me'] }));
  });
});
