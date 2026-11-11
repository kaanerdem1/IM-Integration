import { UPLOAD_CONFIG } from '@/components/upload/config';

function getColorStyle(color: string): string {
  return `color:${color}; font-weight:bold;`;
}

function isDebugEnabled(): boolean {
  return UPLOAD_CONFIG.ENABLE_DEBUG || UPLOAD_CONFIG.ENABLE_UPLOAD_DEBUG;
}

export const logUpload = (jobId: string, ...args: unknown[]) => {
  if (!isDebugEnabled()) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(`%c[Upload:${jobId}]`, getColorStyle('#4EA8DE'), ...args);
};
export const logUploadError = (jobId: string, ...args: unknown[]) => {
  console.error(`%c[Upload:${jobId}]`, getColorStyle('#E74C3C'), ...args);
};

export const logUploadWarn = (jobId: string, ...args: unknown[]) => {
  if (!isDebugEnabled()) {
    return;
  }

  console.warn(`%c[Upload:${jobId}]`, getColorStyle('#F39C12'), ...args);
};
export const logUploadInfo = (jobId: string, ...args: unknown[]) => {
  if (!isDebugEnabled()) {
    return;
  }

  console.info(`%c[Upload:${jobId}]`, getColorStyle('#3498DB'), ...args);
};
export const createUploadLogger = (jobId: string) => ({
  log: (...args: unknown[]) => logUpload(jobId, ...args),
  error: (...args: unknown[]) => logUploadError(jobId, ...args),
  warn: (...args: unknown[]) => logUploadWarn(jobId, ...args),
  info: (...args: unknown[]) => logUploadInfo(jobId, ...args),
});
