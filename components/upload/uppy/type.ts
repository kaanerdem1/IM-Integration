import type { Uppy, UppyFile } from '@uppy/core';
import type { TagDto } from '@/_api/_core/api-gen/types';

export interface UploadFileMeta {
  [key: string]: unknown;

  attachmentId?: string;
  relativePath?: string;
  formId?: string | null;
  formKey?: string | null;
  tags?: TagDto[] | string[];
}

export type UploadFileBody = Record<string, unknown>;
export type UploadUppyFile = UppyFile<UploadFileMeta, UploadFileBody>;
export type UploadUppy = Uppy<UploadFileMeta, UploadFileBody>;
