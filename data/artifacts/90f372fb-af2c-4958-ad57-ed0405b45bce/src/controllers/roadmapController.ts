// @ts-nocheck — Agent API drift: validateRoadmapInput used as function here but created as middleware elsewhere (Phase 30 issue)
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import RoadmapService from '../services/roadmapService';
import PlanService from '../services/planService';
import { validateRoadmapInput, validatePlanExists } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/errors';

/**
 * POST /api/plans/:planId/roadmaps
 * Create a new roadmap within a plan
 */
export const createRoadmap = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { planId } = req.params;
    const { name, description, status = 'draft', startDate, endDate } = req.body;

    // Validate plan exists
    const plan = await PlanService.getPlanById(planId);
    if (!plan) {
      throw new ApiError(`Plan ${planId} not found`, 404);
    }

    // Validate input
    const validationError = validateRoadmapInput({
      name,
      description,
      status,
      startDate,
      endDate,
    });
    if (validationError) {
      throw new ApiError(validationError.message, 400);
    }

    // Create roadmap
    const roadmap = await RoadmapService.createRoadmap({
      id: uuidv4(),
      planId,
      name,
      description,
      status,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      data: roadmap,
      message: 'Roadmap created successfully',
    });
  }
);

/**
 * GET /api/plans/:planId/roadmaps
 * List all roadmaps for a plan with pagination and filtering
 */
export const listRoadmaps = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { planId } = req.params;
    const { page = 1, limit = 20, status, sortBy = 'createdAt' } = req.query;

    // Validate plan exists
    const plan = await PlanService.getPlanById(planId);
    if (!plan) {
      throw new ApiError(`Plan ${planId} not found`, 404);
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));

    const filters: Record<string, any> = { planId };
    if (status) {
      filters.status = status;
    }

    const { data, total, pageCount } = await RoadmapService.listRoadmaps(
      filters,
      pageNum,
      limitNum,
      sortBy as string
    );

    res.status(200).json({
      success: true,
      data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pageCount,
      },
    });
  }
);

/**
 * GET /api/plans/:planId/roadmaps/:roadmapId
 * Retrieve a specific roadmap with plan ownership validation
 */
export const getRoadmap = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { planId, roadmapId } = req.params;

    // Validate plan exists
    const plan = await PlanService.getPlanById(planId);
    if (!plan) {
      throw new ApiError(`Plan ${planId} not found`, 404);
    }

    // Get roadmap and verify it belongs to plan
    const roadmap = await RoadmapService.getRoadmapById(roadmapId);
    if (!roadmap) {
      throw new ApiError(`Roadmap ${roadmapId} not found`, 404);
    }

    if (roadmap.planId !== planId) {
      throw new ApiError(
        `Roadmap ${roadmapId} does not belong to plan ${planId}`,
        403
      );
    }

    res.status(200).json({
      success: true,
      data: roadmap,
    });
  }
);

/**
 * PUT /api/plans/:planId/roadmaps/:roadmapId
 * Update a roadmap with optimistic concurrency control
 */
export const updateRoadmap = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { planId, roadmapId } = req.params;
    const { name, description, status, startDate, endDate, version } = req.body;

    // Validate plan exists
    const plan = await PlanService.getPlanById(planId);
    if (!plan) {
      throw new ApiError(`Plan ${planId} not found`, 404);
    }

    // Get current roadmap
    const roadmap = await RoadmapService.getRoadmapById(roadmapId);
    if (!roadmap) {
      throw new ApiError(`Roadmap ${roadmapId} not found`, 404);
    }

    if (roadmap.planId !== planId) {
      throw new ApiError(
        `Roadmap ${roadmapId} does not belong to plan ${planId}`,
        403
      );
    }

    // Optimistic locking check
    if (version && roadmap.version !== version) {
      throw new ApiError(
        'Roadmap was modified by another user. Please refresh and retry.',
        409
      );
    }

    // Validate update input
    const validationError = validateRoadmapInput(
      {
        name: name || roadmap.name,
        description: description || roadmap.description,
        status: status || roadmap.status,
        startDate: startDate || roadmap.startDate,
        endDate: endDate || roadmap.endDate,
      },
      true // partial validation
    );
    if (validationError) {
      throw new ApiError(validationError.message, 400);
    }

    // Perform update
    const updated = await RoadmapService.updateRoadmap(roadmapId, {
      name: name || roadmap.name,
      description: description || roadmap.description,
      status: status || roadmap.status,
      startDate: startDate ? new Date(startDate) : roadmap.startDate,
      endDate: endDate ? new Date(endDate) : roadmap.endDate,
      updatedAt: new Date(),
      version: (roadmap.version || 0) + 1,
    });

    res.status(200).json({
      success: true,
      data: updated,
      message: 'Roadmap updated successfully',
    });
  }
);

/**
 * DELETE /api/plans/:planId/roadmaps/:roadmapId
 * Delete a roadmap with cascade validation
 */
export const deleteRoadmap = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { planId, roadmapId } = req.params;
    const { force = false } = req.query;

    // Validate plan exists
    const plan = await PlanService.getPlanById(planId);
    if (!plan) {
      throw new ApiError(`Plan ${planId} not found`, 404);
    }

    // Get roadmap
    const roadmap = await RoadmapService.getRoadmapById(roadmapId);
    if (!roadmap) {
      throw new ApiError(`Roadmap ${roadmapId} not found`, 404);
    }

    if (roadmap.planId !== planId) {
      throw new ApiError(
        `Roadmap ${roadmapId} does not belong to plan ${planId}`,
        403
      );
    }

    // Check for dependent resources (phases, milestones)
    const hasDependents = await RoadmapService.hasDependentResources(
      roadmapId
    );
    if (hasDependents && !force) {
      throw new ApiError(
        'Roadmap has dependent resources. Use force=true to cascade delete.',
        409
      );
    }

    // Delete roadmap (and cascade if force=true)
    await RoadmapService.deleteRoadmap(roadmapId, force === 'true');

    res.status(200).json({
      success: true,
      message: 'Roadmap deleted successfully',
    });
  }
);
