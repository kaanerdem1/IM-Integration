// Single source: UPLOAD_CONFIG.PARALLEL_UPLOAD_LIMIT
import { UPLOAD_CONFIG } from '@/components/upload/config';

export interface UploadRuntimeConfig {
  features: {
    analytics: boolean;
    crashRecovery: boolean;
    networkMonitoring: boolean;
  };
  upload: {
    concurrentUploads: number;
    chunkSize: number;
    retry: {
      maxAttempts: number;
      baseDelay: number; // ms
      maxDelay: number; // ms
    };
  };
  ui: {
    autoCollapse: boolean;
  };
}

export const DEFAULT_UPLOAD_CONFIG: UploadRuntimeConfig = {
  features: {
    analytics: false, // Opt-in (performance cost)
    crashRecovery: true, // Golden Retriever is lightweight
    networkMonitoring: true, // Lean: just online/offline
  },

  upload: {
    concurrentUploads: UPLOAD_CONFIG.PARALLEL_UPLOAD_LIMIT,
    chunkSize: 5 * 1024 * 1024, // 5MB
    retry: {
      maxAttempts: 2,
      baseDelay: 1000,
      maxDelay: 5000,
    },
  },

  ui: {
    autoCollapse: true,
  },
};

export function createUploadConfig(overrides?: Partial<UploadRuntimeConfig>): UploadRuntimeConfig {
  return {
    features: {
      ...DEFAULT_UPLOAD_CONFIG.features,
      ...overrides?.features,
    },
    upload: {
      ...DEFAULT_UPLOAD_CONFIG.upload,
      ...overrides?.upload,
      retry: {
        ...DEFAULT_UPLOAD_CONFIG.upload.retry,
        ...overrides?.upload?.retry,
      },
    },
    ui: {
      ...DEFAULT_UPLOAD_CONFIG.ui,
      ...overrides?.ui,
    },
  };
}

export function validateUploadConfig(config: UploadRuntimeConfig): void {
  if (config.upload.retry.maxAttempts < 1) {
    throw new Error('[UploadConfig] Invalid retry.maxAttempts: must be >= 1');
  }

  if (config.upload.retry.baseDelay < 0) {
    throw new Error('[UploadConfig] Invalid retry.baseDelay: must be >= 0');
  }

  if (config.upload.retry.maxDelay < config.upload.retry.baseDelay) {
    throw new Error('[UploadConfig] Invalid retry.maxDelay: must be >= baseDelay');
  }

  if (config.upload.concurrentUploads < 1) {
    throw new Error('[UploadConfig] Invalid concurrentUploads: must be >= 1');
  }

  if (config.upload.chunkSize < 1024 * 1024) {
    // Min 1MB
    throw new Error('[UploadConfig] Invalid chunkSize: must be >= 1MB');
  }
}
