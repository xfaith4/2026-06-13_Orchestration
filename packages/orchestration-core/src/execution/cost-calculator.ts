import { CostMetrics, TaskCost, PhaseCost, RunCost, ExecutionTask, ExecutionPhase, Run } from '@unifiedaitoolbox/shared';

// ─────────────────────────────────────────────────────────────────────────────
// Definitive, pinned pricing.  Source of truth for per-token cost across the app.
//
// Rates are USD per 1,000,000 tokens, published list prices. Because orchestration
// runs use the metered API (ANTHROPIC_API_KEY), list price == actual cash — so these
// numbers ARE the real spend, not a buffered subscription estimate.
//
// ⚠ All four token types matter. Cache read/write dominated real spend in practice;
// a tracker that only counts input+output understates cost by an order of magnitude.
// Pin the date when you change rates so historical runs stay reproducible.
// ─────────────────────────────────────────────────────────────────────────────
export const PRICING_AS_OF = '2026-06-15';

export type ModelTier = 'opus' | 'sonnet' | 'haiku' | 'mock' | 'unknown';

export interface TierRates {
  /** USD per 1M tokens */
  input: number;
  output: number;
  cacheWrite: number; // 5-minute cache write (1.25× input)
  cacheRead: number; // cache hit read (0.1× input)
}

