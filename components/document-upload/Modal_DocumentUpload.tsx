import { useModal } from '@/components/modal-host/_hook/useModal';
import { DocumentUploadModal } from './DocumentUploadModal';

export const Modal_DocumentUpload = () => {
  const { isModalOpen, getModalOption, closeModal } = useModal();
  const options = getModalOption('DocumentUpload');

  if (!options) {
    return null;
  }

  return (
    <DocumentUploadModal
      {...options}
      opened={isModalOpen('DocumentUpload')}
      onClose={() => closeModal('DocumentUpload')}
    />
  );
};
