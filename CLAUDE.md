# CLAUDE.md — UnifiedAIToolbox Application

**UnifiedAIToolbox** is a multi-agent orchestration platform that:
- Takes application intake requests (plain language)
- Generates design plans and component roadmaps
- Orchestrates multi-agent teams to build the application
- Manages approval gates and design reviews
- Produces a fully-functional application

This repo is a self-contained npm-workspace monorepo. It is **not** built/managed by an
external orchestrator tool day-to-day — see "History: the separate orchestrator" below
for why older docs in this repo claim otherwise, and what's actually true.

## Architecture

- `backend/` — Express + TypeScript API (`src/routes/`, `src/services/`, `src/middleware/`)
- `frontend/` — React 18 + TypeScript + Vite (`src/pages/`, `src/components/`, `src/stores/`)
- `shared/` — Shared types/schemas, consumed by both as `@unifiedaitoolbox/shared`
- `data/` — Runtime persistence root (applications, design-plans, roadmaps, runs,
  audit-logs, error-logs, artifacts, etc.). This is where live app state actually
  lives — not `.orchestration/`.
- `agents/`, `contracts/`, `lib/`, `Prompts/`, `LessonsLearnedKnowledge/` — pre-existing
  assets the platform loads/serves at runtime (agent definitions, A2A contract schemas,
  legacy JS run-tracking libs, historical prompt/run artifacts, a knowledge base)
- `.orchestration/agent_io/`, `.orchestration/capsules/` — output dirs for an *external*
  orchestrator tool (see below). Currently empty in this checkout; leave them in place.

## Roadmap & current phase — verify, don't trust labels

`ROADMAP.md` is the authoritative phase plan, but its `**Status:**` labels are known to
be stale and out of order: Phases 1–15 read "Not Started" despite corresponding
backend/frontend code already existing, while Phases 30–31 read "Not Started" despite
backend slices for both already being implemented (see the 2026-06-20 session notes in
`progress.md` / `findings.md`). **Before treating a phase as done or missing, check the
actual code and tests — not the status label.**

`ROADMAP_CRITICAL_PATH.md`, `BASELINE_REPORT.md`, `ASSET_MIGRATION_STATUS.md`, and
`PHASE_8_STRATEGIC_EVALUATION.md` are point-in-time snapshots from an earlier roadmap
draft — their phase numbering/titles don't match current `ROADMAP.md`. Treat them as
history, not live references.

`task_plan.md`, `findings.md`, and `progress.md` at the repo root are working-memory
scratch files recreated by coding-agent sessions (a planning-files convention) — useful
for recent session history, not a permanent spec.

## Development

```bash
npm install        # installs all workspaces (backend, frontend, shared)
npm run dev         # backend :3007 + frontend :5176
npm run build
npm test
npm run lint
npm run typecheck   # currently fails repo-wide: unresolved @unifiedaitoolbox/shared
                     # imports plus pre-existing strict-mode errors unrelated to any
                     # single phase (known issue, not something a small change caused)
```

Or run `start.bat` — installs deps if missing, opens backend + frontend in separate
windows, then opens `http://localhost:5176`.

Ports are **3007 (backend) / 5176 (frontend)**, per `.env.example` and `start.bat`.
`PORT_CONFIGURATION.md` documents an older 3001/5174 pair and is stale. If ports
conflict, `scripts/ensure-port-free.mjs` handles reassignment.

## History: the "separate orchestrator" — corrected

Earlier docs in this repo (`PROJECT_SEPARATION.md`, and the prior version of this file)
describe driving this app's roadmap from an external PowerShell orchestrator at:

```
g:\Development\20_Staging\2026-06-13_RoadmapOrchestrator
```

**That path does not exist** — it conflates this repo's own folder name
(`2026-06-13_Orchestration`) with a different, real project. The actual orchestrator
lives at a sibling path:

```
g:\Development\20_Staging\AI Projects\RoadmapOrchestrator
```

