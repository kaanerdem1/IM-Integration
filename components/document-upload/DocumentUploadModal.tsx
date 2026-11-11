import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { IconFile, IconUpload, IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Group, Stack, Text } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { Modal } from '@/components/display/Modal/Modal';
import { ModalBody } from '@/components/display/Modal/ModalBody';
import { ModalFooter } from '@/components/display/Modal/ModalFooter';
import {
  DOCUMENT_FILE_EXTENSIONS,
  DOCUMENT_MAX_FILE_SIZE_BYTES,
  DOCUMENT_MAX_FILE_SIZE_LABEL,
  getDocumentFileAccept,
  isDocumentFileAllowed,
  isDocumentFileSizeAllowed,
  type DocumentFileExtension,
} from './fileRules';
import { useDMS, type UseDMSOptions } from './useDMS';

export type UploadedDocument = { attachmentId: string; file: File };

export type DocumentUploadModalOptions = UseDMSOptions & {
  acceptedExtensions?: readonly DocumentFileExtension[];
  onSave: (document: UploadedDocument) => Promise<boolean>;
};

type Props = DocumentUploadModalOptions & {
  opened: boolean;
  onClose: () => void;
};

const FILE_DIALOG_CANCEL_DELAY_MS = 1000;

const UploadContent = ({
  acceptedExtensions = DOCUMENT_FILE_EXTENSIONS.additional,
  documentType,
  onClose,
  onSave,
  referenceNo,
}: Omit<Props, 'opened'>) => {
  const { t } = useTranslation();
  const { selectedFile, attachmentId, isUploadingFile, clearFile, handleFileChange } = useDMS({
    documentType,
    referenceNo,
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const fileDialogCancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accept = useMemo(() => getDocumentFileAccept(acceptedExtensions), [acceptedExtensions]);
  const extensions = acceptedExtensions.join(', ');
  const invalidFileTypeMessage = extensions
    ? t('label.documentUpload.invalidFileType', { extensions })
    : t('label.documentUpload.fileTypeNotAllowed');
  const fileTooLargeMessage = t('label.documentUpload.fileTooLarge', {
    maxSize: DOCUMENT_MAX_FILE_SIZE_LABEL,
  });
  const isProcessing = isUploadingFile || isSaving;
  const loading = isFileDialogOpen || isProcessing;
  const clearFileDialogCancelTimer = useCallback(() => {
    if (fileDialogCancelTimerRef.current !== null) {
      clearTimeout(fileDialogCancelTimerRef.current);
      fileDialogCancelTimerRef.current = null;
    }
  }, []);
  useEffect(() => clearFileDialogCancelTimer, [clearFileDialogCancelTimer]);

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };
  const handleDrop = async (files: File[]) => {
    if (isProcessing) {
      return;
    }
    clearFileDialogCancelTimer();
    setIsFileDialogOpen(false);
    clearFile();
    if (files.length !== 1) {
      setError(t('label.documentUpload.singleFileOnly'));
      return;
    }
    const file = files[0];
    setError('');
    if (!isDocumentFileAllowed(file, acceptedExtensions)) {
      setError(invalidFileTypeMessage);
      return;
    }
    if (!isDocumentFileSizeAllowed(file)) {
      setError(fileTooLargeMessage);
      return;
    }
    await handleFileChange(file);
  };
  const handleFileDialogOpen = () => {
    clearFileDialogCancelTimer();
    setIsFileDialogOpen(true);
  };
  const handleFileDialogCancel = () => {
    clearFileDialogCancelTimer();
    // Windows can report cancellation shortly before the selected file reaches onDrop.
    fileDialogCancelTimerRef.current = setTimeout(() => {
      setIsFileDialogOpen(false);
      fileDialogCancelTimerRef.current = null;
    }, FILE_DIALOG_CANCEL_DELAY_MS);
  };
  const handleFileInputChangeCapture = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files?.length) {
      handleFileDialogOpen();
    }
  };

  const handleSubmit = async () => {
    if (loading) {
      return;
    }
    if (!attachmentId || !selectedFile) {
      setError(t('message.required', { field: t('label.documentUpload.document') }));
      return;
    }
    setIsSaving(true);
    try {
      // Each caller owns its attachment relation; the modal only handles single-file DMS upload.
      if (await onSave({ attachmentId, file: selectedFile })) {
        onClose();
      }
    } catch {
      // HTTP errors are published by the shared API error listener; keep the upload for retry.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={t('label.documentUpload.addDocument')}
      opened
      onClose={handleClose}
      loading={loading}
      closeButtonProps={{ disabled: loading }}
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
      size="md"
    >
      <form
        aria-busy={loading}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void handleSubmit();
        }}
      >
        <ModalBody
          scrollbars="y"
          styles={{ content: { maxWidth: '100%', minWidth: '100%', width: '100%' } }}
        >
          <Stack gap="xs" miw={0} w="100%">
            <Dropzone
              data-testid="document-upload-dropzone"
              multiple={false}
              maxFiles={1}
              maxSize={DOCUMENT_MAX_FILE_SIZE_BYTES}
              useFsAccessApi
              miw={0}
              maw="100%"
              w="100%"
              accept={accept}
              activateOnClick={!isFileDialogOpen}
              activateOnDrag={!isFileDialogOpen}
              activateOnKeyboard={!isFileDialogOpen}
              disabled={isProcessing}
              inputProps={{ onChangeCapture: handleFileInputChangeCapture }}
              onFileDialogCancel={handleFileDialogCancel}
              onFileDialogOpen={handleFileDialogOpen}
              onDrop={handleDrop}
              onReject={(rejections) => {
                clearFileDialogCancelTimer();
                setIsFileDialogOpen(false);
                if (isProcessing) {
                  return;
                }
                clearFile();
                const codes = rejections.flatMap(({ errors }) => errors.map(({ code }) => code));
                setError(
                  codes.includes('file-too-large')
                    ? fileTooLargeMessage
                    : codes.includes('too-many-files')
                      ? t('label.documentUpload.singleFileOnly')
                      : invalidFileTypeMessage
                );
              }}
            >
              <Stack align="center" gap="xs" miw={0} w="100%">
                <IconUpload size={28} stroke={1.8} />
                <Text size="sm">{t('label.documentUpload.chooseFile')}</Text>
                <Text size="xs" c="dimmed" ta="center" w="100%" truncate title={selectedFile?.name}>
                  {selectedFile?.name ?? ''}
                </Text>
                {extensions ? (
                  <Text
                    size="xs"
                    c="dimmed"
                    ta="center"
                    w="100%"
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {t('label.documentUpload.acceptedExtensions', { extensions })}
                  </Text>
                ) : null}
              </Stack>
            </Dropzone>
            {selectedFile ? (
              <Group justify="space-between" gap="sm" wrap="nowrap">
                <Group gap="xs" wrap="nowrap" flex={1} miw={0}>
                  <IconFile size={16} style={{ flexShrink: 0 }} />
                  <Text size="sm" truncate title={selectedFile.name}>
                    {selectedFile.name}
                  </Text>
                </Group>
                <Button
                  data-testid="document-upload-remove"
                  variant="subtle"
                  color="red"
                  size="xs"
                  leftSection={<IconX size={14} />}
                  disabled={loading}
                  onClick={() => {
                    clearFile();
                    setError('');
                  }}
                  style={{ flexShrink: 0 }}
                >
                  {t('label.remove_')}
                </Button>
              </Group>
            ) : null}
            {error ? (
              <Text c="red" size="xs" role="alert">
                {error}
              </Text>
            ) : null}
          </Stack>
        </ModalBody>
        <ModalFooter
          loading={loading}
          onClose={handleClose}
          okText={t('label.add_')}
          submitButtonId="document-upload-save"
          cancelButtonId="document-upload-cancel"
        />
      </form>
    </Modal>
  );
};

export const DocumentUploadModal = ({ opened, ...props }: Props) =>
  opened ? <UploadContent {...props} /> : null;
