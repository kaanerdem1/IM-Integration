import { isRecord } from '@/_helpers/object';
import type {
  RequestListApiMultiFilterKey,
  RequestListFilterValue,
} from '@/pages/requests/list/_config';
import { FormEnterFieldEnum } from '@/pages/requests/software-development/form/types';

const filterKeyByField: Readonly<Partial<Record<string, RequestListApiMultiFilterKey>>> = {
  [FormEnterFieldEnum.ProjectLeaderBusinessUnit]: 'listProjectLeaderUnit',
  stepDefinationId: 'listStep',
  [FormEnterFieldEnum.SoftwareDirector]: 'listSoftwareDirector',
  [FormEnterFieldEnum.SoftwareUnit]: 'listSoftwareUnit',
  [FormEnterFieldEnum.Portfolio]: 'listPortfolio',
  [FormEnterFieldEnum.PortfolioManager]: 'listPortfolioManager',
  [FormEnterFieldEnum.ProjectSponsor]: 'listProjectSponsor',
  [FormEnterFieldEnum.Application]: 'listApplication',
  [FormEnterFieldEnum.RequestPool]: 'listRequestPool',
  [FormEnterFieldEnum.RequestSize]: 'listRequestSize',
  [FormEnterFieldEnum.RequestType]: 'listRequestType',
};
const labelValueFields = new Set<string>([
  FormEnterFieldEnum.Application,
  FormEnterFieldEnum.RequestPool,
  FormEnterFieldEnum.RequestType,
]);
export type RequestBreakdownOptions = Partial<
  Record<RequestListApiMultiFilterKey, { value: string; label: string }[]>
>;

export type RequestBreakdownFilter = {
  field: string;
  value: string;
  label: string;
  group?: number;
};

// Every supported chart scope must have a matching request filter input.
const supportedFields = new Set(Object.keys(filterKeyByField));

export const isRequestBreakdownField = (field: string) => supportedFields.has(field);

export const parseRequestBreakdowns = (serialized?: string): RequestBreakdownFilter[] | null => {
  if (!serialized) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) {
      return null;
    }
    const result: RequestBreakdownFilter[] = [];
    for (const item of parsed) {
      if (
        !isRecord(item) ||
        typeof item.field !== 'string' ||
        !supportedFields.has(item.field) ||
        typeof item.value !== 'string' ||
        !item.value.trim() ||
        typeof item.label !== 'string' ||
        (item.group !== undefined &&
          (typeof item.group !== 'number' ||
            !Number.isSafeInteger(item.group) ||
            item.group < 0)) ||
        (item.field === 'stepDefinationId' && !Number.isFinite(Number(item.value)))
      ) {
        return null;
      }
      result.push({
        field: item.field,
        value: item.value,
        label: item.label,
        ...(item.group !== undefined ? { group: item.group } : {}),
      });
    }
    return result;
  } catch {
    return null;
  }
};

export const serializeRequestBreakdowns = (filters: readonly RequestBreakdownFilter[]) =>
  filters.length ? JSON.stringify(filters) : undefined;

export const getRequestBreakdownSelections = (serialized?: string) => {
  const breakdowns = parseRequestBreakdowns(serialized);
  if (!breakdowns) {
    return null;
  }
  return breakdowns.flatMap((item) => {
    const key = filterKeyByField[item.field];
    if (!key) {
      return [];
    }
    // Stored labels use "field: value"; the input already renders the field label.
    const separator = item.label.indexOf(': ');
    const label = separator < 0 ? item.label : item.label.slice(separator + 2);
    const value = labelValueFields.has(item.field) ? label : item.value;
    return [{ key, value, label, group: item.group }];
  });
};

export const getRequestBreakdownFormState = (serialized?: string) => {
  const values: RequestListFilterValue = {};
  const options: RequestBreakdownOptions = {};
  const seen = new Map<RequestListApiMultiFilterKey, Set<string>>();
  for (const { key, value, label } of getRequestBreakdownSelections(serialized) ?? []) {
    const selectedValues = seen.get(key) ?? new Set<string>();
    if (selectedValues.has(value)) {
      continue;
    }
    selectedValues.add(value);
    seen.set(key, selectedValues);
    (options[key] ??= []).push({ value, label });
    (values[key] ??= []).push(value);
  }
  return { values, options };
};

export const removeRequestBreakdownField = (
  value: RequestListFilterValue,
  key: keyof RequestListFilterValue
): RequestListFilterValue => {
  const breakdowns = parseRequestBreakdowns(value.listBreakdowns);
  if (!breakdowns?.some((item) => filterKeyByField[item.field] === key)) {
    return value;
  }
  return {
    ...value,
    listBreakdowns: serializeRequestBreakdowns(
      breakdowns.filter((item) => filterKeyByField[item.field] !== key)
    ),
  };
};

export const updateRequestFilterField = (
  value: RequestListFilterValue,
  key: RequestListApiMultiFilterKey,
  selected: string[]
): RequestListFilterValue => ({
  // Editing a field replaces both its saved base condition and its chart restriction.
  ...removeRequestBreakdownField(value, key),
  [key]: selected.length ? selected : undefined,
});
