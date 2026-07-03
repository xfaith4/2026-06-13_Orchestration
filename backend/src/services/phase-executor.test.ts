import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PhaseExecutor } from './phase-executor.js';
import { TaskAcceptanceService } from './task-acceptance.js';
import { ExecutionPhase } from '@unifiedaitoolbox/shared';

describe('PhaseExecutor with TaskAcceptanceService', () => {
  let mockTaskExecutor: any;
  let mockCostTracker: any;
  let mockErrorLogger: any;
  let acceptanceService: TaskAcceptanceService;
  let phaseExecutor: PhaseExecutor;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockTaskExecutor = {
      executeTask: vi.fn(),
    };

    mockCostTracker = {
      trackCost: vi.fn(),
    };

    mockErrorLogger = {
      logError: vi.fn(),
    };

    acceptanceService = new TaskAcceptanceService();

    phaseExecutor = new PhaseExecutor(
      mockTaskExecutor as any,
      mockCostTracker as any,
      mockErrorLogger as any,
      acceptanceService
    );
  });

  describe('executePhase', () => {
    it('marks phase failed when task executor returns success but acceptance rejects output', async () => {
      const phase: ExecutionPhase = {
        id: 'phase-1',
        number: 1,
        name: 'Implementation',
        goal: 'Implement core features',
        tasks: [
          {
            id: 'task-1',
            name: 'Create API Gateway',
            description: 'HTTP server with routing',
            status: 'pending' as const,
            estimatedHours: 2,
            dependencies: [],
          },
        ],
        estimatedHours: 2,
        dependencies: [],
        status: 'pending' as const,
      };

      // Task executor returns success with prose-only output
      mockTaskExecutor.executeTask.mockResolvedValue({
        taskId: 'task-1',
        success: true,
        output: 'I created a server',
        duration: 1000,
      });

      const result = await phaseExecutor.executePhase({
        phase,
        agentAssignments: { 'task-1': 'CodeGenerator' },
        runId: 'run-1',
      });

      // Phase should be marked failed despite executor success
      expect(result.success).toBe(false);
      expect(result.tasksFailed).toBe(1);
      expect(result.taskResults[0].error).toContain('file artifacts');
    });

    it('marks phase completed when task executor succeeds and acceptance passes', async () => {
      const phase: ExecutionPhase = {
        id: 'phase-1',
        number: 1,
        name: 'Implementation',
        goal: 'Implement core features',
        tasks: [
          {
            id: 'task-1',
            name: 'Create API Gateway',
            description: 'HTTP server with routing',
            status: 'pending' as const,
            estimatedHours: 2,
            dependencies: [],
          },
        ],
        estimatedHours: 2,
        dependencies: [],
        status: 'pending' as const,
      };

      const codeOutput = `
## File: src/index.ts
\`\`\`typescript
import express from 'express';
export default express();
\`\`\`
`;

      // Task executor returns success with valid code output
      mockTaskExecutor.executeTask.mockResolvedValue({
        taskId: 'task-1',
        success: true,
        output: codeOutput,
        duration: 1000,
      });

      const result = await phaseExecutor.executePhase({
        phase,
        agentAssignments: { 'task-1': 'CodeGenerator' },
        runId: 'run-1',
      });

      // Phase should be completed
      expect(result.success).toBe(true);
      expect(result.tasksExecuted).toBe(1);
      expect(result.tasksFailed).toBe(0);
    });

    it('continues execution on transient task failures', async () => {
      const phase: ExecutionPhase = {
        id: 'phase-1',
        number: 1,
        name: 'Implementation',
        goal: 'Implement core features',
        tasks: [
          {
            id: 'task-1',
            name: 'Create config',
            description: 'Create configuration file',
            status: 'pending' as const,
            estimatedHours: 1,
            dependencies: [],
          },
          {
            id: 'task-2',
            name: 'Create index',
            description: 'Create main entry point',
            status: 'pending' as const,
            estimatedHours: 1,
            dependencies: [],
          },
        ],
        estimatedHours: 2,
        dependencies: [],
        status: 'pending' as const,
      };

      // First task fails with transient error
      mockTaskExecutor.executeTask
        .mockResolvedValueOnce({
          taskId: 'task-1',
          success: false,
          error: 'Timeout',
          errorType: 'transient' as const,
          duration: 5000,
        })
        .mockResolvedValueOnce({
          taskId: 'task-2',
          success: true,
          output: '## File: src/index.ts\n```ts\nexport {};\n```',
          duration: 1000,
        });

      const result = await phaseExecutor.executePhase({
        phase,
        agentAssignments: { 'task-1': 'CodeGenerator', 'task-2': 'CodeGenerator' },
        runId: 'run-1',
      });

      // Both tasks should be attempted
      expect(mockTaskExecutor.executeTask).toHaveBeenCalledTimes(2);
      expect(result.tasksExecuted).toBe(1);
      expect(result.tasksFailed).toBe(1);
    });

    it('stops on permanent task failures', async () => {
      const phase: ExecutionPhase = {
        id: 'phase-1',
        number: 1,
        name: 'Implementation',
        goal: 'Implement core features',
        tasks: [
          {
            id: 'task-1',
            name: 'Create config',
            description: 'Create configuration file',
            status: 'pending' as const,
            estimatedHours: 1,
            dependencies: [],
          },
          {
            id: 'task-2',
            name: 'Create index',
            description: 'Create main entry point',
            status: 'pending' as const,
            estimatedHours: 1,
            dependencies: [],
          },
        ],
        estimatedHours: 2,
        dependencies: [],
        status: 'pending' as const,
      };

      // First task fails with permanent error
      mockTaskExecutor.executeTask.mockResolvedValueOnce({
        taskId: 'task-1',
        success: false,
        error: 'Agent not found',
        errorType: 'permanent' as const,
        duration: 1000,
      });

      const result = await phaseExecutor.executePhase({
        phase,
        agentAssignments: { 'task-1': 'Unknown', 'task-2': 'CodeGenerator' },
        runId: 'run-1',
      });

      // Second task should not be attempted
      expect(mockTaskExecutor.executeTask).toHaveBeenCalledTimes(1);
      expect(result.tasksFailed).toBe(1);
    });
  });
});
