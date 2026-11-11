import { useCallback, useEffect, useRef, useState } from 'react';
import { getDms } from '@/_api/_core/api-gen/dms';
import { getDocumentFileContentType, isDocumentFileSizeAllowed } from './fileRules';

export const isDmsUploadAbort = (error: unknown): boolean => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }

  if (!error || typeof error !== 'object') {
    return false;
  }

  return (
    ('code' in error && error.code === 'ERR_CANCELED') ||
    ('name' in error && error.name === 'AbortError')
  );
};

const readFileAsBase64 = (file: File, signal: AbortSignal): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    const handleAbort = () => reader.abort();

    signal.addEventListener('abort', handleAbort, { once: true });
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.onabort = () => reject(new DOMException('Upload canceled', 'AbortError'));
    reader.onloadend = () => signal.removeEventListener('abort', handleAbort);
    reader.readAsDataURL(file);
  });

const waitForBrowserPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

export type UseDMSOptions = {
  documentType?: string | null;
  referenceNo?: string | null;
};

const normalizeFileNamePrefix = (value: string | null | undefined) =>
  value?.trim().replace(/[<>:"/\\|?*]/g, '-') ?? '';

const getDocumentTypePrefix = (documentType: string | null | undefined) =>
  normalizeFileNamePrefix(documentType).split(/\s+/, 1)[0] ?? '';

export const getDMSFileName = (
  fileName: string,
  referenceNo?: string | null,
  documentType?: string | null
) => {
  const referenceNoPrefix = normalizeFileNamePrefix(referenceNo);
  const documentTypePrefix = getDocumentTypePrefix(documentType);
  const normalizedFileName = fileName.trim();

  if (!referenceNoPrefix) {
    return normalizedFileName;
  }

  const normalizedPrefix = [referenceNoPrefix, documentTypePrefix].filter(Boolean).join('_');
  const fullPrefix = `${normalizedPrefix}_`;

  if (
    normalizedFileName.toLocaleLowerCase('tr-TR').startsWith(fullPrefix.toLocaleLowerCase('tr-TR'))
  ) {
    return normalizedFileName;
  }

  const referencePrefixes = [`${referenceNoPrefix}-`, `${referenceNoPrefix}_`];
  const existingReferencePrefix = referencePrefixes.find((prefix) =>
    normalizedFileName.toLocaleLowerCase('tr-TR').startsWith(prefix.toLocaleLowerCase('tr-TR'))
  );
  const baseFileName = existingReferencePrefix
    ? normalizedFileName.slice(existingReferencePrefix.length)
    : normalizedFileName;

  return `${fullPrefix}${baseFileName}`;
};

const createDMSFile = (file: File, referenceNo?: string | null, documentType?: string | null) => {
  const fileName = getDMSFileName(file.name, referenceNo, documentType);

  if (fileName === file.name) {
    return file;
  }

  return new File([file], fileName, {
    lastModified: file.lastModified,
    type: file.type,
  });
};

export const useDMS = ({ documentType, referenceNo }: UseDMSOptions = {}) => {
  const uploadControllerRef = useRef<AbortController | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentId, setAttachmentId] = useState<string | null>(null);
  const [isHandlingFile, setIsHandlingFile] = useState(false);

  const handleFileChange = useCallback(
    async (file: File | null) => {
      uploadControllerRef.current?.abort();
      uploadControllerRef.current = null;
      setAttachmentId(null);

      if (!file) {
        setSelectedFile(null);
        setIsHandlingFile(false);
        return;
      }

      const uploadController = new AbortController();
      uploadControllerRef.current = uploadController;
      setIsHandlingFile(true);
      setSelectedFile(null);

      try {
        // Let the disabled/loading state paint before Windows starts processing the selected file.
        await waitForBrowserPaint();
        uploadController.signal.throwIfAborted();

        const dmsFile = createDMSFile(file, referenceNo, documentType);

        if (!isDocumentFileSizeAllowed(dmsFile)) {
          return;
        }

        setSelectedFile(dmsFile);

        const fileContent = await readFileAsBase64(dmsFile, uploadController.signal);
        uploadController.signal.throwIfAborted();
        const uploadResponse = await getDms().postApiDmsSave(
          {
            Id: null,
            FileName: dmsFile.name,
            ContentType: getDocumentFileContentType(dmsFile),
            FileContent: fileContent,
            Size: dmsFile.size,
            Tags: [],
          },
          { signal: uploadController.signal }
        );

        if (uploadControllerRef.current === uploadController) {
          setAttachmentId(uploadResponse?.Data?.Id ?? null);
        }
      } catch (error) {
        if (!isDmsUploadAbort(error) && uploadControllerRef.current === uploadController) {
          console.error('Document upload failed:', error);
          setSelectedFile(null);
          setAttachmentId(null);
        }
      } finally {
        if (uploadControllerRef.current === uploadController) {
          uploadControllerRef.current = null;
          setIsHandlingFile(false);
        }
      }
    },
    [documentType, referenceNo]
  );

  const clearFile = useCallback(() => {
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
    setSelectedFile(null);
    setAttachmentId(null);
    setIsHandlingFile(false);
  }, []);

  useEffect(() => {
    return () => {
      uploadControllerRef.current?.abort();
      uploadControllerRef.current = null;
    };
  }, []);

  return {
    selectedFile,
    attachmentId,
    isUploadingFile: isHandlingFile,
    clearFile,
    handleFileChange,
  };
};
