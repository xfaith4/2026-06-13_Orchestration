/**
 * Shared Data Schemas and Validators
 *
 * This module provides runtime schema validation and type guards.
 * Phase 0.1: Basic validators only. Advanced validation added in Phase 1+.
 */

/**
 * Validates a health check response structure
 */
export function isHealthCheckResponse(obj: unknown): obj is {
  status: string;
  timestamp: string;
  environment: string;
} {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const record = obj as Record<string, unknown>;
  return (
    typeof record.status === 'string' &&
    typeof record.timestamp === 'string' &&
    typeof record.environment === 'string'
  );
}

/**
 * Validates an API response envelope
 */
export function isApiResponse<T>(obj: unknown): obj is {
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
} {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const record = obj as Record<string, unknown>;
  return (
    typeof record.timestamp === 'string' &&
    (record.data === undefined || typeof record.data === 'object') &&
    (record.error === undefined || typeof record.error === 'string') &&
    (record.message === undefined || typeof record.message === 'string')
  );
}

/**
 * Parse and validate JSON string as API response
 */
export function parseApiResponse<T>(jsonString: string): {
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
} | null {
  try {
    const parsed = JSON.parse(jsonString) as unknown;
    if (isApiResponse<T>(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export { };
