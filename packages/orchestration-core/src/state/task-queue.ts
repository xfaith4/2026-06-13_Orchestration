import { ExecutionTask, ExecutionPhase, QueuedTask } from '@unifiedaitoolbox/shared';

export interface TaskQueueState {
  pending: Set<string>;
  executing: Set<string>;
  completed: Set<string>;
  failed: Set<string>;
  skipped: Set<string>;
}

export class TaskQueue {
  private taskMap: Map<string, ExecutionTask> = new Map();
  private queueState: TaskQueueState = {
    pending: new Set(),
    executing: new Set(),
    completed: new Set(),
    failed: new Set(),
    skipped: new Set(),
  };
  private taskResults: Map<string, QueuedTask> = new Map();
  private dependencyGraph: Map<string, string[]> = new Map();
  private reverseDependencies: Map<string, string[]> = new Map();

  constructor(phase: ExecutionPhase) {
    this.initializeQueue(phase);
  }

  private initializeQueue(phase: ExecutionPhase): void {
    // Build task map and dependency tracking
    for (const task of phase.tasks) {
      this.taskMap.set(task.id, task);
      this.queueState.pending.add(task.id);

      const deps = task.dependencies || [];
      this.dependencyGraph.set(task.id, [...deps]);

      // Build reverse dependencies for quick lookup
      for (const dep of deps) {
        if (!this.reverseDependencies.has(dep)) {
          this.reverseDependencies.set(dep, []);
        }
        this.reverseDependencies.get(dep)!.push(task.id);
      }
    }

    // Validate no circular dependencies
    this.validateNoCycles();
  }

