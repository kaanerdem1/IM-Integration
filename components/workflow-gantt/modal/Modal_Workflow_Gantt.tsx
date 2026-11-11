import { useMemo, useState } from 'react';
import classes from './style.module.scss';
import { useTranslation } from 'react-i18next';
import { Badge, Box, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { normalizeTimestampToMilliseconds } from '@/_helpers/date';
import {
  activeSlaStatusKeys,
  getSlaStatusLabels,
  slaRecalculationIntervalMs,
  slaStatusPresentations,
} from '@/_helpers/sla';
import { useVisibleIntervalNow } from '@/_hooks/useVisibleIntervalNow';
import { Modal } from '@/components/display/Modal/Modal';
import { LoaderOrNoData } from '@/components/display/Nodata/LoaderOrNo';
import { useModalState } from '@/components/modal-host/_hook/useModal';
import { GanttChart, type GanttChartConfig } from '@/components/workflow-gantt/GanttChart';
import { GanttPeriodSelection } from '@/components/workflow-gantt/GanttPeriodSelection';
import ganttClasses from '@/components/workflow-gantt/style.module.scss';
import { buildWorkflowGanttData, workflowGanttSlaTaskTypeIds } from '../workflowGanttData';
import {
  createWorkflowGanttHighlightTime,
  getWorkflowGanttColumns,
  getWorkflowGanttGridWidth,
  getWorkflowGanttTimelineBounds,
  workflowGanttConfig,
  workflowGanttMainPlanBadgeColor,
  workflowGanttModes,
  workflowGanttScaleModes,
  workflowGanttScalePresets,
  type WorkflowGanttMode,
  type WorkflowGanttScaleMode,
} from './workflowGanttConfig';
import {
  WorkflowGanttActualTaskTemplate,
  WorkflowGanttPlannedTaskTemplate,
  WorkflowGanttTaskTemplate,
} from './WorkflowGanttTaskTemplate';

const stepMeasureOptions = { box: 'border-box' } satisfies ResizeObserverOptions;

export const Modal_Workflow_Gantt = () => {
  const { t } = useTranslation();
  const [ganttMode, setGanttMode] = useState<WorkflowGanttMode>(workflowGanttModes.general);
  const [ganttScaleMode, setGanttScaleMode] = useState<WorkflowGanttScaleMode>(
    workflowGanttScaleModes.weekly
  );
  const { closeModal, opened, options } = useModalState('WorkflowGantt');
  const { ref: stepMeasureRef, width: measuredStepWidth } =
    useElementSize<HTMLDivElement>(stepMeasureOptions);
  const no = options?.No?.trim() ?? '';
  const requestNoLabel = t('label.requests.tasks.columns.parentRequestNo');
  const responseData = options?.Data;
  const stepMeasureText = useMemo(
    () => responseData?.map(({ StepName }) => StepName?.trim() ?? '').join('\n') ?? '',
    [responseData]
  );
  const stepColumnWidth = Math.ceil(measuredStepWidth);
  const hasActiveStep = useMemo(
    () =>
      responseData?.some(
        (row) =>
          normalizeTimestampToMilliseconds(row.CurrentStartDate) !== null &&
          normalizeTimestampToMilliseconds(row.CurrentEndDate) === null
      ) ?? false,
    [responseData]
  );
  const now = useVisibleIntervalNow(opened && hasActiveStep, slaRecalculationIntervalMs);
  const ganttData = useMemo(
    () =>
      buildWorkflowGanttData(
        responseData,
        (order) => t('label.requests.workflow.timeline.unnamedStep', { value: order }),
        now
      ),
    [now, responseData, t]
  );
  const columns = useMemo(
    () => getWorkflowGanttColumns(t, ganttMode, stepColumnWidth),
    [ganttMode, stepColumnWidth, t]
  );
  const ganttModeOptions = useMemo(
    () => [
      {
        label: t('label.requests.workflow.timeline.viewMode.general'),
        value: workflowGanttModes.general,
      },
      {
        label: t('label.requests.workflow.timeline.viewMode.planned'),
        value: workflowGanttModes.planned,
      },
      {
        label: t('label.requests.workflow.timeline.viewMode.actual'),
        value: workflowGanttModes.actual,
      },
    ],
    [t]
  );
  const ganttScalePreset = workflowGanttScalePresets[ganttScaleMode];
  const ganttTimelineBounds = useMemo(
    () =>
      getWorkflowGanttTimelineBounds(
        ganttData.timelineRanges[ganttMode],
        ganttScalePreset.scales[ganttScalePreset.scales.length - 1].unit
      ),
    [ganttData.timelineRanges, ganttMode, ganttScalePreset.scales]
  );
  const ganttHighlightTime = useMemo(
    () =>
      opened
        ? createWorkflowGanttHighlightTime(
            new Date(),
            ganttScalePreset.scales[ganttScalePreset.scales.length - 1].unit,
            ganttClasses.today
          )
        : undefined,
    [ganttScalePreset.scales, opened]
  );
  const ganttSlaStatusLabels = useMemo(() => getSlaStatusLabels(t), [t]);
  const ganttTaskTypes = useMemo(
    () =>
      activeSlaStatusKeys.map((status) => ({
        id: workflowGanttSlaTaskTypeIds[status],
        label: ganttSlaStatusLabels[status],
      })),
    [ganttSlaStatusLabels]
  );
  const hasData = ganttData.tasks.length > 0;
  const ganttContentHeight = Math.max(
    workflowGanttConfig.minimumHeight,
    ganttData.tasks.length * workflowGanttConfig.cellHeight +
      workflowGanttConfig.headerAndScrollbarHeight
  );
  const ganttViewportHeight = `min(${ganttContentHeight}px, calc(100dvh - 180px))`;
  const ganttGridWidth = getWorkflowGanttGridWidth(columns);
  const isActualMode = ganttMode === workflowGanttModes.actual;
  const ganttTasks = isActualMode ? ganttData.actualTasks : ganttData.tasks;
  const ganttLinks = isActualMode ? ganttData.actualLinks : ganttData.links;
  const ganttTaskTemplate = isActualMode
    ? WorkflowGanttActualTaskTemplate
    : ganttMode === workflowGanttModes.planned
      ? WorkflowGanttPlannedTaskTemplate
      : WorkflowGanttTaskTemplate;
  const ganttConfig = useMemo(
    (): GanttChartConfig => ({
      autoScale: !ganttTimelineBounds,
      cellWidth: ganttScalePreset.cellWidth,
      columns,
      end: ganttTimelineBounds?.end,
      gridWidth: ganttGridWidth,
      highlightTime: ganttHighlightTime,
      links: ganttLinks,
      scales: ganttScalePreset.scales,
      start: ganttTimelineBounds?.start,
      tasks: ganttTasks,
      taskTemplate: ganttTaskTemplate,
      taskTypes: ganttTaskTypes,
      zoom: ganttScalePreset.zoom,
    }),
    [
      columns,
      ganttGridWidth,
      ganttHighlightTime,
      ganttLinks,
      ganttScalePreset,
      ganttTaskTemplate,
      ganttTaskTypes,
      ganttTasks,
      ganttTimelineBounds,
    ]
  );
  const handleClose = () => closeModal('WorkflowGantt');

  return (
    <Modal
      centered
      opened={opened}
      onClose={handleClose}
      size="100%"
      styles={{
        close: { marginInlineStart: 'var(--mantine-spacing-sm)' },
        title: { textAlign: 'left', width: '100%' },
      }}
      title={
        <Group align="center" justify="space-between" wrap="nowrap" w="100%">
          <Box miw={0}>
            {t('label.requests.workflow.timeline.title')}
            {no ? (
              <Group
                gap={4}
                mt="xs"
                wrap="nowrap"
                tt="none"
                aria-label={`${requestNoLabel} ${no}`}
                data-testid="workflow-gantt-header-request"
              >
                <Text component="strong" size="xs" c="gray.8" fw={700}>
                  {requestNoLabel}:
                </Text>{' '}
                <Badge variant="default" size="xs" tt="none" fw={600}>
                  {no}
                </Badge>
              </Group>
            ) : null}
          </Box>
          <SegmentedControl<WorkflowGanttMode>
            aria-label={t('label.requests.workflow.timeline.viewMode.label')}
            data={ganttModeOptions}
            onChange={setGanttMode}
            radius="xl"
            size="sm"
            value={ganttMode}
          />
        </Group>
      }
    >
      <LoaderOrNoData
        loading={false}
        hasData={hasData}
        text={t('label.requests.workflow.timeline.empty')}
      >
        <Stack gap="xs">
          <Group justify="space-between" mt="xs" px="xs" wrap="nowrap">
            <Group gap="xs" wrap="wrap">
              {!isActualMode ? (
                <Badge color={workflowGanttMainPlanBadgeColor} size="sm" variant="filled">
                  {t('label.requests.workflow.timeline.mainPlan')}
                </Badge>
              ) : null}
              {ganttMode !== workflowGanttModes.planned ? (
                <>
                  <Text c="dimmed" size="xs">
                    {t('label.requests.workflow.timeline.actualSla')}:
                  </Text>
                  {activeSlaStatusKeys.map((status) => (
                    <Badge
                      key={status}
                      {...slaStatusPresentations[status].badgeProps}
                      size="sm"
                      variant="light"
                    >
                      {ganttSlaStatusLabels[status]}
                    </Badge>
                  ))}
                </>
              ) : null}
            </Group>
            <GanttPeriodSelection size="xs" value={ganttScaleMode} onChange={setGanttScaleMode} />
          </Group>
          <Box className={classes.ganttContainer} miw={0} w="100%">
            {/* Measure all labels in one intrinsic-width element, independently of the grid. */}
            <Box ref={stepMeasureRef} className={classes.stepMeasure} aria-hidden inert>
              <Box className={classes.stepMeasureHeader}>
                {t('label.requests.workflow.timeline.workflowStep')}
              </Box>
              <Box className={classes.stepMeasureText}>{stepMeasureText}</Box>
            </Box>
            <GanttChart
              className={isActualMode ? classes.actualMode : undefined}
              config={ganttConfig}
              height={ganttViewportHeight}
              testId="workflow-gantt-container"
              withZoom
              zoomTestId="workflow-gantt-zoom-controls"
            />
          </Box>
        </Stack>
      </LoaderOrNoData>
    </Modal>
  );
};
