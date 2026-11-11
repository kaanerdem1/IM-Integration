import { useTranslation } from 'react-i18next';
import * as yup from 'yup';
import { Button, Textarea } from '@mantine/core';
import { schemaResolver, useForm } from '@mantine/form';
import { WORKFLOW_STATUS_COLORS } from '@/_common/workflow/colors';
import { Modal } from '@/components/display/Modal/Modal';
import { ModalBody } from '@/components/display/Modal/ModalBody';
import { ModalFooter } from '@/components/display/Modal/ModalFooter';
import { ModalInfoBand } from '@/components/display/Modal/ModalInfoBand';
import { WorkflowEntityIdentity, type WorkflowEntityReference } from './WorkflowEntityIdentity';

type Props = {
  action: 'cancel' | 'reject';
  opened: boolean;
  pending: boolean;
  note?: string;
  entity?: WorkflowEntityReference;
  onClose: () => void;
  onSubmit?: (note: string) => void | Promise<void>;
};

const MAX_NOTE_LENGTH = 200;

const ActionNoteForm = ({
  action,
  pending,
  note,
  entity,
  onClose,
  onSubmit,
}: Omit<Props, 'opened'>) => {
  const { t } = useTranslation();
  const isViewMode = note !== undefined;
  const label = t(`label.requests.workflow.actionNote.${action}NoteLabel`);
  const schema = yup.object({
    note: isViewMode
      ? yup.string().defined()
      : yup
          .string()
          .trim()
          .required(t('message.required', { field: label }))
          .max(MAX_NOTE_LENGTH, t('message.max', { value: MAX_NOTE_LENGTH })),
  });
  const form = useForm({
    mode: 'uncontrolled',
    initialValues: { note: note ?? '' },
    validate: schemaResolver(schema),
  });
  const noteLength = form.useWatchValue('note').length;
  const color =
    action === 'cancel' ? WORKFLOW_STATUS_COLORS.canceled : WORKFLOW_STATUS_COLORS.returned;

  return (
    <form
      style={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
      }}
      onSubmit={form.onSubmit(async (values) => {
        if (!pending && !isViewMode) {
          await onSubmit?.(values.note.trim());
        }
      })}
    >
      {entity ? (
        <ModalInfoBand>
          <WorkflowEntityIdentity entity={entity} />
        </ModalInfoBand>
      ) : null}
      <ModalBody>
        <Textarea
          key={form.key('note')}
          label={label}
          placeholder={t(`label.requests.workflow.actionNote.${action}NotePlaceholder`)}
          autosize
          minRows={4}
          maxRows={8}
          maxLength={MAX_NOTE_LENGTH}
          withAsterisk={!isViewMode}
          disabled={isViewMode || pending}
          description={
            !isViewMode ? `${Math.min(noteLength, MAX_NOTE_LENGTH)}/${MAX_NOTE_LENGTH}` : undefined
          }
          {...form.getInputProps('note')}
        />
      </ModalBody>
      {!isViewMode ? (
        <ModalFooter onClose={onClose}>
          <Button variant="subtle" onClick={onClose} disabled={pending} color="gray">
            {t('label.giveUp')}
          </Button>
          <Button type="submit" color={color} loading={pending} disabled={pending}>
            {t(action === 'cancel' ? 'label.cancel' : 'label.requests.workflow.reject')}
          </Button>
        </ModalFooter>
      ) : null}
    </form>
  );
};

export const WorkflowActionNoteModal = (props: Props) => {
  const { t } = useTranslation();
  const isViewMode = props.note !== undefined;
  return (
    <Modal
      opened={props.opened}
      onClose={props.onClose}
      loading={props.pending}
      size="sm"
      title={
        isViewMode
          ? t(`label.requests.workflow.actionNote.${props.action}ViewTitle`)
          : t(props.action === 'cancel' ? 'label.cancel' : 'label.requests.workflow.reject')
      }
      closeOnEscape={!props.pending}
      closeOnClickOutside={!props.pending}
      returnFocus={isViewMode}
    >
      {props.opened ? <ActionNoteForm {...props} /> : null}
    </Modal>
  );
};
