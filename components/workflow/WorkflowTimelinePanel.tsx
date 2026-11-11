import type { ReactNode } from 'react';
import classes from './WorkflowTimelinePanel.module.scss';
import {
  IconArrowBackUp,
  IconCheck,
  IconClockHour4,
  IconNotes,
  IconPlayerPause,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Badge,
  Box,
  Center,
  Group,
  ScrollArea,
  Text,
  ThemeIcon,
  Timeline,
  Tooltip,
} from '@mantine/core';
import { WORKFLOW_STATUS_COLORS } from '@/_common/workflow/colors';
import {
  WorkflowApproverStatusEnum,
  type WorkflowTimelineItemModel,
} from '@/_hooks/_modules/workflow/workflow-view-model.types';
import { View } from '@/components/display/View';
import { useModal } from '@/components/modal-host/_hook/useModal';
import { CardContent } from './cards';

type WorkflowTimelinePanelProps = {
  emptyText?: string;
  items: WorkflowTimelineItemModel[];
  onClose: () => void;
  renderItemMeta?: (item: WorkflowTimelineItemModel) => ReactNode;
  title: string;
};

const getStatusIcon = (status?: WorkflowApproverStatusEnum | null) => {
  switch (status) {
    case WorkflowApproverStatusEnum.Approved:
      return (
        <ThemeIcon size={25} radius="sm" variant="filled" bg={WORKFLOW_STATUS_COLORS.completed}>
          <IconCheck
            color={`var(--mantine-color-${WORKFLOW_STATUS_COLORS.completed}-1)`}
            size={10}
          />
        </ThemeIcon>
      );
    case WorkflowApproverStatusEnum.Reject:
      return (
        <ThemeIcon size={25} radius="sm" variant="filled" bg={WORKFLOW_STATUS_COLORS.returned}>
          <IconArrowBackUp
            color={`var(--mantine-color-${WORKFLOW_STATUS_COLORS.returned}-1)`}
            size={10}
          />
        </ThemeIcon>
      );
    case WorkflowApproverStatusEnum.Cancel:
      return (
        <ThemeIcon size={25} radius="sm" variant="filled" bg={WORKFLOW_STATUS_COLORS.canceled}>
          <IconX color={`var(--mantine-color-${WORKFLOW_STATUS_COLORS.canceled}-1)`} size={10} />
        </ThemeIcon>
      );
    case WorkflowApproverStatusEnum.NotWaitingProcess:
      return (
        <ThemeIcon size={25} radius="sm" variant="filled" bg="gray">
          <IconPlayerPause color="var(--mantine-color-gray-1)" size={10} />
        </ThemeIcon>
      );
    case WorkflowApproverStatusEnum.WaitingProcess:
    default:
      return (
        <ThemeIcon size={25} radius="sm" variant="filled" bg="gray.3">
          <IconClockHour4 color="var(--mantine-color-gray-9)" size={10} />
        </ThemeIcon>
      );
  }
};

const getNoteAction = (status?: WorkflowApproverStatusEnum | null) => {
  if (status === WorkflowApproverStatusEnum.Cancel) {
    return 'cancel';
  }

  if (status === WorkflowApproverStatusEnum.Reject) {
    return 'reject';
  }

  return null;
};

export const WorkflowTimelinePanel = ({
  emptyText,
  items,
  onClose,
  renderItemMeta,
  title,
}: WorkflowTimelinePanelProps) => {
  const { t } = useTranslation();
  const { openModal } = useModal();

  return (
    <Box className={classes.panel}>
      <Box className={classes.panelHeader}>
        <Text size="sm" fw={700}>
          {title}
        </Text>
        <ActionIcon
          aria-label={t('label.requests.workflow.closeTimeline')}
          variant="subtle"
          color="gray"
          onClick={onClose}
        >
          <IconX size={16} />
        </ActionIcon>
      </Box>

      <ScrollArea className={classes.timelineScroll}>
        {items.length ? (
          <Timeline radius="sm" active={0} color="gray" lineWidth={1} bulletSize={25}>
            {items.map((item) => {
              const noteAction = getNoteAction(item.statusValue);
              const noteLabel = noteAction
                ? t(`label.requests.workflow.actionNote.${noteAction}ViewTitle`)
                : undefined;

              return (
                <Timeline.Item key={item.key} bullet={getStatusIcon(item.statusValue)}>
                  <Box className={classes.itemCard}>
                    <Box className={classes.itemMeta}>
                      <Group gap={2}>
                        {item.note?.trim() && noteAction ? (
                          <Tooltip label={noteLabel} withArrow position="bottom">
                            <ActionIcon
                              aria-label={noteLabel}
                              variant="light"
                              color={item.statusColor}
                              size="sm"
                              radius="xl"
                              onClick={() => {
                                if (!item.note?.trim()) {
                                  return;
                                }

                                openModal('WorkflowActionNote', {
                                  action: noteAction,
                                  note: item.note,
                                });
                              }}
                            >
                              <IconNotes size={14} />
                            </ActionIcon>
                          </Tooltip>
                        ) : null}

                        <Badge variant="light" size="xs" color={item.statusColor}>
                          {item.statusLabel}
                        </Badge>
                      </Group>

                      {item.date ? (
                        <Text size="10px" c="dimmed" fw={600}>
                          {item.date}
                        </Text>
                      ) : null}
                      {renderItemMeta?.(item)}
                    </Box>

                    <Box className={classes.cardRow}>
                      <CardContent card={item.card} />
                    </Box>

                    <View show={item.stepDefinitionName !== null && item.card.kind === 'person'}>
                      <Box className={classes.cardRow}>
                        <Badge variant="dot" size="xs" color={item.statusColor}>
                          {item.stepDefinitionName}
                        </Badge>
                      </Box>
                    </View>
                  </Box>
                </Timeline.Item>
              );
            })}
          </Timeline>
        ) : (
          <Center h={160}>
            <Text size="sm" c="dimmed">
              {emptyText ?? t('label.requests.workflow.stepsEmpty')}
            </Text>
          </Center>
        )}
      </ScrollArea>
    </Box>
  );
};
