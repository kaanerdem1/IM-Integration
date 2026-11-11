import type { RequestListFilterValue } from '@/pages/requests/list/_config';
import type { RequestListFilterKey } from '../_config/filterConfig';
import { getRequestFilterScope, RequestFilterScope } from '../_config/requestFilterScope';
import {
  parseRequestBreakdowns,
  serializeRequestBreakdowns,
  type RequestBreakdownFilter,
} from './breakdownFilters';

type WorkflowStepDraft = {
  added: boolean;
  values?: string[];
  breakdowns: RequestBreakdownFilter[];
};

export type WorkflowStepDrafts = Partial<Record<RequestFilterScope, WorkflowStepDraft>>;

/** Keep per-type field presence and selections in modal memory, never in the submitted filter. */
export const changeRequestFilterScope = (
  values: RequestListFilterValue,
  workflowStepDrafts: WorkflowStepDrafts,
  nextScope: RequestFilterScope,
  activeFilterKeys: RequestListFilterKey[]
) => {
  const currentScope = getRequestFilterScope(values.listIssueType);
  const breakdowns = parseRequestBreakdowns(values.listBreakdowns);
  const nextDrafts = { ...workflowStepDrafts };
  nextDrafts[currentScope] = {
    added: activeFilterKeys.includes('listStep'),
    values: values.listStep,
    breakdowns: (breakdowns ?? []).filter(({ field }) => field === 'stepDefinationId'),
  };
  const nextStep = nextDrafts[nextScope];
  const nextActiveFilterKeys: RequestListFilterKey[] = activeFilterKeys.filter(
    (key) => key !== 'listStep'
  );
  if (nextStep?.added) {
    nextActiveFilterKeys.push('listStep');
  }
  return {
    activeFilterKeys: nextActiveFilterKeys,
    workflowStepDrafts: nextDrafts,
    values: {
      ...values,
      listIssueType: nextScope === RequestFilterScope.Common ? undefined : String(nextScope),
      listStep: nextStep?.values,
      listBreakdowns:
        breakdowns === null
          ? values.listBreakdowns
          : serializeRequestBreakdowns([
              ...breakdowns.filter(({ field }) => field !== 'stepDefinationId'),
              ...(nextStep?.breakdowns ?? []),
            ]),
    },
  };
};