It has its own `orchestrator\Invoke-RoadmapOrchestrator.ps1`, `agents/`, and
`.orchestration/` state schema. When pointed at this repo via `-RepoRoot`, it writes
per-phase agent output into *this* repo's `.orchestration/agent_io/` and
`.orchestration/capsules/` — which is why those directories exist here but are
currently empty: no successful run has completed against this checkout yet.

In practice, recent phase work in this repo (e.g. Phase 30/31) was done directly by
coding-agent sessions working in this repo against `ROADMAP.md`, not by the external
orchestrator. Don't assume the orchestrator is actively driving this repo's state
unless you've confirmed it's actually being run.

This repo is also checked out at more than one local path/drive letter (both
`F:\...\2026-06-13_Orchestration` and `G:\...\2026-06-13_Orchestration` exist, at
different commits — same GitHub remote, different checkouts). Don't hardcode
absolute drive-lettered paths in docs; that's exactly how the broken path above
happened.

## Reference Files

- `ROADMAP.md` — phase plan (status labels unreliable, see above). **Now carries a
  "Priority Track: Reach a Successful Run" (Phases 32–37) as the critical path.**
- `docs/PULL_FORWARD_FROM_UNIFIEDAITOOLBOX.md` — audit of the mature sibling `UnifiedAIToolbox`
  project: success-enabling mechanisms to port (grounding/baseline, contract enforcement,
  evidence spine) and what to leave as legacy
- `docs/MODEL_ROUTING_BASELINE.md` — model-to-role research + the bake-off results
- `docs/AGENT_ARCHITECTURE_LANDSCAPE.md` — industry/research reality (single-agent + scaffolding
  wins; multi-agent fan-out mostly fails at app-building)
- `docs/bakeoff/dashboard.html` + `docs/bakeoff/results.json` — the standalone bake-off dashboard
- `docs/AGENT_CONTRACTS` is surfaced in the UI Contracts page (agent I/O) + a Governance tab
  reading `contracts/*.json` via `GET /api/governance-contracts`
- `BUILD_SPECIFICATION.md` — detailed requirements/architecture spec
- `LessonsLearnedKnowledge/knowledge_base.json` — insights from past runs
- `Prompts/` — historical prompt/run artifacts from past orchestration attempts
- `PROJECT_SEPARATION.md` — historical doc; the orchestrator path inside it is wrong
  (see "History" above)

## Session handoff (2026-06-28) — where the work stands and why

Recent sessions established, with evidence, that **orchestration does not yet produce a
working application in any agent arrangement**, and pivoted the plan toward fixing that
before any feature work or any multi-vs-single-agent comparison.

What was learned (full detail in the `docs/` files above):
- A controlled **bake-off** (`docs/bakeoff/`) ran uniform-Haiku, tiered, contract-first, and
  single-Opus arms against a real roadmap. **All four failed** — none produced a working app.
  Causes: cross-worker interface drift, planning failures, non-convergent repair.
- A **validator bug was found and fixed** (`project-validator.ts` discarded `err.stdout`, so the
  repair loop never saw real tsc/vitest errors). This is real and benefits every run.
- An **audit of the mature sibling `UnifiedAIToolbox`** project found it had already diagnosed and
  largely solved these failures; its conclusion: the blocker is *evidence & grounding, not the
  agent arrangement*. The TS rewrite even **regressed** by dropping cross-agent IO wiring.
- The **Contracts UI** was implemented (agent I/O + a Governance tab over `contracts/*.json`).

The plan (now in `ROADMAP.md` Priority Track, Phases 32–37, in order):
32 Evidence spine + lifecycle invariants (**start here**) → 33 green baseline before repair →
34 shared-contract/traceability spine (anti-drift) → 35 wire vendored contracts (compiler +
casting) → 36 signature-aware planner-first repair → 37 typed gates + sequencing + isolation.

Rationale in one line: make runs **succeed-or-fail-at-a-named-component** first; only then is
"multi-agent vs single-agent for app building" an answerable question.
