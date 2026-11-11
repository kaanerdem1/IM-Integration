import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_UPLOAD_CONFIG } from '@/components/upload/_config/uploadConfig';
import { getUploadMaxFileSize, shouldDispatchUploadProgress } from './adapter';
import { UploadEngine } from './engine';

const postBase64Attachment = vi.hoisted(() => vi.fn());
vi.mock('@/components/upload/uppy/_methods/_postBase64Attachment', () => ({
  postBase64Attachment,
}));

describe('shouldDispatchUploadProgress', () => {
  it('throttles intermediate progress events but keeps the final event', () => {
    expect(
      shouldDispatchUploadProgress({
        lastDispatchedAt: null,
        now: 1_000,
        totalBytes: 100,
        uploadedBytes: 10,
      })
    ).toBe(true);
    expect(
      shouldDispatchUploadProgress({
        lastDispatchedAt: 1_000,
        now: 1_050,
        totalBytes: 100,
        uploadedBytes: 20,
      })
    ).toBe(false);
    expect(
      shouldDispatchUploadProgress({
        lastDispatchedAt: 1_000,
        now: 1_100,
        totalBytes: 100,
        uploadedBytes: 30,
      })
    ).toBe(true);
    expect(
      shouldDispatchUploadProgress({
        lastDispatchedAt: 1_000,
        now: 1_050,
        totalBytes: 100,
        uploadedBytes: 100,
      })
    ).toBe(true);
  });
});

describe('getUploadMaxFileSize', () => {
  it('never allows a configured limit above the Base64 upload cap', () => {
    expect(getUploadMaxFileSize()).toBe(25 * 1024 * 1024);
    expect(getUploadMaxFileSize({ maxFileSize: 5 * 1024 * 1024 })).toBe(5 * 1024 * 1024);
    expect(getUploadMaxFileSize({ maxFileSize: 50 * 1024 * 1024 })).toBe(25 * 1024 * 1024);
  });
});

