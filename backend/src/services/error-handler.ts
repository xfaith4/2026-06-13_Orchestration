import { ErrorRecord, ErrorType, ErrorSeverity } from '@unifiedaitoolbox/shared';

export interface ErrorContext {
  runId?: string;
  phaseId?: string;
  taskId?: string;
  service?: string;
  operation?: string;
}

export class ErrorHandler {
  // Classify errors as transient (retriable) or permanent (non-retriable)
  classifyError(error: unknown): ErrorType {
    const errorObj = this.normalizeError(error);

    // Network-related errors are transient
    if (this.isNetworkError(errorObj)) {
      return 'transient';
    }

    // Timeout errors are transient
    if (this.isTimeoutError(errorObj)) {
      return 'transient';
    }

    // Rate limit / 429 errors are transient
    if (this.isRateLimitError(errorObj)) {
      return 'transient';
    }

    // Temporary server errors (5xx) are transient
    if (this.isTemporaryServerError(errorObj)) {
      return 'transient';
    }

    // All other errors are permanent
    return 'permanent';
  }

  // Determine error severity for monitoring and alerting
  determineSeverity(error: unknown): ErrorSeverity {
    const errorObj = this.normalizeError(error);

    // Check error code/status
    const code = (errorObj as any).code || (errorObj as any).status;

    // Critical: 500, unhandled, system errors
    if (code >= 500 || this.isSystemError(errorObj)) {
      return 'critical';
    }

    // High: 400, validation errors, permission errors
    if (code >= 400 && code < 500) {
      return 'high';
    }

    // Medium: timeout, temporary errors
    if (this.isTimeoutError(errorObj) || this.isRateLimitError(errorObj)) {
      return 'medium';
    }

    // Low: minor issues, warnings
    return 'low';
  }

  // Extract actionable error message
  getMessage(error: unknown): string {
    const errorObj = this.normalizeError(error);

    // Custom messages for common errors
    if (this.isNetworkError(errorObj)) {
      return 'Network connection failed. Please check your internet connection and try again.';
    }

    if (this.isTimeoutError(errorObj)) {
      return 'Request timed out. The operation took too long to complete. Please try again.';
    }

    if (this.isRateLimitError(errorObj)) {
      return 'Too many requests. Please wait a moment before retrying.';
    }

    if ((errorObj as any).message) {
      return (errorObj as any).message;
    }

    return 'An unexpected error occurred. Please try again.';
  }

  // Get error code for logging
  getErrorCode(error: unknown): string {
    const errorObj = this.normalizeError(error);

    if ((errorObj as any).code) {
      return (errorObj as any).code;
    }

    if ((errorObj as any).status) {
      return `HTTP_${(errorObj as any).status}`;
    }

    if ((errorObj as any).name) {
      return (errorObj as any).name;
    }

    return 'UNKNOWN_ERROR';
  }

  // Format error for logging
  formatErrorLog(
    error: unknown,
    context: ErrorContext,
    retryCount: number = 0,
    maxRetries: number = 0
  ): Partial<ErrorRecord> {
    const errorObj = this.normalizeError(error);
    const errorType = this.classifyError(error);
    const severity = this.determineSeverity(error);

    return {
      timestamp: new Date().toISOString(),
      errorMessage: this.getMessage(error),
      errorCode: this.getErrorCode(error),
      errorType,
      severity,
      context,
      stack: (errorObj as any).stack,
      retryCount,
      maxRetries,
    };
  }

  // Private helpers
  private normalizeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
    }

    if (typeof error === 'object' && error !== null) {
      return error as Record<string, unknown>;
    }

    return { message: String(error) };
  }

  private isNetworkError(error: Record<string, unknown>): boolean {
    const msg = String((error as any).message || '').toLowerCase();
    const code = String((error as any).code || '').toUpperCase();

    return (
      msg.includes('network') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('timeout') ||
      code.includes('NETWORK') ||
      code.includes('ECONNREFUSED') ||
      code.includes('ENOTFOUND')
    );
  }

  private isTimeoutError(error: Record<string, unknown>): boolean {
    const msg = String((error as any).message || '').toLowerCase();
    const code = String((error as any).code || '').toUpperCase();

    return (
      msg.includes('timeout') ||
      msg.includes('timed out') ||
      code.includes('TIMEOUT') ||
      code.includes('ETIMEDOUT')
    );
  }

  private isRateLimitError(error: Record<string, unknown>): boolean {
    const status = (error as any).status || (error as any).statusCode;
    const msg = String((error as any).message || '').toLowerCase();

    return status === 429 || msg.includes('rate limit');
  }

  private isTemporaryServerError(error: Record<string, unknown>): boolean {
    const status = (error as any).status || (error as any).statusCode;

    // 500, 502, 503, 504 are temporary server errors
    return status >= 500 && status <= 599;
  }

  private isSystemError(error: Record<string, unknown>): boolean {
    const code = String((error as any).code || '').toUpperCase();
    const name = String((error as any).name || '').toLowerCase();

    return (
      name.includes('system') ||
      name.includes('unhandled') ||
      code.includes('SYSTEM') ||
      code.includes('FATAL')
    );
  }
}
