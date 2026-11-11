import { apiClient } from '@/_api-client/client';
import type { TagDto } from '@/_api/_core/api-gen/types';
import { UPLOAD_CONFIG } from '@/components/upload/config';
import type { UploadUppyFile } from '@/components/upload/uppy/type';

type SaveAttachmentResponse = {
  Data?: {
    Id?: string | null;
  } | null;
  Error?: unknown;
};

function normalizeTags(file: UploadUppyFile): TagDto[] {
  const rawTags = file.meta?.tags;
  const normalized: TagDto[] = [];

  if (Array.isArray(rawTags)) {
    for (const tag of rawTags) {
      if (typeof tag === 'string') {
        const value = tag.trim();
        if (value.length > 0) {
          normalized.push({ Name: value });
        }
        continue;
      }

      if (tag && typeof tag === 'object') {
        const dto = tag as TagDto;
        if (dto.Id || dto.Name) {
          normalized.push(dto);
        }
      }
    }
  }

  const formId =
    typeof file.meta?.formId === 'string' && file.meta.formId.trim().length > 0
      ? file.meta.formId.trim()
      : null;
  const formKey =
    typeof file.meta?.formKey === 'string' && file.meta.formKey.trim().length > 0
      ? file.meta.formKey.trim()
      : null;

  if (formId) {
    normalized.push({ Name: `form-id:${formId}` });
  }
  if (formKey) {
    normalized.push({ Name: `form-key:${formKey}` });
  }

  return normalized;
}

export function fileToBase64(file: File, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const rejectAbort = () => {
      reader.abort();
      reject(new DOMException('Upload canceled', 'AbortError'));
    };

    if (signal?.aborted) {
      rejectAbort();
      return;
    }

    signal?.addEventListener('abort', rejectAbort, { once: true });

    reader.onerror = () => {
      reject(new Error('Failed to read file as base64'));
    };

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Unexpected base64 conversion result'));
        return;
      }

      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };

    reader.onabort = () => {
      reject(new DOMException('Upload canceled', 'AbortError'));
    };

    reader.onloadend = () => {
      signal?.removeEventListener('abort', rejectAbort);
    };

    reader.readAsDataURL(file);
  });
}

export async function postBase64Attachment(
  uppyFile: UploadUppyFile,
  opts: {
    signal?: AbortSignal;
    onProgress?: (uploadedBytes: number, totalBytes: number) => void;
  } = {}
): Promise<{ attachmentId: string | null }> {
  const rawFile = uppyFile.data;

  if (!(rawFile instanceof File)) {
    throw new Error('Invalid file payload');
  }

  if (rawFile.size > UPLOAD_CONFIG.MAX_BASE64_FILE_SIZE_BYTES) {
    throw new Error('File size exceeds the 25 MB Base64 upload limit');
  }

  const fileContent = await fileToBase64(rawFile, opts.signal);
  opts.signal?.throwIfAborted();

  const payload = {
    FileName: uppyFile.name,
    ContentType: uppyFile.type ?? rawFile.type ?? 'application/octet-stream',
    FileContent: fileContent,
    Size: uppyFile.size ?? rawFile.size ?? 0,
    Tags: normalizeTags(uppyFile),
  };

  const result = await apiClient<SaveAttachmentResponse>({
    url: '/api/Dms/save',
    method: 'POST',
    headers: { 'Content-Type': 'application/json-patch+json' },
    data: payload,
    signal: opts.signal,
    onUploadProgress: (event) => {
      const totalBytes = event.total ?? payload.Size ?? 0;
      const uploadedBytes = Math.min(event.loaded ?? 0, totalBytes);
      opts.onProgress?.(uploadedBytes, totalBytes);
    },
  });

  const attachmentId = result?.Data?.Id?.trim();
  if (result?.Error || !attachmentId) {
    throw new Error('Attachment save failed');
  }

  return { attachmentId };
}
