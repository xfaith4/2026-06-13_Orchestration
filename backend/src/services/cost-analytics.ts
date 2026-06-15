import { Run, PhaseCost } from '@unifiedaitoolbox/shared';

export interface CostTrend {
  date: string;
  runId: string;
  totalCost: number;
  tokenCount: number;
  phaseCount: number;
  taskCount: number;
}

export interface BudgetAlert {
  type: 'warning' | 'critical';
  runId: string;
  message: string;
  currentCost: number;
  budgetLimit: number;
  timestamp: string;
}

export interface CostByAgent {
  agentId: string;
  agentName: string;
  totalCost: number;
  runCount: number;
  averageCostPerRun: number;
  tokenCount: number;
}

export interface CostProjection {
  projectedMonthlyBudget: number;
  projectedDailyBudget: number;
  runsSoFar: number;
  averageCostPerRun: number;
  daysInPeriod: number;
}

export interface CostEfficiencyMetrics {
  costPerToken: number;
  costPerTask: number;
  costPerPhase: number;
  tokenInputCost: number;
  tokenOutputCost: number;
}

export class CostAnalytics {
  private readonly defaultBudgetLimit = 100; // USD
  private readonly warningThreshold = 0.75; // 75% of budget
  private readonly criticalThreshold = 0.9; // 90% of budget

  // Calculate cost efficiency metrics for a run
  calculateEfficiencyMetrics(run: Run): CostEfficiencyMetrics {
    const totalCost = run.totalCost?.estimatedCost || 0;
    const totalTokens = (run.totalCost?.tokenInputs || 0) + (run.totalCost?.tokenOutputs || 0);

    const phases = run.phases.length;
    const tasks = run.phases.reduce((sum, p) => sum + p.tasks.length, 0);

    const tokenInputCost = totalTokens > 0 ? totalCost * (run.totalCost?.tokenInputs || 0) / totalTokens : 0;
    const tokenOutputCost = totalTokens > 0 ? totalCost * (run.totalCost?.tokenOutputs || 0) / totalTokens : 0;

    return {
      costPerToken: totalTokens > 0 ? totalCost / totalTokens : 0,
      costPerTask: tasks > 0 ? totalCost / tasks : 0,
      costPerPhase: phases > 0 ? totalCost / phases : 0,
      tokenInputCost,
      tokenOutputCost,
    };
  }

  // Analyze cost trends across multiple runs
  analyzeCostTrends(runs: Run[]): CostTrend[] {
    return runs.map(run => ({
      date: run.completedAt || run.createdAt,
      runId: run.id,
      totalCost: run.totalCost?.estimatedCost || 0,
      tokenCount: (run.totalCost?.tokenInputs || 0) + (run.totalCost?.tokenOutputs || 0),
      phaseCount: run.phases.length,
      taskCount: run.phases.reduce((sum, p) => sum + p.tasks.length, 0),
    }));
  }

  // Check for budget violations
  checkBudgetAlerts(run: Run, budgetLimit?: number): BudgetAlert[] {
    const alerts: BudgetAlert[] = [];
    const limit = budgetLimit || this.defaultBudgetLimit;
    const currentCost = run.totalCost?.estimatedCost || 0;

    if (currentCost >= limit * this.criticalThreshold) {
      alerts.push({
        type: 'critical',
        runId: run.id,
        message: `Run cost ${this.formatCurrency(currentCost)} exceeds 90% of budget limit ${this.formatCurrency(limit)}`,
        currentCost,
        budgetLimit: limit,
        timestamp: new Date().toISOString(),
      });
    } else if (currentCost >= limit * this.warningThreshold) {
      alerts.push({
        type: 'warning',
        runId: run.id,
        message: `Run cost ${this.formatCurrency(currentCost)} exceeds 75% of budget limit ${this.formatCurrency(limit)}`,
        currentCost,
        budgetLimit: limit,
        timestamp: new Date().toISOString(),
      });
    }

    return alerts;
  }

