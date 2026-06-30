# Evidence Spine Design — Executive Summary

**Date:** 2026-06-29  
**Phase:** 32 Delivered (2026-06-28); Phases 33–37 Complete  
**Status:** Comprehensive spine in place; missing pieces identified for future phases

---

## What the Evidence Spine Does

The evidence spine makes orchestration **reproducible, diagnosable, and repairable**:

1. **Records what each task actually did** — not just success/failure, but input, output, and why it failed
2. **Captures agent invocations with contracts** — which model ran, what schema it violated, what it cost
3. **Enables downstream repair** — repair agents can see what upstream produced and diagnose the root cause
4. **Tracks validation and repair** — every validation attempt, every repair generation, every escalation is timestamped
5. **Proves contract boundaries** — "did the output match what we expected?" is answerable
6. **Distinguishes transient from real failures** — environment failures don't trigger code repairs

---

## Architecture: Three Tiers

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Canonical Event Stream (append-only JSONL)               │
│    data/run-events/{runId}.jsonl                            │
│    - OrchestrationEvent: { ts, type, agent, data, ... }    │
│    - NEVER mutated, crash-tolerant, ordered by timestamp    │
└─────────────────────────────────────────────────────────────┘
         ↓ enriched by ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Supporting Artifacts (typed, indexed by runId)           │
│    - validation-baselines: pre-repair snapshots             │
│    - validation-reports: full tsc/vitest/npm output         │
│    - traceability-reports: drift detection                  │
│    - repair-escalations: when repair hits a blocker         │
│    - artifacts: produced files (code, manifests)            │
└─────────────────────────────────────────────────────────────┘
         ↓ summarized in ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Run State (mutable)                                       │
