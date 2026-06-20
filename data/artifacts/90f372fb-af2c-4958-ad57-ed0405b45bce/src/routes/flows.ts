import { Router, Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../database';
import { Plan } from '../entities/Plan';
import { Roadmap } from '../entities/Roadmap';
import { Run } from '../entities/Run';
import { ValidationError, DatabaseError } from '../errors';
import { logger } from '../logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/flows/create-plan-roadmap-run
 *
 * Creates a Plan, Roadmap, and Run in a single atomic transaction.
 * On partial failure, all entities are rolled back.
 *
 * Request body:
 * {
 *   plan: { name, description, startDate, endDate, metadata? },
 *   roadmap: { name, description, milestones[], planId?, metadata? },
 *   run: { name, description, status?, runConfig?, planId?, roadmapId? }
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     plan: { id, name, ...full object },
 *     roadmap: { id, name, planId, ...full object },
 *     run: { id, name, planId, roadmapId, ...full object }
 *   },
 *   metadata: {
 *     transactionId: string,
 *     createdAt: ISO8601,
 *     duration: ms
 *   }
 * }
 */
router.post(
  '/create-plan-roadmap-run',
  async (req: Request, res: Response, next: NextFunction) => {
    const transactionId = uuidv4();
    const startTime = Date.now();
    const queryRunner = AppDataSource.createQueryRunner();

    try {
      // Validate input schema
      const { plan: planInput, roadmap: roadmapInput, run: runInput } =
        validateCreateFlowInput(req.body);

      logger.info(`[${transactionId}] Starting flow creation transaction`, {
        plan: planInput.name,
        roadmap: roadmapInput.name,
        run: runInput.name,
      });

      // Connect and begin transaction
      await queryRunner.connect();
      await queryRunner.startTransaction('SERIALIZABLE');

      // Step 1: Create Plan
      const plan = await createPlanTransaction(queryRunner, planInput);
      logger.debug(`[${transactionId}] Plan created: ${plan.id}`);

      // Step 2: Create Roadmap (linked to Plan)
      const roadmap = await createRoadmapTransaction(
        queryRunner,
        roadmapInput,
        plan.id
      );
      logger.debug(`[${transactionId}] Roadmap created: ${roadmap.id}`);

      // Step 3: Create Run (linked to Plan and Roadmap)
      const run = await createRunTransaction(
        queryRunner,
        runInput,
        plan.id,
        roadmap.id
      );
      logger.debug(`[${transactionId}] Run created: ${run.id}`);

      // Commit transaction
      await queryRunner.commitTransaction();
      logger.info(`[${transactionId}] Transaction committed successfully`);

      // Fetch complete object graphs with relationships
      const completePlan = await AppDataSource.manager.findOne(Plan, {
        where: { id: plan.id },
      });

      const completeRoadmap = await AppDataSource.manager.findOne(Roadmap, {
        where: { id: roadmap.id },
      });

      const completeRun = await AppDataSource.manager.findOne(Run, {
        where: { id: run.id },
      });

      const duration = Date.now() - startTime;

      res.status(201).json({
        success: true,
        data: {
          plan: completePlan,
          roadmap: completeRoadmap,
          run: completeRun,
        },
        metadata: {
          transactionId,
          createdAt: new Date().toISOString(),
          duration,
        },
      });
    } catch (error) {
      // Rollback on any error
      try {
        if (queryRunner.isTransactionActive) {
          await queryRunner.rollbackTransaction();
          logger.warn(`[${transactionId}] Transaction rolled back due to error`);
        }
      } catch (rollbackError) {
        logger.error(
          `[${transactionId}] Rollback failed`,
          rollbackError as Error
        );
      }

      // Normalize error response
      if (error instanceof ValidationError) {
        logger.warn(`[${transactionId}] Validation error: ${error.message}`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details,
            transactionId,
          },
        });
      }

      if (error instanceof DatabaseError) {
        logger.error(`[${transactionId}] Database error`, error as Error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to create flow entities',
            transactionId,
          },
        });
      }

      // Generic error handler
      logger.error(`[${transactionId}] Unexpected error`, error as Error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          transactionId,
        },
      });
    } finally {
      // Always release query runner
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }
  }
);

/**
 * Validates input payload structure and content
 */
