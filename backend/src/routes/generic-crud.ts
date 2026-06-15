import { Router, Request, Response, NextFunction } from 'express';
import { PersistenceService } from '../services/persistence.js';
import { ValidationService } from '../services/validation.js';
import { ApiError, createResponse, createErrorResponse } from '../types/responses.js';

export const createGenericCrudRoutes = (
  persistence: PersistenceService,
  validation: ValidationService,
  collection: string,
  schemaName?: string
) => {
  const router = Router();
  const validationSchema = schemaName || collection.replace('-', '_');

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await persistence.list(collection);
      res.json(createResponse(items));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = await validation.loadSchema(validationSchema);
      if (schema) {
        const errors = validation.validate(req.body, schema);
        if (errors.length > 0) {
          return res.status(400).json(createErrorResponse('Validation failed', errors));
        }
      }

      const item = await persistence.create(collection, req.body);
      res.status(201).json(createResponse(item));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = await persistence.read(collection, req.params.id);
      if (!item) {
        throw new ApiError(404, `${collection} item not found`);
      }
      res.json(createResponse(item));
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await persistence.read(collection, req.params.id);
      if (!existing) {
        throw new ApiError(404, `${collection} item not found`);
      }

      const updated = await persistence.update(collection, req.params.id, req.body);
      res.json(createResponse(updated));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await persistence.delete(collection, req.params.id);
      if (!deleted) {
        throw new ApiError(404, `${collection} item not found`);
      }
      res.json(createResponse({ id: req.params.id, deleted: true }));
    } catch (err) {
      next(err);
    }
  });

  return router;
};
