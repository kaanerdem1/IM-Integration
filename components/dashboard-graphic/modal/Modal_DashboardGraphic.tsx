import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { IconSettings } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import * as yup from 'yup';
import {
  Alert,
  Button,
  Grid,
  Group,
  Input,
  Loader,
  Select,
  Stack,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import type { UserDashboardGraphicCreateDto } from '@/_api/_core/api-gen/types';
import {
  QueryKeys,
  useParameterDetail,
  useUserDashboardGraphicCreate,
  useUserDashboardGraphicList,
  useUserDashboardGraphicUpdate,
  type UserDashboardGraphicCreateResponse,
} from '@/_api/hooks';
import { authEngine } from '@/_auth/engine';
import { getAuthUserIdentity } from '@/_auth/login-recovery';
import { appUrlPrefix } from '@/_common/_constants';
import { formLabelStyle } from '@/_common/_props/form-label';
import { useMessage } from '@/_hooks/useMessage';
import { appChartLegendPositions } from '@/components/charts/chartTypes';
import { Modal } from '@/components/display/Modal/Modal';
import { ModalBody } from '@/components/display/Modal/ModalBody';
import { ModalFooter } from '@/components/display/Modal/ModalFooter';
import { useModalState } from '@/components/modal-host/_hook/useModal';
import { useSavedRequestFilterQuery } from '@/components/request-filter/_hooks/useSavedRequestFilterQuery';
import { RequestFilterCreateButton } from '@/components/request-filter/panel/RequestFilterCreateButton';
import type { FiltersAndGraphsView } from '@/pages/filters-and-graphs/_config';
import { parseSavedRequestListFilter } from '@/pages/requests/list/_utils/savedRequestListFilter';
import { useDashboardGraphicSelection } from '../_store/useDashboardGraphicSelection';
import {
  requestDistributionChartTypeDefinitions,
  requestDistributionLegendPositionDefinitions,
  requestDistributionParameterKey,
} from '../config';
import {
  createRequestDistributionFieldOptions,
  createRequestDistributionSavedFilterOptions,
} from '../options';
import {
  cacheSavedDashboardGraphic,
  createDashboardGraphicConfiguration,
  createDashboardGraphicOptions,
  defaultDashboardGraphicConfiguration,
  getDashboardGraphicFilterIds,
  getDashboardGraphicFormValues,
  hasDashboardGraphicChanges,
} from '../savedGraphics';
import type { DashboardGraphicFormValues } from '../types';
import { DashboardGraphicFilterSelect } from './DashboardGraphicFilterSelect';
import { DashboardGraphicPreview } from './DashboardGraphicPreview';

type FormValues = DashboardGraphicFormValues & {
  Name: string;
};

const graphicsView: FiltersAndGraphsView = 'graphics';
const selectProps = { radius: 'md', variant: 'default', searchable: true } as const;

export const Modal_DashboardGraphic = () => {
  const { t } = useTranslation();
  const filterSelectId = useId();
  const navigate = useNavigate();
  const { message } = useMessage();
  const queryClient = useQueryClient();
  const { opened, options, closeModal } = useModalState('DashboardGraphic');
  const isPreview = options?.mode === 'preview';
  const isWidget = options?.mode === 'widget';
  const widgetDraft = options?.mode === 'widget' ? options.draft : undefined;
  const actionPending = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const focusNameAfterValidation = useRef(false);
  const savedItem = options && 'item' in options ? options.item : undefined;
  const initialConfiguration =
    options?.mode === 'widget'
      ? (options.draft?.configuration ?? options.configuration)
      : options?.mode === 'preview'
        ? options.configuration
        : (savedItem ?? defaultDashboardGraphicConfiguration);
  const initialSourceId =
    options?.mode === 'widget'
      ? options.draft
        ? options.draft.sourceId
        : (options.sourceId ?? null)
      : null;
  const [selectedGraphicId, setSelectedGraphicId] = useState(initialSourceId);
  const isLinkedGraphic = isWidget && !!options.sourceId && selectedGraphicId === options.sourceId;
  const [applyFailed, setApplyFailed] = useState(widgetDraft?.applyFailed ?? false);
  const [loadedWidgetConfiguration, setLoadedWidgetConfiguration] = useState<
    UserDashboardGraphicCreateDto | undefined
  >(isWidget && initialSourceId ? undefined : initialConfiguration);
  const parameters = useParameterDetail(requestDistributionParameterKey);
  const { query: filters } = useSavedRequestFilterQuery();
  const graphics = useUserDashboardGraphicList({ enabled: opened && isWidget });
  const graphicListError = graphics.isError || Boolean(graphics.data?.Error);
  const { graphicOptions, graphicById } = useMemo(
    () => createDashboardGraphicOptions(graphics.data?.Data),
    [graphics.data?.Data]
  );
  const item = isWidget ? graphicById.get(selectedGraphicId ?? '') : savedItem;
  const missingSource = isWidget && !!selectedGraphicId && !item;
  const { fieldOptions, fieldOptionByValue } = useMemo(
    () => createRequestDistributionFieldOptions(parameters.data?.Data?.Items),
    [parameters.data?.Data?.Items]
  );
  const { savedFilterOptions, savedFilterById } = useMemo(
    () => createRequestDistributionSavedFilterOptions(filters.data?.Data),
    [filters.data?.Data]
  );
  const validate = useMemo(() => {
    const invalidSettings = t('label.home.savedGraphicInvalid');
    const validationSchema: yup.ObjectSchema<FormValues> = yup.object({
      Name: yup.string().trim().required(t('message.required_')),
      PrimaryFieldValue: yup
        .string()
        .trim()
        .required(
          t('message.required', { field: t('label.home.requestDistributionPrimaryBreakdown') })
        )
        .test(
          'valid-primary-field',
          invalidSettings,
          (value) => !value || fieldOptionByValue.has(value)
        ),
      SecondaryFieldValue: yup
        .string()
        .nullable()
        .defined()
        .test(
          'valid-secondary-field',
          invalidSettings,
          (value, context) =>
            !value ||
            (value !== context.resolve(yup.ref('PrimaryFieldValue')) &&
              fieldOptionByValue.has(value))
        ),
      GraphicType: yup
        .string<NonNullable<FormValues['GraphicType']>>()
        .oneOf(
          requestDistributionChartTypeDefinitions.map(({ value }) => value),
          t('message.required_')
        )
        .required(t('message.required_')),
      LegendPosition: yup
        .string()
        .oneOf(appChartLegendPositions, t('message.required_'))
        .required(t('message.required_')),
      UserFormFilterIds: yup
        .array()
        .of(yup.string().required())
        .required()
        .test(
          'valid-saved-filter',
          t('label.requests.list.filters.savedFilterParseError'),
          (values) =>
            values.every((id) =>
              Boolean(parseSavedRequestListFilter(savedFilterById.get(id)?.Filter))
            )
        ),
    });
    return schemaResolver(validationSchema);
  }, [fieldOptionByValue, savedFilterById, t]);
  const form = useForm<FormValues>({
    mode: 'uncontrolled',
    initialValues: {
      ...getDashboardGraphicFormValues(initialConfiguration),
      Name:
        options?.mode === 'widget' ? (options.draft?.name ?? item?.Name ?? '') : (item?.Name ?? ''),
    },
    validate,
  });
  const { setValues, resetDirty } = form;
  const linkedLoading =
    isWidget &&
    !!initialSourceId &&
    !loadedWidgetConfiguration &&
    (!graphics.isSuccess || graphics.isFetching || Boolean(graphics.data.Error) || !!item);
  const availableGraphic = graphics.isFetching || graphics.data?.Error ? undefined : item;
  const graphicToHydrate =
    availableGraphic ??
    (graphicListError && widgetDraft?.applyFailed ? widgetDraft.baseline : undefined);
  useEffect(() => {
    if (linkedLoading && graphicToHydrate) {
      const baseline = widgetDraft?.baseline ?? graphicToHydrate;
      const values = {
        ...getDashboardGraphicFormValues(widgetDraft?.configuration ?? graphicToHydrate),
        Name: widgetDraft?.name ?? graphicToHydrate.Name ?? '',
      };
      // Seed the snapshot before the draft so Mantine tracks every changed field.
      resetDirty({
        ...getDashboardGraphicFormValues(baseline),
        Name: baseline.Name ?? '',
      });
      setValues(values);
      setLoadedWidgetConfiguration(baseline);
    }
  }, [linkedLoading, graphicToHydrate, widgetDraft, setValues, resetDirty]);
  useLayoutEffect(() => {
    if (!form.submitting && focusNameAfterValidation.current) {
      focusNameAfterValidation.current = false;
      nameInput.current?.focus();
    }
  }, [form.submitting, form.errors]);
  const primary = form.useWatchValue('PrimaryFieldValue');
  const secondary = form.useWatchValue('SecondaryFieldValue');
  const chartType = form.useWatchValue('GraphicType');
  const filterIds = form.useWatchValue('UserFormFilterIds');
  const legendPosition = form.useWatchValue('LegendPosition');
  const primaryOptions = useMemo(
    () => fieldOptions.map((option) => ({ ...option, disabled: option.value === secondary })),
    [fieldOptions, secondary]
  );
  const secondaryOptions = useMemo(
    () => fieldOptions.map((option) => ({ ...option, disabled: option.value === primary })),
    [fieldOptions, primary]
  );
  const chartTypeOptions = useMemo(
    () =>
      requestDistributionChartTypeDefinitions.map(({ value, labelKey }) => ({
        value,
        label: t(labelKey),
      })),
    [t]
  );
  const legendOptions = useMemo(
    () =>
      requestDistributionLegendPositionDefinitions.map(({ value, labelKey }) => ({
        value,
        label: t(labelKey),
      })),
    [t]
  );
  const onSaved = async (
    response: UserDashboardGraphicCreateResponse,
    isUpdate: boolean,
    values: UserDashboardGraphicCreateDto
  ) => {
    if (response.Error || (response.StatusCode ?? 0) >= 400 || (isWidget && !response.Data?.Id)) {
      message(response.Error?.Message || t('message.commonError'), 'error');
      return;
    }
    const record = response.Data;
    const saved = record ? { ...values, ...record } : undefined;
    const previousFilterIds = isUpdate ? getDashboardGraphicFilterIds(item?.UserFormFilterIds) : [];
    const savedFilterIds = getDashboardGraphicFilterIds(saved?.UserFormFilterIds);
    // Filter dependencies contain only the chart ID and name.
    if (
      !saved?.Id ||
      record?.UserFormFilterIds === undefined ||
      (isUpdate && item?.UserFormFilterIds === undefined) ||
      previousFilterIds.length !== savedFilterIds.length ||
      savedFilterIds.some((id, index) => id !== previousFilterIds[index]) ||
      (savedFilterIds.length > 0 && (record.Name === undefined || saved.Name !== item?.Name))
    ) {
      void queryClient.invalidateQueries({ queryKey: [QueryKeys.UserFormFilterDetail] });
    }
    const confirmedSettings =
      isWidget && !!record && Object.keys(values).every((key) => Object.hasOwn(record, key));
    cacheSavedDashboardGraphic(queryClient, saved, confirmedSettings);
    const selection = useDashboardGraphicSelection.getState();
    if (options?.mode === 'widget' && saved?.Id) {
      const applied = await options.onApply(
        createDashboardGraphicConfiguration(getDashboardGraphicFormValues(saved), {
          PrimaryEmptyLabel: saved.PrimaryEmptyLabel,
          SecondaryEmptyLabel: saved.SecondaryEmptyLabel,
        }),
        saved.Id
      );
      if (applied === false) {
        const savedValues = { ...getDashboardGraphicFormValues(saved), Name: saved.Name ?? '' };
        setSelectedGraphicId(saved.Id);
        setLoadedWidgetConfiguration(saved);
        form.setValues(savedValues);
        form.resetDirty(savedValues);
        setApplyFailed(true);
        message(t('label.home.dashboard.graphicSavedApplyFailed'), 'error');
        return;
      }
    } else if (saved?.Id && isPreview) {
      selection.selectGraphic(saved.Id);
    } else if (
      saved?.Id &&
      saved.Id === selection.selectedId &&
      selection.draft &&
      !hasDashboardGraphicChanges(selection.draft, saved)
    ) {
      selection.selectGraphic(saved.Id);
    }
    message(
      t(isUpdate ? 'label.home.savedGraphicUpdated' : 'label.home.savedGraphicCreated'),
      'success'
    );
    closeModal('DashboardGraphic');
  };
  const create = useUserDashboardGraphicCreate();
  const update = useUserDashboardGraphicUpdate();
  const isSubmitting = form.submitting;
  const hasOptionsError =
    parameters.isError ||
    Boolean(parameters.data?.Error) ||
    filters.isError ||
    Boolean(filters.data?.Error);
  const unavailable =
    hasOptionsError || parameters.isPending || (filterIds.length > 0 && filters.isPending);
  const saveUnavailable =
    unavailable ||
    linkedLoading ||
    (isWidget &&
      (graphics.isPending ||
        graphics.isFetching ||
        (graphics.isError && !item) ||
        Boolean(graphics.data?.Error)));
  const graphicChanged = form.isDirty();
  const unchangedLinkedGraphic = isLinkedGraphic && !graphicChanged && !applyFailed;
  // A successful save already confirmed the ID, even if refreshing the catalog failed.
  const retrySourceId =
    applyFailed && !graphicChanged && graphicListError ? selectedGraphicId : null;
  const primaryUnavailable = retrySourceId
    ? unavailable || linkedLoading
    : saveUnavailable || missingSource;
  const canApplySavedGraphic =
    isWidget && !graphicChanged && !unchangedLinkedGraphic && (item || retrySourceId);
  const configurationSource: UserDashboardGraphicCreateDto =
    loadedWidgetConfiguration ?? initialConfiguration;
  const getConfiguration = useCallback(
    (values: DashboardGraphicFormValues) =>
      createDashboardGraphicConfiguration(values, {
        PrimaryEmptyLabel:
          configurationSource.PrimaryFieldValue === values.PrimaryFieldValue &&
          configurationSource.PrimaryEmptyLabel
            ? configurationSource.PrimaryEmptyLabel
            : t('label.home.requestDistributionUnspecifiedField', {
                field: fieldOptionByValue.get(values.PrimaryFieldValue ?? '')?.label ?? '',
              }),
        SecondaryEmptyLabel: values.SecondaryFieldValue
          ? configurationSource.SecondaryFieldValue === values.SecondaryFieldValue &&
            configurationSource.SecondaryEmptyLabel
            ? configurationSource.SecondaryEmptyLabel
            : t('label.home.requestDistributionUnspecifiedField', {
                field: fieldOptionByValue.get(values.SecondaryFieldValue)?.label ?? '',
              })
          : null,
      }),
    [configurationSource, fieldOptionByValue, t]
  );
  // Mantine clones array values even when only Name changes; compare selected IDs by content.
  const previewFilterIds = JSON.stringify(filterIds);
  const previewConfiguration = useMemo(
    () =>
      getConfiguration({
        PrimaryFieldValue: primary,
        SecondaryFieldValue: secondary,
        GraphicType: chartType,
        UserFormFilterIds: JSON.parse(previewFilterIds) as string[],
        LegendPosition: legendPosition,
      }),
    [getConfiguration, primary, secondary, chartType, previewFilterIds, legendPosition]
  );
  const selectGraphic = (id: string | null) => {
    if (actionPending.current) {
      return;
    }
    if (!id) {
      setSelectedGraphicId(null);
      return;
    }
    const graphic = graphicById.get(id);
    if (!graphic) {
      return;
    }
    setLoadedWidgetConfiguration(graphic);
    const values = { ...getDashboardGraphicFormValues(graphic), Name: graphic.Name ?? '' };
    form.setValues(values);
    form.resetDirty(values);
    form.clearErrors();
    setApplyFailed(false);
    setSelectedGraphicId(id);
  };
  const onClose = () => {
    if (!actionPending.current && !isSubmitting) {
      closeModal('DashboardGraphic');
      if (options?.mode === 'widget') {
        options.onCancel?.();
      }
    }
  };
  const handleManage = () => {
    if (actionPending.current || isSubmitting) {
      return;
    }
    closeModal('DashboardGraphic');
    navigate(`${appUrlPrefix}/filters-and-graphs?view=${graphicsView}`);
  };
  const submit = async (action: 'save' | 'copy' | 'apply') => {
    if (!options || actionPending.current || isSubmitting) {
      return;
    }
    if (
      (action === 'copy' && (!item || saveUnavailable)) ||
      (action === 'apply' && (options.mode !== 'preview' || unavailable)) ||
      (action === 'save' &&
        (primaryUnavailable ||
          (isLinkedGraphic && !applyFailed && !form.isDirty()) ||
          (retrySourceId && form.isDirty())))
    ) {
      return;
    }
    // Claim the action before async validation; React's pending render can arrive later.
    actionPending.current = true;
    form.setSubmitting(true);
    const values = form.getValues();
    const account = getAuthUserIdentity(authEngine.getSession()?.me);
    try {
      const configuration = getConfiguration(values);
      const existingSourceId =
        options.mode === 'widget' && action === 'save'
          ? (retrySourceId ??
            (item &&
            (!form.isDirty() ||
              (values.Name.trim() === (configurationSource.Name ?? '').trim() &&
                !hasDashboardGraphicChanges(configuration, configurationSource)))
              ? item.Id
              : undefined))
          : undefined;
      const errors = await validate(values);
      if (getAuthUserIdentity(authEngine.getSession()?.me) !== account) {
        return;
      }
      if (action === 'apply' || existingSourceId) {
        delete errors.Name;
      } else if (action === 'copy' && values.Name.trim() === item?.Name?.trim()) {
        errors.Name = t('label.home.savedGraphicCopyNameRequired');
      }
      const hasErrors = Object.keys(errors).length > 0;
      if (hasErrors || Object.keys(form.errors).length > 0) {
        form.setErrors(errors);
      }
      if (hasErrors) {
        if (action === 'copy' && errors.Name) {
          focusNameAfterValidation.current = true;
        }
        return;
      }
      if (action === 'apply') {
        if (options.mode === 'preview') {
          useDashboardGraphicSelection.getState().previewGraphic(configuration, options.item.Id);
        }
        closeModal('DashboardGraphic');
        return;
      }
      if (options.mode === 'widget' && existingSourceId) {
        if ((await options.onApply(configuration, existingSourceId)) !== false) {
          closeModal('DashboardGraphic');
        }
        return;
      }
      const payload = {
        ...configuration,
        Name: values.Name.trim(),
      };
      const mutation =
        action === 'save' && item
          ? update.mutateAsync({ ...payload, Id: item.Id })
          : create.mutateAsync(payload);
      // The API client reports transport errors; preserve this form for a retry.
      const response = await mutation.catch(() => undefined);
      if (response && getAuthUserIdentity(authEngine.getSession()?.me) === account) {
        await onSaved(response, action === 'save' && !!item, payload);
      }
    } finally {
      actionPending.current = false;
      form.setSubmitting(false);
    }
  };

  const applyAction =
    !hasOptionsError && isPreview ? (
      <Button
        id="apply-dashboard-graphic"
        variant="light"
        disabled={isSubmitting || unavailable}
        onClick={() => void submit('apply')}
      >
        {t('label.home.graphicApply')}
      </Button>
    ) : null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="100%"
      loading={isSubmitting}
      title={
        <Group component="span" gap="xs">
          <span>
            {t(
              isPreview || isWidget
                ? 'label.home.requestDistributionSettings'
                : item
                  ? 'label.home.savedGraphicEdit'
                  : 'label.home.savedGraphicCreate'
            )}
          </span>
          {isPreview ? (
            <Tooltip label={t('label.root.filtersAndGraphs.graphicsTab')} withArrow>
              <Button
                data-testid="dashboard-graphic-manage-button"
                leftSection={<IconSettings aria-hidden size={14} stroke={1.8} />}
                size="compact-xs"
                variant="light"
                disabled={isSubmitting}
                onClick={handleManage}
              >
                {t('label.manage')}
              </Button>
            </Tooltip>
          ) : null}
        </Group>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit('save');
        }}
      >
        <ModalBody>
          {linkedLoading ? (
            graphics.isPending || graphics.isFetching ? (
              <Loader size="sm" />
            ) : (
              <Alert>{t('label.home.dashboard.graphicUnavailable')}</Alert>
            )
          ) : !hasOptionsError ? (
            <Grid gap="lg" align="stretch">
              <Grid.Col span={{ base: 12, md: 3 }}>
                <Stack gap="md">
                  {isWidget && (
                    <>
                      <Select
                        {...selectProps}
                        id="widget-saved-graphic"
                        clearable
                        label={t('label.home.dashboard.savedGraphicStart')}
                        aria-label={t('label.home.dashboard.savedGraphicStart')}
                        placeholder={t('label.home.dashboard.savedGraphicOptional')}
                        data={graphicOptions}
                        value={selectedGraphicId}
                        onChange={selectGraphic}
                        disabled={isSubmitting || graphics.isPending || graphicListError}
                        rightSection={graphics.isFetching ? <Loader size={16} /> : undefined}
                        error={
                          graphicListError
                            ? t('label.home.dashboard.savedGraphicLoadError')
                            : missingSource
                              ? t('label.home.dashboard.graphicUnavailable')
                              : undefined
                        }
                        nothingFoundMessage={t('label.home.dashboard.savedGraphicEmpty')}
                        description={
                          canApplySavedGraphic
                            ? t('label.home.dashboard.applyGraphicHint')
                            : isLinkedGraphic
                              ? t('label.home.dashboard.linkedGraphicHint')
                              : item
                                ? t('label.home.dashboard.selectedGraphicHint')
                                : graphics.isSuccess &&
                                    !graphics.data.Error &&
                                    graphicOptions.length === 0
                                  ? t('label.home.dashboard.savedGraphicEmpty')
                                  : undefined
                        }
                      />
                    </>
                  )}
                  <TextInput
                    key={form.key('Name')}
                    id="dashboard-graphic-name"
                    ref={nameInput}
                    variant="default"
                    label={t('label.home.savedGraphicName')}
                    description={isPreview ? t('label.home.savedGraphicNameHint') : undefined}
                    withAsterisk={!isPreview}
                    disabled={isSubmitting}
                    {...form.getInputProps('Name')}
                  />
                  <Select
                    {...selectProps}
                    key={form.key('PrimaryFieldValue')}
                    allowDeselect={false}
                    withAsterisk
                    aria-required
                    label={t('label.home.requestDistributionPrimaryBreakdown')}
                    aria-label={t('label.home.requestDistributionPrimaryBreakdown')}
                    data={primaryOptions}
                    disabled={isSubmitting || parameters.isPending}
                    rightSection={parameters.isFetching ? <Loader size={16} /> : undefined}
                    {...form.getInputProps('PrimaryFieldValue')}
                  />
                  <Select
                    {...selectProps}
                    key={form.key('SecondaryFieldValue')}
                    clearable
                    label={t('label.home.requestDistributionSecondaryBreakdown')}
                    aria-label={t('label.home.requestDistributionSecondaryBreakdown')}
                    placeholder={t('label.makeAChoice')}
                    data={secondaryOptions}
                    disabled={isSubmitting || parameters.isPending || !primary}
                    {...form.getInputProps('SecondaryFieldValue')}
                  />
                  <Select
                    {...selectProps}
                    key={form.key('GraphicType')}
                    allowDeselect={false}
                    withAsterisk
                    label={t('label.home.requestDistributionChartType')}
                    aria-label={t('label.home.requestDistributionChartType')}
                    data={chartTypeOptions}
                    disabled={isSubmitting}
                    {...form.getInputProps('GraphicType')}
                  />
                  <Select
                    {...selectProps}
                    key={form.key('LegendPosition')}
                    allowDeselect={false}
                    label={t('label.home.requestDistributionLegendPosition')}
                    aria-label={t('label.home.requestDistributionLegendPosition')}
                    data={legendOptions}
                    disabled={isSubmitting || chartType === 'lollipop'}
                    {...form.getInputProps('LegendPosition')}
                  />
                  <Input.Wrapper
                    id={filterSelectId}
                    label={t('label.home.requestDistributionMyLists')}
                    styles={{ label: formLabelStyle }}
                  >
                    {/* Keep the action aligned with the input, independent of label or pill height. */}
                    <Group align="flex-start" gap="xs" wrap="nowrap">
                      <DashboardGraphicFilterSelect
                        key={form.key('UserFormFilterIds')}
                        id={filterSelectId}
                        aria-label={t('label.home.requestDistributionMyLists')}
                        savedFilterOptions={savedFilterOptions}
                        savedFilterById={savedFilterById}
                        disabled={isSubmitting || filters.isPending}
                        rightSection={filters.isFetching ? <Loader size={16} /> : undefined}
                        {...form.getInputProps('UserFormFilterIds')}
                        value={filterIds}
                      />
                      <RequestFilterCreateButton disabled={isSubmitting} size={36} />
                    </Group>
                  </Input.Wrapper>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 9 }} miw={0}>
                <DashboardGraphicPreview
                  configuration={previewConfiguration}
                  legendPosition={legendPosition}
                />
              </Grid.Col>
            </Grid>
          ) : null}
        </ModalBody>
        <ModalFooter>
          {options?.mode === 'widget' && options.onBack && (
            <Button
              id="back-widget-content"
              variant="default"
              disabled={isSubmitting || linkedLoading}
              onClick={() => {
                if (actionPending.current || linkedLoading) {
                  return;
                }
                closeModal('DashboardGraphic');
                options.onBack?.({
                  name: form.getValues().Name,
                  configuration: getConfiguration(form.getValues()),
                  sourceId: selectedGraphicId,
                  baseline: configurationSource,
                  ...(applyFailed && { applyFailed: true }),
                });
              }}
            >
              {t('label.home.dashboard.backToContent')}
            </Button>
          )}
          <Button variant="subtle" disabled={isSubmitting} onClick={onClose}>
            {t('label.cancel')}
          </Button>
          {applyAction}
          {!hasOptionsError && item ? (
            <Button
              id="copy-dashboard-graphic"
              variant="light"
              loading={create.isPending}
              disabled={isSubmitting || saveUnavailable}
              onClick={() => void submit('copy')}
            >
              {t(
                isWidget ? 'label.home.dashboard.copyAndApplyGraphic' : 'label.home.graphicSaveAs'
              )}
            </Button>
          ) : null}
          {!hasOptionsError ? (
            <Button
              id="save-dashboard-graphic"
              type="submit"
              variant="filled"
              loading={item ? update.isPending : create.isPending}
              disabled={isSubmitting || primaryUnavailable || unchangedLinkedGraphic}
            >
              {t(
                canApplySavedGraphic
                  ? 'label.home.graphicApply'
                  : isWidget
                    ? item
                      ? 'label.home.dashboard.updateAndApplyGraphic'
                      : 'label.home.dashboard.saveAndApplyGraphic'
                    : item
                      ? 'label.update_'
                      : 'label.save'
              )}
            </Button>
          ) : null}
        </ModalFooter>
      </form>
    </Modal>
  );
};
