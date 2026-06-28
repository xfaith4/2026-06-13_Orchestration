import type { ExecutionPhase } from '@unifiedaitoolbox/shared';

// Roadmap Phase 37 — Typed Gates + Sequencing + DAG Integrity.
// Deterministic, prompt-free checkpoints: a typed PASS/FAIL/RETRY verdict, producer-then-
// reviewer task ordering (a reviewer never runs before the output it reviews exists), and a
// pre-run plan-integrity gate that rejects broken dependency DAGs before any model is called.

export type GateVerdict = 'pass' | 'fail' | 'retry';

export interface GateResult {
  verdict: GateVerdict;
  reason?: string;
}

const REVIEWER_ROLES = new Set(['critic', 'reviewer', 'validator', 'qa']);

export function isReviewerRole(role: string | undefined): boolean {
  return REVIEWER_ROLES.has((role || '').toLowerCase());
}

/**
 * Producer-then-reviewer ordering: reviewers are moved after producers so they never run
 * blind (the bake-off "Critic ran in the same batch as the Engineer → false 'all missing'"
 * failure). Stable — relative order is otherwise preserved.
 */
export function orderProducersFirst<T>(tasks: T[], roleOf: (t: T) => string | undefined): T[] {
  return [...tasks].sort(
    (a, b) => Number(isReviewerRole(roleOf(a))) - Number(isReviewerRole(roleOf(b)))
  );
}

export interface PlanIntegrity {
  ok: boolean;
  errors: string[];
}

/**
 * Deterministic pre-run DAG check: reject dependencies on unknown tasks and dependency cycles
 * BEFORE spending any model calls (a structurally-broken plan can't produce a coherent build).
 */
export function checkPlanIntegrity(phases: ExecutionPhase[]): PlanIntegrity {
  const errors: string[] = [];
  const deps = new Map<string, string[]>();
  for (const p of phases) {
    for (const t of p.tasks) deps.set(t.id, (t.dependencies || []).slice());
  }
  const known = new Set(deps.keys());

  for (const [id, d] of deps) {
    for (const dep of d) {
      if (!known.has(dep)) errors.push(`Task ${id} depends on unknown task "${dep}"`);
    }
  }

  // Cycle detection via DFS three-coloring.
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const id of known) color.set(id, WHITE);
  const stack: string[] = [];
  let cycle: string[] | null = null;

  const visit = (id: string): void => {
    if (cycle) return;
    color.set(id, GRAY);
    stack.push(id);
    for (const dep of deps.get(id) || []) {
      if (!known.has(dep)) continue;
      if (color.get(dep) === GRAY) {
        cycle = [...stack.slice(stack.indexOf(dep)), dep];
        return;
      }
      if (color.get(dep) === WHITE) {
        visit(dep);
        if (cycle) return;
      }
    }
    stack.pop();
    color.set(id, BLACK);
  };

  for (const id of known) {
    if (color.get(id) === WHITE) {
      visit(id);
      if (cycle) break;
    }
  }
  if (cycle) errors.push(`Dependency cycle detected: ${(cycle as string[]).join(' -> ')}`);

  return { ok: errors.length === 0, errors };
}
