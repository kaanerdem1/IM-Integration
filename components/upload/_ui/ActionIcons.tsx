import { FC } from 'react';
import { IconPlayerPause, IconPlayerPlay, IconProps, IconReload, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, ActionIconProps, Flex, Tooltip } from '@mantine/core';
import { iconProps_ddMenu } from '@/_common/_props/icon';
import { UPLOAD_ACTIONS_BY_STATUS } from '@/components/upload/_hooks/useFileActions';
import { useUploads } from '@/components/upload/_hooks/useUploads';
import { UploadFileState } from '@/components/upload/engine/types';

interface Props {
  row: UploadFileState;
  type: 'big' | 'small';
}

export const UploadItemActionIcons: FC<Props> = ({ row, type }) => {
  //Hooks
  const { t } = useTranslation();
  const tr = t as unknown as (key: string) => string;
  const {
    engine,
    actionGuards: { canResume, canRetry, canPause, canCancel },
  } = useUploads();

  // Should not happen as UploadBox checks for engine, but satisfy TypeScript
  if (!engine) {
    return null;
  }

  const actionIconProps = (): ActionIconProps => {
    if (type === 'big') {
      return {
        variant: 'subtle',
        color: 'gray.6',
      };
    }

    return {
      size: 'sm',
      radius: 'md',
      variant: 'light',
      color: 'gray.3',
    };
  };

  const iconProps = (): IconProps => {
    if (type === 'big') {
      return {
        ...iconProps_ddMenu,
      };
    }

    return {
      size: '12px',
    };
  };

  const actions = UPLOAD_ACTIONS_BY_STATUS[row.status];

  return (
    <Flex gap="xs" align="center" justify="center">
      {actions.includes('pause') && canPause(row) && (
        <Tooltip label={tr('label.pause')}>
          <ActionIcon
            {...actionIconProps()}
            onClick={(e) => {
              e.stopPropagation();
              engine.pauseFile(row.id);
            }}
          >
            <IconPlayerPause {...iconProps()} />
          </ActionIcon>
        </Tooltip>
      )}

      {actions.includes('resume') && canResume(row) && (
        <Tooltip label={tr('label.resume')}>
          <ActionIcon
            {...actionIconProps()}
            onClick={(e) => {
              e.stopPropagation();
              engine.resumeFile(row.id);
            }}
          >
            <IconPlayerPlay {...iconProps()} />
          </ActionIcon>
        </Tooltip>
      )}

      {actions.includes('retry') && canRetry(row) && (
        <Tooltip label={tr('label.retry')}>
          <ActionIcon
            {...actionIconProps()}
            onClick={(e) => {
              e.stopPropagation();
              engine.retryFile(row.id);
            }}
          >
            <IconReload {...iconProps()} />
          </ActionIcon>
        </Tooltip>
      )}

      {actions.includes('cancel') && canCancel(row) && (
        <Tooltip label={tr('label.cancel')}>
          <ActionIcon
            {...actionIconProps()}
            onClick={(e) => {
              e.stopPropagation();
              engine.cancelFile(row.id);
            }}
          >
            <IconX {...iconProps()} />
          </ActionIcon>
        </Tooltip>
      )}
    </Flex>
  );
};
