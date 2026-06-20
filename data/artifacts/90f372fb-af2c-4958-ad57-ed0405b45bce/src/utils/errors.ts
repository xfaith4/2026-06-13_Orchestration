export { ValidationError, DatabaseError, NotFoundError } from '../errors';

export class ApiError extends Error {
  statusCode: number;
  code: string;
  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
