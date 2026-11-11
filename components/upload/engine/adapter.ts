import Uppy, { type UppyEventMap } from '@uppy/core';
import GoldenRetriever from '@uppy/golden-retriever';
import { processUploadError } from '@/components/upload/_helper/errorHandler';
import { UPLOAD_CONFIG } from '@/components/upload/config';
import { UploadEngine, UploadEngineConfig } from '@/components/upload/engine/engine';
import { UploadFileState } from '@/components/upload/engine/types';
import { postBase64Attachment } from '@/components/upload/uppy/_methods/_postBase64Attachment';
import type { UploadFileBody, UploadFileMeta, UploadUppy } from '@/components/upload/uppy/type';

function extractExtension(name: string): string | undefined {
  const idx = name.lastIndexOf('.');
  if (idx <= 0) {
    return undefined;
  }
  const ext = name
    .slice(idx + 1)
    .trim()
    .toLowerCase();
  return ext.length ? ext : undefined;
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  if (error && typeof error === 'object' && 'name' in error) {
    return (error as { name?: string }).name === 'AbortError';
  }
  return false;
}

const UPLOAD_PROGRESS_DISPATCH_INTERVAL_MS = 100;

export const shouldDispatchUploadProgress = ({
  lastDispatchedAt,
  now,
  totalBytes,
  uploadedBytes,
}: {
  lastDispatchedAt: number | null;
  now: number;
  totalBytes: number;
  uploadedBytes: number;
}) => {
  if (totalBytes > 0 && uploadedBytes >= totalBytes) {
    return true;
  }

  return (
    lastDispatchedAt === null || now - lastDispatchedAt >= UPLOAD_PROGRESS_DISPATCH_INTERVAL_MS
  );
};

export const getUploadMaxFileSize = (restrictions?: Record<string, unknown>) => {
  const configuredMaxFileSize = restrictions?.maxFileSize;

  if (typeof configuredMaxFileSize !== 'number' || !Number.isFinite(configuredMaxFileSize)) {
    return UPLOAD_CONFIG.MAX_BASE64_FILE_SIZE_BYTES;
  }

  return Math.min(configuredMaxFileSize, UPLOAD_CONFIG.MAX_BASE64_FILE_SIZE_BYTES);
};

export class UppyAdapter {
  private engine: UploadEngine;
  private uppy: UploadUppy;
  private eventCleanups: Array<() => void> = [];
  private isDestroyed = false;

  private readonly maxConcurrent: number;
  private queue: string[] = [];
  private inFlight = 0;
  private activeControllers = new Map<string, AbortController>();
  private pendingResumes = new Set<string>();
  private retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private lastProgressDispatchAt = new Map<string, number>();
  private pausedIds = new Set<string>();
  private canceledIds = new Set<string>();

  constructor(engine: UploadEngine, config: UploadEngineConfig) {
    this.engine = engine;
    this.maxConcurrent = Math.max(1, engine.getRuntimeConfig().upload.concurrentUploads);

    this.uppy = new Uppy<UploadFileMeta, UploadFileBody>({
      autoProceed: false,
      allowMultipleUploadBatches: true,
      restrictions: {
        maxNumberOfFiles: null,
        minNumberOfFiles: null,
        ...(config?.restrictions ?? {}),
        maxFileSize: getUploadMaxFileSize(config?.restrictions),
      },
      infoTimeout: 5000,
    });

    if (config.meta) {
      this.uppy.setMeta(config.meta);
    }

    const runtimeConfig = engine.getRuntimeConfig();
    if (runtimeConfig.features.crashRecovery) {
      this.uppy.use(GoldenRetriever, {
        serviceWorker: false,
      });
    }

    this.bindEvents();
  }

