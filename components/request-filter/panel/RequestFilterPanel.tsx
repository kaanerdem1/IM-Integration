import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { Dispatch, ReactNode, Ref, SetStateAction } from 'react';
import { IconDeviceFloppy, IconEraser, IconInfoCircle, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Divider,
  Flex,
  Group,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import type { ComboboxData } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { DRAFT_WORKFLOW_STEP_ID } from '@/_common/workflow';
import { areStringArraysEqual } from '@/_helpers/array';
import { areShallowRecordValuesEqual } from '@/_helpers/object';
import { sanitizeSlaStatusFilterValues } from '@/_helpers/sla/filters';
import { useSlaAccess } from '@/_hooks/_modules/sla/useSlaAccess';
import { FormFieldNote } from '@/components/form/FormFieldNote';
import {
  dateRangeFilterConfigMap,
  getActiveRequestListFilterKeys,
  getRequestListFilterLabelKey,
  getScopedRequestListFilterValue,
  isRequestListFilterInScope,
  numberRangeFilterConfigMap,
  requestListFilterConfigs,
  requestListFilterScopesByKey,
} from '@/components/request-filter/_config/filterConfig';
import type { RequestListFilterKey } from '@/components/request-filter/_config/filterConfig';
import {
  getRequestFilterScope,
  RequestFilterScope,
  requestFilterScopeDescriptionKeys,
} from '@/components/request-filter/_config/requestFilterScope';
import { useRequestFilterOptions } from '@/components/request-filter/_hooks/useRequestFilterOptions';
import { useRequestListFilterOptions } from '@/components/request-filter/_hooks/useRequestListFilterOptions';
import { useSavedRequestFilterPersistence } from '@/components/request-filter/_hooks/useSavedRequestFilterPersistence';
import { requestFilterModes } from '@/components/request-filter/_types';
import type {
  RequestFilterModalOptions,
  SavedUserFormFilter,
} from '@/components/request-filter/_types';
import { MemoizedRequestListFilterField } from '@/components/request-filter/fields/RequestListFilterField';
import type { RequestListFilterFieldOptions } from '@/components/request-filter/fields/RequestListFilterField';
import {
  canSubmitRequestFilter,
  createRequestFilterValidationSchema,
  type RequestFilterFormValues,
} from '@/components/request-filter/panel/validation';
import {
  hasRequestListApiFilterValue,
  sanitizeWorkflowStatusFilterValues,
} from '@/pages/requests/list/_config';
import type { RequestListFilterValue } from '@/pages/requests/list/_config';
import { serializeSavedRequestListFilter } from '@/pages/requests/list/_utils/savedRequestListFilter';
import {
  getRequestBreakdownFormState,
  removeRequestBreakdownField,
} from '../_utils/breakdownFilters';
import { changeRequestFilterScope, type WorkflowStepDrafts } from '../_utils/workflowStepDraft';
import { RequestFilterFields } from './RequestFilterFields';

export type RequestFilterDraft = {
  values: RequestListFilterValue;
  activeFilterKeys: RequestListFilterKey[];
  workflowStepDrafts: WorkflowStepDrafts;
  details: RequestFilterFormValues;
  canSubmit: boolean;
};
export type RequestFilterEditorHandle = { getDraft: () => RequestFilterDraft };

export type RequestFilterPanelProps = RequestFilterModalOptions & {
  /** Uygula / temizle veya oluşturma / düzenleme sonrası modal kapatılır */
  onClose: () => void;
  selectionEditor?: {
    ref: Ref<RequestFilterEditorHandle>;
    initialDraft: RequestFilterDraft;
    otherDraftsValid: boolean;
    renderPicker: (disabled: boolean) => ReactNode;
    onSaved: (item: SavedUserFormFilter) => void;
  };
};

const emptyRequestNoOptions: ComboboxData = [];
const emptyFilterValue: RequestListFilterValue = {};

const normalizeDraft = (value: RequestListFilterValue): RequestListFilterValue => ({
  ...value,
  listWorkflowStatus: sanitizeWorkflowStatusFilterValues(value.listWorkflowStatus),
  listSlaStatus: sanitizeSlaStatusFilterValues(value.listSlaStatus),
});

/**
 * Talep filtresi taslağını ve liste adını yönetir.
 * Uygulama modunda filtreyi talep listesine uygulama aksiyonunu da gösterir.
 */
export function RequestFilterPanel(props: RequestFilterPanelProps) {
  const {
    mode,
    item,
    requestNoOptions = emptyRequestNoOptions,
    value = emptyFilterValue,
    onApply,
    onClose,
    onReset,
    selectionEditor,
  } = props;
  const { t } = useTranslation();
  const canViewSla = useSlaAccess();
  const isApplyMode = mode === requestFilterModes.apply;
  const isEditMode = Boolean(item);
  const isSelectionEditor = Boolean(selectionEditor);
  const mountedRef = useRef(false);
  const [
    { values: storedDraft, key: draftKey, activeFilterKeys, workflowStepDrafts },
    setDraftState,
  ] = useState(() => ({
    values: normalizeDraft(selectionEditor?.initialDraft.values ?? value),
    activeFilterKeys:
      selectionEditor?.initialDraft.activeFilterKeys ?? getActiveRequestListFilterKeys(value),
    workflowStepDrafts:
      selectionEditor?.initialDraft.workflowStepDrafts ?? ({} as WorkflowStepDrafts),
    key: 0,
  }));
  const scope = getRequestFilterScope(storedDraft.listIssueType);
  const {
    applicationOptions,
    requestPoolOptions,
    requestSizeOptions,
    requestTypeOptions,
    stepOptions,
    workflowStatusOptions,
    slaStatusOptions,
  } = useRequestFilterOptions(scope);
  const validationSchema = useMemo(
    () =>
      createRequestFilterValidationSchema(
        t('message.required', { field: t('label.requests.list.filters.savedFilterName') })
      ),
    [t]
  );
  const form = useForm<RequestFilterFormValues>({
    mode: 'uncontrolled',
    initialValues: selectionEditor?.initialDraft.details ?? {
      Name:
        props.mode === requestFilterModes.create ? (props.initialName ?? '') : (item?.Name ?? ''),
      Description:
        props.mode === requestFilterModes.create
          ? (props.initialDescription ?? '')
          : (item?.Description ?? ''),
    },
    validate: schemaResolver(validationSchema),
  });
  const requestSizeIdByLabel = useMemo(
    () => new Map(requestSizeOptions.map((option) => [option.label, option.value])),
    [requestSizeOptions]
  );
  const draft = useMemo(() => {
    if (!storedDraft.listRequestSize?.length) {
      return storedDraft;
    }
    // Upgrade legacy labels when the form definition is available, without resetting other inputs.
    const sizes = [
      ...new Set(
        storedDraft.listRequestSize.map((value) => requestSizeIdByLabel.get(value) ?? value)
      ),
    ];
    return areStringArraysEqual(sizes, storedDraft.listRequestSize)
      ? storedDraft
      : { ...storedDraft, listRequestSize: sizes };
  }, [storedDraft, requestSizeIdByLabel]);
  const setDraft = useCallback<Dispatch<SetStateAction<RequestListFilterValue>>>((next) => {
    setDraftState((current) => ({
      ...current,
      values: typeof next === 'function' ? next(current.values) : next,
    }));
  }, []);
  const setActiveFilterKeys = useCallback<Dispatch<SetStateAction<RequestListFilterKey[]>>>(
    (next) => {
      setDraftState((current) => ({
        ...current,
        activeFilterKeys: typeof next === 'function' ? next(current.activeFilterKeys) : next,
      }));
    },
    []
  );
  const visibleFilterKeys = useMemo(
    () =>
      activeFilterKeys.filter(
        (key) =>
          (canViewSla || key !== 'listSlaStatus') &&
          (isRequestListFilterInScope(key, scope) ||
            (key === 'listStep' && storedDraft.listStep?.includes(String(DRAFT_WORKFLOW_STEP_ID))))
      ),
    [activeFilterKeys, scope, storedDraft.listStep, canViewSla]
  );
  const authorizedDraft = useMemo(
    () => (canViewSla ? draft : { ...draft, listSlaStatus: undefined }),
    [draft, canViewSla]
  );
  const scopedDraft = useMemo(
    () => getScopedRequestListFilterValue(authorizedDraft),
    [authorizedDraft]
  );
  const handleScopeChange = useCallback((nextScope: RequestFilterScope) => {
    setDraftState((current) => ({
      ...current,
      ...changeRequestFilterScope(
        current.values,
        current.workflowStepDrafts,
        nextScope,
        current.activeFilterKeys
      ),
    }));
  }, []);
  const [assignedUserSearchText, setAssignedUserSearchText] = useState('');
  const [businessUnitSearchText, setBusinessUnitSearchText] = useState('');
  const [createdBySearchText, setCreatedBySearchText] = useState('');
  const [updatedBySearchText, setUpdatedBySearchText] = useState('');
  const [softwareDirectorSearchText, setSoftwareDirectorSearchText] = useState('');
  const [softwareUnitSearchText, setSoftwareUnitSearchText] = useState('');
  const [unitSearchText, setUnitSearchText] = useState('');
  const [focusFilterKey, setFocusFilterKey] = useState<RequestListFilterKey | null>(null);
  const breakdownForm = useMemo(
    () => getRequestBreakdownFormState(scopedDraft.listBreakdowns),
    [scopedDraft.listBreakdowns]
  );
  const fieldValues = useMemo(
    () => ({ ...scopedDraft, ...breakdownForm.values }),
    [scopedDraft, breakdownForm]
  );
  const { isPending: isPersistingSavedFilter, persist } = useSavedRequestFilterPersistence();
  const isSaving = isPersistingSavedFilter || form.submitting;
  const renderRecordPicker = selectionEditor?.renderPicker;
  // Field edits must not rebuild the record picker or reparse its options.
  const recordPicker = useMemo(
    () => renderRecordPicker?.(isSaving),
    [renderRecordPicker, isSaving]
  );
  const asyncFilterOptions = useRequestListFilterOptions({
    activeFilterKeys: visibleFilterKeys,
    assignedUserSearchText,
    businessUnitSearchText,
    createdBySearchText,
    opened: true,
    softwareDirectorSearchText,
    softwareUnitSearchText,
    unitSearchText,
    updatedBySearchText,
    value: fieldValues,
  });
  const filterLabels = useMemo(
    () =>
      new Map<RequestListFilterKey, string>(
        requestListFilterConfigs.map((config) => [
          config.key,
          t(getRequestListFilterLabelKey(config)),
        ])
      ),
    [t]
  );
  const getFilterLabel = useCallback(
    (key: RequestListFilterKey) => filterLabels.get(key) ?? key,
    [filterLabels]
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Dışarıdan gelen değer değişirse taslak ve etkin alanlar ona göre yenilenir
  useEffect(() => {
    // Multi-record editors remount by ID and restore the complete snapshot, including empty fields.
    if (isSelectionEditor) {
      return;
    }
    const nextDraft = normalizeDraft(value);
    const nextActiveFilterKeys = getActiveRequestListFilterKeys(nextDraft);

    // Reinitialize uncontrolled fields only when replacing the draft, not on search/selection.
    setDraftState((current) => {
      const sameValues = areShallowRecordValuesEqual(current.values, nextDraft);
      if (sameValues && areStringArraysEqual(current.activeFilterKeys, nextActiveFilterKeys)) {
        return current;
      }
      return {
        values: nextDraft,
        activeFilterKeys: nextActiveFilterKeys,
        workflowStepDrafts: sameValues ? current.workflowStepDrafts : {},
        key: sameValues ? current.key : current.key + 1,
      };
    });
  }, [value, isSelectionEditor]);

  useEffect(() => {
    setAssignedUserSearchText('');
    setBusinessUnitSearchText('');
    setCreatedBySearchText('');
    setUpdatedBySearchText('');
    setSoftwareDirectorSearchText('');
    setSoftwareUnitSearchText('');
    setUnitSearchText('');
  }, [draftKey]);

  useEffect(() => {
    if (!focusFilterKey || !activeFilterKeys.includes(focusFilterKey)) {
      return;
    }

    const timeoutId = window.setTimeout(() => setFocusFilterKey(null), 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeFilterKeys, focusFilterKey]);

  const handleClearFields = () => {
    // Clear this record's criteria and hidden step drafts, not its identity or selected scope.
    setDraftState((current) => ({
      values: { listIssueType: current.values.listIssueType, listSort: current.values.listSort },
      activeFilterKeys: [],
      workflowStepDrafts: {},
      key: current.key + 1,
    }));
    setFocusFilterKey(null);
  };

  const handleAddFilter = useCallback(
    (key: RequestListFilterKey) => {
      setActiveFilterKeys((current) => (current.includes(key) ? current : [...current, key]));
      setFocusFilterKey(key);
    },
    [setActiveFilterKeys]
  );

  const handleFilterSearchChange = useCallback((key: RequestListFilterKey, searchValue: string) => {
    if (key === 'listAssignedUser') {
      setAssignedUserSearchText(searchValue);
    }

    if (key === 'listCreatedBy') {
      setCreatedBySearchText(searchValue);
    }

    if (key === 'listUpdatedBy') {
      setUpdatedBySearchText(searchValue);
    }

    if (key === 'listProjectLeaderUnit') {
      setBusinessUnitSearchText(searchValue);
    }

    if (key === 'listSoftwareUnit') {
      setSoftwareUnitSearchText(searchValue);
    }

    if (key === 'listSoftwareDirector') {
      setSoftwareDirectorSearchText(searchValue);
    }

    if (key === 'listUnit') {
      setUnitSearchText(searchValue);
    }
  }, []);

  const handleSaveFilter = async ({ Name, Description }: RequestFilterFormValues) => {
    if (!canSubmitDraft || isPersistingSavedFilter) {
      return;
    }

    const isSaved = await persist({
      item,
      name: Name.trim(),
      description: Description.trim(),
      value: scopedDraft,
    });

    // Kapanan panelin isteği, sonradan açılan başka bir filtre modalını kapatmamalı.
    if (!isSaved || !mountedRef.current) {
      return;
    }

    if (selectionEditor && item) {
      const details = { Name: Name.trim(), Description: Description.trim() };
      form.setValues(details);
      form.resetDirty(details);
      selectionEditor.onSaved({
        ...item,
        ...details,
        Filter: serializeSavedRequestListFilter(scopedDraft),
      });
      return;
    }

    if (isApplyMode && !item) {
      form.setValues({ Name: '', Description: '' });
      form.clearErrors();
    } else {
      if (isApplyMode) {
        onApply(scopedDraft);
      }
      onClose();
    }
  };

  const handleRemoveFilter = (key: RequestListFilterKey) => {
    setActiveFilterKeys((current) => current.filter((item) => item !== key));
    setDraft((current) => {
      const rangeConfig = dateRangeFilterConfigMap.get(key) ?? numberRangeFilterConfigMap.get(key);

      if (rangeConfig) {
        return {
          ...current,
          [rangeConfig.fromKey]: undefined,
          [rangeConfig.toKey]: undefined,
          ...('quickRangeKey' in rangeConfig ? { [rangeConfig.quickRangeKey]: undefined } : {}),
        };
      }

      return {
        ...removeRequestBreakdownField(current, key),
        ...(key === 'listNo' ? { listIssueId: undefined } : {}),
        [key]: undefined,
      };
    });
  };

  const canSubmitDraft = useMemo(
    () => canSubmitRequestFilter(authorizedDraft, visibleFilterKeys),
    [authorizedDraft, visibleFilterKeys]
  );
  useImperativeHandle(selectionEditor?.ref, () => ({
    getDraft: () => ({
      values: authorizedDraft,
      activeFilterKeys: canViewSla
        ? activeFilterKeys
        : activeFilterKeys.filter((key) => key !== 'listSlaStatus'),
      workflowStepDrafts,
      details: form.getValues(),
      canSubmit: canSubmitDraft,
    }),
  }));
  const canClearFields =
    activeFilterKeys.length > 0 || Object.values(workflowStepDrafts).some((step) => step.added);
  const canReset = isApplyMode && (props.canReset ?? hasRequestListApiFilterValue(value));
  const persistButtonId = isEditMode
    ? 'request-list-filter-update-button'
    : 'request-list-filter-save-button';
  const persistButtonLabel = t(
    isEditMode
      ? 'label.requests.list.filters.updateFilter'
      : 'label.requests.list.filters.saveFilter'
  );
  const applyButtonLabel = t('label.requests.list.filters.apply');

  const fieldOptions: RequestListFilterFieldOptions = useMemo(
    () => ({
      ...asyncFilterOptions,
      breakdownOptions: breakdownForm.options,
      applicationOptions,
      requestNoOptions,
      requestPoolOptions,
      requestSizeOptions,
      requestTypeOptions,
      stepOptions,
      workflowStatusOptions,
      slaStatusOptions,
    }),
    [
      breakdownForm.options,
      applicationOptions,
      asyncFilterOptions,
      requestNoOptions,
      requestPoolOptions,
      requestSizeOptions,
      requestTypeOptions,
      stepOptions,
      workflowStatusOptions,
      slaStatusOptions,
    ]
  );

  return (
    <Box
      component="form"
      display="flex"
      flex={1}
      mih={0}
      style={{ flexDirection: 'column' }}
      onSubmit={form.onSubmit(handleSaveFilter)}
      noValidate
    >
      <Flex
        component="fieldset"
        disabled={isSaving}
        m={0}
        p={0}
        direction={{ base: 'column', xs: 'row' }}
        flex={1}
        mih={0}
        miw={0}
        style={{ overflow: 'hidden', border: 0 }}
      >
        <RequestFilterFields
          activeFilterKeys={activeFilterKeys}
          scope={scope}
          disabled={isSaving}
          onScopeChange={handleScopeChange}
          getFilterLabel={getFilterLabel}
          onAdd={handleAddFilter}
        />

        <Divider color="gray.2" my={0} variant="solid" orientation="vertical" visibleFrom="xs" />
        <Divider color="gray.2" my={0} variant="solid" hiddenFrom="xs" />

        <Stack gap={0} flex={{ base: '2 1 0', xs: '1 1 0' }} mih={0} miw={0}>
          <Box p="sm" flex="0 0 auto">
            {recordPicker}
            {isApplyMode && !isEditMode ? (
              <Alert
                data-testid="request-list-filter-save-note"
                role="note"
                color="gray"
                variant="light"
                icon={<IconInfoCircle size={16} />}
                mb="sm"
                p="xs"
              >
                <Text size="xs">{t('label.requests.list.filters.savedFilterDetailsHint')}</Text>
              </Alert>
            ) : null}
            <TextInput
              key={form.key('Name')}
              id="request-list-filter-name-input"
              data-testid="request-list-filter-name-input"
              label={t('label.requests.list.filters.savedFilterName')}
              placeholder={t('label.requests.list.filters.savedFilterNamePlaceholder')}
              withAsterisk={!isApplyMode || isEditMode}
              disabled={isSaving}
              {...form.getInputProps('Name')}
            />
            <Textarea
              key={form.key('Description')}
              id="request-list-filter-description-input"
              data-testid="request-list-filter-description-input"
              label={t('label.requests.list.filters.savedFilterDescription')}
              mt="sm"
              autosize
              minRows={3}
              maxRows={3}
              disabled={isSaving}
              {...form.getInputProps('Description')}
            />
          </Box>
          <Divider color="gray.2" my={0} variant="solid" />
          <Group justify="space-between" px="sm" pt="xs" gap="xs">
            <Text size="xs" c="dimmed">
              {t('label.requests.list.filters.addedFields')}
            </Text>
            <Tooltip label={t('label.requests.list.filters.clearFieldsHint')} withArrow>
              <Button
                data-testid="request-list-filter-clear-fields-button"
                size="compact-xs"
                type="button"
                variant="light"
                color="cyan"
                leftSection={<IconEraser aria-hidden size={14} stroke={1.8} />}
                disabled={!canClearFields || isSaving}
                onClick={handleClearFields}
              >
                {t('label.requests.list.filters.clearFields')}
              </Button>
            </Tooltip>
          </Group>
          <ScrollArea
            flex={1}
            mih={0}
            miw={0}
            data-testid="request-list-filter-editor-scroll"
            scrollbars="y"
            type="auto"
            offsetScrollbars="y"
            overscrollBehavior="contain"
          >
            <Box p="sm">
              <SimpleGrid type="container" cols={{ base: 1, '40em': 2 }}>
                {visibleFilterKeys.length ? (
                  visibleFilterKeys.map((key) => {
                    const fieldScopes = requestListFilterScopesByKey.get(key);
                    const fieldScope =
                      fieldScopes?.length === 1 ? fieldScopes[0] : RequestFilterScope.Common;
                    const descriptionKey =
                      fieldScope === RequestFilterScope.Common
                        ? undefined
                        : requestFilterScopeDescriptionKeys[fieldScope];
                    return (
                      <Group
                        key={`${draftKey}-${key}-${key === 'listStep' ? scope : ''}`}
                        align="flex-start"
                        gap="xs"
                        wrap="nowrap"
                        pr="sm"
                      >
                        <Stack gap={0} flex={1} miw={0}>
                          <MemoizedRequestListFilterField
                            autoFocus={focusFilterKey === key}
                            filterKey={key}
                            getFilterLabel={getFilterLabel}
                            options={fieldOptions}
                            setDraft={setDraft}
                            value={fieldValues}
                            onSearch={handleFilterSearchChange}
                          />
                          {descriptionKey && <FormFieldNote>{t(descriptionKey)}</FormFieldNote>}
                        </Stack>
                        <Tooltip label={t('label.delete_')} withArrow position="bottom">
                          <ActionIcon
                            id={`request-list-filter-${key}-remove-button`}
                            data-testid={`request-list-filter-remove-${key}`}
                            aria-label={t('label.requests.list.filters.removeFilter', {
                              value: getFilterLabel(key),
                            })}
                            color="red"
                            mt={30}
                            size="sm"
                            type="button"
                            variant="light"
                            onClick={() => handleRemoveFilter(key)}
                          >
                            <IconX size={14} stroke={1.8} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    );
                  })
                ) : (
                  <Text c="dimmed" size="xs">
                    {t('label.requests.list.filters.empty')}
                  </Text>
                )}
              </SimpleGrid>
            </Box>
          </ScrollArea>
        </Stack>
      </Flex>

      <Divider color="gray.2" my={0} variant="solid" />
      <Stack gap={6} p="sm" mih={60} flex="0 0 auto" justify="center">
        <Group justify="flex-end">
          {isApplyMode && (
            <Tooltip label={t('label.requests.list.filters.clearFiltersHint')} withArrow>
              <Button
                id="request-list-filter-clear-button"
                data-testid="request-list-filter-clear-button"
                size="xs"
                type="button"
                variant="light"
                color="cyan"
                mr="auto"
                leftSection={<IconX aria-hidden size={14} stroke={1.8} />}
                disabled={!canReset || isSaving}
                onClick={() => {
                  onReset();
                  onClose();
                }}
              >
                {t('label.requests.list.filters.clearFilters')}
              </Button>
            </Tooltip>
          )}
          <Button
            id={persistButtonId}
            data-testid={persistButtonId}
            size="xs"
            type="submit"
            variant={isApplyMode ? 'light' : 'filled'}
            leftSection={<IconDeviceFloppy size={14} stroke={1.6} />}
            loading={isSaving}
            disabled={!canSubmitDraft}
          >
            {persistButtonLabel}
          </Button>
          {isApplyMode ? (
            <Button
              id="request-list-filter-apply-button"
              data-testid="request-list-filter-apply-button"
              size="xs"
              type="button"
              disabled={!canSubmitDraft || isSaving || selectionEditor?.otherDraftsValid === false}
              onClick={() => {
                onApply(scopedDraft);
                onClose();
              }}
            >
              {applyButtonLabel}
            </Button>
          ) : null}
        </Group>
        {isSelectionEditor && (
          <Text data-testid="request-filter-selection-actions-hint" size="xs" c="dimmed" ta="right">
            {t('label.requests.list.filters.editingActionsHint', {
              save: persistButtonLabel,
              apply: applyButtonLabel,
            })}
          </Text>
        )}
      </Stack>
    </Box>
  );
}
