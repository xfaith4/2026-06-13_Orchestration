import { Router, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PersistenceService } from '../services/persistence.js';
import { ValidationService } from '../services/validation.js';
import { RunService } from '../services/run-service.js';
import { CostTracker } from '../services/cost-tracker.js';
import { ErrorLogger } from '../services/error-logger.js';
import { AgentRegistry } from '../services/agent-registry.js';
import { PromptRegistry } from '../services/prompt-registry.js';
import { TaskExecutor } from '../services/task-executor.js';
import { PhaseExecutor } from '../services/phase-executor.js';
import { ArtifactStore } from '../services/artifact-store.js';
import { RunCompletion } from '../services/run-completion.js';
import { FailureClassifier } from '../services/failure-classifier.js';
import { RepairStrategist } from '../services/repair-strategist.js';
import { OutputParser } from '../services/output-parser.js';
import { Roadmap, Run } from '@unifiedaitoolbox/shared';
import { createResponse, ApiError } from '../types/responses.js';
import { createGenericCrudRoutes } from './generic-crud.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface MaterializationResult {
  runId: string;
  tasksScanned: number;
  artifactsCreated: number;
  artifactsSkipped: number;
  errors: Array<{ taskId: string; message: string; filePath?: string }>;
  filePaths: string[];
}

const getArtifactsDirectory = (persistence: PersistenceService): string =>
  path.join(persistence.getDataDir(), 'artifacts');

const guessMimeType = (filePath: string): string => {
  const extension = path.extname(filePath).toLowerCase();
  switch (extension) {
    case '.ts':
    case '.tsx':
      return 'text/typescript';
    case '.js':
    case '.jsx':
      return 'text/javascript';
    case '.json':
      return 'application/json';
    case '.md':
      return 'text/markdown';
    case '.html':
      return 'text/html';
    case '.css':
      return 'text/css';
    case '.yml':
    case '.yaml':
      return 'application/yaml';
    case '.py':
      return 'text/x-python';
    case '.sh':
      return 'application/x-sh';
    default:
      return 'text/plain';
  }
};

const createArtifactKey = (taskId: string, name: string): string => `${taskId}::${name}`;

async function buildExistingArtifactMap(
  artifactStore: ArtifactStore,
  runId: string
): Promise<Map<string, true>> {
  const artifacts = await artifactStore.getArtifactsForRun(runId);
  return new Map(
    artifacts
      .filter(artifact => artifact.taskId)
      .map(artifact => [createArtifactKey(artifact.taskId!, artifact.name), true] as const)
  );
}

async function materializeTaskArtifacts(
  artifactStore: ArtifactStore,
  outputParser: OutputParser,
  existingArtifacts: Map<string, true>,
  params: {
    runId: string;
    phaseId: string;
    phaseName: string;
    taskId: string;
    output: unknown;
  }
): Promise<Omit<MaterializationResult, 'runId' | 'tasksScanned'>> {
  const fileArtifacts = outputParser.parseTaskOutput(params.output);
  const result = {
    artifactsCreated: 0,
    artifactsSkipped: 0,
    errors: [] as Array<{ taskId: string; message: string; filePath?: string }>,
    filePaths: [] as string[],
  };

  for (const artifact of fileArtifacts) {
    const key = createArtifactKey(params.taskId, artifact.filePath);
    if (existingArtifacts.has(key)) {
      result.artifactsSkipped++;
      continue;
    }

    try {
      await artifactStore.saveArtifact(artifact.content, {
        runId: params.runId,
        phaseId: params.phaseId,
        taskId: params.taskId,
        name: artifact.filePath,
        storageSubpath: artifact.filePath,
        type: 'code',
        mimeType: guessMimeType(artifact.filePath),
        tags: ['materialized-output', params.phaseName],
        metadata: {
          language: artifact.language,
          materializedFrom: 'task-output',
        },
      });
      existingArtifacts.set(key, true);
      result.artifactsCreated++;
      result.filePaths.push(artifact.filePath);
    } catch (error) {
      result.errors.push({
        taskId: params.taskId,
        filePath: artifact.filePath,
        message: error instanceof Error ? error.message : 'Artifact save failed',
      });
    }
  }

  return result;
}

