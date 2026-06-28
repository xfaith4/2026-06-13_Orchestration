import type { ProjectValidationReport } from './project-validator.js';
import { errorSignature } from './baseline.js';

// Roadmap Phase 36 — Signature-Aware Planner-First Repair.
// Concrete control logic for contracts/failure_treatment_policy.v1.json: bound the repair
// loop by repair generations AND by repeated/no-progress failure signatures, classify the
// failure, and escalate when it won't converge — instead of a blind attempt counter.

export type FailureClass =
  | 'plan_ambiguity'
  | 'missing_precondition'
  | 'unverifiable_acceptance'
  | 'environment_blocker'
  | 'implementation_defect';

export type EscalateAfter =
  | 'planner_repair_limit_reached'
  | 'same_signature_repeated'
  | 'no_plan_delta_detected';

export type EscalationTarget = 'Supervisor' | 'Commissioner' | 'Human';

export interface RepairPolicy {
  maxRepairGenerations: number;
  maxSameFailureSignature: number;
  escalationTarget: EscalationTarget;
}

// Concrete instance of failure_treatment_policy.v1.json `retry_and_loop_controls`.
export const DEFAULT_REPAIR_POLICY: RepairPolicy = {
  maxRepairGenerations: 3,
  maxSameFailureSignature: 2,
  escalationTarget: 'Supervisor',
};

/** Stable signature for a failing validation report (the deduped, sorted set of error signatures). */
export function failureSignature(report: ProjectValidationReport): string {
  if (report.passed) return '';
  const sigs = report.results.flatMap(r => r.errors.map(e => errorSignature(r.tool, e)));
  const uniq = [...new Set(sigs)].sort();
  return uniq.length ? uniq.join('|') : 'unknown';
}

/** Map a failing validation to the policy's `failure_class` enum. */
export function classifyFailureClass(report: ProjectValidationReport): FailureClass {
  const failing = report.results.filter(r => !r.passed);
  if (!failing.length) return 'implementation_defect';
  if (failing.some(r => r.tool === 'npm-install')) return 'environment_blocker';
  if (failing.some(r => r.tool === 'tsc')) return 'implementation_defect';
  if (failing.some(r => r.tool === 'vitest')) return 'unverifiable_acceptance';
  return 'implementation_defect';
}

export interface RepairGateInput {
  attempt: number; // repair generations already performed
  currentSignature: string; // signature of the CURRENT failing report
  signatureCounts: Record<string, number>;
  policy: RepairPolicy;
}

export interface RepairGateDecision {
  proceed: boolean;
  escalateAfter?: EscalateAfter;
}

/**
 * Decide (BEFORE each generation) whether to attempt another repair. Stops at the generation
 * cap or when the same failure signature has recurred too many times. (The third stop
 * condition — no_plan_delta_detected — is detected by the caller after re-validation, when the
 * signature is unchanged by a repair.)
 */
export function repairGate(input: RepairGateInput): RepairGateDecision {
  if (input.attempt >= input.policy.maxRepairGenerations) {
    return { proceed: false, escalateAfter: 'planner_repair_limit_reached' };
  }
  if ((input.signatureCounts[input.currentSignature] ?? 0) >= input.policy.maxSameFailureSignature) {
    return { proceed: false, escalateAfter: 'same_signature_repeated' };
  }
  return { proceed: true };
}
