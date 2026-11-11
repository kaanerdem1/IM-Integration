import { useEffect } from 'react';
import { useErrorStore } from '@shared/store/error/useErrorStore';
import { useMessage } from '@/_hooks/useMessage';

export const ErrorListener = () => {
  const nextErrorId = useErrorStore((state) => state.queue[0]?.id);
  const popError = useErrorStore((state) => state.popError);
  const { message } = useMessage();

  useEffect(() => {
    if (!nextErrorId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const error = popError();

      if (error) {
        message(error.message, error.source === 'api' ? 'error' : 'warning', error.details);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [message, nextErrorId, popError]);

  return null;
};
