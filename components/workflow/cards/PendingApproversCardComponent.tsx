import classes from './content.module.scss';
import { IconChevronDown, IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Box, Group, Menu, ScrollArea, Text, ThemeIcon } from '@mantine/core';
import { dropdownScrollAreaProps } from '@/_common/_props/scroll-area';
import type { WorkflowPendingApproversCardModel } from '@/_hooks/_modules/workflow/workflow-view-model.types';
import { isSystemWorkflowApprover } from '@/_hooks/_modules/workflow/workflow-view-model.utils';
import { ApproverInfo } from './ApproverInfoComponent';

type PendingApproversCardProps = {
  card: WorkflowPendingApproversCardModel;
  /** Liste portala taşındığı için açılma durumunu dışarı bildirir */
  onDropdownOpenChange?: (opened: boolean) => void;
  title?: string;
};

const SystemApproverNotice = () => {
  const { t } = useTranslation();

  return (
    <Box className={classes.systemApproverNotice}>
      <ThemeIcon variant="light" color="gray.3" size="sm">
        <IconInfoCircle size={14} stroke={1} />
      </ThemeIcon>
      <Box className={classes.systemApproverNoticeContent}>
        <Text size="xs" fw={700} c="gray.8">
          {t('label.requests.workflow.systemApproverMissingTitle')}
        </Text>
        <Text size="11px" c="gray.7" mt={4}>
          {t('label.requests.workflow.systemApproverMissingDescription')}
        </Text>
      </Box>
    </Box>
  );
};

export const PendingApproversCard = ({
  card,
  onDropdownOpenChange,
  title,
}: PendingApproversCardProps) => {
  const hasDropdown = card.approvers.length > 0;
  const hasSystemApprover = card.approvers.some(isSystemWorkflowApprover);
  const content = (
    <Group wrap="nowrap" gap="xs" className={classes.pendingCard}>
      <Box className={classes.meta}>
        <Text size="xs" fw={700} c="blue.9" truncate>
          {title ?? card.title}
        </Text>
        <Text size="10px" c="gray.7" truncate>
          {card.subtitle}
        </Text>
      </Box>
      {hasDropdown ? (
        <ActionIcon variant="subtle" color="gray" size="sm">
          <IconChevronDown size={14} />
        </ActionIcon>
      ) : null}
    </Group>
  );

  if (!hasDropdown) {
    return content;
  }

  return (
    <Menu width={280} position="bottom-start" shadow="md" onChange={onDropdownOpenChange}>
      <Menu.Target>{content}</Menu.Target>
      <Menu.Dropdown p={0} className={classes.dropdown}>
        <ScrollArea.Autosize {...dropdownScrollAreaProps} mah={320} scrollbars="y" w="100%">
          {hasSystemApprover ? (
            <SystemApproverNotice />
          ) : (
            card.approvers.map((approver) => (
              <div
                key={approver.Id || approver.User?.Code || approver.User?.FullName}
                className={classes.dropdownItem}
              >
                <ApproverInfo approver={approver} />
              </div>
            ))
          )}
        </ScrollArea.Autosize>
      </Menu.Dropdown>
    </Menu>
  );
};
