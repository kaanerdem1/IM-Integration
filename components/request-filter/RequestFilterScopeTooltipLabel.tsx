import { useTranslation } from 'react-i18next';
import { Stack, Text } from '@mantine/core';
import {
  requestFilterScopeTooltipContent,
  type RequestFilterScope,
} from './_config/requestFilterScope';

export const RequestFilterScopeTooltipLabel = ({ scope }: { scope: RequestFilterScope }) => {
  const { t } = useTranslation();
  const { titleKey, descriptionKey } = requestFilterScopeTooltipContent[scope];

  return (
    <Stack gap={0}>
      <Text component="strong" fw={700} size="xs" c="inherit">
        {t(titleKey)}
      </Text>
      <Text size="xs" c="inherit">
        {t(descriptionKey)}
      </Text>
    </Stack>
  );
};
