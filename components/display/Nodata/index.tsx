import type { FC } from 'react';
import classess from './_style.module.scss';
import { IconArchive } from '@tabler/icons-react';
import type { TablerIcon } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Box, BoxProps, Stack, Text } from '@mantine/core';
import { EntityTypes } from '@/_i18n/Tr/_entity';

interface Props extends BoxProps {
  icon?: TablerIcon;
  text?: string;
  description?: string;
  entity?: EntityTypes;
}

export const NoData: FC<Props> = ({ icon = IconArchive, text, description, entity, ...props }) => {
  const { t } = useTranslation();
  const Icon = icon;

  return (
    <Box my="xs" className={classess.container} {...props}>
      <Icon className={classess.icon} stroke={1.5} size={18} color="var(--mantine-color-gray-6)" />
      <Stack gap={4} miw={0}>
        <Text className={classess.text}>
          {text ||
            (entity ? t('helper.noData', { value: t(`entity.${entity}`) }) : t('helper.noData_'))}
        </Text>
        {description ? <Text className={classess.text}>{description}</Text> : null}
      </Stack>
    </Box>
  );
};
