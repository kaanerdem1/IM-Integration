import { UPLOAD_CONFIG } from '@/components/upload/config';

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  }
): Promise<T> {
  const { maxAttempts = 2, baseDelay = 1000, maxDelay = 5000, onRetry } = options ?? {};

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Son deneme başarısız oldu, artık retry yok
      if (attempt === maxAttempts) {
        throw error;
      }

      // Exponential backoff: 2^(attempt-1) * baseDelay, max maxDelay
      const delay = Math.min(2 ** (attempt - 1) * baseDelay, maxDelay);

      if (onRetry) {
        onRetry(attempt, error);
      }

      if (UPLOAD_CONFIG.ENABLE_DEBUG) {
        // eslint-disable-next-line no-console
        console.log(
          `[RetryWithBackoff] Attempt ${attempt}/${maxAttempts} failed. Retrying in ${delay}ms...`,
          error
        );
      }

      // Bekle
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * isNetworkError
 *
 * Determines if an error is a network-related error that should be retried.
 */
export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as any;

  // Network error patterns
  if (err.message && typeof err.message === 'string') {
    const msg = err.message.toLowerCase();
    if (
      msg.includes('network') ||
      msg.includes('timeout') ||
      msg.includes('fetch') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('econnreset')
    ) {
      return true;
    }
  }

  // HTTP status codes that should be retried
  if (typeof err.status === 'number') {
    // 5xx server errors or 429 rate limit
    if (err.status >= 500 || err.status === 429) {
      return true;
    }
  }

  return false;
}
