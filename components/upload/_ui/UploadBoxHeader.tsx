import { FC, memo, useMemo } from 'react';
import { IconCheck, IconChevronDown, IconChevronUp, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Box, Center, RingProgress, Text } from '@mantine/core';
import { iconProps_ddMenu } from '@/_common/_props/icon';
import classes from '@/components/upload/_ui/_style/style.module.scss';
import { UploadAggregates } from '@/components/upload/engine/types';

interface Props {
  aggregates: UploadAggregates;
  opened: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export const UploadBoxHeader: FC<Props> = memo(({ aggregates, opened, onToggle, onClose }) => {
  const { t } = useTranslation();
  const tr = t as unknown as (key: string, params?: Record<string, unknown>) => string;
  const HeadChevronIcon = opened ? IconChevronDown : IconChevronUp;

  const completedCount = aggregates.success;

  const roundedProgress = useMemo(
    () => Math.round(aggregates.progress / 2) * 2,
    [aggregates.progress]
  );

  // Show success only when all files succeeded (no errors/cancels) and progress is 100%
  const isFullSuccess = useMemo(
    () =>
      aggregates.allDone &&
      aggregates.error === 0 &&
      aggregates.canceled === 0 &&
      aggregates.progress === 100,
    [aggregates.allDone, aggregates.error, aggregates.canceled, aggregates.progress]
  );

  const ringProgressSections = useMemo(
    () => [
      {
        value: roundedProgress,
        color: isFullSuccess ? 'green' : aggregates.anyError ? 'red' : 'blue',
      },
    ],
    [roundedProgress, isFullSuccess, aggregates.anyError]
  );

  const ringProgressLabel = useMemo(
    () =>
      isFullSuccess ? (
        <Center>
          <ActionIcon color="green" size="xl" radius="xl" variant="light">
            <IconCheck size={22} />
          </ActionIcon>
        </Center>
      ) : null,
    [isFullSuccess]
  );

  return (
    <Box className={classes.head}>
      <Box className={classes.headRingProgress}>
        <RingProgress
          size={45}
          thickness={5}
          roundCaps
          sections={ringProgressSections}
          label={ringProgressLabel}
        />
      </Box>

      <Box className={classes.headInfo}>
        <Box>
          <Text fw={600}>
            {tr('label.message.upload.status.uploadingItems', { count: aggregates.total })}
          </Text>
          <Text size="sm" c="dimmed">
            {tr('label.message.upload.status.completedOf', {
              completed: completedCount,
              total: aggregates.total,
            })}
          </Text>
        </Box>
      </Box>

      <Box className={classes.headActions}>
        <ActionIcon onClick={onToggle}>
          <HeadChevronIcon
            stroke={2}
            size="14px"
            color="var(--mantine-color-gray-7)"
            {...iconProps_ddMenu}
          />
        </ActionIcon>

        <ActionIcon onClick={onClose}>
          <IconX size="14px" color="var(--mantine-color-gray-7)" {...iconProps_ddMenu} />
        </ActionIcon>
      </Box>
    </Box>
  );
});
