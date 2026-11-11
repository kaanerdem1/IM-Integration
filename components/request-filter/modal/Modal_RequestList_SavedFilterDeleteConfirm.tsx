import { IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Alert, Text } from '@mantine/core';
import { QueryKeys, useUserFormFilterDelete } from '@/_api/hooks';
import { useMessage } from '@/_hooks/useMessage';
import { ConfirmDeleteModal } from '@/components/display/Modal/DeleteModal';
import { Modal } from '@/components/display/Modal/Modal';
import { useModalState } from '@/components/modal-host/_hook/useModal';

export const Modal_RequestList_SavedFilterDeleteConfirm = () => {
  const { t } = useTranslation();
  const { message } = useMessage();
  const { opened, options, closeModal } = useModalState('RequestListSavedFilterDeleteConfirm');
  const { mutate: deleteSavedFilter, isPending } = useUserFormFilterDelete({
    invalidate: [QueryKeys.UserFormFilterDetail],
    onSuccess: (response) => {
      // 204 No Content başarılıdır; silme işleminde Data dönmesi zorunlu değildir.
      if (response?.Error || response?.Data === false) {
        return;
      }

      message(t('label.requests.list.filters.savedFilterDeleted'), 'success');
      closeModal('RequestListSavedFilterDeleteConfirm');
    },
  });
  const onClose = () => closeModal('RequestListSavedFilterDeleteConfirm');

  const handleDelete = () => {
    const filterId = options?.item.Id;

    if (!filterId || isPending || options?.item.UserDashboardGraphics?.length) {
      return;
    }

    deleteSavedFilter(filterId);
  };

  return (
    <Modal opened={opened} onClose={onClose} size="sm" withCloseButton={false}>
      {opened ? (
        <ConfirmDeleteModal
          title={t('label.requests.list.filters.savedFilterDeleteTitle', {
            name: options?.item.Name ?? '',
          })}
          description={t('label.requests.list.filters.savedFilterDeleteDescription')}
          loading={isPending}
          onCancel={onClose}
          onConfirm={handleDelete}
        >
          <Alert
            color="yellow"
            variant="light"
            radius="md"
            icon={<IconAlertTriangle size={20} aria-hidden />}
            title={t('label.requests.list.filters.savedFilterDeleteImpactTitle')}
          >
            <Text size="sm">{t('label.requests.list.filters.savedFilterDeleteImpact')}</Text>
          </Alert>
        </ConfirmDeleteModal>
      ) : null}
    </Modal>
  );
};
