import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExecutionPhase } from '@unifiedaitoolbox/shared';
import { PhaseExecutor } from '../../src/services/phase-executor.js';
import { TaskExecutor } from '../../src/services/task-executor.js';
import { CostTracker } from '../../src/services/cost-tracker.js';
import { ErrorLogger } from '../../src/services/error-logger.js';
import { PersistenceService } from '../../src/services/persistence.js';

describe('PhaseExecutor', () => {
  let tempDir: string;
  let persistence: PersistenceService;
  let errorLogger: ErrorLogger;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'phase-executor-test-'));
    persistence = new PersistenceService({ dataDir: tempDir });
    errorLogger = new ErrorLogger(persistence);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const phase: ExecutionPhase = {
    id: 'phase-1',
    number: 1,
    name: 'Foundation',
    goal: 'Build the backend foundation',
    status: 'pending',
    dependencies: [],
    tasks: [
      {
        id: 'task-1',
        name: 'Implement route',
        description: 'Create the backend route',
        status: 'pending',
        dependencies: [],
      },
    ],
  };

  it('logs stack constraint warnings with the real run context', async () => {
    const taskExecutor = {
      executeTask: vi.fn().mockResolvedValue({
        taskId: 'task-1',
        success: true,
        duration: 25,
        // Include proper output with file artifacts so acceptance passes
        output: `## File: src/route.ts\n\`\`\`typescript\nexport const route = () => ({ok: true});\n\`\`\``,
        cost: {
          tokenInputs: 10,
          tokenOutputs: 5,
          estimatedCost: 0.01,
          currency: 'USD',
        },
        warnings: [
          {
            code: 'STACK_CONSTRAINT_LANGUAGE_MISMATCH',
            message: 'Detected output language mismatch: Python; expected TypeScript.',
            detectedLanguages: ['python'],
            expectedLanguages: ['typescript'],
            violatingLanguages: ['python'],
          },
        ],
      }),
    } as unknown as TaskExecutor;

    const executor = new PhaseExecutor(taskExecutor, new CostTracker(), errorLogger);

    const result = await executor.executePhase({
      phase,
      runId: 'run-123',
      stackConstraints: { language: 'TypeScript' },
      agentAssignments: { 'task-1': 'agent-1' },
    });

    expect(result.success).toBe(true);
    expect((taskExecutor.executeTask as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]).toMatchObject({
      runId: 'run-123',
      phaseId: 'phase-1',
      stackConstraints: { language: 'TypeScript' },
    });

    const errors = await persistence.list<any>('error-logs');
    expect(errors).toHaveLength(1);
    expect(errors[0].context.runId).toBe('run-123');
    expect(errors[0].context.phaseId).toBe('phase-1');
    expect(errors[0].context.taskId).toBe('task-1');
    expect(errors[0].severity).toBe('low');
    expect(errors[0].errorCode).toBe('STACK_CONSTRAINT_LANGUAGE_MISMATCH');
  });

  it('uses the real run id when logging task failures', async () => {
    const taskExecutor = {
      executeTask: vi.fn().mockResolvedValue({
        taskId: 'task-1',
        success: false,
        duration: 10,
        error: 'Task execution failed',
        errorType: 'permanent',
      }),
    } as unknown as TaskExecutor;

    const executor = new PhaseExecutor(taskExecutor, new CostTracker(), errorLogger);

    const result = await executor.executePhase({
      phase,
      runId: 'run-456',
      agentAssignments: { 'task-1': 'agent-1' },
    });

    expect(result.success).toBe(false);

    const errors = await persistence.list<any>('error-logs');
    expect(errors).toHaveLength(1);
    expect(errors[0].context.runId).toBe('run-456');
    expect(errors[0].context.phaseId).toBe('phase-1');
    expect(errors[0].context.taskId).toBe('task-1');
  });
});
