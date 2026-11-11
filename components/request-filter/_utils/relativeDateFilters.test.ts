import { describe, expect, it } from 'vitest';
import {
  parseSavedReportListFilterValue,
  pickReportListUrlParams,
} from '@/pages/reports/list/_config';
import { createReportExcelRequestPayload } from '@/pages/reports/list/_hooks/useReportListExcelExport';
import { createReportListFilter } from '@/pages/reports/list/_hooks/useReportListPageState';
import {
  createRequestListUrlState,
  hasRequestListApiFilterValue,
  pickRequestListUrlParams,
  type RequestListFilterValue,
} from '@/pages/requests/list/_config';
import { buildRequestListPath } from '@/pages/requests/list/_hooks/useOpenRequestList';
import { createRequestListExcelRequestPayload } from '@/pages/requests/list/_hooks/useRequestListExcelExport';
import { buildRequestListPageFilter } from '@/pages/requests/list/_utils/buildRequestListPageFilter';
import { parseSavedRequestListFilter } from '@/pages/requests/list/_utils/savedRequestListFilter';
import { requestDateRangeConfigs } from '../_config/dateRangeFilters';
import { dateRangeFilterConfigMap, getActiveRequestListFilterKeys } from '../_config/filterConfig';
import { dateQuickRangeOptions, getDateQuickRangeValue } from '../fields/date-range/dateQuickRange';
import { normalizeRelativeDateFilters, resolveRelativeDateFilters } from './relativeDateFilters';

const now = new Date(2026, 9, 5, 14, 30);

