/**
 * Standard API Envelope Types
 * Ensures type safety and consistent response structures
 */

export interface Meta {
  timestamp: string; // ISO 8601
  version: string;   // Semantic versioning
  requestId: string; // UUID for request tracking
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface ErrorDetail {
  code: string;      // SCREAMING_SNAKE_CASE
  message: string;
  field?: string;    // For validation errors
  details?: Record<string, unknown>;
}

/**
 * Success envelope - returned on 2xx responses
 * Guarantees: data XOR errors is populated, never both
 */
export interface SuccessEnvelope<T = unknown> {
  status: 'success';
  data: T;
  meta: Meta;
  errors: null;
}

/**
 * Error envelope - returned on 4xx/5xx responses
 * Guarantees: errors is always populated, data is null
 */
export interface ErrorEnvelope {
  status: 'error';
  data: null;
  meta: Meta;
  errors: ErrorDetail[];
}

/**
 * Union type for all possible API responses
 */
export type ApiEnvelope<T = unknown> = SuccessEnvelope<T> | ErrorEnvelope;

/**
 * Type guard functions for runtime safety
 */
export function isSuccessEnvelope<T>(
  response: ApiEnvelope<T>
): response is SuccessEnvelope<T> {
  return response.status === 'success' && response.errors === null;
}

export function isErrorEnvelope(
  response: ApiEnvelope
): response is ErrorEnvelope {
  return response.status === 'error' && Array.isArray(response.errors);
}

/**
 * Helper to extract data safely from envelope
 */
export function extractData<T>(
  envelope: ApiEnvelope<T>
): T | null {
  return isSuccessEnvelope(envelope) ? envelope.data : null;
}

/**
 * Helper to extract errors safely from envelope
 */
export function extractErrors(
  envelope: ApiEnvelope
): ErrorDetail[] {
  return isErrorEnvelope(envelope) ? envelope.errors : [];
}
