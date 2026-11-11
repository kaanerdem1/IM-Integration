export type UploadStatus = 'queued' | 'uploading' | 'paused' | 'success' | 'error' | 'canceled';

export type ProcessingState = 'queued' | 'processing' | 'completed' | 'failed';

export interface UploadFileState {
  id: string;

  name: string;
  type: string;
  size: number;
  extension?: string;
  relativePath: string | null;

  formId: string | null;
  formKey: string | null;

  progress: number;
  uploadedBytes: number;
  totalBytes: number;

  status: UploadStatus;

  attempts: number;
  canRetry: boolean;
  errorMessage: string | null;

  attachmentId: string | null;
  uploadJobId: string | null;

  processingState: ProcessingState | null;

  createdAt: number;
  updatedAt: number;
}

export interface UploadAggregates {
  total: number;
  activeCount: number;

  queued: number;
  uploading: number;
  paused: number;

  success: number;
  error: number;
  canceled: number;

  socketProcessing: number;

  progress: number;

  /** UI: tüm dosyalar terminal state mi? */
  allDone: boolean;

  /** Q: SADECE current batch bitti mi? */
  batchDone: boolean;

  anyQueued: boolean;
  anyUploading: boolean;
  anyPaused: boolean;
  anySuccess: boolean;
  anyError: boolean;
  anyCanceled: boolean;
  anySocketProcessing: boolean;
  showBox: boolean;
}

export const initialAggregates: UploadAggregates = {
  total: 0,
  activeCount: 0,

  queued: 0,
  uploading: 0,
  paused: 0,

  success: 0,
  error: 0,
  canceled: 0,

  socketProcessing: 0,

  progress: 0,
  allDone: false,
  batchDone: false,

  anyQueued: false,
  anyUploading: false,
  anyPaused: false,
  anySuccess: false,
  anyError: false,
  anyCanceled: false,
  anySocketProcessing: false,
  showBox: false,
};

export interface UploadByteTotals {
  totalBytes: number;
  uploadedBytes: number;
  processingCount: number;
}

export interface EngineState {
  files: Record<string, UploadFileState>;

  /**
   * attachmentId -> fileId
   * Used to resolve socket events to file IDs
   */
  attachmentIndex: Record<string, string>;

  aggregates: UploadAggregates;
  byteTotals: UploadByteTotals;

  globalError: GlobalUploadError | null;

  /**
   * Aktif batch üyeleri
   * Q burada kilitlenir
   */
  currentBatchFileIds: Record<string, true>;

  /**
   * QUEUE MANAGEMENT
   * Stores file counts per folder key (actual File objects live in engine.queuedFileStore)
   */
  queue: Record<string, number>;
  queueVirtualIds: Record<string, string[]>;
  activeBatchFolderKey: string | null;
  isFlushing: boolean;
}

export type GlobalUploadError = {
  message: string;
  actionId: number;
};

export const initialEngineState: EngineState = {
  files: {},
  attachmentIndex: {},

  aggregates: initialAggregates,

  byteTotals: {
    totalBytes: 0,
    uploadedBytes: 0,
    processingCount: 0,
  },

  globalError: null,
  currentBatchFileIds: {},

  queue: {},
  queueVirtualIds: {},
  activeBatchFolderKey: null,
  isFlushing: false,
};

export type MultipartMeta = {
  formId?: string | null;
  formKey?: string | null;
};
