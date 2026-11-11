import { forwardRef } from 'react';
import { IconFilter, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Box, Stack, Text, Tooltip, type ComboboxData } from '@mantine/core';
import { useCallbackRef } from '@mantine/hooks';
import { ToolbarActionIcon } from '@/components/display/Buttons/ToolbarActionIcon';
import { useModalActions } from '@/components/modal-host/_hook/useModal';
import { requestFilterModes, type SavedUserFormFilter } from '@/components/request-filter/_types';
import { hasRequestListApiFilterValue } from '@/pages/requests/list/_config';
import type { RequestListFilterValue } from '@/pages/requests/list/_config';
import classes from './RequestFilterButton.module.css';

type RequestFilterButtonProps = {
  /** Talep no seçeneklerinin etiketleri; verilmezse yalnızca seçili değerler listelenir */
  requestNoOptions?: ComboboxData;
  savedFilter?: SavedUserFormFilter;
  savedFilters?: SavedUserFormFilter[];
  loading?: boolean;
  triggerTestId?: string;
  value: RequestListFilterValue;
  onApply: (value: RequestListFilterValue) => void;
  onReset: () => void;
  canReset?: boolean;
};

/** Araç çubuğu filtre butonu: talep filtresi modalını (modal-host) açar; etkin filtre varsa işaretli görünür */
export const RequestFilterButton = forwardRef<HTMLButtonElement, RequestFilterButtonProps>(
  (
    {
      requestNoOptions,
      savedFilter,
      savedFilters,
      loading,
      triggerTestId,
      value,
      onApply,
      onReset,
      canReset = hasRequestListApiFilterValue(value),
    },
    ref
  ) => {
    const { t } = useTranslation();
    const { openModal } = useModalActions();
    const combinedSelection = Boolean(value.listFilterGroups);
    const invalidSelection =
      combinedSelection &&
      (!savedFilters?.length || savedFilters.length !== value.listFilterGroups?.length);
    // The open modal must apply against the latest catalog after updating a record.
    const apply = useCallbackRef(onApply);
    const reset = useCallbackRef(onReset);

    return (
      <Box className={classes.root}>
        <ToolbarActionIcon
          className={classes.filter}
          ref={ref}
          data-testid={triggerTestId}
          loading={loading}
          aria-disabled={invalidSelection}
          active={hasRequestListApiFilterValue(value)}
          icon={<IconFilter stroke={1.5} size={16} />}
          label={t(
            invalidSelection
              ? 'label.requests.list.filters.multipleSelectionInvalid'
              : 'label.requests.form.comment.filter'
          )}
          onClick={() => {
            if (invalidSelection) {
              return;
            }
            openModal('RequestFilter', {
              item: savedFilter,
              items: combinedSelection ? savedFilters : undefined,
              mode: requestFilterModes.apply,
              onApply: apply,
              onReset: reset,
              canReset,
              requestNoOptions,
              value,
            });
          }}
        />
        {canReset && (
          <Tooltip
            label={
              <Stack gap={0}>
                <Text component="strong" fw={700} size="xs" c="inherit">
                  {t('label.requests.list.filters.clearFilters')}
                </Text>
                <Text size="xs" c="inherit">
                  {t('label.requests.list.filters.clearFiltersHint')}
                </Text>
              </Stack>
            }
            multiline
            maw={280}
            position="bottom"
            withArrow
          >
            <ActionIcon
              className={classes.clear}
              data-testid="request-list-filter-reset-shortcut"
              aria-label={t('label.requests.list.filters.clearFilters')}
              color="cyan"
              variant="transparent"
              radius="xl"
              size={24}
              type="button"
              onClick={reset}
            >
              <Box component="span" className={classes.clearMark}>
                <IconX aria-hidden size={12} stroke={1.8} />
              </Box>
            </ActionIcon>
          </Tooltip>
        )}
      </Box>
    );
  }
);

RequestFilterButton.displayName = 'RequestFilterButton';
