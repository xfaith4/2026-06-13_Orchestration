/**
 * Evidence Spine Type Definitions
 *
 * Consolidated, authoritative schema for the run evidence spine (Phase 32+).
 * This file documents what's currently implemented and what should be added.
 *
 * ✅ = Implemented in Phase 32–37
 * ❌ = Needed for future phases (repair acceleration, analytics)
 * 🔶 = Partial (exists but incomplete)
 */

// ============================================================================
// CANONICAL EVENT STREAM (Phase 32) ✅
// ============================================================================

/**
 * Core event type for the append-only event log.
 * Every orchestration milestone is recorded as one line in data/run-events/<runId>.jsonl
 */
export interface OrchestrationEvent {
  // Identity + ordering
  ts: string; // ISO 8601, UTC
  runId: string; // Shard key
  type: OrchestrationEventType;

  // Severity + messaging
  level: OrchestrationEventLevel; // 'debug' | 'info' | 'warn' | 'error'
  msg?: string; // Human-readable summary

  // Actor + scope
  agent?: string; // Agent/role that triggered this
  stage?: string; // Phase/stage name
  step?: string; // Task/step within the stage

  // Retry/repair tracking (Phase 36)
  attemptId?: string; // Unique ID for a repair attempt or task retry

  // Rich metadata (validated per event type)
  data?: Record<string, unknown>;
}

export type OrchestrationEventLevel = 'debug' | 'info' | 'warn' | 'error';

export type OrchestrationEventType =
  // Lifecycle
  | 'run_created' // Run instantiated
  | 'run_queued' // Waiting to execute (reserved)
  | 'run_started' // Execution began
  | 'run_completed' // All phases finished (may have failed)
  | 'run_failed' // Terminal failure
  | 'run_recovered' // Recovered from prior failure

  // Agent execution
  | 'agent_started' // Agent invocation began
  | 'agent_progress' // Mid-execution progress (reserved for streaming)
  | 'agent_blocked' // Agent hit hard blocker → escalation
  | 'agent_completed' // Agent invocation finished

  // Artifacts
  | 'artifact_created' // File written to disk

  // Validation
  | 'validation_started' // Build/test/lint began
  | 'validation_completed' // Validation finished

  // Cost reporting
  | 'cost_report'; // Definitive cost summary

// ============================================================================
// SUPPORTING ARTIFACTS (Phase 33–37) ✅
// ============================================================================

/**
 * Phase 33: Capture before repair to distinguish code defects from environment failures.
 * Non-fatal; persisted to collection 'validation-baselines'.
 */
export interface ValidationBaseline {
  id: string;
  runId: string;
  phaseId?: string;

  // Classification: is repair needed?
  capturedAt: string;
  status: 'green' | 'red' | 'insufficient_evidence'; // green=pass, red=fail, insufficient_evidence=transient
  transient: boolean; // true → don't repair; skip to next phase

  // Error summary
  totalErrors: number;
  tools: Array<{
    tool: 'npm-install' | 'tsc' | 'vitest';
    passed: boolean;
    errorCount: number;
  }>;

  // Convergence tracking (used by Phase 36 repair gate)
  errorSignatures: string[]; // Deduped set of error signatures (lowercase, normalized)

  // Environment snapshot
  environment: {
    node: string; // process.version
    platform: string; // process.platform
  };
}

/**
 * Phase 33–36: Full validation output from each run of tsc/vitest/npm-install.
 * Persisted to collection 'validation-reports' after each validation.
 *
 * Note: Currently stored as ProjectValidationReport from project-validator.ts;
 * this type documents its shape for reference.
 */
export interface ValidationReport {
  id: string;
  runId: string;
  phaseId?: string;

  // Overall result
  passed: boolean;
  totalErrors: number;
  summary: string; // e.g., "3 tsc errors; all in type definitions"

