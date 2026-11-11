import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  canCancelFile,
  canPauseFile,
  canResumeFile,
  canRetryFile,
} from '@/components/upload/_hooks/useFileActions';
import { useUploadCollapse } from '@/components/upload/_hooks/useUploadCollapse';
import { useUploadEngineOptional } from '@/components/upload/_hooks/useUploadEngine';
import { useUploadStoreCore } from '@/components/upload/_store/uploadStore';
import { initialAggregates } from '@/components/upload/engine/types';

export const useUploads = () => {
  //Engine
  const engine = useUploadEngineOptional();

  const { files, aggregates, queue, addFiles, activeBatchFolderKey, isFlushing } =
    useUploadStoreCore(
      useShallow((s) => ({
        files: s.files,
        aggregates: s.aggregates ?? initialAggregates,
        addFiles: s.addFiles,
        activeBatchFolderKey: s.activeBatchFolderKey,
        isFlushing: s.isFlushing,
        queue: s.queue,
      }))
    );

  const hasActive =
    (aggregates.uploading ?? 0) > 0 || (aggregates.paused ?? 0) > 0 || (aggregates.queued ?? 0) > 0;

  //Collapse
  const { opened, toggle } = useUploadCollapse(
    aggregates.total,
    aggregates.allDone,
    aggregates.anyError
  );

  const activeBatch = useMemo(
    () => ({
      key: activeBatchFolderKey,
      isActive: activeBatchFolderKey !== null,
      isFlushing,
    }),
    [activeBatchFolderKey, isFlushing]
  );

  const counts = useMemo(
    () => ({
      total: aggregates?.total ?? 0,
      queued: aggregates?.queued ?? 0,
      uploading: aggregates?.uploading ?? 0,
      paused: aggregates?.paused ?? 0,
      success: aggregates?.success ?? 0,
      error: aggregates?.error ?? 0,
      canceled: aggregates?.canceled ?? 0,
      socketProcessing: aggregates?.socketProcessing ?? 0,
    }),
    [aggregates]
  );

  const queueInfo = useMemo(() => {
    const queueEntries = Object.entries(queue);
    return {
      batchCount: queueEntries.length,
      totalFiles: queueEntries.reduce((sum, [, count]) => sum + count, 0),
      byBatch: Object.fromEntries(queueEntries.map(([key, count]) => [key, count])),
    };
  }, [queue]);

  const progress = useMemo(
    () => ({
      percent: aggregates?.progress ?? 0,
      uploadedFiles: counts.success,
      totalFiles: counts.total,
      batchDone: aggregates?.batchDone ?? false,
      allDone: aggregates?.allDone ?? false,
    }),
    [aggregates, counts]
  );

  const isUploading = aggregates?.anyUploading ?? false;
  const hasErrors = aggregates?.anyError ?? false;
  const hasPaused = aggregates?.anyPaused ?? false;
  const showBox = aggregates?.showBox ?? false;

  const collapse = useMemo(
    () => ({
      opened,
      toggle,
    }),
    [opened, toggle]
  );

  const actionGuards = useMemo(
    () => ({
      canRetry: canRetryFile,
      canPause: canPauseFile,
      canResume: canResumeFile,
      canCancel: canCancelFile,
    }),
    []
  );

  return {
    files,
    aggregates,
    queue: queueInfo,
    hasActive,
    engine,
    addFiles,
    collapse,
    activeBatch,
    counts,
    progress,
    isUploading,
    hasErrors,
    hasPaused,
    showBox,
    actionGuards,
  };
};
