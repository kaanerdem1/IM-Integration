import { FC } from 'react';
import classes from './_style/style.module.scss';
import { useTranslation } from 'react-i18next';
import { Box, Button, Group } from '@mantine/core';

interface Props {
  cancelButtonId?: string;
  children?: React.ReactNode;
  isUpdate?: boolean;
  isDelete?: boolean;
  loading?: boolean;
  isCenter?: boolean;
  onClose?: () => void;
  onClick?: () => void;
  okText?: string;
  submitButtonId?: string;
}

export const ModalFooter: FC<Props> = ({
  cancelButtonId,
  isUpdate,
  isDelete,
  isCenter,
  onClose,
  onClick,
  loading,
  children,
  okText,
  submitButtonId,
  ...props
}: Props) => {
  //Hooks
  const { t } = useTranslation();

  const buttonProps = {
    ...(onClick ? { onClick, type: 'button' as const } : { type: 'submit' as const }),
  };

  return (
    <Box px="lg" py="md" className={classes.customModalFooter} {...props}>
      <Group gap="sm" justify={isCenter ? 'center' : 'right'}>
        {children || (
          <>
            <Button id={cancelButtonId} variant="subtle" disabled={loading} onClick={onClose}>
              {t('label.cancel')}
            </Button>
            {isDelete ? (
              <Button
                {...buttonProps}
                id={submitButtonId}
                disabled={loading}
                loading={loading}
                onClick={onClick}
              >
                {t(`label.delete_`)}
              </Button>
            ) : (
              <Button
                {...buttonProps}
                id={submitButtonId}
                disabled={loading}
                loading={loading}
                type="submit"
              >
                {okText || t(`label.${isUpdate ? 'update_' : 'create_'}`)}
              </Button>
            )}
          </>
        )}
      </Group>
    </Box>
  );
};
