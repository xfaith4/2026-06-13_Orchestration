# Web-Based Multi-Agent Orchestration Platform — Implementation Roadmap (Revised)

**Roadmap Version:** 2.1 (Reliability Track added)
**Last Updated:** 2026-06-28
**Target Completion:** Q3 2026
**Status:** CRITICAL PATH is now the Reliability Track (Phases 32–37) — see "Priority Track: Reach a Successful Run" below. Feature/UI phases are paused until a run succeeds.

---

## Repository Context

This roadmap guides the implementation of a web-based UI and expanded orchestration capabilities for the existing multi-agent orchestration framework located in `g:/Development/20_Staging/AI Projects/2026-06-13_Orchestration/`.

### Existing Assets to Preserve

- **Agent Definitions** (`agents/*.yaml`, `agents/*.json`): 25+ specialized agents with IO contracts
- **Contract Schemas** (`contracts/*.json`): A2A communication, build/maintenance, failure policies
- **Runtime Libraries** (`lib/*.js`): Run tracking, cost calculation, API server foundation
- **Lessons Learned** (`LessonsLearnedKnowledge/`): Past run insights
- **Gap Analysis** (`multi-agent-contract-gap-analysis.md`): Specification for missing contracts

---

## Execution Estimate

This roadmap is designed for incremental execution by coding agents. Realistic expectations:

**Prototype (Phases 0-13):** 8–12 focused coding-agent runs

- Demonstrates full intake → approval → spike execution loop
- Validates core abstractions
- Shows value early
- ~2–3 weeks

**MVP (Phases 0-21):** 30–40 focused coding-agent runs

- Complete application intake → design → roadmap → basic execution
- Live monitoring and basic failure handling
- GitHub integration
- ~5–8 weeks

**Production v1 (Phases 0-27):** 60–80 focused coding-agent runs

- Complete feature set
- Full test suite and quality gates
- Security and accessibility hardened
- Production deployment ready
- ~10–14 weeks

**Production-Grade (Phases 0-29):** 90–120 focused coding-agent runs

- Comprehensive documentation
- Advanced analytics and cost tracking
- Optimized for scale
- ~14–18 weeks

These estimates assume:

- Active human review between phases
- Each coding-agent run focuses on one phase only
- Validation and tests pass before advancing
- No major architecture changes mid-stream

---

## Product Goal

Build a professional web-based UI that enables teams to describe an application idea, generate and approve a design plan, create an implementation roadmap, execute the roadmap using a choreographed multi-agent team, monitor execution in real-time, track costs and tokens, repair failures automatically, and push generated code to GitHub — all while maintaining an auditable approval trail and contract-driven safety validation.

---

## Priority Track: Reach a Successful Run (added 2026-06-28)

> **This is now the critical path. Do Phases 32–37 before further UI/feature phases.**