async function materializeRunArtifacts(
  run: Run,
  artifactStore: ArtifactStore,
  outputParser: OutputParser,
  existingArtifacts?: Map<string, true>
): Promise<MaterializationResult> {
  const seenArtifacts = existingArtifacts || await buildExistingArtifactMap(artifactStore, run.id);
  const result: MaterializationResult = {
    runId: run.id,
    tasksScanned: 0,
    artifactsCreated: 0,
    artifactsSkipped: 0,
    errors: [],
    filePaths: [],
  };

  for (const phase of run.phases || []) {
    for (const task of phase.tasks || []) {
      if (!task.output) {
        continue;
      }

      result.tasksScanned++;
      const taskResult = await materializeTaskArtifacts(
        artifactStore,
        outputParser,
        seenArtifacts,
        {
          runId: run.id,
          phaseId: phase.id,
          phaseName: phase.name,
          taskId: task.id,
          output: task.output,
        }
      );

      result.artifactsCreated += taskResult.artifactsCreated;
      result.artifactsSkipped += taskResult.artifactsSkipped;
      result.errors.push(...taskResult.errors);
      result.filePaths.push(...taskResult.filePaths);
    }
  }

  return result;
}

async function refreshRunSummary(
  persistence: PersistenceService,
  artifactStore: ArtifactStore,
  runCompletion: RunCompletion,
  run: Run,
  fallbackStartTime?: Date
): Promise<void> {
  const completionTime = run.completedAt ? new Date(run.completedAt) : new Date();
  const startTime = run.startedAt
    ? new Date(run.startedAt)
    : fallbackStartTime || new Date(run.createdAt);
  const artifactSummary = await artifactStore.getRunArtifactSummary(run.id);
  const summary = runCompletion.generateSummary(run, startTime, completionTime, artifactSummary);
  const existing = await persistence.read('run-summaries', summary.id);

  if (existing) {
    await persistence.update('run-summaries', summary.id, summary);
  } else {
    await persistence.create('run-summaries', summary);
  }
}

