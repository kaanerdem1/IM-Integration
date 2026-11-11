import * as yup from 'yup';
import type { UserFormFilterCreateDto } from '@/_api/_core/api-gen/types';
import { DRAFT_WORKFLOW_STEP_ID } from '@/_common/workflow';
import { getNonNegativeIntegerRangeError } from '@/_helpers/number/range';
import {
  hasRequestListFilterValue,
  type RequestListFilterValue,
} from '@/pages/requests/list/_config';
import {
  dateRangeFilterConfigMap,
  getActiveRequestListFilterKeys,
  getScopedRequestListFilterValue,
  isRequestListFilterInScope,
  numberRangeFilterConfigMap,
  type RequestListFilterKey,
} from '../_config/filterConfig';
import { getRequestFilterScope } from '../_config/requestFilterScope';
import { getRequestBreakdownFormState } from '../_utils/breakdownFilters';

export const canSubmitRequestFilter = (
  value: RequestListFilterValue,
  keys: RequestListFilterKey[] = getActiveRequestListFilterKeys(value)
) => {
  const scoped = getScopedRequestListFilterValue(value);
  const fields = { ...scoped, ...getRequestBreakdownFormState(scoped.listBreakdowns).values };
  const scope = getRequestFilterScope(value.listIssueType);
  // A segment or a hidden draft alone must never enable Apply or Save.
  const populated = keys.some((key) => {
    if (
      !isRequestListFilterInScope(key, scope) &&
      !(key === 'listStep' && value.listStep?.includes(String(DRAFT_WORKFLOW_STEP_ID)))
    ) {
      return false;
    }
    const range = dateRangeFilterConfigMap.get(key) ?? numberRangeFilterConfigMap.get(key);
    if (range) {
      return Boolean(
        fields[range.fromKey] ||
        fields[range.toKey] ||
        ('quickRangeKey' in range && fields[range.quickRangeKey])
      );
    }
    if (key === 'listNo') {
      return Boolean((fields.listNo ?? fields.listIssueId)?.length);
    }
    return hasRequestListFilterValue(fields, key);
  });
  return (
    populated &&
    !Array.from(numberRangeFilterConfigMap.values()).some(
      ({ fromKey, toKey }) =>
        getNonNegativeIntegerRangeError(scoped[fromKey], scoped[toKey]) !== null
    )
  );
};

export type RequestFilterFormValues = {
  Name: NonNullable<UserFormFilterCreateDto['Name']>;
  Description: NonNullable<UserFormFilterCreateDto['Description']>;
};

export const createRequestFilterValidationSchema = (
  requiredMessage: string
): yup.ObjectSchema<RequestFilterFormValues> =>
  yup.object({
    Name: yup.string().trim().required(requiredMessage),
    Description: yup.string().trim().defined(),
  });