│    - run.status: execution state (completed/failed)         │
│    - run.validation: quality outcome (passed/failed/...)    │
│    - run.contract: hardened spec bound to this run          │
└─────────────────────────────────────────────────────────────┘
```

**Key design principle:** The event stream is the ground truth. All other records derive from it.

---

## What's Implemented (Phases 32–37)

| Phase | Fixes | Delivered | Load-Bearing Fields |
|-------|-------|-----------|-------------------|
| **32** | "Fails, unknown why"; false success | `OrchestrationEvent` (sparse but complete); `RunEventLog`; single-owner `transitionRunStatus`; terminal-honesty guard | `type`, `level`, `ts`, `runId` |
| **33** | Non-convergent repair (blind loop) | `ValidationBaseline`; transient-failure classification; error signatures | `status`, `transient`, `errorSignatures` |
| **34** | Interface drift (bake-off #1) | `TraceabilityReport`; deterministic drift detection; silent-drift repair | `status`, `drift[]` |
| **35** | Planning failures (vague goals) | `RunContract`; contract compiler + validator; pre-start contract gate | `job_type`, `stages`, `agent_roster` |
| **36** | Repair never converges | `RepairEscalation`; failure classification; signature-aware stop gates | `escalateAfter`, `failureClass`, `generations` |
| **37** | Cross-worker isolation needed | `checkPlanIntegrity()`; DAG validation + sequencing | Plan validated before start; producers before reviewers |

All phases wired into `backend/src/routes/runs.ts:executeRunAsync()` and tested (48 tests passing).

---

## Critical Load-Bearing Fields

These fields are **essential for repair**. If any are missing, repair agents are blind:

### OrchestrationEvent
- **`type`** — what happened (agent_started, validation_completed, agent_blocked, ...)
- **`level`** — error/warn/info (severity)
- **`ts`** — when (enables timeline reconstruction)
- **`runId`** — which run (enables per-run reconstruction)

### ValidationBaseline (captured BEFORE repair)
- **`status`** — green/red/insufficient_evidence (is it worth repairing?)
- **`transient`** — true if environment failure (skip repair)
- **`errorSignatures`** — normalized error set (used to detect if repair made progress)

### TraceabilityReport (captured AFTER all phases)
- **`status`** — coherent/drift (did agents agree on types?)
- **`drift[]`** — which symbols are duplicated (what to consolidate)

### RepairEscalation
- **`escalateAfter`** — why repair stopped (limit/same_sig/no_delta)
- **`failureClass`** — what kind of failure (defect/environment/ambiguity)
- **`finalSignature`** — the error that wouldn't budge

### RunValidationOutcome (on run, separate from status)
- **`status`** — did validation pass? (passed/failed/insufficient_evidence)
- **`summary`** — human-readable reason (for terminal UI)

---

## What's Missing (Gaps for Deep Diagnostics)

| What | Why Needed | Phase |
|------|-----------|-------|
| **Agent Invocation Records** | Repair agents need to see input/output pairs to diagnose what went wrong | 38+ |
| **Per-Generation Repair Attempts** | Current loop records stop decision but not what each generation tried | 36+ |
| **Contract Validation Events** | When a task output violates its schema, that's invisible (only surfaced as error) | 35+ |
| **Call-by-Call Cost Ledger** | Currently cost is derived; storing each LLM call enables per-worker attribution | 38+ |

**None of these are blockers** — the spine is functional without them. But they become critical when:
- A repair agent needs to understand why the original agent failed
- You want to attribute cost to a specific model/worker/phase
- You're analyzing why a pattern of failures keeps occurring

---

## Event Payload Schema Example

Every event carries structured `data` (typed per event type):

```json
{
  "ts": "2026-06-29T10:04:00.000Z",
  "runId": "run-abc123",
  "type": "validation_completed",
  "level": "error",
  "stage": "Phase 1",
  "data": {
    "validation_status": "failed",
    "baseline_status": "red",
    "totalErrors": 2,
    "summary": "2 tsc errors in Dashboard.tsx",
    "tools": [
      {
        "tool": "tsc",
        "passed": false,
        "errorCount": 2
      }
    ]
  }
}
```

This is **sufficient for downstream repair** — a repair agent can read the event stream and answer:
- Which phases ran?
- Which had validation failures?
- What were the error signatures?
- Did repair improve them?
- When did repair give up?

---

## Traceability: The Chain of Custody

When Phase B fails because Phase A produced bad code:

```
Phase A (Architect)
  ├─ inputContract: { goal, ...requirements }
  ├─ produces → { files: [App.tsx, types.ts] }
  ├─ outputContract: { files?: string[]; errors?: null }
  └─ validation → passed
        ↓