export const PRICING: Record<Exclude<ModelTier, 'unknown'>, TierRates> = {
  opus: { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  sonnet: { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  haiku: { input: 0.8, output: 4, cacheWrite: 1.0, cacheRead: 0.08 },
  mock: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 },
};

/** When a model string can't be classified, price it as this tier (conservative-but-known). */
const UNKNOWN_FALLBACK_TIER: Exclude<ModelTier, 'unknown'> = 'haiku';
/** The 2-arg legacy helper has no model; price it at the system default model's rates. */
const DEFAULT_TIER: Exclude<ModelTier, 'unknown'> = 'haiku';

export function resolveModelTier(model?: string): ModelTier {
  const m = (model || '').toLowerCase();
  if (!m) return 'unknown';
  if (m.includes('mock')) return 'mock';
  if (m.includes('opus')) return 'opus';
  if (m.includes('sonnet')) return 'sonnet';
  if (m.includes('haiku')) return 'haiku';
  return 'unknown';
}

export interface UsageTokens {
  input: number;
  output: number;
  cacheWrite?: number;
  cacheRead?: number;
}

export interface PricedUsage {
  model: string;
  tier: ModelTier;
  cost: number;
  /** Per-token-type cost breakdown, USD. */
  breakdown: { input: number; output: number; cacheWrite: number; cacheRead: number };
}

export class CostCalculator {
  // Legacy synthetic execution-time cost. NOT a real Anthropic charge — kept for
  // backward compatibility with callers that surface a wall-clock proxy. Excluded
  // from the authoritative API-dollar figure (see priceUsage).
  private readonly EXECUTION_TIME_COST = 0.001; // $0.001 per minute of execution

  /**
   * Definitive per-call cost. Model-aware, covers all four token types.
   * This is the authoritative API-dollar figure for a single LLM call.
   */
  priceUsage(model: string | undefined, usage: UsageTokens): PricedUsage {
    const tier = resolveModelTier(model);
    const rates = tier === 'unknown' ? PRICING[UNKNOWN_FALLBACK_TIER] : PRICING[tier];
    const breakdown = {
      input: (Math.max(0, usage.input) / 1_000_000) * rates.input,
      output: (Math.max(0, usage.output) / 1_000_000) * rates.output,
      cacheWrite: (Math.max(0, usage.cacheWrite ?? 0) / 1_000_000) * rates.cacheWrite,
      cacheRead: (Math.max(0, usage.cacheRead ?? 0) / 1_000_000) * rates.cacheRead,
    };
    const cost = breakdown.input + breakdown.output + breakdown.cacheWrite + breakdown.cacheRead;
    return { model: model || 'unknown', tier, cost, breakdown };
  }

  /**
   * @deprecated Model-blind. Prefer priceUsage(model, usage). Retained so existing
   * 2-arg callers keep compiling; now priced at the system default model's real rates
   * (previously used placeholder rates that understated cost ~250×).
   */
  calculateTokenCost(inputTokens: number, outputTokens: number): number {
    const rates = PRICING[DEFAULT_TIER];
    return (
      (Math.max(0, inputTokens) / 1_000_000) * rates.input +
      (Math.max(0, outputTokens) / 1_000_000) * rates.output
    );
  }

  calculateExecutionTimeCost(durationMs: number): number {
    const minutes = durationMs / 60_000;
    return minutes * this.EXECUTION_TIME_COST;
  }

  calculateTaskCost(
    task: ExecutionTask,
    inputTokens: number = 0,
    outputTokens: number = 0,
    extras?: { model?: string; cacheWriteTokens?: number; cacheReadTokens?: number }
  ): TaskCost {
    const duration =
      task.completedAt && task.startedAt
        ? new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()
        : 0;

    const priced = this.priceUsage(extras?.model, {
      input: inputTokens,
      output: outputTokens,
      cacheWrite: extras?.cacheWriteTokens,
      cacheRead: extras?.cacheReadTokens,
    });

    return {
      taskId: task.id,
      taskName: task.name,
      duration,
      tokenInputs: inputTokens,
      tokenOutputs: outputTokens,
      cacheWriteTokens: extras?.cacheWriteTokens,
      cacheReadTokens: extras?.cacheReadTokens,
      model: extras?.model,
      estimatedCost: priced.cost,
      currency: 'USD',
    };
  }

  calculatePhaseCost(phase: ExecutionPhase, taskCosts: TaskCost[]): PhaseCost {
    const sum = (sel: (tc: TaskCost) => number) => taskCosts.reduce((s, tc) => s + (sel(tc) || 0), 0);
    return {
      phaseId: phase.id,
      phaseName: phase.name,
      taskCosts,
      tokenInputs: sum(tc => tc.tokenInputs),
      tokenOutputs: sum(tc => tc.tokenOutputs),
      cacheWriteTokens: sum(tc => tc.cacheWriteTokens ?? 0),
      cacheReadTokens: sum(tc => tc.cacheReadTokens ?? 0),
      estimatedCost: sum(tc => tc.estimatedCost),
      currency: 'USD',
    };
  }

  calculateRunCost(run: Run, phaseCosts: PhaseCost[]): RunCost {
    const sum = (sel: (pc: PhaseCost) => number) => phaseCosts.reduce((s, pc) => s + (sel(pc) || 0), 0);
    return {
      runId: run.id,
      phaseCosts,
      tokenInputs: sum(pc => pc.tokenInputs),
      tokenOutputs: sum(pc => pc.tokenOutputs),
      cacheWriteTokens: sum(pc => pc.cacheWriteTokens ?? 0),
      cacheReadTokens: sum(pc => pc.cacheReadTokens ?? 0),
      estimatedCost: sum(pc => pc.estimatedCost),
      currency: 'USD',
    };
  }

  // Helper: Extract tokens from task execution metadata. Tolerant of the two shapes
  // task.output can take: the flat result object, or { result: {...} }.
  extractTokensFromTask(task: ExecutionTask): { input: number; output: number } {
    if (!task.output || typeof task.output !== 'object') {
      return { input: 0, output: 0 };
    }
    const o = task.output as Record<string, unknown>;
    const r = (o.result && typeof o.result === 'object' ? (o.result as Record<string, unknown>) : o);
    return {
      input: (r.tokensIn as number) || 0,
      output: (r.tokensOut as number) || 0,
    };
  }

  getTotalTokens(phaseCosts: PhaseCost[]): { input: number; output: number; total: number } {
    const input = phaseCosts.reduce((sum, pc) => sum + pc.tokenInputs, 0);
    const output = phaseCosts.reduce((sum, pc) => sum + pc.tokenOutputs, 0);
    return { input, output, total: input + output };
  }
}
