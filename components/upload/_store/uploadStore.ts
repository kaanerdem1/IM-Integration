import { create } from 'zustand';
import { UPLOAD_CONFIG } from '../config';
import type { UploadEngine } from '../engine/engine';
import { UploadAggregates, UploadFileState } from '../engine/types';

type EngineUnsubscribe = () => void;

type UploadStoreState = {
  engine: UploadEngine | null;
  engineUnsub: EngineUnsubscribe | null;

  files: UploadFileState[];
  aggregates: UploadAggregates | null;

  queue: Record<string, number>;
  activeBatchFolderKey: string | null;
  isFlushing: boolean;

  attachEngine: (engine: UploadEngine) => void;
  detachEngine: () => void;

  addFiles: (
    files: FileList | File[],
    meta?: { formId?: string | null; formKey?: string | null }
  ) => Promise<void>;
};

export const useUploadStoreCore = create<UploadStoreState>((set, get) => ({
  engine: null,
  engineUnsub: null,

  files: [],
  aggregates: null,

  queue: {},
  activeBatchFolderKey: null,
  isFlushing: false,

  // =====================================================
  // Actions
  // =====================================================

  attachEngine: (engine) => {
    const prev = get().engine;
    if (prev === engine) {
      return;
    }

    get().engineUnsub?.();

    // Subscribe to engine state changes
    const unsub = engine.subscribe((state) => {
      set({
        files: Object.values(state.files),
        aggregates: state.aggregates,
        queue: state.queue,
        activeBatchFolderKey: state.activeBatchFolderKey,
        isFlushing: state.isFlushing,
      });
    });

    set({
      engine,
      engineUnsub: unsub,
    });

    if (UPLOAD_CONFIG.ENABLE_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[UploadStore] Engine attached');
    }
  },

  detachEngine: () => {
    get().engineUnsub?.();

    set({
      engine: null,
      engineUnsub: null,
      files: [],
      aggregates: null,
      activeBatchFolderKey: null,
      isFlushing: false,
      queue: {},
    });

    if (UPLOAD_CONFIG.ENABLE_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[UploadStore] Engine detached');
    }
  },

  addFiles: async (filesInput, meta) => {
    const engine = get().engine;

    if (!engine) {
      throw new Error('[UploadStore] Engine not attached');
    }
    await engine.addFiles(filesInput, meta);
  },
}));
