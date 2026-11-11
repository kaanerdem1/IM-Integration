import { useEffect, useRef } from 'react';
import { useMessage } from '@/_hooks/useMessage';
import { useUploadEngineOptional } from './useUploadEngine';

export function useUploadGlobalErrorToast() {
  const engine = useUploadEngineOptional();
  const { message } = useMessage();
  const lastActionIdRef = useRef<number | null>(null);

  useEffect(() => {
    // If provider is not available (e.g., during logout), skip subscription
    if (!engine) {
      return;
    }

    const unsub = engine.subscribe((state) => {
      const globalError = state.globalError;
      if (!globalError) {
        return;
      }

      if (globalError.actionId === lastActionIdRef.current) {
        return;
      }

      lastActionIdRef.current = globalError.actionId;
      message(`Upload error\n${globalError.message}`);
    });

    return unsub;
  }, [engine, message]);
}