describe('relative date filter persistence', () => {
  it('passes resolved date criteria to both Excel payloads without quick-range keys', () => {
    const filters: RequestListFilterValue = { listCreatedQuickRange: 'last-year' };
    const requestFilter = buildRequestListPageFilter(filters, false, now);
    const request = createRequestListExcelRequestPayload(
      { All: true, Request: { Filter: requestFilter } },
      []
    );
    expect(request.PaginationRequest?.Request?.Filter).toEqual(requestFilter);
    const reportFilter = createReportListFilter(filters, now);
    const report = createReportExcelRequestPayload({ Filter: reportFilter }, []);
    expect(report.PaginationRequest?.Request?.Filter).toEqual(reportFilter);
    expect(JSON.stringify([request, report])).not.toContain('last-year');
    expect(JSON.stringify([request, report])).toContain('Created.At');
  });

  it.each(requestDateRangeConfigs)(
    'round-trips $quickRangeKey for every quick selection',
    ({ fromKey, toKey, quickRangeKey }) => {
      expect(dateRangeFilterConfigMap.get(fromKey)?.quickRangeKey).toBe(quickRangeKey);
      for (const { value: preset } of dateQuickRangeOptions) {
        const filter: RequestListFilterValue = { [quickRangeKey]: preset };
        const path = buildRequestListPath(filter);
        const params = Object.fromEntries(new URLSearchParams(path.split('?')[1]));
        expect(params).toEqual({ [quickRangeKey]: preset });
        expect(pickRequestListUrlParams(params)).toMatchObject(filter);
        expect(pickReportListUrlParams(params)).toMatchObject(filter);
        expect(parseSavedRequestListFilter(JSON.stringify(filter))?.value).toMatchObject(filter);
        expect(parseSavedReportListFilterValue(JSON.stringify(filter))).toMatchObject(filter);
        expect(getActiveRequestListFilterKeys(filter)).toContain(fromKey);
        expect(hasRequestListApiFilterValue(filter)).toBe(true);

        const [from, to] = getDateQuickRangeValue(preset, now);
        const resolved = { [fromKey]: String(from), [toKey]: String(to) };
        expect(resolveRelativeDateFilters(filter, now)).toEqual(resolved);
        expect(buildRequestListPageFilter(filter, false, now)).toEqual(
          buildRequestListPageFilter(resolved)
        );
        expect(createReportListFilter(filter, now)).toEqual(createReportListFilter(resolved));
        expect(filter).toEqual({ [quickRangeKey]: preset });
      }
    }
  );

  it('resolves saved presets at use time without changing the saved criteria', () => {
    const saved =
      '{"listCreatedQuickRange":"last-year","listEstimatedAnalysisQuickRange":"last-month"}';
    const filter = parseSavedRequestListFilter(saved)!.value;
    const first = resolveRelativeDateFilters(filter, now);
    const later = resolveRelativeDateFilters(filter, new Date(2027, 2, 31));
    expect(first).not.toEqual(later);
    expect(Number(later.listCreatedFrom)).toBe(new Date(2026, 2, 31).getTime() / 1000);
    expect(Number(later.listEstimatedAnalysisFrom)).toBe(new Date(2027, 1, 28).getTime() / 1000);
    expect(JSON.stringify(filter)).toBe(saved);
  });

  it('prefers a valid preset over conflicting fixed bounds only for its own field', () => {
    const input = {
      listCreatedQuickRange: 'last-year',
      listCreatedFrom: '1',
      listCreatedTo: '2',
      listUpdatedFrom: '3',
      listUpdatedTo: '4',
      listCurrentProjectEffortFrom: '100',
    } satisfies RequestListFilterValue;
    const expected = {
      listCreatedQuickRange: 'last-year',
      listUpdatedFrom: '3',
      listUpdatedTo: '4',
      listCurrentProjectEffortFrom: '100',
    };
    expect(normalizeRelativeDateFilters(input)).toEqual(expected);
    expect(parseSavedRequestListFilter(JSON.stringify(input))?.value).toEqual(expected);
    expect(pickRequestListUrlParams(input)).toEqual(expected);
    expect(input.listCreatedFrom).toBe('1');
  });

  it.each(['unsupported', '', ['last-year'], null, 123])(
    'ignores invalid preset %j without erasing fixed dates',
    (invalid) => {
      const input = {
        listCreatedQuickRange: invalid,
        listCreatedFrom: '123',
        listCreatedTo: '456',
      };
      expect(parseSavedRequestListFilter(JSON.stringify(input))?.value).toEqual({
        listCreatedFrom: '123',
        listCreatedTo: '456',
      });
      expect(parseSavedReportListFilterValue(JSON.stringify(input))).toMatchObject({
        listCreatedFrom: '123',
        listCreatedTo: '456',
      });
    }
  );

  it('preserves legacy fixed dates without inferring a relative selection', () => {
    const [from, to] = getDateQuickRangeValue('last-year', now);
    const filter = { listCreatedFrom: String(from), listCreatedTo: String(to) };
    expect(resolveRelativeDateFilters(filter, new Date(2027, 1, 1))).toBe(filter);
    expect(parseSavedRequestListFilter(JSON.stringify(filter))?.value).toEqual(filter);
    expect(buildRequestListPath(filter)).not.toContain('QuickRange');
  });

  it('clears fixed bounds for presets and clears presets for manual ranges/reset', () => {
    const preset = createRequestListUrlState({ listCreatedQuickRange: 'last-year' });
    expect(preset).toHaveProperty('listCreatedFrom', undefined);
    expect(preset).toHaveProperty('listCreatedTo', undefined);
    for (const value of [{}, { listCreatedFrom: '123', listCreatedTo: '456' }]) {
      const params = createRequestListUrlState(value);
      for (const { quickRangeKey } of requestDateRangeConfigs) {
        expect(params).toHaveProperty(quickRangeKey, undefined);
      }
    }
  });

  it('clamps month-end/leap-day ranges and includes the full end day', () => {
    expect(getDateQuickRangeValue('last-month', new Date(2026, 2, 31, 12))).toEqual([
      new Date(2026, 1, 28).getTime() / 1000,
      new Date(2026, 2, 31, 23, 59, 59).getTime() / 1000,
    ]);
    expect(getDateQuickRangeValue('last-year', new Date(2024, 1, 29, 12))[0]).toBe(
      new Date(2023, 1, 28).getTime() / 1000
    );
  });
});