describe('UploadEngine transfer lifecycle', () => {
  const engines: UploadEngine[] = [];
  const makeEngine = () => {
    const engine = new UploadEngine({
      runtimeConfig: {
        ...DEFAULT_UPLOAD_CONFIG,
        features: { ...DEFAULT_UPLOAD_CONFIG.features, crashRecovery: false },
      },
    });
    engines.push(engine);
    return engine;
  };
  const addFile = async (engine: UploadEngine, name = 'document.pdf') => {
    await engine.addFiles([new File(['content'], name, { type: 'application/pdf' })]);
    return Object.values(engine.getState().files).find((file) => file.name === name)!.id;
  };

  beforeEach(() => {
    postBase64Attachment.mockReset();
  });
  afterEach(() => {
    engines.forEach((engine) => engine.destroy());
    engines.length = 0;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('resumes after the paused request finishes aborting', async () => {
    let rejectFirst!: (error: Error) => void;
    postBase64Attachment
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            rejectFirst = reject;
          })
      )
      .mockResolvedValueOnce({ attachmentId: 'attachment-2' });
    const engine = makeEngine();
    const id = await addFile(engine);

    engine.pauseFile(id);
    engine.resumeFile(id);
    rejectFirst(new DOMException('Canceled', 'AbortError'));

    await vi.waitFor(() => expect(engine.getState().files[id].status).toBe('success'));
    expect(postBase64Attachment).toHaveBeenCalledTimes(2);
  });

  it('ignores a successful response received after cancellation', async () => {
    let resolveFirst!: (value: { attachmentId: string }) => void;
    postBase64Attachment.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        })
    );
    const engine = makeEngine();
    const id = await addFile(engine);

    engine.cancelFile(id);
    resolveFirst({ attachmentId: 'late-attachment' });
    await Promise.resolve();

    expect(engine.getState().files[id].status).toBe('canceled');
    expect(engine.getState().attachmentIndex).not.toHaveProperty('late-attachment');
    expect(engine.getUppyInstance()?.getFile(id)).toBeUndefined();
  });

  it('uploads the same file again after its successful history entry is pruned', async () => {
    postBase64Attachment
      .mockResolvedValueOnce({ attachmentId: 'first-attachment' })
      .mockResolvedValueOnce({ attachmentId: 'second-attachment' });
    const engine = makeEngine();
    const file = new File(['same content'], 'same.pdf', {
      type: 'application/pdf',
      lastModified: 100,
    });
    await engine.addFiles([file]);
    const id = Object.keys(engine.getState().files)[0];
    await vi.waitFor(() => expect(engine.getState().files[id].status).toBe('success'));
    vi.spyOn(Date, 'now').mockReturnValueOnce(Date.now() + 60_001);
    engine.dispatch({ type: 'PRUNE_TERMINAL_FILES', maxAgeMs: 60_000 });
    expect(engine.getState().files[id]).toBeUndefined();

    await engine.addFiles([file]);
    await vi.waitFor(() => expect(engine.getState().files[id].status).toBe('success'));
    expect(postBase64Attachment).toHaveBeenCalledTimes(2);
    expect(engine.getState().files[id].attachmentId).toBe('second-attachment');
  });

  it('uploads a reselected file after its canceled request settles without applying old progress', async () => {
    let settleFirst!: (value: { attachmentId: string }) => void;
    postBase64Attachment
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            settleFirst = resolve;
          })
      )
      .mockResolvedValueOnce({ attachmentId: 'new-attachment' });
    const engine = makeEngine();
    const file = new File(['same content'], 'same.pdf', {
      type: 'application/pdf',
      lastModified: 100,
    });
    await engine.addFiles([file]);
    const id = Object.keys(engine.getState().files)[0];
    engine.cancelFile(id);
    await Promise.resolve();
    await engine.addFiles([file]);
    const progressBefore = engine.getState().files[id].uploadedBytes;
    postBase64Attachment.mock.calls[0][1].onProgress(7, file.size);
    expect(engine.getState().files[id].uploadedBytes).toBe(progressBefore);
    settleFirst({ attachmentId: 'obsolete-attachment' });

    await vi.waitFor(() => expect(engine.getState().files[id].status).toBe('success'));
    expect(postBase64Attachment).toHaveBeenCalledTimes(2);
    expect(engine.getState().files[id].attachmentId).toBe('new-attachment');
    expect(engine.getState().attachmentIndex).not.toHaveProperty('obsolete-attachment');
  });

  it('aborts and releases an actively removed file', async () => {
    postBase64Attachment.mockImplementationOnce(() => new Promise(() => {}));
    const engine = makeEngine();
    const id = await addFile(engine);
    const signal = postBase64Attachment.mock.calls[0][1].signal as AbortSignal;

    engine.dispatch({ type: 'REMOVE_FILE', id });

    expect(signal.aborted).toBe(true);
    expect(engine.getUppyInstance()?.getFile(id)).toBeUndefined();
    expect(engine.getState().files[id]).toBeUndefined();
  });

  it.each(['pause', 'cancel', 'destroy'] as const)(
    'does not restart an auto retry after %s',
    async (action) => {
      vi.useFakeTimers();
      let rejectAttempt!: (error: Error) => void;
      postBase64Attachment.mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            rejectAttempt = reject;
          })
      );
      const engine = makeEngine();
      const id = await addFile(engine);
      rejectAttempt(new Error('network unavailable'));
      await vi.advanceTimersByTimeAsync(0);

      if (action === 'pause') {
        engine.pauseFile(id);
      } else if (action === 'cancel') {
        engine.cancelFile(id);
      } else {
        engine.destroy();
      }

      await vi.advanceTimersByTimeAsync(1100);
      expect(postBase64Attachment).toHaveBeenCalledTimes(1);
      if (action !== 'destroy') {
        expect(engine.getState().files[id].status).toBe(action === 'pause' ? 'paused' : 'canceled');
      }
    }
  );

  it('keeps a retryable failed file available after a new batch starts', async () => {
    vi.useFakeTimers();
    const pending: Array<{
      resolve: (value: { attachmentId: string }) => void;
      reject: (error: Error) => void;
    }> = [];
    postBase64Attachment.mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          pending.push({ resolve, reject });
        })
    );
    const engine = makeEngine();
    const failedId = await addFile(engine);
    pending[0].reject(new Error('network unavailable'));
    await vi.advanceTimersByTimeAsync(0);
    expect(engine.getState().files[failedId]).toMatchObject({ status: 'uploading', attempts: 0 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(postBase64Attachment).toHaveBeenCalledTimes(2);
    pending[1].reject(new Error('network unavailable'));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1000);
    pending[2].reject(new Error('network unavailable'));
    await vi.advanceTimersByTimeAsync(0);
    expect(engine.getState().files[failedId].status).toBe('error');
    expect(engine.getState().files[failedId].canRetry).toBe(true);

    await addFile(engine, 'second.pdf');
    await vi.advanceTimersByTimeAsync(0);
    pending[3].resolve({ attachmentId: 'new-attachment' });
    await vi.advanceTimersByTimeAsync(0);
    engine.retryFile(failedId);
    pending[4].resolve({ attachmentId: 'retried-attachment' });
    await vi.advanceTimersByTimeAsync(0);

    expect(engine.getState().files[failedId].status).toBe('success');
    expect(engine.getState().files[failedId].attachmentId).toBe('retried-attachment');
  });

  it.each(['uploading', 'paused'] as const)(
    'preserves a %s retry when another batch starts',
    async (retryStatus) => {
      vi.useFakeTimers();
      const pending: Array<{
        resolve: (value: { attachmentId: string }) => void;
        reject: (error: Error) => void;
      }> = [];
      postBase64Attachment.mockImplementation(
        () => new Promise((resolve, reject) => pending.push({ resolve, reject }))
      );
      const engine = makeEngine();
      const failedId = await addFile(engine);
      for (let attempt = 0; attempt < 3; attempt += 1) {
        pending[attempt].reject(new Error('network unavailable'));
        await vi.advanceTimersByTimeAsync(attempt < 2 ? 1000 : 0);
      }
      expect(engine.getState().files[failedId].status).toBe('error');

      engine.retryFile(failedId);
      if (retryStatus === 'paused') {
        engine.pauseFile(failedId);
      }
      await addFile(engine, 'second.pdf');
      expect(engine.getUppyInstance()?.getFile(failedId)).toBeDefined();

      if (retryStatus === 'uploading') {
        pending[3].resolve({ attachmentId: 'retried-attachment' });
      }
      pending[4].resolve({ attachmentId: 'new-attachment' });
      await vi.advanceTimersByTimeAsync(0);
      expect(engine.getState().files[failedId].status).toBe(
        retryStatus === 'uploading' ? 'success' : 'paused'
      );
    }
  );
});
