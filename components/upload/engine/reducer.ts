// src/components/upload/engine/reducer.ts
import { EngineAction } from './actions';
import { EngineState, initialEngineState, UploadFileState, UploadStatus } from './types';

function isCountedInProgress(status: UploadStatus) {
  return status === 'queued' || status === 'uploading' || status === 'paused';
}

function isTerminalUpload(status: UploadStatus) {
  return status === 'success' || status === 'error' || status === 'canceled';
}

function isActiveProcessingState(state: UploadFileState['processingState']): boolean {
  return state === 'queued' || state === 'processing';
}

function isCountedInBytes(status: UploadStatus): boolean {
  return status !== 'canceled';
}

function computeProgress(totalBytes: number, uploadedBytes: number): number {
  if (totalBytes <= 0) {
    return 0;
  }
  const pct = Math.round((uploadedBytes / totalBytes) * 100);
  return Math.max(0, Math.min(100, pct));
}

function computeBatchDone(state: EngineState): boolean {
  const ids = Object.keys(state.currentBatchFileIds);

  if (ids.length === 0) {
    return false;
  }

  for (const id of ids) {
    const file = state.files[id];
    if (!file) {
      return false;
    }

    // Check only upload status (success/error/canceled), NOT processing state
    if (!isTerminalUpload(file.status)) {
      return false;
    }
  }

  return true;
}

function recomputeDerived(
  state: EngineState,
  options: { recomputeBatchDone?: boolean } = {}
): EngineState['aggregates'] {
  const agg = state.aggregates;
  const bt = state.byteTotals;
  const socketProcessing = bt.processingCount;

  const anyQueued = agg.queued > 0;
  const anyUploading = agg.uploading > 0;
  const anyPaused = agg.paused > 0;
  const anySuccess = agg.success > 0;
  const anyError = agg.error > 0;
  const anyCanceled = agg.canceled > 0;
  const anySocketProcessing = socketProcessing > 0;

  const activeCount = agg.uploading + agg.paused;
  const progress = computeProgress(bt.totalBytes, bt.uploadedBytes);

  const hasUploadActive = agg.queued > 0 || agg.uploading > 0 || agg.paused > 0;

  const batchDone = options.recomputeBatchDone === false ? agg.batchDone : computeBatchDone(state);

  const allDone =
    agg.total > 0 && !hasUploadActive && agg.success + agg.error + agg.canceled === agg.total;

  return {
    ...agg,
    socketProcessing,
    activeCount,
    progress,
    batchDone,
    allDone,
    anyQueued,
    anyUploading,
    anyPaused,
    anySuccess,
    anyError,
    anyCanceled,
    anySocketProcessing,
    showBox: agg.total > 0,
  };
}

function incStatus(agg: EngineState['aggregates'], status: UploadStatus, delta: number) {
  switch (status) {
    case 'queued': {
      return { ...agg, queued: agg.queued + delta };
    }
    case 'uploading': {
      return { ...agg, uploading: agg.uploading + delta };
    }
    case 'paused': {
      return { ...agg, paused: agg.paused + delta };
    }
    case 'success': {
      return { ...agg, success: agg.success + delta };
    }
    case 'error': {
      return { ...agg, error: agg.error + delta };
    }
    case 'canceled': {
      return { ...agg, canceled: agg.canceled + delta };
    }
    default: {
      return agg;
    }
  }
}

function statusTransition(agg: EngineState['aggregates'], prev: UploadStatus, next: UploadStatus) {
  if (prev === next) {
    return agg;
  }
  let out = agg;
  out = incStatus(out, prev, -1);
  out = incStatus(out, next, +1);
  return out;
}

