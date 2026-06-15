import { Router, Request, Response } from 'express';
import { PersistenceService } from '../services/persistence.js';
import { ValidationService } from '../services/validation.js';
import { RunService } from '../services/run-service.js';
import { CostTracker } from '../services/cost-tracker.js';
import { Roadmap, Run } from '@unifiedaitoolbox/shared';
import { createResponse, ApiError } from '../types/responses.js';
import { createGenericCrudRoutes } from './generic-crud.js';

export const createRunRoutes = (
  persistence: PersistenceService,
  validation: ValidationService
) => {
  const router = Router();
  const runService = new RunService();

  // Create run from approved roadmap
  router.post('/from-roadmap/:roadmapId', async (req: Request, res: Response) => {
    try {
      const { roadmapId } = req.params;

      // Fetch the roadmap
      const roadmap = await persistence.read<Roadmap>('roadmaps', roadmapId);
      if (!roadmap) {
        throw new ApiError(404, 'Roadmap not found');
      }

      if (roadmap.status !== 'approved') {
        throw new ApiError(400, `Roadmap must be approved to create run, current status: ${roadmap.status}`);
      }

      // Create run from roadmap
      const runData = runService.createRunFromRoadmap(roadmap, roadmap.applicationId);
      const run = await persistence.create<Run>('runs', runData);

      res.status(201).json(createResponse(run));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to create run',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Start run execution
  router.patch('/:id/start', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const updated = runService.startRun(run);
      const result = await persistence.update<Run>('runs', id, updated);

      res.json(createResponse(result));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to start run',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Pause run
  router.patch('/:id/pause', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const updated = runService.pauseRun(run);
      const result = await persistence.update<Run>('runs', id, updated);

      res.json(createResponse(result));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to pause run',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Assign task
  router.patch('/:id/phase/:phaseId/task/:taskId/assign', async (req: Request, res: Response) => {
    try {
      const { id, phaseId, taskId } = req.params;
      const { assignedTo } = req.body;

      if (!assignedTo) {
        throw new ApiError(400, 'assignedTo is required');
      }

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const updated = runService.assignTask(run, phaseId, taskId, assignedTo);
      const result = await persistence.update<Run>('runs', id, updated);

      res.json(createResponse(result));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to assign task',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Start task
  router.patch('/:id/phase/:phaseId/task/:taskId/start', async (req: Request, res: Response) => {
    try {
      const { id, phaseId, taskId } = req.params;

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const updated = runService.startTask(run, phaseId, taskId);
      const result = await persistence.update<Run>('runs', id, updated);

      res.json(createResponse(result));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to start task',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Complete task
  router.patch('/:id/phase/:phaseId/task/:taskId/complete', async (req: Request, res: Response) => {
    try {
      const { id, phaseId, taskId } = req.params;
      const { output } = req.body;

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const updated = runService.completeTask(run, phaseId, taskId, output);
      const result = await persistence.update<Run>('runs', id, updated);

      res.json(createResponse(result));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to complete task',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Fail task
  router.patch('/:id/phase/:phaseId/task/:taskId/fail', async (req: Request, res: Response) => {
    try {
      const { id, phaseId, taskId } = req.params;
      const { error } = req.body;

      if (!error) {
        throw new ApiError(400, 'error message is required');
      }

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const updated = runService.failTask(run, phaseId, taskId, error);
      const result = await persistence.update<Run>('runs', id, updated);

      res.json(createResponse(result));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(400).json({
          error: error instanceof Error ? error.message : 'Failed to fail task',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Cost tracking endpoints
  const costTracker = new CostTracker();

  // Get cost summary for a specific run
  router.get('/:id/costs', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const costSummary = costTracker.getCostSummary(run);
      const costBreakdown = costTracker.getCostBreakdown(run);

      res.json(createResponse({
        summary: costSummary,
        breakdown: costBreakdown,
        totalCost: run.totalCost,
      }));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to fetch run costs',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Get cost statistics across all runs
  router.get('/costs/summary', async (req: Request, res: Response) => {
    try {
      const allRuns = await persistence.list<Run>('runs');

      const statistics = costTracker.getStatistics(allRuns);
      const trends = costTracker.getCostTrend(allRuns);

      res.json(createResponse({
        statistics,
        trends,
        runsCount: allRuns.length,
        completedRunsCount: allRuns.filter(run => run.totalCost).length,
      }));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch cost statistics',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Attach generic CRUD routes
  const crudRoutes = createGenericCrudRoutes(persistence, validation, 'runs', 'run');
  router.use(crudRoutes);

  return router;
};
