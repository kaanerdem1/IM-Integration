import { useTranslation } from 'react-i18next';
import { Center } from '@mantine/core';

export const SuspenseFallback = () => {
  const { t } = useTranslation();

  return <Center p="xl">{t('helper.loading')}</Center>;
};
