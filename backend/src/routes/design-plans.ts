import { Router, Request, Response } from 'express';
import { PersistenceService } from '../services/persistence.js';
import { ValidationService } from '../services/validation.js';
import { DesignPlanGenerator } from '../services/design-plan-generator.js';
import { Application, DesignPlan } from '@unifiedaitoolbox/shared';
import { createResponse, ApiError } from '../types/responses.js';
import { createGenericCrudRoutes } from './generic-crud.js';

export const createDesignPlanRoutes = (
  persistence: PersistenceService,
  validation: ValidationService
) => {
  const router = Router();
  const generator = new DesignPlanGenerator();

  // Generate design plan from application
  router.post('/generate/:applicationId', async (req: Request, res: Response) => {
    try {
      const { applicationId } = req.params;

      // Fetch the application
      const application = await persistence.read<Application>('applications', applicationId);
      if (!application) {
        throw new ApiError(404, 'Application not found');
      }

      // Check if design plan already exists for this application
      const existingPlans = await persistence.list<DesignPlan>('design-plans');
      const existing = existingPlans.find(p => p.applicationId === applicationId && p.status === 'draft');
      if (existing) {
        return res.json(createResponse(existing));
      }

      // Generate design plan
      const designPlanData = generator.generateFromApplication(application);
      const designPlan = await persistence.create<DesignPlan>('design-plans', designPlanData);

      res.status(201).json(createResponse(designPlan));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: 'Failed to generate design plan',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Attach generic CRUD routes
  const crudRoutes = createGenericCrudRoutes(persistence, validation, 'design-plans', 'design_plan');
  router.use(crudRoutes);

  return router;
};
