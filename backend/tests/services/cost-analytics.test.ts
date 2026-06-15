import { describe, it, expect, beforeEach } from 'vitest';
import { CostAnalytics } from '../../src/services/cost-analytics.js';
import { Run, ExecutionPhase, ExecutionTask, CostMetrics, PhaseCost, TaskCost } from '@unifiedaitoolbox/shared';

describe('CostAnalytics', () => {
  let analytics: CostAnalytics;

  beforeEach(() => {
    analytics = new CostAnalytics();
  });

  const createRun = (cost: number, tasks: number = 3): Run => ({
    id: `run-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    roadmapId: 'roadmap-1',
    applicationId: 'app-1',
    title: 'Test Run',
    description: 'Test',
    phases: [
      {
        id: 'phase-1',
        number: 1,
        name: 'Phase 1',
        goal: 'Test phase',
        tasks: Array(tasks)
          .fill(null)
          .map((_, i) => ({
            id: `task-${i + 1}`,
            name: `Task ${i + 1}`,
            description: 'Test task',
            status: 'completed' as const,
            dependencies: [],
          })),
        status: 'completed' as const,
        dependencies: [],
      },
    ],
    status: 'completed' as const,
    totalCost: {
      tokenInputs: Math.floor(cost * 1000),
      tokenOutputs: Math.floor(cost * 500),
      estimatedCost: cost,
      currency: 'USD',
    },
    phaseCosts: [
      {
        phaseId: 'phase-1',
        phaseName: 'Phase 1',
        tokenInputs: Math.floor(cost * 1000),
        tokenOutputs: Math.floor(cost * 500),
        estimatedCost: cost,
        currency: 'USD',
        taskCosts: Array(tasks)
          .fill(null)
          .map((_, i) => ({
            taskId: `task-${i + 1}`,
            taskName: `Task ${i + 1}`,
            tokenInputs: Math.floor((cost / tasks) * 1000),
            tokenOutputs: Math.floor((cost / tasks) * 500),
            estimatedCost: cost / tasks,
            currency: 'USD',
          })),
      },
    ],
  });

  describe('Efficiency metrics', () => {
    it('should calculate cost per token', () => {
      const run = createRun(10, 3);
      const metrics = analytics.calculateEfficiencyMetrics(run);

      expect(metrics.costPerToken).toBeGreaterThan(0);
      expect(metrics.costPerToken).toBeLessThan(0.01);
    });

    it('should calculate cost per task', () => {
      const run = createRun(15, 5);
      const metrics = analytics.calculateEfficiencyMetrics(run);

      expect(metrics.costPerTask).toBe(3); // 15 / 5
    });

    it('should calculate cost per phase', () => {
      const run = createRun(20);
      const metrics = analytics.calculateEfficiencyMetrics(run);

      expect(metrics.costPerPhase).toBe(20); // Only 1 phase
    });

    it('should handle zero tokens gracefully', () => {
      const run = createRun(0);
      const metrics = analytics.calculateEfficiencyMetrics(run);

      expect(metrics.costPerToken).toBe(0);
      expect(metrics.costPerTask).toBe(0);
    });

    it('should break down token costs', () => {
      const run = createRun(10);
      const metrics = analytics.calculateEfficiencyMetrics(run);

      expect(metrics.tokenInputCost).toBeGreaterThan(0);
      expect(metrics.tokenOutputCost).toBeGreaterThan(0);
      expect(metrics.tokenInputCost + metrics.tokenOutputCost).toBeLessThanOrEqual(10.01);
    });
  });

  describe('Cost trends', () => {
    it('should analyze trends across multiple runs', () => {
      const runs = [createRun(5), createRun(10), createRun(8)];
      const trends = analytics.analyzeCostTrends(runs);

      expect(trends).toHaveLength(3);
      expect(trends[0].totalCost).toBe(5);
      expect(trends[1].totalCost).toBe(10);
      expect(trends[2].totalCost).toBe(8);
    });

    it('should include token counts in trends', () => {
      const run = createRun(10, 5);
      const trends = analytics.analyzeCostTrends([run]);

      expect(trends[0].tokenCount).toBeGreaterThan(0);
    });

    it('should include phase and task counts', () => {
      const run = createRun(10, 5);
      const trends = analytics.analyzeCostTrends([run]);

      expect(trends[0].phaseCount).toBe(1);
      expect(trends[0].taskCount).toBe(5);
    });

    it('should handle empty run list', () => {
      const trends = analytics.analyzeCostTrends([]);

      expect(trends).toHaveLength(0);
    });
  });

  describe('Budget alerts', () => {
    it('should trigger warning at 75% of budget', () => {
      const run = createRun(75); // 75% of default $100 budget
      const alerts = analytics.checkBudgetAlerts(run);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('warning');
    });

    it('should trigger critical at 90% of budget', () => {
      const run = createRun(90); // 90% of default $100 budget
      const alerts = analytics.checkBudgetAlerts(run);

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].type).toBe('critical');
    });

    it('should not trigger alerts below 75%', () => {
      const run = createRun(50);
      const alerts = analytics.checkBudgetAlerts(run);

      expect(alerts).toHaveLength(0);
    });

    it('should respect custom budget limit', () => {
      const run = createRun(30);
      const alerts = analytics.checkBudgetAlerts(run, 40);

      expect(alerts.length).toBeGreaterThan(0); // 30/40 = 75%
    });

    it('should exceed budget trigger critical', () => {
      const run = createRun(150);
      const alerts = analytics.checkBudgetAlerts(run, 100);

      expect(alerts.some(a => a.type === 'critical')).toBe(true);
    });
  });

  describe('Cost by agent', () => {
    it('should calculate costs by agent', () => {
      const runs = [createRun(10, 3)];
      const agentCosts = analytics.calculateCostByAgent(runs);

      expect(agentCosts.length).toBeGreaterThan(0);
      expect(agentCosts[0].agentId).toBeDefined();
      expect(agentCosts[0].totalCost).toBeGreaterThan(0);
    });

    it('should calculate average cost per run', () => {
      const runs = [createRun(10, 3), createRun(20, 3)];
      const agentCosts = analytics.calculateCostByAgent(runs);

      expect(agentCosts.length).toBeGreaterThan(0);
      expect(agentCosts[0].averageCostPerRun).toBeLessThanOrEqual(30);
    });

    it('should track run count', () => {
      const runs = [createRun(10, 3), createRun(20, 3)];
      const agentCosts = analytics.calculateCostByAgent(runs);

      expect(agentCosts[0].runCount).toBe(2);
    });
  });

  describe('Budget projection', () => {
    it('should project monthly budget from runs', () => {
      const runs = [createRun(5), createRun(10), createRun(8)];
      const projection = analytics.projectBudget(runs, 30);

      expect(projection.projectedMonthlyBudget).toBeGreaterThan(0);
      expect(projection.runsSoFar).toBe(3);
    });

    it('should calculate average cost per run', () => {
      const runs = [createRun(10), createRun(20), createRun(30)];
      const projection = analytics.projectBudget(runs);

      expect(projection.averageCostPerRun).toBe(20);
    });

    it('should handle single run', () => {
      const runs = [createRun(15)];
      const projection = analytics.projectBudget(runs);

      expect(projection.averageCostPerRun).toBe(15);
      expect(projection.runsSoFar).toBe(1);
    });

    it('should handle empty run list', () => {
      const projection = analytics.projectBudget([]);

      expect(projection.averageCostPerRun).toBe(0);
      expect(projection.runsSoFar).toBe(0);
    });
  });

  describe('Cost comparison', () => {
    it('should compare two runs', () => {
      const run1 = createRun(10);
      const run2 = createRun(20);

      const comparison = analytics.compareCosts(run1, run2);

      expect(comparison.cost1).toBe(10);
      expect(comparison.cost2).toBe(20);
      expect(comparison.difference).toBe(10);
    });

    it('should calculate percent change', () => {
      const run1 = createRun(10);
      const run2 = createRun(15);

      const comparison = analytics.compareCosts(run1, run2);

      expect(comparison.percentChange).toBe(50);
    });

    it('should handle negative change', () => {
      const run1 = createRun(20);
      const run2 = createRun(10);

      const comparison = analytics.compareCosts(run1, run2);

      expect(comparison.difference).toBe(-10);
      expect(comparison.percentChange).toBe(-50);
    });
  });

  describe('Cost distribution', () => {
    it('should calculate mean cost', () => {
      const runs = [createRun(5), createRun(10), createRun(15)];
      const distribution = analytics.getCostDistribution(runs);

      expect(distribution.mean).toBe(10);
    });

    it('should calculate median cost', () => {
      const runs = [createRun(5), createRun(10), createRun(15)];
      const distribution = analytics.getCostDistribution(runs);

      expect(distribution.median).toBe(10);
    });

    it('should find min and max', () => {
      const runs = [createRun(5), createRun(15), createRun(10)];
      const distribution = analytics.getCostDistribution(runs);

      expect(distribution.min).toBe(5);
      expect(distribution.max).toBe(15);
    });

    it('should calculate standard deviation', () => {
      const runs = [createRun(10), createRun(10), createRun(10)];
      const distribution = analytics.getCostDistribution(runs);

      expect(distribution.stdDev).toBe(0);
    });

    it('should calculate quartiles', () => {
      const runs = [createRun(1), createRun(2), createRun(3), createRun(4), createRun(5)];
      const distribution = analytics.getCostDistribution(runs);

      expect(distribution.q25).toBeDefined();
      expect(distribution.q75).toBeDefined();
      expect(distribution.q25).toBeLessThanOrEqual(distribution.median);
      expect(distribution.median).toBeLessThanOrEqual(distribution.q75);
    });

    it('should handle single run', () => {
      const runs = [createRun(10)];
      const distribution = analytics.getCostDistribution(runs);

      expect(distribution.mean).toBe(10);
      expect(distribution.median).toBe(10);
      expect(distribution.min).toBe(10);
      expect(distribution.max).toBe(10);
    });

    it('should handle empty list', () => {
      const distribution = analytics.getCostDistribution([]);

      expect(distribution.mean).toBe(0);
      expect(distribution.median).toBe(0);
    });
  });

  describe('Anomaly detection', () => {
    it('should identify cost outliers', () => {
      const runs = [createRun(10), createRun(10), createRun(10), createRun(50)];
      const anomalies = analytics.identifyAnomalies(runs, 1.5);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].runId).toBeDefined();
    });

    it('should not flag normal values', () => {
      const runs = [createRun(10), createRun(10), createRun(10), createRun(10)];
      const anomalies = analytics.identifyAnomalies(runs, 1.5);

      expect(anomalies).toHaveLength(0);
    });

    it('should calculate deviation', () => {
      const runs = [createRun(10), createRun(10), createRun(10), createRun(100)];
      const anomalies = analytics.identifyAnomalies(runs, 1.0);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].deviation).toBeGreaterThan(1);
    });

    it('should respect threshold parameter', () => {
      const runs = [createRun(10), createRun(10), createRun(30)];
      const anomaliesStrict = analytics.identifyAnomalies(runs, 0.5);
      const anomaliesLoose = analytics.identifyAnomalies(runs, 2);

      expect(anomaliesStrict.length).toBeGreaterThanOrEqual(anomaliesLoose.length);
    });
  });
});
