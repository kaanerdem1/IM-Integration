import { afterEach, describe, expect, it, vi } from 'vitest';
import { reducer } from './reducer';
import { initialEngineState, UploadFileState } from './types';

const createFile = (overrides: Partial<UploadFileState> = {}): UploadFileState => ({
  id: 'file-1',
  name: 'document.pdf',
  type: 'application/pdf',
  size: 100,
  extension: 'pdf',
  relativePath: null,
  formId: null,
  formKey: null,
  progress: 50,
  uploadedBytes: 50,
  totalBytes: 100,
  status: 'uploading',
  attempts: 0,
  canRetry: false,
  errorMessage: null,
  attachmentId: null,
  uploadJobId: null,
  processingState: null,
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
});

describe('upload reducer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores the attachment id without inventing a backend processing state', () => {
    const withFile = reducer(initialEngineState, {
      type: 'ADD_FILE',
      file: createFile(),
    });

    const next = reducer(withFile, {
      type: 'UPLOAD_SUCCESS',
      id: 'file-1',
      attachmentId: 'attachment-1',
    });

    expect(next.files['file-1']).toMatchObject({
      attachmentId: 'attachment-1',
      processingState: null,
      status: 'success',
    });
    expect(next.attachmentIndex).toEqual({ 'attachment-1': 'file-1' });
    expect(next.byteTotals.processingCount).toBe(0);
    expect(next.aggregates.socketProcessing).toBe(0);
  });

  it('keeps the active processing count correct across socket state transitions', () => {
    const withFile = reducer(initialEngineState, {
      type: 'ADD_FILE',
      file: createFile({
        attachmentId: 'attachment-1',
        processingState: 'queued',
        status: 'success',
        uploadedBytes: 100,
      }),
    });
    const initialized = reducer(withFile, {
      type: 'MULTIPART_INIT',
      id: 'file-1',
      attachmentId: 'attachment-1',
      uploadJobId: 'job-1',
    });

    const processing = reducer(initialized, {
      type: 'UPDATE_PROCESSING_STATE',
      attachmentId: 'attachment-1',
      processingState: 'processing',
    });
    const completed = reducer(processing, {
      type: 'UPDATE_PROCESSING_STATE',
      attachmentId: 'attachment-1',
      processingState: 'completed',
    });

    expect(initialized.byteTotals.processingCount).toBe(1);
    expect(processing.byteTotals.processingCount).toBe(1);
    expect(completed.byteTotals.processingCount).toBe(0);
    expect(completed.aggregates.socketProcessing).toBe(0);
  });

  it('prunes successful uploads after the terminal-state retention period', () => {
    const dateNow = vi.spyOn(Date, 'now');
    dateNow.mockReturnValue(100);
    const withFile = reducer(initialEngineState, {
      type: 'ADD_FILE',
      file: createFile(),
    });
    const uploaded = reducer(withFile, {
      type: 'UPLOAD_SUCCESS',
      id: 'file-1',
      attachmentId: 'attachment-1',
    });

    dateNow.mockReturnValue(200);
    const pruned = reducer(uploaded, {
      type: 'PRUNE_TERMINAL_FILES',
      maxAgeMs: 50,
    });

    expect(pruned.files).toEqual({});
    expect(pruned.attachmentIndex).toEqual({});
    expect(pruned.aggregates.total).toBe(0);
  });

  it('bulk-prunes only expired terminal files without mutating the previous state', () => {
    const dateNow = vi.spyOn(Date, 'now');
    const files = [
      createFile({ id: 'success', status: 'success', uploadedBytes: 100, attachmentId: 'a1' }),
      createFile({ id: 'error', status: 'error' }),
      createFile({ id: 'canceled', status: 'canceled' }),
      createFile({ id: 'active', status: 'uploading' }),
      createFile({
        id: 'recent',
        status: 'success',
        updatedAt: 180,
        uploadedBytes: 100,
        attachmentId: 'a2',
      }),
    ];
    const state = files.reduce((current, file) => {
      dateNow.mockReturnValue(file.updatedAt);
      return reducer(current, { type: 'ADD_FILE', file });
    }, initialEngineState);
    dateNow.mockReturnValue(200);
    const batched = {
      ...state,
      attachmentIndex: { a1: 'success', a2: 'recent' },
      currentBatchFileIds: { success: true, active: true, recent: true } as const,
    };
    const snapshot = structuredClone(batched);
    const next = reducer(batched, { type: 'PRUNE_TERMINAL_FILES', maxAgeMs: 50 });

    expect(Object.keys(next.files)).toEqual(['active', 'recent']);
    expect(next.attachmentIndex).toEqual({ a2: 'recent' });
    expect(next.currentBatchFileIds).toEqual({ active: true, recent: true });
    expect(next.byteTotals).toEqual({ totalBytes: 200, uploadedBytes: 150, processingCount: 0 });
    expect(next.aggregates).toMatchObject({
      total: 2,
      success: 1,
      error: 0,
      canceled: 0,
      uploading: 1,
      batchDone: false,
    });
    expect(next.files.active).toBe(batched.files.active);
    expect(batched).toEqual(snapshot);
    expect(reducer(next, { type: 'PRUNE_TERMINAL_FILES', maxAgeMs: 50 })).toBe(next);
  });
});
