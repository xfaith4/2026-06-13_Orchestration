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
backend slices for both already being implemented. **Before treating a phase as done or
missing, check the actual code and tests — not the status label.**

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
If ports conflict, `scripts/ensure-port-free.mjs` handles reassignment.

## History: the "separate orchestrator" — corrected

Earlier docs described driving this app's roadmap from an external PowerShell orchestrator.
The actual orchestrator lives at a sibling path (`AI Projects\RoadmapOrchestrator`), has
its own `orchestrator\Invoke-RoadmapOrchestrator.ps1`, and writes per-phase agent output
into this repo's `.orchestration/agent_io/` and `.orchestration/capsules/` when pointed at
this repo via `-RepoRoot`. Those directories are currently empty — no successful run has
completed against this checkout. Recent phase work (e.g. Phase 30/31) was done directly
by coding-agent sessions, not the external orchestrator.

This repo is also checked out at more than one local path/drive letter (`F:\` and `G:\`,
different commits, same GitHub remote). Don't hardcode absolute drive-lettered paths.

## Reference Files

- `ROADMAP.md` — phase plan (status labels unreliable, see above). Priority Track: Phases 32–37.
- `docs/PLATFORM_GUIDANCE.md` — formal orchestration principles, 5-agent architecture, meta-orchestration algorithm
- `docs/PULL_FORWARD_FROM_UNIFIEDAITOOLBOX.md` — audit of the mature sibling project: what to port
- `docs/MODEL_ROUTING_BASELINE.md` — model-to-role research + bake-off results
- `docs/AGENT_ARCHITECTURE_LANDSCAPE.md` — industry reality (single-agent + scaffolding wins)
- `docs/bakeoff/dashboard.html` + `docs/bakeoff/results.json` — bake-off dashboard
- `docs/ORCHESTRATION_SYNTHESIS.md` — root cause analysis: stub problem + fix approach
- `docs/EVIDENCE_SPINE_DESIGN.md` — event schema design for Phases 32–37 and beyond
- `docs/ORCHESTRATION_HARDENING.md` — 7 hardening measures implemented (task acceptance, state transitions, etc.)
- `docs/HARDENING_COMPLETION.md` — completion record: 419 tests passing after hardening
- `docs/testing/MINIMAL_VIABLE_TEST_CASE.md` — Hello World API spec: definition of a successful run
- `docs/testing/MINIMAL_VIABLE_TEST_CASE_APPENDIX.md` — expected file tree + test assertions
- `BUILD_SPECIFICATION.md` — detailed requirements/architecture spec
- `LessonsLearnedKnowledge/knowledge_base.json` — insights from past runs
- `agents/AGENT_DEFINITIONS.md` — five specialized agent contracts (runtime-loaded)

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
