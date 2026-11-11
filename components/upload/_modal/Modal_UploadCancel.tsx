import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMessage } from '@/_hooks/useMessage';
import { ModalProps } from '@/_types';
import { ConfirmActionModal } from '@/components/display/Modal/ConfirmModal';
import { Modal } from '@/components/display/Modal/Modal';
import { useModal } from '@/components/modal-host/_hook/useModal';
import { useUploadEngine } from '@/components/upload/_hooks/useUploadEngine';

const Content: FC<ModalProps> = ({ onLoading, onClose }) => {
  const { t } = useTranslation();
  const tr = t as unknown as (key: string, params?: Record<string, unknown>) => string;
  const { message } = useMessage();
  const engine = useUploadEngine();

  const handleSubmit = async () => {
    onLoading?.(true);
    engine.restart();
    message(tr('label.message.uploadsCanceled'));
    onLoading?.(false);
    onClose();
  };

  return (
    <ConfirmActionModal
      onConfirm={handleSubmit}
      loading={false}
      onCancel={onClose}
      cancelLabel={tr('label.close')}
      confirmLabel={tr('label.cancelAllUploads')}
      title={tr('label.confirmation.uploadCancelWarning')}
      confirmColor="red"
    />
  );
};

export const Modal_UploadCancel = () => {
  const { t } = useTranslation();
  const tr = t as unknown as (key: string, params?: Record<string, unknown>) => string;
  const { isModalOpen, closeModal } = useModal();
  const opened = isModalOpen('UploadCancel');

  const onClose = () => closeModal('UploadCancel');
  const [loading, setLoading] = useState(false);

  return (
    <Modal title={tr('label.upload')} opened={opened} onClose={onClose} loading={loading} size="sm">
      {opened && <Content onLoading={setLoading} onClose={onClose} />}
    </Modal>
  );
};
