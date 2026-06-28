import type { Run, RunStatus, RunValidationOutcome } from '@unifiedaitoolbox/shared';
import { PersistenceService } from './persistence.js';
import { RunEventLog } from './run-event-log.js';

/**
 * Terminal-honesty guard (Roadmap Phase 32). Decides the TRUTHFUL terminal status:
 *  - produced no runnable output → `failed` (agents finishing is not success)
 *  - validation RAN and FAILED   → `failed` (a build isn't `completed` if it doesn't validate)
 *  - otherwise                    → `completed` (validation that didn't run is surfaced
 *    honestly via the separate `validation.status`, not hidden behind a green status)
 * Pure function so the policy is unit-testable in isolation.
 */
export function decideTerminalStatus(input: {
  materializedCount: number;
  validation: RunValidationOutcome;
}): { status: 'completed' | 'failed'; reason?: string } {
  if (input.materializedCount <= 0) {
    return {
      status: 'failed',
      reason: 'No runnable output was materialized — agents finished but produced no files.',
    };
  }
  if (input.validation.status === 'failed') {
    return {
      status: 'failed',
      reason: `Validation failed: ${input.validation.summary ?? 'see validation report'}`,
    };
  }
  return { status: 'completed' };
}

const TRANSITION_EVENT: Partial<Record<RunStatus, 'run_started' | 'run_completed' | 'run_failed'>> = {
  running: 'run_started',
  completed: 'run_completed',
  failed: 'run_failed',
};

/**
 * The SINGLE writer of run-level `status` — orchestrator-only status authority
 * (RUN_LIFECYCLE §5). Persists the status change and emits the matching canonical
 * lifecycle event. Nothing else in the run path should write `run.status` directly.
 */
export async function transitionRunStatus(
  persistence: PersistenceService,
  events: RunEventLog,
  runId: string,
  toStatus: RunStatus,
  opts: { reason?: string; validation?: RunValidationOutcome; data?: Record<string, unknown> } = {}
): Promise<Run | null> {
  const patch: Partial<Run> = { status: toStatus };
  if (toStatus === 'completed' || toStatus === 'failed') {
    patch.completedAt = new Date().toISOString();
  }
  if (opts.reason) patch.errorMessage = opts.reason;
  if (opts.validation) patch.validation = opts.validation;

  const updated = await persistence.update<Run>('runs', runId, patch);

  const evt = TRANSITION_EVENT[toStatus];
  if (evt) {
    await events.emit(runId, evt, {
      msg: opts.reason,
      data: {
        status: toStatus,
        ...(opts.validation ? { validation_status: opts.validation.status } : {}),
        ...(opts.data ?? {}),
      },
    });
  }
  return updated;
}

/** Build a RunValidationOutcome from a project validation report (or `not_run` when absent). */
export function toValidationOutcome(
  report: { passed: boolean; totalErrors: number; summary: string } | null
): RunValidationOutcome {
  if (!report) return { status: 'not_run' };
  return {
    status: report.passed ? 'passed' : 'failed',
    totalErrors: report.totalErrors,
    summary: report.summary,
    checkedAt: new Date().toISOString(),
  };
}
