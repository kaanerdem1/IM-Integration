import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import classes from './WorkflowStepProgress.module.scss';
import {
  IconArrowRight,
  IconClockHour4,
  IconPencil,
  IconPin,
  IconPinnedOff,
  IconUser,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  Avatar,
  Badge,
  Box,
  Button,
  getThemeColor,
  ScrollArea,
  Stack,
  Text,
  Timeline,
  Tooltip,
  UnstyledButton,
  type MantineColor,
} from '@mantine/core';
import type {
  InformationNextstep,
  SlaInformationDto,
  WorkflowInformationDto,
} from '@/_api/_core/api-gen/types';
import {
  OperationalWorkflowStep,
  WorkflowStatusEnum,
  WorkflowStep,
  type RequestWorkflowStepCode,
  type TaskWorkflowStepCode,
} from '@/_common/workflow';
import { WORKFLOW_STATUS_COLORS } from '@/_common/workflow/colors';
import { isCompletedWorkflowStatus, isTerminalWorkflowStatus } from '@/_common/workflow/state';
import { getUserAvatarUrl } from '@/_helpers/user/avatar';
import { useWorkflowSlaCountdown } from '@/_hooks/_modules/workflow/use-workflow-sla-countdown';
import {
  WorkflowApproverStatusEnum,
  type WorkflowCardModel,
  type WorkflowTimelineItemModel,
} from '@/_hooks/_modules/workflow/workflow-view-model.types';
import { getStatusColor } from '@/_hooks/_modules/workflow/workflow-view-model.utils';
import { useWorkflowPreferencesStore } from '@/_store/workflow/useWorkflowPreferencesStore';
import { ToolbarActionIcon } from '@/components/display/Buttons/ToolbarActionIcon';
import { useModalActions } from '@/components/modal-host/_hook/useModal';
import { CardContent } from './cards';
import { WorkflowActivityTitle, WorkflowStatusIcon } from './WorkflowActivity';
import type { WorkflowEntityReference } from './WorkflowEntityIdentity';

type WorkflowStepProgressProps = {
  color?: MantineColor;
  currentStepAction?: ReactNode;
  entity?: WorkflowEntityReference;
  /** Creator code used for the avatar. */
  creatorCode?: string | null;
  /** Creator shown on the initial step before the workflow starts. */
  creatorName?: string | null;
  creatorUnit?: string | null;
  currentStepCode?: InformationNextstep['StepDefinationCode'];
  currentStepTargetStartDate?: SlaInformationDto['TargetStartDate'];
  currentStepTargetEndDate?: SlaInformationDto['TargetEndDate'];
  /** Step definition ID from the request or task detail. */
  currentStepId?: number | null;
  currentStepName?: string | null;
  currentStepOrder?: InformationNextstep['StepDefinationOrder'];
  stepDefinitions?: WorkflowInformationDto['StepDefinations'];
  /** Tamamlanan ve bulunulan adımların onay bilgisi */
  timelineItems?: WorkflowTimelineItemModel[];
  userIdentity?: string;
  withSla?: boolean;
  workflowStatus?: number | null;
};

type StepState = 'done' | 'current' | 'upcoming' | 'inactive';

type ProgressStep = {
  /** Kişi dışındaki kartlar (çoklu onaycı, durum kartı) olduğu gibi gösterilir */
  card?: WorkflowCardModel;
  date?: string;
  historyItems?: WorkflowTimelineItemModel[];
  incomingReturn?: WorkflowTimelineItemModel;
  key: string;
  name: string;
  note?: WorkflowTimelineItemModel['note'];
  personCode?: string | null;
  personName?: string;
  personUnit?: string;
  returnTargetName?: string;
  statusValue?: WorkflowApproverStatusEnum | null;
  state: StepState;
  statusColor?: WorkflowTimelineItemModel['statusColor'];
  statusLabel?: string;
};

const CURRENT_TIMELINE_ITEM_KEY = 'current';
const EMPTY_TIMELINE_ITEMS: WorkflowTimelineItemModel[] = [];
const HISTORY_TIMELINE_CLASS_NAMES = {
  root: classes.history,
  item: classes.historyItem,
  itemTitle: classes.historyTitle,
  itemContent: classes.historyContent,
};
const COMPLETION_STEP_CODES = new Set<string>([
  'Completed',
  'OperationalCompleted',
  'AnalysisCompleted',
  'TestCompleted',
  'DevelopmentCompleted',
] satisfies (RequestWorkflowStepCode | TaskWorkflowStepCode)[]);

const normalizeStepName = (value?: string | null) => value?.trim().toLocaleLowerCase('tr') ?? '';

