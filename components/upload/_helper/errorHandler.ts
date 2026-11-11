/**
 * Upload Error Handler
 *
 * Categorizes and provides user-friendly messages for upload errors
 */

export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  SIZE = 'size',
  FORMAT = 'format',
  PERMISSION = 'permission',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

export interface CategorizedError {
  category: ErrorCategory;
  message: string;
  messageKey: string;
  technicalMessage: string;
  isRetryable: boolean;
  userAction?: string;
  userActionKey?: string;
}

/**
 * Network error patterns
 */
const NETWORK_ERROR_PATTERNS = [
  /network/i,
  /timeout/i,
  /fetch/i,
  /connection/i,
  /econnrefused/i,
  /enotfound/i,
  /econnreset/i,
  /offline/i,
  /internet/i,
];

/**
 * Size error patterns
 */
const SIZE_ERROR_PATTERNS = [/size/i, /too large/i, /too big/i, /exceeds/i, /maximum/i, /quota/i];

/**
 * Format/Type error patterns
 */
const FORMAT_ERROR_PATTERNS = [
  /type/i,
  /format/i,
  /extension/i,
  /mime/i,
  /file type/i,
  /not allowed/i,
  /not supported/i,
];

/**
 * Permission error patterns
 */
const PERMISSION_ERROR_PATTERNS = [
  /permission/i,
  /forbidden/i,
  /unauthorized/i,
  /access denied/i,
  /403/,
  /401/,
];

/**
 * Server error patterns
 */
const SERVER_ERROR_PATTERNS = [/server/i, /500/, /502/, /503/, /504/, /internal error/i];

/**
 * Categorize error based on error object or message
 */
export function categorizeError(error: unknown): ErrorCategory {
  const errorMessage = getErrorMessage(error);
  const errorCode = getErrorCode(error);

  // Check network errors
  if (NETWORK_ERROR_PATTERNS.some((pattern) => pattern.test(errorMessage))) {
    return ErrorCategory.NETWORK;
  }

  // Check size errors
  if (SIZE_ERROR_PATTERNS.some((pattern) => pattern.test(errorMessage))) {
    return ErrorCategory.SIZE;
  }

  // Check format errors
  if (FORMAT_ERROR_PATTERNS.some((pattern) => pattern.test(errorMessage))) {
    return ErrorCategory.FORMAT;
  }

  // Check permission errors
  if (PERMISSION_ERROR_PATTERNS.some((pattern) => pattern.test(errorMessage))) {
    return ErrorCategory.PERMISSION;
  }

  // Check server errors
  if (SERVER_ERROR_PATTERNS.some((pattern) => pattern.test(errorMessage))) {
    return ErrorCategory.SERVER;
  }

  // Check by HTTP status code
  if (errorCode) {
    if (errorCode >= 500) {
      return ErrorCategory.SERVER;
    }
    if (errorCode === 403 || errorCode === 401) {
      return ErrorCategory.PERMISSION;
    }
    if (errorCode === 413) {
      return ErrorCategory.SIZE;
    }
    if (errorCode === 415) {
      return ErrorCategory.FORMAT;
    }
  }

  // Check for Uppy validation errors
  if (error && typeof error === 'object' && 'isRestriction' in error) {
    return ErrorCategory.VALIDATION;
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Get user-friendly error message based on category.
 * Returns i18n keys (messageKey, userActionKey) for translation.
 * The `message` field contains a fallback English string.
 */
export function getUserFriendlyMessage(
  category: ErrorCategory,
  fileName?: string,
  technicalMessage?: string
): CategorizedError {
  const file = fileName ? `"${fileName}"` : 'File';

  switch (category) {
    case ErrorCategory.NETWORK:
      return {
        category,
        message: `${file} upload connection error`,
        messageKey: 'label.message.upload.errors.network',
        technicalMessage: technicalMessage || 'Network error',
        isRetryable: true,
        userAction: 'Check your internet connection and try again',
        userActionKey: 'label.message.upload.actions.checkConnection',
      };

    case ErrorCategory.SIZE:
      return {
        category,
        message: `${file} is too large`,
        messageKey: 'label.message.upload.errors.size',
        technicalMessage: technicalMessage || 'File size exceeds limit',
        isRetryable: false,
        userAction: 'File exceeds size limit. Select a smaller file',
        userActionKey: 'label.message.upload.actions.selectSmaller',
      };

    case ErrorCategory.FORMAT:
      return {
        category,
        message: `${file} unsupported format`,
        messageKey: 'label.message.upload.errors.format',
        technicalMessage: technicalMessage || 'File format not supported',
        isRetryable: false,
        userAction: 'Select a supported file format',
        userActionKey: 'label.message.upload.actions.selectSupported',
      };

    case ErrorCategory.PERMISSION:
      return {
        category,
        message: `No upload permission for ${file}`,
        messageKey: 'label.message.upload.errors.permission',
        technicalMessage: technicalMessage || 'Permission denied',
        isRetryable: false,
        userAction: 'Contact your administrator',
        userActionKey: 'label.message.upload.actions.contactAdmin',
      };

    case ErrorCategory.SERVER:
      return {
        category,
        message: `${file} server error during upload`,
        messageKey: 'label.message.upload.errors.server',
        technicalMessage: technicalMessage || 'Server error',
        isRetryable: true,
        userAction: 'Please try again in a few minutes',
        userActionKey: 'label.message.upload.actions.tryLater',
      };

    case ErrorCategory.VALIDATION:
      return {
        category,
        message: `${file} validation error`,
        messageKey: 'label.message.upload.errors.validation',
        technicalMessage: technicalMessage || 'Validation error',
        isRetryable: false,
        userAction: 'Check file requirements',
        userActionKey: 'label.message.upload.actions.checkRequirements',
      };

    case ErrorCategory.UNKNOWN:
    default:
      return {
        category,
        message: `${file} unexpected error during upload`,
        messageKey: 'label.message.upload.errors.unknown',
        technicalMessage: technicalMessage || 'Unknown error',
        isRetryable: true,
        userAction: 'Retry or contact support',
        userActionKey: 'label.message.upload.actions.retryOrContact',
      };
  }
}

/**
 * Process error and return categorized, user-friendly error
 */
export function processUploadError(error: unknown, fileName?: string): CategorizedError {
  const technicalMessage = getErrorMessage(error);
  const category = categorizeError(error);
  return getUserFriendlyMessage(category, fileName, technicalMessage);
}

/**
 * Extract error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (!error) {
    return 'Unknown error';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object') {
    const err = error as any;
    return err.message || err.error || err.statusText || JSON.stringify(error);
  }

  return String(error);
}

/**
 * Extract HTTP status code from error
 */
function getErrorCode(error: unknown): number | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const err = error as any;

  // Check various status code properties
  if (typeof err.status === 'number') {
    return err.status;
  }
  if (typeof err.statusCode === 'number') {
    return err.statusCode;
  }
  if (typeof err.code === 'number') {
    return err.code;
  }

  // Check response object
  if (err.response && typeof err.response.status === 'number') {
    return err.response.status;
  }

  return null;
}

export function isErrorRetryable(error: unknown): boolean {
  const category = categorizeError(error);
  const categorizedError = getUserFriendlyMessage(category);
  return categorizedError.isRetryable;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: unknown, context?: Record<string, any>): string {
  const categorized = processUploadError(error);
  return JSON.stringify(
    {
      category: categorized.category,
      message: categorized.message,
      technical: categorized.technicalMessage,
      retryable: categorized.isRetryable,
      ...context,
    },
    null,
    2
  );
}
