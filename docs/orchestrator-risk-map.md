# Orchestrator Risk Map

> Verification levels: VERIFIED / PARTIALLY VERIFIED / INFERRED / UNVERIFIED

---

## Critical Risks

### R1 — Contract Agent Roster Not Enforced
**Severity:** CRITICAL  
**Status:** VERIFIED  
**Evidence:** `backend/src/routes/runs.ts` lines 263–297; `backend/src/services/contract-compiler.ts:73`

The compiled `RunContract` includes `agent_roster: ['Researcher','Engineer','Critic','Synthesizer','Commissioner','Supervisor']` sourced from `job_types.json`. However, `executeRunAsync` calls `agentRegistry.getAllAgents()` (line 263) and passes all 27 agents to `buildAgentAssignments`. There is no code that filters agents to the roster.

**Consequence:** Any of the 27 loaded agents (including Life Coach, Resume Builder) can be assigned to application-building tasks if their scores match.

**Fix:** Filter the agent list in `executeRunAsync` to only agents whose `name` is in `run.contract.agent_roster`.

---

### R2 — Run Continues After Repair Escalation
**Severity:** HIGH  
**Status:** VERIFIED  
**Evidence:** `backend/src/routes/runs.ts` lines 517–548

When repair stops (any `escalateAfter` reason), the run logs a `agent_blocked` warn event and then **falls through to the next phase**. A run can have phases with 50 tsc errors and still reach `status: 'completed'` via `decideTerminalStatus` if at least one file was produced.

**Consequence:** Runs "complete" with broken generated code. The `decideTerminalStatus` lenient policy (insufficient_evidence → completed) compounds this.

**Fix:** Make escalation halt the run OR add a hard threshold (`totalErrors > N → failed`).

---

### R3 — Repair Loop Has No Planner Re-Entry
**Severity:** HIGH  
**Status:** VERIFIED  
**Evidence:** `backend/src/routes/runs.ts` lines 474–499

The repair loop calls `selectAgentForTask(repairTask, agents)` → `TaskExecutor.executeTask(repairTask, repairDescription)`. No `RoadmapPlanner` or `ArchitectureDesigner` agent is invoked. Repair is always code-level file patching. Architectural failures (wrong interfaces, missing dependencies between files) cannot be fixed by this loop.

**Consequence:** Repair exhausts its 3 generations on un-fixable problems and escalates. Documented as the primary cause of all 4 bake-off arm failures.

**Fix:** Phase 36 (signature-aware planner-first repair) — invoke RoadmapPlanner when `failureClass` is architectural.

---

## High Risks

### R4 — Model Selection Not Implemented
**Severity:** HIGH  
**Status:** VERIFIED  
**Evidence:** `backend/src/services/task-executor.ts:299`; `agents/engineer.yaml` routing_hints

All 27 agents list `preferred_models: [gpt-5.5, gpt-5.4, ...]` in their YAML `routing_hints`. These are non-existent model names (GPT-5.x is not an Anthropic model). `LLMClient` uses the Anthropic API with a single model, ignoring all routing hints.

**Consequence:** Every task — whether Researcher or Security Analyst — uses the same model at the same cost. No cheap/fast routing for simple tasks.

**Fix:** Wire `agent.routing_hints.preferred_models` to Anthropic model IDs; add model-selector logic in `TaskExecutor`.

---

### R5 — Overwrite Without Merge in ProjectWriter
**Severity:** HIGH  
**Status:** VERIFIED  
**Evidence:** `backend/src/services/project-writer.ts:30`

`fs.writeFile(absPath, content)` — always overwrites. If a repair agent returns only a corrected function without the rest of the file, the full file is replaced with just that function.

**Consequence:** Repair operations can reduce a 200-line file to a 20-line fragment, introducing new errors.

**Fix:** Implement diff/merge in `ProjectWriter`; for repair tasks, require the agent to return the full file.

---

### R6 — TaskAcceptanceService Does Not Cover All Task Types
**Severity:** HIGH  
**Status:** VERIFIED  
**Evidence:** `backend/src/services/task-acceptance.ts:59` (`artifactExemptKinds`)

Tasks classified as `'documentation'`, `'analysis'`, `'planning'`, `'review'`, `'research'` are exempt from the `## File:` artifact requirement. An agent that responds with prose for a research task passes acceptance even if it produces no deliverable.

**Consequence:** Non-implementation phases can complete with zero artifacts without triggering repair.

---

### R7 — No Parallelism in Phase or Task Execution
**Severity:** MEDIUM  
**Status:** VERIFIED  
**Evidence:** `backend/src/routes/runs.ts:278` (phase for-loop), `backend/src/services/phase-executor.ts:59` (task for-loop)

