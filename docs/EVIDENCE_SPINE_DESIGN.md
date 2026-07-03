# Evidence Spine Schema Design — Phase 32 & Beyond

**Status:** Phase 32 delivered (2026-06-28); this document consolidates and extends the design for Phases 33–37 and future repair/escalation work.

**Goal:** Make every run traceable — what each task actually did, what it produced, what contracts it violated, and why failures occurred. This is load-bearing for diagnosis and repair.

---

## Design Principles

1. **Append-only event log as the spine** — JSONL at `data/run-events/<id>.jsonl` is the canonical record; all other artifacts are derived or supplementary.
2. **Execution-state ≠ quality-outcome** — "completed" (task finished) is separate from "valid" (output met contract). Terminal status reflects both.
3. **Repair is traceable** — every repair attempt is recorded with input errors, repair plan, and outcome.
4. **Contracts are checkpoints** — input contract, output contract, and validation prove the boundaries between workers.
5. **Transient failures don't repair** — Phase 33 distinguishes environment failures from code defects so repair loop skips the former.
6. **No derived data in the spine** — events record what happened; summaries/reports derive it.

---

## Spine Structure

The evidence spine is a **multi-tier architecture**:

```
├─ Canonical Event Stream (JSONL, append-only)
│  └─ OrchestrationEvent[] — all lifecycle events
│
├─ Supporting Artifacts (keyed by runId)
│  ├─ validation-baselines — pre-repair snapshots
│  ├─ validation-reports — full validation output
│  ├─ traceability-reports — drift/coherence findings
│  ├─ repair-escalations — repair stop events + reasons
│  ├─ artifacts — produced files (code, manifests, reports)
│  └─ run-summaries — derived summary of the whole run
│
└─ Run State (mutable)
    └─ run.validation — quality outcome (passed/failed/insufficient_evidence)
       run.status — execution state (completed/failed)
       run.contract — hardened spec
```

---

## The Canonical Event Stream

### OrchestrationEvent (Core)

```typescript
export interface OrchestrationEvent {
  // Identity
  ts: string;                           // ISO 8601 timestamp (UTC)
  runId: string;                        // Which run (enables per-run JSONL shard)
  type: OrchestrationEventType;         // Event category

  // Severity + context
  level: OrchestrationEventLevel;       // 'debug' | 'info' | 'warn' | 'error'
  msg?: string;                         // Human-readable summary

  // Actor + scope
  agent?: string;                       // Which agent/role ran this
  stage?: string;                       // Which phase/stage
  step?: string;                        // Which task/step within the stage

  // Repair/retry tracking (Phase 36)
  attemptId?: string;                   // Unique ID for a repair or task retry
  
  // Rich metadata (opaque; validated via schema per event type)
  data?: Record<string, unknown>;
}
```

### Event Type Taxonomy

Each type carries specific `data` payload (see "Event Payloads" below):

```typescript
export type OrchestrationEventType =
  // Lifecycle
  | 'run_created'            // Run instantiated from roadmap
  | 'run_queued'             // Waiting to execute (not yet in this impl)
  | 'run_started'            // Execution began
  | 'run_completed'          // Execution finished (status may be failed)
  | 'run_failed'             // Terminal failure
  | 'run_recovered'          // Recovered from a prior failure

  // Agent execution
  | 'agent_started'          // Agent invocation began
  | 'agent_progress'         // Mid-execution progress (optional; not in Phase 32)
  | 'agent_blocked'          // Agent hit a hard blocker → escalation
  | 'agent_completed'        // Agent invocation finished (may have failed)

  // Artifacts
  | 'artifact_created'       // File materialized to disk

  // Validation
  | 'validation_started'     // Build/test/lint validation began
  | 'validation_completed'   // Validation finished (passed/failed/insufficient_evidence)

  // Repair (Phase 36)
  | 'repair_started'         // Repair generation N began (not in current impl; implied)
  | 'repair_completed'       // Repair generation finished (not in current impl; derived)

  // Cost & reporting
  | 'cost_report'            // Definitive cost summary (Phase 32 follow-on)
```

### Event Payloads (Data Field)

Each event type has a schema for its `data` field:

#### run_created
```json
{
  "job_type": "build_new_app",
  "requested_objective": "...",
  "roadmapId": "...",
  "phases": 5
}
```

#### run_started
```json
{
  "phases": 5,
  "attempt_number": 1,
  "estimated_duration_mins": 120
}
```

#### agent_started
```json
{
  "agentId": "...",
  "taskId": "...",
  "role": "Architect",
  "model": "claude-3-5-sonnet-20241022",
  "inputTokens": 8192
}
```

