import { Router, Request, Response } from 'express';
import { PersistenceService } from '../services/persistence.js';
import { ValidationService } from '../services/validation.js';
import { DesignPlanGenerator } from '../services/design-plan-generator.js';
import { ApprovalService } from '../services/approval-service.js';
import { Application, DesignPlan } from '@unifiedaitoolbox/shared';
import { createResponse, ApiError } from '../types/responses.js';
import { createGenericCrudRoutes } from './generic-crud.js';

export const createDesignPlanRoutes = (
  persistence: PersistenceService,
  validation: ValidationService
) => {
  const router = Router();
  const generator = new DesignPlanGenerator();
  const approvalService = new ApprovalService();

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

      // Generate design plan (async — may call LLM)
      const designPlanData = await generator.generateFromApplication(application);
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

  // Move design plan to reviewing status
  router.patch('/:id/review', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const designPlan = await persistence.read<DesignPlan>('design-plans', id);
      if (!designPlan) {
        throw new ApiError(404, 'Design plan not found');
      }

      const updated = approvalService.moveToReview(designPlan);
      const result = await persistence.update<DesignPlan>('design-plans', id, updated);

      res.json(createResponse(result));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to move to review',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Approve or reject design plan
  router.patch('/:id/decision/:decision', async (req: Request, res: Response) => {
    try {
      const { id, decision } = req.params;
      const { approver } = req.body;

      if (!approver) {
        throw new ApiError(400, 'Approver is required');
      }

      if (decision !== 'approve' && decision !== 'reject') {
        throw new ApiError(400, 'Decision must be "approve" or "reject"');
      }

      const designPlan = await persistence.read<DesignPlan>('design-plans', id);
      if (!designPlan) {
        throw new ApiError(404, 'Design plan not found');
      }

      const updated = approvalService.applyApproval(
        designPlan,
        decision as 'approve' | 'reject',
        approver
      );
      const result = await persistence.update<DesignPlan>('design-plans', id, updated);

      res.json(createResponse(result));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to apply decision',
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
