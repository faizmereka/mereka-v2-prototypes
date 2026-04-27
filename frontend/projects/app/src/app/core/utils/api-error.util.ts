/**
 * API Error Utility
 * Provides consistent error formatting for backend API responses
 */

/**
 * Standard API error interface
 */
export interface ApiError {
  code: string;
  message: string;
  details?: string;
  field?: string;
  statusCode?: number;
}

/**
 * Backend error response format
 */
interface BackendErrorResponse {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: string;
    field?: string;
    statusCode?: number;
  };
  message?: string;
  statusCode?: number;
}

/**
 * Error codes for common API errors
 */
export const ApiErrorCodes = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT: 'TIMEOUT',

  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',

  // Unknown
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

/**
 * User-friendly error messages for common error codes
 */
const ERROR_MESSAGES: Record<string, string> = {
  [ApiErrorCodes.UNAUTHORIZED]: 'You are not logged in. Please sign in to continue.',
  [ApiErrorCodes.FORBIDDEN]: 'You do not have permission to perform this action.',
  [ApiErrorCodes.SESSION_EXPIRED]: 'Your session has expired. Please sign in again.',
  [ApiErrorCodes.INVALID_TOKEN]: 'Your session is invalid. Please sign in again.',
  [ApiErrorCodes.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ApiErrorCodes.INVALID_INPUT]: 'The provided data is invalid.',
  [ApiErrorCodes.MISSING_REQUIRED_FIELD]: 'Please fill in all required fields.',
  [ApiErrorCodes.NOT_FOUND]: 'The requested resource was not found.',
  [ApiErrorCodes.ALREADY_EXISTS]: 'This item already exists.',
  [ApiErrorCodes.CONFLICT]: 'A conflict occurred. Please refresh and try again.',
  [ApiErrorCodes.INTERNAL_ERROR]: 'An unexpected error occurred. Please try again later.',
  [ApiErrorCodes.SERVICE_UNAVAILABLE]: 'The service is temporarily unavailable. Please try again later.',
  [ApiErrorCodes.TIMEOUT]: 'The request timed out. Please check your connection and try again.',
  [ApiErrorCodes.NETWORK_ERROR]: 'Unable to connect to the server. Please check your internet connection.',
  [ApiErrorCodes.CONNECTION_REFUSED]: 'Unable to reach the server. Please try again later.',
  [ApiErrorCodes.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
};

/**
 * Parse an error from various sources into a standardized ApiError
 */
export function parseApiError(error: unknown): ApiError {
  // Handle null/undefined
  if (!error) {
    return {
      code: ApiErrorCodes.UNKNOWN_ERROR,
      message: ERROR_MESSAGES[ApiErrorCodes.UNKNOWN_ERROR],
    };
  }

  // Handle backend error response format
  if (isBackendErrorResponse(error)) {
    const backendError = error.error;
    const code = backendError?.code || mapStatusCodeToErrorCode(error.statusCode);
    return {
      code,
      message: backendError?.message || error.message || ERROR_MESSAGES[code] || ERROR_MESSAGES[ApiErrorCodes.UNKNOWN_ERROR],
      details: backendError?.details,
      field: backendError?.field,
      statusCode: error.statusCode || backendError?.statusCode,
    };
  }

  // Handle Error objects
  if (error instanceof Error) {
    // Network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        code: ApiErrorCodes.NETWORK_ERROR,
        message: ERROR_MESSAGES[ApiErrorCodes.NETWORK_ERROR],
        details: error.message,
      };
    }

    // Timeout errors
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return {
        code: ApiErrorCodes.TIMEOUT,
        message: ERROR_MESSAGES[ApiErrorCodes.TIMEOUT],
        details: error.message,
      };
    }

    return {
      code: ApiErrorCodes.UNKNOWN_ERROR,
      message: error.message || ERROR_MESSAGES[ApiErrorCodes.UNKNOWN_ERROR],
      details: error.stack,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      code: ApiErrorCodes.UNKNOWN_ERROR,
      message: error,
    };
  }

  // Handle HttpErrorResponse from Angular
  if (isHttpErrorResponse(error)) {
    const code = mapStatusCodeToErrorCode(error.status);
    const backendError = error.error as BackendErrorResponse | undefined;

    return {
      code: backendError?.error?.code || code,
      message: backendError?.error?.message || backendError?.message || ERROR_MESSAGES[code] || error.message,
      details: backendError?.error?.details,
      field: backendError?.error?.field,
      statusCode: error.status,
    };
  }

  // Fallback
  return {
    code: ApiErrorCodes.UNKNOWN_ERROR,
    message: ERROR_MESSAGES[ApiErrorCodes.UNKNOWN_ERROR],
  };
}

