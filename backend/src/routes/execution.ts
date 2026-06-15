import { Router, Request, Response } from 'express';
import { PersistenceService } from '../services/persistence.js';
import { Run, ExecutionPhase } from '@unifiedaitoolbox/shared';
import { createResponse, ApiError } from '../types/responses.js';
import { TaskExecutor } from '../services/task-executor.js';
import { PhaseExecutor } from '../services/phase-executor.js';
import { AgentRegistry } from '../services/agent-registry.js';
import { PromptRegistry } from '../services/prompt-registry.js';
import { CostTracker } from '../services/cost-tracker.js';
import { ErrorLogger } from '../services/error-logger.js';
import { RunStateMachine } from '../services/run-state-machine.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const createExecutionRoutes = (persistence: PersistenceService) => {
  const router = Router();

  // Initialize services
  let servicesInitialized = false;
  let taskExecutor: TaskExecutor;
  let phaseExecutor: PhaseExecutor;
  let agentRegistry: AgentRegistry;
  let promptRegistry: PromptRegistry;
  let costTracker: CostTracker;
  let errorLogger: ErrorLogger;
  let stateMachine: RunStateMachine;

  const ensureInitialized = async () => {
    if (!servicesInitialized) {
      const agentsDir = path.join(__dirname, '..', '..', '..', 'agents');
      const promptsDir = path.join(__dirname, '..', '..', '..', 'Prompts');

      agentRegistry = new AgentRegistry(persistence, agentsDir);
      promptRegistry = new PromptRegistry(persistence, promptsDir);
      costTracker = new CostTracker();
      errorLogger = new ErrorLogger(persistence);
      stateMachine = new RunStateMachine();

      await agentRegistry.initialize();
      await promptRegistry.initialize();

      taskExecutor = new TaskExecutor(agentRegistry, promptRegistry);
      phaseExecutor = new PhaseExecutor(taskExecutor, costTracker, errorLogger);

      servicesInitialized = true;
    }
  };

  // Execute a single task
  router.post('/:runId/phase/:phaseId/task/:taskId/execute', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { runId, phaseId, taskId } = req.params;
      const { agentId, promptId, variables } = req.body;

      if (!agentId) {
        throw new ApiError(400, 'agentId is required');
      }

      // Fetch run
      const run = await persistence.read<Run>('runs', runId);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      // Find phase and task
      const phase = run.phases.find(p => p.id === phaseId);
      if (!phase) {
        throw new ApiError(404, 'Phase not found in run');
      }

      const task = phase.tasks.find(t => t.id === taskId);
      if (!task) {
        throw new ApiError(404, 'Task not found in phase');
      }

      // Execute task
      const result = await taskExecutor.executeTask({
        task,
        agentId,
        promptId,
        variables: variables || {},
      });

      // Update task status using state machine
      const newTaskStatus = result.success ? ('completed' as const) : ('failed' as const);
      if (stateMachine.canTransitionTask(task.status as any, newTaskStatus)) {
        stateMachine.transitionTask(runId, phaseId, taskId, task.status as any, newTaskStatus, 'Task execution completed');
      }

      const updatedTask = {
        ...task,
        status: newTaskStatus,
        completedAt: new Date().toISOString(),
        output: result.output,
        error: result.error,
      };

      // Update phase status
      const newPhaseStatus = result.success ? ('completed' as const) : ('failed' as const);
      const updatedPhase = {
        ...phase,
        status: newPhaseStatus,
        tasks: phase.tasks.map(t => t.id === taskId ? updatedTask : t),
        completedAt: new Date().toISOString(),
      };

      const updatedRun: Run = {
        ...run,
        phases: run.phases.map(p => p.id === phaseId ? updatedPhase : p),
      };

      await persistence.update<Run>('runs', runId, updatedRun);

      res.json(createResponse(result));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Task execution failed',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Execute entire phase
  router.post('/:runId/phase/:phaseId/execute', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { runId, phaseId } = req.params;
      const { agentAssignments, promptAssignments, variables } = req.body;

      if (!agentAssignments) {
        throw new ApiError(400, 'agentAssignments is required');
      }

      // Fetch run
      const run = await persistence.read<Run>('runs', runId);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      // Find phase
      const phase = run.phases.find(p => p.id === phaseId);
      if (!phase) {
        throw new ApiError(404, 'Phase not found in run');
      }

      // Execute phase
      const result = await phaseExecutor.executePhase({
        phase,
        agentAssignments,
        promptAssignments: promptAssignments || {},
        variables: variables || {},
      });

      // Update phase status using state machine
      const newPhaseStatus = result.success ? ('completed' as const) : ('failed' as const);
      if (stateMachine.canTransitionPhase(phase.status, newPhaseStatus)) {
        stateMachine.transitionPhase(runId, phaseId, phase.status, newPhaseStatus, 'Phase execution completed');
      }

      const updatedPhase: ExecutionPhase = {
        ...phase,
        status: newPhaseStatus,
        completedAt: new Date().toISOString(),
      };

      const updatedRun: Run = {
        ...run,
        phases: run.phases.map(p => p.id === phaseId ? (updatedPhase as ExecutionPhase) : p),
      };

      await persistence.update<Run>('runs', runId, updatedRun);

      res.json(createResponse(result));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Phase execution failed',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Get execution plan for a task
  router.get('/:runId/phase/:phaseId/task/:taskId/plan', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { runId, phaseId, taskId } = req.params;

      // Fetch run
      const run = await persistence.read<Run>('runs', runId);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      // Find task
      const phase = run.phases.find(p => p.id === phaseId);
      if (!phase) {
        throw new ApiError(404, 'Phase not found');
      }

      const task = phase.tasks.find(t => t.id === taskId);
      if (!task) {
        throw new ApiError(404, 'Task not found');
      }

      // Get execution plan
      const plan = await taskExecutor.getExecutionPlan(task);

      res.json(createResponse(plan));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to get execution plan',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Get execution plan for a phase
  router.get('/:runId/phase/:phaseId/plan', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { runId, phaseId } = req.params;

      // Fetch run
      const run = await persistence.read<Run>('runs', runId);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      // Find phase
      const phase = run.phases.find(p => p.id === phaseId);
      if (!phase) {
        throw new ApiError(404, 'Phase not found');
      }

      // Get execution plan
      const plan = await phaseExecutor.getPhaseExecutionPlan(phase);

      res.json(createResponse(plan));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to get phase execution plan',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  return router;
};
