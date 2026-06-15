import { Router, Request, Response } from 'express';
import { PersistenceService } from '../services/persistence.js';
import { ValidationService } from '../services/validation.js';
import { RoadmapGenerator } from '../services/roadmap-generator.js';
import { DesignPlan, Roadmap } from '@unifiedaitoolbox/shared';
import { createResponse, ApiError } from '../types/responses.js';
import { createGenericCrudRoutes } from './generic-crud.js';

export const createRoadmapRoutes = (
  persistence: PersistenceService,
  validation: ValidationService
) => {
  const router = Router();
  const generator = new RoadmapGenerator();

  // Generate roadmap from approved design plan
  router.post('/generate/:designPlanId', async (req: Request, res: Response) => {
    try {
      const { designPlanId } = req.params;

      // Fetch the design plan
      const designPlan = await persistence.read<DesignPlan>('design-plans', designPlanId);
      if (!designPlan) {
        throw new ApiError(404, 'Design plan not found');
      }

      if (designPlan.status !== 'approved') {
        throw new ApiError(400, `Design plan must be approved to generate roadmap, current status: ${designPlan.status}`);
      }

      // Check if roadmap already exists for this design plan
      const existingRoadmaps = await persistence.list<Roadmap>('roadmaps');
      const existing = existingRoadmaps.find(r => r.designPlanId === designPlanId && r.status === 'draft');
      if (existing) {
        return res.json(createResponse(existing));
      }

      // Generate roadmap
      const roadmapData = generator.generateFromDesignPlan(designPlan, designPlan.applicationId);
      const roadmap = await persistence.create<Roadmap>('roadmaps', roadmapData);

      res.status(201).json(createResponse(roadmap));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to generate roadmap',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Approve roadmap (state transition — PATCH, not PUT)
  router.patch('/:id/approve', async (req: Request, res: Response) => {
    try {
      const roadmap = await persistence.read<Roadmap>('roadmaps', req.params.id);
      if (!roadmap) {
        throw new ApiError(404, 'Roadmap not found');
      }

      const updated = await persistence.update<Roadmap>('roadmaps', req.params.id, {
        status: 'approved',
        approvedBy: (req.body as { approver?: string }).approver || 'unknown',
        approvedAt: new Date().toISOString(),
      });

      res.json(createResponse(updated));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message, timestamp: new Date().toISOString() });
      } else {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to approve roadmap', timestamp: new Date().toISOString() });
      }
    }
  });

  // Reject roadmap (state transition — PATCH, not PUT)
  router.patch('/:id/reject', async (req: Request, res: Response) => {
    try {
      const roadmap = await persistence.read<Roadmap>('roadmaps', req.params.id);
      if (!roadmap) {
        throw new ApiError(404, 'Roadmap not found');
      }

      const updated = await persistence.update<Roadmap>('roadmaps', req.params.id, {
        status: 'rejected',
        approvedBy: (req.body as { approver?: string }).approver || 'unknown',
        approvedAt: new Date().toISOString(),
      });

      res.json(createResponse(updated));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message, timestamp: new Date().toISOString() });
      } else {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to reject roadmap', timestamp: new Date().toISOString() });
      }
    }
  });

  // Attach generic CRUD routes
  const crudRoutes = createGenericCrudRoutes(persistence, validation, 'roadmaps', 'roadmap');
  router.use(crudRoutes);

  return router;
};
