import { UploadFileState, UploadStatus } from '@/components/upload/engine/types';

// UTILITY FUNCTIONS (Pure, no hooks)
export function canRetryFile(file: UploadFileState): boolean {
  return file.status === 'error' && file.canRetry;
}

export function canPauseFile(file: UploadFileState): boolean {
  return file.status === 'uploading';
}

export function canResumeFile(file: UploadFileState): boolean {
  return file.status === 'paused';
}

export function canCancelFile(file: UploadFileState): boolean {
  return file.status === 'uploading' || file.status === 'queued' || file.status === 'paused';
}

export const UPLOAD_STATUS_PRIORITY: Record<UploadStatus, number> = {
  uploading: 1,
  paused: 2,
  error: 3,
  canceled: 4,
  queued: 5,
  success: 6,
};

type UploadAction = 'pause' | 'resume' | 'retry' | 'cancel' | 'remove';

export const UPLOAD_ACTIONS_BY_STATUS: Record<UploadStatus, UploadAction[]> = {
  uploading: ['pause', 'cancel'],
  paused: ['resume', 'cancel'],
  error: ['retry', 'cancel', 'remove'],
  canceled: ['retry', 'remove'],
  queued: ['cancel', 'remove'],
  success: ['remove'],
};
