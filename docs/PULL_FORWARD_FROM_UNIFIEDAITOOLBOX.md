# Pull-Forward Audit: UnifiedAIToolbox → 2026-06-13_Orchestration

> Researched 2026-06-28. Four-layer audit of the mature `UnifiedAIToolbox` (PowerShell/Python)
> to find success-enabling orchestration mechanisms the TS rewrite dropped. Goal: reach a
> SUCCESSFUL, diagnosable orchestration run (precondition for validating multi- vs single-agent).

## The reframe (most important finding)

UnifiedAIToolbox already hit, diagnosed, and largely solved the failure modes the bake-off
rediscovered. Its own conclusion after ~a year (`docs/ROADMAP.md` RM-014):
> "the limiting factor is no longer design — it is evidence. Failures … arrive unstructured,
> uncorrelated, and tail-only … guesswork, not evidence."

That is the bake-off signature ("fails across all styles, can't tell why"). The path to a
successful run is porting the grounding + contract-enforcement + evidence spine — NOT a new
agent arrangement. In one case the rewrite *regressed* (dropped cross-agent IO wiring).

## Tier 1 — get to a run that succeeds AND is diagnosable (port first)

1. **Repo grounding + baseline** — `supervisor/repo_context_builder.ps1`, `supervisor/maintenance_gates.ps1`,
   `contracts/repo_context_schema.v1.json`. Scan repo → run build/tests to establish a GREEN BASELINE →
   typed `repo_context.json` → gate on it. Fixes non-convergent repair (distinguishes "I broke it" vs
   "already broken") and weak grounding. **Not in rewrite.** Highest priority.
2. **Shared field vocabulary + ConceptualModelContract spine** — `Orchestration/agents/agent-library.json`
   (`inputs[]/outputs[]` with `source_agent`/`consumed_by`/`io_reference`), CMC agent + traceability
   reconciliation in `POF.ps1` (`Resolve-CriticTraceabilityAgainstEngineer`). Direct fix for INTERFACE
   DRIFT (bake-off #1 failure). **Regressed** — the YAML conversion flattened the wiring to self-contained
   io_contract and dropped the cross-agent edges.
3. **Evidence spine + lifecycle invariants** — `CLAUDE.md`, `docs/contracts/RUN_LIFECYCLE.md`,
   `docs/contracts/EVENT_TAXONOMY.md`. Canonical `events.jsonl` (13 event types), 8-status lifecycle,
   **orchestrator-only status authority**, **execution-state ≠ quality-outcome**, **terminal honesty guard**
   (no materialized app ⇒ failed, never completed). Treat `CLAUDE.md` "preserve these invariants" as a spec.

## Tier 2 — make runs reliable

4. **Wire the vendored contracts** — `supervisor/contract_compiler.ps1`, `job_types.json`,
   `supervisor/job_router.ps1`. Request→contract hardening (merge job-type defaults, re-validate strict
   schema, refuse to start if incomplete) + job-type roster/required-forbidden-stage casting. Fixes
   planning failures. The vendored `build_app_*`/`maintenance_*` schemas are currently INERT without this.
5. **Signature-aware, planner-first repair** — `contracts/failure_treatment_policy.v1.json` (vendored, inert).
   Replace blind `MAX_REPAIR_ATTEMPTS=3` with `max_same_failure_signature`, required `plan_delta`
   (no progress ⇒ stop), escalation (Supervisor→Commissioner→Human). Carry attempt history forward.
6. **Typed gates + sequencing + isolation** — `engine/GatePolicy.psm1` (PASS/FAIL/RETRY with reason
   injected into retry), `engine/WorktreeExecutor.psm1` (per-worker isolation + quarantine on merge
   conflict), `POF.ps1` producer-then-reviewer batching (reviewer never runs blind). Also DAG integrity
   gate (`engine/Run-Orchestration.ps1` `Get-PlanWaves`/`Test-PlanIntegrity`) that rejects bad plans pre-run.

## Tier 3 (later)
LLM-rubric value scoring (port the loop shape of `Improve-ValueScore.ps1`, replace keyword scorer),
searchable run history (`RunStore.psm1` SQLite/FTS5), quality-trend metrics (`Update-OrchestrationMetrics.psm1`).

## Leave as legacy (do NOT pull forward)
- 5-agent POF design in `Orchestration/.github/copilot-instructions.md` (superseded by 11-agent pipeline)
- Desktop apps / duplicate dashboards (`OrchestrationDesktop`, `PromptRefiner`, `apps/dashboard`) — removed per `SIMPLIFICATION_REPORT.md`
- PyTorch/ML deps, 7-tech/5-package-manager sprawl
- `MilestoneController.ps1` shim ("add NO logic"); `orchestration_pipeline.prompt.yml` (`mode: eval_only`)
- SQLite RunStore as priority (ops/forensics, not success-enabling); CI/dashboard workflows; ContextResolver; route-backfill specifics; Codex swarm path

## Why this answers the real question
Multi-vs-single can't be settled while no arrangement succeeds. Tier 1 turns runs from "failed,
unknown why" into "succeeded, or failed at a NAMED component." Then the bake-off becomes a real
experiment. Sources: full per-layer audits captured in session; key mature-repo paths above.