/** İade/iptal adımlarında not (neden) bulunur; diğer durumlarda not gösterilmez */
const getNoteAction = (status?: WorkflowApproverStatusEnum | null) => {
  if (status === WorkflowApproverStatusEnum.Cancel) {
    return 'cancel' as const;
  }

  if (status === WorkflowApproverStatusEnum.Reject) {
    return 'reject' as const;
  }

  return undefined;
};

/** Kişi kartı adımın içinde ayrıca çizilir; diğer kartlar (çoklu onaycı, durum) olduğu gibi gösterilir */
const getStepPerson = (item?: WorkflowTimelineItemModel) =>
  item?.card.kind === 'person'
    ? {
        personCode: item.card.userCode,
        personName: item.card.title,
        personUnit: item.card.subtitle,
      }
    : { card: item?.card };

const SlaExceededContext = createContext(false);
const SlaDisplayContext = createContext<{ color?: string; text?: string }>({});

const WorkflowSlaClock = ({
  children,
  targetStartDate,
  targetEndDate,
  enabled,
}: {
  children: ReactNode;
  targetStartDate?: SlaInformationDto['TargetStartDate'];
  targetEndDate?: SlaInformationDto['TargetEndDate'];
  enabled: boolean;
}) => {
  const { t } = useTranslation();
  const { remainingSeconds, slaCountdown, slaCountdownColor } = useWorkflowSlaCountdown({
    targetStartDate,
    targetEndDate,
    enabled,
  });
  const display = useMemo(
    () => ({
      color: slaCountdownColor ?? undefined,
      text: slaCountdown
        ? t('label.requests.workflow.slaCountdown', { value: slaCountdown })
        : undefined,
    }),
    [slaCountdown, slaCountdownColor, t]
  );

  return (
    <SlaExceededContext.Provider value={remainingSeconds !== null && remainingSeconds < 0}>
      <SlaDisplayContext.Provider value={display}>{children}</SlaDisplayContext.Provider>
    </SlaExceededContext.Provider>
  );
};

const StepTooltipContent = ({
  name,
  statusLabel,
  slaText,
}: {
  name: string;
  statusLabel?: string;
  slaText?: string;
}) => (
  <Stack gap={2} style={{ overflowWrap: 'anywhere' }}>
    <Text component="strong" inherit fw={700}>
      {name}
    </Text>
    {statusLabel ? <Text inherit>{statusLabel}</Text> : null}
    {slaText ? <Text inherit>{slaText}</Text> : null}
  </Stack>
);

const CurrentStepSegment = ({ name, statusLabel }: { name: string; statusLabel: string }) => {
  const isExceeded = useContext(SlaExceededContext);
  const { text } = useContext(SlaDisplayContext);

  return (
    <Tooltip
      label={<StepTooltipContent name={name} statusLabel={statusLabel} slaText={text} />}
      multiline
      maw="min(280px, calc(100vw - 32px))"
      withArrow
      openDelay={200}
    >
      <Box
        className={classes.segment}
        data-exceeded={isExceeded || undefined}
        data-state="current"
      />
    </Tooltip>
  );
};

const CurrentStepSla = () => {
  const { color, text } = useContext(SlaDisplayContext);

  return text ? (
    <Box className={classes.stepSla} c={color}>
      {text}
    </Box>
  ) : null;
};

const WorkflowNotePreview = ({
  statusValue,
  note,
  label,
}: {
  statusValue?: WorkflowApproverStatusEnum | null;
  note: string;
  label: string;
}) => {
  const { t } = useTranslation();
  const { openModal } = useModalActions();
  const measureRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const action = getNoteAction(statusValue);

  useEffect(() => {
    const element = measureRef.current;
    if (!element) {
      return;
    }

    const checkTruncation = () => {
      setIsTruncated(
        element.clientWidth > 0 &&
          (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth)
      );
    };
    const observer = new ResizeObserver(checkTruncation);
    observer.observe(element);
    document.fonts?.addEventListener('loadingdone', checkTruncation);
    checkTruncation();

    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener('loadingdone', checkTruncation);
    };
  }, [label, note]);

  if (!action) {
    return null;
  }

  const viewLabel = t('label.requests.workflow.actionNote.viewFullText');
  const content = (
    <>
      <strong>{label}: </strong>
      {note.trim()}
    </>
  );

  return (
    <Box className={classes.note} data-action={action}>
      {/* Tam genişlikte ölçüm, aksiyonun kendi genişliği nedeniyle taşma üretmesini önler. */}
      <Text
        ref={measureRef}
        component="span"
        inherit
        lh="inherit"
        lineClamp={2}
        className={classes.noteMeasure}
        aria-hidden="true"
      >
        {content}
      </Text>
      <Text
        component="span"
        inherit
        lh="inherit"
        lineClamp={2}
        className={classes.noteText}
        data-truncated={isTruncated || undefined}
        data-view-label={isTruncated ? viewLabel : undefined}
      >
        {content}
      </Text>
      {isTruncated ? (
        <Button
          className={classes.noteAction}
          variant="transparent"
          color={`${getStatusColor(statusValue)}.9`}
          size="compact-xs"
          radius="xl"
          px={0}
          h="auto"
          type="button"
          aria-label={`${label}: ${viewLabel}`}
          aria-haspopup="dialog"
          data-testid={`workflow-${action}-note-view`}
          onClick={() => openModal('WorkflowActionNote', { action, note: note.trim() })}
        >
          {viewLabel}
        </Button>
      ) : null}
    </Box>
  );
};

