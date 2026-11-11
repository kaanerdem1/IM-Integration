import { ReactNode, useEffect, useRef } from 'react';
import { useSession } from '@/_hooks/_modules/auth/useSession';
import { LoaderMini } from '@/components/display/Nodata/LoaderMini';
import { useUploadGlobalErrorToast } from '@/components/upload/_hooks/useUploadGlobalErrorToast';
import { UploadEngineContext } from '@/components/upload/_provider/UploadEngineContext';
import { useUploadStoreCore } from '@/components/upload/_store/uploadStore';
import { UploadEngine } from '../engine/engine';

export const UploadProvider = ({ children }: { children: ReactNode }) => {
  const { status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const engineRef = useRef<UploadEngine | null>(null);
  const storeEngine = useUploadStoreCore((s) => s.engine);

  const isReady = isAuthenticated;

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const engine = new UploadEngine({});
    engineRef.current = engine;
    useUploadStoreCore.getState().attachEngine(engine);

    return () => {
      engine.destroy();
      if (engineRef.current === engine) {
        engineRef.current = null;
      }
      if (useUploadStoreCore.getState().engine === engine) {
        useUploadStoreCore.getState().detachEngine();
      }
    };
  }, [isReady]);

  // If not authenticated, render children without upload functionality
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // If no organization yet (e.g., /new-organization page), render children without upload engine
  if (!isReady) {
    return <>{children}</>;
  }

  // If organization exists but engine not ready, show loading
  if (!storeEngine) {
    return <LoaderMini />;
  }

  return (
    <UploadEngineContext.Provider value={storeEngine}>
      <UploadEngineSideEffects />
      {children}
    </UploadEngineContext.Provider>
  );
};

function UploadEngineSideEffects() {
  useUploadGlobalErrorToast();

  return null;
}
