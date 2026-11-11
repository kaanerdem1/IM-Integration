import { IconInfoCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Badge, Group, Text, Tooltip } from '@mantine/core';
import type { SavedRequestFilterGroup } from '../_utils/groupSavedRequestFilters';
import { RequestFilterScopeTooltipLabel } from '../RequestFilterScopeTooltipLabel';

type SavedFilterGroupLabelProps = Pick<SavedRequestFilterGroup, 'scope' | 'labelKey'> & {
  count: number;
  selectedCount: number;
};

export const SavedFilterGroupLabel = ({
  scope,
  labelKey,
  count,
  selectedCount,
}: SavedFilterGroupLabelProps) => {
  const { t } = useTranslation();

  return (
    <Group component="span" gap={6} wrap="nowrap" flex={1} miw={0} data-saved-filter-scope={scope}>
      <Tooltip
        label={<RequestFilterScopeTooltipLabel scope={scope} />}
        multiline
        maw={260}
        withArrow
      >
        <Group component="span" gap={4} wrap="nowrap" miw={0}>
          <Text component="span" size="xs" fw={500} c="gray.7" truncate>
            {t(labelKey)}
          </Text>
          <IconInfoCircle size={12} aria-hidden style={{ flexShrink: 0 }} />
        </Group>
      </Tooltip>
      <Group component="span" gap={4} wrap="nowrap" ml="auto" style={{ flexShrink: 0 }}>
        {selectedCount > 0 && (
          <Badge
            component="span"
            size="xs"
            radius="sm"
            color="cyan"
            variant="light"
            tt="none"
            fw={500}
          >
            {t('label.requests.list.filters.groupSelectedCount', { count: selectedCount })}
          </Badge>
        )}
        <Badge
          component="span"
          size="xs"
          radius="sm"
          color="gray"
          variant="light"
          tt="none"
          fw={500}
        >
          {t('label.requests.list.filters.groupFilterCount', { count })}
        </Badge>
      </Group>
    </Group>
  );
};