All phases and all tasks within phases execute sequentially (`for...of` loops, `await` at each step). A 10-task phase makes 10 serial LLM calls.

**Consequence:** Slow runs; independent tasks cannot execute in parallel. Documented as Phase 40+ enhancement.

---

## Medium Risks

### R8 — No Pause/Resume Checkpoint at Task Level
**Severity:** MEDIUM  
**Status:** PARTIALLY VERIFIED  
**Evidence:** `backend/src/routes/runs.ts:280` (checks `currentRun.status !== 'running'` between phases)

Pause is checked between phases, not between tasks. A paused signal mid-phase is not honored until the current phase completes.

**Consequence:** A 20-task phase that is paused will still run all remaining tasks before stopping.

---

### R9 — Supervisor Escalation Target Is a No-Op
**Severity:** MEDIUM  
**Status:** VERIFIED  
**Evidence:** `backend/src/services/repair-policy.ts:30`; `backend/src/routes/runs.ts:531–542`

The repair policy names `escalationTarget: 'Supervisor'` and the event emits `needed_from: 'Supervisor'`. But no code invokes the Supervisor agent as an LLM call. The escalation is purely an event log entry.

**Consequence:** The escalation mechanism is advisory-only. The Supervisor agent, though defined in `agents/supervisor.yaml` with a detailed prompt, is never called.

---

### R10 — 300-File Cap on collectProducedFiles
**Severity:** MEDIUM  
**Status:** VERIFIED  
**Evidence:** `backend/src/services/project-writer.ts` `collectProducedFiles` function

Runs producing more than 300 files will have truncated manifests. Monorepos or large applications would hit this.

---

### R11 — Contract Drift Can Pass Silently
**Severity:** MEDIUM  
**Status:** VERIFIED  
**Evidence:** `backend/src/services/contract-spine.ts:98`; `backend/src/routes/runs.ts:567`

`checkCoherence` detects duplicate type definitions (drift) but **only triggers the optional drift-repair loop if the build is already green**. If tsc is already failing due to drift, the drift-repair loop does not run. The run may fail for drift-related reasons without triggering drift repair.

---

## Low Risks

### R12 — Event Log Failure Is Silent
**Severity:** LOW  
**Status:** VERIFIED  
**Evidence:** `backend/src/services/run-event-log.ts:69`

`fs.appendFile` failures are caught and swallowed with `console.warn`. Event log is not durable under disk-full or file-lock conditions.

---

### R13 — Prompt Variable Substitution Silently Degrades
**Severity:** LOW  
**Status:** VERIFIED  
**Evidence:** `backend/src/services/task-executor.ts` `substituteVariables` function

Unresolved `{{key}}` variables become `[UNKNOWN: key]` in the final prompt. The task still executes with the degraded prompt. No error or warning is emitted to the event log.

---

### R14 — Agent Checksum Not Verified at Load Time
**Severity:** LOW  
**Status:** PARTIALLY VERIFIED  
**Evidence:** Agent YAML files contain `checksum` field (SHA256 of prompt content)

The `AgentRegistry` loads YAML files and creates `AgentDefinition` records. No code was found that verifies the checksum against the actual prompt content after loading. Checksum fields may be stale after prompt edits.

---

## Risk Summary Matrix

| Risk | Severity | Verified? | Fix Complexity |
|---|---|---|---|
| R1 — Contract roster not enforced | CRITICAL | VERIFIED | Low — filter agents list |
| R2 — Run continues after escalation | HIGH | VERIFIED | Medium — halt or threshold |
| R3 — No planner re-entry in repair | HIGH | VERIFIED | High — Phase 36 |
| R4 — Model selection not implemented | HIGH | VERIFIED | Medium — routing logic |
| R5 — Overwrite without merge | HIGH | VERIFIED | Medium — diff/merge writer |
| R6 — Acceptance gap for non-impl tasks | HIGH | VERIFIED | Low — artifact tracking |
| R7 — No parallelism | MEDIUM | VERIFIED | High — Phase 40 |
| R8 — Pause not mid-phase | MEDIUM | PARTIALLY VERIFIED | Medium |
| R9 — Supervisor escalation is no-op | MEDIUM | VERIFIED | Medium — wire LLM call |
| R10 — 300-file cap | MEDIUM | VERIFIED | Low — increase/remove cap |
| R11 — Drift repair conditional on green build | MEDIUM | VERIFIED | Medium |
| R12 — Event log silent failure | LOW | VERIFIED | Low |
| R13 — Variable substitution silent degradation | LOW | VERIFIED | Low |
| R14 — Agent checksum not verified | LOW | PARTIALLY VERIFIED | Low |
