import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Center, Group, Text } from '@mantine/core';

export const SavedFilterCombinationHint = ({ inTooltip = false }: { inTooltip?: boolean }) => {
  const { t } = useTranslation();

  return (
    <Group align="flex-start" gap={6} wrap="nowrap" c={inTooltip ? 'inherit' : 'gray.6'}>
      <Center h="calc(var(--mantine-font-size-xs) * 1.35)" flex="0 0 auto">
        <IconInfoCircle aria-hidden size={14} stroke={1.6} />
      </Center>
      <Text c="inherit" size="xs" fw={400} lh={1.35} miw={0}>
        {t('label.requests.list.filters.combinedResults')}
      </Text>
    </Group>
  );
};