#### agent_completed
```json
{
  "success": true,
  "outputTokens": 4096,
  "durationMs": 12000,
  "error": null  // if failed
}
```

#### artifact_created
```json
{
  "path": "src/App.tsx",
  "size": 2048,
  "checksum": "sha256:...",
  "produced_by": "Architect",
  "language": "typescript"
}
```

#### validation_started
```json
{
  "tools": ["npm-install", "tsc", "vitest"],
  "baseline_captured": true
}
```

#### validation_completed
```json
{
  "validation_status": "failed",
  "baseline_status": "red",
  "totalErrors": 3,
  "summary": "3 tsc errors; all in type definitions",
  "tools": [
    {
      "tool": "npm-install",
      "passed": true,
      "errorCount": 0
    },
    {
      "tool": "tsc",
      "passed": false,
      "errorCount": 3
    }
  ]
}
```

#### agent_blocked
```json
{
  "severity": "soft_blocker",
  "code": "same_signature_repeated",
  "summary": "Repair stopped after 3 generations; errors unchanged",
  "failure_class": "implementation_defect",
  "needed_from": "Supervisor",
  "escalation_ticket": "..."
}
```

#### cost_report
```json
{
  "totalCost": 4.25,
  "currency": "USD",
  "calls": 18,
  "tokenInputs": 156000,
  "tokenOutputs": 48000,
  "cacheHitRatio": 0.32,
  "byModel": {
    "claude-3-5-sonnet": { "cost": 3.50, "calls": 15 },
    "claude-opus": { "cost": 0.75, "calls": 3 }
  }
}
```

#### run_completed / run_failed
```json
{
  "status": "completed",
  "validation_status": "passed",
  "driftCount": 0,
  "totalErrors": 0,
  "durationMs": 180000,
  "reason": null
}
```

---

## Supporting Artifacts (Indexed Collections)

The event stream is supplemented by typed records, indexed by `runId + phaseId`:

### ValidationBaseline (Phase 33)

Captured BEFORE any repair. Distinguishes environment failures from code defects.

```typescript
export interface ValidationBaseline {
  id: string;
  runId: string;
  phaseId?: string;
  capturedAt: string;
  
  // Classification (Phase 33 anti-goal: never repair the environment)
  status: 'green' | 'red' | 'insufficient_evidence';
  transient: boolean;  // true → don't repair; environment failure
  
  // Errors
  totalErrors: number;
  tools: Array<{
    tool: string;
    passed: boolean;
    errorCount: number;
  }>;
  
  // Convergence tracking (Phase 36 uses these)
  errorSignatures: string[];
  
  // Environment snapshot
  environment: {
    node: string;
    platform: string;
  };
}
```

**Load-bearing:** `status`, `transient`, `errorSignatures` (the rest is context)

**When created:** Right after validation runs, before repair loop (Phase 33)

**Consumed by:** Repair gate (Phase 36) to decide whether to repair

### ValidationReport (Existing)

Full validation output from tsc/vitest/npm-install. Not specially typed in the current implementation (stored as ProjectValidationReport).

```typescript
export interface ValidationReport {
  id: string;
  runId: string;
  phaseId?: string;
  
  passed: boolean;
  totalErrors: number;
  summary: string;
  
  results: Array<{
    tool: 'npm-install' | 'tsc' | 'vitest';
    passed: boolean;
    errorCount: number;
    errors: Array<{
      file?: string;
      message?: string;
      raw?: string;
    }>;
    output?: string;
  }>;
}
```

**Captured:** After each validation run (Phase 33, Phase 36 after each repair)

**Used for:** Diagnostics, repair task generation, signature computation

### TraceabilityReport (Phase 34)

Detects and records type-definition drift (agent interface reuse failures).

```typescript
export interface TraceabilityReport {
  id: string;
  runId: string;
  checkedAt: string;
  
  // Coherence status
  status: 'coherent' | 'drift';
  
  // Where shared types should live (if identified)
  contractModule: string | null;
  contractSymbols: string[];
  
  // What drifted (empty if coherent)
  drift: Array<{
    symbol: string;           // Type name (e.g., PhaseStatus)
    kind: 'duplicate_definition';
    files: string[];          // Which files declare it (should be 1)
  }>;
  
  fileCount: number;
}
```

**Captured:** At run end, after all phases complete (Phase 34)

**Used for:** Determining if the run's interfaces are consistent

### RepairEscalation (Phase 36)

Records when repair stops without converging (hard blocker).