  private bindEvents() {
    const on = <K extends keyof UppyEventMap<UploadFileMeta, UploadFileBody>>(
      event: K,
      handler: UppyEventMap<UploadFileMeta, UploadFileBody>[K]
    ) => {
      this.uppy.on(event, handler);
      this.eventCleanups.push(() => {
        try {
          this.uppy.off(event, handler);
        } catch {
          // noop
        }
      });
    };

    on('file-added', (file) => {
      if (!file || this.isDestroyed) {
        return;
      }

      const item: UploadFileState = {
        id: file.id,
        name: file.name,
        type: file.type ?? '',
        size: file.size ?? 0,
        extension: extractExtension(file.name),
        relativePath: file.meta?.relativePath ?? null,
        formId: typeof file.meta?.formId === 'string' ? file.meta.formId : null,
        formKey: typeof file.meta?.formKey === 'string' ? file.meta.formKey : null,
        progress: 0,
        uploadedBytes: 0,
        totalBytes: file.size ?? 0,
        status: 'queued',
        attempts: 0,
        canRetry: false,
        errorMessage: null,
        attachmentId: file.meta?.attachmentId ?? null,
        uploadJobId: null,
        processingState: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.engine.dispatch({ type: 'ADD_FILE', file: item });
    });

    on('restriction-failed', (file, error) => {
      if (!file || this.isDestroyed) {
        return;
      }

      const categorizedError = processUploadError(error, file.name);

      this.engine.dispatch({
        type: 'ERROR',
        id: file.id,
        errorMessage: categorizedError.message,
        error: {
          ...error,
          category: categorizedError.category,
          userMessage: categorizedError.message,
          technicalMessage: categorizedError.technicalMessage,
          isRetryable: categorizedError.isRetryable,
          userAction: categorizedError.userAction,
        },
      });
    });

    on('error', (error) => {
      if (this.isDestroyed) {
        return;
      }

      this.engine.dispatch({
        type: 'GLOBAL_ERROR',
        error: {
          message: error.message,
          actionId: Date.now(),
        },
      });
    });
  }

  private enqueueUpload(id: string, prioritize = false): void {
    if (this.isDestroyed || this.queue.includes(id)) {
      return;
    }
    const activeController = this.activeControllers.get(id);
    if (activeController) {
      if (activeController.signal.aborted) {
        this.pendingResumes.add(id);
      }
      return;
    }

    if (prioritize) {
      this.queue.unshift(id);
    } else {
      this.queue.push(id);
    }
    this.processQueue();
  }

  private clearRetryTimer(id: string): void {
    const timer = this.retryTimers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.retryTimers.delete(id);
    }
  }

  private processQueue(): void {
    if (this.isDestroyed) {
      return;
    }

    while (this.inFlight < this.maxConcurrent && this.queue.length > 0) {
      const nextId = this.queue.shift();
      if (!nextId || this.pausedIds.has(nextId) || this.canceledIds.has(nextId)) {
        continue;
      }

      this.inFlight += 1;
      void this.performUpload(nextId).finally(() => {
        this.inFlight = Math.max(0, this.inFlight - 1);
        this.processQueue();
      });
    }
  }

  private async performUpload(id: string): Promise<void> {
    if (this.isDestroyed || this.pausedIds.has(id) || this.canceledIds.has(id)) {
      return;
    }

    const file = this.uppy.getFile(id);
    if (!file) {
      return;
    }

    const fileSize = file.size ?? 0;
    this.lastProgressDispatchAt.delete(id);
    this.engine.dispatch({ type: 'UPLOAD_START', id });
    this.engine.dispatch({ type: 'PROGRESS', id, uploadedBytes: 0, totalBytes: fileSize });

    const controller = new AbortController();
    this.activeControllers.set(id, controller);

    try {
      const result = await postBase64Attachment(file, {
        signal: controller.signal,
        onProgress: (uploadedBytes, totalBytes) => {
          if (
            this.isDestroyed ||
            controller.signal.aborted ||
            this.pausedIds.has(id) ||
            this.canceledIds.has(id)
          ) {
            return;
          }

          const mappedUploaded =
            totalBytes > 0 && fileSize > 0
              ? Math.round((uploadedBytes / totalBytes) * fileSize)
              : uploadedBytes;

          const now = Date.now();
          if (
            !shouldDispatchUploadProgress({
              lastDispatchedAt: this.lastProgressDispatchAt.get(id) ?? null,
              now,
              totalBytes: fileSize,
              uploadedBytes: mappedUploaded,
            })
          ) {
            return;
          }

          this.lastProgressDispatchAt.set(id, now);

          this.engine.dispatch({
            type: 'PROGRESS',
            id,
            uploadedBytes: Math.min(fileSize, Math.max(0, mappedUploaded)),
            totalBytes: fileSize,
          });
        },
      });

      if (
        this.isDestroyed ||
        controller.signal.aborted ||
        this.pausedIds.has(id) ||
        this.canceledIds.has(id)
      ) {
        return;
      }

      if (result.attachmentId) {
        this.uppy.setFileMeta(id, { attachmentId: result.attachmentId });
      }

      this.engine.dispatch({
        type: 'UPLOAD_SUCCESS',
        id,
        attachmentId: result.attachmentId ?? null,
      });
    } catch (error) {
      if (
        this.isDestroyed ||
        controller.signal.aborted ||
        isAbortError(error) ||
        this.pausedIds.has(id) ||
        this.canceledIds.has(id)
      ) {
        return;
      }

      const categorizedError = processUploadError(error, file.name);
      const currentFile = this.engine.getState().files[id];
      const currentAttempts = currentFile?.attempts ?? 0;
      const MAX_AUTO_RETRY_ATTEMPTS = 2;
      const shouldAutoRetry =
        categorizedError.isRetryable && currentAttempts < MAX_AUTO_RETRY_ATTEMPTS;

      if (shouldAutoRetry) {
        const timer = setTimeout(() => {
          this.retryTimers.delete(id);
          if (
            !this.isDestroyed &&
            !this.pausedIds.has(id) &&
            !this.canceledIds.has(id) &&
            this.engine.getState().files[id]?.status === 'uploading'
          ) {
            this.engine.retryFile(id);
          }
        }, 1000);
        this.retryTimers.set(id, timer);
        return;
      }

      this.engine.dispatch({
        type: 'ERROR',
        id,
        errorMessage: categorizedError.message,
        error: {
          category: categorizedError.category,
          userMessage: categorizedError.message,
          technicalMessage: categorizedError.technicalMessage,
          isRetryable: categorizedError.isRetryable,
          userAction: categorizedError.userAction,
        },
      });
    } finally {
      this.activeControllers.delete(id);
      this.lastProgressDispatchAt.delete(id);
      if (
        this.pendingResumes.delete(id) &&
        !this.isDestroyed &&
        !this.pausedIds.has(id) &&
        !this.canceledIds.has(id)
      ) {
        this.enqueueUpload(id, true);
      }
      this.canceledIds.delete(id);
    }
  }

