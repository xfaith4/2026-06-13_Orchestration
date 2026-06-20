import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface AppError extends Error {
  status?: number;
  code?: string;
}

/**
 * Global error handling middleware
 * Catches all errors and returns standardized JSON responses
 */
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const status = error.status || 500;
  const message = error.message || 'Internal Server Error';
  const code = error.code || 'INTERNAL_ERROR';

  // Log error details
  logger.error('Request error', {
    status,
    code,
    message,
    path: req.path,
    method: req.method,
    stack: error.stack,
  });

  // Send error response
  res.status(status).json({
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  });
};