import { CostMetrics, TaskCost, PhaseCost, RunCost, ExecutionTask, ExecutionPhase, Run } from '@unifiedaitoolbox/shared';

export class CostCalculator {
  // Pricing (in USD per 1M tokens)
  private readonly INPUT_TOKEN_COST = 0.005;  // $0.005 per 1M input tokens
  private readonly OUTPUT_TOKEN_COST = 0.015; // $0.015 per 1M output tokens
  private readonly EXECUTION_TIME_COST = 0.001; // $0.001 per minute of execution

  calculateTokenCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * this.INPUT_TOKEN_COST;
    const outputCost = (outputTokens / 1_000_000) * this.OUTPUT_TOKEN_COST;
    return inputCost + outputCost;
  }

  calculateExecutionTimeCost(durationMs: number): number {
    const minutes = durationMs / 60_000;
    return minutes * this.EXECUTION_TIME_COST;
  }

  calculateTaskCost(
    task: ExecutionTask,
    inputTokens: number = 0,
    outputTokens: number = 0
  ): TaskCost {
    const duration = task.completedAt && task.startedAt
      ? new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()
      : 0;

    const tokenCost = this.calculateTokenCost(inputTokens, outputTokens);
    const executionCost = this.calculateExecutionTimeCost(duration);
    const estimatedCost = tokenCost + executionCost;

    return {
      taskId: task.id,
      taskName: task.name,
      duration,
      tokenInputs: inputTokens,
      tokenOutputs: outputTokens,
      estimatedCost,
      currency: 'USD',
    };
  }

  calculatePhaseCost(
    phase: ExecutionPhase,
    taskCosts: TaskCost[]
  ): PhaseCost {
    const totalInputTokens = taskCosts.reduce((sum, tc) => sum + tc.tokenInputs, 0);
    const totalOutputTokens = taskCosts.reduce((sum, tc) => sum + tc.tokenOutputs, 0);
    const totalEstimatedCost = taskCosts.reduce((sum, tc) => sum + tc.estimatedCost, 0);

    return {
      phaseId: phase.id,
      phaseName: phase.name,
      taskCosts,
      tokenInputs: totalInputTokens,
      tokenOutputs: totalOutputTokens,
      estimatedCost: totalEstimatedCost,
      currency: 'USD',
    };
  }

  calculateRunCost(run: Run, phaseCosts: PhaseCost[]): RunCost {
    const totalInputTokens = phaseCosts.reduce((sum, pc) => sum + pc.tokenInputs, 0);
    const totalOutputTokens = phaseCosts.reduce((sum, pc) => sum + pc.tokenOutputs, 0);
    const totalEstimatedCost = phaseCosts.reduce((sum, pc) => sum + pc.estimatedCost, 0);

    return {
      runId: run.id,
      phaseCosts,
      tokenInputs: totalInputTokens,
      tokenOutputs: totalOutputTokens,
      estimatedCost: totalEstimatedCost,
      currency: 'USD',
    };
  }

  // Helper: Extract tokens from task execution metadata
  extractTokensFromTask(task: ExecutionTask): { input: number; output: number } {
    if (!task.output || typeof task.output !== 'object') {
      return { input: 0, output: 0 };
    }

    const output = task.output as Record<string, unknown>;
    return {
      input: (output.tokensIn as number) || 0,
      output: (output.tokensOut as number) || 0,
    };
  }

  // Calculate total cost from metadata (useful for integration with execution engine)
  getTotalTokens(phaseCosts: PhaseCost[]): { input: number; output: number; total: number } {
    const input = phaseCosts.reduce((sum, pc) => sum + pc.tokenInputs, 0);
    const output = phaseCosts.reduce((sum, pc) => sum + pc.tokenOutputs, 0);
    return {
      input,
      output,
      total: input + output,
    };
  }
}
