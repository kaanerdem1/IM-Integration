import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  QueryKeys,
  useUserDashboardGraphicDelete,
  type UserDashboardGraphicListResponse,
} from '@/_api/hooks';
import { useMessage } from '@/_hooks/useMessage';
import { ConfirmDeleteModal } from '@/components/display/Modal/DeleteModal';
import { Modal } from '@/components/display/Modal/Modal';
import { useModalState } from '@/components/modal-host/_hook/useModal';
import { useDashboardGraphicSelection } from '../_store/useDashboardGraphicSelection';

export const Modal_DashboardGraphic_DeleteConfirm = () => {
  const { t } = useTranslation();
  const { message } = useMessage();
  const queryClient = useQueryClient();
  const { opened, options, closeModal } = useModalState('DashboardGraphicDeleteConfirm');
  const { mutate, isPending } = useUserDashboardGraphicDelete({
    invalidate: [QueryKeys.UserFormFilterDetail],
    onSuccess: (response, id) => {
      if (response?.Error || response?.Data === false) {
        message(response.Error?.Message || t('message.commonError'), 'error');
        return;
      }
      const selection = useDashboardGraphicSelection.getState();
      if (selection.selectedId === id) {
        selection.selectGraphic(null);
      }
      queryClient.setQueryData<UserDashboardGraphicListResponse>(
        [QueryKeys.UserDashboardGraphicList],
        (previous) =>
          previous
            ? {
                ...previous,
                Data: previous.Data?.filter((item) => item.Id !== id),
              }
            : previous
      );
      void queryClient.invalidateQueries({ queryKey: [QueryKeys.UserDashboardGraphicList] });
      message(t('label.home.savedGraphicDeleted'), 'success');
      closeModal('DashboardGraphicDeleteConfirm');
    },
  });
  const onClose = () => {
    if (!isPending) {
      closeModal('DashboardGraphicDeleteConfirm');
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} size="sm" withCloseButton={false}>
      <ConfirmDeleteModal
        title={t('label.home.savedGraphicDeleteTitle', { name: options?.item.Name ?? '' })}
        description={t('label.home.savedGraphicDeleteDescription')}
        loading={isPending}
        onCancel={onClose}
        onConfirm={() => {
          if (options && !isPending) {
            mutate(options.item.Id);
          }
        }}
      />
    </Modal>
  );
};