  // Calculate cost breakdown by agent (simulated - would use actual agent execution logs)
  calculateCostByAgent(runs: Run[]): CostByAgent[] {
    const agentCosts = new Map<string, { cost: number; count: number; tokens: number }>();

    for (const run of runs) {
      for (const phase of run.phases) {
        for (const task of phase.tasks) {
          // Simulate agent assignment (in reality, this comes from task metadata)
          const agentId = `agent-${task.id.split('-')[0]}`;
          const agentName = `Agent ${task.id.split('-')[0].toUpperCase()}`;

          const taskCost = run.phaseCosts
            ?.find(pc => pc.phaseId === phase.id)
            ?.taskCosts.find(tc => tc.taskId === task.id)
            ?.estimatedCost || 0;

          const taskTokens = (run.phaseCosts
            ?.find(pc => pc.phaseId === phase.id)
            ?.taskCosts.find(tc => tc.taskId === task.id)
            ?.tokenInputs || 0) +
            (run.phaseCosts
              ?.find(pc => pc.phaseId === phase.id)
              ?.taskCosts.find(tc => tc.taskId === task.id)
              ?.tokenOutputs || 0);

          const current = agentCosts.get(agentId) || { cost: 0, count: 0, tokens: 0 };
          agentCosts.set(agentId, {
            cost: current.cost + taskCost,
            count: current.count + 1,
            tokens: current.tokens + taskTokens,
          });
        }
      }
    }

    return Array.from(agentCosts.entries()).map(([agentId, data]) => ({
      agentId,
      agentName: `Agent ${agentId.split('-')[1]?.toUpperCase() || 'Unknown'}`,
      totalCost: data.cost,
      runCount: runs.length,
      averageCostPerRun: data.cost / Math.max(runs.length, 1),
      tokenCount: data.tokens,
    }));
  }

  // Project budget for period
  projectBudget(runs: Run[], daysInPeriod: number = 30): CostProjection {
    const totalCost = runs.reduce((sum, r) => sum + (r.totalCost?.estimatedCost || 0), 0);
    const averageCostPerRun = runs.length > 0 ? totalCost / runs.length : 0;
    const projectedDailyBudget = (totalCost / Math.max(runs.length, 1)) * (daysInPeriod / Math.max(runs.length, 1));
    const projectedMonthlyBudget = projectedDailyBudget * daysInPeriod;

    return {
      projectedMonthlyBudget,
      projectedDailyBudget,
      runsSoFar: runs.length,
      averageCostPerRun,
      daysInPeriod,
    };
  }

  // Compare costs across runs
  compareCosts(run1: Run, run2: Run): {
    cost1: number;
    cost2: number;
    difference: number;
    percentChange: number;
  } {
    const cost1 = run1.totalCost?.estimatedCost || 0;
    const cost2 = run2.totalCost?.estimatedCost || 0;
    const difference = cost2 - cost1;
    const percentChange = cost1 > 0 ? (difference / cost1) * 100 : 0;

    return {
      cost1,
      cost2,
      difference,
      percentChange,
    };
  }

  // Get cost distribution statistics
  getCostDistribution(runs: Run[]): {
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
    q25: number;
    q75: number;
  } {
    const costs = runs.map(r => r.totalCost?.estimatedCost || 0).sort((a, b) => a - b);

    if (costs.length === 0) {
      return { mean: 0, median: 0, min: 0, max: 0, stdDev: 0, q25: 0, q75: 0 };
    }

    const mean = costs.reduce((sum, c) => sum + c, 0) / costs.length;
    const median = costs.length % 2 === 0
      ? (costs[costs.length / 2 - 1] + costs[costs.length / 2]) / 2
      : costs[Math.floor(costs.length / 2)];

    const variance = costs.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / costs.length;
    const stdDev = Math.sqrt(variance);

    const q25Index = Math.floor(costs.length * 0.25);
    const q75Index = Math.floor(costs.length * 0.75);

    return {
      mean,
      median,
      min: costs[0],
      max: costs[costs.length - 1],
      stdDev,
      q25: costs[q25Index],
      q75: costs[q75Index],
    };
  }

  // Identify cost anomalies
  identifyAnomalies(
    runs: Run[],
    threshold: number = 1.5
  ): Array<{ runId: string; cost: number; deviation: number }> {
    const costs = runs.map(r => r.totalCost?.estimatedCost || 0);
    const mean = costs.reduce((sum, c) => sum + c, 0) / costs.length;
    const variance = costs.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / costs.length;
    const stdDev = Math.sqrt(variance);

    return runs
      .map((run, i) => ({
        runId: run.id,
        cost: costs[i],
        deviation: Math.abs(costs[i] - mean) / Math.max(stdDev, 0.01),
      }))
      .filter(a => a.deviation > threshold);
  }

  private formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }
}
