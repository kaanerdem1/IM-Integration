import { useTranslation } from 'react-i18next';
import { Divider, Stack, Text } from '@mantine/core';
import type { RequestFilterMenuOption } from '../_types';
import { SavedFilterCombinationHint } from './SavedFilterCombinationHint';

type SavedFilterMenuTooltipLabelProps = {
  selectedFilterDescription?: string | null;
  selectedFilterName?: string;
  selectedFilters?: readonly RequestFilterMenuOption[];
};

export const SavedFilterMenuTooltipLabel = ({
  selectedFilterDescription,
  selectedFilterName,
  selectedFilters,
}: SavedFilterMenuTooltipLabelProps) => {
  const { t } = useTranslation();
  if (selectedFilters && selectedFilters.length > 1) {
    return (
      <Stack gap={4} style={{ overflowWrap: 'anywhere' }}>
        <Text c="inherit" fw={700} size="xs">
          {t('label.home.savedFilterMenuTooltip')}
        </Text>
        <Text c="inherit" fw={700} size="xs">
          {t('label.home.savedFilterMenuSelectedPlural', { count: selectedFilters.length })}
        </Text>
        <Stack component="ul" gap={6} m={0} pl="md">
          {selectedFilters.map((filter) => (
            <Text component="li" key={filter.Id} c="inherit" size="xs" fw={400}>
              {filter.Name}
              {filter.Description?.trim() && (
                <Text component="div" c="inherit" size="xs">
                  <Text component="strong" inherit fw={600}>
                    {t('label.description')}:
                  </Text>{' '}
                  {filter.Description.trim()}
                </Text>
              )}
            </Text>
          ))}
        </Stack>
        <Divider opacity={0.3} my={2} />
        <SavedFilterCombinationHint inTooltip />
      </Stack>
    );
  }
  const name = selectedFilters?.[0]?.Name ?? selectedFilterName;
  const description = (selectedFilters?.[0]?.Description ?? selectedFilterDescription)?.trim();

  return (
    <Stack gap={4} style={{ overflowWrap: 'anywhere' }}>
      <Text c="inherit" fw={700} size="xs">
        {t('label.home.savedFilterMenuTooltip')}
      </Text>
      {name && (
        <Text c="inherit" fw={400} size="xs">
          <Text component="strong" inherit fw={700}>
            {t('label.home.savedFilterMenuSelected')}:
          </Text>{' '}
          {name}
        </Text>
      )}
      {description && (
        <Text c="inherit" size="xs" style={{ whiteSpace: 'pre-wrap' }}>
          <Text component="span" inherit fw={600}>
            {t('label.description')}:
          </Text>{' '}
          {description}
        </Text>
      )}
    </Stack>
  );
};
