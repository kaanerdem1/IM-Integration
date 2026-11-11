import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { IssueTypeEnum } from '@/_api/_core/api-gen/types';
import { useFormTabDetail, useIssueStepdefination } from '@/_api/hooks';
import { FormEnum } from '@/_common/forms';
import { DRAFT_WORKFLOW_STEP_ID } from '@/_common/workflow';
import { getSelectableWorkflowStatusPresentations } from '@/_common/workflow/status';
import { getSlaStatusFilterOptions } from '@/_helpers/sla/filters';
import { buildFieldMap } from '@/components/dynamic-form/action';
import { FormEnterFieldEnum, FormTabEnum } from '@/pages/requests/software-development/form/types';
import { RequestFilterScope } from '../_config/requestFilterScope';

export type RequestFilterOption = {
  label: string;
  value: string;
};

type FieldItemsSource = {
  Items?: Array<{ Id?: string; Label?: string | null }> | null;
};

const mapFieldItemLabelsToFilterOptions = (field: FieldItemsSource | null): RequestFilterOption[] =>
  (field?.Items ?? [])
    .map((item) => {
      const label = item.Label?.trim() ?? '';

      return label ? { label, value: label } : null;
    })
    .filter((item): item is RequestFilterOption => Boolean(item));

/**
 * Talep filtresi menüsünün sabit seçenekleri (form tanımı, iş akışı durumu, iş akışı adımı).
 * Panel yalnızca modal açıkken mount edilir; sayfaların ayrıca seçenek taşıması gerekmez.
 */
export const useRequestFilterOptions = (scope: RequestFilterScope) => {
  const { t } = useTranslation();
  const { data: formDefinition } = useFormTabDetail(FormEnum.RequestForm, FormTabEnum.Enter);
  const { data: stepData } = useIssueStepdefination(
    scope === RequestFilterScope.Common ? IssueTypeEnum.NUMBER_1 : scope,
    { enabled: scope !== RequestFilterScope.Common, staleTime: 60_000 }
  );

  const formDefinitionFields = useMemo(
    () => formDefinition?.Data?.Tab?.Fields ?? [],
    [formDefinition?.Data?.Tab?.Fields]
  );
  const formDefinitionFieldMap = useMemo(
    () => buildFieldMap<Record<FormEnterFieldEnum, unknown>>(formDefinitionFields),
    [formDefinitionFields]
  );

  const requestTypeOptions = useMemo(
    () =>
      mapFieldItemLabelsToFilterOptions(
        formDefinitionFieldMap[FormEnterFieldEnum.RequestType] ?? null
      ),
    [formDefinitionFieldMap]
  );
  const applicationOptions = useMemo(
    () =>
      mapFieldItemLabelsToFilterOptions(
        formDefinitionFieldMap[FormEnterFieldEnum.Application] ?? null
      ),
    [formDefinitionFieldMap]
  );
  const requestPoolOptions = useMemo(
    () =>
      mapFieldItemLabelsToFilterOptions(
        formDefinitionFieldMap[FormEnterFieldEnum.RequestPool] ?? null
      ),
    [formDefinitionFieldMap]
  );
  const requestSizeOptions = useMemo(
    () =>
      (formDefinitionFieldMap[FormEnterFieldEnum.RequestSize]?.Items ?? []).flatMap((item) => {
        const label = item.Label?.trim();
        return item.Id && label ? [{ value: item.Id, label }] : [];
      }),
    [formDefinitionFieldMap]
  );

  const workflowStatusOptions = useMemo<RequestFilterOption[]>(
    () =>
      getSelectableWorkflowStatusPresentations(t).map((presentation) => ({
        label: presentation.label,
        value: String(presentation.key),
      })),
    [t]
  );

  const slaStatusOptions = useMemo(() => getSlaStatusFilterOptions(t), [t]);

  const stepOptions = useMemo<RequestFilterOption[]>(
    () => [
      { value: String(DRAFT_WORKFLOW_STEP_ID), label: t('label.statusDraft') },
      ...(scope === RequestFilterScope.Common ? [] : (stepData?.Data ?? []))
        .filter((item) => item.Id !== DRAFT_WORKFLOW_STEP_ID)
        .sort((left, right) => {
          const leftOrder = typeof left.Order === 'number' ? left.Order : Number.MAX_SAFE_INTEGER;
          const rightOrder =
            typeof right.Order === 'number' ? right.Order : Number.MAX_SAFE_INTEGER;

          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }

          return (left.Key ?? '').localeCompare(right.Key ?? '', 'tr');
        })
        .map((item) => ({
          label: item.Key?.trim() || '-',
          value: typeof item.Id === 'number' ? String(item.Id) : '',
        }))
        .filter((item) => item.value),
    ],
    [scope, stepData?.Data, t]
  );

  return {
    applicationOptions,
    requestPoolOptions,
    requestSizeOptions,
    requestTypeOptions,
    stepOptions,
    slaStatusOptions,
    workflowStatusOptions,
  };
};
