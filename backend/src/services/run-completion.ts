import {
  Run,
  RunSummary,
  TaskResult,
  FailureSummary,
  LessonLearned,
  ExecutionPhase,
  ExecutionTask,
  CostMetrics,
} from '@unifiedaitoolbox/shared';

export class RunCompletion {
  // Generate summary for completed run
  generateSummary(
    run: Run,
    startTime: Date,
    completionTime: Date,
    artifacts?: { totalCount: number; totalSize: number; byType: Record<string, number> }
  ): RunSummary {
    const duration = completionTime.getTime() - startTime.getTime();

    // Aggregate task results
    const taskResults = this.aggregateTaskResults(run);
    const tasksCompleted = taskResults.filter(t => t.status === 'completed').length;
    const tasksFailed = taskResults.filter(t => t.status === 'failed').length;
    const tasksSkipped = taskResults.filter(t => t.status === 'skipped').length;

    // Aggregate failures
    const failures = this.aggregateFailures(run, taskResults);

    // Calculate costs
    const { totalCost, costByPhase } = this.calculateFinalCosts(run);

    // Generate lessons
    const lessons = this.generateLessonsLearned(run, taskResults, failures, duration, totalCost);

    // Determine outcome
    const outcome = this.determineOutcome(run, tasksFailed);
    const success = outcome === 'completed';

    const summary: RunSummary = {
      id: `summary-${run.id}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runId: run.id,
      success,
      outcome,
      duration,
      startedAt: startTime.toISOString(),
      completedAt: completionTime.toISOString(),
      taskResults,
      tasksCompleted,
      tasksFailed,
      tasksSkipped,
      failures,
      totalCost,
      costByPhase,
      artifacts: artifacts || {
        totalCount: 0,
        totalSize: 0,
        byType: {},
      },
      lessonsLearned: lessons,
    };

    return summary;
  }

  // Aggregate task results from phases
  private aggregateTaskResults(run: Run): TaskResult[] {
    const results: TaskResult[] = [];

    for (const phase of run.phases) {
      for (const task of phase.tasks) {
        const result: TaskResult = {
          taskId: task.id,
          taskName: task.name,
          status: this.mapTaskStatus(task.status),
          duration: this.calculateTaskDuration(task),
          error: task.error,
        };

        results.push(result);
      }
    }

    return results;
  }

  // Aggregate failures
  private aggregateFailures(run: Run, taskResults: TaskResult[]): FailureSummary[] {
    const failures: FailureSummary[] = [];

    for (const result of taskResults) {
      if (result.status === 'failed') {
        const failure: FailureSummary = {
          taskId: result.taskId,
          taskName: result.taskName,
          error: result.error || 'Unknown error',
          errorType: this.inferErrorType(result.error),
          severity: this.inferSeverity(result.error),
          repaired: false, // Would be detected from run state
          repairAttempts: result.repairAttempts || 0,
        };

        failures.push(failure);
      }
    }

    return failures;
  }

  // Calculate final costs
  private calculateFinalCosts(run: Run): {
    totalCost: number;
    costByPhase: Record<string, number>;
  } {
    let totalCost = 0;
    const costByPhase: Record<string, number> = {};

    if (run.phaseCosts) {
      for (const phaseCost of run.phaseCosts) {
        const cost = phaseCost.estimatedCost;
        totalCost += cost;
        costByPhase[phaseCost.phaseId] = cost;
      }
    } else if (run.totalCost) {
      totalCost = run.totalCost.estimatedCost;
    }

    return { totalCost, costByPhase };
  }

  // Generate lessons learned
  private generateLessonsLearned(
    run: Run,
    taskResults: TaskResult[],
    failures: FailureSummary[],
    duration: number,
    totalCost: number
  ): LessonLearned[] {
    const lessons: LessonLearned[] = [];
    const idSuffix = Date.now();

    // Performance lessons
    const avgDuration = taskResults.length > 0
      ? taskResults.reduce((sum, t) => sum + t.duration, 0) / taskResults.length
      : 0;

    if (avgDuration > 5000) {
      lessons.push(this.createLesson(
        `lesson-perf-${idSuffix}`,
        'performance',
        `Average task duration is ${(avgDuration / 1000).toFixed(1)}s. Consider optimizing long-running tasks.`,
        'medium',
        taskResults.filter(t => t.duration > avgDuration * 1.5).map(t => t.taskId)
      ));
    }

    // Reliability lessons
    if (failures.length > 0) {
      const failureRate = (failures.length / taskResults.length) * 100;
      lessons.push(this.createLesson(
        `lesson-rel-${idSuffix}`,
        'reliability',
        `${failures.length} task(s) failed (${failureRate.toFixed(1)}% failure rate). Review error patterns and strengthen error handling.`,
        failureRate > 20 ? 'high' : 'medium',
        failures.map(f => f.taskId),
        ['Review error logs', 'Identify common failure patterns', 'Strengthen error recovery']
      ));
    }

    // Cost lessons
    if (totalCost > 10) {
      lessons.push(this.createLesson(
        `lesson-cost-${idSuffix}`,
        'cost',
        `Run cost is $${totalCost.toFixed(2)}. Analyze expensive phases and consider optimization.`,
        totalCost > 50 ? 'high' : 'medium',
        [],
        ['Profile token usage by phase', 'Identify expensive operations', 'Consider caching or memoization']
      ));
    }

    // Design lessons
    if (taskResults.length > 0) {
      const successRate = (taskResults.filter(t => t.status === 'completed').length / taskResults.length) * 100;
      if (successRate < 80) {
        lessons.push(this.createLesson(
          `lesson-design-${idSuffix}`,
          'design',
          'Low success rate suggests design or integration issues. Review phase dependencies and task contracts.',
          'high',
          [],
          ['Review phase dependencies', 'Validate task contracts', 'Simplify task decomposition']
        ));
      }
    }

    return lessons;
  }

  // Determine run outcome
  private determineOutcome(
    run: Run,
    tasksFailed: number
  ): 'completed' | 'failed' | 'partial' {
    const totalTasks = run.phases.reduce((sum, p) => sum + p.tasks.length, 0);

    if (tasksFailed === 0) {
      return 'completed';
    } else if (tasksFailed === totalTasks) {
      return 'failed';
    } else {
      return 'partial';
    }
  }

  // Helper: map task status
  private mapTaskStatus(status: string): 'completed' | 'failed' | 'skipped' {
    if (status === 'completed') {
      return 'completed';
    } else if (status === 'failed') {
      return 'failed';
    } else {
      return 'skipped';
    }
  }

  // Helper: calculate task duration
  private calculateTaskDuration(task: ExecutionTask): number {
    if (task.startedAt && task.completedAt) {
      return new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime();
    }
    return 0;
  }

  // Helper: infer error type
  private inferErrorType(error?: string): 'transient' | 'permanent' | 'unknown' {
    if (!error) {
      return 'unknown';
    }

    const lower = error.toLowerCase();
    if (lower.includes('timeout') || lower.includes('network') || lower.includes('connection')) {
      return 'transient';
    }
    if (lower.includes('validation') || lower.includes('invalid') || lower.includes('schema')) {
      return 'permanent';
    }
    return 'unknown';
  }

  // Helper: infer severity
  private inferSeverity(error?: string): 'low' | 'medium' | 'high' | 'critical' {
    if (!error) {
      return 'low';
    }

    const lower = error.toLowerCase();
    if (lower.includes('critical') || lower.includes('fatal')) {
      return 'critical';
    }
    if (lower.includes('error') && lower.includes('data')) {
      return 'high';
    }
    if (lower.includes('timeout') || lower.includes('retry')) {
      return 'medium';
    }
    return 'low';
  }

  // Helper: create lesson with BaseEntity fields
  private createLesson(
    id: string,
    category: string,
    insight: string,
    priority: 'low' | 'medium' | 'high',
    affectedTasks?: string[],
    actionItems?: string[]
  ): LessonLearned {
    const now = new Date().toISOString();
    return {
      id,
      createdAt: now,
      updatedAt: now,
      category,
      insight,
      priority,
      affectedTasks,
      actionItems,
    } as LessonLearned;
  }

  // Get summary report (formatted for display)
  getSummaryReport(summary: RunSummary): string {
    const lines: string[] = [
      '=== RUN COMPLETION SUMMARY ===',
      '',
      `Status: ${summary.outcome.toUpperCase()}`,
      `Success: ${summary.success ? 'YES' : 'NO'}`,
      `Duration: ${(summary.duration / 1000).toFixed(1)}s`,
      `Started: ${summary.startedAt}`,
      `Completed: ${summary.completedAt}`,
      '',
      '--- Task Summary ---',
      `Total Tasks: ${summary.taskResults.length}`,
      `Completed: ${summary.tasksCompleted}`,
      `Failed: ${summary.tasksFailed}`,
      `Skipped: ${summary.tasksSkipped}`,
      '',
      '--- Cost Summary ---',
      `Total Cost: $${summary.totalCost.toFixed(2)}`,
      '',
      '--- Artifacts ---',
      `Total Count: ${summary.artifacts.totalCount}`,
      `Total Size: ${(summary.artifacts.totalSize / (1024 * 1024)).toFixed(1)} MB`,
    ];

    if (summary.failures.length > 0) {
      lines.push('');
      lines.push('--- Failures ---');
      for (const failure of summary.failures) {
        lines.push(`- ${failure.taskName}: ${failure.error}`);
      }
    }

    if (summary.lessonsLearned.length > 0) {
      lines.push('');
      lines.push('--- Lessons Learned ---');
      for (const lesson of summary.lessonsLearned) {
        lines.push(`[${lesson.category.toUpperCase()}] ${lesson.insight}`);
      }
    }

    return lines.join('\n');
  }
}
