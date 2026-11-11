export const UPLOAD_CONFIG = {
  MULTIPART_THRESHOLD_MB: 10,
  BYTES_PER_MB: 1024 * 1024,
  MAX_BASE64_FILE_SIZE_BYTES: 25 * 1024 * 1024,
  PARALLEL_UPLOAD_LIMIT: 5,
  AUTO_COLLAPSE_DELAY_MS: 800,
  ENABLE_DEBUG: import.meta.env.DEV,
  ENABLE_UPLOAD_DEBUG: typeof window !== 'undefined' && (window as any).UPLOAD_DEBUG === true,
} as const;

export type UploadConfig = typeof UPLOAD_CONFIG;