  // Per-tool breakdown
  results: Array<{
    tool: 'npm-install' | 'tsc' | 'vitest';
    passed: boolean;
    errorCount: number;
    errors: Array<{
      file?: string;
      message?: string;
      raw?: string;
    }>;
    output?: string; // Stdout/stderr if no structured errors
  }>;
}

/**
 * Phase 34: Detect type-definition drift (agents redefining shared types).
 * Persisted to collection 'traceability-reports' at run completion.
 */
export interface TraceabilityReport {
  id: string;
  runId: string;
  checkedAt: string;

  // Coherence assessment
  status: 'coherent' | 'drift';

  // Where shared types should live (if identified)
  contractModule: string | null; // File path (e.g., src/types.ts)
  contractSymbols: string[]; // Type names declared there

  // Drift findings (empty if coherent)
  drift: Array<{
    symbol: string; // Type name (e.g., PhaseStatus)
    kind: 'duplicate_definition'; // Only kind currently
    files: string[]; // Which files declare it (should be 1)
  }>;

  fileCount: number; // Total source files scanned
}

/**
 * Phase 36: Record when repair stops without converging (hard blocker).
 * Persisted to collection 'repair-escalations' when repair loop exits.
 * Also emitted as 'agent_blocked' event to the event stream.
 */
export interface RepairEscalation {
  id: string;
  runId: string;
  phaseId: string;

  // Why repair stopped
  escalateAfter:
    | 'planner_repair_limit_reached' // Hit maxRepairGenerations
    | 'same_signature_repeated' // Same error signature N times
    | 'no_plan_delta_detected'; // Repair didn't change anything

  // Where to escalate (from failure_treatment_policy.v1.json)
  escalationTarget: 'Supervisor' | 'Commissioner' | 'Human';

  // Failure classification (from repair_policy.ts)
  failureClass:
    | 'plan_ambiguity'
    | 'missing_precondition'
    | 'unverifiable_acceptance'
    | 'environment_blocker'
    | 'implementation_defect';

  // Context
  generations: number; // How many repair generations were attempted
  finalSignature: string; // The error signature that wouldn't budge
  totalErrors: number; // Number of errors in final report
  createdAt: string; // When escalation was recorded
}

/**
 * Phase 32: Materialized file from task output.
 * Persisted to collection 'artifacts' as files are written to disk.
 */
export interface Artifact {
  id: string;
  runId: string;
  phaseId?: string;
  taskId?: string;

  // File identity
  name: string; // Relative path (e.g., src/App.tsx)
  type: 'code' | 'log' | 'report' | 'document';
  mimeType?: string;
  size: number; // Bytes
  checksum: string; // SHA256

  // Storage
  contentPath: string; // Where stored (data/artifacts/...)
  downloadUrl?: string; // API path for retrieval

  // Metadata
  metadata?: {
    language?: string; // typescript, python, etc.
    materializedFrom?: 'task-output' | 'repair-output';
  };
  tags?: string[];

  // Provenance
  uploadedBy?: string; // Usually 'TaskExecutor' or agent name
  uploadedAt: string;
}

/**
 * Phase 35: Hardened, schema-complete contract bound to a run.
 * Validated before run start; persisted to run.contract.
 * Schema matches contracts/build_app_contract.v1.json (snake_case for validation).
 */
export interface RunContract {
  schema_version: string; // e.g., "1.0.0"
  job_type: string; // e.g., "build_new_app" (from job_types.json)
  contract_universe: string;
  contract_version: string;

  pipeline_id: string; // Orchestrator pipeline (if external)
  run_id: string; // This run's ID

  // What we're building
  goal: string; // The high-level objective

  // Who's building it
  agent_roster: string[]; // Agent IDs in the plan

  // Resource constraints
  budget: Record<string, unknown>; // Token budget, cost limit, etc.

