import { FC, ReactNode } from 'react';
import classes from './style.module.scss';
import { IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Box, BoxProps } from '@mantine/core';
import { ToolbarActionIcon } from '@/components/display/Buttons/ToolbarActionIcon';

interface Props extends BoxProps {
  closeButtonAriaLabel?: string;
  closeButtonDisabled?: boolean;
  onClose: () => void;
  children: ReactNode;
}

// Başlık satırının sol bloğu (bilgi) ve en sağdaki kapat butonu; ikisi de çekmece ızgarasında kendi alanına oturur
export const DrawerDetailHead: FC<Props> = ({
  closeButtonAriaLabel,
  closeButtonDisabled,
  onClose,
  children,
  ...props
}) => {
  const { t } = useTranslation();

  return (
    <>
      <Box className={classes.drawerDetailHead} {...props}>
        <Box className={classes.drawerDetailHeadBody}>{children}</Box>
      </Box>
      <Box className={classes.close}>
        <ToolbarActionIcon
          id="detail-drawer-close-button"
          disabled={closeButtonDisabled}
          icon={<IconX size={18} stroke={1.6} />}
          label={closeButtonAriaLabel ?? t('label.close')}
          onClick={onClose}
        />
      </Box>
    </>
  );
};
