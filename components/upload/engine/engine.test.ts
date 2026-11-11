import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadEngine } from './engine';

const adapterMocks = vi.hoisted(() => ({
  destroy: vi.fn(),
}));

vi.mock('./adapter', () => ({
  UppyAdapter: class {
    destroy = adapterMocks.destroy;
  },
}));

describe('UploadEngine lifecycle', () => {
  beforeEach(() => {
    adapterMocks.destroy.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('destroys its adapter, timer, listeners and ignores late dispatches', () => {
    const engine = new UploadEngine({});
    const listener = vi.fn();
    engine.subscribe(listener);

    engine.destroy();
    engine.dispatch({ type: 'GLOBAL_ERROR', error: { message: 'late', actionId: 1 } });
    vi.advanceTimersByTime(60_000);

    expect(adapterMocks.destroy).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledOnce();
    expect(engine.getState().globalError).toBeNull();
  });
});
