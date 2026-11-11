import { IconFilterPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Tooltip, type ActionIconProps } from '@mantine/core';
import { useModalActions } from '@/components/modal-host/_hook/useModal';
import { requestFilterModes } from '../_types';

type RequestFilterCreateButtonProps = Pick<ActionIconProps, 'disabled' | 'size'> & {
  onBeforeOpen?: () => void;
};

export const RequestFilterCreateButton = ({
  disabled,
  size = 28,
  onBeforeOpen,
}: RequestFilterCreateButtonProps) => {
  const { t } = useTranslation();
  const { openModal } = useModalActions();

  return (
    <Tooltip label={t('label.root.filtersAndGraphs.addFilter')} withArrow>
      <ActionIcon
        aria-label={t('label.root.filtersAndGraphs.addFilter')}
        disabled={disabled}
        flex="0 0 auto"
        radius="xl"
        size={size}
        type="button"
        variant="filled"
        onClick={() => {
          onBeforeOpen?.();
          openModal('RequestFilter', { mode: requestFilterModes.create });
        }}
      >
        <IconFilterPlus aria-hidden size={16} stroke={1.8} />
      </ActionIcon>
    </Tooltip>
  );
};
