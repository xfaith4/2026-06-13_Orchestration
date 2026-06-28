import { ExecutionPhase, StackConstraints } from '@unifiedaitoolbox/shared';
import {
  TaskExecutor,
  TaskExecutionInput,
  TaskExecutionOutput,
  TaskExecutionWarning,
} from './task-executor.js';
import { CostTracker } from './cost-tracker.js';
import { ErrorLogger } from './error-logger.js';

export interface PhaseExecutionInput {
  phase: ExecutionPhase;
  agentAssignments: Record<string, string>; // taskId -> agentId
  promptAssignments?: Record<string, string>; // taskId -> promptId
  variables?: Record<string, string>;
  runId?: string;
  stackConstraints?: StackConstraints;
  onTaskStart?: (taskId: string, agentId: string) => Promise<void>;
  onTaskComplete?: (taskId: string, output: TaskExecutionOutput) => Promise<void>;
}

export interface PhaseExecutionOutput {
  phaseId: string;
  phaseName: string;
  success: boolean;
  tasksExecuted: number;
  tasksFailed: number;
  taskResults: TaskExecutionOutput[];
  totalDuration: number;
  totalCost: number;
  error?: string;
}

export class PhaseExecutor {
  constructor(
    private taskExecutor: TaskExecutor,
    private costTracker: CostTracker,
    private errorLogger: ErrorLogger
  ) {}

  // Execute all tasks in a phase sequentially
  async executePhase(input: PhaseExecutionInput): Promise<PhaseExecutionOutput> {
    const startTime = Date.now();
    const phaseId = input.phase.id;
    const taskResults: TaskExecutionOutput[] = [];
    let tasksExecuted = 0;
    let tasksFailed = 0;
    let totalCost = 0;

    try {
      // Execute tasks sequentially
      for (const task of input.phase.tasks) {
        const agentId = input.agentAssignments[task.id];
        if (!agentId) {
          tasksFailed++;
          taskResults.push({
            taskId: task.id,
            success: false,
            error: `No agent assigned to task ${task.id}`,
            duration: 0,
          });
          continue;
        }

        if (input.onTaskStart) {
          await input.onTaskStart(task.id, agentId);
        }

        // Execute task
        const executionInput: TaskExecutionInput = {
          task,
          agentId,
          promptId: input.promptAssignments?.[task.id],
          variables: input.variables,
          runId: input.runId,
          phaseId,
          stackConstraints: input.stackConstraints,
        };

        const result = await this.taskExecutor.executeTask(executionInput);
        taskResults.push(result);

        if (result.success) {
          tasksExecuted++;
          if (result.cost) {
            totalCost += result.cost.estimatedCost;
          }

          if (result.warnings?.length) {
            await this.logTaskWarnings(input.runId, phaseId, task.id, result.warnings);
          }
        } else {
          tasksFailed++;

          // Log error
          await this.errorLogger.logError(
            new Error(result.error || 'Task execution failed'),
            {
              runId: input.runId,
              phaseId,
              taskId: task.id,
              service: 'phase-executor',
              operation: 'executeTask',
            },
            result.retries || 0,
            3
          );
        }

        // Call completion callback if provided
        if (input.onTaskComplete) {
          await input.onTaskComplete(task.id, result);
        }

        // Stop on first permanent failure
        if (!result.success && result.errorType === 'permanent') {
          break;
        }
      }

      return {
        phaseId,
        phaseName: input.phase.name,
        success: tasksFailed === 0,
        tasksExecuted,
        tasksFailed,
        taskResults,
        totalDuration: Date.now() - startTime,
        totalCost,
      };
    } catch (error) {
      return {
        phaseId,
        phaseName: input.phase.name,
        success: false,
        tasksExecuted,
        tasksFailed: input.phase.tasks.length - tasksExecuted,
        taskResults,
        totalDuration: Date.now() - startTime,
        totalCost,
        error: error instanceof Error ? error.message : 'Phase execution failed',
      };
    }
  }

  // Get phase execution plan
  async getPhaseExecutionPlan(phase: ExecutionPhase): Promise<{
    totalTasks: number;
    estimatedDuration: number;
    estimatedCost: number;
    dependencies: string[];
  }> {
    return {
      totalTasks: phase.tasks.length,
      estimatedDuration: phase.tasks.length * 2000, // 2s per task estimate
      estimatedCost: phase.tasks.length * 0.01, // $0.01 per task estimate
      dependencies: phase.dependencies || [],
    };
  }

  // Validate phase executability
  validatePhaseReadiness(phase: ExecutionPhase): {
    ready: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (!phase.tasks || phase.tasks.length === 0) {
      issues.push('Phase has no tasks');
    }

    for (const task of phase.tasks || []) {
      if (!task.id || !task.name) {
        issues.push(`Invalid task structure: ${JSON.stringify(task)}`);
      }
    }

    return {
      ready: issues.length === 0,
      issues,
    };
  }

  private async logTaskWarnings(
    runId: string | undefined,
    phaseId: string,
    taskId: string,
    warnings: TaskExecutionWarning[]
  ): Promise<void> {
    for (const warning of warnings) {
      await this.errorLogger.logError(
        {
          message: warning.message,
          code: warning.code,
          name: 'StackConstraintWarning',
        },
        {
          runId,
          phaseId,
          taskId,
          service: 'phase-executor',
          operation: 'stackConstraintCheck',
        }
      );
    }
  }
}
