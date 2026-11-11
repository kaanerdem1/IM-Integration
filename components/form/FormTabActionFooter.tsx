import { IconArrowLeft, IconArrowRight, IconCheck } from '@tabler/icons-react';
import { Box, Button, Divider, Flex } from '@mantine/core';

type FormTabActionFooterProps = {
  actionButtonDisabled?: boolean;
  actionButtonId?: string;
  actionButtonLabel: string;
  actionButtonLoading?: boolean;
  actionButtonType?: 'button' | 'submit';
  actionMode: 'continue' | 'save';
  dividerLabel: string;
  hidden?: boolean;
  onActionClick?: () => void;
  onPrevious?: () => void;
  previousButtonId?: string;
  previousDisabled?: boolean;
  previousLabel?: string;
  showPrevious?: boolean;
};

export const FormTabActionFooter = ({
  actionButtonDisabled = false,
  actionButtonId = 'next-button',
  actionButtonLabel,
  actionButtonLoading = false,
  actionButtonType = 'button',
  actionMode,
  dividerLabel,
  hidden = false,
  onActionClick,
  onPrevious,
  previousButtonId = 'previous-button',
  previousDisabled = false,
  previousLabel,
  showPrevious = false,
}: FormTabActionFooterProps) => {
  if (hidden) {
    return null;
  }

  const isContinueAction = actionMode === 'continue';

  return (
    <>
      <Divider
        my="xs"
        variant="dashed"
        labelPosition="center"
        label={
          <>
            <Box mx={5}>{dividerLabel}</Box>
            {isContinueAction ? <IconArrowRight size={12} /> : <IconCheck size={12} />}
          </>
        }
      />

      <Flex align="center" justify="center" gap="sm">
        {showPrevious && previousLabel && onPrevious ? (
          <Button
            id={previousButtonId}
            variant="subtle"
            leftSection={<IconArrowLeft stroke={1} />}
            disabled={previousDisabled}
            onClick={onPrevious}
          >
            {previousLabel}
          </Button>
        ) : null}
        <Button
          id={actionButtonId}
          type={actionButtonType}
          rightSection={isContinueAction ? <IconArrowRight stroke={1} /> : undefined}
          loading={actionButtonLoading}
          disabled={actionButtonDisabled}
          onClick={actionButtonType === 'button' ? onActionClick : undefined}
        >
          {actionButtonLabel}
        </Button>
      </Flex>
    </>
  );
};
