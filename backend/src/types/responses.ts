export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  errors?: Array<{ path: string; message: string; value: unknown }>;
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const createResponse = <T>(data?: T, error?: string): ApiResponse<T> => ({
  data,
  error,
  timestamp: new Date().toISOString(),
});

export const createErrorResponse = (
  message: string,
  errors?: Array<{ path: string; message: string; value: unknown }>
): ApiResponse => ({
  error: message,
  errors,
  timestamp: new Date().toISOString(),
});