  private validateNoCycles(): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (taskId: string): boolean => {
      visited.add(taskId);
      recursionStack.add(taskId);

      const dependencies = this.dependencyGraph.get(taskId) || [];
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) {
            return true;
          }
        } else if (recursionStack.has(dep)) {
          return true;
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    for (const taskId of this.taskMap.keys()) {
      if (!visited.has(taskId)) {
        if (hasCycle(taskId)) {
          throw new Error(`Circular dependency detected in task queue`);
        }
      }
    }
  }

  // Get tasks that can execute in parallel (no dependencies or all deps complete)
  getReadyTasks(): string[] {
    const ready: string[] = [];

    for (const taskId of this.queueState.pending) {
      const dependencies = this.dependencyGraph.get(taskId) || [];

      // Check if all dependencies are completed or skipped
      const allDepsComplete = dependencies.every(dep =>
        this.queueState.completed.has(dep) || this.queueState.skipped.has(dep)
      );

      if (allDepsComplete) {
        ready.push(taskId);
      }
    }

    return ready;
  }

  // Get the next batch of tasks that can execute in parallel
  getNextBatch(): string[] {
    const ready = this.getReadyTasks();

    // Filter to only include tasks not already executing
    return ready.filter(id => !this.queueState.executing.has(id));
  }

  // Mark a task as executing
  startTask(taskId: string): void {
    if (!this.queueState.pending.has(taskId)) {
      throw new Error(`Task ${taskId} is not in pending state`);
    }

    this.queueState.pending.delete(taskId);
    this.queueState.executing.add(taskId);
  }

  // Mark a task as completed
  completeTask(taskId: string, output?: unknown): void {
    if (!this.queueState.executing.has(taskId)) {
      throw new Error(`Task ${taskId} is not executing`);
    }

    this.queueState.executing.delete(taskId);
    this.queueState.completed.add(taskId);

    const task = this.taskMap.get(taskId);
    if (task) {
      this.taskResults.set(taskId, {
        taskId,
        status: 'completed',
        dependencies: task.dependencies || [],
        retryCount: 0,
        maxRetries: 3,
        output,
        completedAt: new Date().toISOString(),
      });
    }
  }

  // Mark a task as failed
  failTask(taskId: string, error: string, retryCount: number = 0): void {
    if (!this.queueState.executing.has(taskId)) {
      throw new Error(`Task ${taskId} is not executing`);
    }

    this.queueState.executing.delete(taskId);
    this.queueState.failed.add(taskId);

    const task = this.taskMap.get(taskId);
    if (task) {
      this.taskResults.set(taskId, {
        taskId,
        status: 'failed',
        dependencies: task.dependencies || [],
        retryCount,
        maxRetries: 3,
        error,
        completedAt: new Date().toISOString(),
      });
    }
  }

  // Retry a failed task
  retryTask(taskId: string): boolean {
    if (!this.queueState.failed.has(taskId)) {
      throw new Error(`Task ${taskId} is not in failed state`);
    }

    const result = this.taskResults.get(taskId);
    if (!result) {
      throw new Error(`No result found for task ${taskId}`);
    }

    if (result.retryCount >= result.maxRetries) {
      return false; // Max retries exceeded
    }

    // Move back to pending for retry
    this.queueState.failed.delete(taskId);
    this.queueState.pending.add(taskId);

    result.retryCount++;
    result.status = 'pending';
    this.taskResults.set(taskId, result);

    return true;
  }

  // Skip a failed task and continue
  skipTask(taskId: string): void {
    if (!this.queueState.failed.has(taskId)) {
      throw new Error(`Task ${taskId} is not in failed state`);
    }

    this.queueState.failed.delete(taskId);
    this.queueState.skipped.add(taskId);

    const result = this.taskResults.get(taskId);
    if (result) {
      result.status = 'skipped';
      this.taskResults.set(taskId, result);
    }

    // Mark reverse dependencies as unblocked (they can proceed)
    const dependents = this.reverseDependencies.get(taskId) || [];
    // Note: skipped tasks don't block dependents, they can still execute
  }

  // Get current queue state
  getState(): TaskQueueState {
    return {
      pending: new Set(this.queueState.pending),
      executing: new Set(this.queueState.executing),
      completed: new Set(this.queueState.completed),
      failed: new Set(this.queueState.failed),
      skipped: new Set(this.queueState.skipped),
    };
  }

  // Get task details
  getTask(taskId: string): ExecutionTask | undefined {
    return this.taskMap.get(taskId);
  }

  // Get result for a task
  getResult(taskId: string): QueuedTask | undefined {
    return this.taskResults.get(taskId);
  }

  // Get all results
  getAllResults(): QueuedTask[] {
    return Array.from(this.taskResults.values());
  }

  // Check if queue is complete (no pending or executing tasks)
  isComplete(): boolean {
    return this.queueState.pending.size === 0 && this.queueState.executing.size === 0;
  }

  // Check if queue has failures
  hasFailures(): boolean {
    return this.queueState.failed.size > 0;
  }

  // Get failed tasks
  getFailedTasks(): string[] {
    return Array.from(this.queueState.failed);
  }

  // Get task execution plan (topologically sorted)
  getExecutionPlan(): string[][] {
    const plan: string[][] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (taskId: string, batch: string[]): void => {
      if (visited.has(taskId)) {
        return;
      }

      if (visiting.has(taskId)) {
        return; // Cycle protection (shouldn't happen if validateNoCycles passed)
      }

      visiting.add(taskId);

      const deps = this.dependencyGraph.get(taskId) || [];
      for (const dep of deps) {
        visit(dep, batch);
      }

      visiting.delete(taskId);
      visited.add(taskId);
      batch.push(taskId);
    };

    // Group tasks by level (batch)
    const levels = new Map<number, string[]>();
    const taskLevels = new Map<string, number>();

    // Calculate level for each task (longest path to root in DAG)
    const calculateLevel = (taskId: string): number => {
      if (taskLevels.has(taskId)) {
        return taskLevels.get(taskId)!;
      }

      const deps = this.dependencyGraph.get(taskId) || [];
      if (deps.length === 0) {
        taskLevels.set(taskId, 0);
        return 0;
      }

      const maxDepLevel = Math.max(...deps.map(dep => calculateLevel(dep)));
      const level = maxDepLevel + 1;
      taskLevels.set(taskId, level);
      return level;
    };

    for (const taskId of this.taskMap.keys()) {
      const level = calculateLevel(taskId);
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level)!.push(taskId);
    }

    // Sort levels and build plan
    const sortedLevels = Array.from(levels.entries())
      .sort((a, b) => a[0] - b[0])
      .map(entry => entry[1]);

    return sortedLevels;
  }

  // Get dependency information
  getDependencies(taskId: string): string[] {
    return [...(this.dependencyGraph.get(taskId) || [])];
  }

  // Get tasks that depend on this task
  getDependents(taskId: string): string[] {
    return [...(this.reverseDependencies.get(taskId) || [])];
  }

  // Count statistics
  getStatistics(): {
    total: number;
    pending: number;
    executing: number;
    completed: number;
    failed: number;
    skipped: number;
  } {
    return {
      total: this.taskMap.size,
      pending: this.queueState.pending.size,
      executing: this.queueState.executing.size,
      completed: this.queueState.completed.size,
      failed: this.queueState.failed.size,
      skipped: this.queueState.skipped.size,
    };
  }
}