  // Operational policy
  logging: Record<string, unknown>; // Verbosity, capture settings
  artifact_policy: Record<string, unknown>; // Allowed types, max count
  gate_policy: Record<string, unknown>; // Pre-run, per-phase gates

  // Execution plan
  stages: string[]; // Phase names in order

  // Optional
  metadata?: Record<string, unknown>;
}

// ============================================================================
// RUN-LEVEL STATE (Phase 32) ✅
// ============================================================================

/**
 * Quality outcome, kept SEPARATE from execution status.
 * Execution status = "did the tasks finish?" (completed/failed)
 * Validation status = "did the output work?" (passed/failed/insufficient_evidence/not_run)
 */
export interface RunValidationOutcome {
  status: RunValidationStatus;
  totalErrors?: number; // If failed
  summary?: string; // Human-readable result
  checkedAt?: string; // When validation ran
}

export type RunValidationStatus =
  | 'passed' // Validation ran and passed
  | 'failed' // Validation ran and failed
  | 'not_run' // Phase failed before validation could run
  | 'insufficient_evidence'; // Transient failure; can't tell if code is broken

/**
 * Execution state (distinct from validation status).
 * Only transitionRunStatus() should write this.
 */
export type RunStatus =
  | 'draft' // Created but not started
  | 'pending' // Queued for execution
  | 'running' // Currently executing
  | 'completed' // All phases finished (combined with validation.status for truthfulness)
  | 'failed' // Terminal failure
  | 'paused'; // Human paused mid-execution

// ============================================================================
// MISSING PIECES (For Future Phases) ❌
// ============================================================================

/**
 * ❌ Phase 38+: Agent Invocation Records
 *
 * To enable deep repair diagnostics, each agent call should record:
 * - What input it received (schema + data)
 * - What output it produced (schema + data)
 * - Whether the output matched the contract
 * - Token costs for that specific call
 *
 * This allows repair agents to answer: "What did the original task try, and why did it fail?"
 */
export interface AgentInvocation {
  id: string;
  runId: string;
  phaseId: string;
  taskId: string;
  attemptNumber?: number; // If this task was retried

  // Input contract (what the task was supposed to do)
  inputSchema?: Record<string, unknown>;
  inputData: Record<string, unknown>;

  // Agent executing
  agentId: string;
  agentRole: string;
  model: string; // Which model executed

  // Output (what the agent produced)
  success: boolean;
  outputSchema?: Record<string, unknown>;
  outputData: Record<string, unknown>;
  error?: string; // If failed

  // Contract validation
  contractViolations?: Array<{
    field: string;
    expectedType: string;
    receivedType: string;
    message?: string;
  }>;

  // Observability
  tokenInputs: number;
  tokenOutputs: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  cost: number;

  // Timing
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

/**
 * ❌ Phase 36 follow-on: Repair Attempt Records
 *
 * Currently repair loop records the stop decision but not per-generation plans.
 * This makes the repair loop's reasoning invisible.
 *
 * Persisted to collection 'repair-attempts' per generation.
 */
export interface RepairAttempt {
  id: string;
  runId: string;
  phaseId: string;

  // Which generation
  generationNumber: number;

  // Pre-repair state
  incomingSignature: string; // Error signature at start
  incomingErrorCount: number;
  incomingErrors: Array<{
    file?: string;
    code?: string; // e.g., TS2322
    message: string;
  }>;

  // Repair plan + execution
  repairTasks: Array<{
    taskId: string;
    description: string;
    agentId: string;
    agentRole: string;
    success: boolean;
    output: string; // Agent response (extracted files)
  }>;

  // Post-repair state
  outgoingSignature: string;
  outgoingErrorCount: number;
  outgoingErrors: Array<{
    file?: string;
    code?: string;
    message: string;
  }>;

  // Progress signal (used to detect dead-end repairs)
  progress: 'fixed' | 'progress' | 'no_change' | 'regressed';