```typescript
export interface RepairEscalation {
  id: string;
  runId: string;
  phaseId: string;
  
  // Why repair stopped
  escalateAfter: 'planner_repair_limit_reached'
               | 'same_signature_repeated'
               | 'no_plan_delta_detected';
  
  // Where to escalate
  escalationTarget: 'Supervisor' | 'Commissioner' | 'Human';
  
  // Context
  failureClass: 'plan_ambiguity'
              | 'missing_precondition'
              | 'unverifiable_acceptance'
              | 'environment_blocker'
              | 'implementation_defect';
  
  generations: number;
  finalSignature: string;
  totalErrors: number;
  createdAt: string;
}
```

**Created:** When repair loop exits without convergence (Phase 36)

**Emitted as:** `agent_blocked` event to the event stream

**Used for:** Determining whether a run truly failed or hit a blocker needing human intervention

### Artifact (Existing)

Materialized files from task outputs.

```typescript
export interface Artifact {
  id: string;
  runId: string;
  phaseId?: string;
  taskId?: string;
  
  name: string;              // File path
  type: 'code' | 'log' | 'report';
  mimeType?: string;
  size: number;
  checksum: string;          // SHA256
  contentPath: string;
  
  metadata?: {
    language?: string;
    materializedFrom: 'task-output' | 'repair-output';
  };
  tags?: string[];
}
```

**Created:** Per-file when task output is extracted (Phase 32 follow-on)

**Emitted as:** `artifact_created` event

**Used for:** Reconstruction of produced code, diff against baseline

---

## Missing Pieces (Implications for Future Phases)

The current spine captures *what happened* but is sparse on *agent I/O contracts*. Here's what should be added:

### ❌ Agent Invocation Records (NOT YET)

To enable deep repair diagnostics, each agent call should record:

```typescript
export interface AgentInvocation {
  id: string;
  runId: string;
  phaseId: string;
  taskId: string;
  
  // Input contract
  inputSchema: Record<string, unknown>;
  inputData: Record<string, unknown>;
  
  // Execution
  agentId: string;
  agentRole: string;
  model: string;
  
  // Output
  success: boolean;
  outputSchema: Record<string, unknown>;
  outputData: Record<string, unknown>;
  
  // Validation
  contractViolations?: Array<{
    field: string;
    expected: string;
    received: string;
  }>;
  
  // Cost
  tokenInputs: number;
  tokenOutputs: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  cost: number;
  model: string;
  
  // Timing
  startedAt: string;
  completedAt: string;
  durationMs: number;
}
```

**Why missing:** The current EventLog captures `agent_started` / `agent_completed` but not the input/output objects themselves. To repair intelligently, a repair agent needs to see what the original agent tried and what broke.

**When to add:** Phase 38+ (repair acceleration)

### ❌ Repair Attempt Log (PARTIAL)

Currently `RepairEscalation` records the stop decision, but not the per-generation repair attempts:

```typescript
export interface RepairAttempt {
  id: string;
  runId: string;
  phaseId: string;
  
  generationNumber: number;
  
  // Errors at the start of this generation
  incomingSignature: string;
  incomingErrors: Array<{ file: string; code: string; message: string }>;
  
  // Repair plan + execution
  repairTasks: Array<{
    taskId: string;
    description: string;
    agentId: string;
    output: string;
  }>;
  
  // Post-repair validation
  outgoingSignature: string;
  outgoingErrors: Array<{ file: string; code: string; message: string }>;
  
  // Progress signal
  progress: 'fixed' | 'progress' | 'no_change' | 'regressed';
  
  completedAt: string;
}
```

**Why missing:** The repair loop in `runs.ts` records failure signatures but not the per-generation plans and outcomes. This makes the repair loop's reasoning invisible.

**When to add:** Phase 36 follow-on (repair analytics)

### ❌ Contract Validation Events (NOT YET)

When a task's output is checked against its output contract, that should be emitted:

```typescript
export interface ContractValidationEvent extends OrchestrationEvent {
  type: 'contract_validation_started' | 'contract_validation_failed';
  data: {
    taskId: string;
    schemaVersion: string;
    expectedSchema: Record<string, unknown>;
    actualOutput: Record<string, unknown>;
    violations: Array<{
      field: string;
      expectedType: string;
      receivedType: string;
      message?: string;
    }>;
  };
}
```

**Why missing:** Currently contracts are enforced in `TaskExecutor` but failures are not surfaced as events (only as task errors).

**When to add:** Phase 35 follow-on (contract enforcement)

---

## Traceability Model

To repair intelligently, a repair agent must answer: "What did the original task depend on, and what is it allowed to change?"

```
Task T₁ (Agent A)
  ├─ inputContract: INC₁
  ├─ preconditions: [file X exists, Y is valid TypeScript]
  ├─ output → {code: string, errors?: Error[]}
  └─ outputContract: OC₁
      │
      └─→ Task T₂ (Agent B, depends on T₁)
          ├─ inputContract: INC₂ (expects OC₁)
          ├─ preconditions: [output from T₁ exists, ...]
          └─ output → {code: string, ...}
```