  startFiles(ids: string[]): void {
    for (const id of ids) {
      this.pausedIds.delete(id);
      this.canceledIds.delete(id);
      this.enqueueUpload(id);
    }
  }

  startFile(id: string): void {
    if (this.isDestroyed) {
      if (UPLOAD_CONFIG.ENABLE_DEBUG) {
        console.warn('[Adapter] Cannot start file: adapter is destroyed');
      }
      return;
    }

    this.pausedIds.delete(id);
    this.canceledIds.delete(id);
    this.enqueueUpload(id, true);
  }

  retryFile(id: string): void {
    if (this.isDestroyed) {
      return;
    }

    this.clearRetryTimer(id);
    this.pausedIds.delete(id);
    this.canceledIds.delete(id);
    this.enqueueUpload(id, true);
  }

  cancelFile(id: string): void {
    this.removeFiles([id]);
  }

  removeFile(id: string): void {
    this.removeFiles([id]);
  }

  removeFiles(ids: string[]): void {
    if (this.isDestroyed) {
      return;
    }

    const idSet = new Set(ids);
    for (const id of ids) {
      this.clearRetryTimer(id);
      this.pendingResumes.delete(id);
      this.pausedIds.delete(id);
      this.lastProgressDispatchAt.delete(id);
      const controller = this.activeControllers.get(id);
      if (controller) {
        this.canceledIds.add(id);
        controller.abort();
      } else {
        this.canceledIds.delete(id);
      }
    }
    this.queue = this.queue.filter((queuedId) => !idSet.has(queuedId));

    try {
      const existingIds = ids.filter((id) => this.uppy.getFile(id));
      if (existingIds.length > 0) {
        this.uppy.removeFiles(existingIds);
      }
    } catch {
      // noop
    }
  }

  pauseFile(id: string): void {
    if (this.isDestroyed) {
      return;
    }

    this.clearRetryTimer(id);
    this.pendingResumes.delete(id);
    this.pausedIds.add(id);
    this.queue = this.queue.filter((queuedId) => queuedId !== id);

    const controller = this.activeControllers.get(id);
    if (controller) {
      controller.abort();
    }
  }

  resumeFile(id: string): void {
    if (this.isDestroyed) {
      return;
    }

    this.pausedIds.delete(id);
    this.canceledIds.delete(id);
    if (this.activeControllers.has(id)) {
      this.pendingResumes.add(id);
      return;
    }
    this.enqueueUpload(id, true);
  }

  prepareForNewBatch(): void {
    const removableIds: string[] = [];
    for (const file of this.uppy.getFiles()) {
      const state = this.engine.getState().files[file.id];
      if (
        !state ||
        state.status === 'success' ||
        state.status === 'canceled' ||
        (state.status === 'error' && !state.canRetry)
      ) {
        removableIds.push(file.id);
      }
    }
    if (removableIds.length > 0) {
      this.uppy.removeFiles(removableIds);
    }
  }

  destroy() {
    if (this.isDestroyed) {
      return;
    }

    this.isDestroyed = true;
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();
    this.queue = [];
    this.pausedIds.clear();
    this.canceledIds.clear();
    this.pendingResumes.clear();

    for (const controller of this.activeControllers.values()) {
      controller.abort();
    }
    this.activeControllers.clear();
    this.lastProgressDispatchAt.clear();

    for (const cleanup of this.eventCleanups) {
      try {
        cleanup();
      } catch {
        // noop
      }
    }
    this.eventCleanups = [];

    try {
      this.uppy.cancelAll();
    } catch {
      // noop
    }

    try {
      this.uppy.destroy();
    } catch {
      // noop
    }
  }

  getUppyInstance(): UploadUppy {
    return this.uppy;
  }
}
