import {
  requestDateRangeConfigs,
  type RequestListDateFromKey,
  type RequestListDateToKey,
  type RequestListQuickRangeFilterKey,
  type RequestListQuickRangeFilters,
} from '../_config/dateRangeFilters';
import { getDateQuickRangeValue, isDateQuickRangeKey } from '../fields/date-range/dateQuickRange';

type DateFilterValues = Partial<
  Record<RequestListDateFromKey | RequestListDateToKey | RequestListQuickRangeFilterKey, string>
> & { listFilterGroups?: DateFilterValues[] };

export const pickDateQuickRangeFilters = (
  value: Partial<Record<RequestListQuickRangeFilterKey, unknown>>
): RequestListQuickRangeFilters => {
  const filters: RequestListQuickRangeFilters = {};
  for (const { quickRangeKey } of requestDateRangeConfigs) {
    const preset = value[quickRangeKey];
    if (isDateQuickRangeKey(preset)) {
      filters[quickRangeKey] = preset;
    }
  }
  return filters;
};

/** Store either a preset or fixed dates, never both. Invalid presets do not erase fixed dates. */
export const normalizeRelativeDateFilters = <T extends DateFilterValues>(value: T): T => {
  const normalized = { ...value };
  for (const { fromKey, toKey, quickRangeKey } of requestDateRangeConfigs) {
    if (isDateQuickRangeKey(normalized[quickRangeKey])) {
      delete normalized[fromKey];
      delete normalized[toKey];
    } else {
      delete normalized[quickRangeKey];
    }
  }
  return normalized;
};

/** Resolve for display/requests only; never mutate the saved criteria. */
export const resolveRelativeDateFilters = <T extends DateFilterValues>(
  value: T,
  now = new Date()
): T => {
  let resolved = value;
  if (value.listFilterGroups) {
    // Each OR branch resolves its own presets against the same date.
    resolved = {
      ...value,
      listFilterGroups: value.listFilterGroups.map((group) =>
        resolveRelativeDateFilters(group, now)
      ),
    };
  }
  for (const { fromKey, toKey, quickRangeKey } of requestDateRangeConfigs) {
    const preset = value[quickRangeKey];
    if (!isDateQuickRangeKey(preset)) {
      continue;
    }
    if (resolved === value) {
      resolved = { ...value };
    }
    const [from, to] = getDateQuickRangeValue(preset, now);
    resolved[fromKey] = String(from);
    resolved[toKey] = String(to);
    delete resolved[quickRangeKey];
  }
  return resolved;
};