  // Timing
  completedAt: string;
  durationMs: number;
}

/**
 * ❌ Phase 35 follow-on: Contract Validation Events
 *
 * When a task's output doesn't match its output contract,
 * that should be surfaced as an event for diagnostics.
 */
export interface ContractValidationFailure {
  id: string;
  runId: string;
  phaseId: string;
  taskId: string;

  // What contract was violated
  contractVersion: string;
  expectedSchema: Record<string, unknown>;

  // What was produced
  actualOutput: Record<string, unknown>;

  // Violations
  violations: Array<{
    field: string;
    expectedType: string;
    receivedType: string;
    message?: string;
  }>;

  // Was this caught before downstream processing?
  caughtBefore: 'agent_downstream_use' | 'validation' | 'none';

  recordedAt: string;
}

// ============================================================================
// QUERYABLE VIEWS (Derived, not stored) — for analytics/UI
// ============================================================================

/**
 * Computed view: High-level run diagnostics for UI/reporting.
 * Derived from event stream + baselines + escalations.
 */
export interface RunDiagnostic {
  runId: string;

  // Terminal outcome
  finalStatus: 'completed' | 'failed';
  validationStatus: RunValidationStatus;
  reason?: string;

  // Failure classification
  blockers: RepairEscalation[];
  transientFailures: ValidationBaseline[];
  interfaceDrift: Array<{
    symbol: string;
    files: string[];
  }>;

  // Repair metrics
  repairGenerations: number;
  repairConvergence: 'success' | 'no_progress' | 'escalated';

  // Timeline
  durationMs: number;
  phaseTimings: Array<{
    phaseId: string;
    phaseName: string;
    durationMs: number;
    status: 'completed' | 'failed';
  }>;

  // Cost
  totalCost: number;
  costPerTask: number;
  cacheHitRatio: number;

  // What was produced
  artifactCount: number;
  fileCount: number;

  // Events trail (for timeline UI)
  eventCount: number;
}

/**
 * Computed view: Per-phase repair timeline for diagnostics.
 * Shows what repair did, whether it converged, and why it stopped.
 */
export interface PhaseRepairTimeline {
  runId: string;
  phaseId: string;
  phaseName: string;

  // Pre-repair snapshot
  baseline: ValidationBaseline;

  // Repair generations
  repairs: Array<{
    generation: number;
    startSignature: string;
    endSignature: string;
    startErrorCount: number;
    endErrorCount: number;
    progress: 'fixed' | 'progress' | 'no_change' | 'regressed';
    durationMs: number;
  }>;

  // Why repair stopped
  escalation?: RepairEscalation;
  finalStatus: 'passed' | 'escalated' | 'insufficient_evidence';
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_REPAIR_POLICY = {
  maxRepairGenerations: 3,
  maxSameFailureSignature: 2,
  escalationTarget: 'Supervisor' as const,
};

export const TRANSIENT_ERROR_PATTERNS = [
  /\bEPERM\b/i,
  /\bEBUSY\b/i,
  /\bEACCES\b/i,
  /\bEMFILE\b/i,
  /\bENFILE\b/i,
  /\bENOSPC\b/i,
  /\bENOTFOUND\b/i,
  /\bETIMEDOUT\b/i,
  /\bECONNRESET\b/i,
  /\bEAI_AGAIN\b/i,
  /\bENETUNREACH\b/i,
  /being used by another process/i,
  /resource (?:temporarily )?unavailable/i,
  /socket hang ?up/i,
  /network (?:error|timeout)/i,
];

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  OrchestrationEvent,
  OrchestrationEventLevel,
  OrchestrationEventType,
  ValidationBaseline,
  ValidationReport,
  TraceabilityReport,
  RepairEscalation,
  Artifact,
  RunContract,
  RunValidationOutcome,
  RunStatus,
  AgentInvocation,
  RepairAttempt,
  ContractValidationFailure,
  RunDiagnostic,
  PhaseRepairTimeline,
};