async function executeRunAsync(runId: string, persistence: PersistenceService): Promise<void> {
  const agentsDir = path.join(__dirname, '..', '..', '..', 'agents');
  const promptsDir = path.join(__dirname, '..', '..', '..', 'Prompts');
  const artifactsDir = getArtifactsDirectory(persistence);

  const agentRegistry = new AgentRegistry(persistence, agentsDir);
  const promptRegistry = new PromptRegistry(persistence, promptsDir);
  await agentRegistry.initialize();
  await promptRegistry.initialize();

  const costTracker = new CostTracker();
  const errorLogger = new ErrorLogger(persistence);
  const taskExecutor = new TaskExecutor(agentRegistry, promptRegistry);
  const phaseExecutor = new PhaseExecutor(taskExecutor, costTracker, errorLogger);
  const artifactStore = new ArtifactStore(persistence, { storagePath: artifactsDir });
  const runCompletion = new RunCompletion();
  const outputParser = new OutputParser();
  const existingArtifacts = await buildExistingArtifactMap(artifactStore, runId);

  const agents = agentRegistry.getAllAgents();
  const defaultAgent = agents[0];
  if (!defaultAgent) {
    console.warn(`[auto-exec] No agents available for run ${runId} — execution skipped`);
    return;
  }

  let currentRun = await persistence.read<Run>('runs', runId);
  if (!currentRun) return;

  const runStartTime = new Date();

  for (const phase of currentRun.phases) {
    // Re-read in case run was paused/cancelled externally
    currentRun = (await persistence.read<Run>('runs', runId)) || currentRun;
    if (currentRun.status !== 'running') return;
    if (phase.status !== 'pending') continue;

    // Mark phase in-progress
    const inProgressRun: Run = {
      ...currentRun,
      phases: currentRun.phases.map(p =>
        p.id === phase.id
          ? { ...p, status: 'in-progress' as const, startedAt: new Date().toISOString() }
          : p
      ),
    };
    await persistence.update<Run>('runs', runId, inProgressRun);
    currentRun = inProgressRun;

    // Assign default agent to every task in this phase
    const agentAssignments: Record<string, string> = {};
    for (const task of phase.tasks) {
      agentAssignments[task.id] = defaultAgent.id;
    }

    const phaseResult = await phaseExecutor.executePhase({
      phase,
      agentAssignments,
      onTaskComplete: async (taskId, output) => {
        if (!output.success || !output.output) {
          return;
        }

        const materialized = await materializeTaskArtifacts(
          artifactStore,
          outputParser,
          existingArtifacts,
          {
            runId,
            phaseId: phase.id,
            phaseName: phase.name,
            taskId,
            output: output.output,
          }
        );

        for (const error of materialized.errors) {
          console.warn(
            `[auto-exec] Failed to materialize artifact for task ${taskId}: ${error.message}`
          );
        }
      },
    });

    // Re-read after execution (status may have changed externally)
    currentRun = (await persistence.read<Run>('runs', runId)) || currentRun;
    if (currentRun.status !== 'running') return;

    const phaseStatus = phaseResult.success ? ('completed' as const) : ('failed' as const);
    const now = new Date().toISOString();

    const afterPhaseRun: Run = {
      ...currentRun,
      phases: currentRun.phases.map(p => {
        if (p.id !== phase.id) return p;
        return {
          ...p,
          status: phaseStatus,
          completedAt: now,
          tasks: p.tasks.map(t => {
            const tr = phaseResult.taskResults.find(r => r.taskId === t.id);
            if (!tr) return t;
            return {
              ...t,
              status: tr.success ? ('completed' as const) : ('failed' as const),
              completedAt: now,
              output: tr.output,
              error: tr.error,
            };
          }),
        };
      }),
    };

    await persistence.update<Run>('runs', runId, afterPhaseRun);
    currentRun = afterPhaseRun;

    if (!phaseResult.success) {
      const failedRun: Run = {
        ...currentRun,
        status: 'failed',
        errorMessage: phaseResult.error || `Phase "${phase.name}" failed`,
        completedAt: now,
      };
      await persistence.update<Run>('runs', runId, failedRun);
      return;
    }
  }

  // All phases done — mark completed and generate summary
  currentRun = (await persistence.read<Run>('runs', runId)) || currentRun;
  if (currentRun.status === 'running') {
    const completedAt = new Date();
    const completedRun: Run = {
      ...currentRun,
      status: 'completed',
      completedAt: completedAt.toISOString(),
    };
    await persistence.update<Run>('runs', runId, completedRun);

    // Generate and persist run summary
    try {
      await refreshRunSummary(persistence, artifactStore, runCompletion, completedRun, runStartTime);
      console.log(`[auto-exec] Run ${runId} complete — summary saved`);
    } catch (summaryErr) {
      console.warn(`[auto-exec] Failed to generate summary for run ${runId}:`, summaryErr);
    }
  }
}

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

      // Fire-and-forget: drive phases/tasks through the mock executor
      executeRunAsync(id, persistence).catch(err =>
        console.error(`[auto-exec] Run ${id} failed:`, err)
      );
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

  // Resume run
  router.patch('/:id/resume', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const updated = runService.resumeRun(run);
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
          error: error instanceof Error ? error.message : 'Failed to resume run',
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

  // Get logs for a specific run
  router.get('/:id/logs', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const allLogs = await persistence.list<{ id: string; runId: string; timestamp: string; level: string; message: string; phaseId?: string; taskId?: string; source?: string }>('run-logs');
      const runLogs = allLogs.filter(log => log.runId === id).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      res.json(createResponse(runLogs));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message, timestamp: new Date().toISOString() });
      } else {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch logs', timestamp: new Date().toISOString() });
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

  // Failure analysis for a failed run
  router.get('/:id/failure-analysis', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const run = await persistence.read<Run>('runs', id);
      if (!run) throw new ApiError(404, 'Run not found');

      const classifier = new FailureClassifier();
      const strategist = new RepairStrategist();

      // Find failed tasks across all phases
      const failedTasks: Array<{
        taskId: string;
        taskName: string;
        phaseId: string;
        error: string;
        classification: ReturnType<typeof classifier.classify>;
        repairOptions: ReturnType<typeof strategist.getRepairOptions>;
      }> = [];

      for (const phase of run.phases || []) {
        for (const task of phase.tasks || []) {
          if (task.status === 'failed' && task.error) {
            const classification = classifier.classify({ errorMessage: task.error, taskId: task.id, phaseId: phase.id, runId: id });
            const repairOpts = strategist.getRepairOptions(
              classification.failureType,
              classification,
              task.name
            );
            failedTasks.push({
              taskId: task.id,
              taskName: task.name,
              phaseId: phase.id,
              error: task.error,
              classification,
              repairOptions: repairOpts,
            });
          }
        }
      }

      const overallClassification = run.errorMessage
        ? classifier.classify({ errorMessage: run.errorMessage, taskId: 'run', phaseId: 'run', runId: id })
        : null;

      res.json(createResponse({
        runId: id,
        runError: run.errorMessage || null,
        overallClassification,
        failedTasks,
        suggestedAction: failedTasks.length > 0 ? 'retry' : 'manual',
      }));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message, timestamp: new Date().toISOString() });
      } else {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Analysis failed', timestamp: new Date().toISOString() });
      }
    }
  });

  router.post('/:id/materialize', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const run = await persistence.read<Run>('runs', id);
      if (!run) {
        throw new ApiError(404, 'Run not found');
      }

      const artifactStore = new ArtifactStore(persistence, {
        storagePath: getArtifactsDirectory(persistence),
      });
      const outputParser = new OutputParser();
      const materialized = await materializeRunArtifacts(run, artifactStore, outputParser);

      if (run.startedAt || run.completedAt) {
        const runCompletion = new RunCompletion();
        await refreshRunSummary(persistence, artifactStore, runCompletion, run);
      }

      res.json(createResponse(materialized));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message, timestamp: new Date().toISOString() });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to materialize run artifacts',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Skip the current failed phase and mark run as failed/recovered
  router.patch('/:id/skip-phase', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const run = await persistence.read<Run>('runs', id);
      if (!run) throw new ApiError(404, 'Run not found');

      if (run.status !== 'failed') {
        throw new ApiError(400, 'Run must be in failed state to skip a phase');
      }

      // Mark any failed tasks in the current phase as 'skipped', reset run to running
      const now = new Date().toISOString();
      const updatedRun: Run = {
        ...run,
        status: 'running',
        errorMessage: undefined,
        phases: run.phases.map(p => {
          if (p.status !== 'failed') return p;
          return {
            ...p,
            status: 'completed' as const,
            completedAt: now,
            tasks: p.tasks.map(t =>
              t.status === 'failed'
                ? { ...t, status: 'completed' as const, completedAt: now, output: '[SKIPPED BY USER]' }
                : t
            ),
          };
        }),
      };

      const result = await persistence.update<Run>('runs', id, updatedRun);
      res.json(createResponse(result));

      // Resume execution from the next pending phase
      executeRunAsync(id, persistence).catch(err =>
        console.error(`[skip-phase] Run ${id} resume failed:`, err)
      );
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message, timestamp: new Date().toISOString() });
      } else {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Skip phase failed', timestamp: new Date().toISOString() });
      }
    }
  });

  // Attach generic CRUD routes
  const crudRoutes = createGenericCrudRoutes(persistence, validation, 'runs', 'run');
  router.use(crudRoutes);

  return router;
};
