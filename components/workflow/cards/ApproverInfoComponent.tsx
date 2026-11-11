import { IconChevronDown, IconUser } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  ActionIcon,
  Avatar,
  Box,
  Divider,
  Flex,
  Group,
  Menu,
  ScrollArea,
  Text,
} from '@mantine/core';
import { InformationApprover } from '@/_api/_core/api-gen/types';
import { dropdownScrollAreaProps } from '@/_common/_props/scroll-area';
import { getUserAvatarUrl } from '@/_helpers/user/avatar';
import { MenuItem } from '@/components/display/Buttons/DropdownButton/MenuItem';

const getApproverDisplayName = (approver?: InformationApprover | null) =>
  approver?.User?.FullName?.trim() || approver?.User?.Code || '-';

type ApproverInfoProps = {
  approver: InformationApprover;
  dropdownApprovers?: InformationApprover[];
  approversLabel?: string;
};

export const ApproverInfo = ({
  approver,
  dropdownApprovers = [],
  approversLabel,
}: ApproverInfoProps) => {
  const { t } = useTranslation();

  return (
    <Box w="100%" miw={0} maw="100%" style={{ overflow: 'hidden' }}>
      <Flex align="center" gap="xs" wrap="nowrap" w="100%" miw={0}>
        <Avatar
          variant="light"
          radius="md"
          c="gray.5"
          size="sm"
          src={getUserAvatarUrl(approver.User?.Code)}
        >
          <IconUser size="12px" />
        </Avatar>
        <Box style={{ flex: '1 1 0', minWidth: 0, overflow: 'hidden' }}>
          <Text component="div" fw={700} c="blue.9" size="xs" truncate maw={240}>
            {getApproverDisplayName(approver)}
          </Text>
          <Text component="div" c="gray" size="10px" truncate maw={240}>
            {approver?.UnitName}
          </Text>
        </Box>
        {dropdownApprovers.length > 0 ? (
          <Menu width={230} position="bottom-end" arrowOffset={30} withinPortal zIndex={4000}>
            <Menu.Target>
              <ActionIcon size="sm" variant="subtle" color="gray.6" style={{ flex: '0 0 auto' }}>
                <IconChevronDown size="15px" stroke={2} color="var(--mantine-color-gray-8)" />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown p={0} pt="md">
              <Box>
                <Group justify="space-between" align="center" px="md">
                  <Text size="xs" fw={700} c="gray.7">
                    {approversLabel ?? t('label.requests.workflow.approvers')}
                  </Text>
                </Group>
                <Divider color="gray.2" mb={0} />
                <ScrollArea.Autosize {...dropdownScrollAreaProps} mah={320} scrollbars="y" w="100%">
                  <Box>
                    {dropdownApprovers.map((approver) => (
                      <MenuItem
                        key={`current-other-${approver.Id || approver.User?.Code || approver.User?.FullName}`}
                        label={<ApproverInfo approver={approver} approversLabel={approversLabel} />}
                        closeMenuOnClick={false}
                        styles={{ item: { cursor: 'auto' } }}
                      />
                    ))}
                  </Box>
                </ScrollArea.Autosize>
              </Box>
            </Menu.Dropdown>
          </Menu>
        ) : null}
      </Flex>
    </Box>
  );
};

export default ApproverInfo;
