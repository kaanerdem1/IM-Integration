import type { ProcessingState, UploadFileState } from '@/components/upload/engine/types';

/**
 * EngineAction
 *
 * Domain separation:
 * - Upload lifecycle  → UploadStatus
 * - Backend/socket    → ProcessingState
 * - Queue (Q)         → batch actions
 */
export type EngineAction =
  // --------------------
  // lifecycle
  // --------------------
  | { type: 'RESET' }

  // --------------------
  // file lifecycle
  // --------------------
  | { type: 'ADD_FILE'; file: UploadFileState }
  | { type: 'UPLOAD_START'; id: string }
  | { type: 'PROGRESS'; id: string; uploadedBytes: number; totalBytes: number }
  | { type: 'UPLOAD_SUCCESS'; id: string; attachmentId?: string | null; response?: unknown }
  | {
      type: 'ERROR';
      id: string;
      errorMessage: string;
      error?: {
        isRetryable?: boolean;
        category?: string;
        userMessage?: string;
        technicalMessage?: string;
        userAction?: string;
      };
    }
  | { type: 'CANCEL'; id: string }
  | { type: 'REMOVE_FILE'; id: string }
  | { type: 'RETRY'; id: string }
  | { type: 'PAUSE'; id: string }
  | { type: 'RESUME'; id: string }

  // --------------------
  // multipart / backend init
  // --------------------
  | {
      type: 'MULTIPART_INIT';
      id: string;
      attachmentId: string;
      uploadJobId: string;
    }

  // --------------------
  // backend processing (socket only)
  // DOES NOT affect UploadStatus or Q
  // --------------------
  | {
      type: 'UPDATE_PROCESSING_STATE';
      attachmentId: string;
      processingState: ProcessingState;
      errorMessage?: string;
    }

  // --------------------
  // batch / queue control
  // --------------------
  | { type: 'BATCH_START'; fileIds: string[] }
  | { type: 'BATCH_APPEND'; fileIds: string[] }
  | { type: 'BATCH_CLEAR' }

  // --------------------
  // QUEUE MANAGEMENT (Engine-owned)
  // --------------------
  | {
      type: 'QUEUE_ADD';
      folderKey: string;
      fileCount: number;
      virtualIds: string[];
    }
  | { type: 'QUEUE_REMOVE'; folderKey: string }
  | { type: 'QUEUE_FLUSH_START' }
  | { type: 'QUEUE_FLUSH_COMPLETE' }
  | { type: 'SET_ACTIVE_BATCH_FOLDER'; folderKey: string | null }

  // --------------------
  // state cleanup
  // --------------------
  | { type: 'PRUNE_TERMINAL_FILES'; maxAgeMs: number }

  // --------------------
  // global errors
  // --------------------
  | {
      type: 'GLOBAL_ERROR';
      error: {
        message: string;
        actionId: number;
      };
    }
  | { type: 'CLEAR_GLOBAL_ERROR' };
