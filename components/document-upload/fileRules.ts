import { UPLOAD_CONFIG } from '@/components/upload/config';

export const DOCUMENT_MAX_FILE_SIZE_BYTES = UPLOAD_CONFIG.MAX_BASE64_FILE_SIZE_BYTES;
export const DOCUMENT_MAX_FILE_SIZE_LABEL = '25 MB';

export const DOCUMENT_MIME_TYPES = {
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.msg': 'application/vnd.ms-outlook',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;

export type DocumentFileExtension = keyof typeof DOCUMENT_MIME_TYPES;

export const DOCUMENT_FILE_EXTENSIONS = {
  wordPdf: ['.doc', '.docx', '.pdf'],
  wordExcelPdf: ['.doc', '.docx', '.xls', '.xlsx', '.pdf'],
  mailPdfWord: ['.doc', '.docx', '.msg', '.pdf'],
  additional: ['.doc', '.docx', '.msg', '.mp4', '.pdf', '.png', '.xls', '.xlsx'],
} as const satisfies Record<string, readonly DocumentFileExtension[]>;

const getFileExtension = (fileName: string) => {
  const normalizedFileName = fileName.trim().toLocaleLowerCase('tr-TR');
  const lastDotIndex = normalizedFileName.lastIndexOf('.');
  return lastDotIndex === -1 ? '' : normalizedFileName.slice(lastDotIndex);
};

const isKnownExtension = (extension: string): extension is DocumentFileExtension =>
  Object.hasOwn(DOCUMENT_MIME_TYPES, extension);

export const getDocumentFileContentType = (file: Pick<File, 'name' | 'type'>): string => {
  const contentType = file.type.trim();
  if (contentType) {
    return contentType;
  }
  const extension = getFileExtension(file.name);
  return isKnownExtension(extension) ? DOCUMENT_MIME_TYPES[extension] : 'application/octet-stream';
};

export const getDocumentFileAccept = (
  extensions: readonly DocumentFileExtension[]
): Record<string, string[]> | undefined => {
  if (!extensions.length) {
    return undefined;
  }
  const accept: Record<string, string[]> = {};
  for (const extension of extensions) {
    (accept[DOCUMENT_MIME_TYPES[extension]] ??= []).push(extension);
  }
  return accept;
};

export const isDocumentFileAllowed = (
  file: Pick<File, 'name'>,
  extensions: readonly DocumentFileExtension[]
) => {
  const extension = getFileExtension(file.name);
  if (extension === '.eml') {
    return false;
  }
  return !extensions.length || (isKnownExtension(extension) && extensions.includes(extension));
};

export const isDocumentFileSizeAllowed = (file: Pick<File, 'size'>) =>
  file.size <= DOCUMENT_MAX_FILE_SIZE_BYTES;
