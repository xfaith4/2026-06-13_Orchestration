import { Router, Request, Response, NextFunction } from 'express';
import { PersistenceService } from '../services/persistence.js';
import { ValidationService } from '../services/validation.js';
import { ApiError, createResponse, createErrorResponse } from '../types/responses.js';

export const createApplicationRoutes = (
  persistence: PersistenceService,
  validation: ValidationService
) => {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applications = await persistence.list('applications');
      res.json(createResponse(applications));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schema = await validation.loadSchema('application');
      if (!schema) {
        throw new ApiError(500, 'Schema not found');
      }

      const errors = validation.validate(req.body, schema);
      if (errors.length > 0) {
        return res.status(400).json(createErrorResponse('Validation failed', errors));
      }

      const application = await persistence.create('applications', req.body);
      res.status(201).json(createResponse(application));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await persistence.read('applications', req.params.id);
      if (!application) {
        throw new ApiError(404, 'Application not found');
      }
      res.json(createResponse(application));
    } catch (err) {
      next(err);
    }
  });

  router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await persistence.read('applications', req.params.id);
      if (!existing) {
        throw new ApiError(404, 'Application not found');
      }

      const updated = await persistence.update('applications', req.params.id, req.body);
      res.json(createResponse(updated));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await persistence.delete('applications', req.params.id);
      if (!deleted) {
        throw new ApiError(404, 'Application not found');
      }
      res.json(createResponse({ id: req.params.id, deleted: true }));
    } catch (err) {
      next(err);
    }
  });

  return router;
};
