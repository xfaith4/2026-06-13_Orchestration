import { Request, Response, NextFunction } from 'express';
import { ApiError, createErrorResponse } from '../types/responses.js';

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(createErrorResponse(err.message));
  }

  res.status(500).json(createErrorResponse('Internal server error'));
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json(createErrorResponse('Resource not found'));
};
