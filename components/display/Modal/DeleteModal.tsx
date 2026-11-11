import { FC } from 'react';
import { resolveEntityKey } from '@/_helpers/modal/resolve-entity-key';
import { useSafeT } from '@/_helpers/modal/use-safe-t';
import { EntityTypes } from '@/_i18n/Tr/_entity';
import { ConfirmActionModal } from './ConfirmModal';

interface Props {
  cancelButtonId?: string;
  title?: string;
  description?: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  confirmButtonId?: string;
  isRemoved?: boolean;
  entity?: EntityTypes;
}

export const ConfirmDeleteModal: FC<Props> = ({
  cancelButtonId,
  loading,
  onCancel,
  onConfirm,
  title,
  description,
  children,
  cancelLabel,
  confirmLabel,
  confirmDisabled = false,
  confirmButtonId,
  isRemoved = false,
  entity,
}) => {
  const tSafe = useSafeT();

  const entityKey = resolveEntityKey(entity);
  const entityLabel = entity
    ? tSafe(`entity.${entityKey}`).toLowerCase()
    : tSafe('label.data').toLowerCase();

  const titleKey = isRemoved ? 'confirmation_willBeRemoved' : 'confirmation_willBeDeleted';

  return (
    <ConfirmActionModal
      cancelButtonId={cancelButtonId}
      title={
        title ||
        tSafe(`label.${titleKey}`, {
          entity: entityLabel,
        })
      }
      description={description || tSafe('label.confirmation_description')}
      loading={loading}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelLabel={cancelLabel || tSafe('label.cancel')}
      confirmLabel={confirmLabel || tSafe(`label.${isRemoved ? 'remove_' : 'delete_'}`)}
      confirmDisabled={confirmDisabled}
      confirmButtonId={confirmButtonId}
      confirmColor="red"
    >
      {children}
    </ConfirmActionModal>
  );
};
