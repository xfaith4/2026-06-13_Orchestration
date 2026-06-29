import {
  Run,
  RunCostReport,
  TaskCostRecord,
  CostGroup,
  OrchestrationEvent,
} from '@unifiedaitoolbox/shared';
import { CostCalculator, PRICING_AS_OF } from '@fuhrhaus/orchestration-core';

export interface SummarizeOptions {
  /** Budget ceiling in USD (operationalizes the pre-run cost gate). */
  budgetLimit?: number;
  /** Count of successfully completed tasks (for $/successful-task). */
  successfulTasks?: number;
  /** Count of artifacts produced (for $/artifact). */
  artifactCount?: number;
}

const WARNING_THRESHOLD = 0.75;
const CRITICAL_THRESHOLD = 0.9;

/**
 * CostMeter — the single per-run cost aggregator/reporter.
 *
 * Consumes normalized per-call records and produces a definitive RunCostReport.
 * Pricing is delegated to the one pricing authority (CostCalculator), so every
 * dollar in the report uses the same pinned table.
 *
 * NOTE on accuracy: fromRun() derives one record per task from the task's retained
 * output. Tasks that made multiple LLM calls (e.g. repair retries) reflect the
 * retained call; a full call-by-call ledger would require capturing each call into
 * the evidence spine (future work). The pricing of every counted call is exact.
 */
export class CostMeter {
  constructor(private readonly calc: CostCalculator = new CostCalculator()) {}

  /** Build normalized, priced records from a persisted Run (tolerant of output shape). */
  fromRun(run: Run): TaskCostRecord[] {
    const records: TaskCostRecord[] = [];
    for (const phase of run.phases || []) {
      for (const task of phase.tasks || []) {
        const usage = this.extractUsage(task);
        if (!usage) continue;
        const priced = this.calc.priceUsage(usage.model, {
          input: usage.tokenInputs,
          output: usage.tokenOutputs,
          cacheWrite: usage.cacheWriteTokens,
          cacheRead: usage.cacheReadTokens,
        });
        records.push({
          taskId: (task as { id: string }).id,
          taskName: (task as { name?: string }).name,
          phaseId: phase.id,
          phaseName: phase.name,
          role: this.extractRole(task),
          model: priced.model,
          tokenInputs: usage.tokenInputs,
          tokenOutputs: usage.tokenOutputs,
          cacheWriteTokens: usage.cacheWriteTokens,
          cacheReadTokens: usage.cacheReadTokens,
          cost: priced.cost,
        });
      }
    }
    return records;
  }

