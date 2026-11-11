import { useContext } from 'react';
import { UploadEngineContext } from '@/components/upload/_provider/UploadEngineContext';

export const useUploadEngine = () => {
  const uploadEngineContext = useContext(UploadEngineContext);
  if (!uploadEngineContext) {
    throw new Error('useUploadEngine must be used inside provider');
  }
  return uploadEngineContext;
};

/**
 * Optional version of useUploadEngine that returns null when provider is not available.
 * Use this in components that might render during logout or when provider is unmounting.
 */
export const useUploadEngineOptional = () => {
  const uploadEngineContext = useContext(UploadEngineContext);
  return uploadEngineContext;
};
