import { Router, Request, Response } from 'express';
import { PersistenceService } from '../services/persistence.js';
import { ValidationService } from '../services/validation.js';
import { createApplicationRoutes } from './applications.js';
import { createDesignPlanRoutes } from './design-plans.js';
import { createRoadmapRoutes } from './roadmaps.js';
import { createGenericCrudRoutes } from './generic-crud.js';

export const createApiRoutes = (
  persistence: PersistenceService,
  validation: ValidationService
) => {
  const router = Router();

  router.use('/applications', createApplicationRoutes(persistence, validation));
  router.use('/design-plans', createDesignPlanRoutes(persistence, validation));
  router.use('/roadmaps', createRoadmapRoutes(persistence, validation));
  router.use('/runs', createGenericCrudRoutes(persistence, validation, 'runs', 'run'));
  router.use('/agents', createGenericCrudRoutes(persistence, validation, 'agents'));
  router.use('/prompts', createGenericCrudRoutes(persistence, validation, 'prompts'));
  router.use('/contracts', createGenericCrudRoutes(persistence, validation, 'contracts'));

  return router;
};
