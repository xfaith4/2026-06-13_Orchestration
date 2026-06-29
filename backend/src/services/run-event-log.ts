import fs from 'fs/promises';
import path from 'path';
import type {
  OrchestrationEvent,
  OrchestrationEventType,
  OrchestrationEventLevel,
} from '@unifiedaitoolbox/shared';

// Default severity per event type (EVENT_TAXONOMY §5).
const DEFAULT_LEVEL: Record<OrchestrationEventType, OrchestrationEventLevel> = {
  run_created: 'info',
  run_queued: 'info',
  run_started: 'info',
  agent_started: 'info',
  agent_progress: 'info',
  agent_blocked: 'warn',
  agent_completed: 'info',
  artifact_created: 'info',
  validation_started: 'info',
  validation_completed: 'info',
  cost_report: 'info',
  run_completed: 'info',
  run_failed: 'error',
  run_recovered: 'warn',
};

export interface EmitOptions {
  level?: OrchestrationEventLevel;
  msg?: string;
  agent?: string;
  stage?: string;
  step?: string;
  attemptId?: string;
  data?: Record<string, unknown>;
}

/**
 * Canonical, append-only per-run event stream — the evidence spine (Roadmap Phase 32).
 * One JSON object per line at `data/run-events/<runId>.jsonl`. Append-only and crash-tolerant:
 * emitting an event must NEVER break a run, so all I/O failures are swallowed with a warning.
 */
export class RunEventLog {
  private dir: string;

  constructor(dataDir: string) {
    this.dir = path.join(dataDir, 'run-events');
  }

  private file(runId: string): string {
    return path.join(this.dir, `${runId}.jsonl`);
  }

  async emit(runId: string, type: OrchestrationEventType, opts: EmitOptions = {}): Promise<void> {
    const event: OrchestrationEvent = {
      ts: new Date().toISOString(),
      level: opts.level ?? DEFAULT_LEVEL[type] ?? 'info',
      runId,
      type,
      ...(opts.msg ? { msg: opts.msg } : {}),
      ...(opts.agent ? { agent: opts.agent } : {}),
      ...(opts.stage ? { stage: opts.stage } : {}),
      ...(opts.step ? { step: opts.step } : {}),
      ...(opts.attemptId ? { attemptId: opts.attemptId } : {}),
      ...(opts.data ? { data: opts.data } : {}),
    };
    try {
      await fs.mkdir(this.dir, { recursive: true });
      await fs.appendFile(this.file(runId), JSON.stringify(event) + '\n', 'utf-8');
    } catch (err) {
      console.warn(
        `[run-events] failed to emit ${type} for ${runId}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  async read(runId: string): Promise<OrchestrationEvent[]> {
    try {
      const raw = await fs.readFile(this.file(runId), 'utf-8');
      return raw
        .split('\n')
        .filter(Boolean)
        .map(line => {
          try {
            return JSON.parse(line) as OrchestrationEvent;
          } catch {
            return null;
          }
        })
        .filter((e): e is OrchestrationEvent => e !== null);
    } catch {
      return [];
    }
  }
}
