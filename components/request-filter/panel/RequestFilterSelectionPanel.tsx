import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, Stack, Text } from '@mantine/core';
import {
  getActiveRequestListFilterKeys,
  getScopedRequestListFilterValue,
} from '../_config/filterConfig';
import {
  requestFilterModes,
  type RequestFilterModalOptions,
  type SavedUserFormFilter,
} from '../_types';
import {
  RequestFilterPanel,
  type RequestFilterDraft,
  type RequestFilterEditorHandle,
} from './RequestFilterPanel';
import { canSubmitRequestFilter } from './validation';

type Props = Extract<RequestFilterModalOptions, { mode: 'apply' }> & {
  items: SavedUserFormFilter[];
  onClose: () => void;
};

/** One mounted editor, with snapshots captured only when switching records or saving. */
export const RequestFilterSelectionPanel = ({
  items,
  value,
  onApply,
  onClose,
  onReset,
  canReset,
  requestNoOptions,
}: Props) => {
  const { t } = useTranslation();
  const editor = useRef<RequestFilterEditorHandle>(null);
  const [session, setSession] = useState(() => ({
    activeId: items[0].Id,
    records: items,
    drafts: Object.fromEntries(
      items.map((item, index) => {
        const values = value.listFilterGroups![index];
        const activeFilterKeys = getActiveRequestListFilterKeys(values);
        return [
          item.Id,
          {
            values,
            activeFilterKeys,
            workflowStepDrafts: {},
            details: { Name: item.Name, Description: item.Description ?? '' },
            canSubmit: canSubmitRequestFilter(values, activeFilterKeys),
          } satisfies RequestFilterDraft,
        ];
      })
    ),
  }));
  const item = session.records.find((record) => record.Id === session.activeId)!;
  const initialDraft = session.drafts[item.Id];
  const otherDraftsValid = session.records.every(
    (record) => record.Id === item.Id || session.drafts[record.Id].canSubmit
  );
  const selectRecord = (id: string | null) => {
    if (!id || id === item.Id || !editor.current) {
      return;
    }
    const snapshot = editor.current.getDraft();
    setSession((current) => ({
      ...current,
      activeId: id,
      drafts: { ...current.drafts, [item.Id]: snapshot },
    }));
  };

  return (
    <RequestFilterPanel
      key={item.Id}
      mode={requestFilterModes.apply}
      item={item}
      value={initialDraft.values}
      requestNoOptions={requestNoOptions}
      onClose={onClose}
      onReset={onReset}
      canReset={canReset}
      onApply={(currentValue) =>
        onApply({
          ...value,
          listFilterGroups: session.records.map((record) =>
            record.Id === item.Id
              ? currentValue
              : getScopedRequestListFilterValue(session.drafts[record.Id].values)
          ),
        })
      }
      selectionEditor={{
        ref: editor,
        initialDraft,
        otherDraftsValid,
        renderPicker: (disabled) => (
          <Stack gap={6} mb="sm">
            <Select
              data-testid="request-filter-record-picker"
              label={t('label.requests.list.filters.editingRecord')}
              data={session.records.map((record) => ({ value: record.Id, label: record.Name }))}
              value={item.Id}
              onChange={selectRecord}
              disabled={disabled}
              allowDeselect={false}
              searchable
            />
            <Text size="xs" c="dimmed">
              {t('label.requests.list.filters.editingRecordHint')}
            </Text>
            {!otherDraftsValid && (
              <Text size="xs" c="red" role="status">
                {t('label.requests.list.filters.otherDraftInvalid')}
              </Text>
            )}
          </Stack>
        ),
        onSaved: (savedItem) => {
          const snapshot = editor.current!.getDraft();
          setSession((current) => ({
            ...current,
            records: current.records.map((record) =>
              record.Id === savedItem.Id ? savedItem : record
            ),
            drafts: { ...current.drafts, [savedItem.Id]: snapshot },
          }));
        },
      }}
    />
  );
};