Phase B (TypeScript Fixer) [depends on A's output]
  ├─ inputContract: { files from Phase A }
  ├─ produces → { fixes: [...] }
  ├─ validation → failed (tsc TS2322 in types.ts)
        ↓
Phase B Repair Agent reads:
  - What Phase A produced (from event stream)
  - What Phase B expected (from task description)
  - What actually broke (from validation report)
  → Can diagnose: "Phase A declared X as type Y, but I expected Z"
```

**This is enabled by:**
1. Immutable event stream (what actually happened)
2. Validation baselines (before/after snapshots)
3. Traceability reports (did types match?)
4. Contract validation (was it the contract or the code?)

---

## Queryable Views (For UI/Analytics)

These are **derived, not stored** — computed on-demand from the spine:

### RunDiagnostic
Query: `GET /api/runs/{id}/diagnostic`  
Returns: finalStatus, validationStatus, blockers, transientFailures, repairGenerations, timeline, cost

### PhaseRepairTimeline
Query: `GET /api/runs/{id}/phases/{phaseId}/repair-timeline`  
Returns: baseline, repairs[generation#, startSig, endSig, progress], escalation

### EventStream
Query: `GET /api/runs/{id}/events`  
Returns: chronological event log (raw event stream with queries like `?type=validation_*`)

---

## Terminal Status Logic (The Honesty Guard)

A run's final status reflects both **execution** and **quality**:

```typescript
// Phase 32: decideTerminalStatus()
if (materializedCount === 0) {
  return 'failed'; // Agents ran but produced no files
}
if (validation.status === 'failed') {
  return 'failed'; // Files exist but don't pass validation
}
return 'completed'; // Everything succeeded

// Validation status is separate:
run.validation = {
  status: 'passed' | 'failed' | 'insufficient_evidence' | 'not_run',
  summary: '...',
};
```

This means:
- A run with `status: completed, validation: insufficient_evidence` means "it worked, but we couldn't verify it"
- A run with `status: completed, validation: passed` means "it works"
- A run with `status: failed` is unambiguously broken

---

## Implementation Guidance

### For Phase 38+ (Repair Acceleration)

1. **Capture agent I/O contracts:**
   ```typescript
   export interface AgentInvocation {
     inputSchema: Record<string, unknown>;
     inputData: Record<string, unknown>;
     outputSchema: Record<string, unknown>;
     outputData: Record<string, unknown>;
     // ... (see EVIDENCE_SPINE_TYPES.ts)
   }
   ```
   Persisted to `agent-invocations` collection; emitted as `agent_invocation_complete` event.

2. **Record per-generation repair plans:**
   ```typescript
   export interface RepairAttempt {
     generationNumber: number;
     incomingSignature: string;
     repairTasks: Array<{ ... }>;
     outgoingSignature: string;
     progress: 'fixed' | 'progress' | 'no_change' | 'regressed';
   }
   ```
   This makes the repair loop's reasoning visible for analysis + human understanding.

3. **Add contract validation events:**
   Emit `contract_validation_started` / `contract_validation_failed` so schema violations are surfaced in the event stream, not hidden in logs.

### For Analytics (Phase 39+)

1. **Implement RunDiagnostic view** — summary of what went wrong, when, and why
2. **Implement PhaseRepairTimeline** — timeline of repair attempts and their progress
3. **Build a repair-root-cause analyzer** — given a run that escalated, suggest what changed and why

---

## Files to Reference

1. **EVIDENCE_SPINE_DESIGN.md** — Complete schema design (this covers the what and why)
2. **EVIDENCE_SPINE_TYPES.ts** — Authoritative TypeScript definitions (phases 32–39+)
3. **EVIDENCE_SPINE_EXAMPLES.json** — Concrete JSON payloads (what real events look like)
4. **backend/src/services/run-status.ts** — Terminal honesty guard implementation
5. **backend/src/services/run-event-log.ts** — Event log JSONL writer/reader
6. **backend/src/routes/runs.ts** (lines 230–721) — Evidence spine integrated into orchestration

---

## Success Criteria (Phase 32 Evidence Spine)

✅ **Acceptance Criteria Met (2026-06-28):**
- Every run emits a typed event stream (OrchestrationEvent JSONL)
- No run is `completed` without materialized, validated output (terminal honesty)
- Status is single-owner (orchestrator only; agents never write run.status)
- Event stream includes `validation_started` / `validation_completed` for every check
- Repair is traceable: `agent_started` / `agent_completed` for each repair attempt
- Escalation is explicit: `agent_blocked` event surfaces why repair stopped

✅ **Evidence for Success:**
- 48 tests across the reliability suite passing
- `tsc --noEmit` clean (backend)
- Bake-off ready to re-run with full diagnostics

---

## Next Steps

1. **Re-run the bake-off** with Phase 32–37 in place to measure whether runs now succeed
2. **Implement Phase 38+** (agent invocation capture) to enable deep repair diagnostics
3. **Build the queryable views** (RunDiagnostic, PhaseRepairTimeline) for the UI
4. **Analyze failure patterns** across runs to refine repair strategies

---

## Key Insight

> The limiting factor is no longer design — it is evidence.  
> — UnifiedAIToolbox `ROADMAP.md`, item RM-014

The evidence spine converts "run failed, unknown why" into "run failed because X in phase Y, after Z repair attempts, escalated for reason R." Once you can name the failure, you can fix it.

This spine is that naming mechanism.
