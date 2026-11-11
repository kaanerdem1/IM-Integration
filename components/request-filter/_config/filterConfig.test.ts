import { describe, expect, it } from 'vitest';
import {
  normalizeRequestListColumnKeys,
  REQUEST_LIST_COLUMNS,
  sanitizeWorkflowStatusFilterValues,
} from '@/pages/requests/list/_config';
import {
  getActiveRequestListFilterKeys,
  getRequestListFilterLabelKey,
  getScopedRequestListFilterValue,
  isRequestListFilterInScope,
  requestListFilterConfigs,
} from './filterConfig';
import { getRequestFilterScope, RequestFilterScope } from './requestFilterScope';

describe('request list filter labels', () => {
  it('preserves only the shared draft step in Common without offering the normal step field', () => {
    const value = { listStep: ['42', '99'], listNo: ['REQ-1'] };
    expect(getScopedRequestListFilterValue(value)).toEqual({ listStep: ['99'], listNo: ['REQ-1'] });
    expect(getActiveRequestListFilterKeys({ listStep: ['99'] })).toEqual(['listStep']);
    expect(isRequestListFilterInScope('listStep', RequestFilterScope.Common)).toBe(false);
    expect(value.listStep).toEqual(['42', '99']);
  });
  it('defines every field once and exposes common fields in both issue scopes', () => {
    expect(new Set(requestListFilterConfigs.map(({ key }) => key)).size).toBe(
      requestListFilterConfigs.length
    );
    expect(
      requestListFilterConfigs.filter(({ scopes }) => scopes[0] === RequestFilterScope.Common)
    ).toHaveLength(19);
    for (const config of requestListFilterConfigs) {
      expect(isRequestListFilterInScope(config.key, RequestFilterScope.Common)).toBe(
        config.scopes[0] === RequestFilterScope.Common
      );
      expect(isRequestListFilterInScope(config.key, RequestFilterScope.SoftwareDevelopment)).toBe(
        true
      );
      expect(isRequestListFilterInScope(config.key, RequestFilterScope.Operational)).toBe(
        config.scopes[0] === RequestFilterScope.Common || config.key === 'listStep'
      );
    }
  });

  it.each([undefined, '-1', '1', '2'])(
    'projects the workflow step and its chart breakdown for scope %s',
    (listIssueType) => {
      const step = { field: 'stepDefinationId', value: '42', label: 'Adım: Analiz' };
      const pool = { field: 'talep-havuzu', value: 'pool-1', label: 'Havuz: Planlanan' };
      const draft = {
        listIssueType,
        listStep: ['42'],
        listBreakdowns: JSON.stringify([step, pool]),
      };
      const projected = getScopedRequestListFilterValue(draft);
      if (listIssueType === '1' || listIssueType === '2') {
        expect(projected).toEqual(draft);
      } else {
        expect(projected).toEqual({ listBreakdowns: JSON.stringify([pool]) });
      }
      expect(draft.listStep).toEqual(['42']);
      expect(JSON.parse(draft.listBreakdowns)).toEqual([step, pool]);
    }
  );

  it.each([undefined, '-1', '3', 'invalid'])('treats scope %s as common', (value) => {
    expect(getRequestFilterScope(value)).toBe(RequestFilterScope.Common);
  });

  it.each([undefined, '-1', '2'])(
    'excludes all software range bounds and presets from scope %s without mutating the draft',
    (listIssueType) => {
      const draft = {
        listIssueType,
        listCreatedQuickRange: 'last-year' as const,
        listAssignedUser: ['user-1'],
        listEstimatedProjectEffortFrom: '100',
        listEstimatedProjectEffortTo: '350',
        listCurrentProjectEffortTo: '0',
        listCurrentAnalysisFrom: '100',
        listCurrentAnalysisTo: '200',
        listEstimatedAnalysisQuickRange: 'last-month' as const,
        listSort: 'created-desc',
      };
      expect(getScopedRequestListFilterValue(draft)).toEqual({
        ...(listIssueType === '2' ? { listIssueType } : {}),
        listCreatedQuickRange: 'last-year',
        listAssignedUser: ['user-1'],
        listSort: 'created-desc',
      });
      expect(draft.listEstimatedProjectEffortFrom).toBe('100');
      expect(draft.listEstimatedAnalysisQuickRange).toBe('last-month');
      expect(getScopedRequestListFilterValue({ ...draft, listIssueType: '1' })).toEqual({
        ...draft,
        listIssueType: '1',
      });
    }
  );

  it('marks only the two effort ranges and fourteen planning dates as software-only', () => {
    expect(
      requestListFilterConfigs
        .filter(
          ({ scopes }) =>
            scopes.length === 1 && scopes[0] === RequestFilterScope.SoftwareDevelopment
        )
        .map(({ key }) => key)
    ).toEqual([
      'listEstimatedProjectEffortFrom',
      'listCurrentProjectEffortFrom',
      'listEstimatedScopeFrom',
      'listEstimatedAnalysisFrom',
      'listEstimatedAnalysisApprovalFrom',
      'listEstimatedDevelopmentFrom',
      'listEstimatedAlphaTestFrom',
      'listEstimatedAcceptanceTestFrom',
      'listEstimatedReleaseFrom',
      'listCurrentScopeFrom',
      'listCurrentAnalysisFrom',
      'listCurrentAnalysisApprovalFrom',
      'listCurrentDevelopmentFrom',
      'listCurrentAlphaTestFrom',
      'listCurrentAcceptanceTestFrom',
      'listCurrentReleaseFrom',
    ]);
  });

  it('offers the updating-user filter beside the update date and activates it for selected users', () => {
    const keys = requestListFilterConfigs.map(({ key }) => key);
    expect(
      keys.slice(keys.indexOf('listUpdatedFrom'), keys.indexOf('listUpdatedFrom') + 2)
    ).toEqual(['listUpdatedFrom', 'listUpdatedBy']);
    expect(getActiveRequestListFilterKeys({ listUpdatedBy: ['54040'] })).toEqual(['listUpdatedBy']);
    expect(getActiveRequestListFilterKeys({ listUpdatedBy: [] })).toEqual([]);
    expect(REQUEST_LIST_COLUMNS.find(({ key }) => key === 'updatedBy')).toMatchObject({
      defaultVisible: false,
      hideable: true,
    });
  });

  it('places the optional portfolio column and filter before sponsor and manager', () => {
    const column = REQUEST_LIST_COLUMNS.find(({ key }) => key === 'portfolio');
    expect(column).toMatchObject({ defaultVisible: false, hideable: true });
    const columnKeys = REQUEST_LIST_COLUMNS.map(({ key }) => key);
    const filterKeys = requestListFilterConfigs.map(({ key }) => key);
    expect(
      columnKeys.slice(columnKeys.indexOf('portfolio'), columnKeys.indexOf('portfolio') + 3)
    ).toEqual(['portfolio', 'projectSponsor', 'portfolioManager']);
    expect(
      filterKeys.slice(filterKeys.indexOf('listPortfolio'), filterKeys.indexOf('listPortfolio') + 3)
    ).toEqual(['listPortfolio', 'listProjectSponsor', 'listPortfolioManager']);
  });

  it('uses the matching table column label for every filter with a table column', () => {
    const columnLabelKeyByKey = new Map(
      REQUEST_LIST_COLUMNS.map((column) => [column.key, column.labelKey] as const)
    );
    const filtersWithoutColumn = requestListFilterConfigs.filter(
      (config) => !('columnKey' in config)
    );

    requestListFilterConfigs.forEach((config) => {
      if (!('columnKey' in config)) {
        return;
      }

      expect(getRequestListFilterLabelKey(config)).toBe(columnLabelKeyByKey.get(config.columnKey));
    });
    expect(filtersWithoutColumn.map((config) => config.key)).toEqual(['listNo', 'listUnit']);
    expect(filtersWithoutColumn.map(getRequestListFilterLabelKey)).toEqual([
      'label.requests.list.filters.requestNo',
      'label.requests.list.filters.includedUnit',
    ]);
    expect(REQUEST_LIST_COLUMNS.find((column) => column.key === 'requestNo')?.labelKey).toBe(
      'label.requests.list.column.requestNo'
    );
  });

  it('migrates legacy column keys to keys matching their displayed values', () => {
    expect(
      normalizeRequestListColumnKeys(['no', 'progress', 'projectLeaderUnit', 'currentAnalysisDate'])
    ).toEqual([
      'requestNo',
      'projectLeaderBusinessUnit',
      'workflowProgress',
      'definiteAnalysisDate',
    ]);
  });

  it('removes the draft workflow status from filter values', () => {
    expect(sanitizeWorkflowStatusFilterValues(['null', '0'])).toEqual(['0']);
    expect(sanitizeWorkflowStatusFilterValues(['null'])).toBeUndefined();
  });

  it('activates each effort range once, including a zero or upper-only boundary', () => {
    expect(
      getActiveRequestListFilterKeys({
        listEstimatedProjectEffortFrom: '0',
        listEstimatedProjectEffortTo: '350',
        listCurrentProjectEffortTo: '100',
      })
    ).toEqual(['listEstimatedProjectEffortFrom', 'listCurrentProjectEffortFrom']);
    expect(getActiveRequestListFilterKeys({ listEstimatedProjectEffortFrom: '' })).toEqual([]);
  });

  it('does not offer the removed title filter', () => {
    expect(requestListFilterConfigs.map((config) => config.key)).not.toContain('listSubject');
  });

  it('activates chart filter fields after saved filter fields without duplicates', () => {
    expect(
      getActiveRequestListFilterKeys({
        listCreatedFrom: '1759784400',
        listCreatedTo: '1791406799',
        listBreakdowns: JSON.stringify([
          { field: 'yazilim-direktoru', value: 'director-2', label: 'Direktörlük: 02 Bankacılık' },
          { field: 'talep-boyutu', value: 'size-xl', label: 'Talep Boyutu: XLarge' },
          { field: 'talep-boyutu', value: 'size-1', label: 'Talep Boyutu: XSmall' },
        ]),
      })
    ).toEqual(['listCreatedFrom', 'listSoftwareDirector', 'listRequestSize']);
    expect(
      getActiveRequestListFilterKeys({
        listRequestSize: ['XLarge'],
        listBreakdowns: JSON.stringify([
          { field: 'talep-boyutu', value: 'size-xl', label: 'Talep Boyutu: XLarge' },
        ]),
      })
    ).toEqual(['listRequestSize']);
  });
});
