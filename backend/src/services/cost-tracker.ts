import { Run, PhaseCost } from '@unifiedaitoolbox/shared';
import { CostCalculator } from '@fuhrhaus/orchestration-core';

export class CostTracker {
  private calculator: CostCalculator;

  constructor() {
    this.calculator = new CostCalculator();
  }

  // Accumulate costs in a run record
  accumulateCosts(run: Run, phaseCosts: PhaseCost[]): Run {
    const runCost = this.calculator.calculateRunCost(run, phaseCosts);

    return {
      ...run,
      totalCost: {
        tokenInputs: runCost.tokenInputs,
        tokenOutputs: runCost.tokenOutputs,
        estimatedCost: runCost.estimatedCost,
        currency: 'USD',
      },
      phaseCosts: phaseCosts,
    };
  }

  // Get cost summary for display
  getCostSummary(run: Run): {
    totalCost: number;
    totalTokens: number;
    phaseCosts: Array<{ name: string; cost: number }>;
    averageCostPerPhase: number;
  } {
    const totalCost = run.totalCost?.estimatedCost || 0;
    const totalTokens = (run.totalCost?.tokenInputs || 0) + (run.totalCost?.tokenOutputs || 0);

    const phaseCosts = (run.phaseCosts || []).map(pc => ({
      name: pc.phaseName,
      cost: pc.estimatedCost,
    }));

    const averageCostPerPhase = phaseCosts.length > 0
      ? totalCost / phaseCosts.length
      : 0;

    return {
      totalCost,
      totalTokens,
      phaseCosts,
      averageCostPerPhase,
    };
  }

  // Get cost breakdown by phase and task
  getCostBreakdown(run: Run): {
    phases: Array<{
      phaseId: string;
      phaseName: string;
      cost: number;
      tasks: Array<{
        taskId: string;
        taskName: string;
        cost: number;
      }>;
    }>;
  } {
    const phases = (run.phaseCosts || []).map(pc => ({
      phaseId: pc.phaseId,
      phaseName: pc.phaseName,
      cost: pc.estimatedCost,
      tasks: pc.taskCosts.map(tc => ({
        taskId: tc.taskId,
        taskName: tc.taskName,
        cost: tc.estimatedCost,
      })),
    }));

    return { phases };
  }

  // Calculate cost trend (for dashboard over multiple runs)
  getCostTrend(runs: Run[]): Array<{
    runId: string;
    runTitle: string;
    cost: number;
    date: string;
  }> {
    return runs
      .filter(run => run.totalCost && run.completedAt)
      .map(run => ({
        runId: run.id,
        runTitle: run.title,
        cost: run.totalCost!.estimatedCost,
        date: run.completedAt!,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // Summary statistics
  getStatistics(runs: Run[]): {
    totalSpent: number;
    averageRunCost: number;
    highestCostRun: { title: string; cost: number } | null;
    lowestCostRun: { title: string; cost: number } | null;
    medianRunCost: number;
    projectedMonthlyCost: number;
  } {
    const completedRuns = runs.filter(run => run.totalCost);

    if (completedRuns.length === 0) {
      return {
        totalSpent: 0,
        averageRunCost: 0,
        highestCostRun: null,
        lowestCostRun: null,
        medianRunCost: 0,
        projectedMonthlyCost: 0,
      };
    }

    const costs = completedRuns.map(run => run.totalCost!.estimatedCost);
    const totalSpent = costs.reduce((sum, cost) => sum + cost, 0);
    const averageRunCost = totalSpent / completedRuns.length;

    // Find highest and lowest
    const highest = Math.max(...costs);
    const lowest = Math.min(...costs);
    const highestRun = completedRuns.find(run => run.totalCost!.estimatedCost === highest);
    const lowestRun = completedRuns.find(run => run.totalCost!.estimatedCost === lowest);

    // Calculate median
    const sorted = [...costs].sort((a, b) => a - b);
    const medianRunCost = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    // Project monthly cost (assuming 20 runs per month)
    const projectedMonthlyCost = averageRunCost * 20;

    return {
      totalSpent,
      averageRunCost,
      highestCostRun: highestRun ? { title: highestRun.title, cost: highest } : null,
      lowestCostRun: lowestRun ? { title: lowestRun.title, cost: lowest } : null,
      medianRunCost,
      projectedMonthlyCost,
    };
  }
}
