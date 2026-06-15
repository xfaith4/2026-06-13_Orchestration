# Web-Based Multi-Agent Orchestration Platform — Implementation Roadmap (Revised)

**Roadmap Version:** 2.0 (Revised for Coding-Agent Execution)
**Last Updated:** 2026-06-14
**Target Completion:** Q3 2026
**Status:** Ready for Incremental Coding-Agent Execution

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
| Agent Definitions | agents/*.yaml, *.json | data/agents/ (loaded at runtime) | Normalize and migrate | Core to orchestration engine | Phase 10 |
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

* Prompt Workspace may become:
  - Prompt CRUD API
  - Prompt Editor UI
  - Prompt Versioning
  - Prompt Testing Interface
  - Prompt Comparison View

* GitHub Integration may become:
  - GitHub OAuth Configuration
  - Repository/Branch Operations
  - Commit and PR Creation
  - CI Status Monitoring
  - Safety Confirmations and Audit

* Execution Console may become:
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
| 0 | Repository Baseline & Verification | Understand current state | Not Started | |
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
| 16 | Run State Machine | State transition logic | Not Started | |
| 17 | Task Execution Queue | Queue and scheduling | Not Started | |
| 18 | Agent Executor Adapter | Pluggable agent execution | Not Started | |
| 19 | Contract-Gated Handoffs | Validate at handoff points | Not Started | |
| 20 | Artifact Persistence & Run Outputs | Store and retrieve artifacts | Not Started | |
| 21 | Execution Summary & Completion | Run summary and closure | Not Started | |
| 22 | Execution Console & Live Monitoring | Real-time monitoring UI | Not Started | |
| 23 | Failure Taxonomy & Repair Workflow | Classify and repair failures | Not Started | |
| 24 | Advanced Cost Tracking & Analytics | Detailed cost dashboards | Not Started | |
| 25 | GitHub Integration | OAuth, branches, PRs, CI | Not Started | |
| 26 | Testing, Quality Hardening, CI | Test suite and pipeline | Not Started | |
| 27 | Security, Accessibility, Production Ready | Auth, WCAG, hardening | Not Started | |
| 28 | Documentation & Examples | User and operator guides | Not Started | |
| 29 | Final Acceptance & Release | UAT, audit, release | Not Started | |

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

- [ ] Inventory of all agent definitions with status
- [ ] Inventory of all contract schemas with versions
- [ ] Assessment of existing lib files
- [ ] Confirmation of Node.js/npm availability
- [ ] Decision: preserve or refactor each asset
- [ ] **Asset Classification Table** (NEW: per Existing Asset Migration Policy)
- [ ] Assessment report documenting baseline state

### Implementation Tasks

- [ ] List all files in `agents/` directory, note format and status
- [ ] Read agent-library.active.json and agent-library.active2.json; compare
- [ ] List all files in `contracts/` and validate JSON schemas
- [ ] Read all contract files and document structure
- [ ] Inspect `lib/*.js` files and assess code quality
- [ ] Check for existing package.json in root or subdirectories
- [ ] Verify Node.js version (target: 18+) and npm version
- [ ] Look for existing test files or CI configuration
- [ ] Check for existing README or documentation
- [ ] Verify git repository status
- [ ] **NEW: Create Asset Classification Table** with columns: Asset | Current Location | Intended Future Location | Action | Rationale | Migration Phase
- [ ] **NEW: Classify all assets** per Existing Asset Migration Policy (Preserve, Normalize/Migrate, Refactor, Archive/Reference, Deprecate)
- [ ] **NEW: Document migration schedule** showing which assets are used by which phases

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

* [ ] Validate all JSON files in `contracts/` parse without errors
* [ ] Validate all YAML files in `agents/` parse without errors
* [ ] Confirm `lib/run-tracker.js` exports expected functions
* [ ] Confirm `lib/api-server.js` can start without errors

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

* [ ] All agent YAML/JSON files parse without errors
* [ ] All contract JSON files parse without errors
* [ ] Node.js version is 18 or higher
* [ ] npm version is 8 or higher
* [ ] All existing lib files are readable and functional
* [ ] Baseline report is complete and accurate
* [ ] Decision made: preserve or refactor each major asset
* [ ] **NEW: Asset Classification Table is complete** (all assets documented)
* [ ] **NEW: All assets assigned an action** (Preserve, Migrate, Refactor, Archive, Deprecate)
* [ ] **NEW: Migration schedule is clear** (know which phases use which assets)
* [ ] **NEW: ASSET_MIGRATION_STATUS.md is accurate** and matches Existing Asset Migration Policy

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
- [ ] Create `.env.example`
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

* [ ] Unit test framework installed (Vitest for frontend, Jest for backend)
* [ ] Sample test file created in each workspace
* [ ] `npm test` runs tests in both workspaces

### Validation Commands

```bash
npm run lint
npm run typecheck
npm run build
npm run dev
```

### Acceptance Criteria

* [ ] Both workspaces have dependencies installed
* [ ] TypeScript compiles without errors
* [ ] ESLint and Prettier pass
* [ ] `npm run dev` starts both servers
* [ ] Frontend runs on port 5173, backend on port 3000

### Human Review Gate

A human should verify:
- Tooling choices are appropriate
- Project structure is clean
- Dev server starts without warnings

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

* [ ] Unit tests for CRUD operations
* [ ] Tests for schema validation
* [ ] Integration tests for full cycle
* [ ] Test invalid data rejection

### Validation Commands

```bash
npm run typecheck
npm test
```

### Acceptance Criteria

* [ ] All TypeScript interfaces defined
* [ ] All JSON schemas parse correctly
* [ ] PersistenceService CRUD works
* [ ] SchemaValidator validates/rejects appropriately
* [ ] Indexes maintained correctly
* [ ] All tests pass

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

* [ ] Integration tests for POST (create)
* [ ] Integration tests for GET (list)
* [ ] Integration tests for GET :id (read)
* [ ] Integration tests for PUT (update)
* [ ] Integration tests for DELETE
* [ ] Tests for 404 on invalid IDs
* [ ] Tests for 400 on invalid input
* [ ] Tests for validation error messages

### Validation Commands

```bash
npm run typecheck
npm test
```

### Acceptance Criteria

* [ ] All 7 resource types have full CRUD API
* [ ] All endpoints validate input
* [ ] Response format is consistent
* [ ] Error messages are helpful
* [ ] HTTP status codes are correct
* [ ] All integration tests pass
* [ ] No TypeScript errors

### Human Review Gate

A human should verify:
- API response formats are consistent
- Error messages are helpful
- Status codes follow REST conventions
- All required endpoints exist

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

### Testing Requirements

* [ ] Unit tests for page components
* [ ] Unit tests for navigation routing
* [ ] Unit tests for API client error handling
* [ ] Accessibility audit (no critical issues)

### Validation Commands

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
```

### Acceptance Criteria

* [ ] Frontend loads without errors
* [ ] Navigation works
* [ ] Layout is responsive
* [ ] No TypeScript errors
* [ ] Accessibility audit passes
* [ ] Professional appearance

### Human Review Gate

A human should verify:
- UI appearance (colors, typography, spacing)
- Navigation usability
- Responsive design on multiple devices
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

### API Requirements

- POST /api/applications (already exists from Phase 3)
- GET /api/applications
- GET /api/applications/:id
- PUT /api/applications/:id
- DELETE /api/applications/:id

### Testing Requirements

* [ ] Unit tests for ApplicationIntakeForm
* [ ] Unit tests for form validation
* [ ] API integration tests
* [ ] E2E test for complete workflow

### Validation Commands

```bash
npm run typecheck
npm run lint
npm test
npm run dev
```

### Acceptance Criteria

* [ ] User can fill and submit form
* [ ] Form validates required fields
* [ ] Application is created
* [ ] Application appears in list
* [ ] User can view details
* [ ] User can edit application
* [ ] User can delete application
* [ ] All tests pass

### Human Review Gate

A human should verify:
- Form is intuitive
- All required fields present
- Validation appropriate
- Error messages helpful
- Professional appearance

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

* [ ] Unit tests for DesignPlanGenerator
* [ ] Integration tests for API
* [ ] UI tests for DesignPlanView

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
```

### Acceptance Criteria

* [ ] POST /api/design-plans generates plan
* [ ] Generated plan saved
* [ ] Plan can be retrieved
* [ ] UI displays plan
* [ ] All tests pass

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
- [ ] Create PUT /api/design-plans/:id/approve endpoint
- [ ] Create PUT /api/design-plans/:id/reject endpoint
- [ ] Create `frontend/src/pages/DesignPlanReview.tsx`
- [ ] Create `frontend/src/components/DesignPlanApprovalGate.tsx`
- [ ] Implement role-based access control
- [ ] Add approval history tracking
- [ ] Prevent roadmap generation from non-approved plans
- [ ] Write tests

### Files Expected to Be Created or Modified

```text
shared/types/index.ts (DesignPlan: add approval fields)
backend/src/routes/design-plans.ts (add approve/reject)
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

### API Requirements

- PUT /api/design-plans/:id/approve
- PUT /api/design-plans/:id/reject
- PUT /api/design-plans/:id (edit, draft only)

### Testing Requirements

* [ ] Tests for approval logic
* [ ] Tests for gate enforcement
* [ ] Tests for locked approved plans

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
```

### Acceptance Criteria

* [ ] Design plan can be approved or rejected
* [ ] Approval recorded with timestamp
* [ ] Approved plans locked
* [ ] Approval history visible
* [ ] Non-approved plans cannot generate roadmaps
* [ ] All tests pass

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

### API Requirements

- POST /api/roadmaps (create/generate)
- GET /api/roadmaps/:id (read)

### Testing Requirements

* [ ] Unit tests for RoadmapGenerator
* [ ] Integration tests for API
* [ ] UI tests for RoadmapView

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
```

### Acceptance Criteria

* [ ] Roadmap can be generated from approved design plan
* [ ] Roadmap saved to persistence
* [ ] UI displays roadmap in readable format
* [ ] Phases and tasks properly structured
* [ ] All tests pass

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

- [ ] Add approval fields to Roadmap model
- [ ] Create PUT /api/roadmaps/:id/approve endpoint
- [ ] Create PUT /api/roadmaps/:id/reject endpoint
- [ ] Create PUT /api/roadmaps/:id endpoint for editing
- [ ] Create `frontend/src/pages/RoadmapReview.tsx`
- [ ] Create `frontend/src/components/RoadmapEditor.tsx`
- [ ] Implement drag-to-reorder phases and tasks
- [ ] Create add/remove task UI
- [ ] Create approval gate component
- [ ] Write tests

### Files Expected to Be Created or Modified

```text
shared/types/index.ts (Roadmap: add approval fields)
backend/src/routes/roadmaps.ts (add approve/reject/edit)
backend/tests/integration/roadmaps.test.ts
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

### API Requirements

- PUT /api/roadmaps/:id/approve
- PUT /api/roadmaps/:id/reject
- PUT /api/roadmaps/:id (edit)

### Testing Requirements

* [ ] Tests for editing operations
* [ ] Tests for approval workflow
* [ ] UI tests for drag-and-drop

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

* [ ] Roadmap can be edited (phases and tasks)
* [ ] Roadmap can be approved or rejected
* [ ] Approved roadmaps locked
* [ ] All tests pass

### Human Review Gate

A human should verify:
- Editing UI intuitive
- Approval gates enforced
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

* [ ] Tests for agent-loader
* [ ] Tests for agent registry
* [ ] API integration tests
* [ ] UI tests

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

* [ ] Existing agents load from agents/
* [ ] Agents can be viewed and listed
* [ ] New agents can be created
* [ ] Agents can be edited
* [ ] Agents can be disabled
* [ ] Agent test interface works
* [ ] All tests pass

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

* [ ] Tests for prompt CRUD
* [ ] Tests for versioning
* [ ] Tests for rendering (variable substitution)
* [ ] UI tests

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

* [ ] Prompts can be created, edited, viewed
* [ ] Versions tracked
* [ ] Test interface works
* [ ] Comparison shows differences
* [ ] All tests pass

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

* [ ] Tests for contract-loader
* [ ] Tests for contract-validator
* [ ] Tests for API endpoints
* [ ] Tests for validation middleware

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

* [ ] Existing contracts load from contracts/
* [ ] Contracts can be viewed and listed
* [ ] New contracts can be created
* [ ] Contract validation middleware works
* [ ] Compliance dashboard shows violations
* [ ] All tests pass

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

* [ ] Test contract validation before task execution
* [ ] Test contract validation after task execution
* [ ] Test artifact persistence
* [ ] Test audit event logging
* [ ] Test cost tracking
* [ ] Test spike run can be re-executed without errors
* [ ] Test spike results displayed in UI

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
# Manual: Run spike, verify results, run again
```

### Acceptance Criteria

* [ ] One mock task executes end-to-end
* [ ] One input contract validated before task
* [ ] One output contract validated after task
* [ ] One spike run record persisted
* [ ] One artifact persisted
* [ ] One audit event logged
* [ ] Costs tracked (placeholder)
* [ ] UI displays spike run results
* [ ] Spike can run repeatedly without state corruption
* [ ] All tests pass

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

* [ ] Tests for MockAgentExecutor (returns mock results)
* [ ] Tests for DryRunAgentExecutor (returns dry-run placeholder)
* [ ] Tests for executor selection logic
* [ ] Tests that executor result matches AgentExecutionResult contract

### Validation Commands

```bash
npm test
npm run typecheck
```

### Acceptance Criteria

* [ ] AgentExecutor interface defined clearly
* [ ] MockAgentExecutor works
* [ ] DryRunAgentExecutor works
* [ ] Executor registry selects correctly
* [ ] ExecutionResult contract adhered to
* [ ] All tests pass
* [ ] Executor contract documented

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

### Testing Requirements

* [ ] Tests for audit event logging
* [ ] Tests for cost tracking
* [ ] Tests that approval events are logged
* [ ] Tests that execution events are logged
* [ ] Tests for persistence and retrieval

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
```

### Acceptance Criteria

* [ ] AuditEvent model defined and persisted
* [ ] Cost tracking working
* [ ] Approval events logged
* [ ] Task execution events logged
* [ ] Failure/repair events logged
* [ ] Audit log displayable
* [ ] Cost summary displayable
* [ ] All tests pass

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

- [ ] RunStateMachine class
- [ ] Valid state transitions defined
- [ ] State persistence
- [ ] State transition events logged to audit
- [ ] Tests for state machine logic

### Implementation Tasks

- [ ] Define valid states: pending, executing, paused, complete, failed
- [ ] Define valid transitions (e.g., pending → executing → complete)
- [ ] Prevent invalid transitions
- [ ] Create `backend/src/services/run-state-machine.ts`
- [ ] Implement state getters and setters
- [ ] Log state transitions to audit
- [ ] Persist state changes to Run record
- [ ] Write comprehensive state transition tests

### Files Expected to Be Created or Modified

```text
backend/src/services/run-state-machine.ts
backend/src/types/orchestration.ts (add state enums)
backend/tests/services/run-state-machine.test.ts
```

### Data Models / Contracts Affected

- Run model (state fields already exist; this implements the logic)

### Testing Requirements

* [ ] Tests for valid state transitions
* [ ] Tests for invalid transition rejection
* [ ] Tests for state persistence
* [ ] Tests for audit logging of transitions

### Validation Commands

```bash
npm test
npm run typecheck
```

### Acceptance Criteria

* [ ] State machine enforces valid transitions
* [ ] Invalid transitions rejected
* [ ] State persists correctly
* [ ] Transitions logged to audit
* [ ] All tests pass

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

- [ ] **Software task ownership contract** (`software_task_contract.v1`) with task_id, owner_agent, goal, target_files, read_context_files, write_scope, conflict_group, dependencies, expected_exports, acceptance_criteria, validation_commands, merge_strategy, rollback_strategy, risk_level
- [ ] TaskQueue class
- [ ] Dependency resolution logic
- [ ] Parallel vs. sequential execution decision
- [ ] Queue progression logic
- [ ] Task contract enforcement (owner verification, scope validation)
- [ ] Tests for queue, dependency logic, and task contracts

### Implementation Tasks

- [ ] Create `backend/src/services/task-queue.ts`
- [ ] Implement dependency graph traversal
- [ ] Determine which tasks can run in parallel
- [ ] Implement queue progression (dequeue task, mark complete)
- [ ] Handle task failures (keep task in queue, mark failed, allow retry or skip)
- [ ] Write tests for all scenarios

### Files Expected to Be Created or Modified

```text
backend/src/services/task-queue.ts
backend/tests/services/task-queue.test.ts
```

### Data Models / Contracts Affected

- Roadmap, Phase, Task models (already have dependency fields)

### Testing Requirements

* [ ] Tests for dependency resolution
* [ ] Tests for parallel task identification
* [ ] Tests for queue progression
* [ ] Tests for task failure handling
* [ ] Tests with circular dependencies (should reject)

### Validation Commands

```bash
npm test
npm run typecheck
```

### Acceptance Criteria

* [ ] Dependencies resolved correctly
* [ ] Parallel tasks identified
* [ ] Sequential execution enforced where needed
* [ ] Queue progresses correctly
* [ ] Failures handled appropriately
* [ ] All tests pass

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

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Create the adapter that connects the orchestration engine to the AgentExecutor interface. Handles input preparation, contract validation, output validation, error mapping, and cost extraction.

### Why This Phase Exists

The adapter bridges the orchestration engine and the execution abstraction. It handles the complexity of preparing inputs, validating contracts, and extracting results.

### Inputs

- Phase 14 completed (agent executor abstraction)
- Phase 18 completed (contract validation)

### Deliverables

- [ ] AgentExecutorAdapter class
- [ ] Input preparation (load context, substitute variables)
- [ ] Input contract validation before execution
- [ ] Output contract validation after execution
- [ ] Error mapping and classification
- [ ] Cost extraction from results
- [ ] Tests for adapter logic

### Implementation Tasks

- [ ] Create `backend/src/services/agent-executor-adapter.ts`
- [ ] Implement input preparation with context loading
- [ ] Implement input contract validation
- [ ] Call AgentExecutor.execute()
- [ ] Implement output contract validation
- [ ] Handle execution errors (timeout, API error, etc.)
- [ ] Extract cost/token data from results
- [ ] Classify errors (schema invalid, tool denied, etc.)
- [ ] Write tests

### Files Expected to Be Created or Modified

```text
backend/src/services/agent-executor-adapter.ts
backend/tests/services/agent-executor-adapter.test.ts
```

### Data Models / Contracts Affected

- Use existing AgentExecutor, ContractDefinition

### Testing Requirements

* [ ] Tests for input preparation
* [ ] Tests for input contract validation
* [ ] Tests for output contract validation
* [ ] Tests for error mapping
* [ ] Tests for cost extraction
* [ ] Tests for edge cases (null output, missing fields, etc.)

### Validation Commands

```bash
npm test
npm run typecheck
```

### Acceptance Criteria

* [ ] Input preparation works
* [ ] Input contract validation enforced
* [ ] Output contract validation enforced
* [ ] Errors mapped correctly
* [ ] Costs extracted correctly
* [ ] All tests pass

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

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Implement contract validation at agent-to-agent handoff points using the explicit handoff contracts defined in Phase 12. Before one agent's output (wrapped in agent message envelope) goes to the next agent, validate it matches the handoff contract preconditions and the next agent's input contract. Prevent invalid data from propagating. Implement handoff routing logic for failures.

### Why This Phase Exists

Handoff contracts are the core safety mechanism. This phase makes them enforceable and implements the failure recovery routes defined in the contracts, ensuring agent-to-agent communication is auditable and deterministic.

### Inputs

- Phase 18 completed (agent executor adapter)
- Phase 12 completed (contract manager)

### Deliverables

- [ ] HandoffValidator service
- [ ] Handoff contract matching logic
- [ ] Input schema matching logic
- [ ] Output contract validation before handoff
- [ ] Input contract validation after handoff receipt
- [ ] Failure routing (repair or escalate)
- [ ] Tests for handoff validation

### Implementation Tasks

- [ ] Create `backend/src/services/handoff-validator.ts`
- [ ] Load handoff contracts from registry
- [ ] Implement contract matching (from/to agent pairs)
- [ ] Validate output matches handoff contract
- [ ] Validate handoff payload matches input contract of next agent
- [ ] Log validation results to audit
- [ ] Route failures (repair attempt, escalation)
- [ ] Write tests

### Files Expected to Be Created or Modified

```text
backend/src/services/handoff-validator.ts
backend/tests/services/handoff-validator.test.ts
shared/types/index.ts (add HandoffContract if needed)
```

### Data Models / Contracts Affected

- Use existing ContractDefinition

### Testing Requirements

* [ ] Tests for contract matching
* [ ] Tests for valid handoffs
* [ ] Tests for invalid handoff rejection
* [ ] Tests for repair suggestion
* [ ] Tests for escalation routing

### Validation Commands

```bash
npm test
npm run typecheck
```

### Acceptance Criteria

* [ ] Handoff contracts loaded and matched
* [ ] Valid handoffs pass
* [ ] Invalid handoffs rejected
* [ ] Failure routing logic works
* [ ] All tests pass

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

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Implement artifact storage and linking. Task outputs become artifacts (code files, logs, reports). Artifacts are persisted, indexed, and linked to run records. Users can download and view artifacts.

### Why This Phase Exists

Artifacts are the deliverables of orchestration. They must be stored reliably and linked to runs for auditability.

### Inputs

- Phase 18 completed (executor adapter)
- Phase 2 completed (persistence layer)

### Deliverables

- [ ] Artifact model and persistence
- [ ] Artifact storage (file system or blob)
- [ ] Artifact linking to Run/Task records
- [ ] Artifact metadata (type, size, checksum)
- [ ] Artifact retrieval and download
- [ ] Artifact viewer (UI component)
- [ ] Tests for artifact persistence

### Implementation Tasks

- [ ] Create `backend/src/services/artifact-store.ts`
- [ ] Create `data/artifacts/` directory structure
- [ ] Implement artifact save (with checksum)
- [ ] Implement artifact retrieval by ID
- [ ] Implement artifact linking to run/task
- [ ] Create GET /api/artifacts/:id endpoint
- [ ] Create GET /api/artifacts/:id/download endpoint
- [ ] Create `frontend/src/components/ArtifactViewer.tsx`
- [ ] Add artifact links to execution console
- [ ] Write tests

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

* [ ] Tests for artifact save/retrieve
* [ ] Tests for checksum verification
* [ ] Tests for artifact linking
* [ ] Tests for download endpoint
* [ ] Tests for artifact cleanup

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
```

### Acceptance Criteria

* [ ] Artifacts persisted reliably
* [ ] Artifacts checksummed and verified
* [ ] Artifacts linked to runs/tasks
* [ ] Download endpoint works
* [ ] Artifact viewer displays artifacts
* [ ] All tests pass

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

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Implement run completion logic that generates a comprehensive summary, computes final costs, produces a completion report, and marks the run as complete. Summary is displayed to user and persisted.

### Why This Phase Exists

Completion is more than just "done." It's a structured summary of what was accomplished, what failed, what was learned, and what it cost.

### Inputs

- Phase 20 completed (artifacts)
- Phase 15 completed (cost tracking)

### Deliverables

- [ ] RunSummary model
- [ ] Completion summary generation
- [ ] Final cost calculation
- [ ] Failure summary and repair attempts
- [ ] Lessons learned capture
- [ ] Completion report display in UI
- [ ] Tests for summary generation

### Implementation Tasks

- [ ] Create RunSummary model with fields: success, outcome, failures, repairs, costs, artifacts, lessons
- [ ] Create `backend/src/services/run-completion.ts`
- [ ] Aggregate task results
- [ ] Aggregate failures and repairs
- [ ] Calculate final costs
- [ ] Generate lessons learned
- [ ] Create run summary
- [ ] Create `frontend/src/pages/RunCompletionDetail.tsx`
- [ ] Display summary with all key information
- [ ] Write tests

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

* [ ] Tests for summary generation
* [ ] Tests for cost calculation
* [ ] Tests for failure aggregation
* [ ] Tests for lessons extraction

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
```

### Acceptance Criteria

* [ ] Run summary generated correctly
* [ ] Final costs calculated
* [ ] Failures summarized
* [ ] Lessons captured
* [ ] Completion detail page displays all information
* [ ] All tests pass

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

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Create real-time monitoring UI showing execution progress, logs, costs, and allow user interaction (pause, resume). Users watch their roadmap being built in real-time.

### Why This Phase Exists

Monitoring is critical UX. Users need visibility into what's happening and the ability to intervene.

### Inputs

- Phase 21 completed (completion)
- Phase 4 completed (frontend shell)

### Deliverables

- [ ] Execution console page
- [ ] Real-time progress tracking (WebSocket or polling)
- [ ] Task list with status
- [ ] Live logs viewer with filtering
- [ ] Cost tracking display (running total)
- [ ] Pause/resume buttons
- [ ] Repair approval UI
- [ ] Tests for real-time updates

### Implementation Tasks

- [ ] Create `frontend/src/pages/ExecutionConsole.tsx`
- [ ] Create `frontend/src/components/ExecutionProgress.tsx`
- [ ] Create `frontend/src/components/RealTimeLogs.tsx`
- [ ] Create `frontend/src/components/CostTracker.tsx`
- [ ] Create `frontend/src/hooks/useExecutionUpdates.ts` (polling or WebSocket)
- [ ] Create pause/resume endpoints in backend
- [ ] Implement polling or WebSocket connection
- [ ] Add log filtering and search
- [ ] Write tests

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

### API Requirements

- GET /api/runs/:id/log (streaming logs)
- POST /api/runs/:id/pause
- POST /api/runs/:id/resume
- POST /api/runs/:id/approve-repair
- WebSocket or polling for live updates

### Testing Requirements

* [ ] Tests for real-time update hooks
* [ ] Tests for log filtering
* [ ] Tests for pause/resume
* [ ] Tests for repair approval UI

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

* [ ] Live updates show progress
* [ ] Logs stream in real-time
* [ ] Cost tracking accurate
* [ ] Pause/resume works
* [ ] Repair approval UI works
* [ ] All tests pass

### Human Review Gate

A human should verify:
- Updates feel responsive
- Logs readable
- Cost tracking accurate
- Repair UI intuitive

### Rollback Notes

Delete execution console.

### Commit Guidance

```text
feat(phase-22): execution console and live monitoring
```

---

## Phase 23 — Failure Taxonomy and Repair Workflow

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Classify failures with a comprehensive taxonomy (requirements_missing, schema_invalid, tool_denied, command_failed, env_missing, dependency_unavailable, test_failed, merge_conflict, scope_violation, low_confidence, human_approval_required). Implement recovery protocols with recovery routing, retry policies, escalation paths, and repair suggestions. Track repair attempts and outcomes. Failed tasks become recoverable with clear next steps.

### Why This Phase Exists

Failures are inevitable. Handling them gracefully, transparently, and with clear recovery pathways is critical. A shared failure taxonomy enables the system to route failures intelligently and provide agents/humans actionable recovery suggestions.

### Inputs

- Phase 22 completed (monitoring)
- Phase 13 completed (spike with repair concepts)

### Deliverables

- [ ] **Failure taxonomy** with 11 standard failure types (requirements_missing, schema_invalid, tool_denied, command_failed, env_missing, dependency_unavailable, test_failed, merge_conflict, scope_violation, low_confidence, human_approval_required)
- [ ] Failure classification logic
- [ ] **Recovery protocol** with recovery routing, retry policies, escalation paths, and repair suggestions
- [ ] Repair strategy selection logic
- [ ] Repair attempt tracking and limits
- [ ] Escalation to human with evidence
- [ ] FailureDetail and RepairOptions UI
- [ ] Tests for failure classification, recovery routing, and repair handling

### Implementation Tasks

- [ ] Create `backend/src/services/failure-classifier.ts` with taxonomy
- [ ] Create `backend/src/services/repair-strategist.ts`
- [ ] Implement repair attempt limits
- [ ] Create `frontend/src/components/FailureDetail.tsx`
- [ ] Create `frontend/src/components/RepairOptions.tsx`
- [ ] Add failure display to execution console
- [ ] Write tests

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

### UI/UX Requirements

- Failures shown clearly
- Repair suggestions actionable
- Repair options easy to understand
- Repair attempts tracked

### Testing Requirements

* [ ] Tests for failure classification
* [ ] Tests for repair strategy selection
* [ ] Tests for repair attempt limits
* [ ] Tests for escalation

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

* [ ] Failures classified correctly
* [ ] Repair strategies appropriate
* [ ] Repair attempts tracked
* [ ] Escalation works
* [ ] UI shows failures and options
* [ ] All tests pass

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

**Status:** Not Started
**Completed:**
**Completed By:**
**Completion Notes:**

### Goal

Expand cost tracking with per-agent breakdown, cost trends, budget alerts, and cost analytics. Provide detailed cost dashboards and reports.

### Why This Phase Exists

Basic cost tracking (Phase 15) is foundational. Advanced tracking provides insights for optimization and cost control.

### Inputs

- Phase 15 completed (basic cost tracking)
- Phase 22 completed (execution console)

### Deliverables

- [ ] Cost breakdown by agent and task
- [ ] Budget alert system
- [ ] Cost trend tracking (across runs)
- [ ] CostDashboard UI with charts
- [ ] Cost report generation
- [ ] Tests for cost analytics

### Implementation Tasks

- [ ] Enhance `backend/src/services/cost-tracker.ts`
- [ ] Create cost breakdown aggregation logic
- [ ] Implement budget alert checks
- [ ] Create `backend/src/services/cost-analytics.ts`
- [ ] Create `frontend/src/components/CostDashboard.tsx`
- [ ] Add cost charts (using Chart.js or similar)
- [ ] Create cost report export
- [ ] Write tests

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

* [ ] Tests for cost aggregation
* [ ] Tests for budget alert logic
* [ ] Tests for cost trend calculation

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

* [ ] Cost breakdown by agent accurate
* [ ] Budget alerts trigger correctly
* [ ] Cost trends tracked
* [ ] Dashboard displays clearly
* [ ] Reports generated correctly
* [ ] All tests pass

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

* [ ] Tests for GitHub operations (mocked)
* [ ] Integration tests for full workflow
* [ ] Tests for error handling
* [ ] UI tests for push modal

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

* [ ] GitHub OAuth works
* [ ] Branches can be created
* [ ] Commits can be created
* [ ] PRs can be created
* [ ] CI status monitored
* [ ] All tests pass (with mocks)

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

* [ ] >= 80% coverage for backend services
* [ ] >= 80% coverage for critical frontend components
* [ ] All API endpoints tested
* [ ] All major workflows tested

### Validation Commands

```bash
npm run lint
npm run typecheck
npm test --coverage
npm run build
```

### Acceptance Criteria

* [ ] All tests pass
* [ ] Coverage >= 80%
* [ ] Lint passes
* [ ] Type check passes
* [ ] Build succeeds
* [ ] CI pipeline configured

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

* [ ] Tests for authentication
* [ ] Tests for authorization
* [ ] Tests for input validation
* [ ] Accessibility tests

### Validation Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

### Acceptance Criteria

* [ ] Authentication works
* [ ] Authorization enforced
* [ ] Secrets not committed
* [ ] Security headers set
* [ ] WCAG 2.1 AA compliant
* [ ] All tests pass

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

* [ ] README complete
* [ ] API docs comprehensive
* [ ] User guide step-by-step
* [ ] Operator guide complete
* [ ] Architecture documented
* [ ] Examples working
* [ ] Troubleshooting helpful

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

* [ ] Full UAT
* [ ] Smoke tests on deployed system

### Validation Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

### Acceptance Criteria

* [ ] All UAT tests pass
* [ ] Security audit passes
* [ ] Performance acceptable
* [ ] All requirements met
* [ ] Release notes complete
* [ ] System deployable and operational

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

