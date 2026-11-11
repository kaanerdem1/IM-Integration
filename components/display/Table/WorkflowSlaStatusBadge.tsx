import { useTranslation } from 'react-i18next';
import { Badge, Box, Divider, Indicator, Stack, Tooltip, UnstyledButton } from '@mantine/core';
import type { IssueSlaStatusEnum } from '@/_api/_core/api-gen/types';
import {
  slaHistoryCounterStyle,
  slaStatusKeyByStatus,
  slaStatusLabelKeys,
  slaStatusPresentations,
  type SlaStatusKey,
} from '@/_helpers/sla';

type Props = {
  status?: IssueSlaStatusEnum | SlaStatusKey | null;
  fallbackLabel?: string | null;
  lateStepCount?: number;
  onOpenHistory?: () => void;
};

const lateStepIndicatorStyles = {
  indicator: {
    ...slaHistoryCounterStyle,
    fontSize: 9,
    fontWeight: 600,
    lineHeight: 1,
    paddingInline: 2,
    borderWidth: 1,
  },
};

export const WorkflowSlaStatusBadge = ({
  status,
  fallbackLabel,
  lateStepCount = 0,
  onOpenHistory,
}: Props) => {
  const { t } = useTranslation();
  const statusKey = typeof status === 'number' ? slaStatusKeyByStatus[status] : status;

  if (status === null || (!statusKey && !fallbackLabel)) {
    return null;
  }

  const label = statusKey ? t(slaStatusLabelKeys[statusKey]) : fallbackLabel || '-';
  const description = statusKey ? t(`label.sla.statusDescriptions.${statusKey}`) : undefined;
  const historyDescription =
    onOpenHistory && lateStepCount > 0
      ? t('label.requests.list.lateStepCountTooltip', { count: lateStepCount })
      : undefined;
  const historyActionHint = onOpenHistory
    ? t('label.reports.list.workflowDetailsOpenHint')
    : undefined;
  const badge = (
    <Badge
      data-testid="workflow-sla-status"
      {...(statusKey ? slaStatusPresentations[statusKey].badgeProps : { color: 'gray' })}
      variant="light"
      size="xs"
      styles={onOpenHistory ? { root: { cursor: 'pointer' } } : undefined}
      tabIndex={onOpenHistory ? undefined : 0}
    >
      {label}
    </Badge>
  );

  return (
    <Tooltip
      label={
        onOpenHistory ? (
          <Stack gap={6}>
            <div data-testid="workflow-history-tooltip-info">
              <div>{description || label}</div>
              {historyDescription ? <div>{historyDescription}</div> : null}
            </div>
            <Divider color="currentColor" opacity={0.25} />
            <Box fw={500} data-testid="workflow-history-tooltip-action">
              {historyActionHint}
            </Box>
          </Stack>
        ) : (
          description || label
        )
      }
      events={{ hover: true, focus: true, touch: false }}
      multiline
      maw={320}
      withArrow
    >
      {onOpenHistory ? (
        <UnstyledButton
          type="button"
          data-testid="workflow-history-action"
          aria-label={[`${label}.`, historyDescription, historyActionHint]
            .filter(Boolean)
            .join(' ')}
          display="inline-flex"
          style={{ verticalAlign: 'middle' }}
          onClick={(event) => {
            event.stopPropagation();
            onOpenHistory();
          }}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <Indicator
            inline
            display="inline-flex"
            disabled={!(lateStepCount > 0)}
            zIndex={1}
            color={slaHistoryCounterStyle.backgroundColor}
            size={12}
            offset={1}
            withBorder
            styles={lateStepIndicatorStyles}
            label={
              <span data-testid="workflow-history-late-step-count" aria-hidden="true">
                {lateStepCount}
              </span>
            }
          >
            {badge}
          </Indicator>
        </UnstyledButton>
      ) : (
        badge
      )}
    </Tooltip>
  );
};
