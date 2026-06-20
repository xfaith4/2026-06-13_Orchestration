import logger from './winston-config';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request context type for tracking request ID throughout the request lifecycle
 */
export interface LogContext {
  requestId: string;
  userId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

/**
 * Thread-local storage for request context (using AsyncLocalStorage pattern)
 * In production, use AsyncLocalStorage for proper async context isolation
 */
class ContextManager {
  private static context: Map<string, LogContext> = new Map();
  private static mainContext: LogContext | null = null;

  static setContext(context: LogContext): void {
    this.mainContext = context;
  }

  static getContext(): LogContext | null {
    return this.mainContext;
  }

  static clearContext(): void {
    this.mainContext = null;
  }

  static generateRequestId(): string {
    return uuidv4();
  }
}

/**
 * Logger Wrapper Class
 * Provides convenient methods for logging at different levels
 * Automatically injects request ID into logs
 */
export class LoggerWrapper {
  private context: LogContext;

  constructor(context?: Partial<LogContext>) {
    this.context = {
      requestId: context?.requestId || ContextManager.generateRequestId(),
      userId: context?.userId,
      correlationId: context?.correlationId,
      metadata: context?.metadata,
    };
  }

  /**
   * Set or update context
   */
  setContext(context: Partial<LogContext>): void {
    this.context = {
      ...this.context,
      ...context,
    };
  }

  /**
   * Get current context
   */
  getContext(): LogContext {
    return this.context;
  }

  /**
   * Get request ID
   */
  getRequestId(): string {
    return this.context.requestId;
  }

  /**
   * Log info level message
   * @param message - Main log message
   * @param meta - Optional metadata object
   */
  info(message: string, meta?: Record<string, any>): void {
    logger.info(message, {
      requestId: this.context.requestId,
      userId: this.context.userId,
      correlationId: this.context.correlationId,
      ...meta,
    });
  }

  /**
   * Log warn level message
   * @param message - Main log message
   * @param meta - Optional metadata object
   */
  warn(message: string, meta?: Record<string, any>): void {
    logger.warn(message, {
      requestId: this.context.requestId,
      userId: this.context.userId,
      correlationId: this.context.correlationId,
      ...meta,
    });
  }

  /**
   * Log error level message
   * @param message - Main log message
   * @param error - Error object or additional metadata
   * @param meta - Optional additional metadata
   */
  error(message: string, error?: Error | Record<string, any>, meta?: Record<string, any>): void {
    let errorMeta: Record<string, any> = {};

    if (error instanceof Error) {
      errorMeta = {
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack,
        ...meta,
      };
    } else if (error) {
      errorMeta = { ...error, ...meta };
    }

    logger.error(message, {
      requestId: this.context.requestId,
      userId: this.context.userId,
      correlationId: this.context.correlationId,
      ...errorMeta,
    });
  }

  /**
   * Log debug level message
   * @param message - Main log message
   * @param meta - Optional metadata object
   */
  debug(message: string, meta?: Record<string, any>): void {
    logger.debug(message, {
      requestId: this.context.requestId,
      userId: this.context.userId,
      correlationId: this.context.correlationId,
      ...meta,
    });
  }

  /**
   * Log performance metrics
   * @param operationName - Name of the operation
   * @param durationMs - Duration in milliseconds
   * @param meta - Optional metadata
   */
  performance(operationName: string, durationMs: number, meta?: Record<string, any>): void {
    const level = durationMs > 1000 ? 'warn' : 'info';
    logger.log(level, `Performance: ${operationName}`, {
      requestId: this.context.requestId,
      userId: this.context.userId,
      durationMs,
      ...meta,
    });
  }
}

/**
 * Global logger instance
 */
export const loggerInstance = new LoggerWrapper();

/**
 * Create a logger instance with initial context
 */
export function createLogger(context?: Partial<LogContext>): LoggerWrapper {
  return new LoggerWrapper(context);
}

/**
 * Set global context for logging
 */
export function setLogContext(context: Partial<LogContext>): void {
  ContextManager.setContext({
    requestId: context.requestId || ContextManager.generateRequestId(),
    ...context,
  });
}

/**
 * Get global context
 */
export function getLogContext(): LogContext | null {
  return ContextManager.getContext();
}

/**
 * Clear global context
 */
export function clearLogContext(): void {
  ContextManager.clearContext();
}

/**
 * Generate new request ID
 */
export function generateRequestId(): string {
  return ContextManager.generateRequestId();
}
