import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router';
import { useFileDialog } from '@mantine/hooks';
import { useMessage } from '@/_hooks/useMessage';
import { useUploadStoreCore } from '@/components/upload/_store/uploadStore';

export const useUppyUpload = () => {
  const { id: routeFormId } = useParams();
  const [searchParams] = useSearchParams();
  const { message } = useMessage();
  const { t } = useTranslation();
  const tr = t as unknown as (key: string, params?: Record<string, unknown>) => string;

  const resolveMeta = useCallback(
    (override?: { formId?: string | null; formKey?: string | null }) => {
      const formId = override?.formId ?? searchParams.get('formId') ?? routeFormId ?? null;

      const formKey = override?.formKey ?? searchParams.get('formKey') ?? null;

      return {
        formId,
        formKey,
      };
    },
    [routeFormId, searchParams]
  );

  const enqueueFiles = useCallback(
    async (
      files: FileList | File[],
      metaOverride?: { formId?: string | null; formKey?: string | null }
    ) => {
      try {
        const meta = resolveMeta(metaOverride);
        await useUploadStoreCore.getState().addFiles(files, meta);
      } catch (err) {
        console.error('[useUppyUpload] enqueueFiles failed:', err);
        message(tr('label.message.upload.status.initFailed'));
      }
    },
    [resolveMeta, message, tr]
  );

  const fileDialog = useFileDialog({
    multiple: true,
    onChange: (files) => {
      if (files?.length) {
        void enqueueFiles(files);
      }
    },
  });

  const itemsDrop = useCallback(
    async (e: DragEvent, metaOverride?: { formId?: string | null; formKey?: string | null }) => {
      if (!e.dataTransfer) {
        return;
      }

      try {
        const flatFiles = Array.from(e.dataTransfer.files ?? []);

        if (flatFiles.length > 0) {
          await enqueueFiles(flatFiles, metaOverride);
        }
      } catch (err) {
        console.error('Failed to process dropped files:', err);
        message(tr('label.message.upload.status.dropFailed'));
      }
    },
    [enqueueFiles, message, tr]
  );

  return {
    setFilesToUppy: enqueueFiles,
    openFileDialog: fileDialog.open,
    itemsDrop,
  };
};
