import { describe, it, expect } from 'vitest';
import { Run, TaskCostRecord } from '@unifiedaitoolbox/shared';
import { CostMeter } from '../../src/services/cost-meter.js';

const M = 1_000_000;
const meter = new CostMeter();

function rec(over: Partial<TaskCostRecord>): TaskCostRecord {
  return {
    taskId: 't',
    model: 'claude-haiku-4-5',
    tokenInputs: 0,
    tokenOutputs: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    cost: 0,
    ...over,
  };
}

describe('CostMeter.summarize', () => {
  it('totals cost and groups by model/phase/role (sorted by cost desc)', () => {
    const records = [
      rec({ taskId: 'a', model: 'claude-opus-4-8', tokenInputs: M, phaseName: 'Plan', role: 'planner', cost: 15 }),
      rec({ taskId: 'b', model: 'claude-haiku-4-5', tokenOutputs: M, phaseName: 'Build', role: 'executor', cost: 4 }),
    ];
    const r = meter.summarize('run-1', records);
    expect(r.totalCost).toBeCloseTo(19, 6);
    expect(r.calls).toBe(2);
    expect(r.byModel.map(g => g.key)).toEqual(['claude-opus-4-8', 'claude-haiku-4-5']);
    expect(r.byModel[0].cost).toBeCloseTo(15, 6);
    expect(r.byPhase.map(g => g.key)).toEqual(['Plan', 'Build']);
    expect(r.byRole.map(g => g.key)).toEqual(['planner', 'executor']);
  });

  it('derives per-token-type dollars from the pricing authority', () => {
    const records = [
      rec({ model: 'claude-opus-4-8', tokenInputs: M, cost: 15 }),
      rec({ model: 'claude-haiku-4-5', tokenOutputs: M, cost: 4 }),
    ];
    const r = meter.summarize('run-1', records);
    expect(r.costByTokenType.input).toBeCloseTo(15, 6);
    expect(r.costByTokenType.output).toBeCloseTo(4, 6);
    expect(r.costByTokenType.cacheWrite).toBe(0);
  });

  it('computes cache-hit ratio over the input side', () => {
    const r = meter.summarize('run-1', [
      rec({ model: 'claude-opus-4-8', tokenInputs: 100_000, cacheReadTokens: 900_000, cost: 1 }),
    ]);
    expect(r.cacheHitRatio).toBeCloseTo(0.9, 4);
  });

  it('reports zero cache-hit when caching is unused', () => {
    const r = meter.summarize('run-1', [rec({ tokenInputs: M, cost: 0.8 })]);
    expect(r.cacheHitRatio).toBe(0);
  });

  it('flags budget status across thresholds', () => {
    const mk = (cost: number) => meter.summarize('r', [rec({ cost })], { budgetLimit: 1 }).budget!.status;
    expect(mk(0.5)).toBe('ok');
    expect(mk(0.8)).toBe('warning');
    expect(mk(0.95)).toBe('critical');
    expect(mk(1.5)).toBe('exceeded');
  });

  it('surfaces efficiency metrics when counts are provided', () => {
    const r = meter.summarize('r', [rec({ cost: 10 }), rec({ cost: 10 })], {
      successfulTasks: 2,
      artifactCount: 5,
    });
    expect(r.efficiency.costPerCall).toBeCloseTo(10, 6);
    expect(r.efficiency.costPerSuccessfulTask).toBeCloseTo(10, 6);
    expect(r.efficiency.costPerArtifact).toBeCloseTo(4, 6);
  });

  it('collects unknown models seen', () => {
    const r = meter.summarize('r', [rec({ model: 'gpt-4o', tokenInputs: M, cost: 0.8 })]);
    expect(r.unknownModels).toContain('gpt-4o');
  });
});

describe('CostMeter.fromRun', () => {
  const run = {
    id: 'run-1',
    phases: [
      {
        id: 'p1',
        name: 'Plan',
        tasks: [
          {
            id: 't1',
            name: 'spec',
            status: 'completed',
            // nested { result: {...} } shape
            output: { result: { tokensIn: M, tokensOut: 0, tokensCacheWrite: 0, tokensCacheRead: 0, model: 'claude-opus-4-8' } },
          },
        ],
      },
      {
        id: 'p2',
        name: 'Build',
        tasks: [
          {
            id: 't2',
            name: 'impl',
            status: 'completed',
            role: 'executor',
            // flat shape
            output: { tokensIn: 0, tokensOut: M, tokensCacheWrite: 0, tokensCacheRead: 0, model: 'claude-haiku-4-5' },
          },
          { id: 't3', name: 'noop', status: 'failed', output: undefined }, // no usage → skipped
        ],
      },
    ],
  } as unknown as Run;

  it('extracts one priced record per task with usage (tolerant of output shape)', () => {
    const records = meter.fromRun(run);
    expect(records).toHaveLength(2);
    const opus = records.find(r => r.taskId === 't1')!;
    expect(opus.model).toBe('claude-opus-4-8');
    expect(opus.cost).toBeCloseTo(15, 6);
    expect(records.find(r => r.taskId === 't2')!.cost).toBeCloseTo(4, 6);
  });

  it('produces a report that totals the run correctly', () => {
    const r = meter.report(run, { successfulTasks: 2 });
    expect(r.totalCost).toBeCloseTo(19, 6);
    expect(r.byPhase.map(g => g.key)).toContain('Plan');
  });
});

describe('CostMeter rendering + event', () => {
  const r = meter.summarize('run-1', [
    rec({ model: 'claude-opus-4-8', tokenInputs: M, cost: 15 }),
  ], { budgetLimit: 100 });

  it('renders a report-card section labelled as actual metered dollars', () => {
    const out = meter.renderSection(r);
    expect(out).toContain('API-metered = actual $');
    expect(out).toContain('$15.00');
    expect(out).toContain('claude-opus-4-8');
    expect(out).toContain('cache hit');
  });

  it('builds a cost_report spine event', () => {
    const ev = meter.toEvent(r);
    expect(ev.type).toBe('cost_report');
    expect(ev.runId).toBe('run-1');
    expect(ev.data?.totalCost).toBeCloseTo(15, 6);
  });

  it('marks the event warn-level when over budget', () => {
    const over = meter.summarize('run-1', [rec({ cost: 200 })], { budgetLimit: 100 });
    expect(meter.toEvent(over).level).toBe('warn');
  });
});
