import { FC } from 'react';
import { Box, Button, Group, Stack, Text, type ButtonProps } from '@mantine/core';
import { ModalInfoBand } from './ModalInfoBand';

interface ConfirmActionModalProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  context?: React.ReactNode;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
  cancelLabel: React.ReactNode;
  confirmLabel: React.ReactNode;
  cancelButtonId?: string;
  confirmButtonId?: string;
  cancelDisabled?: boolean;
  confirmColor?: ButtonProps['color'];
  confirmDisabled?: boolean;
}

export const ConfirmActionModal: FC<ConfirmActionModalProps> = ({
  title,
  description,
  context,
  loading,
  onCancel,
  onConfirm,
  children,
  cancelLabel,
  confirmLabel,
  cancelButtonId,
  confirmButtonId,
  cancelDisabled = false,
  confirmColor,
  confirmDisabled = false,
}) => {
  return (
    <>
      {context ? <ModalInfoBand>{context}</ModalInfoBand> : null}
      <Stack align="center" justify="center" mih={150} py="xl" px="lg" gap="xs">
        <Text size="22px" c="gray.7" ta="center" fw={500} px="lg">
          {title}
        </Text>

        {description ? (
          <Text size="15px" c="gray.6" ta="center" lh={1.5}>
            {description}
          </Text>
        ) : null}

        {children}
      </Stack>

      <Box px="lg" py="md" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
        <Group gap="sm" justify="center">
          <Button
            id={cancelButtonId}
            variant="subtle"
            color="gray"
            onClick={onCancel}
            disabled={cancelDisabled}
          >
            {cancelLabel}
          </Button>

          <Button
            id={confirmButtonId}
            loading={loading}
            disabled={loading || confirmDisabled}
            onClick={onConfirm}
            color={confirmColor}
          >
            {confirmLabel}
          </Button>
        </Group>
      </Box>
    </>
  );
};