export function reducer(
  state: EngineState = initialEngineState,
  action: EngineAction
): EngineState {
  const now = Date.now();

  switch (action.type) {
    case 'RESET': {
      return initialEngineState;
    }

    case 'BATCH_START': {
      const nextIds: Record<string, true> = {};
      for (const id of action.fileIds) {
        nextIds[id] = true;
      }

      const nextState: EngineState = {
        ...state,
        currentBatchFileIds: nextIds,
      };

      return {
        ...nextState,
        aggregates: recomputeDerived(nextState),
      };
    }

    case 'BATCH_CLEAR': {
      const nextState: EngineState = {
        ...state,
        currentBatchFileIds: {},
      };

      return {
        ...nextState,
        aggregates: recomputeDerived(nextState),
      };
    }

    case 'ADD_FILE': {
      const file = action.file;

      let nextAggRaw = {
        ...state.aggregates,
        total: state.aggregates.total + 1,
      };
      nextAggRaw = incStatus(nextAggRaw, file.status, +1);

      const nextBytes = {
        ...state.byteTotals,
        totalBytes: isCountedInBytes(file.status)
          ? state.byteTotals.totalBytes + (file.totalBytes ?? 0)
          : state.byteTotals.totalBytes,
        uploadedBytes: isCountedInBytes(file.status)
          ? state.byteTotals.uploadedBytes + (file.uploadedBytes ?? 0)
          : state.byteTotals.uploadedBytes,
        processingCount:
          state.byteTotals.processingCount +
          (isActiveProcessingState(file.processingState) ? 1 : 0),
      };

      const nextState: EngineState = {
        ...state,
        byteTotals: nextBytes,
        files: {
          ...state.files,
          [file.id]: {
            ...file,
            createdAt: now,
            updatedAt: now,
          },
        },
        aggregates: nextAggRaw,
      };

      return {
        ...nextState,
        aggregates: recomputeDerived(nextState, { recomputeBatchDone: false }),
      };
    }

    case 'UPLOAD_START': {
      const file = state.files[action.id];
      if (!file) {
        return state;
      }

      const nextAggRaw = statusTransition(state.aggregates, file.status, 'uploading');

      const nextState: EngineState = {
        ...state,
        aggregates: nextAggRaw,
        files: {
          ...state.files,
          [action.id]: {
            ...file,
            status: 'uploading',
            updatedAt: now,
          },
        },
      };

      return {
        ...nextState,
        aggregates: recomputeDerived(nextState),
      };
    }

    case 'PROGRESS': {
      const file = state.files[action.id];
      if (!file) {
        return state;
      }

      const prevUploaded = file.uploadedBytes ?? 0;
      const prevTotal = file.totalBytes ?? 0;

      const nextUploaded = Math.max(0, action.uploadedBytes ?? 0);
      const nextTotal = Math.max(0, action.totalBytes ?? prevTotal);

      const uploadedDelta = nextUploaded - prevUploaded;
      const totalDelta = nextTotal - prevTotal;

      const nextStatus: UploadStatus = file.status === 'queued' ? 'uploading' : file.status;

      const nextBytes = {
        ...state.byteTotals,
        uploadedBytes: isCountedInBytes(file.status)
          ? state.byteTotals.uploadedBytes + uploadedDelta
          : state.byteTotals.uploadedBytes,
        totalBytes: isCountedInBytes(file.status)
          ? state.byteTotals.totalBytes + totalDelta
          : state.byteTotals.totalBytes,
        processingCount: state.byteTotals.processingCount,
      };

      let nextAggRaw = state.aggregates;
      if (file.status === 'queued' && nextStatus === 'uploading') {
        nextAggRaw = statusTransition(nextAggRaw, 'queued', 'uploading');
      }

      const nextState: EngineState = {
        ...state,
        byteTotals: nextBytes,
        aggregates: nextAggRaw,
        files: {
          ...state.files,
          [action.id]: {
            ...file,
            uploadedBytes: nextUploaded,
            totalBytes: nextTotal,
            progress: computeProgress(nextTotal, nextUploaded),
            status: nextStatus,
            updatedAt: now,
          },
        },
      };

      return {
        ...nextState,
        aggregates: recomputeDerived(nextState, { recomputeBatchDone: false }),
      };
    }

    case 'UPLOAD_SUCCESS': {
      const file = state.files[action.id];
      if (!file) {
        return state;
      }

      const uploadedDelta = (file.totalBytes ?? 0) - (file.uploadedBytes ?? 0);

      const nextAggRaw = statusTransition(state.aggregates, file.status, 'success');
      const attachmentId = action.attachmentId ?? file.attachmentId;
      const processingState = file.processingState;
      const processingDelta =
        Number(isActiveProcessingState(processingState)) -
        Number(isActiveProcessingState(file.processingState));
      const nextBytes = {
        ...state.byteTotals,
        uploadedBytes: state.byteTotals.uploadedBytes + uploadedDelta,
        processingCount: Math.max(0, state.byteTotals.processingCount + processingDelta),
      };
      const nextAttachmentIndex = { ...state.attachmentIndex };
      if (attachmentId) {
        nextAttachmentIndex[attachmentId] = action.id;
      }

      const nextState: EngineState = {
        ...state,
        attachmentIndex: nextAttachmentIndex,
        byteTotals: nextBytes,
        aggregates: nextAggRaw,
        files: {
          ...state.files,
          [action.id]: {
            ...file,
            status: 'success',
            progress: 100,
            uploadedBytes: file.totalBytes,
            attachmentId,
            processingState,
            updatedAt: now,
          },
        },
      };

      return {
        ...nextState,
        aggregates: recomputeDerived(nextState),
      };
    }

    case 'MULTIPART_INIT': {
      const file = state.files[action.id];
      if (!file) {
        return state;
      }

      const nextAttachmentIndex = { ...state.attachmentIndex };
      if (action.attachmentId) {
        nextAttachmentIndex[action.attachmentId] = action.id;
      }

      const processingState = file.processingState ?? 'queued';
      const processingDelta =
        Number(isActiveProcessingState(processingState)) -
        Number(isActiveProcessingState(file.processingState));
      const nextState: EngineState = {
        ...state,
        attachmentIndex: nextAttachmentIndex,
        byteTotals: {
          ...state.byteTotals,
          processingCount: Math.max(0, state.byteTotals.processingCount + processingDelta),
        },
        files: {
          ...state.files,
          [action.id]: {
            ...file,
            attachmentId: action.attachmentId,
            uploadJobId: action.uploadJobId,
            processingState,
            updatedAt: now,
          },
        },
      };

      return {
        ...nextState,
        aggregates: recomputeDerived(nextState),
      };
    }

    case 'PAUSE': {
      const file = state.files[action.id];
      if (!file) {
        return state;
      }

      const nextAggRaw = statusTransition(state.aggregates, file.status, 'paused');

      const nextState: EngineState = {
        ...state,
        aggregates: nextAggRaw,
        files: {
          ...state.files,
          [action.id]: {
            ...file,
            status: 'paused',
            updatedAt: now,
          },
        },
      };

      return {
        ...nextState,
        aggregates: recomputeDerived(nextState),
      };
    }

    case 'RESUME': {
      const file = state.files[action.id];
      if (!file) {
        return state;
      }

      // resume -> uploading
      const nextAggRaw = statusTransition(state.aggregates, file.status, 'uploading');

      const nextState: EngineState = {
        ...state,
        aggregates: nextAggRaw,
        files: {
          ...state.files,
          [action.id]: {
            ...file,
            status: 'uploading',
            updatedAt: now,
          },
        },
      };

      return {
        ...nextState,
        aggregates: recomputeDerived(nextState),
      };
    }

    case 'RETRY': {
      const file = state.files[action.id];
      if (!file) {
        return state;
      }

      // retry -> queued; attempts++
      const nextAggRaw = statusTransition(state.aggregates, file.status, 'queued');

      // After retry, recalculate if we can retry again
      const nextAttempts = (file.attempts ?? 0) + 1;
      const MAX_TOTAL_ATTEMPTS = 5; // 2 auto-retries + 3 manual retries
      const canRetryAgain = nextAttempts < MAX_TOTAL_ATTEMPTS;

      const nextState: EngineState = {
        ...state,
        aggregates: nextAggRaw,
        files: {
          ...state.files,
          [action.id]: {
            ...file,
            status: 'queued',
            attempts: nextAttempts,
            canRetry: canRetryAgain,
            errorMessage: null,
            updatedAt: now,
          },
        },
      };

      return {
        ...nextState,
        aggregates: recomputeDerived(nextState),
      };
    }

    case 'UPDATE_PROCESSING_STATE': {
      const fileId = state.attachmentIndex[action.attachmentId];
      if (!fileId) {
        return state;
      }

      const file = state.files[fileId];
      if (!file) {
        return state;
      }

      const prev = file.processingState;
      const next = action.processingState;

      const prevCount = isActiveProcessingState(prev) ? 1 : 0;
      const nextCount = isActiveProcessingState(next) ? 1 : 0;
      const delta = nextCount - prevCount;

      const nextProcessingCount = Math.max(0, state.byteTotals.processingCount + delta);

      const nextState: EngineState = {
        ...state,
        byteTotals: {
          ...state.byteTotals,
          processingCount: nextProcessingCount,
        },
        files: {
          ...state.files,
          [fileId]: {
            ...file,
            processingState: next,
            errorMessage:
              next === 'failed' ? (action.errorMessage ?? file.errorMessage) : file.errorMessage,
            updatedAt: now,
          },
        },
      };

      return {
        ...nextState,
        aggregates: recomputeDerived(nextState),
      };
    }

    case 'ERROR': {
      const file = state.files[action.id];
      if (!file) {
        return state;
      }

      const prevStatus = file.status;

      // Determine if file can be retried
      // - Check error is retryable (from error handler)
      // - Auto-retries (handled in adapter): up to 2 times
      // - Manual retries (user clicks retry button): up to 3 additional times after auto-retries
      const errorIsRetryable = action.error?.isRetryable ?? false;
      const currentAttempts = file.attempts ?? 0;
      const MAX_TOTAL_ATTEMPTS = 5; // 2 auto-retries + 3 manual retries
      const canRetry = errorIsRetryable && currentAttempts < MAX_TOTAL_ATTEMPTS;

      // Only subtract bytes if the file was in progress and cannot be retried
      const shouldSubtract = isCountedInProgress(prevStatus) && !canRetry;

      const nextBytes = shouldSubtract
        ? {
            ...state.byteTotals,
            totalBytes: Math.max(0, state.byteTotals.totalBytes - (file.totalBytes ?? 0)),
            uploadedBytes: Math.max(0, state.byteTotals.uploadedBytes - (file.uploadedBytes ?? 0)),
            processingCount: state.byteTotals.processingCount,
          }
        : {
            ...state.byteTotals,
            processingCount: state.byteTotals.processingCount,
          };

      const nextAggRaw = statusTransition(state.aggregates, prevStatus, 'error');

      const nextState: EngineState = {
        ...state,
        byteTotals: nextBytes,
        aggregates: nextAggRaw,
        files: {
          ...state.files,
          [file.id]: {
            ...file,
            status: 'error',
            errorMessage: action.errorMessage,
            canRetry,
            updatedAt: now,
          },
        },
      };

      return {
        ...nextState,
        aggregates: recomputeDerived(nextState),
      };
    }

    case 'CANCEL': {
      const file = state.files[action.id];
      if (!file) {
        return state;
      }

      const shouldSubtract = isCountedInBytes(file.status);

      const nextAttachmentIndex = { ...state.attachmentIndex };
      if (file.attachmentId) {
        delete nextAttachmentIndex[file.attachmentId];
      }

      const nextBytes = shouldSubtract
        ? {
            ...state.byteTotals,
            totalBytes: Math.max(0, state.byteTotals.totalBytes - (file.totalBytes ?? 0)),
            uploadedBytes: Math.max(0, state.byteTotals.uploadedBytes - (file.uploadedBytes ?? 0)),
            processingCount: isActiveProcessingState(file.processingState)
              ? Math.max(0, state.byteTotals.processingCount - 1)
              : state.byteTotals.processingCount,
          }
        : {
            ...state.byteTotals,
            processingCount: state.byteTotals.processingCount,
          };

      const nextAggRaw = statusTransition(state.aggregates, file.status, 'canceled');

      const nextState: EngineState = {
        ...state,
        attachmentIndex: nextAttachmentIndex,
        byteTotals: nextBytes,
        aggregates: nextAggRaw,
        files: {
          ...state.files,
          [action.id]: {
            ...file,
            status: 'canceled',
            updatedAt: now,
          },
        },
      };

      return {
        ...nextState,
        aggregates: recomputeDerived(nextState),
      };
    }

    case 'REMOVE_FILE': {
      const file = state.files[action.id];
      if (!file) {
        return state;
      }

      // Remove file from state completely
      const nextFiles = { ...state.files };
      delete nextFiles[action.id];

      const nextAttachmentIndex = { ...state.attachmentIndex };
      if (file.attachmentId) {
        delete nextAttachmentIndex[file.attachmentId];
      }

      // Remove from batch
      const nextBatchIds = { ...state.currentBatchFileIds };
      delete nextBatchIds[action.id];

      // Fix bytes and counters
      const shouldSubtract = isCountedInBytes(file.status);
      const nextBytes = shouldSubtract
        ? {
            ...state.byteTotals,
            totalBytes: Math.max(0, state.byteTotals.totalBytes - (file.totalBytes ?? 0)),
            uploadedBytes: Math.max(0, state.byteTotals.uploadedBytes - (file.uploadedBytes ?? 0)),
            processingCount: isActiveProcessingState(file.processingState)
              ? Math.max(0, state.byteTotals.processingCount - 1)
              : state.byteTotals.processingCount,
          }
        : state.byteTotals;

      // Update aggregates (total and status counters)
      let nextAggRaw = {
        ...state.aggregates,
        total: Math.max(0, state.aggregates.total - 1),
      };
      nextAggRaw = incStatus(nextAggRaw, file.status, -1);

      const nextState: EngineState = {
        ...state,
        files: nextFiles,
        attachmentIndex: nextAttachmentIndex,
        currentBatchFileIds: nextBatchIds,
        byteTotals: nextBytes,
        aggregates: nextAggRaw,
      };

      return {
        ...nextState,
        aggregates: recomputeDerived(nextState),
      };
    }

    case 'PRUNE_TERMINAL_FILES': {
      const cutoff = now - action.maxAgeMs;
      const idsToRemove: string[] = [];

      for (const [id, file] of Object.entries(state.files)) {
        if (
          (file.status === 'success' || file.status === 'error' || file.status === 'canceled') &&
          file.updatedAt < cutoff
        ) {
          idsToRemove.push(id);
        }
      }

      if (idsToRemove.length === 0) {
        return state;
      }

      const nextFiles = { ...state.files };
      const nextAttachmentIndex = { ...state.attachmentIndex };
      const nextBatchIds = { ...state.currentBatchFileIds };
      let nextState = state;
      for (const id of idsToRemove) {
        // Reuse REMOVE_FILE logic inline to avoid recursive dispatch
        const file = nextState.files[id];
        if (!file) {
          continue;
        }

        delete nextFiles[id];

        if (file.attachmentId) {
          delete nextAttachmentIndex[file.attachmentId];
        }

        delete nextBatchIds[id];

        const shouldSubtract = isCountedInBytes(file.status);
        const nextBytes = shouldSubtract
          ? {
              ...nextState.byteTotals,
              totalBytes: Math.max(0, nextState.byteTotals.totalBytes - (file.totalBytes ?? 0)),
              uploadedBytes: Math.max(
                0,
                nextState.byteTotals.uploadedBytes - (file.uploadedBytes ?? 0)
              ),
              processingCount: isActiveProcessingState(file.processingState)
                ? Math.max(0, nextState.byteTotals.processingCount - 1)
                : nextState.byteTotals.processingCount,
            }
          : nextState.byteTotals;

        let nextAggRaw = {
          ...nextState.aggregates,
          total: Math.max(0, nextState.aggregates.total - 1),
        };
        nextAggRaw = incStatus(nextAggRaw, file.status, -1);

        nextState = {
          ...nextState,
          files: nextFiles,
          attachmentIndex: nextAttachmentIndex,
          currentBatchFileIds: nextBatchIds,
          byteTotals: nextBytes,
          aggregates: nextAggRaw,
        };
      }

      return {
        ...nextState,
        aggregates: recomputeDerived(nextState),
      };
    }

    case 'GLOBAL_ERROR': {
      return {
        ...state,
        globalError: action.error,
      };
    }

    case 'CLEAR_GLOBAL_ERROR': {
      return {
        ...state,
        globalError: null,
      };
    }

    case 'BATCH_APPEND': {
      const nextIds: Record<string, true> = { ...state.currentBatchFileIds };

      for (const id of action.fileIds) {
        nextIds[id] = true;
      }

      const nextState: EngineState = {
        ...state,
        currentBatchFileIds: nextIds,
      };

      return {
        ...nextState,
        aggregates: recomputeDerived(nextState),
      };
    }

    // =====================================================
    // QUEUE MANAGEMENT (Engine-owned)
    // =====================================================

    case 'QUEUE_ADD': {
      const { folderKey, fileCount, virtualIds } = action;

      return {
        ...state,
        queue: {
          ...state.queue,
          [folderKey]: (state.queue[folderKey] || 0) + fileCount,
        },
        queueVirtualIds: {
          ...state.queueVirtualIds,
          [folderKey]: [...(state.queueVirtualIds[folderKey] || []), ...virtualIds],
        },
      };
    }

    case 'QUEUE_REMOVE': {
      const { folderKey } = action;
      const nextQueue = { ...state.queue };
      const nextVirtualIds = { ...state.queueVirtualIds };

      delete nextQueue[folderKey];
      delete nextVirtualIds[folderKey];

      return {
        ...state,
        queue: nextQueue,
        queueVirtualIds: nextVirtualIds,
      };
    }

    case 'QUEUE_FLUSH_START': {
      return {
        ...state,
        isFlushing: true,
      };
    }

    case 'QUEUE_FLUSH_COMPLETE': {
      return {
        ...state,
        isFlushing: false,
      };
    }

    case 'SET_ACTIVE_BATCH_FOLDER': {
      return {
        ...state,
        activeBatchFolderKey: action.folderKey,
      };
    }

    default: {
      return state;
    }
  }
}