**Load-bearing fields for traceability:**

1. **Task dependencies** → `task.dependencies` (already in ExecutionTask)
2. **Input/output contracts** → Agent invocation records (NOT YET)
3. **Preconditions** → Should be in task description or agent contract (agent-defined)
4. **Materialized artifacts** → `artifact_created` events + `Artifact` records

**Repair-time logic:**
- When Task T₂ fails because T₁ produced bad code, the repair agent for T₁ needs:
  - The input T₁ received (captured as `agent_started.data.inputData`)
  - The output T₁ produced (currently lost; would need AgentInvocation)
  - What T₂ expected (T₁'s outputContract)
  - What T₂ actually received (T₁'s actual output)
  - Whether the mismatch is T₁'s fault or T₂'s misuse

---

## Queryable Views (Derived from the Spine)

These are computed, not stored:

### RunDiagnostic
```typescript
export interface RunDiagnostic {
  runId: string;
  
  // Terminal state
  finalStatus: 'completed' | 'failed';
  validationStatus: 'passed' | 'failed' | 'insufficient_evidence';
  
  // Failure taxonomy
  blockers: RepairEscalation[];
  transientFailures: ValidationBaseline[];
  interfaceDrift: DriftFinding[];
  
  // Repair history
  repairGenerations: number;
  repairConvergence: 'success' | 'no_progress' | 'escalated';
  
  // Timeline
  durationMs: number;
  phaseTimings: Array<{ phaseId: string; durationMs: number }>;
  
  // Cost
  totalCost: number;
  costPerTask: number;
  cacheHitRatio: number;
}
```

Computed from: event stream + validation baselines + repair escalations + cost report

### PhaseRepairTimeline
```typescript
export interface PhaseRepairTimeline {
  runId: string;
  phaseId: string;
  
  baseline: ValidationBaseline;
  repairs: Array<{
    generation: number;
    startSignature: string;
    endSignature: string;
    progress: 'fixed' | 'progress' | 'no_change' | 'regressed';
  }>;
  escalation?: RepairEscalation;
}
```

Computed from: validation baselines + validation reports

---

## Appendix: Existing Implementation Status

### Phase 32 ✅ Delivered
- `OrchestrationEvent` type (sparse but sufficient)
- `RunEventLog` append-only JSONL writer + reader
- Single-owner `transitionRunStatus` enforces orchestrator-only authority
- `decideTerminalStatus` terminal-honesty guard

### Phase 33 ✅ Delivered
- `ValidationBaseline` capture + transient-failure classification
- Repair gate skips on transient failures
- `errorSignature()` for convergence detection

### Phase 34 ✅ Delivered
- `TraceabilityReport` drift detection
- `checkCoherence()` deterministic analysis
- Silent-drift repair + rollback safety

### Phase 35 ✅ Delivered
- `RunContract` compilation + validation
- `buildAndValidate()` hardens loose requests
- Pre-start contract gate (422 if invalid)

### Phase 36 ✅ Delivered
- `failureSignature()` deduped error set
- `classifyFailureClass()` failure taxonomy
- `repairGate()` stop on repeated signature / generation limit
- `RepairEscalation` records when repair stops
- Planner-first escalation target routing

### Phase 37 ✅ Delivered
- `checkPlanIntegrity()` DAG validation
- `orderProducersFirst()` task sequencing
- Pre-run plan gate (422 if broken)

### Future Work
- Agent invocation input/output capture (Phase 38+)
- Per-generation repair attempt records (Phase 36 follow-on)
- Contract validation events (Phase 35 follow-on)
- Real multi-worker parallelization (Phase 37 follow-on: git worktree isolation)

---

## Recommendations for Implementation

### Immediate (Critical for Diagnosis)
1. **Extend OrchestrationEvent.data** — document all event payload schemas in a single enum/discriminated union
2. **Add AgentInvocation records** — capture input/output objects so repair agents can inspect what went wrong
3. **Record per-generation repair plans** — make the repair loop's reasoning visible

### Medium-term (Enables Analytics)
4. **Queryable view layer** — RunDiagnostic, PhaseRepairTimeline computed on-demand
5. **Evidence export** — render the spine as a timeline/DAG visualization
6. **Repair agent feedback loop** — feed escalations + repair attempts back into prompts

### Long-term (Full Orchestration)
7. **Cross-run evidence correlation** — aggregate lessons learned across runs
8. **Contract evolution tracking** — when a contract changes, mark affected prior runs
9. **Cost/quality frontier** — model/budget trade-offs based on historical data

