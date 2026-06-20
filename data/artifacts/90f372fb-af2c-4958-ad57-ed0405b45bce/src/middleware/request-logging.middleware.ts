import { Request, Response, NextFunction } from 'express';
import { LoggerWrapper, createLogger, generateRequestId, LogContext } from '../logger/logger-wrapper';

/**
 * Extend Express Request type to include logger and request metadata
 */
declare global {
  namespace Express {
    interface Request {
      logger?: LoggerWrapper;
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Express middleware for request logging and request ID tracking
 * - Generates/extracts request ID from headers
 * - Attaches logger instance to request
 * - Logs request start and completion
 * - Tracks request duration
 * - Adds request ID to response headers
 */
export function requestLoggingMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Capture start time for duration calculation
    req.startTime = Date.now();

    // Extract or generate request ID
    const requestIdHeader = req.headers['x-request-id'] || req.headers['x-correlation-id'];
    const requestId = typeof requestIdHeader === 'string' ? requestIdHeader : generateRequestId();
    req.requestId = requestId;

    // Create logger instance with request context
    req.logger = createLogger({
      requestId,
      userId: (req as any).user?.id,
      correlationId: (req as any).correlationId,
      metadata: {
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    // Add request ID to response headers
    res.setHeader('x-request-id', requestId);

    // Log incoming request
    req.logger.info('Incoming request', {
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
    });

    // Capture original res.json to log response
    const originalJson = res.json.bind(res);
    res.json = function (data: any) {
      const duration = Date.now() - req.startTime!;
      req.logger!.info('Request completed', {
        statusCode: res.statusCode,
        durationMs: duration,
      });
      return originalJson(data);
    };

    // Handle errors in response
    res.on('finish', () => {
      const duration = Date.now() - req.startTime!;
      
      if (res.statusCode >= 400) {
        const logLevel = res.statusCode >= 500 ? 'error' : 'warn';
        req.logger![logLevel as 'error' | 'warn']('Request ended with error', {
          statusCode: res.statusCode,
          durationMs: duration,
        });
      }
    });

    next();
  };
}

/**
 * Middleware for logging errors
 */
export function errorLoggingMiddleware() {
  return (err: any, req: Request, res: Response, next: NextFunction): void => {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    const logger = req.logger || createLogger({ requestId: req.requestId });

    logger.error('Request error', err instanceof Error ? err : new Error(JSON.stringify(err)), {
      statusCode: err.statusCode || 500,
      durationMs: duration,
      errorType: err.constructor.name,
    });

    res.status(err.statusCode || 500).json({
      error: err.message || 'Internal Server Error',
      requestId: req.requestId,
    });
  };
}