const WorkflowStepHistoryPreview = ({
  step,
  entity,
  historyLabel,
  cancelNoteLabel,
  rejectNoteLabel,
  returnTargetByItemKey,
  returnTargetLabel,
}: Pick<
  ProgressStepCardProps,
  | 'step'
  | 'entity'
  | 'historyLabel'
  | 'cancelNoteLabel'
  | 'rejectNoteLabel'
  | 'returnTargetByItemKey'
  | 'returnTargetLabel'
>) => {
  const { t } = useTranslation();
  const { openModal } = useModalActions();
  const items = step.historyItems ?? EMPTY_TIMELINE_ITEMS;
  const recentItems = items.slice(-2).reverse();
  if (recentItems.length === 0) {
    return null;
  }

  return (
    <Box component="section" aria-label={historyLabel}>
      <Box className={classes.historyHeading}>
        <Box className={classes.historyHeadingLabel}>
          {historyLabel}{' '}
          {items.length > 2 ? (
            <Text component="span" inherit className={classes.historyCount}>
              ({t('label.requests.workflow.recentStepHistory', { count: recentItems.length })})
            </Text>
          ) : null}
        </Box>
        {items.length > 2 ? (
          <UnstyledButton
            className={classes.historyViewAll}
            onClick={() =>
              openModal('WorkflowStepHistory', {
                entity,
                stepName: step.name,
                items: items
                  .map((item) => ({
                    ...item,
                    returnTargetName: returnTargetByItemKey.get(item.key),
                  }))
                  .reverse(),
              })
            }
          >
            {t('label.requests.workflow.viewAllStepHistory', { count: items.length })}
          </UnstyledButton>
        ) : null}
      </Box>
      <Timeline
        role="list"
        active={recentItems.length - 1}
        bulletSize={12}
        lineWidth={1}
        classNames={HISTORY_TIMELINE_CLASS_NAMES}
      >
        {recentItems.map((item) => (
          <Timeline.Item
            key={item.key}
            role="listitem"
            color={getStatusColor(item.statusValue)}
            bullet={<WorkflowStatusIcon status={item.statusValue} />}
            title={<WorkflowActivityTitle item={item} />}
          >
            {item.statusValue === WorkflowApproverStatusEnum.Reject &&
            returnTargetByItemKey.has(item.key) ? (
              <Box className={classes.historyReturnSource}>
                <strong>{returnTargetLabel}: </strong>
                {returnTargetByItemKey.get(item.key)}
              </Box>
            ) : null}
            {getNoteAction(item.statusValue) && item.note?.trim() ? (
              <WorkflowNotePreview
                statusValue={item.statusValue}
                note={item.note}
                label={
                  item.statusValue === WorkflowApproverStatusEnum.Cancel
                    ? cancelNoteLabel
                    : rejectNoteLabel
                }
              />
            ) : null}
          </Timeline.Item>
        ))}
      </Timeline>
    </Box>
  );
};

type ProgressStepCardProps = {
  currentStepAction?: ReactNode;
  entity?: WorkflowEntityReference;
  approversLabel: string;
  cancelNoteLabel: string;
  currentStepRef?: RefObject<HTMLDivElement | null>;
  historyLabel: string;
  inProgressLabel: string;
  isExceeded: boolean;
  onApproverListOpenChange: (open: boolean) => void;
  rejectNoteLabel: string;
  incomingReturnLabel: string;
  returnSourceLabel: string;
  returnTargetByItemKey: ReadonlyMap<string, string>;
  returnTargetLabel: string;
  step: ProgressStep;
  upcomingLabel: string;
};

