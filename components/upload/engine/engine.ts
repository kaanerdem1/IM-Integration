import mitt, { Emitter } from 'mitt';
import type { UploadRuntimeConfig } from '@/components/upload/_config/uploadConfig';
import {
  DEFAULT_UPLOAD_CONFIG,
  validateUploadConfig,
} from '@/components/upload/_config/uploadConfig';
import { Mutex } from '@/components/upload/_helper/mutex';
import { UPLOAD_CONFIG } from '@/components/upload/config';
import type { UploadUppy } from '@/components/upload/uppy/type';
import type { EngineAction } from './actions';
import { UppyAdapter } from './adapter';
import type { UploadEngineEvents } from './events';
import { reducer } from './reducer';
import { EngineState, initialEngineState, MultipartMeta } from './types';

// =====================================================
// LEAN ARCHITECTURE HELPERS
// =====================================================

type BatchKey = '__default__';
const DEFAULT_BATCH_KEY: BatchKey = '__default__';

function getFileSignature(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function deduplicateFiles(files: File[], existingFiles: File[]): File[] {
  const existingSigs = new Set(existingFiles.map(getFileSignature));
  return files.filter((f) => !existingSigs.has(getFileSignature(f)));
}

type Listener = (state: EngineState) => void;

export interface UploadEngineConfig {
  meta?: MultipartMeta;
  restrictions?: Record<string, unknown>;
  runtimeConfig?: UploadRuntimeConfig;
}

export class UploadEngine {
  private state: EngineState = initialEngineState;
  private listeners = new Set<Listener>();
  private adapter: UppyAdapter | null = null;
  private config: UploadEngineConfig;
  private runtimeConfig: UploadRuntimeConfig;
  private emitter: Emitter<UploadEngineEvents>;
  private destroyed = false;

  // LEAN: Queue orchestration ownership
  private flushMutex = new Mutex();
  // H5: Auto-cleanup for terminal state files
  private pruneTimerId: ReturnType<typeof setInterval> | null = null;
  private static readonly PRUNE_INTERVAL_MS = 30_000; // Check every 30s
  private static readonly PRUNE_MAX_AGE_MS = 60_000; // Remove after 60s in terminal state

  // H6: File storage separate from reactive state
  private queuedFileStore = new Map<string, File[]>();

  constructor(config: UploadEngineConfig) {
    this.config = config;
    this.runtimeConfig = config.runtimeConfig ?? DEFAULT_UPLOAD_CONFIG;

    // LEAN: Validate config at construction time
    validateUploadConfig(this.runtimeConfig);

    this.emitter = mitt<UploadEngineEvents>();
    this.createNewAdapter();
    this.startPruneTimer();
  }

  private createNewAdapter(): void {
    this.adapter = new UppyAdapter(this, this.config);
  }

  private startPruneTimer(): void {
    this.pruneTimerId = setInterval(() => {
      this.dispatch({ type: 'PRUNE_TERMINAL_FILES', maxAgeMs: UploadEngine.PRUNE_MAX_AGE_MS });
    }, UploadEngine.PRUNE_INTERVAL_MS);
  }

  private stopPruneTimer(): void {
    if (this.pruneTimerId) {
      clearInterval(this.pruneTimerId);
      this.pruneTimerId = null;
    }
  }

  getState(): EngineState {
    return this.state;
  }

  getRuntimeConfig(): UploadRuntimeConfig {
    return this.runtimeConfig;
  }

  restart(): void {
    if (this.destroyed) {
      return;
    }

    this.stopPruneTimer();
    this.state = initialEngineState;
    this.queuedFileStore.clear();
    this.emit();

    if (this.adapter) {
      this.adapter.destroy();
      this.adapter = null;
    }

    this.createNewAdapter();
    this.startPruneTimer();
  }

  getUppyInstance(): UploadUppy | null {
    if (!this.adapter) {
      return null;
    }
    return this.adapter.getUppyInstance();
  }

  dispatch(action: EngineAction): void {
    if (this.destroyed) {
      return;
    }

    const prevState = this.state;
    const next = reducer(this.state, action);

    if (next !== this.state) {
      this.state = next;
      this.emit();
      this.emitEventsForAction(action, prevState, next);
      if (action.type === 'REMOVE_FILE') {
        this.adapter?.removeFile(action.id);
      } else if (action.type === 'PRUNE_TERMINAL_FILES') {
        const removedIds = Object.keys(prevState.files).filter((id) => !next.files[id]);
        if (removedIds.length > 0) {
          this.adapter?.removeFiles(removedIds);
        }
      }
    }

    // Batch completion check: runs AFTER dispatch, deferred via queueMicrotask
    this.checkBatchCompletion(prevState, next);
  }

  subscribe(listener: Listener): () => void {
    if (this.destroyed) {
      return () => undefined;
    }

    this.listeners.add(listener);
    listener(this.state);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.stopPruneTimer();
    this.queuedFileStore.clear();
    this.listeners.clear();
    this.emitter.all.clear();
    this.adapter?.destroy();
    this.adapter = null;
  }

  // ----------------------
  // Adapter delegation
  // ----------------------

  startFile(id: string): void {
    this.dispatch({ type: 'UPLOAD_START', id });
    this.adapter?.startFile(id);
  }

  retryFile(id: string): void {
    this.dispatch({ type: 'RETRY', id });
    this.adapter?.retryFile(id);
  }

  cancelFile(id: string): void {
    this.dispatch({ type: 'CANCEL', id });
    this.adapter?.cancelFile(id);
  }

  pauseFile(id: string): void {
    this.dispatch({ type: 'PAUSE', id });
    this.adapter?.pauseFile(id);
  }

  resumeFile(id: string): void {
    this.dispatch({ type: 'RESUME', id });
    this.adapter?.resumeFile(id);
  }

  // =====================================================
  // LEAN ARCHITECTURE: Queue Orchestration
  // =====================================================

  /**
   * Set active folder for uploads
   * LEAN: Engine updates folder plugin (provider delegates here)
   */
  setActiveFolder(_folderId: string | null): void {
    // Folder structure has been removed from upload flow.
  }

  /**
   * Add files to upload (LEAN: Engine makes all decisions)
   */
  async addFiles(
    filesInput: FileList | File[],
    meta?: { formId?: string | null; formKey?: string | null }
  ): Promise<void> {
    const batchKey = DEFAULT_BATCH_KEY;

    // Deduplication: Compare with existing queue (File objects in private store)
    const existingInQueue = this.queuedFileStore.get(batchKey) ?? [];
    const files = deduplicateFiles(Array.from(filesInput), existingInQueue);

    if (files.length === 0) {
      if (UPLOAD_CONFIG.ENABLE_DEBUG) {
        console.warn('[UploadEngine] All files already in queue, skipping');
      }
      return;
    }

    // BATCHING LOGIC:
    // Files are grouped by folder ID. Only one batch can be active at a time.
    // - Same folder + no active batch → Start new batch immediately
    // - Same folder + active batch for this folder → Append to active batch
    // - Different folder + active batch → Queue and show placeholders

    // 1) No active batch → start immediately
    if (this.state.activeBatchFolderKey === null) {
      await this.startBatch(batchKey, files, [], meta);
      return;
    }

    // 2) Active batch exists and same folder → append
    if (this.state.activeBatchFolderKey === batchKey) {
      await this.appendToBatch(batchKey, files, meta);
      return;
    }

    const virtualIds: string[] = [];

    for (const file of files) {
      const virtualId = `queued-${crypto.randomUUID()}`;
      virtualIds.push(virtualId);

      this.dispatch({
        type: 'ADD_FILE',
        file: {
          id: virtualId,
          name: file.name,
          type: file.type,
          size: file.size,
          extension: file.name.split('.').pop(),
          relativePath: file.name,
          formId: meta?.formId ?? null,
          formKey: meta?.formKey ?? null,
          progress: 0,
          uploadedBytes: 0,
          totalBytes: file.size,
          status: 'queued',
          attempts: 0,
          canRetry: false,
          errorMessage: null,
          uploadJobId: null,
          attachmentId: null,
          processingState: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      });
    }

    // Store File objects in private (non-reactive) map
    const existing = this.queuedFileStore.get(batchKey) ?? [];
    this.queuedFileStore.set(batchKey, [...existing, ...files]);

    this.dispatch({
      type: 'QUEUE_ADD',
      folderKey: batchKey,
      fileCount: files.length,
      virtualIds,
    });
  }

  /**
   * Flush next batch from queue (mutex-protected)
   */
  async flushNextBatch(): Promise<void> {
    return this.flushMutex.runExclusive(async () => {
      const st = this.state;

      if (st.isFlushing) {
        return;
      }

      if (st.activeBatchFolderKey !== null) {
        return;
      }

      if (!this.adapter) {
        return;
      }

      const keys = Object.keys(st.queue);
      if (keys.length === 0) {
        return;
      }

      const nextKey = keys[0] as BatchKey;
      const files = this.queuedFileStore.get(nextKey) ?? [];

      if (files.length === 0) {
        this.queuedFileStore.delete(nextKey);
        this.dispatch({ type: 'QUEUE_REMOVE', folderKey: nextKey });
        return;
      }

      // CRITICAL: Read virtualIds BEFORE removing from queue
      const virtualIds = st.queueVirtualIds[nextKey] ?? [];

      this.queuedFileStore.delete(nextKey);
      this.dispatch({ type: 'QUEUE_REMOVE', folderKey: nextKey });

      try {
        await this.startBatch(nextKey, files, virtualIds);
      } catch (err) {
        // Re-queue on failure
        this.queuedFileStore.set(nextKey, files);
        this.dispatch({
          type: 'QUEUE_ADD',
          folderKey: nextKey,
          fileCount: files.length,
          virtualIds,
        });
        this.dispatch({ type: 'SET_ACTIVE_BATCH_FOLDER', folderKey: null });
        this.dispatch({ type: 'QUEUE_FLUSH_COMPLETE' });
      }
    });
  }

  /**
   * Start a new batch
   */
  private async startBatch(
    folderKey: BatchKey,
    files: File[],
    virtualIds: string[] = [],
    meta?: { formId?: string | null; formKey?: string | null }
  ): Promise<void> {
    const uppy = this.adapter?.getUppyInstance();
    if (!uppy) {
      return;
    }

    this.adapter?.prepareForNewBatch();

    // Remove virtual placeholders
    for (const id of virtualIds) {
      this.dispatch({ type: 'REMOVE_FILE', id });
    }

    this.dispatch({ type: 'SET_ACTIVE_BATCH_FOLDER', folderKey });
    this.dispatch({ type: 'QUEUE_FLUSH_START' });

    const addedIds: string[] = [];

    for (const file of files) {
      try {
        const id = await uppy.addFile({
          name: file.name,
          type: file.type,
          data: file,
          meta: {
            formId: meta?.formId ?? null,
            formKey: meta?.formKey ?? null,
          },
        });

        if (typeof id === 'string' && id.length > 0) {
          addedIds.push(id);
        }
      } catch (err) {
        // Error adding file → dispatch error file
        this.dispatch({
          type: 'ADD_FILE',
          file: {
            id: `error-${crypto.randomUUID()}`,
            name: file.name,
            type: file.type,
            size: file.size,
            extension: file.name.split('.').pop(),
            relativePath: file.name,
            formId: meta?.formId ?? null,
            formKey: meta?.formKey ?? null,
            progress: 0,
            uploadedBytes: 0,
            totalBytes: file.size,
            status: 'error',
            attempts: 0,
            canRetry: false,
            errorMessage:
              err && typeof err === 'object' && 'message' in err
                ? String((err as any).message)
                : 'Upload error',
            uploadJobId: null,
            attachmentId: null,
            processingState: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        });
      }
    }

    if (addedIds.length > 0) {
      this.dispatch({ type: 'BATCH_START', fileIds: addedIds });
    }

    // Flush is complete once batch starts (not when upload finishes)
    // This allows next queue flush to proceed immediately
    this.dispatch({ type: 'QUEUE_FLUSH_COMPLETE' });

    if (addedIds.length > 0) {
      this.adapter?.startFiles(addedIds);
    }
  }

  /**
   * Append files to active batch
   */
  private async appendToBatch(
    folderKey: BatchKey,
    files: File[],
    meta?: { formId?: string | null; formKey?: string | null }
  ): Promise<void> {
    const uppy = this.adapter?.getUppyInstance();
    if (!uppy) {
      return;
    }

    // Guard: Check batch still active
    if (this.state.activeBatchFolderKey !== folderKey) {
      if (UPLOAD_CONFIG.ENABLE_DEBUG) {
        console.warn('[UploadEngine] Active batch changed during append, aborting');
      }
      return;
    }

    const addedIds: string[] = [];

    for (const file of files) {
      try {
        const id = await uppy.addFile({
          name: file.name,
          type: file.type,
          data: file,
          meta: {
            formId: meta?.formId ?? null,
            formKey: meta?.formKey ?? null,
          },
        });

        if (typeof id === 'string' && id.length > 0) {
          addedIds.push(id);
        }
      } catch (err) {
        this.dispatch({
          type: 'ADD_FILE',
          file: {
            id: `error-${crypto.randomUUID()}`,
            name: file.name,
            type: file.type,
            size: file.size,
            extension: file.name.split('.').pop(),
            relativePath: file.name,
            formId: meta?.formId ?? null,
            formKey: meta?.formKey ?? null,
            progress: 0,
            uploadedBytes: 0,
            totalBytes: file.size,
            status: 'error',
            attempts: 0,
            canRetry: false,
            errorMessage:
              err && typeof err === 'object' && 'message' in err
                ? String((err as any).message)
                : 'Upload error',
            uploadJobId: null,
            attachmentId: null,
            processingState: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        });
      }
    }

    if (addedIds.length > 0) {
      if (this.state.activeBatchFolderKey !== folderKey) {
        return;
      }

      this.dispatch({ type: 'BATCH_APPEND', fileIds: addedIds });

      this.adapter?.startFiles(addedIds);
    }
  }

  // ----------------------
  // Event emitter methods
  // ----------------------

  /**
   * Subscribe to upload engine events
   */
  on<K extends keyof UploadEngineEvents>(
    event: K,
    handler: (data: UploadEngineEvents[K]) => void
  ): void {
    this.emitter.on(event, handler);
  }

  /**
   * Unsubscribe from upload engine events
   */
  off<K extends keyof UploadEngineEvents>(
    event: K,
    handler: (data: UploadEngineEvents[K]) => void
  ): void {
    this.emitter.off(event, handler);
  }

  /**
   * Emit events based on actions and state changes
   */
  private emitEventsForAction(
    action: EngineAction,
    _prevState: EngineState,
    _nextState: EngineState
  ): void {
    switch (action.type) {
      case 'BATCH_START': {
        this.emitter.emit('batch:start', {
          batchId: null,
          fileCount: action.fileIds.length,
        });
        break;
      }

      case 'BATCH_APPEND': {
        this.emitter.emit('batch:append', {
          batchId: null,
          fileCount: action.fileIds.length,
        });
        break;
      }

      case 'BATCH_CLEAR': {
        this.emitter.emit('batch:clear', undefined);
        break;
      }

      default:
        break;
    }
  }

  /**
   * Check batch completion and dispatch follow-up actions via queueMicrotask
   * to avoid re-entrant dispatch within emitEventsForAction.
   */
  private checkBatchCompletion(prevState: EngineState, nextState: EngineState): void {
    if (!prevState.aggregates.batchDone && nextState.aggregates.batchDone) {
      queueMicrotask(() => {
        if (this.destroyed) {
          return;
        }

        this.emitter.emit('batch:complete', { batchId: null });
        this.dispatch({ type: 'BATCH_CLEAR' });
        this.dispatch({ type: 'SET_ACTIVE_BATCH_FOLDER', folderKey: null });
        void this.flushNextBatch();
      });
    }
  }
}
