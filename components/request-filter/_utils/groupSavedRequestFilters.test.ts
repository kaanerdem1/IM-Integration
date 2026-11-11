import { describe, expect, it, vi } from 'vitest';
import { RequestFilterScope } from '../_config/requestFilterScope';
import { groupSavedRequestFilters } from './groupSavedRequestFilters';

describe('groupSavedRequestFilters', () => {
  it('uses the shared scope order, preserves item order and resolves each scope once', () => {
    const items = [
      { id: 'operational', scope: RequestFilterScope.Operational },
      { id: 'common-b', scope: RequestFilterScope.Common },
      { id: 'default', scope: undefined },
      { id: 'software', scope: RequestFilterScope.SoftwareDevelopment },
      { id: 'common-a', scope: RequestFilterScope.Common },
    ];
    const getScope = vi.fn((item: (typeof items)[number]) => item.scope);

    const groups = groupSavedRequestFilters(items, getScope);

    expect(groups.map((group) => group.scope)).toEqual([-1, 1, 2]);
    expect(groups.map((group) => group.items.map((item) => item.id))).toEqual([
      ['common-b', 'common-a'],
      ['software'],
      ['operational'],
    ]);
    expect(groups[0].items[0]).toBe(items[1]);
    expect(getScope).toHaveBeenCalledTimes(items.length);
    expect(items.map((item) => item.id)).toEqual([
      'operational',
      'common-b',
      'default',
      'software',
      'common-a',
    ]);
  });

  it('omits empty groups and standalone placeholders', () => {
    expect(groupSavedRequestFilters([], () => undefined)).toEqual([]);
    expect(groupSavedRequestFilters(['loading'], () => undefined)).toEqual([]);
    expect(
      groupSavedRequestFilters(['software'], () => RequestFilterScope.SoftwareDevelopment)
    ).toEqual([
      {
        scope: RequestFilterScope.SoftwareDevelopment,
        labelKey: 'label.requests.list.filters.groupSoftwareRequests',
        items: ['software'],
      },
    ]);
  });
});