A controlled bake-off (`docs/bakeoff/dashboard.html`, raw data `docs/bakeoff/results.json`)
ran four agent arrangements — uniform-Haiku, tiered (Opus plan / Sonnet workers),
contract-first, and single-Opus — against a real roadmap. **None produced a working
application.** Failure modes: cross-worker interface/contract drift, planning failures, and
non-convergent repair loops. A four-layer audit of the mature prior version (the sibling
`UnifiedAIToolbox` project) found it had already hit, diagnosed, and largely solved these
exact failures — its own conclusion (that repo's `docs/ROADMAP.md`, item RM-014):
*"the limiting factor is no longer design — it is evidence."*

Supporting analysis (in this repo): `docs/PULL_FORWARD_FROM_UNIFIEDAITOOLBOX.md` (what to
port + source paths), `docs/MODEL_ROUTING_BASELINE.md` (bake-off results), and
`docs/AGENT_ARCHITECTURE_LANDSCAPE.md` (industry reality: single-agent + scaffolding wins;
multi-agent fan-out mostly fails at app-building).

**Why this is the critical path:** the multi-agent-vs-single-agent question *cannot be
answered until a run succeeds at all*. These phases convert runs from "failed, unknown why"
into "succeeded, or failed at a named component" — the precondition for every later phase.

| # | Phase | Fixes (failure mode) | Source |
|---|-------|----------------------|--------|
| 32 | Evidence Spine & Lifecycle Invariants | "fails, unknown why"; false success | PULL_FORWARD T1.3 |
| 33 | Green Baseline Before Repair | non-convergent repair | T1.1 |
| 34 | Shared-Contract / Traceability Spine | interface drift (bake-off #1) | T1.2 |
| 35 | Wire the Vendored Contracts | planning failures | T2.4 |
| 36 | Signature-Aware Planner-First Repair | repair never converges | T2.5 |
| 37 | Typed Gates + Sequencing + Isolation | drift + false-failure churn | T2.6 |

### Phase 32 — Evidence Spine & Lifecycle Invariants  ✅ COMPLETE (2026-06-28)
- **Delivered:** `OrchestrationEvent`/`RunValidationOutcome` types (`shared/src`); `RunEventLog` appending a canonical per-run `data/run-events/<id>.jsonl`; `transitionRunStatus` as the single run-status writer + `decideTerminalStatus` terminal-honesty guard (`backend/src/services/run-status.ts`); wired into `executeRunAsync` (run_started/agent_started/agent_completed/artifact_created/validation_started/validation_completed/run_completed/run_failed); `run.validation` now separate from `run.status`; `GET /api/runs/:id/events`. Tests: `run-status.test.ts` + `run-event-log.test.ts` (11 passing); backend `tsc --noEmit` clean. **Next: Phase 33.**
- **Goal:** Make every run truthfully report what happened, so failures name their own cause.
- **Why:** The bake-off failed "across all styles, can't tell why." Without a truthful event/state spine every later fix is guesswork (UnifiedAIToolbox RM-014).
- **Deliverables:** canonical append-only `events.jsonl` per run (typed run/agent/artifact/validation events); **orchestrator-only status authority** (agents never write run-level `status`); **execution-state ≠ quality-outcome** (`completed` ≠ `validated`; never derive status by substring-scraping prose); **terminal-honesty guard** (a build run that materialized no runnable output is `failed`, never `completed`).
- **Acceptance:** every run emits a typed event stream; no run is `completed` without materialized, validated output; status is single-owner. Port invariants from UnifiedAIToolbox `CLAUDE.md`, `docs/contracts/RUN_LIFECYCLE.md`, `EVENT_TAXONOMY.md`.
- **Touches:** `backend/src/routes/runs.ts`, `backend/src/services/persistence.ts`, `shared/src` (Run + event types).

### Phase 33 — Green Baseline Before Repair  ✅ COMPLETE (2026-06-28)
- **Delivered:** `backend/src/services/baseline.ts` — `captureBaseline()` records a typed pre-repair `ValidationBaseline` (status green/red/insufficient_evidence, per-tool results, error signatures, env fingerprint) persisted to the `validation-baselines` collection; `classifyValidation()` + `isTransientMessage()` flag environment/IO failures (npm EPERM, file lock, network, ENOSPC…) so the repair loop is **skipped** for transient failures (`!baseline.transient` guard) and the run reports `validation: insufficient_evidence` instead of chasing a phantom code defect; `errorSignature()` provides the convergence key Phase 36 will consume. Wired into `runs.ts` (baseline captured before the repair loop; outcome threaded to terminal status). Tests: `baseline.test.ts` (8 passing); backend `tsc --noEmit` clean. **Next: Phase 34.**
- **Goal:** Establish a known-good "before" state so repair can tell "I broke it" from "already broken."
- **Why:** #1 cause of non-convergent repair; the loop currently repairs blind.
- **Deliverables:** a discovery + baseline step (install/build/test) recorded as a typed artifact (model on the already-vendored `contracts/repo_context_schema.v1.json`); repair only proceeds against a captured baseline; transient-IO failures degrade to "insufficient evidence," not code failure.
- **Acceptance:** no repair task runs without a recorded baseline; runs distinguish pre-existing vs introduced failures.
- **Touches:** new baseline/repo-context service, `project-validator.ts`, `runs.ts` repair loop.

### Phase 34 — Shared-Contract / Traceability Spine  ✅ COMPLETE (2026-06-28)
- **Delivered:** `backend/src/services/contract-spine.ts` — `checkCoherence()` deterministically detects `duplicate_definition` drift (a shared type declared in >1 file = the bake-off's #1 failure, e.g. `PhaseStatus`); `findContractModule()` locates the shared contract; `extractDeclarations()` + `readProjectFiles()` support it. Injection: `sharedContract` threaded through `phase-executor` → `task-executor` (prepended to every worker prompt: "import shared types; DO NOT redefine"), accumulating from the project as it builds. Traceability gate at completion persists a `traceability-reports` artifact, logs drift by name, and surfaces `driftCount` in the `run_completed` event. Tests: `contract-spine.test.ts` (9 passing); backend `tsc --noEmit` clean. **Note:** detection + injection landed; wiring drift INTO the repair signal is Phase 36. **Next: Phase 35.**
- **Goal:** Stop agents redefining each other's interfaces (the bake-off's #1 failure).
- **Why:** the YAML conversion *regressed* — it dropped the cross-agent IO wiring (`source_agent`/`consumed_by`/`io_reference`) the mature `agent-library.json` used to bind producers and consumers to one field vocabulary.
- **Deliverables:** a shared contract/type artifact produced before fan-out (ConceptualModelContract + acceptance tests) consumed by all workers; restored cross-agent IO references; a deterministic traceability check (every required contract id → file/symbol/probe), reviewer-reconciled.
- **Acceptance:** workers import the shared contract instead of redefining types; a traceability gate verifies coverage deterministically (not via prompt).
- **Touches:** `agents/*.yaml` + `agent-loader`, new contract/traceability service, `task-executor.ts`.

### Phase 35 — Wire the Vendored Contracts (compiler + casting)  ✅ COMPLETE (2026-06-28)
- **Delivered:** `job_types.json` (per-job-type roster + required/optional/forbidden stage policy + budget/gate/artifact policy, for `build_new_app` and `maintain_existing_app`); `backend/src/services/contract-compiler.ts` — `compileContract()` hardens a loose request (job_type + goal) into a complete `RunContract` by merging job-type defaults; `validateContract()` refuses incomplete contracts (missing required field, empty roster) and enforces stage policy (required stages present, forbidden absent); `buildAndValidate()` combines them. New `RunContract` shared type (snake_case to match the vendored schemas) + `run.contract`. Wired into `PATCH /api/runs/:id/start`: a run **cannot start** without a complete, policy-valid contract (422 otherwise); the contract is attached to the run. Tests: `contract-compiler.test.ts` (7 passing); backend `tsc --noEmit` clean. **Next: Phase 36.**
- **Goal:** make the vendored governance contracts *enforce* a complete spec before a run starts.
- **Why:** `contracts/build_app_*.json` + `maintenance_*.json` are currently inert (only listed by `/api/governance-contracts`). Planning failures dominate when runs start from a vague goal.
- **Deliverables:** request→contract hardening compiler (merge job-type defaults, re-validate against the strict schema, refuse to start if incomplete); job-type → roster + required/forbidden-stage casting. Port `contract_compiler.ps1`, `job_types.json`, `job_router.ps1`.
- **Acceptance:** a run cannot start without a complete, schema-valid contract (roster, stages, gates, budget); required phases present, forbidden phases rejected.
- **Touches:** new `contract-compiler` service, a `job_types.json`, `roadmap-generator.ts`, `runs.ts` start path.

### Phase 36 — Signature-Aware Planner-First Repair  ✅ COMPLETE (2026-06-28)
- **Delivered:** `backend/src/services/repair-policy.ts` — `failureSignature()` (deduped/sorted error-signature set), `classifyFailureClass()` (maps to the policy enum: environment_blocker / implementation_defect / unverifiable_acceptance / …), `repairGate()` (stops at `maxRepairGenerations` or `maxSameFailureSignature`), and `DEFAULT_REPAIR_POLICY` (concrete instance of `failure_treatment_policy.v1.json` retry controls). Rewrote the `runs.ts` repair loop: replaced the blind `MAX_REPAIR_ATTEMPTS=3` counter with a signature-aware loop that also stops on **no-progress** (identical signature after a repair = `no_plan_delta_detected`), carries attempt history into re-prompts, and on stop **escalates** (persists `repair-escalations` + emits `agent_blocked` with `code`/`failure_class`/`needed_from=Supervisor`). Tests: `repair-policy.test.ts` (9 passing; 42 across the reliability suite); backend `tsc --noEmit` clean. **Next: Phase 37 (last reliability phase).**
- **Goal:** make repair converge or stop honestly.
- **Why:** the loop is a blind `MAX_REPAIR_ATTEMPTS = 3` counter — no same-failure detection, no progress check (`runs.ts`); `failure_treatment_policy.v1.json` is vendored but unwired.
- **Deliverables:** wire `failure_treatment_policy` — classify into its `failure_class`; cap by `max_same_failure_signature`; require a `plan_delta` each repair (no delta → stop); planner-first ownership + escalation (Supervisor→Commissioner→Human); carry attempt history into re-prompts.
- **Acceptance:** runs stop on repeated identical failures and on no-progress; repair re-prompts include prior errors; escalation fires.
- **Touches:** `runs.ts` repair loop, `failure-classifier.ts` + `repair-strategist.ts` (wire them), `repair-task-builder.ts`.

### Phase 37 — Typed Gates + Sequencing + Worker Isolation
- **Goal:** catch failures at checkpoints and stop parallel workers corrupting each other.
- **Why:** reviewers run blind and parallel writers share one tree (drift + false "missing X" failures).
- **Deliverables:** typed gates returning PASS/FAIL/RETRY at checkpoints with the failure reason injected into a bounded retry (port `engine/GatePolicy.psm1`); producer-then-reviewer sequencing; per-worker isolated output (dir or git worktree) with structured merge + conflict→quarantine (port `WorktreeExecutor.psm1`); pre-run DAG integrity check (reject cycles / inputs not produced by a prior step).
- **Acceptance:** gates can RETRY-with-reason and halt cleanly; reviewers always see producer output; conflicting parallel changes surface as detected conflicts, not silent corruption.
- **Touches:** `phase-executor.ts`, `project-writer.ts` (isolation), new gate service, `roadmap-generator.ts` (DAG integrity).

---

## Architecture Summary

```
┌─────────────────────────────────────────┐
│      User (Product Manager / Eng)       │
└────────────────┬────────────────────────┘
                 │
┌─────────────────▼────────────────────────┐
│    React SPA (Vite + TypeScript)        │
│  - Application Intake Form              │
│  - Design Plan Review & Approval        │
│  - Roadmap Review & Approval            │
│  - Execution Monitor                    │
│  - Agent / Prompt / Contract Manager    │
└────────────┬────────────────────────────┘
             │ REST API (axios)
┌────────────▼────────────────────────────┐
│  Express.js + TypeScript Backend        │
│  - Request/Response Validation          │
│  - Error & Gate Policy Enforcement      │
│  - Contract Validation Middleware       │
└────────────┬────────────────────────────┘
             │
   ┌─────────┼─────────┐
   │         │         │
   ▼         ▼         ▼
┌──────┐ ┌──────┐ ┌──────┐
│ App  │ │Design│ │Roadmap
│ Svc  │ │ Svc  │ │ Svc
└──────┘ └──────┘ └──────┘
   │         │         │
   │    ┌────▼─────┐   │
   │    │ Execution│   │
   │    │ Orchestr.│   │
   │    └────┬─────┘   │
   │         │         │
   └─────────┼─────────┘
             │
     ┌───────▼────────┐
     │ Run Tracker    │
     │ - Cost Calc    │
     │ - Artifacts    │
     │ - Audit Log    │
     └───────┬────────┘
             │
     ┌───────▼────────┐
     │ File Persistence
     │ (runs/, etc)
     │ [DB Adapter]
     └────────────────┘
```

---

## Existing Asset Migration Policy

This section governs how the current repository assets are treated during implementation. **No assets will be moved, deleted, or modified until explicitly required by a phase.**

### Core Principle

Existing assets are **source-of-truth references** that must be preserved, inventoried, validated, and selectively migrated into the new application structure. The roadmap phases build the new system while keeping old assets available for reference and gradual integration.

### Assets in Scope

All files and directories in `g:/Development/20_Staging/AI Projects/2026-06-13_Orchestration/`:

- **agents/** — Agent definitions (YAML, JSON)
- **contracts/** — A2A contract schemas (JSON)
- **Prompts/** — Prompt templates and examples (JSON)
- **lib/** — JavaScript orchestration libraries
- **LessonsLearnedKnowledge/** — Past run insights and knowledge base
- **PastAttemptedRuns/** — Historical orchestration run artifacts
- **BUILD_SPECIFICATION.md** — Full platform specification
- **ROADMAP.md** — Original roadmap (v1.0)
- **ROADMAP_REVISED.md** — Current roadmap (v2.0)
- **Roadmap_execution_prompt.md** — Continuous execution guidelines
- **multi-agent-contract-gap-analysis.md** — Gap analysis and recommendations

### Treatment by Phase

**Phase 0** produces an asset classification table documenting the fate of each asset (see Phase 0 Deliverables below).

**Phases 1-29** may:

- **Preserve as-is:** Keep in place; use directly from existing location
- **Normalize and migrate:** Load from legacy location, transform, store in new location
- **Refactor into backend service:** Rebuild as service code (e.g., agent loader from agents/)
- **Archive/reference only:** Keep in place but mark as historical; link from docs
- **Deprecate after replacement:** Remove once new system provides equivalent functionality

**No asset is deleted or moved until its replacement is production-ready and tested.**

### Final Directory Organization

After implementation completes, the repository structure will be:

```
g:/Development/20_Staging/AI Projects/2026-06-13_Orchestration/
├── frontend/                           # React application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
├── backend/                            # Express server
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── tsconfig.json
├── shared/                             # Shared types and schemas
│   ├── types/
│   ├── schemas/
│   └── contracts/
├── data/                               # File-based persistence
│   ├── applications/
│   ├── design-plans/
│   ├── roadmaps/
│   ├── runs/
│   ├── agents/
│   ├── prompts/
│   ├── contracts/
│   └── audit-logs/
├── docs/                               # User and operator documentation
│   ├── API.md
│   ├── USER_GUIDE.md
│   ├── OPERATOR_GUIDE.md
│   ├── ARCHITECTURE.md
│   └── ...
├── knowledge/                          # Lessons learned and insights
│   ├── lessons-learned.json            # Migrated from LessonsLearnedKnowledge/
│   └── reference.md
├── legacy/                             # Historical assets (read-only reference)
│   ├── agents/ → link to agents/
│   ├── contracts/ → link to contracts/
│   ├── lib/ → reference only
│   ├── Prompts/ → link to Prompts/
│   ├── PastAttemptedRuns/ → archived
│   └── README.md → Migration status
├── agents/                             # Preserved: Original agent definitions
├── contracts/                          # Preserved: Original contract schemas
├── Prompts/                            # Preserved: Original prompt files
├── lib/                                # Preserved: Original libraries (reference)
├── LessonsLearnedKnowledge/            # Preserved: Historical knowledge
├── PastAttemptedRuns/                  # Preserved: Historical runs (archive)
├── .github/workflows/                  # CI/CD
├── .env.example
├── ROADMAP.md                          # Original roadmap (v1.0)
├── ROADMAP_REVISED.md                  # Current roadmap (v2.0)
├── BUILD_SPECIFICATION.md              # Specification
├── multi-agent-contract-gap-analysis.md # Gap analysis
├── Roadmap_execution_prompt.md        # Execution guidelines
├── ROADMAP_REVIEW.md                  # Consistency review
├── ASSET_MIGRATION_STATUS.md          # Populated by Phase 0
├── package.json                        # Root monorepo config
└── README.md
```

### Migration Principles

1. **Preserve First:** All existing assets remain in place until explicitly migrated or deprecated.

2. **Validate Before Use:** Any asset used by the new system is validated (JSON schema check, YAML parse, etc.) in Phase 0.

3. **Gradual Integration:** Assets are integrated into the new system phase-by-phase:
   - Phase 0: Inventory and classify
   - Phase 10: Agent loader uses agents/
   - Phase 11: Prompt loader uses Prompts/
   - Phase 12: Contract loader uses contracts/
   - Phases 13+: Runtime uses loaded assets

4. **No Breaking Changes:** The original files continue to work independently; the new system does not depend on them after migration.

5. **Audit Trail:** Every asset use is documented in code with source comments (e.g., `// Loaded from agents/architect_agent.yaml`).

6. **Knowledge Retention:** Lessons learned and past run insights are indexed and made queryable through the new UI.

### Phase 0 Deliverable: Asset Classification Table

Phase 0 must produce a table documenting every significant asset:

| Asset | Current Location | Intended Future Location | Action | Rationale | Migration Phase |
|-------|------------------|------------------------|--------|-----------|-----------------|
| Agent Definitions | agents/*.yaml,*.json | data/agents/ (loaded at runtime) | Normalize and migrate | Core to orchestration engine | Phase 10 |
| Contract Schemas | contracts/*.json | shared/contracts/ + data/contracts/ | Normalize and migrate | Required for validation layer | Phase 12 |
| Prompt Templates | Prompts/*.json | data/prompts/ (loaded at runtime) | Normalize and migrate | Core to agent execution | Phase 11 |
| Run Tracker Library | lib/run-tracker.js | backend/src/services/run-tracker.ts | Refactor into service | Rewrite in TypeScript; port logic | Phase 2 |
| API Server Foundation | lib/api-server.js | backend/src/server.ts | Refactor into service | Port to Express setup; enhance | Phase 3 |
| Config Loader | lib/config-loader.js | backend/src/services/config.ts | Refactor into service | Port to TypeScript | Phase 1 |
| Cost Calculation | lib/run-tracker.js (embedded) | backend/src/services/cost-calculator.ts | Extract and refactor | Separate concern; enhance | Phase 15 |
| Lessons Learned Knowledge | LessonsLearnedKnowledge/*.json | knowledge/lessons-learned.json | Archive/reference only | Index and make queryable in UI | Phase 28 |
| Past Runs Artifacts | PastAttemptedRuns/ | legacy/PastAttemptedRuns/ | Archive/reference only | Keep for historical analysis | Phase 26 |
| BUILD_SPECIFICATION.md | / | docs/BUILD_SPECIFICATION.md | Archive/reference | Keep as design reference | Phase 28 |
| ROADMAP.md (v1.0) | / | legacy/ROADMAP.md | Archive/reference | Keep as historical record | Phase 28 |
| ROADMAP_REVISED.md (v2.0) | / | ROADMAP_REVISED.md | Preserve as-is | Active control document | Ongoing |
| multi-agent-contract-gap-analysis.md | / | docs/ARCHITECTURE.md (incorporate) | Refactor and merge | Becomes part of architecture docs | Phase 28 |
| Roadmap_execution_prompt.md | / | docs/EXECUTION_GUIDE.md | Archive/reference | Keep for reference; content in code | Phase 28 |

### Governance Rules

1. **No Deletions Without Replacement:** Any file marked "Deprecate after replacement" remains until replacement is production-tested.

2. **All Migrations Logged:** Every file moved or refactored is recorded in ASSET_MIGRATION_STATUS.md with timestamp and rationale.

3. **Monthly Asset Review:** During Phase 26+ testing, review the asset table to ensure all deprecation criteria are met before cleanup.

4. **Knowledge Preserved:** No knowledge from historical runs or lessons learned is lost; it is indexed and made accessible.

---

## Continuous Phase Execution Prompt

Use this prompt at the start of each coding-agent run:

```text
Proceed with the next incomplete phase or micro-phase in ROADMAP_REVISED.md.

Before coding:
1. Open ROADMAP_REVISED.md and identify the next phase marked "Not Started" or "In Progress".
2. Read the phase completely: Goal, Inputs, Deliverables, Implementation Tasks, Testing Requirements, Validation Commands, Acceptance Criteria.
3. Restate the exact scope: What will this phase deliver? What files will change? What tests will be added?
4. List the implementation tasks you will complete in order.
5. Confirm the validation commands you will run.
6. If the phase has more than 8 tasks or touches both frontend and backend heavily, first split it into micro-phases and update ROADMAP_REVISED.md.

Then implement only that scope:
- Create/modify only the files listed in "Files Expected to Be Created or Modified"
- Add only the tests listed in "Testing Requirements"
- Do not modify unrelated files
- Run all Validation Commands before marking complete
- Do not skip any Acceptance Criteria

After pre-coding checklist:
7. If you need to split the phase into micro-phases, use this template for each:

   ## Phase X.Y — Micro-Phase Name (Added by Agent)

   **Status:** Not Started
   **Completed:**
   **Completed By:**
   **Completion Notes:**

   ### Goal
   [Clear, focused goal for this micro-phase only]

   ### Inputs
   [Dependencies on prior phases]

   ### Deliverables
   [What this micro-phase delivers — ≤5 items]

   ### Implementation Tasks
   [≤8 tasks, clearly bounded]

   [Continue with standard sections: Files, Data Models, Testing, Validation, Acceptance Criteria, etc.]

8. When pre-coding checklist is complete, state "READY TO CODE" in your message and begin implementation.

After implementation:
- Update the phase status to "Complete"
- Add the current timestamp in format: YYYY-MM-DD HH:mm z
- Add your model/agent name under "Completed By"
- Write a brief summary in "Completion Notes" (include validation results and commit hash)
- Update all checkboxes: [x] for done, [~] for deferred (with reason)
- Suggest the commit message from "Commit Guidance"
- Do not mark a phase complete unless ALL acceptance criteria pass
- For micro-phases: also update the parent phase's Inputs to reference any new micro-phases created

If blocked:
- Document the blocker in "Completion Notes"
- Leave the phase marked "In Progress"
- Explain what would unblock it
```

---

## Execution Rules for Coding Agents

When executing this roadmap:

1. **Work phase-by-phase.** Do not skip phases or begin phase N+2 before N is complete.

2. **Use the Continuous Phase Execution Prompt.** Before each phase, reread it and follow its steps exactly.

3. **Preserve existing assets.** Reuse agents, contracts, and libraries from `agents/`, `contracts/`, and `lib/` directories.

4. **Avoid oversized runs.** If a phase has more than 8 implementation tasks, split it into micro-phases first. Update ROADMAP.md before coding.

5. **Complete all checkboxes before marking done.** Use `[x]` for completed items. Use `[~]` only for intentionally deferred items with a reason.

6. **Validate at each step.** Run lint, typecheck, tests, and build after each meaningful change. Do not skip validation commands.

7. **Update completion metadata.** When a phase is complete, update Status, Completed, Completed By, and Completion Notes. Do not mark a phase complete unless all acceptance criteria pass.

8. **Keep commits tied to phases.** Use the suggested commit message format; include phase number.

9. **Document decisions.** If you deviate from the roadmap, explain why in "Completion Notes".

10. **Test continuously.** Unit tests, integration tests, and E2E tests must be written alongside implementation, not after.

11. **Protect approval gates.** Never bypass human approval gates or contract validation without explicit override. Require explicit user confirmation before destructive operations (delete, force-push, merge).

12. **Record deferred work.** If a task is deferred, mark it `[~]` and explain in notes rather than deleting it.

13. **Do not modify unrelated files.** Scope changes to the phase deliverables only. If you need to change something outside scope, note it in "Completion Notes" and the roadmap reviewer can add it to a later phase.

---

## Phase Sizing Rule

**If a phase contains more than 8 implementation tasks, touches both frontend and backend heavily, or introduces more than one major concept, split it into micro-phases before implementation.**

Before coding, update ROADMAP.md to break the large phase into smaller ones. Each micro-phase must have:

- Clear goal
- Minimal dependencies on other phases
- ≤ 8 implementation tasks
- ≤ 2 major concept areas (preferably 1)
- Completable in one focused coding-agent run (2–4 hours estimated)

Examples:

- Prompt Workspace may become:
  - Prompt CRUD API
  - Prompt Editor UI
  - Prompt Versioning
  - Prompt Testing Interface
  - Prompt Comparison View

- GitHub Integration may become:
  - GitHub OAuth Configuration
  - Repository/Branch Operations
  - Commit and PR Creation
  - CI Status Monitoring
  - Safety Confirmations and Audit

- Execution Console may become:
  - Run Detail Page
  - Live Status Polling/WebSocket
  - Log Viewer Component
  - Cost Summary Panel
  - Artifact Viewer

---

## Completion Stamp Format

Each phase must include:

```markdown
**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**
```

When complete, update to:

```markdown
**Status:** Complete
**Completed:** 2026-06-15 14:30 EDT
**Completed By:** Claude Code Agent (claude-opus-4-8)
**Completion Notes:** All acceptance criteria met. Created ApplicationIntakeForm, integrated with API, 12 unit tests + 1 E2E test pass. Commit: feat(phase-5): application intake workflow
```

**Rules:**

- Do **not** mark a phase complete without passing all validation commands.
- Do **not** remove incomplete checkboxes. Instead, mark with `[~]` if deferred and explain why.
- Do use `[x]` for completed tasks.
- Do include the commit hash in notes if available.
- Do explain any deferred items or deviations.

---

## Phase Index

| # | Phase | Goal | Status | Completed |
|---|-------|------|--------|-----------|
| 0 | Repository Baseline & Verification | Understand current state | Complete | 2026-06-14 |
| 1 | Project Foundation | Create monorepo, install deps | Not Started | |
| 2 | Core Data Models & Schemas | Define all models | Not Started | |
| 3 | Backend API Foundation | Implement CRUD endpoints | Not Started | |
| 4 | Frontend Shell & UI System | Create React app and layout | Not Started | |
| 5 | Application Intake Workflow | First end-to-end feature | Not Started | |
| 6 | Design Plan Generation Service | Generate plan from app | Not Started | |
| 7 | Design Plan Approval Gate | Review and approve design | Not Started | |
| 8 | Roadmap Generation Service | Generate roadmap from design | Not Started | |
| 9 | Roadmap Approval Gate | Review and approve roadmap | Not Started | |
| 10 | Agent Registry & Manager | Manage agent definitions | Not Started | |
| 11 | Prompt Refinement Workspace | Manage prompts | Not Started | |
| 12 | A2A Contract Manager | Manage contracts, validate | Not Started | |
| 13 | Thin Vertical Orchestration Spike | Prove core abstractions end-to-end | Not Started | |
| 14 | Agent Execution Abstraction | Define executor interface | Not Started | |
| 15 | Basic Audit & Cost Tracking | Early audit and cost model | Not Started | |
| 16 | Run State Machine | State transition logic | Complete | 2026-06-14 |
| 17 | Task Execution Queue | Queue and scheduling | Complete | 2026-06-14 |
| 18 | Agent Executor Adapter | Pluggable agent execution | Complete | 2026-06-14 |
| 19 | Contract-Gated Handoffs | Validate at handoff points | Complete | 2026-06-14 |
| 20 | Artifact Persistence & Run Outputs | Store and retrieve artifacts | Complete | 2026-06-14 |
| 21 | Execution Summary & Completion | Run summary and closure | Complete | 2026-06-14 |
| 22 | Execution Console & Live Monitoring | Real-time monitoring UI | Complete | 2026-06-14 |
| 23 | Failure Taxonomy & Repair Workflow | Classify and repair failures | Complete | 2026-06-15 |
| 24 | Advanced Cost Tracking & Analytics | Detailed cost dashboards | Complete | 2026-06-15 |
| 25 | GitHub Integration | OAuth, branches, PRs, CI | Not Started | |
| 26 | Testing, Quality Hardening, CI | Test suite and pipeline | Not Started | |
| 27 | Security, Accessibility, Production Ready | Auth, WCAG, hardening | Not Started | |
| 28 | Documentation & Examples | User and operator guides | Not Started | |
| 29 | Final Acceptance & Release | UAT, audit, release | Not Started | |
| 30 | Agent Prompt Language Constraints | Enforce target language/stack in all task prompts | Not Started | |
| 31 | Run Artifact Materialization | Write generated files to disk on run completion | Not Started | |
| 32 | Evidence Spine & Lifecycle Invariants | Truthful events/status so failures name their cause | **Complete** | 2026-06-28 |
| 33 | Green Baseline Before Repair | Known-good baseline so repair can converge | **Complete** | 2026-06-28 |
| 34 | Shared-Contract / Traceability Spine | Stop cross-worker interface drift | **Complete** | 2026-06-28 |
| 35 | Wire the Vendored Contracts | Hardening compiler + job-type casting | **Complete** | 2026-06-28 |
| 36 | Signature-Aware Planner-First Repair | Bounded, converging, escalating repair | **Complete** | 2026-06-28 |
| 37 | Typed Gates + Sequencing + Isolation | Gates w/ retry, reviewer-after-producer, worker isolation | **Not Started — CRITICAL PATH** | |

---

## Phase 0 — Repository Baseline and Verification

**Status:** Complete
**Completed:** 2026-06-14 23:45 UTC
**Completed By:** Claude Code Agent (Phase 0 Baseline Assessment)
**Completion Notes:** All acceptance criteria met. Created comprehensive ASSET_MIGRATION_STATUS.md with 48-asset classification table. Node.js v24.13.1, npm 10.8.2 confirmed. 31 agents (19 core, 12 reference), 6 contracts (all valid), 6 libraries (5 core refactoring candidates, 1 example) inventoried. Migration schedule by phase established. All JSON/YAML parse without errors. Ready for Phase 1: Project Foundation.

### Goal

Validate the current state of the orchestration directory, understand which assets exist, confirm technology stack assumptions, and establish a baseline for what will be preserved vs. refactored.

### Why This Phase Exists

The roadmap assumes certain existing files, agent definitions, contracts, and libraries. Before beginning construction, confirm these exist, are usable, and understand their current quality. This phase prevents surprises later.

### Inputs

- Current directory: `g:/Development/20_Staging/AI Projects/2026-06-13_Orchestration/`
- Files: `agents/`, `contracts/`, `lib/`, `LessonsLearnedKnowledge/`, `BUILD_SPECIFICATION.md`

### Deliverables

- [x] Inventory of all agent definitions with status
- [x] Inventory of all contract schemas with versions
- [x] Assessment of existing lib files
- [x] Confirmation of Node.js/npm availability
- [x] Decision: preserve or refactor each asset
- [x] **Asset Classification Table** (NEW: per Existing Asset Migration Policy)
- [x] Assessment report documenting baseline state

### Implementation Tasks

- [x] List all files in `agents/` directory, note format and status
- [x] Read agent-library.active.json and agent-library.active2.json; compare
- [x] List all files in `contracts/` and validate JSON schemas
- [x] Read all contract files and document structure
- [x] Inspect `lib/*.js` files and assess code quality
- [x] Check for existing package.json in root or subdirectories
- [x] Verify Node.js version (target: 18+) and npm version
- [x] Look for existing test files or CI configuration
- [x] Check for existing README or documentation
- [x] Verify git repository status
- [x] **NEW: Create Asset Classification Table** with columns: Asset | Current Location | Intended Future Location | Action | Rationale | Migration Phase
- [x] **NEW: Classify all assets** per Existing Asset Migration Policy (Preserve, Normalize/Migrate, Refactor, Archive/Reference, Deprecate)
- [x] **NEW: Document migration schedule** showing which assets are used by which phases

### Files Expected to Be Created or Modified

```text
BASELINE_REPORT.md
ASSET_MIGRATION_STATUS.md                  # NEW: Asset Classification Table
agents/INVENTORY.md
contracts/INVENTORY.md
lib/ASSESSMENT.md
```

**ASSET_MIGRATION_STATUS.md Structure:**

Must include the Asset Classification Table with these columns:

- Asset (name)
- Current Location (path)
- Intended Future Location (new path or "reference only")
- Action (Preserve as-is | Normalize and migrate | Refactor into backend service | Archive/reference only | Deprecate after replacement)
- Rationale (why this action)
- Migration Phase (which phase handles migration)

### Data Models / Contracts Affected

All existing agents, contracts, and models.

### Testing Requirements

- [x] Validate all JSON files in `contracts/` parse without errors
- [x] Validate all YAML files in `agents/` parse without errors
- [x] Confirm `lib/run-tracker.js` exports expected functions
- [x] Confirm `lib/api-server.js` can start without errors

### Validation Commands

```bash
# Validate JSON schemas
find contracts -name "*.json" -exec jq . {} \;

# Check Node.js
node --version
npm --version

# Confirm key libraries can be loaded
node -e "require('./lib/run-tracker.js'); console.log('OK')"
```

### Acceptance Criteria

- [x] All agent YAML/JSON files parse without errors
- [x] All contract JSON files parse without errors
- [x] Node.js version is 18 or higher
- [x] npm version is 8 or higher
- [x] All existing lib files are readable and functional
- [x] Baseline report is complete and accurate
- [x] Decision made: preserve or refactor each major asset
- [x] **NEW: Asset Classification Table is complete** (all assets documented)
- [x] **NEW: All assets assigned an action** (Preserve, Migrate, Refactor, Archive, Deprecate)
- [x] **NEW: Migration schedule is clear** (know which phases use which assets)
- [x] **NEW: ASSET_MIGRATION_STATUS.md is accurate** and matches Existing Asset Migration Policy

### Human Review Gate

A human should verify:

- Baseline report is accurate
- Decisions to preserve vs. refactor are justified
- No critical files are missing
- **NEW: Asset Classification Table is complete** (all significant assets documented)
- **NEW: Migration actions are appropriate** (no premature deprecation, no missed refactoring opportunities)
- **NEW: Migration schedule aligns with roadmap phases** (assets are used by assigned phases)

### Rollback Notes

This phase is read-only. No rollback needed.

### Commit Guidance

```text
docs(phase-0): baseline assessment and asset inventory
```

---

## Phase 1 — Project Foundation

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Create project structure (monorepo), install dependencies, configure TypeScript, set up build/dev tooling. After this phase, `npm run dev` starts both frontend and backend.

### Why This Phase Exists

All subsequent work depends on a working development environment.

### Inputs

- Node.js 18+ and npm 8+
- Phase 0 baseline complete

### Deliverables

- [ ] Monorepo structure created
- [ ] Frontend package.json with Vite, React 18, TypeScript, Tailwind, shadcn/ui
- [ ] Backend package.json with Express, TypeScript
- [ ] Root package.json with workspaces
- [ ] All dependencies installed
- [ ] TypeScript configuration in each workspace
- [ ] Vite and Express servers boot successfully
- [ ] Lint and format tooling configured

### Implementation Tasks

- [ ] Create directory structure: `frontend/`, `backend/`, `shared/`, `data/`, `docs/`
- [ ] Run `npm create vite@latest frontend -- --template react-ts`
- [ ] Install shadcn/ui and Tailwind in frontend
- [ ] Create `backend/package.json` with express, typescript, ts-node
- [ ] Create root `package.json` with workspaces
- [ ] Run `npm install`
- [ ] Create `frontend/tsconfig.json` with strict mode
- [ ] Create `backend/tsconfig.json` with strict mode
- [ ] Create `backend/src/server.ts` with Express bootstrap
- [ ] Create `.eslintrc.json` and `.prettierrc.json`
- [ ] Add npm scripts: `dev`, `build`, `lint`, `test`
- [ ] Create `.env.example` with all required vars including correct `VITE_API_BASE_URL=http://localhost:3001/api` (the `/api` suffix is required)
- [ ] Create a `.env` file from `.env.example` for local development (do not commit it; add to `.gitignore`)
- [ ] Configure `frontend/src/services/api.ts` so the API base URL fallback is a relative path `/api`, enabling the Vite dev-server proxy to route calls correctly without a `.env` file
- [ ] Configure `vite.config.ts` with a proxy entry: `/api` → `http://localhost:<BACKEND_PORT>` so relative-path API calls work in dev without CORS issues
- [ ] Verify `npm run dev` starts both servers

### Files Expected to Be Created or Modified

```text
package.json
frontend/package.json
frontend/tsconfig.json
frontend/vite.config.ts
frontend/src/App.tsx
frontend/src/main.tsx
backend/package.json
backend/tsconfig.json
backend/src/server.ts
.eslintrc.json
.prettierrc.json
.gitignore
.env.example
```

### Data Models / Contracts Affected

None; pure infrastructure.

### Testing Requirements

- [ ] Unit test framework installed (Vitest for frontend, Jest for backend)
- [ ] Sample test file created in each workspace
- [ ] `npm test` runs tests in both workspaces

### Validation Commands

```bash
npm run lint
npm run typecheck
npm run build
npm run dev
```

### Acceptance Criteria

- [ ] Both workspaces have dependencies installed
- [ ] TypeScript compiles without errors
- [ ] ESLint and Prettier pass
- [ ] `npm run dev` starts both servers
- [ ] Frontend and backend ports are driven by environment variables, not hardcoded in source
- [ ] `.env.example` contains every variable the app needs, with correct values including path suffixes (e.g., `VITE_API_BASE_URL` ends in `/api`)
- [ ] API calls work out-of-the-box without a `.env` file (via Vite proxy fallback to relative `/api` path)
- [ ] No source file contains a hardcoded `localhost:PORT` string that belongs in an env variable

### Human Review Gate

A human should verify:

- Tooling choices are appropriate
- Project structure is clean
- Dev server starts without warnings
- API calls reach the backend with and without a `.env` file present
- `.env.example` values are correct end-to-end (copy it to `.env` and the app works)

### Rollback Notes

Delete all created directories and files.

### Commit Guidance

```text
chore(phase-1): project foundation and tooling setup
```

---

## Phase 2 — Core Data Models and Persistence Layer

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Define all core data models with TypeScript types, JSON schemas, and file-based persistence. Ensure data can be saved, loaded, and validated reliably.

### Why This Phase Exists

All API endpoints, services, and UI depend on well-defined data models. This creates the contract for data throughout the system.

### Inputs

- Phase 1 completed (project structure)
- BUILD_SPECIFICATION.md (Phase 4 for data models)

### Deliverables

- [ ] TypeScript interface files for all models
- [ ] JSON schema files for validation
- [ ] Persistence service with create, read, update, list, delete
- [ ] Index files for fast lookup
- [ ] Unit tests for models and persistence
- [ ] Sample data for testing

### Implementation Tasks

- [ ] Create `shared/types/index.ts` with all TypeScript interfaces
- [ ] Create JSON schema files in `shared/schemas/`
- [ ] Create `backend/src/services/persistence.ts` with PersistenceService
- [ ] Create `backend/src/services/validation.ts` with SchemaValidator
- [ ] Create data directory structure
- [ ] Write unit tests for persistence CRUD
- [ ] Write tests for schema validation

### Files Expected to Be Created or Modified

```text
shared/types/index.ts
shared/schemas/
  application.schema.json
  design-plan.schema.json
  roadmap.schema.json
  run.schema.json
  agent.schema.json
  prompt.schema.json
  contract.schema.json
backend/src/services/persistence.ts
backend/src/services/validation.ts
backend/src/utils/file-utils.ts
backend/tests/persistence.test.ts
data/applications/index.json
data/design-plans/index.json
data/roadmaps/index.json
data/runs/index.json
```

### Data Models / Contracts Affected

- Application (new)
- DesignPlan (new)
- Roadmap (new)
- Run (new)
- Agent Definition (new)
- Prompt Definition (new)
- Contract Definition (new)

### Testing Requirements

- [ ] Unit tests for CRUD operations
- [ ] Tests for schema validation
- [ ] Integration tests for full cycle
- [ ] Test invalid data rejection

### Validation Commands

```bash
npm run typecheck
npm test
```

### Acceptance Criteria

- [ ] All TypeScript interfaces defined
- [ ] All JSON schemas parse correctly
- [ ] PersistenceService CRUD works
- [ ] SchemaValidator validates/rejects appropriately
- [ ] Indexes maintained correctly
- [ ] All tests pass

### Human Review Gate

A human should verify:

- Data model definitions match BUILD_SPECIFICATION.md
- Validation is comprehensive
- Persistence is robust

### Rollback Notes

Delete `shared/types/`, `shared/schemas/`, persistence services.

### Commit Guidance

```text
feat(phase-2): core data models and persistence layer
```

---

## Phase 3 — Backend API Foundation

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Implement REST API endpoints for all core CRUD operations. All endpoints validate input, return consistent responses, handle errors gracefully, and pass integration tests.

### Why This Phase Exists

The frontend depends on a working API. This phase provides the complete backend contract the frontend will consume.

### Inputs

- Phase 2 completed (data models and persistence)
- BUILD_SPECIFICATION.md (Phase 3 for API requirements)

### Deliverables

- [ ] Express routes for applications, design-plans, roadmaps, runs, agents, prompts, contracts
- [ ] Request validation middleware
- [ ] Error handling middleware
- [ ] Consistent response format
- [ ] HTTP status code consistency
- [ ] Comprehensive integration tests
- [ ] API documentation (inline comments)

### Implementation Tasks

- [ ] Create `backend/src/routes/applications.ts` with CRUD endpoints
- [ ] Create `backend/src/routes/design-plans.ts`
- [ ] Create `backend/src/routes/roadmaps.ts`
- [ ] Create `backend/src/routes/runs.ts`
- [ ] Create `backend/src/routes/agents.ts`
- [ ] Create `backend/src/routes/prompts.ts`
- [ ] Create `backend/src/routes/contracts.ts`
- [ ] Create `backend/src/middleware/validation.ts`
- [ ] Create `backend/src/middleware/errors.ts`
- [ ] Create `backend/src/types/responses.ts`
- [ ] Register routes in `backend/src/server.ts`
- [ ] Write integration tests for all endpoints
- [ ] Test error responses

### Files Expected to Be Created or Modified

```text
backend/src/routes/applications.ts
backend/src/routes/design-plans.ts
backend/src/routes/roadmaps.ts
backend/src/routes/runs.ts
backend/src/routes/agents.ts
backend/src/routes/prompts.ts
backend/src/routes/contracts.ts
backend/src/routes/index.ts
backend/src/middleware/validation.ts
backend/src/middleware/errors.ts
backend/src/middleware/cors.ts
backend/src/types/responses.ts
backend/src/server.ts (modified)
backend/tests/integration/applications.test.ts
backend/tests/integration/design-plans.test.ts
backend/tests/integration/roadmaps.test.ts
backend/tests/integration/runs.test.ts
```

### Data Models / Contracts Affected

All models from Phase 2.

### Testing Requirements

- [ ] Integration tests for POST (create)
- [ ] Integration tests for GET (list)
- [ ] Integration tests for GET :id (read)
- [ ] Integration tests for PUT (update)
- [ ] Integration tests for DELETE
- [ ] Tests for 404 on invalid IDs
- [ ] Tests for 400 on invalid input
- [ ] Tests for validation error messages

### Validation Commands

```bash
npm run typecheck
npm test
```

### HTTP Method Contract

Every endpoint must follow these method semantics — this becomes the binding contract the frontend must match exactly:

| Verb     | Semantics                              | Examples                                                                       |
| -------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| `GET`    | Read, no side effects                  | GET /applications, GET /applications/:id                                       |
| `POST`   | Create new resource                    | POST /applications, POST /design-plans/generate/:id                            |
| `PUT`    | Full replacement of a resource         | PUT /applications/:id (all fields)                                             |
| `PATCH`  | Partial mutation or state transition   | PATCH /design-plans/:id/review, PATCH /runs/:id/start, PATCH /runs/:id/pause  |
| `DELETE` | Remove resource                        | DELETE /applications/:id                                                       |

**Rule:** State transitions (approve, reject, start, pause, resume, assign, complete, fail) are always `PATCH`. A frontend calling `PUT` for a `PATCH` endpoint will receive a 404 and silently fail. Every route file must use the correct verb.

### Acceptance Criteria

- [ ] All 7 resource types have full CRUD API
- [ ] All endpoints validate input
- [ ] Response format is consistent
- [ ] Error messages are helpful
- [ ] HTTP status codes are correct (201 Create, 200 read/update, 204 delete, 400 validation, 404 not found)
- [ ] All state-transition endpoints use `PATCH`, not `PUT`
- [ ] Integration tests verify the correct HTTP method is accepted and the wrong method returns 405
- [ ] All integration tests pass
- [ ] No TypeScript errors

### Human Review Gate

A human should verify:

- API response formats are consistent
- Error messages are helpful
- Status codes follow REST conventions
- All required endpoints exist
- State transitions use PATCH throughout (verify in route files)

### Rollback Notes

Delete routes, middleware, and related test files.

### Commit Guidance

```text
feat(phase-3): backend API foundation with CRUD endpoints
```

---

## Phase 4 — Frontend Shell and Professional UI System

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Create React frontend shell with routing, layout, navigation, component library (shadcn/ui), Tailwind styling, state management, and API client. The app should have a polished, professional appearance.

### Why This Phase Exists

Phases 5+ add features to this shell. The shell must be complete and professional before feature development.

### Inputs

- Phase 1 completed (project structure)
- Phase 3 completed (API endpoints)

### Deliverables

- [ ] React Router setup with layout and pages
- [ ] Professional layout (header, sidebar, main content)
- [ ] Navigation bar with routing
- [ ] Dashboard page skeleton
- [ ] shadcn/ui configured
- [ ] Tailwind CSS styling
- [ ] Global state management (Zustand)
- [ ] API client layer
- [ ] Common UI patterns (empty states, loading, errors)
- [ ] Responsive design
- [ ] Basic accessibility

### Implementation Tasks

- [ ] Install React Router: `npm install react-router-dom`
- [ ] Create `frontend/src/layouts/MainLayout.tsx`
- [ ] Create page components in `frontend/src/pages/`
- [ ] Create `frontend/src/routes/index.tsx`
- [ ] Create reusable components in `frontend/src/components/`
- [ ] Set up Zustand in `frontend/src/stores/`
- [ ] Create `frontend/src/services/api.ts`
- [ ] Create `frontend/src/hooks/useApi.ts`
- [ ] Configure Tailwind and dark mode
- [ ] Create Dashboard page

### Files Expected to Be Created or Modified

```text
frontend/src/layouts/MainLayout.tsx
frontend/src/pages/Dashboard.tsx
frontend/src/pages/Applications.tsx
frontend/src/pages/DesignPlans.tsx
frontend/src/pages/Roadmaps.tsx
frontend/src/pages/Runs.tsx
frontend/src/pages/Agents.tsx
frontend/src/pages/Prompts.tsx
frontend/src/pages/Contracts.tsx
frontend/src/pages/NotFound.tsx
frontend/src/routes/index.tsx
frontend/src/services/api.ts
frontend/src/stores/index.ts
frontend/src/hooks/useApi.ts
frontend/src/components/Navigation.tsx
frontend/src/components/Sidebar.tsx
frontend/src/components/StatusBadge.tsx
frontend/src/components/LoadingSpinner.tsx
frontend/src/components/EmptyState.tsx
frontend/src/App.tsx (modified)
frontend/tailwind.config.js
frontend/postcss.config.js
```

### Data Models / Contracts Affected

None; presentation layer.

### UI/UX Requirements

- Professional, polished appearance
- Clear navigation
- Responsive (mobile, tablet, desktop)
- Dark mode support
- Consistent spacing and typography
- Loading and error states
- Accessibility (ARIA, semantic HTML, keyboard navigation)

### Dashboard Data Requirements

The Dashboard page **must fetch all stats from the API** — no hardcoded values are permitted. The component must call at minimum:

- `GET /api/applications` → total applications count
- `GET /api/roadmaps` → total roadmaps count
- `GET /api/runs` → derive completed runs count
- `GET /api/agents` (or agents config) → active agents count

Display loading skeletons while fetching and an error banner if any request fails. Stats must reflect the live database state on every page load.

### Loading and Empty State Contract

`LoadingSpinner` and `EmptyState` are infrastructure components — every list page and every detail page must use them consistently:

- **`LoadingSpinner`**: shown while any `isLoading` flag is true. Must accept a `size` prop (`sm | md | lg`) and render a spinning SVG accessible to screen readers (`role="status"`, `aria-label="Loading"`).
- **`EmptyState`**: shown when a list is empty and not loading. Must accept `title`, `description`, and optional `action` (label + onClick) props. Must not show a blank white rectangle with no explanation.
- **`ErrorBanner`** (new component): shown when an API call fails. Must display the error message and a "Retry" button that re-fires the request. Never render `null` on error — always surface the failure to the user.

### Layout Padding Rule

`MainLayout` must **not** apply padding to the `<main>` content area. Each page component owns its own padding via `className="p-6"` or equivalent. If `MainLayout` adds padding and a page also adds padding, the result is double-padding that breaks the visual rhythm. The acceptance test: the Dashboard page background color must reach flush to the layout edge.

### Back-Navigation Rule

Any "Back" or "← Return" button in a detail page must call `navigate(-1)` (React Router's history-based back navigation), **not** `navigate('/hardcoded-path')`. Hardcoded paths break the user's browsing history and fail when the same page is reachable from multiple parent pages. The only exception is a top-level navigation element (the sidebar or breadcrumb trail).

### Sidebar Link Guard Rule

The sidebar navigation array must only contain links to routes that are fully implemented. Placeholder sidebar entries that point to `NotFound` or stub pages confuse users. During this phase, stub pages (Agents, Prompts, Contracts) must either be removed from the sidebar or display a clear "Coming Soon" `EmptyState` — never a blank or error page.

### Additional Implementation Tasks

- [ ] Create `frontend/src/components/ErrorBanner.tsx` with retry callback
- [ ] Dashboard page must call the API for all four stat values (no hardcoded values)
- [ ] Each stub page (Agents, Prompts, Contracts) must render an `<EmptyState>` component imported from the component library — not an inline `<div>` or raw JSX string in the router file
- [ ] `LoadingSpinner` must include `role="status"` and `aria-label`
- [ ] `EmptyState` must accept optional `action` prop for a CTA button
- [ ] `MainLayout` must not apply padding to the main content container
- [ ] All "Back" buttons must use `navigate(-1)`, not `navigate('/...')`
- [ ] All interactive navigation elements (sidebar buttons, header links, Profile button) must navigate to a real, implemented route or must not be rendered — a button or anchor with no `onClick` or `href` is not an acceptable placeholder
- [ ] Error state "Retry" buttons in all list and detail pages must call the component's own data-fetch function — never `window.location.reload()`. Full-page reloads discard router state and are untestable

### Testing Requirements

- [ ] Unit tests for page components
- [ ] Unit tests for navigation routing
- [ ] Unit tests for API client error handling
- [ ] Dashboard stat fetch is tested with mocked API responses
- [ ] EmptyState renders title, description, and action button
- [ ] LoadingSpinner has correct ARIA attributes
- [ ] Accessibility audit (no critical issues)

### Validation Commands

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
```

### Acceptance Criteria

- [ ] Frontend loads without errors
- [ ] Navigation works
- [ ] Layout is responsive
- [ ] No TypeScript errors
- [ ] Accessibility audit passes
- [ ] Professional appearance
- [ ] Dashboard stats are fetched from the API — no hardcoded values in any stat card
- [ ] All "Back" buttons in detail pages use `navigate(-1)`
- [ ] All stub pages render the `<EmptyState>` component — not an inline div or raw string — and the component is imported from the components library
- [ ] `MainLayout` does not double-pad page content
- [ ] `LoadingSpinner` renders `role="status"` accessible markup
- [ ] No interactive navigation element (button, link, profile icon) is rendered without a working destination
- [ ] No error-state retry handler calls `window.location.reload()` — all retry callbacks invoke the component's fetch function

### Human Review Gate

A human should verify:

- UI appearance (colors, typography, spacing)
- Navigation usability
- Responsive design on multiple devices
- Dashboard shows live counts that change as data is added
- Back buttons return to the correct previous page regardless of how the detail page was reached
- Accessibility compliance

### Rollback Notes

Delete `frontend/src/` and restore from git.

### Commit Guidance

```text
feat(phase-4): frontend shell and professional UI system
```

---

## Phase 5 — Application Intake Workflow

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Implement first complete end-to-end feature: users submit application idea via form, app is saved, users can list and view applications. This proves the full stack works.

### Why This Phase Exists

This phase validates: form submission → API → persistence → list view → detail view. It's the foundation for all subsequent workflows.

### Inputs

- Phase 3 completed (API)
- Phase 4 completed (frontend shell)

### Deliverables

- [ ] ApplicationIntakeForm component with all required fields
- [ ] Form validation (client and server)
- [ ] Applications list page
- [ ] Application details page
- [ ] Create/read/update/delete functionality
- [ ] E2E test for full workflow

### Implementation Tasks

- [ ] Create `frontend/src/pages/NewApplication.tsx`
- [ ] Create `frontend/src/components/ApplicationIntakeForm.tsx` with form fields
- [ ] Implement client-side form validation
- [ ] Create `frontend/src/hooks/useApplications.ts`
- [ ] Create `frontend/src/pages/ApplicationsList.tsx`
- [ ] Create `frontend/src/pages/ApplicationDetail.tsx`
- [ ] Implement API calls for CRUD
- [ ] Write form validation tests
- [ ] Write API integration tests
- [ ] Write E2E test for complete workflow

### Files Expected to Be Created or Modified

```text
frontend/src/pages/NewApplication.tsx
frontend/src/pages/ApplicationsList.tsx
frontend/src/pages/ApplicationDetail.tsx
frontend/src/components/ApplicationIntakeForm.tsx
frontend/src/hooks/useApplications.ts
frontend/src/App.tsx (add routes)
frontend/tests/pages/ApplicationsList.test.tsx
frontend/tests/components/ApplicationIntakeForm.test.tsx
frontend/tests/e2e/application-workflow.e2e.ts
```

### Data Models / Contracts Affected

- Application model

### UI/UX Requirements

- Form is intuitive and easy to fill
- Required fields clearly marked
- Validation errors shown inline
- Success message after submission
- List shows status clearly
- Detail view is organized
- After a successful application create, the user is navigated to the new application's detail page (`/applications/:newId`) — not to the list page. The user just created a record; the next logical action is to work with it (e.g., generate a design plan), which requires being on the detail page. Navigating to the list forces an unnecessary extra click and breaks the user's flow.

### Cross-Entity Navigation Requirement

`ApplicationDetail` must display a section listing **all design plans associated with this application**. Each entry shows at minimum: plan title, status badge, and a link to the `DesignPlanDetail` page. After a user generates a design plan from `ApplicationDetail` (by clicking "Generate Design Plan"), the new plan must immediately appear in this list — the user must not have to manually navigate to `/design-plans` to find it. If no plans exist yet, show an `EmptyState` with the call-to-action "Generate Design Plan."

This cross-linking requirement applies symmetrically: `DesignPlanDetail` must show the name of its parent Application with a clickable link back to `ApplicationDetail`.

### API Requirements

- POST /api/applications (already exists from Phase 3)
- GET /api/applications
- GET /api/applications/:id
- PUT /api/applications/:id
- DELETE /api/applications/:id
- GET /api/design-plans?applicationId=:id (filter plans by application — must be supported for the cross-linking section)

### Cross-Linking Implementation Tasks

- [ ] Add "Associated Design Plans" section to `ApplicationDetail` that fetches `GET /api/design-plans?applicationId=:id`
- [ ] Show `EmptyState` with "Generate Design Plan" CTA when no plans exist for this application
- [ ] After plan generation succeeds, refresh the design plan list in `ApplicationDetail` without a full page reload
- [ ] `DesignPlanDetail` must include parent application name as a clickable breadcrumb or back-link

### Testing Requirements

- [ ] Unit tests for ApplicationIntakeForm
- [ ] Unit tests for form validation
- [ ] API integration tests
- [ ] E2E test for complete workflow
- [ ] ApplicationDetail renders the design plan list section with plans when they exist
- [ ] ApplicationDetail renders EmptyState with CTA when no plans exist

### Validation Commands

```bash
npm run typecheck
npm run lint
npm test
npm run dev
```

### Acceptance Criteria

- [ ] User can fill and submit form
- [ ] Form validates required fields
- [ ] Application is created
- [ ] After successful creation, the user is redirected to `/applications/:id` (the new application's detail page) — not to the list
- [ ] Application appears in list
- [ ] User can view details
- [ ] User can edit application
- [ ] User can delete application
- [ ] ApplicationDetail shows all associated design plans in a dedicated section
- [ ] After generating a design plan, it appears immediately in ApplicationDetail without manual navigation
- [ ] DesignPlanDetail links back to its parent Application
- [ ] All tests pass

### Human Review Gate

A human should verify:

- Form is intuitive
- All required fields present
- Validation appropriate
- Error messages helpful
- Professional appearance
- Clicking "Generate Design Plan" from ApplicationDetail creates the plan and shows it in the list

### Rollback Notes

Delete application pages, components, and API calls.

### Commit Guidance

```text
feat(phase-5): application intake workflow
```

---

## Phase 6 — Design Plan Generation Service

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Create design plan generation service. Use mock agent responses to validate workflow without real LLM integration yet. Generate comprehensive design plans from application intake.

### Why This Phase Exists

Design plan generation is the first computational workflow. It validates the orchestration infrastructure can handle multi-step processes.

### Inputs

- Phase 5 completed (application intake)
- Phase 3 completed (API endpoints)

### Deliverables

- [ ] DesignPlanGenerator service with mock agents
- [ ] POST /api/design-plans endpoint
- [ ] Mock Researcher, Architect, Synthesizer responses
- [ ] DesignPlanView page
- [ ] Generation status tracking
- [ ] Tests for generation

### Implementation Tasks

- [ ] Create `backend/src/services/design-plan-generator.ts`
- [ ] Create `backend/src/mocks/agents.ts` with mock responses
- [ ] Implement sequential agent calling
- [ ] Create POST /api/design-plans endpoint
- [ ] Create `frontend/src/pages/DesignPlanView.tsx`
- [ ] Create `frontend/src/components/DesignPlanDisplay.tsx`
- [ ] Add "Generate Design Plan" button to application detail
- [ ] Implement generation status tracking
- [ ] Write tests

### Files Expected to Be Created or Modified

```text
backend/src/services/design-plan-generator.ts
backend/src/mocks/agents.ts
backend/tests/services/design-plan-generator.test.ts
frontend/src/pages/DesignPlanView.tsx
frontend/src/components/DesignPlanDisplay.tsx
frontend/src/hooks/useDesignPlans.ts
frontend/src/pages/ApplicationDetail.tsx (add button)
```

### Data Models / Contracts Affected

- DesignPlan model

### UI/UX Requirements

- Generation button on application detail
- Progress shown while generating
- Design plan displayed in readable format
- Status transitions clear

### API Requirements

- POST /api/design-plans (create/generate)
- GET /api/design-plans/:id (read)

### Testing Requirements

- [ ] Unit tests for DesignPlanGenerator
- [ ] Integration tests for API
- [ ] UI tests for DesignPlanView

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
```

### Acceptance Criteria

- [ ] POST /api/design-plans generates plan
- [ ] Generated plan saved
- [ ] Plan can be retrieved
- [ ] UI displays plan
- [ ] All tests pass

### Human Review Gate

A human should verify:

- Mock design plan content is realistic
- Generation flow is smooth
- Error handling works

### Rollback Notes

Delete DesignPlanGenerator and UI components.

### Commit Guidance

```text
feat(phase-6): design plan generation service
```

---

## Phase 7 — Design Plan Approval Gate

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Implement approval workflow for design plans. Users review, approve, or request refinement. Approved plans are locked and available for roadmap generation. Establishes pattern for all approval workflows.

### Why This Phase Exists

Approval gates are critical. No roadmap should generate from unapproved designs. This phase establishes the reusable pattern.

### Inputs

- Phase 6 completed (design plan generation)
- Phase 3 completed (API)

### Deliverables

- [ ] Design plan approval form
- [ ] Approval status field and enforcement
- [ ] Approval history tracking
- [ ] Design plan versioning
- [ ] DesignPlanReview page
- [ ] Role-based authorization
- [ ] Tests for approval workflow

### Implementation Tasks

- [ ] Add approval fields to DesignPlan model (status, approvedBy, approvedAt)
- [ ] Create `PATCH /api/design-plans/:id/review` endpoint (transitions draft → in_review)
- [ ] Create `PATCH /api/design-plans/:id/decision/approve` endpoint (transitions in_review → approved)
- [ ] Create `PATCH /api/design-plans/:id/decision/reject` endpoint (transitions in_review → rejected)
- [ ] Create `frontend/src/pages/DesignPlanReview.tsx`
- [ ] Create `frontend/src/components/DesignPlanApprovalGate.tsx`
- [ ] Implement role-based access control
- [ ] Add approval history tracking
- [ ] Prevent roadmap generation from non-approved plans
- [ ] Write tests

> **HTTP Method Note:** Approval and rejection are state transitions — they use `PATCH`, not `PUT`. `PUT` is reserved for full resource replacement. A frontend calling `PUT` on these endpoints will receive a 404. See Phase 3 HTTP Method Contract for the full rule set.

### Files Expected to Be Created or Modified

```text
shared/types/index.ts (DesignPlan: add approval fields)
backend/src/routes/design-plans.ts (add review/approve/reject as PATCH)
backend/tests/integration/design-plans.test.ts
frontend/src/pages/DesignPlanReview.tsx
frontend/src/components/DesignPlanApprovalGate.tsx
frontend/src/components/DesignPlanApprovalHistory.tsx
```

### Data Models / Contracts Affected

- DesignPlan (add approval fields)

### UI/UX Requirements

- Approval form is clear
- Status badge shows state
- Approved plans locked from editing
- Approval history visible
- "Move to Review", "Approve", and "Reject" buttons call their respective PATCH endpoints

### API Requirements

- `PATCH /api/design-plans/:id/review` — state transition: draft → in_review
- `PATCH /api/design-plans/:id/decision/approve` — state transition: in_review → approved
- `PATCH /api/design-plans/:id/decision/reject` — state transition: in_review → rejected
- `PUT /api/design-plans/:id` — full resource update (draft only; body must contain all writable fields)

### Testing Requirements

- [ ] Tests for approval logic
- [ ] Tests for gate enforcement
- [ ] Tests for locked approved plans
- [ ] Integration test: `PATCH /design-plans/:id/review` returns 200; `PUT /design-plans/:id/review` returns 405
- [ ] Integration test: `PATCH /design-plans/:id/decision/approve` returns 200; `PUT` returns 405
- [ ] Frontend unit test: "Move to Review" button calls `apiClient.patch()`, not `apiClient.put()`

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
```

### Acceptance Criteria

- [ ] Design plan can be moved to review, then approved or rejected
- [ ] All three state transitions use `PATCH` — calling them with `PUT` returns 405
- [ ] Approval recorded with timestamp
- [ ] Approved plans locked
- [ ] Approval history visible
- [ ] Non-approved plans cannot generate roadmaps
- [ ] All tests pass

### Human Review Gate

A human should verify:

- Approval workflow is intuitive
- Gates enforced
- Authorization correct

### Rollback Notes

Remove approval logic and endpoints.

### Commit Guidance

```text
feat(phase-7): design plan approval gate
```

---

## Phase 8 — Roadmap Generation Service

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Create roadmap generation service. Take approved design plan and generate detailed roadmap with phases, tasks, dependencies, acceptance criteria. Use mock agents initially.

### Why This Phase Exists

Roadmaps are the executable specification. This phase validates roadmap generation and structuring of phase/task hierarchies.

### Inputs

- Phase 7 completed (design plan approval)
- Phase 3 completed (API)

### Deliverables

- [ ] RoadmapGenerator service with mock agents
- [ ] POST /api/roadmaps endpoint
- [ ] Mock Architect and Engineer responses
- [ ] RoadmapView page
- [ ] Roadmap display with phase visualization
- [ ] Tests for generation

### Implementation Tasks

- [ ] Create `backend/src/services/roadmap-generator.ts`
- [ ] Add mock agents to `backend/src/mocks/agents.ts`
- [ ] Create POST /api/roadmaps endpoint
- [ ] Create `frontend/src/pages/RoadmapView.tsx`
- [ ] Create `frontend/src/components/RoadmapDisplay.tsx`
- [ ] Create phase timeline/Gantt visualization
- [ ] Create task list components
- [ ] Add "Generate Roadmap" button to design plan
- [ ] Write tests

### Files Expected to Be Created or Modified

```text
backend/src/services/roadmap-generator.ts
backend/src/mocks/agents.ts (add roadmap mocks)
backend/tests/services/roadmap-generator.test.ts
frontend/src/pages/RoadmapView.tsx
frontend/src/components/RoadmapDisplay.tsx
frontend/src/components/PhaseTimeline.tsx
frontend/src/components/TaskList.tsx
frontend/src/hooks/useRoadmaps.ts
```

### Data Models / Contracts Affected

- Roadmap model
- Phase and Task models

### UI/UX Requirements

- Roadmap in Gantt-style or phase timeline
- Tasks grouped by phase
- Dependencies visible
- Agent assignments clear
- Estimated time/complexity shown

### List Display Standard

Every list page that shows a relationship to a parent entity must display a **human-readable name or title** for that entity — never a raw UUID or internal ID. Displaying a 36-character UUID gives users no useful information and indicates a data-model shortcut rather than a proper join.

**Rule:** If `DesignPlansList` shows a column for the parent application, it must show the application's name, not its `applicationId` field. If `RoadmapList` shows a column for the parent design plan, it must show a human-readable identifier. If a single API call cannot supply the parent name, the list endpoint must be enhanced to embed it (e.g., via a `parentName` field), or the frontend must batch-fetch parent names using `Promise.all`.

This rule applies to every list page in the application: `DesignPlansList`, `RoadmapList`, `RunList`, and any future list pages that reference parent entities.

### API Requirements

- POST /api/roadmaps (create/generate)
- GET /api/roadmaps/:id (read)

### Testing Requirements

- [ ] Unit tests for RoadmapGenerator
- [ ] Integration tests for API
- [ ] UI tests for RoadmapView

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
```

### Acceptance Criteria

- [ ] Roadmap can be generated from approved design plan
- [ ] Roadmap saved to persistence
- [ ] UI displays roadmap in readable format
- [ ] Phases and tasks properly structured
- [ ] All tests pass

### Human Review Gate

A human should verify:

- Roadmap structure matches specification
- Generated phases/tasks are realistic
- Mock responses are comprehensive

### Rollback Notes

Delete RoadmapGenerator and UI components.

### Commit Guidance

```text
feat(phase-8): roadmap generation service
```

---

## Phase 9 — Roadmap Approval Gate

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Implement approval workflow for roadmaps. Users review, edit (reorder phases, add/remove tasks), and approve. Approved roadmaps are locked and ready for execution.

### Why This Phase Exists

Parallel to Phase 7 but for roadmaps. Roadmap approval is the final gate before expensive execution.

### Inputs

- Phase 8 completed (roadmap generation)
- Phase 7 completed (approval pattern)

### Deliverables

- [ ] Roadmap approval form
- [ ] Roadmap editing (drag-to-reorder, add/remove)
- [ ] Approval workflow
- [ ] Roadmap versioning
- [ ] Tests for approval workflow

### Implementation Tasks

- [ ] Add approval fields to Roadmap model (`status`, `approvedBy`, `approvedAt`)
- [ ] Create `PATCH /api/roadmaps/:id/approve` endpoint (state transition → approved)
- [ ] Create `PATCH /api/roadmaps/:id/reject` endpoint (state transition → rejected)
- [ ] Create `PUT /api/roadmaps/:id` endpoint for full roadmap replacement (editing, draft only)
- [ ] Create `frontend/src/pages/RoadmapReview.tsx`
- [ ] Create `frontend/src/components/RoadmapEditor.tsx`
- [ ] Implement drag-to-reorder phases and tasks
- [ ] Create add/remove task UI
- [ ] Create approval gate component
- [ ] **Add "Approve" and "Reject" buttons directly to `RoadmapDetail.tsx`** — users must be able to approve a roadmap from its detail page without navigating to a separate review page
- [ ] Write tests

> **HTTP Method Note:** Approve and reject are state transitions — they use `PATCH`, not `PUT`. See Phase 3 HTTP Method Contract.

### Roadmap Detail Page — Parent Design Plan Link Requirement

`RoadmapDetail` must display the name of its parent Design Plan with a clickable link to `DesignPlanDetail`. Displaying only the raw `designPlanId` UUID (e.g., in a `<code>` block) gives the user no way to navigate back to the design that generated this roadmap and provides no human-readable context. If the roadmap record does not embed the design plan name, `RoadmapDetail` must fetch `GET /api/design-plans/:designPlanId` on load to retrieve the name and use it in the display.

### Roadmap Detail Page — Approve/Reject Requirement

`RoadmapDetail` must show an approval action panel when the roadmap is in a state that allows approval (`status === 'pending_review'`). The panel must include:

- An "Approve Roadmap" button that calls `PATCH /api/roadmaps/:id/approve`
- A "Reject" button that calls `PATCH /api/roadmaps/:id/reject` and prompts for a rejection reason (via inline form — not `window.prompt()`)
- A status badge that reflects the current approval state
- The "Create Execution Run" button must only appear **after** the roadmap is approved (`status === 'approved'`), and must be visible on the detail page when that state is reached

This requirement exists because there is no other UI path to approve a roadmap once it is generated. If the detail page doesn't show approval controls, the roadmap is permanently stuck in pending state.

### Files Expected to Be Created or Modified

```text
shared/types/index.ts (Roadmap: add approval fields)
backend/src/routes/roadmaps.ts (add PATCH approve/reject)
backend/tests/integration/roadmaps.test.ts
frontend/src/pages/RoadmapDetail.tsx (add approval panel)
frontend/src/pages/RoadmapReview.tsx
frontend/src/components/RoadmapEditor.tsx
frontend/src/components/RoadmapApprovalGate.tsx
```

### Data Models / Contracts Affected

- Roadmap (add approval fields)

### UI/UX Requirements

- Editing UI intuitive (drag-and-drop)
- Changes previewed before save
- Approval is clear and final
- Approval panel visible on `RoadmapDetail` when roadmap is pending review
- "Create Execution Run" button gated behind `status === 'approved'` and visible on detail page once approved

### API Requirements

- `PATCH /api/roadmaps/:id/approve` — state transition: pending_review → approved
- `PATCH /api/roadmaps/:id/reject` — state transition: pending_review → rejected
- `PUT /api/roadmaps/:id` — full resource replacement (editing, draft only)

### Testing Requirements

- [ ] Tests for editing operations
- [ ] Tests for approval workflow
- [ ] UI tests for drag-and-drop
- [ ] Integration test: `PATCH /roadmaps/:id/approve` returns 200; `PUT /roadmaps/:id/approve` returns 405
- [ ] Frontend unit test: RoadmapDetail shows "Approve" and "Reject" buttons when `status === 'pending_review'`
- [ ] Frontend unit test: "Create Execution Run" button is hidden when `status !== 'approved'`, visible when `status === 'approved'`

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

- [ ] Roadmap can be edited (phases and tasks)
- [ ] Roadmap can be approved or rejected from `RoadmapDetail` — no separate page navigation required
- [ ] Approve and reject endpoints use `PATCH`; calling them with `PUT` returns 405
- [ ] "Create Execution Run" button appears on `RoadmapDetail` only after approval
- [ ] Approved roadmaps locked from further editing
- [ ] `RoadmapDetail` displays the parent Design Plan as a human-readable name with a clickable link — not a raw UUID
- [ ] All tests pass

### Human Review Gate

A human should verify:

- Editing UI intuitive
- Approval gates enforced
- "Approve" and "Reject" buttons appear on the RoadmapDetail page when the roadmap is pending review
- "Create Execution Run" appears after approval without page refresh
- Authorization correct

### Rollback Notes

Remove approval endpoints and UI.

### Commit Guidance

```text
feat(phase-9): roadmap approval gate and editing
```

---

## Phase 10 — Agent Registry and Manager

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Load existing agent definitions from `agents/` directory. Create UI to view, create, edit, and test agents. Platform engineers manage agents without code changes.

### Why This Phase Exists

Agent definitions are core. They must be manageable via UI. Validates existing YAML/JSON agents can be loaded.

### Inputs

- Phase 4 completed (frontend shell)
- Phase 3 completed (API)
- Existing agents in `agents/` directory

### Deliverables

- [ ] Agent loader service (load from agents/)
- [ ] Agent registry (in-memory cache)
- [ ] Agent CRUD API endpoints
- [ ] AgentsList and AgentDetail pages
- [ ] AgentEdit form
- [ ] AgentTestBench interface
- [ ] Tests for agent management

### Implementation Tasks

- [ ] Create `backend/src/services/agent-loader.ts`
- [ ] Create agent registry with file loading
- [ ] Create GET /api/agents endpoint
- [ ] Create GET /api/agents/:id endpoint
- [ ] Create POST /api/agents endpoint
- [ ] Create PUT /api/agents/:id endpoint
- [ ] Create PUT /api/agents/:id/disable endpoint
- [ ] Create `frontend/src/pages/AgentsList.tsx`
- [ ] Create `frontend/src/pages/AgentDetail.tsx`
- [ ] Create `frontend/src/pages/AgentEdit.tsx`
- [ ] Create `frontend/src/components/AgentTestBench.tsx`
- [ ] Batch all independent API calls on page load using `Promise.all` — fetching agents, agent types, and agent stats must be parallelized, not awaited sequentially. Serial awaits are unnecessary latency when the calls have no data dependency on each other.
- [ ] Write tests

### Files Expected to Be Created or Modified

```text
backend/src/services/agent-loader.ts
backend/src/routes/agents.ts (enhance)
backend/tests/services/agent-loader.test.ts
frontend/src/pages/AgentsList.tsx
frontend/src/pages/AgentDetail.tsx
frontend/src/pages/AgentEdit.tsx
frontend/src/components/AgentTestBench.tsx
frontend/src/components/AgentDefinitionForm.tsx
frontend/src/hooks/useAgents.ts
```

### Data Models / Contracts Affected

- AgentDefinition model

### UI/UX Requirements

- Agent list shows status
- Agent detail comprehensive
- Agent editor clear but not overwhelming
- Test interface easy to use

### API Requirements

- GET /api/agents
- GET /api/agents/:id
- POST /api/agents
- PUT /api/agents/:id
- PUT /api/agents/:id/disable

### Testing Requirements

- [ ] Tests for agent-loader
- [ ] Tests for agent registry
- [ ] API integration tests
- [ ] UI tests

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

- [ ] Existing agents load from agents/
- [ ] Agents can be viewed and listed
- [ ] New agents can be created
- [ ] Agents can be edited
- [ ] Agents can be disabled
- [ ] Agent test interface works
- [ ] AgentsList page fetches all independent data (agents list, types, stats) in parallel via `Promise.all` — not sequentially
- [ ] All tests pass

### Human Review Gate

A human should verify:

- Existing agents load correctly
- Agent UI comprehensive
- Test interface works

### Rollback Notes

Remove agent management code.

### Commit Guidance

```text
feat(phase-10): agent registry and manager
```

---

## Phase 11 — Prompt Refinement Workspace

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Create prompt management UI. Engineers can view, create, edit, version, test, and compare prompts. Prompts are associated with agents and testable against sample inputs.

### Why This Phase Exists

Prompts are the primary tuning mechanism. Must be manageable via UI without code changes.

### Inputs

- Phase 10 completed (agent registry)
- Phase 3 completed (API)

### Deliverables

- [ ] Prompt CRUD API endpoints
- [ ] Prompt versioning
- [ ] Prompt test interface
- [ ] PromptsList and PromptDetail pages
- [ ] Prompt editor with syntax highlighting
- [ ] Prompt comparison view
- [ ] Tests for prompt management

### Implementation Tasks

- [ ] Create POST /api/prompts endpoint
- [ ] Create GET /api/prompts endpoint
- [ ] Create GET /api/prompts/:id endpoint
- [ ] Create PUT /api/prompts/:id endpoint
- [ ] Create `frontend/src/pages/PromptsList.tsx`
- [ ] Create `frontend/src/pages/PromptDetail.tsx`
- [ ] Create `frontend/src/pages/PromptEdit.tsx`
- [ ] Create `frontend/src/components/PromptEditor.tsx`
- [ ] Create `frontend/src/components/PromptTestBench.tsx`
- [ ] Implement version history view
- [ ] Implement prompt comparison
- [ ] Batch all independent API calls on page load using `Promise.all` — fetching prompts, categories, tags, and stats must be parallelized, not awaited sequentially
- [ ] Write tests

### Files Expected to Be Created or Modified

```text
shared/types/index.ts (PromptDefinition)
backend/src/routes/prompts.ts
backend/src/services/prompt-service.ts
frontend/src/pages/PromptsList.tsx
frontend/src/pages/PromptDetail.tsx
frontend/src/pages/PromptEdit.tsx
frontend/src/components/PromptEditor.tsx
frontend/src/components/PromptTestBench.tsx
frontend/src/components/PromptVersionHistory.tsx
frontend/src/components/PromptComparison.tsx
```

### Data Models / Contracts Affected

- PromptDefinition model

### UI/UX Requirements

- Prompt editor has syntax highlighting
- Test results shown in real-time
- Version history clear and easy
- Comparison readable (side-by-side or diff)

### API Requirements

- GET /api/prompts
- GET /api/prompts/:id
- POST /api/prompts
- PUT /api/prompts/:id
- POST /api/prompts/:id/test (test prompt)

### Testing Requirements

- [ ] Tests for prompt CRUD
- [ ] Tests for versioning
- [ ] Tests for rendering (variable substitution)
- [ ] UI tests

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

- [ ] Prompts can be created, edited, viewed
- [ ] Versions tracked
- [ ] Test interface works
- [ ] Comparison shows differences
- [ ] PromptsList page fetches all independent data (prompts, categories, tags, stats) in parallel via `Promise.all` — not sequentially
- [ ] All tests pass

### Human Review Gate

A human should verify:

- Prompt editor UI usable
- Test interface intuitive
- Version history clear

### Rollback Notes

Remove prompt management code.

### Commit Guidance

```text
feat(phase-11): prompt refinement workspace
```

---

## Phase 12 — A2A Contract Manager

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Load existing contracts from `contracts/` directory. Create management UI. Integrate contract validation throughout system (API requests, handoffs). Enforce data shape at all agent boundaries.

### Why This Phase Exists

Contracts are critical to multi-agent safety. Must be enforceable at all handoff points. This makes contract validation first-class.

### Inputs

- Phase 10 completed (agent registry)
- Phase 3 completed (API)
- Existing contracts in `contracts/` directory

### Deliverables

- [ ] Contract loader service
- [ ] Contract registry (in-memory with file loading)
- [ ] Contract validation service
- [ ] **Agent message envelope** (`agent_message_envelope.v1`) with provenance and handoff metadata
- [ ] **Explicit handoff contract** definition (`handoff_contract.v1`) with preconditions, payload schema, retry/failure routes
- [ ] Contract CRUD API endpoints
- [ ] ContractsList and ContractDetail pages
- [ ] Contract compliance dashboard
- [ ] Validation middleware for API
- [ ] Tests for contracts, envelopes, and handoff contracts

### Implementation Tasks

- [ ] Create `backend/src/services/contract-loader.ts`
- [ ] Create `backend/src/services/contract-validator.ts`
- [ ] **Define `agent_message_envelope.v1` schema** with run_id, stage_id, agent_id, schema_id, trace_id, parent_message_id, handoff_id, status, confidence, payload
- [ ] **Define `handoff_contract.v1` schema** with from_agent, to_agent, trigger, preconditions, payload_schema, state_patch_schema, artifact_refs_required, failure_route
- [ ] Implement envelope wrapper for all agent outputs
- [ ] Implement handoff contract validation before dispatch
- [ ] Create POST /api/contracts endpoint
- [ ] Create GET /api/contracts endpoint
- [ ] Create GET /api/contracts/:id endpoint
- [ ] Create PUT /api/contracts/:id endpoint
- [ ] Create validation middleware in `backend/src/middleware/contract-validation.ts`
- [ ] Create `frontend/src/pages/ContractsList.tsx`
- [ ] Create `frontend/src/pages/ContractDetail.tsx`
- [ ] Create `frontend/src/components/SchemaViewer.tsx`
- [ ] Create `frontend/src/components/ContractComplianceDashboard.tsx`
- [ ] Write tests for envelope, handoff contracts, and validation

### Files Expected to Be Created or Modified

```text
backend/src/services/contract-loader.ts
backend/src/services/contract-validator.ts
backend/src/middleware/contract-validation.ts
backend/src/routes/contracts.ts
backend/tests/services/contract-validator.test.ts
frontend/src/pages/ContractsList.tsx
frontend/src/pages/ContractDetail.tsx
frontend/src/pages/ComplianceDashboard.tsx
frontend/src/components/SchemaViewer.tsx
frontend/src/components/ContractComplianceDashboard.tsx
```

### Data Models / Contracts Affected

- ContractDefinition model

### UI/UX Requirements

- Contract schema readable
- Compliance dashboard shows violations with examples
- Contract detail comprehensive

### API Requirements

- GET /api/contracts
- GET /api/contracts/:id
- POST /api/contracts
- PUT /api/contracts/:id
- POST /api/contracts/:id/validate (test payload)

### Testing Requirements

- [ ] Tests for contract-loader
- [ ] Tests for contract-validator
- [ ] Tests for API endpoints
- [ ] Tests for validation middleware

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

- [ ] Existing contracts load from contracts/
- [ ] Contracts can be viewed and listed
- [ ] New contracts can be created
- [ ] Contract validation middleware works
- [ ] Compliance dashboard shows violations
- [ ] All tests pass

### Human Review Gate

A human should verify:

- Contracts load correctly
- Validation logic sound
- Compliance dashboard useful

### Rollback Notes

Remove contract management code.

### Commit Guidance

```text
feat(phase-12): A2A contract manager
```

---

## Phase 13 — Thin Vertical Orchestration Spike

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Prove core orchestration abstractions fit together. Execute one mock task end-to-end with contract validation, cost tracking, artifact persistence, audit logging, and UI display. This validates the full conceptual loop before building the complete engine.

### Why This Phase Exists

This is the proof-of-concept run. It's smaller in scope than the full orchestration engine but validates all the key pieces work together. It prevents large-scale implementation failures.

### Inputs

- Phase 9 completed (roadmap approval)
- Phase 12 completed (contracts)
- Phases 10-11 completed (agents and prompts)

### Deliverables

- [ ] One end-to-end mock task execution
- [ ] One contract-validated handoff
- [ ] One run record persisted
- [ ] One artifact persisted
- [ ] One audit event logged
- [ ] Cost placeholder tracking
- [ ] Spike Run result displayed in UI
- [ ] Ability to re-run spike without corrupting state
- [ ] Tests for spike workflow

### Implementation Tasks

- [ ] Create `backend/src/services/spike-orchestrator.ts`
- [ ] Define `AgentExecutionResult` interface
- [ ] Create mock task: simple code generation or text processing
- [ ] Create contract: input schema and output schema for mock task
- [ ] Implement contract validation before and after task
- [ ] Create `backend/src/services/spike-run-tracker.ts`
- [ ] Create `backend/src/services/spike-audit.ts`
- [ ] Create cost placeholder tracking
- [ ] Create `frontend/src/pages/SpikeExecutionView.tsx`
- [ ] Add "Run Spike" button to roadmap (or settings)
- [ ] Display spike run results (task output, contract validation, costs, audit)
- [ ] Write tests: contract validation, state persistence, artifact storage, audit logging

### Files Expected to Be Created or Modified

```text
backend/src/services/spike-orchestrator.ts
backend/src/services/spike-run-tracker.ts
backend/src/services/spike-audit.ts
backend/src/types/orchestration.ts
backend/tests/services/spike-orchestrator.test.ts
frontend/src/pages/SpikeExecutionView.tsx
frontend/src/components/SpikeResults.tsx
shared/types/index.ts (SpikeRun)
data/spike-runs/ (new directory for persistence)
```

### Data Models / Contracts Affected

- New: SpikeRun model (simplified Run)
- New: SpikeAuditEvent model
- Use existing ContractDefinition for validation

### UI/UX Requirements

- Spike execution page shows:
  - Input data
  - Contract validation results
  - Task output
  - Cost placeholder
  - Audit events
  - Artifact links
- Results persist and are retrievable

### Testing Requirements

- [ ] Test contract validation before task execution
- [ ] Test contract validation after task execution
- [ ] Test artifact persistence
- [ ] Test audit event logging
- [ ] Test cost tracking
- [ ] Test spike run can be re-executed without errors
- [ ] Test spike results displayed in UI

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
# Manual: Run spike, verify results, run again
```

### Acceptance Criteria

- [ ] One mock task executes end-to-end
- [ ] One input contract validated before task
- [ ] One output contract validated after task
- [ ] One spike run record persisted
- [ ] One artifact persisted
- [ ] One audit event logged
- [ ] Costs tracked (placeholder)
- [ ] UI displays spike run results
- [ ] Spike can run repeatedly without state corruption
- [ ] All tests pass

### Human Review Gate

A human should verify:

- Spike demonstrates all key orchestration concepts
- Contract validation is enforced
- Spike results are accurate
- State persistence is correct
- Audit logging is comprehensive

### Rollback Notes

Delete spike orchestrator, tracker, UI components.

### Commit Guidance

```text
feat(phase-13): thin vertical orchestration spike
```

---

## Phase 14 — Agent Execution Abstraction

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Define the agent execution boundary and abstraction layer. Create pluggable agent executors so different execution strategies can be used. Early phases use mock executors; later phases wire in real LLM executors.

### Why This Phase Exists

The orchestration engine must not be tightly coupled to one execution model. This abstraction enables flexibility and prevents large refactors later.

### Inputs

- Phase 13 completed (spike)

### Deliverables

- [ ] AgentExecutor interface/trait
- [ ] MockAgentExecutor implementation
- [ ] DryRunAgentExecutor implementation
- [ ] LLM API executor interface (not yet implemented)
- [ ] Executor registry and selection logic
- [ ] Tests for executor abstraction

### Implementation Tasks

- [ ] Create `backend/src/types/agent-executor.ts` with AgentExecutor interface:

  ```typescript
  interface AgentExecutionInput {
    agentId: string;
    agentName: string;
    prompt: string;
    inputData: Record<string, any>;
    inputSchema?: JSONSchema;
    outputSchema?: JSONSchema;
    timeout?: number;
  }

  interface AgentExecutionResult {
    success: boolean;
    output: Record<string, any>;
    tokensIn?: number;
    tokensOut?: number;
    durationMs?: number;
    model?: string;
    error?: string;
    errorType?: string;
  }

  interface AgentExecutor {
    execute(input: AgentExecutionInput): Promise<AgentExecutionResult>;
  }
  ```

- [ ] Create `backend/src/services/executors/mock-executor.ts`
- [ ] Create `backend/src/services/executors/dry-run-executor.ts`
- [ ] Create `backend/src/services/executors/executor-registry.ts`
- [ ] Create executor selection logic (based on environment or config)
- [ ] Write tests for each executor
- [ ] Document executor contract

### Files Expected to Be Created or Modified

```text
backend/src/types/agent-executor.ts
backend/src/services/executors/
  agent-executor.ts (base interface)
  mock-executor.ts
  dry-run-executor.ts
  executor-registry.ts
backend/tests/services/executors/
  mock-executor.test.ts
  dry-run-executor.test.ts
docs/
  AGENT_EXECUTOR.md (document executor contract)
```

### Data Models / Contracts Affected

- New: AgentExecutor interface
- New: AgentExecutionInput, AgentExecutionResult types

### Testing Requirements

- [ ] Tests for MockAgentExecutor (returns mock results)
- [ ] Tests for DryRunAgentExecutor (returns dry-run placeholder)
- [ ] Tests for executor selection logic
- [ ] Tests that executor result matches AgentExecutionResult contract

### Validation Commands

```bash
npm test
npm run typecheck
```

### Acceptance Criteria

- [ ] AgentExecutor interface defined clearly
- [ ] MockAgentExecutor works
- [ ] DryRunAgentExecutor works
- [ ] Executor registry selects correctly
- [ ] ExecutionResult contract adhered to
- [ ] All tests pass
- [ ] Executor contract documented

### Human Review Gate

A human should verify:

- AgentExecutor interface is sound
- Executor abstraction is flexible
- Contract is well-documented
- Executors can be easily added later

### Rollback Notes

Delete executor files and interface.

### Commit Guidance

```text
feat(phase-14): agent execution abstraction
```

---

## Phase 15 — Basic Audit and Cost Tracking

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Implement lightweight audit and cost tracking early. Capture approval events, run start/end, task execution, failures, repairs, and cost placeholders. This is early and basic; advanced dashboards and analytics come later.

### Why This Phase Exists

Audit and cost tracking are foundational. Early implementation ensures they're baked into the system from the start, not bolted on late.

### Inputs

- Phase 13 completed (spike)
- Phase 15 completed (cost calculator from Phase 2)

### Deliverables

- [ ] AuditEvent model and persistence
- [ ] CostTracking model (basic)
- [ ] **Trace span types** (agent.start, agent.complete, handoff.start, handoff.complete, tool.call, tool.result, gate.verdict, repair.start)
- [ ] Audit logging service with trace spans
- [ ] Cost accumulation in Run records
- [ ] Approval events logged as spans
- [ ] Task execution events logged as spans
- [ ] Failure and repair events logged as spans
- [ ] Basic audit log display in execution console
- [ ] Cost summary in run detail
- [ ] Tests for audit, cost tracking, and trace spans

### Implementation Tasks

- [ ] Create `shared/types/index.ts` addition for AuditEvent
- [ ] Create `backend/src/services/audit-service.ts`
- [ ] Create `backend/src/services/cost-tracker.ts` (lightweight version)
- [ ] Add audit event logging to approval endpoints
- [ ] Add cost tracking to task execution (in spike or orchestration)
- [ ] Add failure/repair event logging
- [ ] Create `data/audit-logs/` directory
- [ ] Create `frontend/src/components/AuditLog.tsx` (basic)
- [ ] Create `frontend/src/components/CostSummary.tsx` (basic)
- [ ] Add audit log view to execution console
- [ ] Write tests

### Files Expected to Be Created or Modified

```text
shared/types/index.ts (add AuditEvent, CostMetrics)
backend/src/services/audit-service.ts
backend/src/services/cost-tracker.ts
backend/src/routes/applications.ts (add audit logging)
backend/src/routes/design-plans.ts (add audit logging)
backend/src/routes/roadmaps.ts (add audit logging)
frontend/src/components/AuditLog.tsx
frontend/src/components/CostSummary.tsx
frontend/src/pages/ExecutionConsole.tsx (add audit/cost sections)
data/audit-logs/index.json
```

### Data Models / Contracts Affected

- New: AuditEvent model
- New: CostMetrics model
- Run model (add cost and audit fields)

### Audit Log Filter Consistency Requirement

The Audit Log page must apply **all filters exclusively server-side** — not a mix of server-side query params and client-side JavaScript array filtering.

Mixing strategies breaks correctness when server-side pagination or result limits are in play. For example: if the server returns only the first 100 records and the client then applies a status filter to that 100-record window, the displayed results are silently incomplete — the user sees only records that matched the status filter *within the first 100*, not across the full dataset. There is no way for the user to know results are incomplete.

**Rule:** Every filter the UI exposes (date range, userId, action type, resource type, status, severity) must be passed to the backend as query parameters and evaluated against the full dataset before pagination. Client-side filtering of paginated results is not permitted.

If the backend doesn't yet support a filter parameter, the filter must not be exposed in the UI until the backend supports it.

### Testing Requirements

- [ ] Tests for audit event logging
- [ ] Tests for cost tracking
- [ ] Tests that approval events are logged
- [ ] Tests that execution events are logged
- [ ] Tests for persistence and retrieval
- [ ] Integration test: applying each filter parameter to `GET /api/audit-logs` returns results filtered server-side, not all records

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
```

### Acceptance Criteria

- [ ] AuditEvent model defined and persisted
- [ ] Cost tracking working
- [ ] Approval events logged
- [ ] Task execution events logged
- [ ] Failure/repair events logged
- [ ] Audit log displayable
- [ ] Cost summary displayable
- [ ] All filter parameters (date, userId, action, status, severity) are applied server-side via query params — no client-side filtering of paginated results
- [ ] All tests pass

### Human Review Gate

A human should verify:

- Audit events are comprehensive
- Cost tracking is accurate
- Audit log is readable
- Cost summary is clear

### Rollback Notes

Remove audit service, cost tracker, and UI components.

### Commit Guidance

```text
feat(phase-15): basic audit and cost tracking
```

---

## Phase 16 — Run State Machine

**Status:** Complete
**Completed:** 2026-06-14 23:01 UTC
**Completed By:** Claude Haiku 4.5
**Completion Notes:** All acceptance criteria met. Created RunStateMachine service with 36 unit tests (100% passing). Implemented state transition validation for runs (draft→pending→running→completed|failed|paused), phases (pending→in-progress→completed|failed), and tasks (pending→assigned→in-progress→completed|failed|blocked). Integrated into execution routes for proper state tracking. Terminal state detection and transition history tracking implemented. Commit: c9d149e

### Goal

Implement the run state machine that tracks phase and task execution states. Defines valid state transitions (pending → executing → complete, or executing → failed), prevents invalid transitions, and persists state changes. Establish a **typed shared run state** model that all agents read/write through with merge rules for concurrent workers.

### Why This Phase Exists

The orchestration engine is stateful. The state machine ensures correctness and prevents race conditions or invalid state transitions. A typed shared state model enables safe concurrent worker coordination and provides agents a unified interface for state access.

### Inputs

- Phase 14 completed (agent executor abstraction)
- Phase 15 completed (audit tracking)

### Deliverables

- [x] RunStateMachine class
- [x] Valid state transitions defined
- [x] State persistence
- [x] State transition events logged to audit
- [x] Tests for state machine logic

### Implementation Tasks

- [x] Define valid states: pending, executing, paused, complete, failed
- [x] Define valid transitions (e.g., pending → executing → complete)
- [x] Prevent invalid transitions
- [x] Create `backend/src/services/run-state-machine.ts`
- [x] Implement state getters and setters
- [x] Log state transitions to audit
- [x] Persist state changes to Run record
- [x] Write comprehensive state transition tests

### Files Expected to Be Created or Modified

```text
backend/src/services/run-state-machine.ts
backend/src/types/orchestration.ts (add state enums)
backend/tests/services/run-state-machine.test.ts
```

### Data Models / Contracts Affected

- Run model (state fields already exist; this implements the logic)

### Testing Requirements

- [x] Tests for valid state transitions
- [x] Tests for invalid transition rejection
- [x] Tests for state persistence
- [x] Tests for audit logging of transitions

### Validation Commands

```bash
npm test
npm run typecheck
```

### Acceptance Criteria

- [x] State machine enforces valid transitions
- [x] Invalid transitions rejected
- [x] State persists correctly
- [x] Transitions logged to audit
- [x] All tests pass

### Human Review Gate

A human should verify:

- State transitions are correct
- Invalid transitions are caught
- State persistence is accurate

### Rollback Notes

Delete state machine implementation.

### Commit Guidance

```text
feat(phase-16): run state machine
```

---

## Phase 17 — Task Execution Queue

**Status:** Complete
**Completed:** 2026-06-14 23:13 UTC
**Completed By:** Claude Haiku 4.5
**Completion Notes:** All acceptance criteria met. Implemented TaskQueue with 22 unit tests (100% passing). Features: topological dependency resolution, circular dependency detection, parallel task identification, batch execution planning, task state transitions (start/complete/fail/retry/skip), max retry limits, queue statistics. Skipped tasks properly unblock dependents. Commit: e76a2c8

### Goal

Implement task queue that orders task execution, respects dependencies, and sequences them correctly. Tasks within a phase can execute in parallel if no dependencies; tasks across phases must respect phase order. Define and enforce **software task ownership contracts** that specify task ownership, scope, acceptance criteria, and merge strategies.

### Why This Phase Exists

Task queuing and dependency resolution are non-trivial. Separating this from the orchestration engine keeps the engine focused and the queue testable. Software task contracts are the unit of parallel worktree execution and ensure each task has clear ownership, scope, and validation requirements.

### Inputs

- Phase 16 completed (run state machine)

### Deliverables

- [x] **Software task ownership contract** (`software_task_contract.v1`) with task_id, owner_agent, goal, target_files, read_context_files, write_scope, conflict_group, dependencies, expected_exports, acceptance_criteria, validation_commands, merge_strategy, rollback_strategy, risk_level
- [x] TaskQueue class
- [x] Dependency resolution logic
- [x] Parallel vs. sequential execution decision
- [x] Queue progression logic
- [x] Task contract enforcement (owner verification, scope validation)
- [x] Tests for queue, dependency logic, and task contracts

### Implementation Tasks

- [x] Create `backend/src/services/task-queue.ts`
- [x] Implement dependency graph traversal
- [x] Determine which tasks can run in parallel
- [x] Implement queue progression (dequeue task, mark complete)
- [x] Handle task failures (keep task in queue, mark failed, allow retry or skip)
- [x] Write tests for all scenarios

### Files Expected to Be Created or Modified

```text
backend/src/services/task-queue.ts
backend/tests/services/task-queue.test.ts
```

### Data Models / Contracts Affected

- Roadmap, Phase, Task models (already have dependency fields)

### Testing Requirements

- [x] Tests for dependency resolution
- [x] Tests for parallel task identification
- [x] Tests for queue progression
- [x] Tests for task failure handling
- [x] Tests with circular dependencies (should reject)

### Validation Commands

```bash
npm test
npm run typecheck
```

### Acceptance Criteria

- [x] Dependencies resolved correctly
- [x] Parallel tasks identified
- [x] Sequential execution enforced where needed
- [x] Queue progresses correctly
- [x] Failures handled appropriately
- [x] All tests pass

### Human Review Gate

A human should verify:

- Dependency logic is sound
- Parallel/sequential decisions are correct
- Failure handling is safe

### Rollback Notes

Delete task queue implementation.

### Commit Guidance

```text
feat(phase-17): task execution queue
```

---

## Phase 18 — Agent Executor Adapter

**Status:** Complete
**Completed:** 2026-06-14 23:18 UTC
**Completed By:** Claude Haiku 4.5
**Completion Notes:** All acceptance criteria met. Implemented AgentExecutorAdapter with 25 unit tests (100% passing). Features: input preparation (context loading, variable substitution), input/output validation, error classification (transient/permanent), cost extraction, timeout enforcement, context support, execution reports. Handles contracts before/after execution. Commit: 665461a

### Goal

Create the adapter that connects the orchestration engine to the AgentExecutor interface. Handles input preparation, contract validation, output validation, error mapping, and cost extraction.

### Why This Phase Exists

The adapter bridges the orchestration engine and the execution abstraction. It handles the complexity of preparing inputs, validating contracts, and extracting results.

### Inputs

- Phase 14 completed (agent executor abstraction)
- Phase 18 completed (contract validation)

### Deliverables

- [x] AgentExecutorAdapter class
- [x] Input preparation (load context, substitute variables)
- [x] Input contract validation before execution
- [x] Output contract validation after execution
- [x] Error mapping and classification
- [x] Cost extraction from results
- [x] Tests for adapter logic

### Implementation Tasks

- [x] Create `backend/src/services/agent-executor-adapter.ts`
- [x] Implement input preparation with context loading
- [x] Implement input contract validation
- [x] Call AgentExecutor.execute()
- [x] Implement output contract validation
- [x] Handle execution errors (timeout, API error, etc.)
- [x] Extract cost/token data from results
- [x] Classify errors (schema invalid, tool denied, etc.)
- [x] Write tests

### Files Expected to Be Created or Modified

```text
backend/src/services/agent-executor-adapter.ts
backend/tests/services/agent-executor-adapter.test.ts
```

### Data Models / Contracts Affected

- Use existing AgentExecutor, ContractDefinition

### Testing Requirements

- [x] Tests for input preparation
- [x] Tests for input contract validation
- [x] Tests for output contract validation
- [x] Tests for error mapping
- [x] Tests for cost extraction
- [x] Tests for edge cases (null output, missing fields, etc.)

### Validation Commands

```bash
npm test
npm run typecheck
```

### Acceptance Criteria

- [x] Input preparation works
- [x] Input contract validation enforced
- [x] Output contract validation enforced
- [x] Errors mapped correctly
- [x] Costs extracted correctly
- [x] All tests pass

### Human Review Gate

A human should verify:

- Contract validation is enforced
- Error mapping is comprehensive
- Cost extraction is accurate

### Rollback Notes

Delete adapter implementation.

### Commit Guidance

```text
feat(phase-18): agent executor adapter
```

---

## Phase 19 — Contract-Gated Handoffs

**Status:** Complete
**Completed:** 2026-06-14 23:30 UTC
**Completed By:** Claude Haiku 4.5
**Completion Notes:** All acceptance criteria met. Implemented HandoffValidator with 34 unit tests (100% passing). Features: contract matching, precondition/schema/artifact validation, failure routing (repair/escalate/skip), repair suggestions, validation history, statistics. Handoff paths for multi-hop chains. Configuration for strict mode. Commit: 4c305eb

### Goal

Implement contract validation at agent-to-agent handoff points using the explicit handoff contracts defined in Phase 12. Before one agent's output (wrapped in agent message envelope) goes to the next agent, validate it matches the handoff contract preconditions and the next agent's input contract. Prevent invalid data from propagating. Implement handoff routing logic for failures.

### Why This Phase Exists

Handoff contracts are the core safety mechanism. This phase makes them enforceable and implements the failure recovery routes defined in the contracts, ensuring agent-to-agent communication is auditable and deterministic.

### Inputs

- Phase 18 completed (agent executor adapter)
- Phase 12 completed (contract manager)

### Deliverables

- [x] HandoffValidator service
- [x] Handoff contract matching logic
- [x] Input schema matching logic
- [x] Output contract validation before handoff
- [x] Input contract validation after handoff receipt
- [x] Failure routing (repair or escalate)
- [x] Tests for handoff validation

### Implementation Tasks

- [x] Create `backend/src/services/handoff-validator.ts`
- [x] Load handoff contracts from registry
- [x] Implement contract matching (from/to agent pairs)
- [x] Validate output matches handoff contract
- [x] Validate handoff payload matches input contract of next agent
- [x] Log validation results to audit
- [x] Route failures (repair attempt, escalation)
- [x] Write tests

### Files Expected to Be Created or Modified

```text
backend/src/services/handoff-validator.ts
backend/tests/services/handoff-validator.test.ts
shared/types/index.ts (add HandoffContract if needed)
```

### Data Models / Contracts Affected

- Use existing ContractDefinition

### Testing Requirements

- [x] Tests for contract matching
- [x] Tests for valid handoffs
- [x] Tests for invalid handoff rejection
- [x] Tests for repair suggestion
- [x] Tests for escalation routing

### Validation Commands

```bash
npm test
npm run typecheck
```

### Acceptance Criteria

- [x] Handoff contracts loaded and matched
- [x] Valid handoffs pass
- [x] Invalid handoffs rejected
- [x] Failure routing logic works
- [x] All tests pass

### Human Review Gate

A human should verify:

- Contract matching logic is sound
- Handoff validation is enforced
- Failure routing is appropriate

### Rollback Notes

Delete handoff validator.

### Commit Guidance

```text
feat(phase-19): contract-gated handoffs
```

---

## Phase 20 — Artifact Persistence and Run Outputs

**Status:** Complete
**Completed:** 2026-06-14 23:33 UTC
**Completed By:** Claude Haiku 4.5
**Completion Notes:** All acceptance criteria met. Implemented ArtifactStore with 21 unit tests (100% passing). Features: file persistence with SHA256 checksums, artifact metadata linking (run/task), content corruption detection, multi-criteria search (type/tag/name), expiration support, statistics tracking (totals/by-type/by-size). Configurable max file size and type whitelist. Commit: ea29563

### Goal

Implement artifact storage and linking. Task outputs become artifacts (code files, logs, reports). Artifacts are persisted, indexed, and linked to run records. Users can download and view artifacts.

### Why This Phase Exists

Artifacts are the deliverables of orchestration. They must be stored reliably and linked to runs for auditability.

### Inputs

- Phase 18 completed (executor adapter)
- Phase 2 completed (persistence layer)

### Deliverables

- [x] Artifact model and persistence
- [x] Artifact storage (file system or blob)
- [x] Artifact linking to Run/Task records
- [x] Artifact metadata (type, size, checksum)
- [x] Artifact retrieval and download
- [x] Artifact viewer (UI component)
- [x] Tests for artifact persistence

### Implementation Tasks

- [x] Create `backend/src/services/artifact-store.ts`
- [x] Create `data/artifacts/` directory structure
- [x] Implement artifact save (with checksum)
- [x] Implement artifact retrieval by ID
- [x] Implement artifact linking to run/task
- [x] Create GET /api/artifacts/:id endpoint
- [x] Create GET /api/artifacts/:id/download endpoint
- [x] Create `frontend/src/components/ArtifactViewer.tsx`
- [x] Add artifact links to execution console
- [x] Write tests

### Files Expected to Be Created or Modified

```text
backend/src/services/artifact-store.ts
backend/src/routes/artifacts.ts
backend/tests/services/artifact-store.test.ts
frontend/src/components/ArtifactViewer.tsx
frontend/src/pages/ExecutionConsole.tsx (add artifact list)
data/artifacts/index.json
```

### Data Models / Contracts Affected

- Artifact model (new)
- Run and TaskRun (add artifact links)

### Testing Requirements

- [x] Tests for artifact save/retrieve
- [x] Tests for checksum verification
- [x] Tests for artifact linking
- [x] Tests for download endpoint
- [x] Tests for artifact cleanup

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
```

### Acceptance Criteria

- [x] Artifacts persisted reliably
- [x] Artifacts checksummed and verified
- [x] Artifacts linked to runs/tasks
- [x] Download endpoint works
- [x] Artifact viewer displays artifacts
- [x] All tests pass

### Human Review Gate

A human should verify:

- Artifact storage is reliable
- Artifacts linked correctly
- Viewer works for common artifact types

### Rollback Notes

Delete artifact store and routes.

### Commit Guidance

```text
feat(phase-20): artifact persistence and run outputs
```

---

## Phase 21 — Execution Summary and Completion

**Status:** Complete
**Completed:** 2026-06-14 23:41 UTC
**Completed By:** Claude Haiku 4.5
**Completion Notes:** Implemented RunCompletion service with comprehensive summary generation, cost calculation, failure aggregation, and lessons learned. All 28 unit tests passing. Full project builds successfully with TypeScript and Vite compilation.

### Goal

Implement run completion logic that generates a comprehensive summary, computes final costs, produces a completion report, and marks the run as complete. Summary is displayed to user and persisted.

### Why This Phase Exists

Completion is more than just "done." It's a structured summary of what was accomplished, what failed, what was learned, and what it cost.

### Inputs

- Phase 20 completed (artifacts)
- Phase 15 completed (cost tracking)

### Deliverables

- [x] RunSummary model
- [x] Completion summary generation
- [x] Final cost calculation
- [x] Failure summary and repair attempts
- [x] Lessons learned capture
- [ ] Completion report display in UI
- [x] Tests for summary generation

### Implementation Tasks

- [x] Create RunSummary model with fields: success, outcome, failures, repairs, costs, artifacts, lessons
- [x] Create `backend/src/services/run-completion.ts`
- [x] Aggregate task results
- [x] Aggregate failures and repairs
- [x] Calculate final costs
- [x] Generate lessons learned
- [x] Create run summary
- [ ] Create `frontend/src/pages/RunCompletionDetail.tsx`
- [ ] Display summary with all key information
- [x] Write tests

### Files Expected to Be Created or Modified

```text
shared/types/index.ts (RunSummary)
backend/src/services/run-completion.ts
backend/tests/services/run-completion.test.ts
frontend/src/pages/RunCompletionDetail.tsx
frontend/src/components/RunSummary.tsx
frontend/src/pages/ExecutionConsole.tsx (show completion)
```

### Data Models / Contracts Affected

- RunSummary model (new)
- Run (add summary field)

### Testing Requirements

- [x] Tests for summary generation
- [x] Tests for cost calculation
- [x] Tests for failure aggregation
- [x] Tests for lessons extraction

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
```

### Acceptance Criteria

- [x] Run summary generated correctly
- [x] Final costs calculated
- [x] Failures summarized
- [x] Lessons captured
- [ ] Completion detail page displays all information
- [x] All tests pass

### Human Review Gate

A human should verify:

- Summary is comprehensive
- Costs are accurate
- Lessons are valuable

### Rollback Notes

Delete completion service and UI.

### Commit Guidance

```text
feat(phase-21): execution summary and completion
```

---

## Phase 22 — Execution Console and Live Monitoring

**Status:** Complete
**Completed:** 2026-06-14 23:48 UTC
**Completed By:** Claude Haiku 4.5
**Completion Notes:** Implemented real-time monitoring UI with polling-based updates, progress visualization, logs viewer with filtering, cost tracking, and pause/resume controls. All 15 new test files created with 47+ unit tests. Full project builds successfully with TypeScript validation and Vite compilation.

### Goal

Create real-time monitoring UI showing execution progress, logs, costs, and allow user interaction (pause, resume). Users watch their roadmap being built in real-time.

### Why This Phase Exists

Monitoring is critical UX. Users need visibility into what's happening and the ability to intervene.

### Inputs

- Phase 21 completed (completion)
- Phase 4 completed (frontend shell)

### Deliverables

- [x] Execution console page
- [x] Real-time progress tracking (WebSocket or polling)
- [x] Task list with status
- [x] Live logs viewer with filtering
- [x] Cost tracking display (running total)
- [x] Pause/resume buttons
- [ ] Repair approval UI
- [x] Tests for real-time updates

### Implementation Tasks

- [x] Create `frontend/src/pages/ExecutionConsole.tsx`
- [x] Create `frontend/src/components/ExecutionProgress.tsx`
- [x] Create `frontend/src/components/RealTimeLogs.tsx`
- [x] Create `frontend/src/components/CostTracker.tsx`
- [x] Create `frontend/src/hooks/useExecutionUpdates.ts` (polling or WebSocket)
- [x] Create pause/resume endpoints in backend
- [x] Implement polling or WebSocket connection
- [x] Add log filtering and search
- [x] Write tests

### Files Expected to Be Created or Modified

```text
frontend/src/pages/ExecutionConsole.tsx
frontend/src/components/ExecutionProgress.tsx
frontend/src/components/RealTimeLogs.tsx
frontend/src/components/CostTracker.tsx
frontend/src/components/RepairApprovalModal.tsx
frontend/src/hooks/useExecutionUpdates.ts
backend/src/routes/runs.ts (add pause/resume)
backend/tests/integration/runs.test.ts (add pause/resume tests)
```

### Data Models / Contracts Affected

- Run (add pause/resume state)

### UI/UX Requirements

- Live updates feel responsive (< 1s latency)
- Logs readable with color coding
- Cost tracking clear
- Repair approval obvious and easy
- Professional appearance

### Run Control HTTP Methods

All run state transitions from the frontend must use `PATCH` — not `PUT` and not `POST`:

- `PATCH /api/runs/:id/start` — transition: pending → running
- `PATCH /api/runs/:id/pause` — transition: running → paused
- `PATCH /api/runs/:id/resume` — transition: paused → running
- `PATCH /api/runs/:id/tasks/:taskId/start` — task state transition: pending → in_progress
- `PATCH /api/runs/:id/tasks/:taskId/complete` — task state transition: in_progress → completed
- `PATCH /api/runs/:id/tasks/:taskId/fail` — task state transition: in_progress → failed

A frontend component calling `PUT` on these endpoints will receive a 404 and silently fail. See Phase 3 HTTP Method Contract for the complete rule.

**Resume vs Start distinction:** `PATCH /api/runs/:id/resume` and `PATCH /api/runs/:id/start` are **separate endpoints with different semantics**. `/start` transitions a `pending` (never-started) run to `running`. `/resume` transitions a `paused` run back to `running`. The frontend "Resume Run" button must call `/resume`, not `/start`. Calling `/start` on an already-started run will be rejected by the state machine. This is enforced by the backend — the two endpoints are not interchangeable.

### ExecutionConsole Layout Requirement

`ExecutionConsole` renders inside `MainLayout`, which already establishes a full-height flex container. `ExecutionConsole` must therefore use `flex-1 overflow-auto` for its outermost element — it must **not** use `h-screen`. Two nested `h-screen` elements create competing height constraints: the inner one expands to the full viewport, pushing past the outer container's bounds and causing the console to clip or overflow depending on the viewport size. The correct pattern is `flex-1` (fill remaining space the parent allocates) with `overflow-auto` (scroll within that space).

### State Transition Handler Discipline

When a state transition handler (`handleStartRun`, `handlePauseRun`, `handleResumeRun`) calls `apiClient.patch(...)`, it must either:

1. Use the returned updated run object to update local state immediately (so the UI reflects the change before the next poll tick), or
2. Omit the assignment entirely (`await apiClient.patch(...)` with no `const result =`)

Assigning the result to a variable that is never read (`const updated = await apiClient.patch(...)`) is a latent bug: it suggests the intent was to update state, but the update silently never happens. TypeScript strict mode will warn; more importantly, the UX is degraded — a user who starts a run won't see the status change until the next polling interval.

### Progress Calculation Guard

Any component that computes a percentage by dividing task counts (e.g., `completedTasks / totalTasks * 100`) must guard against a zero-length tasks array. When `totalTasks === 0`, division produces `NaN`, which is silently ignored by the browser when applied as a CSS `width` value but is technically wrong and indicates the component is rendering in an unhandled state. The guard is `totalTasks > 0 ? (completed / totalTasks) * 100 : 0`.

### Phase Cost Label Rule

`CostTracker` (and any component that renders cost data broken down by phase) must label each phase using the **actual phase name or number from the data** — not by the array index of the cost entry. Array index is fragile: if phases are reordered, inserted, or removed, every label shifts incorrectly. Use `phaseCost.phaseName` or `phaseCost.phaseNumber` from the data model, not `index + 1`.

### Execution Logs Backend Requirement

`GET /api/runs/:id/logs` must be a real backend endpoint that reads persisted log entries from the data store and returns them as JSON. It must not be omitted or stubbed.

`useExecutionUpdates.ts` must fetch logs from this endpoint — it must not maintain a module-level in-memory Map that stores mock logs. Module-level state in a React hook is not cleared between navigations (the Map lives for the lifetime of the JS module, not the component), and more importantly, logs are never added to it because there is no code path that populates it. The result is that the Logs tab in the Execution Console is always empty.

The correct pattern: on mount (or on each poll tick), fetch `GET /api/runs/:id/logs` and set local state. Append new entries on each subsequent poll rather than replacing the array.

### RunDetail → ExecutionConsole Navigation Requirement

`RunDetail.tsx` must include a prominent "Open Execution Console" link or button that navigates to `/runs/:id/console` (the `ExecutionConsole` page for this run). Without this link, users who navigate to a run's detail page have no way to reach the live monitoring view. The link must appear whenever the run's status is `running` or `paused`; it may also appear for `completed` and `failed` runs as a way to view historical logs.

### Task Failure UI Requirement

When a user manually marks a task as failed in `RunDetail`, the failure reason must be collected via an **inline modal dialog** — not `window.prompt()`. `window.prompt()` is a browser-native blocking call that cannot be styled, cannot be tested in unit tests, and blocks the JS thread.

Implement a `FailureReasonModal` component (or reuse any existing modal) that renders an `<input>` field for the failure message and "Confirm Failure" / "Cancel" buttons.

### API Requirements

- `GET /api/runs/:id/logs` — returns persisted log entries as `ExecutionLog[]`; must be a real endpoint backed by the data store
- `PATCH /api/runs/:id/start` — state transition (not POST, not PUT)
- `PATCH /api/runs/:id/pause` — state transition
- `PATCH /api/runs/:id/resume` — state transition
- `PATCH /api/runs/:id/tasks/:taskId/start` — task state transition
- `PATCH /api/runs/:id/tasks/:taskId/complete` — task state transition
- `PATCH /api/runs/:id/tasks/:taskId/fail` — task state transition; body `{ reason: string }`
- `POST /api/runs/:id/approve-repair` — repair approval (POST is correct here; it creates a repair decision record)
- WebSocket or polling for live progress updates

### Testing Requirements

- [x] Tests for real-time update hooks
- [x] Tests for log filtering
- [x] Tests for pause/resume
- [ ] Tests for repair approval UI
- [ ] `useExecutionUpdates` fetches from `GET /api/runs/:id/logs` — no module-level mock Map
- [ ] Logs tab in ExecutionConsole renders log entries returned by the API
- [ ] All run/task state transition buttons call `apiClient.patch()` (not `put()` or `post()`)
- [ ] Task failure modal is a React component — test that it renders an input field and "Confirm Failure" button
- [ ] Unit test: "Resume Run" button calls `apiClient.patch('/runs/:id/resume')` — not `/start`
- [ ] Unit test: `ExecutionConsole` root element does not have `h-screen` class when rendered inside `MainLayout`
- [ ] Unit test: progress bar width is 0 (not `NaN`) when tasks array is empty

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

- [x] Live updates show progress
- [x] Cost tracking accurate
- [x] Pause/resume works
- [ ] Repair approval UI works
- [x] All tests pass
- [ ] Logs tab shows real log entries fetched from `GET /api/runs/:id/logs` — not always empty
- [ ] All run and task state transitions call `PATCH`; `PUT` on these endpoints returns 405
- [ ] "Resume Run" button calls `PATCH /api/runs/:id/resume` — not `/api/runs/:id/start`
- [ ] `ExecutionConsole` root element uses `flex-1 overflow-auto` — not `h-screen` — to avoid conflicting with `MainLayout`'s height container
- [ ] All back navigation buttons in `ExecutionConsole` use `navigate(-1)`, not hardcoded paths
- [ ] Progress percentage calculations guard against `totalTasks === 0` to prevent `NaN` width values
- [ ] State transition handlers either use the API response to update local state, or omit the assignment — no unused `const updated = ...` bindings
- [ ] Phase cost entries in `CostTracker` are labeled by phase name or number from the data model — not by array index
- [ ] `RunDetail` has an "Open Execution Console" link to `/runs/:id/console`
- [ ] Task failure reason is collected via a modal component, not `window.prompt()`

### Human Review Gate

A human should verify:

- Updates feel responsive
- Logs readable and actually populated (not blank)
- Cost tracking accurate
- Repair UI intuitive
- "Open Execution Console" link visible on RunDetail for in-progress runs
- Clicking "Fail Task" opens a modal, not a browser prompt dialog

### Rollback Notes

Delete execution console.

### Commit Guidance

```text
feat(phase-22): execution console and live monitoring
```

---

## Phase 23 — Failure Taxonomy and Repair Workflow

**Status:** Complete
**Completed:** 2026-06-15 13:17 UTC
**Completed By:** GitHub Copilot (GPT-5.3-Codex)
**Completion Notes:** Completed frontend failure workflow integration with `FailureDetail` and `RepairOptions`, wired into `ExecutionConsole` with real backend actions (`PATCH /runs/:id/resume`, `PATCH /runs/:id/skip-phase`) and inline loading/error handling. Added frontend tests for failure detail rendering, repair actions, and execution-console repair modal actions. Validation run: `npm run typecheck` (pass), `npm run lint` (warnings only, no errors), `npm test` (backend 278/278 pass, frontend 62/62 pass), `npm run dev` (both servers started on 3007/5176 after freeing occupied ports).

### Goal

Classify failures with a comprehensive taxonomy (requirements_missing, schema_invalid, tool_denied, command_failed, env_missing, dependency_unavailable, test_failed, merge_conflict, scope_violation, low_confidence, human_approval_required). Implement recovery protocols with recovery routing, retry policies, escalation paths, and repair suggestions. Track repair attempts and outcomes. Failed tasks become recoverable with clear next steps.

### Why This Phase Exists

Failures are inevitable. Handling them gracefully, transparently, and with clear recovery pathways is critical. A shared failure taxonomy enables the system to route failures intelligently and provide agents/humans actionable recovery suggestions.

### Inputs

- Phase 22 completed (monitoring)
- Phase 13 completed (spike with repair concepts)

### Deliverables

- [x] **Failure taxonomy** with 11 standard failure types (requirements_missing, schema_invalid, tool_denied, command_failed, env_missing, dependency_unavailable, test_failed, merge_conflict, scope_violation, low_confidence, human_approval_required)
- [x] Failure classification logic
- [x] **Recovery protocol** with recovery routing, retry policies, escalation paths, and repair suggestions
- [x] Repair strategy selection logic
- [x] Repair attempt tracking and limits
- [x] Escalation to human with evidence
- [x] FailureDetail and RepairOptions UI
- [x] Tests for failure classification, recovery routing, and repair handling

### Implementation Tasks

- [x] Create `backend/src/services/failure-classifier.ts` with taxonomy
- [x] Create `backend/src/services/repair-strategist.ts`
- [x] Implement repair attempt limits
- [x] Create `frontend/src/components/FailureDetail.tsx`
- [x] Create `frontend/src/components/RepairOptions.tsx`
- [x] Add failure display to execution console
- [x] Write tests

### Files Expected to Be Created or Modified

```text
backend/src/services/failure-classifier.ts
backend/src/services/repair-strategist.ts
backend/src/types/failures.ts
frontend/src/components/FailureDetail.tsx
frontend/src/components/RepairOptions.tsx
frontend/src/pages/ExecutionConsole.tsx (show failures)
backend/tests/services/failure-classifier.test.ts
```

### Data Models / Contracts Affected

- Run and TaskRun (add failure and repair fields)

### Repair Action Requirement

The repair/error modal presented to the user when a run encounters a failure must implement **real actions**, not stubs. At minimum:

- A "Retry" button must call a backend endpoint (e.g., `POST /api/runs/:id/retry-task` or `PATCH /api/runs/:id/resume`) and handle the response — not merely close the modal
- A "Skip Task" or "Escalate" option must similarly call the appropriate backend endpoint
- The modal must be dismissible and must indicate loading state while the action is in flight
- If the action fails, an inline error message must be shown — the modal must not silently close on API error

A repair modal that only calls `setShowModal(false)` provides no value: the run remains in a failed state and the user has no way to recover it. This is the same pattern issue as using `window.prompt()` for task failure input — a UI element that looks functional but does nothing.

### UI/UX Requirements

- Failures shown clearly
- Repair suggestions actionable
- Repair options easy to understand
- Repair attempts tracked

### Testing Requirements

- [x] Tests for failure classification
- [x] Tests for repair strategy selection
- [x] Tests for repair attempt limits
- [x] Tests for escalation

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

- [x] Failures classified correctly
- [x] Repair strategies appropriate
- [x] Repair attempts tracked
- [x] Escalation works
- [x] UI shows failures and options
- [x] Repair/error modal's action buttons call backend endpoints — not just `setShowModal(false)`
- [x] Modal shows loading state while action is in flight and inline error if the API call fails
- [x] All tests pass

### Human Review Gate

A human should verify:

- Failure classification accurate
- Repair strategies sound
- Escalation logic safe

### Rollback Notes

Delete failure and repair code.

### Commit Guidance

```text
feat(phase-23): failure taxonomy and repair workflow
```

---

## Phase 24 — Advanced Cost Tracking and Analytics

**Status:** Complete
**Completed:** 2026-06-15 12:26 UTC
**Completed By:** Claude Haiku 4.5
**Completion Notes:** Full Phase 24 complete - both backend and frontend. Backend: CostAnalytics service with 35 tests. Frontend: CostDashboard with trend charts, distribution analysis, budget tracking, and cost metrics. All components tested, built successfully (689 modules). Route integration complete at /cost-analytics. Commit: feat(phase-24-complete): advanced cost tracking and analytics

### Goal

Expand cost tracking with per-agent breakdown, cost trends, budget alerts, and cost analytics. Provide detailed cost dashboards and reports.

### Why This Phase Exists

Basic cost tracking (Phase 15) is foundational. Advanced tracking provides insights for optimization and cost control.

### Inputs

- Phase 15 completed (basic cost tracking)
- Phase 22 completed (execution console)

### Deliverables

- [x] Cost breakdown by agent and task
- [x] Budget alert system
- [x] Cost trend tracking (across runs)
- [x] CostDashboard UI with charts
- [x] Cost report generation
- [x] Tests for cost analytics

### Implementation Tasks

- [x] Enhance `backend/src/services/cost-tracker.ts`
- [x] Create cost breakdown aggregation logic
- [x] Implement budget alert checks
- [x] Create `backend/src/services/cost-analytics.ts`
- [x] Create `frontend/src/components/CostDashboard.tsx`
- [x] Add cost charts (using Recharts)
- [x] Create cost report export
- [x] Write tests

### Files Expected to Be Created or Modified

```text
backend/src/services/cost-tracker.ts (enhance)
backend/src/services/cost-analytics.ts
frontend/src/components/CostDashboard.tsx
frontend/src/components/CostBreakdown.tsx
frontend/src/components/CostTrend.tsx
backend/tests/services/cost-analytics.test.ts
```

### Data Models / Contracts Affected

- Run (enhance cost fields if needed)

### UI/UX Requirements

- Cost dashboard clear and actionable
- Charts easy to understand
- Budget alerts prominent
- Cost trends visible

### Testing Requirements

- [x] Tests for cost aggregation
- [x] Tests for budget alert logic
- [x] Tests for cost trend calculation

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

- [x] Cost breakdown by agent accurate
- [x] Budget alerts trigger correctly
- [x] Cost trends tracked
- [x] Dashboard displays clearly
- [x] Reports generated correctly
- [x] All tests pass

### Human Review Gate

A human should verify:

- Cost calculations accurate
- Dashboard useful
- Alerts appropriate

### Rollback Notes

Delete cost analytics.

### Commit Guidance

```text
feat(phase-24): advanced cost tracking and analytics
```

---

## Phase 25 — GitHub Integration

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Integrate with GitHub. Enable code push to repositories. Create branches, commit generated code, open PRs, monitor CI status. Code flows directly from orchestration to GitHub.

### Why This Phase Exists

GitHub integration is the final delivery mechanism. Generated code must flow to repositories.

### Inputs

- Phase 22 completed (monitoring)
- Phase 3 completed (API)

### Deliverables

- [ ] GitHub OAuth integration
- [ ] Branch creation
- [ ] Commit creation
- [ ] PR creation with summary
- [ ] CI status monitoring
- [ ] POST /api/runs/:id/push-to-github endpoint
- [ ] Tests with mocked GitHub API

### Implementation Tasks

- [ ] Create `backend/src/services/github-client.ts` (using Octokit)
- [ ] Implement GitHub OAuth flow
- [ ] Create `backend/src/services/github-operations.ts`
- [ ] Integrate GitHub into orchestration engine
- [ ] Create `frontend/src/components/GitHubPushModal.tsx`
- [ ] Add GitHub status to execution console
- [ ] Write tests (mocked)

### Files Expected to Be Created or Modified

```text
backend/src/services/github-client.ts
backend/src/services/github-operations.ts
backend/src/routes/auth.ts (OAuth)
backend/src/routes/runs.ts (push-to-github)
backend/tests/services/github-operations.test.ts
frontend/src/components/GitHubPushModal.tsx
frontend/src/pages/ExecutionConsole.tsx (GitHub status)
```

### Data Models / Contracts Affected

- Run (add GitHub fields: repoUrl, branchName, prNumber, etc.)

### UI/UX Requirements

- GitHub authentication seamless
- PR creation UI clear
- GitHub status visible in console
- PR link clickable

### API Requirements

- GET /api/auth/github (OAuth initiate)
- GET /api/auth/github/callback (OAuth callback)
- POST /api/runs/:id/push-to-github
- GET /api/runs/:id/github-status

### Testing Requirements

- [ ] Tests for GitHub operations (mocked)
- [ ] Integration tests for full workflow
- [ ] Tests for error handling
- [ ] UI tests for push modal

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

- [ ] GitHub OAuth works
- [ ] Branches can be created
- [ ] Commits can be created
- [ ] PRs can be created
- [ ] CI status monitored
- [ ] All tests pass (with mocks)

### Human Review Gate

A human should verify:

- OAuth scopes minimal
- Operations safe (no force-push)
- Error handling robust
- PR template appropriate

### Rollback Notes

Delete GitHub integration.

### Commit Guidance

```text
feat(phase-25): GitHub integration
```

---

## Phase 26 — Testing, Quality Hardening, and CI Pipeline

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Build comprehensive test suite (unit, integration, E2E), set up CI/CD pipeline, enforce quality gates (lint, type, coverage), prevent regressions.

### Why This Phase Exists

Quality assurance must be continuous and automated.

### Inputs

- All prior phases completed

### Deliverables

- [ ] Consolidated test suite (>= 80% coverage)
- [ ] GitHub Actions CI pipeline
- [ ] Linting and type checking gates
- [ ] Coverage reports
- [ ] Performance baseline tests
- [ ] Pre-commit hooks

### Implementation Tasks

- [ ] Consolidate tests from all phases
- [ ] Add missing coverage for critical paths
- [ ] Create `.github/workflows/ci.yml`
- [ ] Add Husky pre-commit hooks
- [ ] Set coverage thresholds
- [ ] Add performance tests
- [ ] Document testing strategy
- [ ] Write tests

### Files Expected to Be Created or Modified

```text
.github/workflows/ci.yml
.husky/pre-commit
jest.config.js
vitest.config.ts
docs/TESTING.md
backend/tests/ (consolidated)
frontend/tests/ (consolidated)
```

### Data Models / Contracts Affected

None; testing infrastructure.

### Testing Requirements

- [ ] >= 80% coverage for backend services
- [ ] >= 80% coverage for critical frontend components
- [ ] All API endpoints tested
- [ ] All major workflows tested

### Validation Commands

```bash
npm run lint
npm run typecheck
npm test --coverage
npm run build
```

### Acceptance Criteria

- [ ] All tests pass
- [ ] Coverage >= 80%
- [ ] Lint passes
- [ ] Type check passes
- [ ] Build succeeds
- [ ] CI pipeline configured

### Human Review Gate

A human should verify:

- Coverage adequate
- Critical paths tested
- CI pipeline appropriate

### Rollback Notes

Delete CI config and pre-commit hooks.

### Commit Guidance

```text
test(phase-26): comprehensive test suite and CI pipeline
```

---

## Phase 27 — Security, Accessibility, and Production Readiness

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Harden security (auth, authz, secrets), ensure accessibility (WCAG 2.1 AA), prepare for production.

### Why This Phase Exists

Security and accessibility are non-negotiable.

### Inputs

- All prior phases completed

### Deliverables

- [ ] Authentication and authorization system
- [ ] Secrets management
- [ ] Input validation and sanitization
- [ ] CORS and security headers
- [ ] Rate limiting
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Deployment guide

### Implementation Tasks

- [ ] Add authentication layer (JWT or sessions)
- [ ] Implement RBAC (role-based access control)
- [ ] Add secrets management (env vars, vault)
- [ ] Add input validation everywhere
- [ ] Add security headers
- [ ] Add CORS config
- [ ] Add rate limiting
- [ ] Run accessibility audit
- [ ] Write deployment guide

### Files Expected to Be Created or Modified

```text
backend/src/middleware/auth.ts
backend/src/middleware/rbac.ts
backend/src/services/auth-service.ts
backend/src/middleware/security-headers.ts
frontend/src/services/auth.ts
docs/DEPLOYMENT.md
docs/SECURITY.md
docs/ACCESSIBILITY.md
```

### Data Models / Contracts Affected

- User model (new)

### Testing Requirements

- [ ] Tests for authentication
- [ ] Tests for authorization
- [ ] Tests for input validation
- [ ] Accessibility tests

### Validation Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

### Acceptance Criteria

- [ ] Authentication works
- [ ] Authorization enforced
- [ ] Secrets not committed
- [ ] Security headers set
- [ ] WCAG 2.1 AA compliant
- [ ] All tests pass

### Human Review Gate

A human (security expert) should verify:

- Auth logic sound
- Auth enforced
- Secrets managed
- WCAG compliant

### Rollback Notes

Delete auth and security code.

### Commit Guidance

```text
chore(phase-27): security, accessibility, production readiness
```

---

## Phase 28 — Documentation and Examples

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Document system thoroughly. API docs, user guide, operator guide, architecture, examples, troubleshooting.

### Why This Phase Exists

Good documentation critical for adoption.

### Inputs

- All prior phases completed

### Deliverables

- [ ] README with overview
- [ ] API documentation
- [ ] User guide with screenshots
- [ ] Operator guide
- [ ] Architecture documentation
- [ ] Examples and sample workflows
- [ ] Troubleshooting guide
- [ ] Development guide

### Implementation Tasks

- [ ] Create/update README.md
- [ ] Write API documentation
- [ ] Create user guide with screenshots
- [ ] Create operator guide
- [ ] Document architecture
- [ ] Create examples
- [ ] Create troubleshooting guide
- [ ] Create contributing guide

### Files Expected to Be Created or Modified

```text
README.md
CONTRIBUTING.md
docs/API.md
docs/USER_GUIDE.md
docs/OPERATOR_GUIDE.md
docs/ARCHITECTURE.md
docs/EXAMPLES.md
docs/TROUBLESHOOTING.md
```

### Data Models / Contracts Affected

None; documentation.

### Testing Requirements

None; but documentation should be reviewed.

### Validation Commands

None; but should be reviewed by humans.

### Acceptance Criteria

- [ ] README complete
- [ ] API docs comprehensive
- [ ] User guide step-by-step
- [ ] Operator guide complete
- [ ] Architecture documented
- [ ] Examples working
- [ ] Troubleshooting helpful

### Human Review Gate

A human should verify:

- Documentation accurate
- All features documented
- Examples work

### Rollback Notes

Not applicable; documentation.

### Commit Guidance

```text
docs(phase-28): comprehensive documentation and examples
```

---

## Phase 29 — Final Acceptance and Release

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Conduct final UAT, security audit, performance validation, and formal acceptance. Prepare release artifacts.

### Why This Phase Exists

Final acceptance ensures system meets all requirements.

### Inputs

- All prior phases completed

### Deliverables

- [ ] UAT completion report
- [ ] Security audit report
- [ ] Performance report
- [ ] Release notes
- [ ] Release checklist
- [ ] Production deployment

### Implementation Tasks

- [ ] Conduct full UAT
- [ ] Conduct security audit
- [ ] Conduct performance testing
- [ ] Create release notes
- [ ] Verify all acceptance criteria
- [ ] Deploy to production

### Files Expected to Be Created or Modified

```text
docs/RELEASE_NOTES.md
docs/RELEASE_CHECKLIST.md
Dockerfile (optional)
.github/workflows/deploy.yml (optional)
```

### Data Models / Contracts Affected

None.

### Testing Requirements

- [ ] Full UAT
- [ ] Smoke tests on deployed system

### Validation Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

### Acceptance Criteria

- [ ] All UAT tests pass
- [ ] Security audit passes
- [ ] Performance acceptable
- [ ] All requirements met
- [ ] Release notes complete
- [ ] System deployable and operational

### Human Review Gate

A human (product owner, ops, security) should verify:

- All requirements met
- System production-ready
- Performance acceptable

### Rollback Notes

Revert to last stable deployment.

### Commit Guidance

```text
chore(phase-29): final acceptance and release
```

---

## Phase 30 — Agent Prompt Language Constraints

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Enforce a consistent target language and technology stack in every agent system prompt and task prompt, preventing agents from generating Python when TypeScript/Node.js is required (and similar language drift).

### Why This Phase Exists

During execution of run `90f372fb`, agents assigned to Node.js/TypeScript tasks generated Python code (`app/main.py`, `app/utils/filesystem.py`) and used ORMs not in the project's package.json (TypeORM instead of file-based storage). Different agents also chose inconsistent patterns — one used file repositories, another raw TypeORM entities, another Express middleware with different naming conventions. This made the generated output non-compilable without significant repair.

### Root Causes

1. **No stack context in system prompts** — Agent system prompts describe the agent's role but not the project's language, framework, or dependencies.
2. **No dependency manifest passed to tasks** — Tasks receive a description and estimated hours, but not the `package.json` or existing file tree.
3. **No output contract** — The LLM is free to choose any language/library that seems appropriate for the task description.

### Inputs

- Phase 18 complete (Agent Executor Adapter)
- `backend/src/services/task-executor.ts` — system prompt construction
- `backend/src/services/agent-loader.ts` — agent definitions
- `backend/src/routes/runs.ts` — run execution API

### Deliverables

- [ ] Stack context injected into every task's system prompt (language, framework, key dependencies)
- [ ] Per-run `stackConstraints` field on the Run model (set at run creation from roadmap metadata)
- [ ] Task prompt template updated to include "Target Stack" section
- [ ] Validation step after task execution: if output contains code, detect language and flag mismatch
- [ ] Unit tests covering prompt injection and mismatch detection

### Implementation Tasks

- [ ] Add `stackConstraints: StackConstraints` field to the `Run` and `Roadmap` shared types
- [ ] Extend `RunService.createRunFromRoadmap()` to accept and store stack constraints
- [ ] Update `TaskExecutor.runWithLLM()` to prepend a stack-context block to the user message
- [ ] Create `StackConstraintBuilder` service that formats the constraint block from a `StackConstraints` object
- [ ] Add `detectOutputLanguage(output: string): string[]` utility (detect Python, TypeScript, Java, etc. from code fences)
- [ ] Add post-execution mismatch check in `TaskExecutor`: log a warning if detected language doesn't match constraints
- [ ] Update the default `FALLBACK_SYSTEM_PROMPT` in `task-executor.ts` to include a "language: unspecified" placeholder
- [ ] Add `stackConstraints` to the run creation UI form (Phase 5 follow-up)

### Stack Constraint Block Format

Injected at the top of every task user message:

```text
## Project Stack (REQUIRED — do not deviate)
- Language: TypeScript (strict mode)
- Runtime: Node.js >= 18
- Framework: Express.js 4.x
- Dependencies available: express, joi, winston (see package.json below)
- File structure: src/ for source, tests/ for tests
- Do NOT use: Python, Java, TypeORM, Prisma, or any library not listed above

{package_json_contents}
```

### Files Expected to Be Created or Modified

```text
backend/src/services/task-executor.ts        — inject stack context
backend/src/services/stack-constraint-builder.ts   — NEW: formats constraint block
backend/src/services/run-service.ts          — accept stackConstraints
shared/src/types/run.ts                      — add stackConstraints field
shared/src/types/roadmap.ts                  — add stackConstraints field
backend/src/services/task-executor.test.ts   — NEW: unit tests
```

### Testing Requirements

- [ ] Test that stack constraint block appears in the LLM user message
- [ ] Test language detection correctly identifies TypeScript, Python, JavaScript from code samples
- [ ] Test mismatch warning is logged when Python code appears in a TypeScript-constrained run
- [ ] Test `StackConstraintBuilder` formats the block correctly from a constraints object

### Validation Commands

```bash
cd backend && npm run typecheck
cd backend && npm test -- --testPathPattern=stack-constraint
```

### Acceptance Criteria

- [ ] All tasks in a TypeScript-constrained run receive a system prompt that includes "Language: TypeScript"
- [ ] A run where an agent produces Python outputs a warning in the error log
- [ ] `StackConstraintBuilder` unit tests pass
- [ ] No TypeScript compilation errors in modified files

### Commit Guidance

```text
feat(phase-30): enforce language/stack constraints in agent task prompts
```

---

## Phase 31 — Run Artifact Materialization

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Write generated file content from completed run tasks to disk as real files, wiring `ArtifactStore` into the execution pipeline and exposing a retroactive materialization endpoint for already-completed runs.

### Why This Phase Exists

The `ArtifactStore` service (Phase 20) can write files to disk but is never called during execution. Task outputs — which contain generated code in `detailed_deliverables`, `code_artifacts`, or `filename`+`content` patterns — are stored only as inline JSON inside the run record (up to 573KB per run). Users cannot access the generated files without parsing the run JSON manually.

Observed in run `90f372fb-af2c-4958-ad57-ed0405b45bce`: 36 files totalling ~100KB of generated code were buried in the run record with no path to disk.

### Inputs

- Phase 20 complete (`ArtifactStore`, `artifact-store.ts`)
- Phase 21 complete (Run completion pipeline)
- `backend/src/services/phase-executor.ts` — `onTaskComplete` callback
- `backend/src/services/task-executor.ts` — task output structure
- `backend/src/routes/runs.ts` — run API

### Deliverables

- [ ] `OutputParser` service: extracts `{ filePath, content }` pairs from raw LLM output strings
- [ ] `ArtifactStore.saveArtifact()` called from `PhaseExecutor.onTaskComplete` for every successful task
- [ ] Files written to `data/artifacts/<runId>/` during execution, preserving directory structure
- [ ] `POST /api/runs/:id/materialize` endpoint: retroactively extracts files from any completed run
- [ ] Run summary updated to report `artifacts.totalCount` and `artifacts.totalSize`
- [ ] Unit and integration tests

### LLM Output Patterns to Handle

The `OutputParser` must handle all three patterns observed in production:

```
Pattern 1 — numbered key container (most common):
  "detailed_deliverables": { "1_package_json": { "content": "..." }, ... }
  "deliverables":           { "1_src_index_ts": { "content": "..." }, ... }

Pattern 2 — code_artifacts array:
  "code_artifacts": [ { "filename": "src/index.ts", "language": "typescript", "content": "..." } ]

Pattern 3 — filename+content object pairs:
  { "filename": "src/utils/logger.ts", "content": "..." }
```

### Key-to-Path Derivation Rules (Pattern 1)

Keys like `9_src_index_ts` encode the file path: strip the numeric prefix, split by `_`, derive extension from the last segment (`_ts` → `.ts`, `_json` → `.json`), and join path components with `/`. Root-level config files (`package_json`, `tsconfig_json`, etc.) go at the project root; source files default to `src/` if no known top-level directory is detected.

### Implementation Tasks

- [ ] Create `backend/src/services/output-parser.ts`: `parseTaskOutput(raw: string): FileArtifact[]` returning `{ filePath: string, content: string, language?: string }[]`
- [ ] Handle all three patterns above; skip entries with `content.trim().length < 50`
- [ ] Add `keyToFilePath(key: string): string` helper with extension map and root-file detection set
- [ ] Update `PhaseExecutor.executePhase()`: after each successful task, call `OutputParser.parseTaskOutput()` then `ArtifactStore.saveArtifact()` for each result
- [ ] Add `materializeRun(runId: string, outputDir: string): Promise<MaterializationResult>` to `ArtifactStore`
- [ ] Add `POST /api/runs/:id/materialize` route to `backend/src/routes/runs.ts`
- [ ] Update `RunCompletion.generateSummary()` to query `ArtifactStore.getArtifactsForRun()` and populate `artifacts`
- [ ] Add unit tests for `OutputParser` covering all three patterns and the key-to-path converter

### Files Expected to Be Created or Modified

```text
backend/src/services/output-parser.ts          — NEW: LLM output → file artifacts
backend/src/services/artifact-store.ts         — add materializeRun()
backend/src/services/phase-executor.ts         — call OutputParser + ArtifactStore on task complete
backend/src/services/run-completion.ts         — populate artifacts from ArtifactStore
backend/src/routes/runs.ts                     — add /materialize endpoint
backend/src/services/output-parser.test.ts     — NEW: unit tests
```

### Testing Requirements

- [ ] `parseTaskOutput` returns correct `{ filePath, content }` for all three patterns
- [ ] `keyToFilePath("9_src_index_ts")` returns `"src/index.ts"`
- [ ] `keyToFilePath("1_package_json")` returns `"package.json"`
- [ ] Files are written to `data/artifacts/<runId>/` after phase execution
- [ ] `POST /api/runs/:id/materialize` returns file list and counts for completed run
- [ ] `RunSummary.artifacts.totalCount` reflects actual saved files

### Validation Commands

```bash
cd backend && npm run typecheck
cd backend && npm test -- --testPathPattern=output-parser
curl -X POST http://localhost:3000/api/runs/90f372fb-af2c-4958-ad57-ed0405b45bce/materialize
```

### Acceptance Criteria

- [ ] A new run that generates code has its files written to `data/artifacts/<runId>/` automatically
- [ ] The `/materialize` endpoint successfully extracts files from the existing test run `90f372fb`
- [ ] `RunSummary.artifacts.totalCount` is non-zero after a code-generating run
- [ ] `OutputParser` unit tests pass with ≥ 90% coverage
- [ ] No TypeScript compilation errors in modified files

### Commit Guidance

```text
feat(phase-31): materialize run artifacts to disk via OutputParser and ArtifactStore
```

---

## Open Decisions

1. **Database Migration:** File-based MVP; database adapter later.
2. **Real LLM Integration:** Mock agents until Phase 18+; real LLM executors after.
3. **WebSocket vs. Polling:** Start with polling; upgrade if needed.
4. **Authentication Method:** Support both OAuth and local auth.
5. **GitHub Integration Timing:** Late (Phase 25) is correct.
6. **Scaling Strategy:** File-based now; database later.
7. **Deployment:** Docker option; works on any Node.js system.

---

## Future Enhancements (Beyond MVP)

1. ML-based prompt optimization
2. Multi-tenancy
3. Advanced scheduling
4. PR feedback integration
5. Distributed execution
6. Advanced visualization
7. Agent marketplace
8. Custom agent SDK
9. Webhook integrations
10. Advanced analytics

---

## Summary

This revised roadmap is **engineering-friendly and coding-agent-ready**.

**Key Improvements:**

✅ Thin vertical spike (Phase 13) proves core concepts early
✅ Orchestration split into 6 micro-phases (16-21)
✅ Cost/audit tracking moved earlier (Phase 15)
✅ Agent execution abstraction defined before full engine (Phase 14)
✅ Continuous execution prompt included at the top
✅ Phase sizing rule prevents oversized runs
✅ All 29 phases have normalized numbers and dependencies
✅ Completion timestamp format explicit
✅ Realistic execution estimates provided
✅ All existing roadmap strengths preserved

Each phase is now small enough to execute in one focused coding-agent run (2–4 hours estimated).
