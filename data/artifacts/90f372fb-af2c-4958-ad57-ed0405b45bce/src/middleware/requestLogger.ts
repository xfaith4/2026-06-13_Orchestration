import { Request, Response, NextFunction } from 'express';
import { requestLoggingMiddleware } from './request-logging.middleware';

export const requestLogger = requestLoggingMiddleware();

export function simpleRequestLogger(req: Request, res: Response, next: NextFunction): void {
  requestLogger(req, res, next);
}