/**
 * Get a user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  const apiError = parseApiError(error);
  return apiError.message;
}

/**
 * Check if error is a specific error code
 */
export function isErrorCode(error: unknown, code: string): boolean {
  const apiError = parseApiError(error);
  return apiError.code === code;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  const apiError = parseApiError(error);
  const authCodes: string[] = [
    ApiErrorCodes.UNAUTHORIZED,
    ApiErrorCodes.FORBIDDEN,
    ApiErrorCodes.SESSION_EXPIRED,
    ApiErrorCodes.INVALID_TOKEN,
  ];
  return authCodes.includes(apiError.code);
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  const apiError = parseApiError(error);
  const validationCodes: string[] = [
    ApiErrorCodes.VALIDATION_ERROR,
    ApiErrorCodes.INVALID_INPUT,
    ApiErrorCodes.MISSING_REQUIRED_FIELD,
  ];
  return validationCodes.includes(apiError.code);
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  const apiError = parseApiError(error);
  const networkCodes: string[] = [
    ApiErrorCodes.NETWORK_ERROR,
    ApiErrorCodes.CONNECTION_REFUSED,
    ApiErrorCodes.TIMEOUT,
  ];
  return networkCodes.includes(apiError.code);
}

/**
 * Map HTTP status codes to error codes
 */
function mapStatusCodeToErrorCode(statusCode?: number): string {
  if (!statusCode) return ApiErrorCodes.UNKNOWN_ERROR;

  switch (statusCode) {
    case 400:
      return ApiErrorCodes.VALIDATION_ERROR;
    case 401:
      return ApiErrorCodes.UNAUTHORIZED;
    case 403:
      return ApiErrorCodes.FORBIDDEN;
    case 404:
      return ApiErrorCodes.NOT_FOUND;
    case 409:
      return ApiErrorCodes.CONFLICT;
    case 422:
      return ApiErrorCodes.VALIDATION_ERROR;
    case 500:
      return ApiErrorCodes.INTERNAL_ERROR;
    case 502:
    case 503:
      return ApiErrorCodes.SERVICE_UNAVAILABLE;
    case 504:
      return ApiErrorCodes.TIMEOUT;
    default:
      if (statusCode >= 400 && statusCode < 500) {
        return ApiErrorCodes.VALIDATION_ERROR;
      }
      if (statusCode >= 500) {
        return ApiErrorCodes.INTERNAL_ERROR;
      }
      return ApiErrorCodes.UNKNOWN_ERROR;
  }
}

/**
 * Type guard for backend error response
 */
function isBackendErrorResponse(error: unknown): error is BackendErrorResponse {
  if (typeof error !== 'object' || error === null) return false;
  const obj = error as BackendErrorResponse;
  return (
    obj.success === false ||
    typeof obj.error === 'object' ||
    typeof obj.message === 'string'
  );
}

/**
 * Type guard for HttpErrorResponse
 */
function isHttpErrorResponse(error: unknown): error is { status: number; message: string; error?: unknown } {
  if (typeof error !== 'object' || error === null) return false;
  const obj = error as { status?: number; message?: string };
  return typeof obj.status === 'number' && typeof obj.message === 'string';
}
