import { ReactNode } from 'react';
import classes from './card.module.scss';
import { Badge, Box, Center, Flex, Paper, Stack, Text } from '@mantine/core';
import { InformationApprover } from '@/_api/_core/api-gen/types';
import { getDateParse } from '@/_helpers/date';
import type { WorkflowStatusPresentation } from '@/_hooks/_modules/workflow/workflow-view-model.types';
import { View } from '@/components/display/View';
import { ApproverInfo } from './ApproverInfoComponent';

export type CardProps = {
  cardKey: string;
  mode: 'current' | 'history';
  approvers: InformationApprover[];
  emptyText: string;
  status?: WorkflowStatusPresentation;
  currentApprover?: InformationApprover | null;
  actions?: ReactNode;
  animate?: boolean;
  approversLabel: string;
  otherApproversLabel: string;
};

const WORKFLOW_CAR_WIDTH = 180;
const WORKFLOW_ACTION_CARD_WIDTH = 390;
export const Card = ({
  cardKey,
  mode,
  approvers,
  emptyText,
  status,
  currentApprover = null,
  actions,
  animate = false,
  approversLabel,
  otherApproversLabel,
}: CardProps) => {
  const primaryApprovers =
    mode === 'current' ? (currentApprover ? [currentApprover] : approvers.slice(0, 1)) : approvers;
  const dropdownApprovers =
    mode === 'current'
      ? currentApprover
        ? approvers.filter((approver) => approver.Id !== currentApprover.Id)
        : approvers.slice(1)
      : [];
  const cardWidth = actions ? WORKFLOW_ACTION_CARD_WIDTH : WORKFLOW_CAR_WIDTH;
  const statusDate = primaryApprovers.find((approver) => approver.Updated?.At)?.Updated?.At;

  return (
    <Paper
      className={animate ? classes.animatedCard : undefined}
      withBorder={false}
      radius="lg"
      p="sm"
      pl="md"
      w={cardWidth}
      miw={cardWidth}
      maw={cardWidth}
      style={{ overflow: 'hidden', position: 'relative', opacity: actions ? 1 : 0.5 }}
    >
      <View show={!currentApprover}>
        <Box pos="absolute" inset={0} w={4} h="100%" bg={status?.color} />
      </View>
      <Stack justify="space-between" align="stretch" gap="xs" h="100%">
        <View show={Boolean(status)}>
          <Center style={{ gap: 'var(--mantine-spacing-xs)' }}>
            <Badge variant="light" size="xs" color={status?.color}>
              {status?.label}
            </Badge>
            {statusDate ? (
              <Text size="10px" c="dimmed" fw={600} lh={1}>
                {getDateParse(Number(statusDate)).date}
              </Text>
            ) : null}
          </Center>
        </View>

        <Flex align="center" justify="space-between" gap="sm" direction="row" miw={0}>
          {primaryApprovers.length ? (
            <Stack align="stretch" gap="xs" w="100%" miw={0} style={{ overflow: 'hidden' }}>
              {primaryApprovers.map((approver) => (
                <ApproverInfo
                  key={`${cardKey}-${approver.Id || approver.User?.Code || approver.User?.FullName}`}
                  approver={approver}
                  approversLabel={dropdownApprovers.length ? otherApproversLabel : approversLabel}
                  dropdownApprovers={dropdownApprovers}
                />
              ))}
            </Stack>
          ) : dropdownApprovers.length ? null : (
            <Text ta="center" c="dimmed">
              {emptyText}
            </Text>
          )}

          <View show={Boolean(actions)}>
            <Center miw={0} style={{ flex: '0 0 auto' }}>
              {actions}
            </Center>
          </View>
        </Flex>
      </Stack>
    </Paper>
  );
};

export default Card;