  /** Aggregate records into the definitive report. Pure. */
  summarize(runId: string, records: TaskCostRecord[], opts: SummarizeOptions = {}): RunCostReport {
    const acc = {
      cost: 0,
      tokenInputs: 0,
      tokenOutputs: 0,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
      costInput: 0,
      costOutput: 0,
      costCacheWrite: 0,
      costCacheRead: 0,
    };
    const byModel = new Map<string, CostGroup>();
    const byPhase = new Map<string, CostGroup>();
    const byRole = new Map<string, CostGroup>();
    const unknownModels = new Set<string>();

    for (const r of records) {
      acc.cost += r.cost;
      acc.tokenInputs += r.tokenInputs;
      acc.tokenOutputs += r.tokenOutputs;
      acc.cacheWriteTokens += r.cacheWriteTokens;
      acc.cacheReadTokens += r.cacheReadTokens;

      // Re-derive per-type dollars from the same pricing authority.
      const priced = this.calc.priceUsage(r.model, {
        input: r.tokenInputs,
        output: r.tokenOutputs,
        cacheWrite: r.cacheWriteTokens,
        cacheRead: r.cacheReadTokens,
      });
      acc.costInput += priced.breakdown.input;
      acc.costOutput += priced.breakdown.output;
      acc.costCacheWrite += priced.breakdown.cacheWrite;
      acc.costCacheRead += priced.breakdown.cacheRead;
      if (priced.tier === 'unknown') unknownModels.add(r.model);

      this.bump(byModel, r.model || 'unknown', r);
      this.bump(byPhase, r.phaseName || r.phaseId || 'unknown', r);
      this.bump(byRole, r.role || 'unassigned', r);
    }

    const inputSide = acc.tokenInputs + acc.cacheWriteTokens + acc.cacheReadTokens;
    const cacheHitRatio = inputSide > 0 ? acc.cacheReadTokens / inputSide : 0;

    const report: RunCostReport = {
      runId,
      totalCost: round(acc.cost),
      currency: 'USD',
      pricingAsOf: PRICING_AS_OF,
      calls: records.length,
      tokenInputs: acc.tokenInputs,
      tokenOutputs: acc.tokenOutputs,
      cacheWriteTokens: acc.cacheWriteTokens,
      cacheReadTokens: acc.cacheReadTokens,
      cacheHitRatio: round4(cacheHitRatio),
      costByTokenType: {
        input: round(acc.costInput),
        output: round(acc.costOutput),
        cacheWrite: round(acc.costCacheWrite),
        cacheRead: round(acc.costCacheRead),
      },
      byModel: sortGroups(byModel),
      byPhase: sortGroups(byPhase),
      byRole: sortGroups(byRole),
      efficiency: {
        costPerCall: records.length > 0 ? round(acc.cost / records.length) : 0,
        costPerSuccessfulTask:
          opts.successfulTasks && opts.successfulTasks > 0
            ? round(acc.cost / opts.successfulTasks)
            : undefined,
        costPerArtifact:
          opts.artifactCount && opts.artifactCount > 0
            ? round(acc.cost / opts.artifactCount)
            : undefined,
      },
      budget:
        opts.budgetLimit && opts.budgetLimit > 0
          ? {
              limit: opts.budgetLimit,
              used: round(acc.cost),
              remaining: round(opts.budgetLimit - acc.cost),
              status: this.budgetStatus(acc.cost, opts.budgetLimit),
            }
          : undefined,
      unknownModels: Array.from(unknownModels),
    };
    return report;
  }

  /** Convenience: build records from a run and summarize in one call. */
  report(run: Run, opts: SummarizeOptions = {}): RunCostReport {
    return this.summarize(run.id, this.fromRun(run), opts);
  }

  /** Build the cost_report event payload for the evidence spine. */
  toEvent(report: RunCostReport): Pick<OrchestrationEvent, 'type' | 'level' | 'runId' | 'msg' | 'data'> {
    return {
      type: 'cost_report',
      level: report.budget?.status === 'exceeded' || report.budget?.status === 'critical' ? 'warn' : 'info',
      runId: report.runId,
      msg: `Run cost $${report.totalCost.toFixed(2)} (${report.calls} calls, cache hit ${(report.cacheHitRatio * 100).toFixed(0)}%)`,
      data: {
        totalCost: report.totalCost,
        pricingAsOf: report.pricingAsOf,
        byModel: report.byModel.map(g => ({ model: g.key, cost: g.cost })),
        cacheHitRatio: report.cacheHitRatio,
        budget: report.budget ?? null,
        unknownModels: report.unknownModels,
      },
    };
  }