const ProgressStepCard = memo(
  ({
    entity,
    approversLabel,
    cancelNoteLabel,
    currentStepRef,
    currentStepAction,
    historyLabel,
    inProgressLabel,
    isExceeded,
    onApproverListOpenChange,
    rejectNoteLabel,
    incomingReturnLabel,
    returnSourceLabel,
    returnTargetByItemKey,
    returnTargetLabel,
    step,
    upcomingLabel,
  }: ProgressStepCardProps) => (
    <Box
      ref={currentStepRef}
      className={classes.step}
      data-exceeded={isExceeded || undefined}
      data-history={Boolean(step.historyItems?.length) || undefined}
      data-note={Boolean(getNoteAction(step.statusValue) && step.note?.trim()) || undefined}
      data-cancelled={step.statusValue === WorkflowApproverStatusEnum.Cancel || undefined}
      data-state={step.state}
    >
      <Box
        className={classes.dot}
        bg={step.state === 'done' ? getStatusColor(step.statusValue) : undefined}
        data-exceeded={isExceeded || undefined}
        data-state={step.state}
      />
      <Box className={classes.stepHead}>
        {step.statusLabel ? (
          <Badge
            color={step.statusColor}
            variant="light"
            size="xs"
            tt="none"
            leftSection={<WorkflowStatusIcon status={step.statusValue} />}
          >
            {step.statusLabel}
          </Badge>
        ) : step.state === 'upcoming' ? (
          <Badge
            color="gray"
            variant="light"
            size="xs"
            tt="none"
            leftSection={<IconClockHour4 size={11} stroke={2.2} />}
          >
            {upcomingLabel}
          </Badge>
        ) : step.state === 'current' ? (
          <Badge
            color={WORKFLOW_STATUS_COLORS.inProgress}
            variant="light"
            size="xs"
            tt="none"
            leftSection={<IconPencil size={11} stroke={2.2} />}
          >
            {inProgressLabel}
          </Badge>
        ) : null}
        {step.state === 'current' ? (
          <CurrentStepSla />
        ) : step.date ? (
          <Box className={classes.stepDate}>{step.date}</Box>
        ) : null}
      </Box>

      {step.card ? (
        <Box className={classes.person}>
          <CardContent
            card={step.card}
            onDropdownOpenChange={onApproverListOpenChange}
            pendingApproversTitle={approversLabel}
          />
        </Box>
      ) : step.personName ? (
        <Box className={classes.person}>
          <Avatar
            className={classes.personAvatar}
            radius="xl"
            size={26}
            src={getUserAvatarUrl(step.personCode)}
            variant="light"
          >
            <IconUser size={13} stroke={1.8} />
          </Avatar>
          <Box className={classes.personText}>
            <Box className={classes.personName} title={step.personName}>
              {step.personName}
            </Box>
            {step.personUnit ? (
              <Box className={classes.personUnit} title={step.personUnit}>
                {step.personUnit}
              </Box>
            ) : null}
          </Box>
        </Box>
      ) : null}

      <Box className={classes.stepNames}>
        <Box className={classes.stepName} title={step.name}>
          {step.name}
        </Box>
        {step.returnTargetName ? (
          <Box className={classes.returnTarget}>
            <IconArrowRight size={12} aria-hidden="true" />
            <Box className={classes.stepName} data-return-target title={step.returnTargetName}>
              {step.returnTargetName}
            </Box>
          </Box>
        ) : null}
      </Box>
      {getNoteAction(step.statusValue) && step.note?.trim() ? (
        <WorkflowNotePreview
          statusValue={step.statusValue}
          note={step.note}
          label={
            step.statusValue === WorkflowApproverStatusEnum.Cancel
              ? cancelNoteLabel
              : rejectNoteLabel
          }
        />
      ) : null}
      {step.incomingReturn ? (
        <Box className={classes.currentReturn} role="group" aria-label={incomingReturnLabel}>
          <Timeline
            role="list"
            active={0}
            bulletSize={12}
            lineWidth={1}
            classNames={HISTORY_TIMELINE_CLASS_NAMES}
          >
            <Timeline.Item
              role="listitem"
              color={getStatusColor(WorkflowApproverStatusEnum.Reject)}
              bullet={<WorkflowStatusIcon status={WorkflowApproverStatusEnum.Reject} />}
              title={
                <WorkflowActivityTitle
                  item={step.incomingReturn}
                  statusLabel={incomingReturnLabel}
                />
              }
            >
              <Box className={classes.historyReturnSource}>
                <strong>{returnSourceLabel}: </strong>
                {step.incomingReturn.stepDefinitionName}
              </Box>
              {step.incomingReturn.note?.trim() ? (
                <WorkflowNotePreview
                  statusValue={WorkflowApproverStatusEnum.Reject}
                  note={step.incomingReturn.note}
                  label={rejectNoteLabel}
                />
              ) : null}
            </Timeline.Item>
          </Timeline>
        </Box>
      ) : null}
      <WorkflowStepHistoryPreview
        entity={entity}
        step={step}
        historyLabel={historyLabel}
        cancelNoteLabel={cancelNoteLabel}
        rejectNoteLabel={rejectNoteLabel}
        returnTargetByItemKey={returnTargetByItemKey}
        returnTargetLabel={returnTargetLabel}
      />
      {step.state === 'current' ? currentStepAction : null}
    </Box>
  )
);

