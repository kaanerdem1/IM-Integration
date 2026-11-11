import { useEffect, useRef, useState } from 'react';
import { UPLOAD_CONFIG } from '@/components/upload/config';

export function useUploadCollapse(total: number, allDone: boolean, anyError: boolean) {
  const [opened, setOpened] = useState(true);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');

  const prevTotalRef = useRef(total);

  useEffect(() => {
    if (total > prevTotalRef.current) {
      setMode('auto');
      setOpened(true);
    }
    prevTotalRef.current = total;
  }, [total]);

  const hasEverHadFilesRef = useRef(false);

  useEffect(() => {
    if (total > 0) {
      hasEverHadFilesRef.current = true;
    }
  }, [total]);

  useEffect(() => {
    if (hasEverHadFilesRef.current && allDone && !anyError && opened && mode === 'auto') {
      const timer = window.setTimeout(() => {
        setOpened(false);
      }, UPLOAD_CONFIG.AUTO_COLLAPSE_DELAY_MS);

      return () => clearTimeout(timer);
    }
  }, [allDone, anyError, opened, mode]);

  const toggle = () => {
    setMode('manual');
    setOpened((v) => !v);
  };

  return {
    opened,
    toggle,
  };
}
