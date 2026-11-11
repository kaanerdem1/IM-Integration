import { RequestFilterScope } from '../_config/requestFilterScope';

export const savedRequestFilterGroups = [
  { scope: RequestFilterScope.Common, labelKey: 'label.requests.list.filters.scopeCommon' },
  {
    scope: RequestFilterScope.SoftwareDevelopment,
    labelKey: 'label.requests.list.filters.groupSoftwareRequests',
  },
  {
    scope: RequestFilterScope.Operational,
    labelKey: 'label.requests.list.filters.groupOperationalRequests',
  },
] as const;

export type SavedRequestFilterGroup = (typeof savedRequestFilterGroups)[number];

/** Preserve catalog order within each scope and classify each record only once. */
export const groupSavedRequestFilters = <T>(
  items: readonly T[],
  getScope: (item: T) => RequestFilterScope | undefined
) => {
  const groups = savedRequestFilterGroups.map((group) => ({ ...group, items: [] as T[] }));
  const byScope = new Map(groups.map((group) => [group.scope, group]));

  for (const item of items) {
    const scope = getScope(item);
    // Built-in defaults and loading placeholders are not saved scope groups.
    if (scope !== undefined) {
      byScope.get(scope)?.items.push(item);
    }
  }

  return groups.filter((group) => group.items.length > 0);
};