const CurrentStepCard = memo((props: Omit<ProgressStepCardProps, 'isExceeded'>) => {
  const isExceeded = useContext(SlaExceededContext);
  return <ProgressStepCard {...props} isExceeded={isExceeded} />;
});

/** Başlık ile sekmeler arasındaki ilerleme şeridi; üzerine gelince yatay akış kartlarına açılır */
const WorkflowStepProgressComponent = ({
  color = 'cyan',
  currentStepAction,
  entity,
  creatorCode,
  creatorName,
  creatorUnit,
  currentStepCode,
  currentStepTargetStartDate,
  currentStepTargetEndDate,
  currentStepId,
  currentStepName,
  currentStepOrder,
  stepDefinitions,
  timelineItems = EMPTY_TIMELINE_ITEMS,
  userIdentity = '',
  withSla = true,
  workflowStatus,
}: WorkflowStepProgressProps) => {
  const { t } = useTranslation();
  const currentCode = currentStepCode?.trim() ?? '';
  const isCompletionStep = COMPLETION_STEP_CODES.has(currentCode);
  const isCancelled = workflowStatus === WorkflowStatusEnum.Cancel;
  const isCompleted =
    !isCancelled && (isCompletedWorkflowStatus(workflowStatus) || isCompletionStep);
  const isTerminal = isTerminalWorkflowStatus(workflowStatus) || isCompleted;
  const isPinned = useWorkflowPreferencesStore(
    (state) => state.pinnedByUser[userIdentity] === true
  );
  const setPinned = useWorkflowPreferencesStore((state) => state.setPinned);
  const hasHandledInitialPin = useRef(false);

  const { steps, returnTargetByItemKey } = useMemo(() => {
    const isNotStarted = timelineItems.length === 0;
    // Yeni talepte adım kimliği yok; kullanıcı ilk adımı dolduruyor sayılır
    const isEntryStep =
      currentStepId == null ||
      currentStepId === WorkflowStep.IssueEntry ||
      currentStepId === OperationalWorkflowStep.OperationalIssueEntry;
    const currentTimelineItem = timelineItems.find(
      (item) => item.key === CURRENT_TIMELINE_ITEM_KEY
    );
    const suppliedCurrentName =
      currentStepName?.trim() ||
      currentTimelineItem?.stepDefinitionName?.trim() ||
      (isNotStarted && isEntryStep && !isCompletionStep ? t('label.requests.steps.enter') : '');
    const definitions = (stepDefinitions ?? [])
      .filter(
        (definition): definition is typeof definition & { Name: string; Order: number } =>
          Boolean(definition.Name?.trim()) && typeof definition.Order === 'number'
      )
      .sort((left, right) => left.Order - right.Order);
    const currentDefinition = definitions.find((definition) =>
      currentCode
        ? definition.Code?.trim() === currentCode
        : currentStepOrder != null
          ? definition.Order === currentStepOrder
          : normalizeStepName(definition.Name) === normalizeStepName(suppliedCurrentName)
    );
    const currentName = currentDefinition?.Name?.trim() || suppliedCurrentName;
    const resolvedCurrentOrder = currentStepOrder ?? currentDefinition?.Order;
    const cancelledItem = isCancelled
      ? timelineItems.find((item) => item.statusValue === WorkflowApproverStatusEnum.Cancel)
      : undefined;
    const cancelledNameKey = normalizeStepName(cancelledItem?.stepDefinitionName);
    const cancelledOrder =
      (cancelledItem
        ? definitions.find((definition) => normalizeStepName(definition.Name) === cancelledNameKey)
            ?.Order
        : undefined) ?? resolvedCurrentOrder;
    const currentNameKey = normalizeStepName(currentName);
    // Tamamlanma bir son durumdur; servis Order alanı olmadan da tek kez en sonda gösterilir.
    const completionDefinition = stepDefinitions?.find((definition) =>
      COMPLETION_STEP_CODES.has(definition.Code?.trim() ?? '')
    );
    const completionName =
      completionDefinition?.Name?.trim() ||
      (isCompletionStep ? suppliedCurrentName : '') ||
      t('label.statusCompleted');
    const completionNameKey = normalizeStepName(completionName);

    // İşlem geçmişi kronolojik kalır; kartların konumunu servis tanımları belirler.
    const historyByStepName = new Map<string, WorkflowTimelineItemModel[]>();
    const returnTargetByItemKey = new Map<string, string>();
    let incomingReturn: WorkflowTimelineItemModel | undefined;

    [...timelineItems].reverse().forEach((item, index, chronologicalItems) => {
      const isCurrentItem = item.key === CURRENT_TIMELINE_ITEM_KEY;
      const name =
        isCurrentItem && !isTerminal ? currentName : (item.stepDefinitionName?.trim() ?? '');
      const key = normalizeStepName(name);

      if (!key) {
        return;
      }

      const items = historyByStepName.get(key) ?? [];
      const previousItem = chronologicalItems[index - 1];
      const previousNameKey = normalizeStepName(previousItem?.stepDefinitionName);

      // Hedefi her iade için kaydet; gelen iadeyi yalnızca aktif adıma son geçişte göster.
      if (
        !(isTerminal && isCurrentItem) &&
        previousItem?.statusValue === WorkflowApproverStatusEnum.Reject &&
        previousNameKey &&
        previousNameKey !== key
      ) {
        returnTargetByItemKey.set(previousItem.key, name);
        if (isCurrentItem) {
          incomingReturn = previousItem;
        }
      }

      if (!isCurrentItem || isTerminal) {
        items.push(item);
      }

      if (items.length > 0) {
        historyByStepName.set(key, items);
      }
    });

    const currentHistoryItems = historyByStepName.get(currentNameKey) ?? [];
    const currentItem = currentTimelineItem ?? currentHistoryItems[currentHistoryItems.length - 1];
    const currentStep: ProgressStep | undefined =
      !isTerminal && currentName
        ? {
            // Akış başlamadığı için kayıt yok; adımı dolduran kişi talebi oluşturandır
            ...(isNotStarted
              ? {
                  personCode: creatorCode ?? undefined,
                  personName: creatorName ?? undefined,
                  personUnit: creatorUnit ?? undefined,
                }
              : getStepPerson(currentItem)),
            date: currentItem?.date,
            historyItems: currentHistoryItems,
            incomingReturn,
            key: CURRENT_TIMELINE_ITEM_KEY,
            name: currentName,
            state: 'current',
            statusColor: currentItem?.statusColor,
            statusLabel: currentItem?.statusLabel,
            statusValue: currentItem?.statusValue,
          }
        : undefined;

    const orderedSteps = Array.from(historyByStepName.entries()).map<ProgressStep>(
      ([key, items]) => {
        if (currentStep && key === currentNameKey) {
          return currentStep;
        }

        const latestItem = items[items.length - 1];

        return {
          ...getStepPerson(latestItem),
          date: latestItem.date,
          historyItems: items.slice(0, -1),
          key: `done-${key}`,
          name: latestItem.stepDefinitionName?.trim() || '-',
          note: latestItem.note,
          returnTargetName: returnTargetByItemKey.get(latestItem.key),
          state: 'done',
          statusColor: latestItem.statusColor,
          statusLabel: latestItem.statusLabel,
          statusValue: latestItem.statusValue,
        };
      }
    );

    if (currentStep && !historyByStepName.has(currentNameKey)) {
      orderedSteps.push(currentStep);
    }

    const remainingSteps = new Map(
      orderedSteps.map((step) => [normalizeStepName(step.name), step])
    );
    const definitionSteps: ProgressStep[] = [];

    for (const definition of definitions) {
      const name = definition.Name.trim();
      const key = normalizeStepName(name);
      const existingStep = remainingSteps.get(key);

      if (key === completionNameKey) {
        continue;
      }

      if (
        isCancelled &&
        (!existingStep || (cancelledOrder != null && definition.Order > cancelledOrder))
      ) {
        // Cancellation keeps the whole route visible without treating earlier visits as future approvals.
        definitionSteps.push({
          key: `inactive-${key}`,
          name,
          state: 'inactive',
          historyItems: historyByStepName.get(key),
          statusColor: 'gray',
          statusLabel: t('label.requests.workflow.notWaiting'),
          statusValue: WorkflowApproverStatusEnum.NotWaitingProcess,
        });
      } else if (
        !isTerminal &&
        resolvedCurrentOrder != null &&
        definition.Order > resolvedCurrentOrder
      ) {
        definitionSteps.push({
          key: `upcoming-${key}`,
          name,
          state: 'upcoming',
          historyItems: historyByStepName.get(key),
        });
      } else if (existingStep) {
        definitionSteps.push(existingStep);
      }

      remainingSteps.delete(key);
    }

    const existingCompletion = remainingSteps.get(completionNameKey);
    remainingSteps.delete(completionNameKey);

    // Eski tanımı listeden kaldırılmış olsa da gerçek işlem kayıtlarını kaybetme.
    const steps: ProgressStep[] = [
      ...definitionSteps,
      ...remainingSteps.values(),
      {
        ...(isCompleted ? existingCompletion : undefined),
        key: 'completion',
        name: completionName,
        state: isCompleted ? 'done' : isTerminal ? 'inactive' : 'upcoming',
        historyItems: isCompleted
          ? existingCompletion?.historyItems
          : historyByStepName.get(completionNameKey),
        statusColor: isCompleted
          ? WORKFLOW_STATUS_COLORS.completed
          : WORKFLOW_STATUS_COLORS.neutral,
        statusLabel: isCompleted
          ? t('label.statusCompleted')
          : isTerminal
            ? t('label.requests.workflow.notWaiting')
            : t('label.requests.workflow.stepUpcoming'),
        statusValue: isCompleted
          ? WorkflowApproverStatusEnum.Approved
          : isTerminal
            ? WorkflowApproverStatusEnum.NotWaitingProcess
            : WorkflowApproverStatusEnum.WaitingProcess,
      },
    ];

    return { steps, returnTargetByItemKey };
  }, [
    creatorCode,
    creatorName,
    creatorUnit,
    currentCode,
    currentStepId,
    currentStepName,
    currentStepOrder,
    isCancelled,
    isCompleted,
    isCompletionStep,
    isTerminal,
    stepDefinitions,
    t,
    timelineItems,
  ]);

  const currentStepIndex = isCancelled
    ? steps.findLastIndex((step) => step.statusValue === WorkflowApproverStatusEnum.Cancel)
    : steps.findIndex((step) => step.state === 'current');
  const hasCurrentStepAction =
    Boolean(currentStepAction) && steps[currentStepIndex]?.state === 'current';
  const currentStepPosition =
    currentStepIndex < 0
      ? steps.findLastIndex((step) => step.state === 'done') + 1
      : currentStepIndex + 1;
  const flowViewportRef = useRef<HTMLDivElement>(null);
  const currentStepRef = useRef<HTMLDivElement>(null);
  // Onaycı listesi portalda açıldığı için şeridin hover'ı kopar; şerit bu durumda açık tutulur
  const [isApproverListOpen, setIsApproverListOpen] = useState(false);

  // Şerit açıldığında bulunulan adım görünür alanın ortasına kaydırılır
  const centerCurrentStep = useCallback((behavior: ScrollBehavior) => {
    const viewport = flowViewportRef.current;
    const currentStep = currentStepRef.current;

    if (!viewport || !currentStep) {
      return;
    }

    viewport.scrollTo({
      behavior,
      left: Math.max(
        currentStep.offsetLeft - (viewport.clientWidth - currentStep.clientWidth) / 2,
        0
      ),
    });
  }, []);

  // Auto-pin once per drawer opening; a manual choice must not be overwritten on refresh.
  useEffect(() => {
    if (!hasCurrentStepAction || !userIdentity || hasHandledInitialPin.current) {
      return;
    }
    hasHandledInitialPin.current = true;
    setPinned(userIdentity, true);
  }, [hasCurrentStepAction, userIdentity, setPinned]);

  // Position before paint on data changes; only user-driven opening scrolls smoothly.
  useLayoutEffect(() => {
    if (isPinned) {
      centerCurrentStep('instant');
    }
  }, [isPinned, currentStepIndex, steps.length, centerCurrentStep]);

  if (steps.length === 0) {
    return null;
  }

  const content = (
    <Box
      className={classes.band}
      style={(theme) => ({
        '--workflow-progress-light': getThemeColor(`${color}.1`, theme),
        '--workflow-progress-muted': getThemeColor(`${color}.4`, theme),
        '--workflow-progress-active': getThemeColor(`${color}.8`, theme),
        '--workflow-progress-text': getThemeColor(`${color}.9`, theme),
        '--workflow-returned-color': getThemeColor(`${WORKFLOW_STATUS_COLORS.returned}.6`, theme),
        '--workflow-returned-light': getThemeColor(`${WORKFLOW_STATUS_COLORS.returned}.1`, theme),
        '--workflow-returned-text': getThemeColor(`${WORKFLOW_STATUS_COLORS.returned}.9`, theme),
        '--workflow-canceled-color': getThemeColor(`${WORKFLOW_STATUS_COLORS.canceled}.6`, theme),
        '--workflow-canceled-text': getThemeColor(`${WORKFLOW_STATUS_COLORS.canceled}.9`, theme),
      })}
      data-expanded={isPinned || isApproverListOpen || undefined}
      data-pinned={isPinned || undefined}
      data-testid="workflow-step-progress"
      onFocus={
        isPinned
          ? undefined
          : (event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                centerCurrentStep('smooth');
              }
            }
      }
      onMouseEnter={isPinned ? undefined : () => centerCurrentStep('smooth')}
    >
      <Box className={classes.progressControls}>
        <Box
          className={classes.trigger}
          aria-label={t('label.requests.workflow.stepProgressAria', {
            current: currentStepPosition,
            total: steps.length,
          })}
          role="img"
          tabIndex={0}
        >
          <Box component="span" className={classes.count}>
            {currentStepPosition}/{steps.length}
          </Box>
          <Box className={classes.track}>
            {steps.map((step) =>
              step.state === 'current' ? (
                <CurrentStepSegment
                  key={`segment-${step.key}`}
                  name={step.name}
                  statusLabel={step.statusLabel || t('label.requests.workflow.stepInProgress')}
                />
              ) : (
                <Tooltip
                  key={`segment-${step.key}`}
                  label={
                    <StepTooltipContent
                      name={step.name}
                      statusLabel={
                        step.state === 'upcoming'
                          ? t('label.requests.workflow.stepUpcoming')
                          : step.statusLabel
                      }
                    />
                  }
                  multiline
                  maw="min(280px, calc(100vw - 32px))"
                  withArrow
                  openDelay={200}
                >
                  <Box
                    className={classes.segment}
                    data-cancelled={
                      step.statusValue === WorkflowApproverStatusEnum.Cancel || undefined
                    }
                    data-returned={
                      step.statusValue === WorkflowApproverStatusEnum.Reject || undefined
                    }
                    data-state={step.state}
                  />
                </Tooltip>
              )
            )}
          </Box>
        </Box>

        {userIdentity ? (
          <Box className={classes.pinControl}>
            <ToolbarActionIcon
              active={isPinned}
              indicatorColor={`${color}.8`}
              className={classes.pinButton}
              color="gray.7"
              variant="light"
              icon={
                isPinned ? (
                  <IconPinnedOff size={16} stroke={1.5} />
                ) : (
                  <IconPin size={16} stroke={1.5} />
                )
              }
              label={t(isPinned ? 'label.requests.workflow.unpin' : 'label.requests.workflow.pin')}
              type="button"
              size={24}
              aria-pressed={isPinned}
              onClick={(event) => {
                hasHandledInitialPin.current = true;
                setPinned(userIdentity, !isPinned);
                if (isPinned && event.detail > 0) {
                  event.currentTarget.blur();
                }
              }}
            />
          </Box>
        ) : null}
      </Box>

      <Box className={classes.detail}>
        <Box className={classes.detailContent}>
          <ScrollArea
            classNames={{
              root: classes.flowScroll,
              scrollbar: classes.flowScrollbar,
              thumb: classes.flowThumb,
            }}
            scrollbarSize={8}
            scrollbars="x"
            type="always"
            viewportRef={flowViewportRef}
          >
            <Box className={classes.flow}>
              {steps.map((step, index) => {
                const cardProps = {
                  entity,
                  approversLabel: t('label.requests.workflow.approvers'),
                  cancelNoteLabel: t('label.requests.workflow.actionNote.cancelNoteLabel'),
                  currentStepRef: index === currentStepIndex ? currentStepRef : undefined,
                  historyLabel: t('label.requests.workflow.stepHistory'),
                  inProgressLabel: t('label.requests.workflow.stepInProgress'),
                  onApproverListOpenChange: setIsApproverListOpen,
                  rejectNoteLabel: t('label.requests.workflow.actionNote.rejectNoteLabel'),
                  incomingReturnLabel: t('label.requests.workflow.incomingReturn'),
                  returnSourceLabel: t('label.requests.workflow.returnSourceStep'),
                  returnTargetByItemKey,
                  returnTargetLabel: t('label.requests.workflow.returnTargetStep'),
                  step,
                  upcomingLabel: t('label.requests.workflow.stepUpcoming'),
                };

                return step.state === 'current' ? (
                  <CurrentStepCard
                    key={step.key}
                    {...cardProps}
                    currentStepAction={currentStepAction}
                  />
                ) : (
                  <ProgressStepCard key={step.key} {...cardProps} isExceeded={false} />
                );
              })}
            </Box>
          </ScrollArea>
        </Box>
      </Box>
    </Box>
  );

  // Callers can opt out of mounting SLA queries and timers.
  return withSla ? (
    <WorkflowSlaClock
      targetStartDate={currentStepTargetStartDate}
      targetEndDate={currentStepTargetEndDate}
      enabled={!isTerminal}
    >
      {content}
    </WorkflowSlaClock>
  ) : (
    content
  );
};

export const WorkflowStepProgress = memo(WorkflowStepProgressComponent);