  /** Render the report-card cost section. */
  renderSection(report: RunCostReport): string {
    const usd = (n: number) => `$${n.toFixed(2)}`;
    const m = (n: number) => `${(n / 1e6).toFixed(2)}M`;
    const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
    const lines: string[] = [];

    const budget = report.budget
      ? `   budget ${usd(report.budget.limit)} → ${pct(report.budget.used / report.budget.limit)} used ${badge(report.budget.status)}`
      : '';
    lines.push(`--- Cost (API-metered = actual $) ---  pricing as_of ${report.pricingAsOf}`);
    lines.push(`Total: ${usd(report.totalCost)}${budget}`);

    if (report.byModel.length) {
      lines.push(
        `By model:   ` +
          report.byModel.map(g => `${g.key} ${usd(g.cost)} (${share(g.cost, report.totalCost)})`).join(' · ')
      );
    }
    if (report.byPhase.length) {
      lines.push(
        `By phase:   ` +
          report.byPhase.map(g => `${g.key} ${usd(g.cost)}`).join(' · ')
      );
    }
    if (report.byRole.length && !(report.byRole.length === 1 && report.byRole[0].key === 'unassigned')) {
      lines.push(`By role:    ` + report.byRole.map(g => `${g.key} ${usd(g.cost)}`).join(' · '));
    }
    lines.push(
      `Tokens: in ${m(report.tokenInputs)} · out ${m(report.tokenOutputs)} · ` +
        `cacheW ${m(report.cacheWriteTokens)} · cacheR ${m(report.cacheReadTokens)} ` +
        `(cache hit ${pct(report.cacheHitRatio)})`
    );
    lines.push(
      `$ split: input ${usd(report.costByTokenType.input)} · output ${usd(report.costByTokenType.output)} · ` +
        `cacheW ${usd(report.costByTokenType.cacheWrite)} · cacheR ${usd(report.costByTokenType.cacheRead)}`
    );
    const eff = report.efficiency;
    const effParts = [`${usd(eff.costPerCall)}/call`];
    if (eff.costPerSuccessfulTask != null) effParts.push(`${usd(eff.costPerSuccessfulTask)}/successful-task`);
    if (eff.costPerArtifact != null) effParts.push(`${usd(eff.costPerArtifact)}/artifact`);
    lines.push(`Efficiency: ` + effParts.join(' · '));

    if (report.unknownModels.length) {
      lines.push(`⚠ Unpriced models (charged at fallback rate): ${report.unknownModels.join(', ')}`);
    }
    return lines.join('\n');
  }

  // ── internals ────────────────────────────────────────────────────────────
  private bump(map: Map<string, CostGroup>, key: string, r: TaskCostRecord): void {
    const g =
      map.get(key) ||
      { key, cost: 0, tokenInputs: 0, tokenOutputs: 0, cacheWriteTokens: 0, cacheReadTokens: 0, calls: 0 };
    g.cost = round(g.cost + r.cost);
    g.tokenInputs += r.tokenInputs;
    g.tokenOutputs += r.tokenOutputs;
    g.cacheWriteTokens += r.cacheWriteTokens;
    g.cacheReadTokens += r.cacheReadTokens;
    g.calls += 1;
    map.set(key, g);
  }

  private budgetStatus(used: number, limit: number): 'ok' | 'warning' | 'critical' | 'exceeded' {
    if (used >= limit) return 'exceeded';
    if (used >= limit * CRITICAL_THRESHOLD) return 'critical';
    if (used >= limit * WARNING_THRESHOLD) return 'warning';
    return 'ok';
  }

  private extractUsage(task: unknown): {
    model?: string;
    tokenInputs: number;
    tokenOutputs: number;
    cacheWriteTokens: number;
    cacheReadTokens: number;
  } | null {
    const t = task as { output?: unknown };
    if (!t.output || typeof t.output !== 'object') return null;
    const o = t.output as Record<string, unknown>;
    // task.output may be the flat result or { result: {...} }.
    const r = o.result && typeof o.result === 'object' ? (o.result as Record<string, unknown>) : o;
    const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0);
    const tokenInputs = num(r.tokensIn);
    const tokenOutputs = num(r.tokensOut);
    const cacheWriteTokens = num(r.tokensCacheWrite);
    const cacheReadTokens = num(r.tokensCacheRead);
    if (tokenInputs === 0 && tokenOutputs === 0 && cacheWriteTokens === 0 && cacheReadTokens === 0) {
      return null; // no usage captured for this task
    }
    return {
      model: typeof r.model === 'string' ? (r.model as string) : undefined,
      tokenInputs,
      tokenOutputs,
      cacheWriteTokens,
      cacheReadTokens,
    };
  }

  private extractRole(task: unknown): string | undefined {
    const t = task as Record<string, unknown>;
    const cand = t.role || t.agentId || t.assignedAgent || t.assignedTo;
    return typeof cand === 'string' ? cand : undefined;
  }
}

function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}
function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}
function sortGroups(map: Map<string, CostGroup>): CostGroup[] {
  return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
}
function share(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : '0%';
}
function badge(status: string): string {
  return status === 'ok' ? '✓' : status === 'warning' ? '⚠' : status === 'critical' ? '⚠⚠' : '✗ OVER';
}