function validateCreateFlowInput(body: any) {
  if (!body.plan || !body.roadmap || !body.run) {
    throw new ValidationError('Missing required fields: plan, roadmap, run');
  }

  // Validate Plan
  if (!body.plan.name || typeof body.plan.name !== 'string') {
    throw new ValidationError('Plan name is required and must be a string');
  }
  if (!body.plan.startDate || !body.plan.endDate) {
    throw new ValidationError(
      'Plan startDate and endDate are required (ISO8601 format)'
    );
  }
  if (new Date(body.plan.startDate) >= new Date(body.plan.endDate)) {
    throw new ValidationError('Plan startDate must be before endDate');
  }

  // Validate Roadmap
  if (!body.roadmap.name || typeof body.roadmap.name !== 'string') {
    throw new ValidationError('Roadmap name is required and must be a string');
  }
  if (!Array.isArray(body.roadmap.milestones)) {
    throw new ValidationError('Roadmap milestones must be an array');
  }
  if (body.roadmap.milestones.length === 0) {
    throw new ValidationError('Roadmap must have at least one milestone');
  }

  // Validate Run
  if (!body.run.name || typeof body.run.name !== 'string') {
    throw new ValidationError('Run name is required and must be a string');
  }
  if (body.run.status && !['PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED'].includes(body.run.status)) {
    throw new ValidationError('Run status must be one of: PENDING, ACTIVE, PAUSED, COMPLETED');
  }

  return {
    plan: {
      name: body.plan.name.trim(),
      description: body.plan.description?.trim() || '',
      startDate: new Date(body.plan.startDate),
      endDate: new Date(body.plan.endDate),
      metadata: body.plan.metadata || {},
    },
    roadmap: {
      name: body.roadmap.name.trim(),
      description: body.roadmap.description?.trim() || '',
      milestones: body.roadmap.milestones,
      metadata: body.roadmap.metadata || {},
    },
    run: {
      name: body.run.name.trim(),
      description: body.run.description?.trim() || '',
      status: body.run.status || 'PENDING',
      runConfig: body.run.runConfig || {},
    },
  };
}

/**
 * Creates Plan within transaction context
 */
async function createPlanTransaction(queryRunner: any, planInput: any) {
  const plan = new Plan();
  plan.id = uuidv4();
  plan.name = planInput.name;
  plan.description = planInput.description;
  plan.startDate = planInput.startDate;
  plan.endDate = planInput.endDate;
  plan.metadata = planInput.metadata;
  plan.createdAt = new Date();
  plan.updatedAt = new Date();

  try {
    const savedPlan = await queryRunner.manager.save(Plan, plan);
    return savedPlan;
  } catch (error) {
    throw new DatabaseError(
      `Failed to create Plan: ${(error as Error).message}`
    );
  }
}

/**
 * Creates Roadmap within transaction context
 */
async function createRoadmapTransaction(
  queryRunner: any,
  roadmapInput: any,
  planId: string
) {
  const roadmap = new Roadmap();
  roadmap.id = uuidv4();
  roadmap.name = roadmapInput.name;
  roadmap.description = roadmapInput.description;
  roadmap.planId = planId;
  roadmap.metadata = roadmapInput.metadata;
  roadmap.createdAt = new Date();
  roadmap.updatedAt = new Date();

  try {
    const savedRoadmap = await queryRunner.manager.save(Roadmap, roadmap);
    return savedRoadmap;
  } catch (error) {
    throw new DatabaseError(
      `Failed to create Roadmap: ${(error as Error).message}`
    );
  }
}

/**
 * Creates Run within transaction context
 */
async function createRunTransaction(
  queryRunner: any,
  runInput: any,
  planId: string,
  roadmapId: string
) {
  const run = new Run();
  run.id = uuidv4();
  run.name = runInput.name;
  run.description = runInput.description;
  run.planId = planId;
  run.roadmapId = roadmapId;
  run.status = runInput.status;
  run.runConfig = runInput.runConfig;
  run.createdAt = new Date();
  run.updatedAt = new Date();

  try {
    const savedRun = await queryRunner.manager.save(Run, run);
    return savedRun;
  } catch (error) {
    throw new DatabaseError(
      `Failed to create Run: ${(error as Error).message}`
    );
  }
}

export default router;