import { memo, useMemo } from 'react';
import classes from './_style/style.module.scss';
import { IconFile } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Box, Progress, Text, ThemeIcon } from '@mantine/core';
import { getFileSize } from '@/_helpers/file';
import { View } from '@/components/display/View';
import { getUploadItemStatusColor } from '@/components/upload/_helper/colors';
import { UploadItemActionIcons } from '@/components/upload/_ui/ActionIcons';
import { UploadFileState } from '@/components/upload/engine/types';

interface Props {
  item: UploadFileState;
}

export const UploadItem = memo(({ item }: Props) => {
  const { t } = useTranslation();
  const tr = t as unknown as (key: string) => string;

  const pct = useMemo(
    () => (item.totalBytes > 0 ? Math.round((item.uploadedBytes / item.totalBytes) * 100) : 0),
    [item.uploadedBytes, item.totalBytes]
  );

  const statusColors = useMemo(() => getUploadItemStatusColor(item.status), [item.status]);

  const isUploading = useMemo(
    () => item.status === 'uploading' || item.status === 'paused' || item.status === 'queued',
    [item.status]
  );

  const hasUploadError = item.status === 'error';

  return (
    <Box className={classes.item}>
      <Box className={classes.itemIcon}>
        <ThemeIcon variant="light" size="lg" radius="md" color={statusColors.baseColor}>
          <IconFile stroke={1} size={18} color={statusColors.color} />
        </ThemeIcon>
      </Box>

      <Box className={classes.itemInfo}>
        <Text fw={500} size="xs" lineClamp={3} w="200px">
          {item.name}
        </Text>
        <Text fw={400} size="10px" c="gray.6">
          {getFileSize(item.uploadedBytes)} / {getFileSize(item.totalBytes)}
        </Text>
        <View show={isUploading && item.status !== 'queued'}>
          <Progress
            radius="xl"
            value={pct}
            w="100%"
            size="sm"
            mt="5px"
            color={statusColors.color}
          />
        </View>

        <View show={hasUploadError}>
          <Text c="red" size="xs" fw={500} lh={1.2} mt="xs">
            {item.errorMessage}
          </Text>
        </View>
      </Box>

      <View show={isUploading && item.status !== 'queued'}>
        <Box className={classes.itemActions}>
          <UploadItemActionIcons row={item} type="small" />
          <Text fw={400} size="10px" mt="5px">
            {pct}%
          </Text>
        </Box>
      </View>

      <View show={item.status === 'queued'}>
        <Box className={classes.itemActions}>
          <Text fw={400} size="10px" mr="5px" c="indigo">
            {tr('label.uploads.queued')}
          </Text>
        </Box>
      </View>
    </Box>
  );
});
