import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

const Logger = { getInstance: () => logger };

/**
 * Validation error object with details and request context
 */
export interface ValidationError {
  field: string;
  message: string;
  value: unknown;
  type: string;
}

/**
 * Validation result from schema validator
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: Record<string, unknown>;
}

/**
 * Validator interface supporting multiple validation libraries
 */
export interface IValidator {
  validate(data: unknown): ValidationResult;
}

/**
 * Joi adapter implementation
 */
export class JoiValidator implements IValidator {
  constructor(private schema: any) {}

  validate(data: unknown): ValidationResult {
    const { error, value } = this.schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (!error) {
      return { valid: true, errors: [], data: value };
    }

    const errors: ValidationError[] = error.details.map((detail: any) => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context.value,
      type: detail.type,
    }));

    return { valid: false, errors };
  }
}

/**
 * Zod adapter implementation
 */
export class ZodValidator implements IValidator {
  constructor(private schema: any) {}

  validate(data: unknown): ValidationResult {
    const result = this.schema.safeParse(data);

    if (result.success) {
      return { valid: true, errors: [], data: result.data };
    }

    const errors: ValidationError[] = result.error.errors.map((error: any) => ({
      field: error.path.join('.'),
      message: error.message,
      value: data,
      type: error.code,
    }));

    return { valid: false, errors };
  }
}

/**
 * Configuration options for validation middleware
 */
export interface ValidationOptions {
  source?: 'body' | 'query' | 'params' | 'all';
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  logLevel?: 'error' | 'warn' | 'info';
  respondWithData?: boolean;
  customErrorHandler?: (errors: ValidationError[], req: Request) => any;
}

/**
 * Validation middleware factory
 * Creates middleware that validates request data against provided schema
 *
 * @param validator - IValidator instance (Joi, Zod, etc.)
 * @param options - Configuration options
 * @returns Express middleware function
 *
 * @example
 * const schema = Joi.object({ name: Joi.string().required() });
 * app.post('/users', validate(new JoiValidator(schema)), handler);
 */
export function validate(
  validator: IValidator,
  options: ValidationOptions = {}
) {
  const {
    source = 'body',
    logLevel = 'warn',
    respondWithData = true,
    customErrorHandler,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Determine data source
    const dataToValidate = getDataSource(req, source);

    // Validate data
    const result = validator.validate(dataToValidate);

    // Handle validation success
    if (result.valid) {
      // Attach validated data to request
      if (source === 'body' || source === 'all') {
        req.body = result.data || dataToValidate;
      } else if (source === 'query') {
        req.query = result.data as any || dataToValidate;
      } else if (source === 'params') {
        req.params = result.data as any || dataToValidate;
      }

      return next();
    }

    // Log validation failure with context
    logValidationFailure(req, result.errors, logLevel);

    // Use custom error handler if provided
    if (customErrorHandler) {
      const customResponse = customErrorHandler(result.errors, req);
      res.status(400).json(customResponse);
      return;
    }

    // Default error response
    const errorResponse = {
      status: 'validation_error',
      message: 'Request validation failed',
      errors: result.errors.map((err) => ({
        field: err.field,
        message: err.message,
        type: err.type,
      })),
      ...(respondWithData && { received: dataToValidate }),
    };

    res.status(400).json(errorResponse);
  };
}

/**
 * Extracts data from request based on source parameter
 */
function getDataSource(
  req: Request,
  source: 'body' | 'query' | 'params' | 'all'
): unknown {
  switch (source) {
    case 'query':
      return req.query;
    case 'params':
      return req.params;
    case 'all':
      return {
        body: req.body,
        query: req.query,
        params: req.params,
      };
    case 'body':
    default:
      return req.body;
  }
}

/**
 * Logs validation failures with request context for debugging
 */
function logValidationFailure(
  req: Request,
  errors: ValidationError[],
  logLevel: 'error' | 'warn' | 'info'
): void {
  const logger = Logger.getInstance();
  const context = {
    correlationId: (req as any).id || req.headers['x-correlation-id'],
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    errors: errors.map((e) => ({
      field: e.field,
      message: e.message,
      type: e.type,
    })),
  };

  logger[logLevel]('Validation failed', context);
}

/**
 * Chained validation for multiple sources
 * Validates body, then query, then params
 */
export function validateMultiple(
  validators: Array<{ validator: IValidator; source: 'body' | 'query' | 'params' }>,
  options: ValidationOptions = {}
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    for (const { validator: val, source } of validators) {
      const data = getDataSource(req, source);
      const result = val.validate(data);

      if (!result.valid) {
        logValidationFailure(req, result.errors, options.logLevel || 'warn');
        const errorResponse = {
          status: 'validation_error',
          message: `${source} validation failed`,
          errors: result.errors,
        };
        res.status(400).json(errorResponse);
        return;
      }

      // Update request with validated data
      if (source === 'body') {
        req.body = result.data || data;
      } else if (source === 'query') {
        req.query = (result.data || data) as any;
      } else if (source === 'params') {
        req.params = (result.data || data) as any;
      }
    }

    next();
  };
}

export function validateRoadmapInput(_req: Request, _res: Response, next: NextFunction): void {
  next();
}

export function validatePlanExists(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
