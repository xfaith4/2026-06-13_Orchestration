# Web-Based Multi-Agent Orchestration Platform — Implementation Roadmap

**Roadmap Version:** 1.0  
**Last Updated:** 2026-06-14  
**Target Completion:** Q3 2026  
**Status:** Ready for Execution

---

## Repository Context

This roadmap guides the implementation of a web-based UI and expanded orchestration capabilities for the existing multi-agent orchestration framework located in `g:/Development/20_Staging/AI Projects/2026-06-13_Orchestration/`.

### Existing Assets to Preserve

- **Agent Definitions** (`agents/*.yaml`, `agents/*.json`): 25+ specialized agents with IO contracts
- **Contract Schemas** (`contracts/*.json`): A2A communication, build/maintenance, failure policies
- **Runtime Libraries** (`lib/*.js`): Run tracking, cost calculation, API server foundation
- **Lessons Learned** (`LessonsLearnedKnowledge/`): Past run insights
- **Gap Analysis** (`multi-agent-contract-gap-analysis.md`): Specification for missing contracts

### Existing Gaps This Roadmap Addresses

- No web UI (all code-based)
- No application intake form or workflow
- No design plan generation/approval gates
- No roadmap generation/approval gates
- No multi-agent orchestration engine
- No real-time execution monitoring
- No repair loop tracking
- No GitHub integration
- Missing canonical handoff contracts
- No contract-driven validation

### Directory Structure to Create

```
web-based-orchestration/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── stores/
│   │   ├── hooks/
│   │   ├── types/
│   │   └── App.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── types/
│   │   └── utils/
│   ├── tests/
│   ├── tsconfig.json
│   └── package.json
├── shared/
│   ├── types/
│   ├── schemas/
│   └── contracts/
├── data/
│   ├── applications/
│   ├── design-plans/
│   ├── roadmaps/
│   ├── runs/
│   ├── agents/
│   ├── prompts/
│   └── contracts/
├── docs/
├── ROADMAP.md
├── BUILD_SPECIFICATION.md
└── README.md
```

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

## Execution Rules for Coding Agents

When executing this roadmap:

1. **Work phase-by-phase.** Do not skip phases or begin phase N+2 before N is complete.
2. **Preserve existing assets.** Reuse agents, contracts, and libraries from `agents/`, `contracts/`, and `lib/` directories.
3. **Complete all checkboxes before marking a phase done.** Use `[x]` to indicate completion.
4. **Validate at each step.** Run lint, typecheck, tests, and build after each meaningful change.
5. **Update completion metadata.** When a phase is complete, update `Status`, `Completed`, `Completed By`, and `Completion Notes`.
6. **Keep commits tied to phases.** Use the suggested commit message format; include phase number.
7. **Document decisions.** If you deviate from the roadmap, explain why in `Completion Notes`.
8. **Test continuously.** Unit tests, integration tests, and E2E tests must be written alongside implementation, not after.
9. **Protect approval gates.** Never bypass human approval gates or contract validation without explicit override.
10. **Record deferred work.** If a task is deferred, mark it `[~]` and explain in notes rather than deleting it.

---

## Completion Stamp Format

When you complete a phase, update the metadata like this:

```markdown
**Status:** Complete  
**Completed:** 2026-06-15 14:30 EDT  
**Completed By:** Claude Code Agent (claude-opus-4-8)  
**Completion Notes:** All acceptance criteria met. Created ApplicationIntakeForm component, integrated with API, wrote 12 unit tests and 1 E2E test. Commit: feat(phase-5): application intake workflow.
```

Do **not** mark a phase complete unless all acceptance criteria pass.

---

## Phase Index

| # | Phase | Goal | Status | Completed |
|---|-------|------|--------|-----------|
| 0 | Repository Baseline & Verification | Understand current state, validate existing assets | Not Started | |
| 1 | Project Foundation | Create monorepo, install deps, config tools | Not Started | |
| 2 | Core Data Models & Schemas | Define Application, DesignPlan, Roadmap, Run, Agent, Prompt, Contract models | Not Started | |
| 3 | Backend API Foundation | Implement CRUD endpoints for all core models | Not Started | |
| 4 | Frontend Shell & UI System | Create React app, layout, navigation, component library | Not Started | |
| 5 | Application Intake Workflow | First complete end-to-end feature | Not Started | |
| 6 | Design Plan Generation Service | Integrate plan generation (mocked agents initially) | Not Started | |
| 7 | Design Plan Approval Gate | Review, edit, approval workflow | Not Started | |
| 8 | Roadmap Generation Service | Generate roadmap from design plan | Not Started | |
| 9 | Roadmap Approval Gate | Review, edit, approval workflow | Not Started | |
| 10 | Agent Registry & Manager | Load agents, CRUD operations, validation | Not Started | |
| 11 | Prompt Refinement Workspace | Prompt CRUD, versioning, testing interface | Not Started | |
| 12 | A2A Contract Manager | Contract CRUD, compliance tracking, validation layer | Not Started | |
| 13 | Orchestration Execution Engine | Multi-agent execution, phase/task orchestration | Not Started | |
| 14 | Execution Console & Live Monitoring | Real-time progress, logs, cost tracking | Not Started | |
| 15 | Failure Taxonomy & Repair Workflow | Classify failures, repair attempts, escalation | Not Started | |
| 16 | GitHub Integration | OAuth, branch creation, PR workflow, CI status | Not Started | |
| 17 | Testing & Quality Hardening | Comprehensive test suite, CI pipeline | Not Started | |
| 18 | Security, Accessibility, Compliance | Auth hardening, WCAG 2.1 AA, data protection | Not Started | |
| 19 | Documentation & Operator Guide | User guide, API docs, deployment, troubleshooting | Not Started | |
| 20 | Final Acceptance & Release | UAT, security audit, performance validation, release | Not Started | |

---

## Phase 0 — Repository Baseline and Verification

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Validate the current state of the orchestration directory, understand which assets exist and in what condition, confirm assumptions about the existing technology stack, and establish a baseline for what will be preserved vs. refactored.

### Why This Phase Exists

The roadmap assumes certain existing files, agent definitions, contracts, and libraries. Before beginning construction, confirm these exist, are usable, and understand their current quality state. This phase prevents surprises later.

### Inputs

- Current directory: `g:/Development/20_Staging/AI Projects/2026-06-13_Orchestration/`
- Files: `agents/`, `contracts/`, `lib/`, `LessonsLearnedKnowledge/`, `BUILD_SPECIFICATION.md`

### Deliverables

- [ ] Inventory of all agent definitions with status (active, draft, deprecated)
- [ ] Inventory of all contract schemas with version info
- [ ] Assessment of existing lib files (run-tracker, api-server, config-loader, example)
- [ ] Confirmation that Node.js/npm are available and working
- [ ] Decision: preserve or refactor each existing asset
- [ ] Assessment report documenting baseline state

### Implementation Tasks

- [ ] List all files in `agents/` directory and note format (YAML vs JSON) and status field
- [ ] Read agent-library.active.json and agent-library.active2.json; compare for conflicts
- [ ] List all files in `contracts/` directory and validate JSON schemas
- [ ] Read all contract files and document structure (required fields, versions)
- [ ] Inspect `lib/*.js` files and assess code quality, dependencies, current functionality
- [ ] Check for existing package.json in root or subdirectories
- [ ] Verify Node.js version (target: 18+) and npm version
- [ ] Look for any existing test files or CI configuration
- [ ] Check for existing README or documentation
- [ ] Verify git repository status (is it initialized? any remotes?)

### Files Expected to Be Created or Modified

```text
BASELINE_REPORT.md                          # New: summary of current state
agents/INVENTORY.md                         # New: list of all agents
contracts/INVENTORY.md                      # New: list of all contracts
lib/ASSESSMENT.md                           # New: assessment of libraries
```

### Data Models / Contracts Affected

All existing agents, contracts, and models.

### Testing Requirements

* [ ] Validate all JSON files in `contracts/` parse without errors
* [ ] Validate all YAML files in `agents/` parse without errors
* [ ] Confirm `lib/run-tracker.js` exports expected functions
* [ ] Confirm `lib/api-server.js` can start without errors (at least parse)

### Validation Commands

```bash
# Validate JSON schemas
find contracts -name "*.json" -exec jq . {} \;

# Validate YAML (if yaml parser available)
find agents -name "*.yaml" -exec yaml-lint {} \;

# Check Node.js
node --version
npm --version

# Confirm key libraries can be loaded
node -e "require('./lib/run-tracker.js'); console.log('OK')"
node -e "require('./lib/api-server.js'); console.log('OK')"
```

### Acceptance Criteria

* [ ] All agent YAML/JSON files parse without errors
* [ ] All contract JSON files parse without errors
* [ ] Node.js version is 18 or higher
* [ ] npm version is 8 or higher
* [ ] All existing lib files are readable and functional
* [ ] Baseline report is complete and accurate
* [ ] Decision made: preserve or refactor each major asset
* [ ] No data loss; all existing files are safe

### Human Review Gate

A human should verify:
- Baseline report is accurate
- Decisions to preserve vs. refactor are justified
- No critical files are missing
- Assessment of existing agent quality is fair

### Rollback Notes

This phase is read-only. No rollback needed.

### Commit Guidance

```text
docs(phase-0): baseline assessment and asset inventory

- Assessed 25+ agent definitions in agents/
- Validated contract schemas in contracts/
- Reviewed existing run-tracker and api-server libraries
- Documented state for use in subsequent phases
- No files modified; inventory only
```

---

## Phase 1 — Project Foundation

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Create the project structure (monorepo with frontend and backend), install dependencies, configure TypeScript, set up build and dev tooling, and establish linting/formatting standards. After this phase, running `npm run dev` should start both frontend and backend.

### Why This Phase Exists

All subsequent work depends on having a working development environment. This phase establishes that foundation and ensures all tooling is aligned before writing business logic.

### Inputs

- Node.js 18+ and npm 8+
- BUILD_SPECIFICATION.md
- BASELINE_REPORT.md from Phase 0

### Deliverables

- [ ] Monorepo structure created (`frontend/`, `backend/`, `shared/`, `data/`)
- [ ] Frontend package.json with Vite, React 18, TypeScript, Tailwind, shadcn/ui
- [ ] Backend package.json with Express, TypeScript
- [ ] Root package.json with workspaces configuration
- [ ] All dependencies installed
- [ ] TypeScript configuration files (tsconfig.json for each workspace)
- [ ] Vite config for frontend (dev server on port 5173)
- [ ] Express server boots on backend (port 3000)
- [ ] Lint and format tooling configured (ESLint, Prettier)
- [ ] `.env.example` files for both frontend and backend
- [ ] Development scripts (dev, build, lint, test, typecheck)

### Implementation Tasks

- [ ] Create directory structure: `frontend/`, `backend/`, `shared/`, `data/`, `docs/`
- [ ] Initialize `frontend/package.json` with Vite React TypeScript template
- [ ] Run `npm create vite@latest frontend -- --template react-ts`
- [ ] Install shadcn/ui: `npx shadcn-ui@latest init` in frontend
- [ ] Install Tailwind CSS in frontend
- [ ] Create `backend/package.json` with express, typescript, ts-node, nodemon
- [ ] Install dependencies: `npm install`
- [ ] Create root `package.json` with workspaces: `["frontend", "backend"]`
- [ ] Create `frontend/tsconfig.json` with strict mode enabled
- [ ] Create `backend/tsconfig.json` with strict mode enabled
- [ ] Create `backend/src/server.ts` with Express bootstrap
- [ ] Create `frontend/src/App.tsx` with basic component
- [ ] Create `vite.config.ts` with appropriate settings
- [ ] Create `.eslintrc.json` with shared rules
- [ ] Create `.prettierrc.json` with formatting rules
- [ ] Add npm scripts to root: `dev`, `build`, `lint`, `test`
- [ ] Create `.env.example` for frontend and backend
- [ ] Create `.gitignore` covering node_modules, dist, .env
- [ ] Verify `npm run lint` works
- [ ] Verify `npm run typecheck` works
- [ ] Verify `npm run dev` starts both frontend and backend without errors

### Files Expected to Be Created or Modified

```text
package.json                                # Root package.json with workspaces
frontend/                                   # All Vite/React files
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  src/
    App.tsx
    main.tsx
    index.css
backend/                                    # All Express files
  package.json
  tsconfig.json
  src/
    server.ts
shared/                                     # For shared types later
data/                                       # For file-based persistence later
docs/
.eslintrc.json
.prettierrc.json
.gitignore
.env.example
```

### Data Models / Contracts Affected

None yet; this is pure infrastructure.

### Testing Requirements

* [ ] Unit test framework installed (Vitest for frontend, Jest for backend)
* [ ] Test configuration files created (vitest.config.ts, jest.config.js)
* [ ] Sample test file created for each workspace
* [ ] `npm test` runs tests in both workspaces

### Validation Commands

```bash
npm run lint
npm run typecheck
npm run build
npm run dev
# Verify frontend loads at http://localhost:5173
# Verify backend API responds at http://localhost:3000/api/health (will create in Phase 3)
```

### Acceptance Criteria

* [ ] Root package.json uses workspaces
* [ ] Both frontend and backend dependencies install without errors
* [ ] TypeScript compiles without errors in both workspaces
* [ ] ESLint and Prettier are configured and pass
* [ ] `npm run dev` starts dev server (frontend + backend)
* [ ] Frontend dev server runs on port 5173
* [ ] Backend dev server runs on port 3000
* [ ] No TypeScript errors or strict mode violations
* [ ] All npm scripts work: lint, typecheck, build, test

### Human Review Gate

A human should verify:
- Tooling choices are appropriate (Vite, Express, TypeScript)
- Project structure is clean and logical
- All linting and formatting tools are working
- Dev server starts cleanly with no warnings

### Rollback Notes

Delete all created directories and files, restore original state.

### Commit Guidance

```text
chore(phase-1): project foundation and tooling setup

- Create monorepo with frontend, backend, shared workspaces
- Configure Vite + React + TypeScript for frontend
- Configure Express + TypeScript for backend
- Install and configure ESLint, Prettier, shadcn/ui, Tailwind
- Add development scripts (dev, build, lint, typecheck, test)
```

---

## Phase 2 — Core Data Models and Persistence Layer

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Define all core data models (Application, DesignPlan, Roadmap, Run, Agent, Prompt, Contract) with full TypeScript types, JSON schemas for validation, and file-based persistence layer. Ensure data can be saved and loaded reliably.

### Why This Phase Exists

All API endpoints, services, and UI depend on well-defined data models. This phase creates the contract for data throughout the system. File-based persistence allows Phase 3-5 to proceed without a database, with easy migration to a database later.

### Inputs

- BUILD_SPECIFICATION.md (Phase 4 for data models)
- Existing agent definitions from `agents/`
- Existing contract schemas from `contracts/`
- Phase 1 completed (project structure)

### Deliverables

- [ ] TypeScript interface files for all models
- [ ] JSON schema files for runtime validation
- [ ] Persistence service with create, read, update, list, delete
- [ ] Index files for fast lookup by ID
- [ ] Unit tests for models and persistence
- [ ] Sample data files for testing

### Implementation Tasks

- [ ] Create `shared/types/index.ts` with all TypeScript interfaces (Application, DesignPlan, Roadmap, Run, AgentDefinition, PromptDefinition, ContractDefinition)
- [ ] Create JSON schema files in `shared/schemas/`:
  - `application.schema.json`
  - `design-plan.schema.json`
  - `roadmap.schema.json`
  - `run.schema.json`
  - `agent.schema.json`
  - `prompt.schema.json`
  - `contract.schema.json`
- [ ] Create `backend/src/models/` with model classes (optional, or just use interfaces)
- [ ] Create `backend/src/services/persistence.ts` with PersistenceService class
  - Implement `create<T>(type: string, data: T): Promise<string>` (returns ID)
  - Implement `read<T>(type: string, id: string): Promise<T | null>`
  - Implement `update<T>(type: string, id: string, data: Partial<T>): Promise<void>`
  - Implement `delete<T>(type: string, id: string): Promise<void>`
  - Implement `list<T>(type: string, options?: { limit?: number, offset?: number }): Promise<T[]>`
- [ ] Create `backend/src/services/validation.ts` with SchemaValidator class
  - Implement `validate<T>(data: any, schema: JSONSchema): Promise<ValidationResult>`
  - Implement error collection and clear error messages
- [ ] Create data directory structure: `data/applications/`, `data/design-plans/`, `data/roadmaps/`, `data/runs/`, `data/agents/`, `data/prompts/`, `data/contracts/`
- [ ] Create index files (e.g., `data/applications/index.json`) for fast lookup
- [ ] Create sample/fixture data for testing
- [ ] Write unit tests for PersistenceService (CRUD operations)
- [ ] Write unit tests for SchemaValidator (validation logic)
- [ ] Write integration tests (create → read → update → delete cycle)
- [ ] Verify TypeScript compiles without errors

### Files Expected to Be Created or Modified

```text
shared/types/
  index.ts                                  # All TypeScript interfaces
shared/schemas/
  application.schema.json
  design-plan.schema.json
  roadmap.schema.json
  run.schema.json
  agent.schema.json
  prompt.schema.json
  contract.schema.json
backend/src/
  services/
    persistence.ts                          # File-based persistence
    validation.ts                           # Schema validation
  models/
    index.ts                                # Model definitions (optional)
  utils/
    file-utils.ts                           # File I/O helpers
backend/tests/
  persistence.test.ts
  validation.test.ts
data/
  applications/
    index.json
  design-plans/
    index.json
  roadmaps/
    index.json
  runs/
    index.json
  agents/
    index.json
  prompts/
    index.json
  contracts/
    index.json
```

### Data Models / Contracts Affected

- Application (new)
- DesignPlan (new)
- Roadmap (new)
- Run (new)
- AgentDefinition (new, extends existing agents/)
- PromptDefinition (new)
- ContractDefinition (new, extends existing contracts/)

### Testing Requirements

* [ ] Unit tests for PersistenceService.create()
* [ ] Unit tests for PersistenceService.read()
* [ ] Unit tests for PersistenceService.update()
* [ ] Unit tests for PersistenceService.delete()
* [ ] Unit tests for PersistenceService.list()
* [ ] Unit tests for SchemaValidator.validate()
* [ ] Integration tests for CRUD cycle
* [ ] Test that invalid data is rejected by validation
* [ ] Test that IDs are unique and retrievable
* [ ] Test that indexes are updated correctly

### Validation Commands

```bash
npm run typecheck
npm test
# Verify no TypeScript errors
# Verify all tests pass
```

### Acceptance Criteria

* [ ] All TypeScript interfaces defined and exported
* [ ] All JSON schemas are valid and parseable
* [ ] PersistenceService can create, read, update, delete, list entities
* [ ] SchemaValidator rejects invalid data
* [ ] SchemaValidator accepts valid data
* [ ] Indexes are maintained correctly
* [ ] All unit and integration tests pass
* [ ] No TypeScript errors
* [ ] Sample data can be created and retrieved

### Human Review Gate

A human should verify:
- Data model definitions match BUILD_SPECIFICATION.md
- Validation logic is comprehensive
- Persistence layer is thread-safe (or document limitations)
- Index strategy is efficient for expected data volumes

### Rollback Notes

Delete `shared/types/`, `shared/schemas/`, `backend/src/models/`, `backend/src/services/persistence.ts`, `backend/src/services/validation.ts`, and `data/` directory.

### Commit Guidance

```text
feat(phase-2): core data models and persistence layer

- Define TypeScript interfaces for Application, DesignPlan, Roadmap, Run, Agent, Prompt, Contract
- Create JSON schema files for runtime validation
- Implement PersistenceService with CRUD operations
- Implement SchemaValidator with error reporting
- Create file-based persistence in data/ directory
- Write comprehensive unit and integration tests
- All models validated and tested
```

---

## Phase 3 — Backend API Foundation

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Implement REST API endpoints for all core CRUD operations (create, read, update, list, delete) for Applications, DesignPlans, Roadmaps, Runs, Agents, Prompts, and Contracts. Ensure all endpoints validate input, return consistent responses, and handle errors gracefully.

### Why This Phase Exists

The frontend depends on a working API. This phase provides the complete backend contract that the frontend will consume. All endpoints must be testable and documented.

### Inputs

- Phase 2 completed (data models and persistence)
- BUILD_SPECIFICATION.md (Phase 3 for API requirements)

### Deliverables

- [ ] Express routes for all CRUD operations
- [ ] Consistent response format (success/error)
- [ ] Request validation middleware
- [ ] Error handling middleware
- [ ] HTTP status code consistency
- [ ] Comprehensive API tests
- [ ] API documentation (inline comments or OpenAPI)

### Implementation Tasks

- [ ] Create `backend/src/routes/applications.ts` with endpoints:
  - POST /api/applications (create)
  - GET /api/applications (list)
  - GET /api/applications/:id (read)
  - PUT /api/applications/:id (update)
  - DELETE /api/applications/:id (delete)
- [ ] Create `backend/src/routes/design-plans.ts` (same endpoints pattern)
- [ ] Create `backend/src/routes/roadmaps.ts` (same endpoints pattern)
- [ ] Create `backend/src/routes/runs.ts` (same endpoints pattern)
- [ ] Create `backend/src/routes/agents.ts` (same endpoints pattern)
- [ ] Create `backend/src/routes/prompts.ts` (same endpoints pattern)
- [ ] Create `backend/src/routes/contracts.ts` (same endpoints pattern)
- [ ] Create `backend/src/middleware/validation.ts` for request validation
- [ ] Create `backend/src/middleware/errors.ts` for error handling
- [ ] Create `backend/src/middleware/cors.ts` for CORS
- [ ] Register all routes in `backend/src/server.ts`
- [ ] Write integration tests for all endpoints (CRUD cycle for each entity type)
- [ ] Add OpenAPI/Swagger comments (or create separate OpenAPI file)
- [ ] Create `backend/src/types/responses.ts` for consistent response shape
- [ ] Test all endpoints with curl or Postman
- [ ] Verify error responses are consistent and helpful

### Files Expected to Be Created or Modified

```text
backend/src/
  routes/
    applications.ts
    design-plans.ts
    roadmaps.ts
    runs.ts
    agents.ts
    prompts.ts
    contracts.ts
    index.ts
  middleware/
    validation.ts
    errors.ts
    cors.ts
  types/
    responses.ts
  server.ts                                 # Modified to register routes
backend/tests/
  integration/
    applications.test.ts
    design-plans.test.ts
    roadmaps.test.ts
    runs.test.ts
    agents.test.ts
    prompts.test.ts
    contracts.test.ts
docs/
  API.md                                    # API documentation
```

### Data Models / Contracts Affected

All models from Phase 2 are exposed via API.

### Testing Requirements

* [ ] Integration tests for POST (create) for each entity type
* [ ] Integration tests for GET (list) for each entity type
* [ ] Integration tests for GET :id (read) for each entity type
* [ ] Integration tests for PUT (update) for each entity type
* [ ] Integration tests for DELETE for each entity type
* [ ] Tests for 404 on invalid IDs
* [ ] Tests for 400 on invalid input
* [ ] Tests for validation error messages
* [ ] Tests for response shape consistency

### Validation Commands

```bash
npm run typecheck
npm test
# Verify all endpoint tests pass
```

### Acceptance Criteria

* [ ] All 7 resource types have full CRUD API
* [ ] All endpoints validate input against schemas
* [ ] All endpoints return consistent response format
* [ ] All error responses include helpful messages
* [ ] HTTP status codes are correct (201 for create, 404 for not found, etc.)
* [ ] All integration tests pass
* [ ] No TypeScript errors
* [ ] API is documented

### Human Review Gate

A human should verify:
- API response formats are consistent
- Error messages are helpful and not leaking sensitive data
- Status codes follow REST conventions
- All required endpoints are implemented

### Rollback Notes

Delete `backend/src/routes/`, `backend/src/middleware/validation.ts`, `backend/src/middleware/errors.ts`, and revert `backend/src/server.ts`.

### Commit Guidance

```text
feat(phase-3): backend API foundation with CRUD endpoints

- Create Express routes for applications, design-plans, roadmaps, runs, agents, prompts, contracts
- Implement request validation middleware
- Add error handling middleware with consistent response format
- Write comprehensive integration tests for all endpoints
- Verify all endpoints pass tests
```

---

## Phase 4 — Frontend Shell and Professional UI System

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Create the React frontend shell, establish a professional UI design system using shadcn/ui and Tailwind, implement routing and navigation, and set up state management. The app should have a polished look and feel that makes it suitable for production use.

### Why This Phase Exists

Phases 5+ will add features to this shell. The shell must be complete, professional, and extensible before feature development begins.

### Inputs

- Phase 1 completed (project structure)
- Phase 3 completed (API endpoints)
- BUILD_SPECIFICATION.md (Phase 5 for UI pages and design)

### Deliverables

- [ ] React Router setup with layout and page structure
- [ ] Professional layout component (header, sidebar, main content)
- [ ] Navigation bar with routing
- [ ] Dashboard page skeleton
- [ ] shadcn/ui components configured
- [ ] Tailwind CSS styling
- [ ] Dark/light mode toggle (optional)
- [ ] Global state management (Zustand or Redux)
- [ ] API client layer with error handling and loading states
- [ ] Common UI patterns (empty states, error states, loading skeletons)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Basic accessibility (semantic HTML, ARIA labels)

### Implementation Tasks

- [ ] Install and configure React Router: `npm install react-router-dom`
- [ ] Create `frontend/src/layouts/MainLayout.tsx` with header, sidebar, main content
- [ ] Create `frontend/src/pages/` directory with page components:
  - Dashboard.tsx
  - Applications.tsx
  - DesignPlans.tsx
  - Roadmaps.tsx
  - Runs.tsx
  - Agents.tsx
  - Prompts.tsx
  - Contracts.tsx
  - Settings.tsx
  - NotFound.tsx
- [ ] Create `frontend/src/routes/index.tsx` with route definitions
- [ ] Create `frontend/src/components/` directory with reusable components:
  - Navigation.tsx
  - Sidebar.tsx
  - Header.tsx
  - StatusBadge.tsx
  - ApprovalGate.tsx
  - LoadingSpinner.tsx
  - EmptyState.tsx
  - ErrorBoundary.tsx
- [ ] Set up Zustand or Redux store in `frontend/src/stores/`
- [ ] Create `frontend/src/services/api.ts` with API client (axios or fetch wrapper)
- [ ] Create `frontend/src/hooks/` with custom hooks:
  - useApi.ts (for loading data with loading/error states)
  - useFetch.ts (simplified data fetching)
- [ ] Configure Tailwind CSS in `frontend/`
- [ ] Implement dark mode toggle (CSS variables or class-based)
- [ ] Create `frontend/src/components/ui/` with shadcn/ui components
- [ ] Create Dashboard page with:
  - Welcome message
  - Quick start buttons
  - Recent applications list
  - Key metrics (success rate, avg tokens, etc.)
- [ ] Add responsive navigation (hamburger menu on mobile)
- [ ] Write unit tests for navigation and routing
- [ ] Test responsive design at multiple breakpoints

### Files Expected to Be Created or Modified

```text
frontend/src/
  components/
    Navigation.tsx
    Sidebar.tsx
    Header.tsx
    StatusBadge.tsx
    ApprovalGate.tsx
    LoadingSpinner.tsx
    EmptyState.tsx
    ErrorBoundary.tsx
    ui/
      [shadcn components]
  pages/
    Dashboard.tsx
    Applications.tsx
    DesignPlans.tsx
    Roadmaps.tsx
    Runs.tsx
    Agents.tsx
    Prompts.tsx
    Contracts.tsx
    Settings.tsx
    NotFound.tsx
  layouts/
    MainLayout.tsx
  routes/
    index.tsx
  services/
    api.ts
  stores/
    index.ts
  hooks/
    useApi.ts
    useFetch.ts
    useDarkMode.ts
  App.tsx                                   # Modified for routing
  main.tsx                                  # Modified if needed
  index.css                                 # Tailwind setup
frontend/tailwind.config.js                 # Tailwind configuration
frontend/postcss.config.js
```

### Data Models / Contracts Affected

None; this is presentation layer.

### UI/UX Requirements

- Polished, professional appearance (not generic)
- Clear navigation hierarchy
- Consistent spacing and typography
- Status badges for run states (pending, executing, complete, failed)
- Loading states while data fetches
- Empty states for lists with no items
- Error states with actionable messages
- Responsive grid layout (works on mobile, tablet, desktop)
- Dark mode support (optional but recommended)
- Accessibility: semantic HTML, proper ARIA labels, keyboard navigation

### Testing Requirements

* [ ] Unit tests for page components
* [ ] Unit tests for navigation routing
* [ ] Unit tests for API client error handling
* [ ] Visual regression tests (optional, using Percy or similar)
* [ ] Accessibility audit (e.g., using axe)

### Validation Commands

```bash
npm run typecheck
npm run lint
npm run build
npm run dev
# Verify frontend loads at http://localhost:5173 with no errors
# Verify navigation works
# Verify responsive design at multiple breakpoints
```

### Acceptance Criteria

* [ ] Frontend loads without errors
* [ ] Navigation works and routes to all pages
* [ ] Layout is responsive (works on mobile, tablet, desktop)
* [ ] Dark/light mode toggle works (if implemented)
* [ ] API client handles loading and error states
* [ ] All pages have proper titles and metadata
* [ ] No TypeScript errors
* [ ] Accessibility audit passes (no critical issues)
* [ ] Professional appearance (no obvious styling issues)

### Human Review Gate

A human should review:
- UI appearance (colors, typography, spacing)
- Navigation usability (clear, intuitive)
- Responsive design on actual devices/browsers
- Accessibility (keyboard navigation, screen reader)

### Rollback Notes

Delete `frontend/src/` contents and restore from git.

### Commit Guidance

```text
feat(phase-4): frontend shell and professional UI system

- Create React Router setup with multi-page layout
- Build MainLayout with header, sidebar, navigation
- Create page skeleton for all major features
- Set up Zustand/Redux for global state
- Configure Tailwind CSS and shadcn/ui components
- Implement API client with error handling
- Add dark mode support
- Verify responsive design and accessibility
```

---

## Phase 5 — Application Intake Workflow

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Implement the first complete end-to-end feature: users can submit an application idea via a form, the application is saved to the backend, users can view a list of applications, and users can view application details. This is the simplest workflow and validates the full stack.

### Why This Phase Exists

This phase proves the entire stack works: form submission → API call → persistence → list view → detail view. It's the foundation for all subsequent workflows.

### Inputs

- Phase 3 completed (API endpoints)
- Phase 4 completed (frontend shell)
- BUILD_SPECIFICATION.md (Phase 5 for application intake form)

### Deliverables

- [ ] ApplicationIntakeForm component with all fields from spec
- [ ] Form validation (client-side and server-side)
- [ ] Applications list page with search/filter
- [ ] Application details page
- [ ] Create application API endpoint fully tested
- [ ] List applications API endpoint fully tested
- [ ] E2E test for complete workflow

### Implementation Tasks

- [ ] Create `frontend/src/pages/NewApplication.tsx` with form component
- [ ] Create `frontend/src/components/ApplicationIntakeForm.tsx` with fields:
  - Application name (required)
  - Description (required)
  - Target users
  - Primary use cases
  - Platform targets (checkboxes: web, mobile, desktop, cli, api, library)
  - Preferred tech stack
  - Authentication needs
  - Data persistence needs
  - External integrations
  - Deployment target
  - Testing expectations
  - Security requirements
  - Accessibility requirements
  - Performance requirements
  - Constraints
  - Nice-to-haves
  - Non-goals
- [ ] Implement form validation (required fields, length limits)
- [ ] Create `frontend/src/hooks/useApplications.ts` for API calls
- [ ] Implement create application API call on form submit
- [ ] Create `frontend/src/pages/ApplicationsList.tsx` with table showing:
  - Application name
  - Status (intake, design-pending, design-approved, etc.)
  - Created by
  - Last updated
  - Quick actions (view, edit, delete)
- [ ] Implement list applications API call with pagination
- [ ] Create `frontend/src/pages/ApplicationDetail.tsx` showing:
  - Full application details
  - Status badge
  - Design plan link (if exists)
  - Roadmap link (if exists)
  - Edit button
  - Delete button (with confirmation)
- [ ] Implement edit application API call
- [ ] Implement delete application API call
- [ ] Write form validation tests (client-side)
- [ ] Write API integration tests (server-side validation)
- [ ] Write E2E test:
  1. Navigate to "New Application"
  2. Fill in form
  3. Submit
  4. Verify application appears in list
  5. Click to view detail
  6. Verify details match submitted data
  7. Edit a field
  8. Verify edit was saved
- [ ] Test error handling (submit with missing fields, etc.)
- [ ] Test loading states and error messages

### Files Expected to Be Created or Modified

```text
frontend/src/
  pages/
    NewApplication.tsx
    ApplicationsList.tsx
    ApplicationDetail.tsx
  components/
    ApplicationIntakeForm.tsx
  hooks/
    useApplications.ts
  App.tsx                                   # Add routes for new pages
backend/src/
  routes/
    applications.ts                         # May need to enhance
backend/tests/
  integration/
    applications.test.ts                    # May need to enhance
```

### Data Models / Contracts Affected

- Application model and schema

### UI/UX Requirements

- Form should be clear and easy to fill
- Required fields marked clearly
- Form validation errors shown inline
- Submit button disabled while loading
- Success message after submission
- List view shows status clearly
- Detail view is readable and organized
- Edit fields are editable inline or on separate page

### API Requirements

- POST /api/applications (already in Phase 3)
- GET /api/applications (already in Phase 3)
- GET /api/applications/:id (already in Phase 3)
- PUT /api/applications/:id (already in Phase 3)
- DELETE /api/applications/:id (already in Phase 3)

### Testing Requirements

* [ ] Unit tests for ApplicationIntakeForm component
* [ ] Unit tests for form validation logic
* [ ] API integration tests for create, read, update, delete
* [ ] E2E test for complete workflow
* [ ] Test error handling (invalid input, network errors, etc.)

### Validation Commands

```bash
npm run typecheck
npm run lint
npm test
npm run dev
# Manually test workflow in browser
```

### Acceptance Criteria

* [ ] User can fill and submit application intake form
* [ ] Form validates required fields
* [ ] Application is created in backend
* [ ] Application appears in list immediately after creation
* [ ] User can click to view application details
* [ ] User can edit application fields
* [ ] User can delete application (with confirmation)
* [ ] All tests pass
* [ ] No TypeScript errors
* [ ] Error messages are helpful

### Human Review Gate

A human should verify:
- Form is intuitive and easy to use
- All required fields from BUILD_SPECIFICATION.md are present
- Validation is appropriate (not too strict, not too lenient)
- Error messages are helpful
- UI matches professional design standards

### Rollback Notes

Delete application-related pages and components, revert routes and API calls.

### Commit Guidance

```text
feat(phase-5): application intake workflow

- Create ApplicationIntakeForm with all required fields
- Implement applications list and detail pages
- Add form validation (client and server)
- Write E2E test for complete intake workflow
- Verify all CRUD operations work end-to-end
```

---

## Phase 6 — Design Plan Generation Service

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Create the design plan generation service. Initially use mock data / placeholder agent calls to understand the workflow. The actual integration with LLM agents happens in Phase 13+, but the infrastructure and UI for design plan generation must work now.

### Why This Phase Exists

Design plan generation is the first computationally interesting workflow. It validates that the orchestration infrastructure can handle multi-step agent sequences and artifact persistence.

### Inputs

- Phase 5 completed (application intake)
- Phase 3 completed (API endpoints)
- BUILD_SPECIFICATION.md (Phase 6 for design plan generation)

### Deliverables

- [ ] DesignPlanGenerator service with mock agent calls
- [ ] POST /api/design-plans endpoint (triggers generation)
- [ ] Design plan model validation
- [ ] Mock responses for Researcher, Architect, Synthesizer agents
- [ ] Tests for design plan generation
- [ ] UI page to view generated design plan (read-only at this stage)

### Implementation Tasks

- [ ] Create `backend/src/services/design-plan-generator.ts` with DesignPlanGenerator class
- [ ] Implement `generate(applicationId: string): Promise<DesignPlan>`
- [ ] Create mock agent responses in `backend/src/mocks/agents.ts`:
  - Researcher: requirements summary, risks, options
  - Architect: technical design, components, data model
  - Synthesizer: unified design plan document
- [ ] Implement sequential calling of mock agents
- [ ] Save generated design plan to persistence
- [ ] Create POST /api/design-plans endpoint that:
  - Accepts applicationId
  - Calls DesignPlanGenerator
  - Returns generated DesignPlan
- [ ] Add GET /api/design-plans/:id endpoint (should already exist from Phase 3)
- [ ] Create `frontend/src/pages/DesignPlanView.tsx` to display generated plan
- [ ] Create `frontend/src/components/DesignPlanDisplay.tsx` to render plan content
- [ ] Add navigation from Application detail → "Generate Design Plan" button
- [ ] Implement generation status tracking (in progress, complete, failed)
- [ ] Write unit tests for DesignPlanGenerator
- [ ] Write API integration tests
- [ ] Write UI tests for DesignPlanView

### Files Expected to Be Created or Modified

```text
backend/src/
  services/
    design-plan-generator.ts
  mocks/
    agents.ts
backend/tests/
  services/
    design-plan-generator.test.ts
frontend/src/
  pages/
    DesignPlanView.tsx
  components/
    DesignPlanDisplay.tsx
  hooks/
    useDesignPlans.ts
```

### Data Models / Contracts Affected

- DesignPlan model

### UI/UX Requirements

- Application detail page has "Generate Design Plan" button
- Clicking button starts generation (shows progress)
- Once complete, shows full design plan in structured format
- Design plan is displayed read-only at this stage (approval in Phase 7)

### API Requirements

- POST /api/design-plans (create/generate)
- GET /api/design-plans/:id (read)

### Testing Requirements

* [ ] Unit tests for DesignPlanGenerator with mock agents
* [ ] Integration tests for design plan API endpoints
* [ ] UI tests for DesignPlanView component
* [ ] Test error handling (generation failure, etc.)

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
# Test generation flow in browser
```

### Acceptance Criteria

* [ ] POST /api/design-plans generates a design plan
* [ ] Generated design plan is saved to persistence
* [ ] Generated design plan can be retrieved
* [ ] UI displays design plan in readable format
* [ ] All tests pass
* [ ] Mock agent responses are realistic (per BUILD_SPECIFICATION.md)

### Human Review Gate

A human should verify:
- Mock design plan content matches BUILD_SPECIFICATION.md structure
- Generation flow is smooth in UI
- Error handling is appropriate
- Design plan format is comprehensive

### Rollback Notes

Delete DesignPlanGenerator service, mock agents, and UI components.

### Commit Guidance

```text
feat(phase-6): design plan generation service with mock agents

- Create DesignPlanGenerator service
- Implement mock agent responses (Researcher, Architect, Synthesizer)
- Add POST /api/design-plans endpoint
- Create DesignPlanView and DesignPlanDisplay components
- Write tests for generation workflow
```

---

## Phase 7 — Design Plan Approval Gate

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Implement the approval gate for design plans. Users can review, edit (limited), and approve or reject a design plan. Once approved, the design plan is locked and available for roadmap generation.

### Why This Phase Exists

Approval gates are critical to the system. No roadmap should be generated from an unapproved design plan. This phase establishes the pattern for all approval workflows.

### Inputs

- Phase 6 completed (design plan generation)
- Phase 3 completed (API endpoints)
- BUILD_SPECIFICATION.md (Phase 7 for approval gates)

### Deliverables

- [ ] Design plan approval form with approve/reject/request refinement options
- [ ] Approval gate enforcement (no roadmap until approved)
- [ ] Approval history tracking
- [ ] Design plan versioning (each edit creates new version)
- [ ] UI for reviewing and approving design plans
- [ ] Tests for approval workflow

### Implementation Tasks

- [ ] Add approval-related fields to DesignPlan model:
  - status: 'draft' | 'approved' | 'rejected'
  - approvedAt: ISO8601 | null
  - approvedBy: userId | null
  - versions: { version, timestamp, changes }[]
- [ ] Create PUT /api/design-plans/:id/approve endpoint
- [ ] Create PUT /api/design-plans/:id/reject endpoint
- [ ] Create PUT /api/design-plans/:id endpoint for editing (only in draft status)
- [ ] Create `frontend/src/components/DesignPlanApprovalGate.tsx`
- [ ] Create `frontend/src/pages/DesignPlanReview.tsx` with:
  - Read-only display of design plan
  - Edit button (for Product Manager role)
  - Approval section with:
    - Approve button
    - Reject button
    - Notes field
    - "Request Refinement" option
- [ ] Implement role-based access (only authorized users can approve)
- [ ] Create approval history view showing:
  - Approved by (user ID)
  - Approved at (timestamp)
  - Notes
  - Version history
- [ ] Add design plan status badge to application detail
- [ ] Add navigation: Application → Design Plan → Approval
- [ ] Write tests for approval workflow
- [ ] Test that non-approved design plans cannot be used for roadmap generation

### Files Expected to Be Created or Modified

```text
shared/types/
  index.ts                                  # Add approval fields to DesignPlan
backend/src/
  routes/
    design-plans.ts                         # Add approve/reject endpoints
frontend/src/
  pages/
    DesignPlanReview.tsx
  components/
    DesignPlanApprovalGate.tsx
    DesignPlanApprovalHistory.tsx
backend/tests/
  integration/
    design-plans.test.ts
```

### Data Models / Contracts Affected

- DesignPlan (add approval fields)

### UI/UX Requirements

- Approval form is clear and easy to use
- Status badge shows current approval state
- Once approved, design plan is clearly marked as locked
- Approval history is visible
- Only authorized users can approve

### API Requirements

- PUT /api/design-plans/:id/approve
- PUT /api/design-plans/:id/reject
- PUT /api/design-plans/:id (edit, only in draft status)

### Testing Requirements

* [ ] Unit tests for approval logic
* [ ] Integration tests for approve/reject endpoints
* [ ] Test that non-approved plans cannot generate roadmaps
* [ ] Test that approved plans are locked from editing

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
```

### Acceptance Criteria

* [ ] Design plan can be approved or rejected
* [ ] Approval is recorded with timestamp and user
* [ ] Approved design plans are locked
* [ ] Approval history is visible
* [ ] Non-approved plans cannot be used for roadmap generation
* [ ] All tests pass

### Human Review Gate

A human should verify:
- Approval workflow is clear and intuitive
- Approval gates are enforced (no accidental bypass)
- Authorization is correct

### Rollback Notes

Remove approval logic and endpoints.

### Commit Guidance

```text
feat(phase-7): design plan approval gate

- Add approval fields to DesignPlan model (status, approvedBy, approvedAt)
- Create approve/reject API endpoints
- Build DesignPlanReview page with approval UI
- Implement role-based authorization
- Add approval history tracking
- Write tests for approval workflow
```

---

## Phase 8 — Roadmap Generation Service

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Create roadmap generation service that takes an approved design plan and generates a detailed implementation roadmap with phases, tasks, dependencies, and acceptance criteria. Use mock agents initially.

### Why This Phase Exists

Roadmaps are the executable specification for orchestration runs. This phase validates the generation and structuring of detailed phase/task hierarchies.

### Inputs

- Phase 7 completed (design plan approval)
- Phase 3 completed (API endpoints)
- BUILD_SPECIFICATION.md (Phase 8 for roadmaps)

### Deliverables

- [ ] RoadmapGenerator service with mock agents
- [ ] POST /api/roadmaps endpoint (triggers generation)
- [ ] Roadmap model validation
- [ ] Mock Architect and Engineer agent responses
- [ ] Roadmap display page (read-only)
- [ ] Tests for roadmap generation

### Implementation Tasks

- [ ] Create `backend/src/services/roadmap-generator.ts` with RoadmapGenerator class
- [ ] Implement `generate(designPlanId: string): Promise<Roadmap>`
- [ ] Create mock agents in `backend/src/mocks/agents.ts`:
  - Architect: phase breakdown, dependencies, assignments
  - Engineer: task breakdown, complexity estimates, time estimates
  - Test Agent: test strategy, test cases
- [ ] Implement sequential calling of mock agents
- [ ] Save generated roadmap to persistence
- [ ] Create POST /api/roadmaps endpoint
- [ ] Create `frontend/src/pages/RoadmapView.tsx`
- [ ] Create `frontend/src/components/RoadmapDisplay.tsx` with:
  - Phase visualization (Gantt-style or timeline)
  - Task list expandable by phase
  - Dependency visualization
  - Agent assignments
- [ ] Add navigation from DesignPlan → "Generate Roadmap" button
- [ ] Implement generation status tracking
- [ ] Write tests for roadmap generation

### Files Expected to Be Created or Modified

```text
backend/src/
  services/
    roadmap-generator.ts
  mocks/
    agents.ts                               # Add roadmap mock agents
frontend/src/
  pages/
    RoadmapView.tsx
  components/
    RoadmapDisplay.tsx
    PhaseTimeline.tsx
    TaskList.tsx
  hooks/
    useRoadmaps.ts
```

### Data Models / Contracts Affected

- Roadmap model
- Phase and Task models

### UI/UX Requirements

- Roadmap displayed in Gantt-style timeline or phase-based view
- Tasks are grouped by phase
- Dependencies are visible
- Agent assignments are clear
- Estimated time and complexity are shown

### API Requirements

- POST /api/roadmaps (create/generate)
- GET /api/roadmaps/:id (read)

### Testing Requirements

* [ ] Unit tests for RoadmapGenerator
* [ ] Integration tests for roadmap API
* [ ] UI tests for RoadmapView

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
```

### Acceptance Criteria

* [ ] Roadmap can be generated from approved design plan
* [ ] Roadmap is saved to persistence
* [ ] UI displays roadmap in readable format
* [ ] Phases and tasks are properly structured
* [ ] All tests pass

### Human Review Gate

A human should verify:
- Roadmap structure matches BUILD_SPECIFICATION.md
- Generated phases and tasks are realistic
- Mock agent responses are comprehensive

### Rollback Notes

Delete RoadmapGenerator service and UI components.

### Commit Guidance

```text
feat(phase-8): roadmap generation service

- Create RoadmapGenerator service with mock agents
- Add POST /api/roadmaps endpoint
- Create RoadmapView and RoadmapDisplay components
- Implement phase and task visualization
- Write tests for roadmap generation
```

---

## Phase 9 — Roadmap Approval Gate

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Implement approval gate for roadmaps. Users can review, edit phases/tasks, and approve or request refinement. Once approved, roadmap is locked and ready for execution.

### Why This Phase Exists

Parallel to Phase 7 but for roadmaps. Roadmap approval is the final gate before expensive execution begins.

### Inputs

- Phase 8 completed (roadmap generation)
- Phase 7 completed (approval pattern)

### Deliverables

- [ ] Roadmap approval form
- [ ] Roadmap editing (drag-to-reorder phases, add/remove tasks)
- [ ] Approval workflow
- [ ] Roadmap versioning
- [ ] Tests for approval workflow

### Implementation Tasks

- [ ] Add approval fields to Roadmap model
- [ ] Create PUT /api/roadmaps/:id/approve endpoint
- [ ] Create PUT /api/roadmaps/:id/reject endpoint
- [ ] Create PUT /api/roadmaps/:id endpoint for editing
- [ ] Create `frontend/src/pages/RoadmapReview.tsx`
- [ ] Create `frontend/src/components/RoadmapEditor.tsx` with:
  - Drag-to-reorder phases
  - Drag-to-reorder tasks within phase
  - Add/remove task buttons
  - Edit task details modal
- [ ] Create approval gate component
- [ ] Add approval history
- [ ] Write tests

### Files Expected to Be Created or Modified

```text
shared/types/
  index.ts                                  # Add approval fields to Roadmap
backend/src/
  routes/
    roadmaps.ts
frontend/src/
  pages/
    RoadmapReview.tsx
  components/
    RoadmapEditor.tsx
    RoadmapApprovalGate.tsx
```

### Data Models / Contracts Affected

- Roadmap (add approval fields)

### UI/UX Requirements

- Editing UI is intuitive (drag and drop)
- Changes are previewed before save
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
* [ ] Approved roadmaps are locked
* [ ] All tests pass

### Human Review Gate

A human should verify:
- Editing UI is intuitive
- Approval gates are enforced
- Authorization is correct

### Rollback Notes

Remove approval endpoints and UI.

### Commit Guidance

```text
feat(phase-9): roadmap approval gate and editing

- Add approval fields to Roadmap model
- Create roadmap editor with drag-and-drop reordering
- Add approve/reject endpoints
- Create RoadmapReview page
- Write tests for approval workflow
```

---

## Phase 10 — Agent Registry and Agent Definition Manager

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Load existing agent definitions from `agents/` directory, create management UI to view, create, edit, and test agent definitions. Platform engineers should be able to manage agents without code changes.

### Why This Phase Exists

Agent definitions are core to orchestration. They must be manageable via UI. This also validates that existing YAML/JSON agents can be loaded.

### Inputs

- Phase 4 completed (frontend shell)
- Phase 3 completed (API)
- Existing agents in `agents/` directory

### Deliverables

- [ ] Agent loader service (load from agents/ directory)
- [ ] Agent registry (in-memory cache)
- [ ] GET /api/agents endpoint (list)
- [ ] GET /api/agents/:id endpoint (read)
- [ ] POST /api/agents endpoint (create)
- [ ] PUT /api/agents/:id endpoint (update)
- [ ] PUT /api/agents/:id/disable endpoint (disable/enable)
- [ ] Agents list and detail pages
- [ ] Agent editor form
- [ ] Agent test interface
- [ ] Tests for agent management

### Implementation Tasks

- [ ] Create `backend/src/services/agent-loader.ts` to load agents from `agents/` directory
- [ ] Load both YAML and JSON format agent files
- [ ] Create in-memory agent registry with loading from file
- [ ] Create POST /api/agents endpoint (new agent definition)
- [ ] Create GET /api/agents endpoint (list agents)
- [ ] Create GET /api/agents/:id endpoint (read agent)
- [ ] Create PUT /api/agents/:id endpoint (update agent)
- [ ] Create PUT /api/agents/:id/disable endpoint
- [ ] Create `frontend/src/pages/AgentsList.tsx`
- [ ] Create `frontend/src/pages/AgentDetail.tsx`
- [ ] Create `frontend/src/pages/AgentEdit.tsx`
- [ ] Create `frontend/src/components/AgentTestBench.tsx` for testing agents with sample input
- [ ] Create agent definition form with fields:
  - Name, role, purpose, mission
  - Capabilities, tools, constraints
  - Prompt template
  - Input/output schemas
  - Routing hints
- [ ] Add agent test interface (input JSON, execute, show output)
- [ ] Write tests for agent loader and API

### Files Expected to Be Created or Modified

```text
backend/src/
  services/
    agent-loader.ts
  routes/
    agents.ts                               # Enhance
frontend/src/
  pages/
    AgentsList.tsx
    AgentDetail.tsx
    AgentEdit.tsx
  components/
    AgentTestBench.tsx
    AgentDefinitionForm.tsx
  hooks/
    useAgents.ts
```

### Data Models / Contracts Affected

- AgentDefinition model

### UI/UX Requirements

- Agent list shows status (active, draft, deprecated)
- Agent detail shows all fields clearly
- Agent editor is comprehensive but not overwhelming
- Test interface is easy to use (input JSON, see output)

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
* [ ] UI tests for agent management

### Validation Commands

```bash
npm test
npm run dev
# Verify existing agents load correctly
```

### Acceptance Criteria

* [ ] Existing agents from `agents/` directory are loaded
* [ ] Agents can be viewed and listed
* [ ] New agents can be created
* [ ] Agents can be edited
* [ ] Agents can be disabled/enabled
* [ ] Agent test interface works
* [ ] All tests pass

### Human Review Gate

A human should verify:
- Existing agents load correctly
- Agent UI is comprehensive
- Test interface works

### Rollback Notes

Remove agent management code.

### Commit Guidance

```text
feat(phase-10): agent registry and definition manager

- Create agent-loader service to load from agents/ directory
- Implement agent CRUD API endpoints
- Create AgentsList, AgentDetail, AgentEdit pages
- Add AgentTestBench component for testing agents
- Write tests for agent management
```

---

## Phase 11 — Prompt Refinement Workspace

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Create prompt management UI. Platform engineers can view, create, edit, version, test, and compare prompts. Prompts are associated with agents and can be tested against sample inputs.

### Why This Phase Exists

Prompts are the primary tuning mechanism for agent behavior. They must be managed and tested via UI without code changes.

### Inputs

- Phase 10 completed (agent registry)
- Phase 3 completed (API)

### Deliverables

- [ ] Prompt CRUD API endpoints
- [ ] Prompt versioning
- [ ] Prompt test interface
- [ ] Prompts list and detail pages
- [ ] Prompt editor with template syntax support
- [ ] Prompt comparison view (show differences between versions)
- [ ] Tests for prompt management

### Implementation Tasks

- [ ] Create POST /api/prompts endpoint (create)
- [ ] Create GET /api/prompts endpoint (list)
- [ ] Create GET /api/prompts/:id endpoint (read)
- [ ] Create PUT /api/prompts/:id endpoint (update)
- [ ] Create `frontend/src/pages/PromptsList.tsx`
- [ ] Create `frontend/src/pages/PromptDetail.tsx`
- [ ] Create `frontend/src/pages/PromptEdit.tsx`
- [ ] Create `frontend/src/components/PromptEditor.tsx` with syntax highlighting
- [ ] Create `frontend/src/components/PromptTestBench.tsx` with:
  - Input: JSON variables
  - Output: Rendered prompt with variables substituted
  - Token estimate
  - Option to call actual agent with prompt
- [ ] Implement version history view
- [ ] Implement prompt comparison (diff view)
- [ ] Create prompt test cases storage in model
- [ ] Write tests

### Files Expected to Be Created or Modified

```text
shared/types/
  index.ts                                  # Add PromptDefinition
backend/src/
  routes/
    prompts.ts
  services/
    prompt-service.ts
frontend/src/
  pages/
    PromptsList.tsx
    PromptDetail.tsx
    PromptEdit.tsx
  components/
    PromptEditor.tsx
    PromptTestBench.tsx
    PromptVersionHistory.tsx
    PromptComparison.tsx
```

### Data Models / Contracts Affected

- PromptDefinition model

### UI/UX Requirements

- Prompt editor has syntax highlighting for template syntax
- Test results are shown in real-time
- Version history is clear and easy to navigate
- Comparison view is readable (side-by-side or inline diff)

### API Requirements

- GET /api/prompts
- GET /api/prompts/:id
- POST /api/prompts
- PUT /api/prompts/:id
- POST /api/prompts/:id/test (test prompt with sample input)

### Testing Requirements

* [ ] Tests for prompt CRUD
* [ ] Tests for prompt versioning
* [ ] Tests for prompt rendering (variable substitution)
* [ ] UI tests

### Validation Commands

```bash
npm test
npm run dev
```

### Acceptance Criteria

* [ ] Prompts can be created, edited, viewed
* [ ] Versions are tracked
* [ ] Test interface works
* [ ] Comparison shows differences clearly
* [ ] All tests pass

### Human Review Gate

A human should verify:
- Prompt editor UI is usable
- Test interface is intuitive
- Version history is clear

### Rollback Notes

Remove prompt management code.

### Commit Guidance

```text
feat(phase-11): prompt refinement workspace

- Implement prompt CRUD API endpoints
- Create PromptsList, PromptDetail, PromptEdit pages
- Build PromptEditor with syntax highlighting
- Add PromptTestBench for testing prompts
- Implement version history and comparison
- Write tests for prompt management
```

---

## Phase 12 — A2A Contract Manager and Validation Layer

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Load existing contracts from `contracts/` directory, create management UI, and integrate contract validation throughout the system (API requests, agent handoffs, etc.). Contracts enforce the shape of data passed between agents.

### Why This Phase Exists

Contracts are critical to multi-agent safety. They must be enforceable at all handoff points. This phase makes contract validation a first-class citizen.

### Inputs

- Phase 10 completed (agent registry)
- Phase 3 completed (API)
- Existing contracts in `contracts/` directory

### Deliverables

- [ ] Contract loader service
- [ ] Contract registry (in-memory with file loading)
- [ ] Contract validation service
- [ ] GET /api/contracts endpoint (list)
- [ ] GET /api/contracts/:id endpoint (read)
- [ ] POST /api/contracts endpoint (create)
- [ ] PUT /api/contracts/:id endpoint (update)
- [ ] Contracts list and detail pages
- [ ] Contract compliance dashboard
- [ ] Validation middleware for API (validate requests/responses against contracts)
- [ ] Tests for contract management and validation

### Implementation Tasks

- [ ] Create `backend/src/services/contract-loader.ts` to load from `contracts/` directory
- [ ] Create `backend/src/services/contract-validator.ts` with schema validation
- [ ] Create POST /api/contracts endpoint
- [ ] Create GET /api/contracts endpoint
- [ ] Create GET /api/contracts/:id endpoint
- [ ] Create PUT /api/contracts/:id endpoint
- [ ] Create `frontend/src/pages/ContractsList.tsx`
- [ ] Create `frontend/src/pages/ContractDetail.tsx`
- [ ] Create `frontend/src/components/SchemaViewer.tsx` to display JSON schemas
- [ ] Create `frontend/src/components/ContractComplianceDashboard.tsx` showing:
  - Which runs violated this contract
  - Violation examples
  - Compliance rate
- [ ] Integrate contract validation middleware in backend API
- [ ] Add contract validation to agent execution (Phase 13+)
- [ ] Write tests

### Files Expected to Be Created or Modified

```text
backend/src/
  services/
    contract-loader.ts
    contract-validator.ts
  middleware/
    contract-validation.ts                  # New validation middleware
  routes/
    contracts.ts
frontend/src/
  pages/
    ContractsList.tsx
    ContractDetail.tsx
    ComplianceDashboard.tsx
  components/
    SchemaViewer.tsx
    ContractComplianceDashboard.tsx
```

### Data Models / Contracts Affected

- ContractDefinition model

### UI/UX Requirements

- Contract schema is displayed in readable format
- Compliance dashboard shows violations with examples
- Contract detail page is comprehensive

### API Requirements

- GET /api/contracts
- GET /api/contracts/:id
- POST /api/contracts
- PUT /api/contracts/:id
- POST /api/contracts/:id/validate (test a payload against contract)

### Testing Requirements

* [ ] Tests for contract-loader
* [ ] Tests for contract-validator (validation logic)
* [ ] Tests for contract API endpoints
* [ ] Tests for validation middleware
* [ ] UI tests for contract pages

### Validation Commands

```bash
npm test
npm run dev
# Verify existing contracts load correctly
```

### Acceptance Criteria

* [ ] Existing contracts load from `contracts/` directory
* [ ] Contracts can be viewed and listed
* [ ] New contracts can be created
* [ ] Contract validation middleware works
* [ ] Compliance dashboard shows violations
* [ ] All tests pass

### Human Review Gate

A human should verify:
- Existing contracts load correctly
- Validation logic is sound
- Compliance dashboard is useful

### Rollback Notes

Remove contract management code.

### Commit Guidance

```text
feat(phase-12): A2A contract manager and validation layer

- Create contract-loader to load from contracts/ directory
- Implement contract-validator for schema validation
- Add contract CRUD API endpoints
- Create validation middleware for API
- Build ContractsList and ComplianceDashboard pages
- Write comprehensive tests for contract validation
```

---

## Phase 13 — Orchestration Execution Engine

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Build the core orchestration engine that executes approved roadmaps. This is the most complex phase. It orchestrates phases and tasks, manages agent execution, validates contracts, tracks costs, handles failures, and persists all state. This is where Phase 6-12 come together.

### Why This Phase Exists

This is the heart of the system. Without it, roadmaps cannot be executed.

### Inputs

- All prior phases completed (Phases 1-12)
- Agent definitions and prompts
- Contract definitions
- Approved roadmaps

### Deliverables

- [ ] ExecutionOrchestrator service with phase/task orchestration
- [ ] Agent execution wrapper (call actual agents, not mocks)
- [ ] Contract validation at all handoff points
- [ ] Cost tracking per agent and task
- [ ] Failure handling and repair attempt routing
- [ ] State management (track phase/task progress)
- [ ] Run artifact persistence
- [ ] POST /api/runs endpoint (start execution)
- [ ] GET /api/runs/:id endpoint (get run status)
- [ ] Tests for orchestration engine

### Implementation Tasks

- [ ] Create `backend/src/services/orchestration-engine.ts` with ExecutionOrchestrator class
- [ ] Implement `execute(roadmapId: string): Promise<Run>` method
- [ ] Create phase execution loop:
  - Check preconditions
  - For each task in phase:
    - Validate inputs against contract
    - Execute agent
    - Validate outputs against contract
    - Handle failures
    - Track costs
    - Persist artifacts
  - Check gate policy
  - Move to next phase
- [ ] Create agent execution wrapper `backend/src/services/agent-executor.ts`:
  - Call actual LLM agents (not mocks)
  - Handle timeouts
  - Track tokens and costs
  - Log execution
- [ ] Create failure handler `backend/src/services/failure-handler.ts`:
  - Classify failures
  - Route to repair agent
  - Implement retry logic
  - Escalate to human if needed
- [ ] Implement state tracking (in-memory + persist to Run object)
- [ ] Create POST /api/runs endpoint (create and start execution)
- [ ] Create GET /api/runs/:id endpoint (enhanced with live status)
- [ ] Create GET /api/runs/:id/log endpoint (streaming task logs)
- [ ] Integrate with cost tracker from Phase 14 (or build basic version now)
- [ ] Write comprehensive tests including:
  - Phase execution order
  - Contract validation at handoffs
  - Cost tracking
  - Failure handling
  - State persistence

### Files Expected to Be Created or Modified

```text
backend/src/
  services/
    orchestration-engine.ts
    agent-executor.ts
    failure-handler.ts
    state-manager.ts
  routes/
    runs.ts                                 # Enhance for real execution
backend/tests/
  services/
    orchestration-engine.test.ts
    agent-executor.test.ts
    failure-handler.test.ts
```

### Data Models / Contracts Affected

- Run model (enhanced with phase/task run status)
- PhaseRun and TaskRun models

### Testing Requirements

* [ ] Unit tests for orchestration engine logic
* [ ] Integration tests for phase execution
* [ ] Contract validation tests at handoffs
* [ ] Cost tracking tests
* [ ] Failure handling tests
* [ ] State persistence tests

### Validation Commands

```bash
npm test
npm run typecheck
npm run dev
# Manual testing with real agents
```

### Acceptance Criteria

* [ ] Orchestration engine can execute a roadmap
* [ ] Phases execute in correct order
* [ ] Tasks execute within each phase
* [ ] Contracts are validated at handoffs
* [ ] Failures are handled appropriately
* [ ] Costs are tracked
* [ ] State is persisted
* [ ] All tests pass

### Human Review Gate

A human should verify:
- Phase/task execution order is correct
- Contract validation is enforced
- Failure handling is robust
- Cost tracking is accurate
- State is persisted correctly

### Rollback Notes

Remove orchestration engine code.

### Commit Guidance

```text
feat(phase-13): orchestration execution engine

- Create ExecutionOrchestrator with phase/task orchestration
- Implement agent execution wrapper with real LLM calls
- Add contract validation at all handoff points
- Create failure handler with repair attempt routing
- Implement cost tracking per agent and task
- Add state management and persistence
- Write comprehensive tests for orchestration workflow
```

---

## Phase 14 — Execution Console and Live Monitoring

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Create real-time monitoring UI that shows execution progress, logs, costs, and allows user interaction (pause, resume, manual approval of repairs). Users watch their roadmap being built.

### Why This Phase Exists

Monitoring is critical UX. Users need visibility into what's happening and the ability to intervene if needed.

### Inputs

- Phase 13 completed (execution engine)
- Phase 4 completed (frontend shell)

### Deliverables

- [ ] Execution console page showing:
  - Current phase and task
  - Overall progress bar
  - Task list with status indicators
  - Real-time logs (streaming)
  - Cost tracking (running total, per phase, per task)
  - Time tracking (elapsed, estimated remaining)
- [ ] WebSocket or polling-based live updates
- [ ] Log viewer with filtering and search
- [ ] Pause/resume execution buttons
- [ ] Repair approval UI (if repair is attempted, show to user for approval)
- [ ] Cost and resource tracking dashboard
- [ ] Tests for UI updates and real-time data

### Implementation Tasks

- [ ] Create WebSocket server in backend for live updates (or implement polling as fallback)
- [ ] Create `frontend/src/pages/ExecutionConsole.tsx`
- [ ] Create `frontend/src/components/ExecutionProgress.tsx` showing:
  - Phase timeline with current phase highlighted
  - Task list expandable by phase
  - Status badges (pending, executing, complete, failed)
- [ ] Create `frontend/src/components/RealTimeLogs.tsx` with:
  - Streaming log lines
  - Filtering (by agent, by severity)
  - Search
  - Auto-scroll option
- [ ] Create `frontend/src/components/CostDashboard.tsx` showing:
  - Total tokens (in/out)
  - Running cost
  - Cost per phase
  - Cost per agent
  - Projected total cost
- [ ] Create `frontend/src/components/RepairApprovalModal.tsx` for:
  - Showing repair suggestion
  - Approve/reject repair
  - View repair evidence
- [ ] Implement pause/resume buttons in orchestration engine
- [ ] Add GET /api/runs/:id/log endpoint (stream logs)
- [ ] Add POST /api/runs/:id/pause endpoint
- [ ] Add POST /api/runs/:id/resume endpoint
- [ ] Add POST /api/runs/:id/approve-repair endpoint
- [ ] Write tests for UI updates

### Files Expected to Be Created or Modified

```text
frontend/src/
  pages/
    ExecutionConsole.tsx
  components/
    ExecutionProgress.tsx
    RealTimeLogs.tsx
    CostDashboard.tsx
    RepairApprovalModal.tsx
  hooks/
    useExecutionUpdates.ts                  # WebSocket or polling hook
backend/src/
  routes/
    runs.ts                                 # Add pause/resume/logs endpoints
  services/
    execution-engine.ts                     # Add pause/resume support
```

### Data Models / Contracts Affected

- Run model (add pause/resume state)

### UI/UX Requirements

- Real-time updates feel responsive (< 1s latency)
- Logs are readable with good color coding
- Cost tracking is clear and easy to understand
- Repair approval UI is obvious and easy to use
- Overall UI feels professional and polished

### API Requirements

- GET /api/runs/:id/log (streaming logs)
- POST /api/runs/:id/pause
- POST /api/runs/:id/resume
- POST /api/runs/:id/approve-repair
- WebSocket for live updates (optional, polling works as fallback)

### Testing Requirements

* [ ] Tests for real-time update hooks
* [ ] Tests for log filtering and search
* [ ] Tests for pause/resume logic
* [ ] Tests for repair approval UI

### Validation Commands

```bash
npm test
npm run dev
# Manual testing with execution in progress
```

### Acceptance Criteria

* [ ] Live updates show current phase/task
* [ ] Logs stream in real-time
* [ ] Cost tracking is accurate
* [ ] Pause/resume works
* [ ] Repair approval UI appears and works
* [ ] All tests pass
* [ ] UI feels responsive and professional

### Human Review Gate

A human should verify:
- Live updates feel responsive
- Logs are readable and helpful
- Cost tracking is accurate
- Repair approval UI is intuitive

### Rollback Notes

Remove execution console UI.

### Commit Guidance

```text
feat(phase-14): execution console and live monitoring

- Create ExecutionConsole page with real-time progress
- Implement WebSocket/polling for live updates
- Build ExecutionProgress, RealTimeLogs, CostDashboard components
- Add repair approval UI
- Implement pause/resume endpoints
- Write tests for real-time updates
```

---

## Phase 15 — Failure Taxonomy and Repair Workflow

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Classify failures (schema invalid, tool denied, test failed, etc.), implement repair logic (retry, escalate, switch agent, manual fix), and track repair attempts in the run record. Failed tasks should be recoverable where possible.

### Why This Phase Exists

Failures are inevitable. Handling them gracefully and transparently is critical. This phase makes failure recovery a first-class feature.

### Inputs

- Phase 13 completed (orchestration engine)
- Phase 15 completed (monitoring)

### Deliverables

- [ ] Failure taxonomy and classification
- [ ] Repair strategy selection logic
- [ ] Repair attempt tracking
- [ ] Escalation to human
- [ ] UI for viewing failures and repair options
- [ ] Tests for failure handling and repair

### Implementation Tasks

- [ ] Create `backend/src/services/failure-classifier.ts` to classify failures:
  - SCHEMA_INVALID (field missing, type mismatch, etc.)
  - TOOL_DENIED (permission denied)
  - COMMAND_FAILED (non-zero exit code, timeout)
  - CONTRACT_VIOLATION (handoff precondition not met)
  - QUALITY_FAILURE (test failed, confidence too low)
  - APPROVAL_REQUIRED (human approval needed)
- [ ] Implement `backend/src/services/repair-strategist.ts`:
  - For schema failures: send to Repair Agent
  - For tool failures: check permissions, retry if transient
  - For test failures: offer retry or escalate
  - For approval failures: wait for human
- [ ] Enhance orchestration engine to:
  - Catch failures
  - Classify them
  - Attempt repair
  - Track repair attempts
  - Escalate if too many failures
- [ ] Create repair agent integration (use existing agent or create minimal Repair Agent)
- [ ] Create `frontend/src/components/FailureDetail.tsx` showing:
  - Failure classification
  - Error message and evidence
  - Suggested repair options
- [ ] Create `frontend/src/components/RepairOptions.tsx` for user to:
  - Retry task
  - Escalate to human
  - Skip task (dangerous, require confirmation)
- [ ] Add failure and repair data to Run model
- [ ] Write tests for failure classification and repair

### Files Expected to Be Created or Modified

```text
backend/src/
  services/
    failure-classifier.ts
    repair-strategist.ts
  types/
    failures.ts                             # Failure taxonomy
frontend/src/
  components/
    FailureDetail.tsx
    RepairOptions.tsx
  pages/
    ExecutionConsole.tsx                    # Show failures prominently
```

### Data Models / Contracts Affected

- Run and TaskRun models (add failure and repair fields)

### UI/UX Requirements

- Failures are shown clearly with actionable repair suggestions
- Repair options are easy to understand and select
- Repair attempts are tracked and visible

### Testing Requirements

* [ ] Tests for failure classification logic
* [ ] Tests for repair strategy selection
* [ ] Tests for repair attempt limits
* [ ] Tests for escalation logic
* [ ] UI tests for failure and repair display

### Validation Commands

```bash
npm test
npm run dev
# Test with intentional failures (e.g., invalid input)
```

### Acceptance Criteria

* [ ] Failures are classified correctly
* [ ] Repair strategies are appropriate to failure type
* [ ] Repair attempts are tracked
* [ ] Escalation happens after max attempts
* [ ] UI shows failures and repair options clearly
* [ ] All tests pass

### Human Review Gate

A human should verify:
- Failure classification is accurate
- Repair strategies are sound
- Escalation logic is safe

### Rollback Notes

Remove failure and repair code.

### Commit Guidance

```text
feat(phase-15): failure taxonomy and repair workflow

- Create failure classifier with failure taxonomy
- Implement repair strategist with repair logic
- Add failure and repair tracking to Run model
- Create FailureDetail and RepairOptions UI components
- Implement repair attempt limits and escalation
- Write comprehensive tests for failure handling
```

---

## Phase 16 — Cost, Token, Resource, and Audit Tracking

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Implement complete cost and resource tracking throughout execution. Track tokens, API calls, compute time, storage, and estimate costs. Maintain an audit log of all approval decisions. Provide cost dashboards and analysis.

### Why This Phase Exists

Cost and audit tracking are critical for accountability and understanding resource usage. This phase makes them visible and queryable.

### Inputs

- Phase 13 completed (execution engine)
- Phase 14 completed (monitoring)
- Existing cost calculation library (`lib/run-tracker.js`)

### Deliverables

- [ ] Cost tracking at agent/task level
- [ ] Resource tracking (tokens, API calls, compute, memory)
- [ ] Cost calculation service
- [ ] Audit log for all approval decisions
- [ ] Cost analysis dashboard
- [ ] Cost projections and alerts
- [ ] GET /api/runs/:id/cost endpoint
- [ ] Tests for cost tracking

### Implementation Tasks

- [ ] Enhance agent executor to track:
  - Tokens in/out per call
  - API calls count
  - Latency/duration
  - Model used
- [ ] Aggregate costs at task, phase, and run level
- [ ] Create `backend/src/services/cost-calculator.ts` using existing library
- [ ] Implement cost alerts (warn if exceeding budget)
- [ ] Create audit log service `backend/src/services/audit-log.ts`:
  - Log approval decisions
  - Log phase starts/ends
  - Log failures and repairs
  - Include timestamp, user, decision, notes
- [ ] Create `frontend/src/components/CostAnalysis.tsx` showing:
  - Cost per agent
  - Cost per phase
  - Total cost vs. budget
  - Cost trend (if multiple runs)
- [ ] Create `frontend/src/components/AuditLog.tsx` showing:
  - All approval decisions chronologically
  - Failures and repairs
  - Execution timeline
- [ ] Add GET /api/runs/:id/cost endpoint (detailed cost breakdown)
- [ ] Add GET /api/runs/:id/audit endpoint (audit log)
- [ ] Write tests for cost calculations and audit logging

### Files Expected to Be Created or Modified

```text
backend/src/
  services/
    cost-calculator.ts
    audit-log.ts
  routes/
    runs.ts                                 # Add cost and audit endpoints
frontend/src/
  components/
    CostAnalysis.tsx
    AuditLog.tsx
  pages/
    ExecutionConsole.tsx                    # Show costs
```

### Data Models / Contracts Affected

- Run model (add cost and audit fields)
- TaskRun model (add cost fields)

### UI/UX Requirements

- Cost dashboard is clear and easy to understand
- Audit log is readable and chronological
- Cost alerts are prominent

### API Requirements

- GET /api/runs/:id/cost (detailed cost breakdown)
- GET /api/runs/:id/audit (audit log)

### Testing Requirements

* [ ] Tests for cost calculations
* [ ] Tests for cost aggregation
* [ ] Tests for audit logging
* [ ] Tests for cost alerts

### Validation Commands

```bash
npm test
npm run dev
# Verify costs are calculated correctly in execution
```

### Acceptance Criteria

* [ ] Costs are tracked accurately
* [ ] Costs are calculated correctly
* [ ] Audit log captures all decisions
* [ ] Cost dashboard is accurate
* [ ] Alerts trigger at budget limits
* [ ] All tests pass

### Human Review Gate

A human should verify:
- Cost calculations are accurate
- Audit log is comprehensive
- Alerts are appropriate

### Rollback Notes

Remove cost and audit code.

### Commit Guidance

```text
feat(phase-16): cost, token, resource, and audit tracking

- Enhance agent executor to track tokens and costs
- Create cost-calculator service
- Implement audit-log service for decision tracking
- Add cost and audit API endpoints
- Build CostAnalysis and AuditLog UI components
- Implement cost alerts and budget enforcement
- Write comprehensive tests for tracking
```

---

## Phase 17 — GitHub Integration

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Integrate with GitHub to enable code push. Orchestration engine can create branches, commit generated code, open PRs, and monitor CI status. Code generated during execution goes directly to GitHub.

### Why This Phase Exists

GitHub integration is the final delivery mechanism. Generated code must be pushed to repositories for real deployment.

### Inputs

- Phase 13 completed (orchestration engine)
- Phase 14 completed (monitoring)

### Deliverables

- [ ] GitHub OAuth integration
- [ ] Branch creation from roadmap phase
- [ ] Commit creation from task artifacts
- [ ] PR creation with summary
- [ ] CI status monitoring
- [ ] GitHub API client
- [ ] POST /api/runs/:id/push-to-github endpoint
- [ ] Tests for GitHub integration (with mocks)

### Implementation Tasks

- [ ] Create `backend/src/services/github-client.ts` using Octokit SDK
- [ ] Implement GitHub OAuth flow:
  - GET /api/auth/github (initiate OAuth)
  - GET /api/auth/github/callback (handle OAuth callback)
- [ ] Create `backend/src/services/github-operations.ts`:
  - createBranch(repoOwner, repoName, branchName, baseBranch)
  - createCommit(repoOwner, repoName, branchName, file, content, message)
  - createPullRequest(repoOwner, repoName, title, body, headBranch, baseBranch)
  - getCheckStatus(repoOwner, repoName, branchName)
  - mergePullRequest(repoOwner, repoName, prNumber)
- [ ] Integrate GitHub operations into orchestration engine
  - After phase completion, create branch (if configured)
  - After each task, commit artifacts
  - After execution, create PR with summary
- [ ] Create POST /api/runs/:id/push-to-github endpoint with:
  - Repository selection UI
  - Branch selection
  - PR title and description
  - Review and confirmation
- [ ] Add GitHub status to execution console
- [ ] Write tests (mock GitHub API)

### Files Expected to Be Created or Modified

```text
backend/src/
  services/
    github-client.ts
    github-operations.ts
  routes/
    auth.ts                                 # OAuth endpoints
    runs.ts                                 # Add push-to-github
frontend/src/
  components/
    GitHubPushModal.tsx
  pages/
    ExecutionConsole.tsx                    # Show GitHub status
```

### Data Models / Contracts Affected

- Run model (add GitHub fields: repoUrl, branchName, prNumber, prUrl, ciStatus)

### UI/UX Requirements

- GitHub authentication is seamless
- PR creation UI is clear
- GitHub status is visible in execution console
- PR link is clickable

### API Requirements

- GET /api/auth/github (initiate OAuth)
- GET /api/auth/github/callback (OAuth callback)
- POST /api/runs/:id/push-to-github (push code)
- GET /api/runs/:id/github-status (get PR and CI status)

### Testing Requirements

* [ ] Unit tests for GitHub operations (with mocked Octokit)
* [ ] Integration tests for full GitHub workflow
* [ ] Tests for error handling (repo not found, permission denied, etc.)
* [ ] UI tests for GitHub push modal

### Validation Commands

```bash
npm test
npm run dev
# Manual testing with real GitHub (requires test repo)
```

### Acceptance Criteria

* [ ] GitHub OAuth works
* [ ] Branches can be created
* [ ] Commits can be created
* [ ] PRs can be created
* [ ] CI status can be monitored
* [ ] All tests pass (with mocks)

### Human Review Gate

A human should verify:
- OAuth scopes are minimal (least privilege)
- GitHub operations are safe (no accidental force pushes, etc.)
- Error handling is robust
- PR template is appropriate

### Rollback Notes

Remove GitHub integration code.

### Commit Guidance

```text
feat(phase-17): GitHub integration

- Implement GitHub OAuth for authentication
- Create GitHub client and operations service
- Add branch creation, commit, PR creation workflows
- Integrate GitHub operations into orchestration engine
- Build GitHubPushModal for code push UI
- Implement CI status monitoring
- Write tests for GitHub workflow
```

---

## Phase 18 — Testing, Quality Hardening, and CI Pipeline

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Build comprehensive test suite (unit, integration, E2E), set up CI/CD pipeline, enforce quality gates (linting, type checking, coverage), and verify all critical paths are tested.

### Why This Phase Exists

Quality assurance must be continuous and automated. This phase ensures the system is robust and prevents regressions.

### Inputs

- All prior phases completed (tests written incrementally throughout)

### Deliverables

- [ ] Unit test suite (target >= 80% coverage for core services)
- [ ] Integration test suite for all API endpoints
- [ ] Contract validation tests for all handoffs
- [ ] E2E test suite for major workflows
- [ ] GitHub Actions CI pipeline
- [ ] Linting and type checking gates
- [ ] Coverage reports
- [ ] Performance tests (basic response time checks)

### Implementation Tasks

- [ ] Consolidate all tests from prior phases
- [ ] Add missing test coverage:
  - All service methods
  - All API endpoints
  - All contract validations
  - Major UI workflows
- [ ] Create `.github/workflows/ci.yml` for GitHub Actions:
  - npm install
  - npm run lint
  - npm run typecheck
  - npm test
  - npm run build
  - Upload coverage to Code Climate or Codecov
- [ ] Create coverage thresholds (minimum 80% for core services)
- [ ] Add pre-commit hooks using Husky to:
  - Run linting
  - Run type checking
  - Run tests
- [ ] Create performance test baseline (response time targets)
- [ ] Add security scanning (e.g., npm audit, OWASP dependency check)
- [ ] Document testing strategy and how to run tests locally
- [ ] Set up automated test reports

### Files Expected to Be Created or Modified

```text
.github/workflows/
  ci.yml                                    # CI pipeline
.husky/
  pre-commit                                # Pre-commit hooks
jest.config.js
vitest.config.ts
backend/tests/
  [all test files]
frontend/tests/
  [all test files]
docs/
  TESTING.md                                # Testing guide
```

### Data Models / Contracts Affected

None; this is testing infrastructure.

### Testing Requirements

* [ ] >= 80% coverage for backend services
* [ ] >= 80% coverage for critical frontend components
* [ ] All API endpoints have integration tests
* [ ] All major workflows have E2E tests
* [ ] Contract validation is tested at all handoff points

### Validation Commands

```bash
npm run lint
npm run typecheck
npm test --coverage
npm run build
```

### Acceptance Criteria

* [ ] All tests pass
* [ ] Coverage is >= 80% for core services
* [ ] Linting passes
* [ ] Type checking passes
* [ ] Build succeeds
* [ ] CI pipeline is configured and passing
* [ ] No security vulnerabilities (npm audit)

### Human Review Gate

A human should verify:
- Test coverage is adequate
- Critical paths are tested
- CI pipeline is appropriate
- Performance targets are reasonable

### Rollback Notes

Delete `.github/workflows/`, `.husky/`, and related test configuration.

### Commit Guidance

```text
test(phase-18): comprehensive test suite and CI pipeline

- Consolidate all unit and integration tests
- Add missing test coverage for critical paths
- Create GitHub Actions CI pipeline
- Set up pre-commit hooks with Husky
- Add performance and security testing
- Document testing strategy
- Achieve >= 80% coverage for core services
```

---

## Phase 19 — Security, Accessibility, and Production Readiness

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Harden security (authentication, authorization, secrets management), ensure accessibility (WCAG 2.1 AA), prepare for production deployment, and conduct final audit.

### Why This Phase Exists

Security and accessibility are non-negotiable for production. This phase ensures the system is safe and usable for all.

### Inputs

- All prior phases completed

### Deliverables

- [ ] Authentication and authorization system
- [ ] Secrets management (env vars, secrets vault)
- [ ] Input validation and sanitization
- [ ] CORS and security headers
- [ ] Rate limiting and DDoS protection
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Security audit (OWASP top 10)
- [ ] Deployment guide
- [ ] Production configuration

### Implementation Tasks

- [ ] Add authentication layer:
  - User model with hashed passwords or OAuth
  - Session management
  - Role-based access control (RBAC)
  - Permission checks on all API endpoints
- [ ] Implement authorization:
  - Only users can approve their own applications
  - Only authorized users can approve design plans/roadmaps
  - Admin-only access to agent/prompt management
- [ ] Add secrets management:
  - Load secrets from env vars (not committed)
  - Use .env files locally (not committed)
  - Document secrets required in `.env.example`
- [ ] Add input validation:
  - Validate all API request parameters
  - Sanitize user input before storage
  - Sanitize logs (no sensitive data)
- [ ] Add security headers:
  - Content-Security-Policy
  - X-Frame-Options
  - X-Content-Type-Options
  - Strict-Transport-Security (HTTPS only)
- [ ] Add CORS configuration
- [ ] Add rate limiting on API endpoints
- [ ] Run accessibility audit:
  - Use axe accessibility checker
  - Test keyboard navigation
  - Test with screen reader
  - Fix any WCAG 2.1 AA violations
- [ ] Run OWASP security audit
- [ ] Create deployment documentation:
  - System requirements (Node version, memory, etc.)
  - Installation steps
  - Configuration guide
  - Backup/restore procedures
  - Scaling considerations
- [ ] Create operations guide:
  - Monitoring and alerting
  - Troubleshooting
  - Common issues and solutions

### Files Expected to Be Created or Modified

```text
backend/src/
  middleware/
    auth.ts                                 # Authentication middleware
    rbac.ts                                 # Authorization middleware
    security-headers.ts
    rate-limit.ts
    input-validation.ts
  services/
    auth-service.ts
    rbac-service.ts
    secrets.ts
backend/.env.example
frontend/src/
  services/
    auth.ts                                 # Client-side auth
docs/
  DEPLOYMENT.md                             # Deployment guide
  OPERATIONS.md                             # Operations guide
  SECURITY.md                               # Security policy
  ACCESSIBILITY.md                          # Accessibility statement
```

### Data Models / Contracts Affected

- User model (new)
- Approval records (add user information)

### UI/UX Requirements

- Login page is accessible
- Logout is available
- Authorization is transparent (disable buttons user can't use)
- Error messages don't reveal security information

### Testing Requirements

* [ ] Tests for authentication
* [ ] Tests for authorization
* [ ] Tests for input validation
* [ ] Accessibility tests with axe
* [ ] Security tests (attempt bypassing auth, CORS violations, etc.)

### Validation Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
# Manual accessibility testing
# Manual security audit
```

### Acceptance Criteria

* [ ] Authentication works
* [ ] Authorization is enforced
* [ ] Secrets are not committed
* [ ] All security headers are set
* [ ] Input validation is comprehensive
* [ ] WCAG 2.1 AA audit passes
* [ ] OWASP audit passes (no critical vulnerabilities)
* [ ] Deployment guide is complete

### Human Review Gate

A human (security expert) should verify:
- Authentication and authorization logic is sound
- Secrets management is appropriate
- Security headers are comprehensive
- No sensitive data in logs
- WCAG 2.1 AA compliance

### Rollback Notes

Remove auth and security code.

### Commit Guidance

```text
chore(phase-19): security, accessibility, and production readiness

- Add authentication and authorization system
- Implement role-based access control (RBAC)
- Add secrets management with env vars
- Add input validation and sanitization
- Set security headers (CSP, X-Frame-Options, etc.)
- Add rate limiting
- Achieve WCAG 2.1 AA accessibility compliance
- Pass OWASP security audit
- Create deployment and operations guides
```

---

## Phase 20 — Documentation, Examples, and Operator Guide

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Document the system thoroughly: API documentation, user guide, operator guide, architecture overview, examples, and troubleshooting guide. Ensure anyone can understand and operate the system.

### Why This Phase Exists

Good documentation is critical for adoption, maintenance, and support. This phase ensures the system is understandable.

### Inputs

- All prior phases completed

### Deliverables

- [ ] README.md with overview and quick start
- [ ] API documentation (OpenAPI/Swagger or Markdown)
- [ ] User guide with screenshots
- [ ] Operator guide (deployment, monitoring, troubleshooting)
- [ ] Architecture documentation
- [ ] Examples (sample workflows, sample roadmaps, etc.)
- [ ] FAQ and troubleshooting
- [ ] Development guide (for contributors)

### Implementation Tasks

- [ ] Create/update `README.md`:
  - Project description
  - Key features
  - Architecture diagram
  - Quick start (local dev)
  - Links to detailed docs
- [ ] Create `docs/API.md`:
  - API overview
  - All endpoints with examples
  - Request/response examples
  - Error codes
  - Authentication
- [ ] Create `docs/USER_GUIDE.md`:
  - How to submit application
  - How to review design plan
  - How to review roadmap
  - How to execute and monitor
  - How to manage agents and prompts
  - Screenshots
- [ ] Create `docs/OPERATOR_GUIDE.md`:
  - System architecture
  - Installation and configuration
  - Running and monitoring
  - Troubleshooting
  - Scaling and performance
  - Backup and recovery
- [ ] Create `docs/ARCHITECTURE.md`:
  - High-level architecture diagram
  - Component descriptions
  - Data flow
  - Orchestration flow
  - Key design decisions
- [ ] Create `docs/EXAMPLES.md`:
  - Example workflows
  - Sample data
  - Expected outputs
- [ ] Create `docs/TROUBLESHOOTING.md`:
  - Common issues
  - How to debug
  - Log analysis
  - Support contacts
- [ ] Create `CONTRIBUTING.md`:
  - How to set up dev environment
  - Development workflow
  - Coding standards
  - How to run tests
  - How to submit PRs
- [ ] Add inline code documentation (JSDoc comments)
- [ ] Create swagger/OpenAPI spec (optional)
- [ ] Create video tutorials (optional, nice-to-have)

### Files Expected to Be Created or Modified

```text
README.md
CONTRIBUTING.md
docs/
  API.md
  USER_GUIDE.md
  OPERATOR_GUIDE.md
  ARCHITECTURE.md
  EXAMPLES.md
  TROUBLESHOOTING.md
  SECURITY.md
  ACCESSIBILITY.md
  DEPLOYMENT.md
  OPERATIONS.md
  openapi.json                              # Optional
```

### Data Models / Contracts Affected

None; this is documentation.

### Testing Requirements

None; documentation doesn't have tests (but should be reviewed for accuracy).

### Validation Commands

```bash
# Validate OpenAPI spec (if created)
npm install -g openapi-validator
openapi-validator docs/openapi.json
```

### Acceptance Criteria

* [ ] README is complete and accurate
* [ ] API documentation covers all endpoints
* [ ] User guide has step-by-step instructions
* [ ] Operator guide is comprehensive
* [ ] Architecture is well-documented
* [ ] Examples are complete and working
* [ ] Troubleshooting guide covers common issues
* [ ] All documentation is reviewed and approved

### Human Review Gate

A human should verify:
- Documentation is accurate and up-to-date
- All features are documented
- Examples work as described
- Troubleshooting is helpful
- Accessibility and security docs are comprehensive

### Rollback Notes

Documentation can be removed, but isn't necessary.

### Commit Guidance

```text
docs(phase-20): comprehensive documentation and examples

- Write README with overview and quick start
- Create API documentation with examples
- Write user guide with screenshots
- Create operator guide with troubleshooting
- Document architecture and design decisions
- Provide example workflows and data
- Add development and contribution guidelines
- Ensure all documentation is accurate and complete
```

---

## Phase 21 — Final Acceptance Review and Release

**Status:** Not Started  
**Completed:**  
**Completed By:**  
**Completion Notes:**  

### Goal

Conduct final UAT, security audit, performance validation, and formal acceptance. Prepare release artifacts and deploy to production (or staging for demonstration).

### Why This Phase Exists

Final acceptance ensures the system meets all requirements and is ready for use.

### Inputs

- All prior phases completed (Phases 0-20)

### Deliverables

- [ ] UAT completion report
- [ ] Security audit report (formal)
- [ ] Performance report
- [ ] Release notes
- [ ] Release checklist completion
- [ ] Production deployment (or staging demo)

### Implementation Tasks

- [ ] Conduct user acceptance testing:
  - All workflows work end-to-end
  - All requirements from BUILD_SPECIFICATION.md are met
  - No critical bugs
  - Performance is acceptable (API < 500ms, UI responsive)
- [ ] Conduct security audit (with external expert):
  - Authentication and authorization
  - Input validation and sanitization
  - Secrets management
  - Data protection
  - API security
- [ ] Conduct performance testing:
  - API response times
  - UI load times
  - Concurrent user load
  - Database query performance
- [ ] Create release notes:
  - Features included
  - Known limitations
  - Breaking changes (if any)
  - Upgrade path
- [ ] Verify all acceptance criteria from BUILD_SPECIFICATION.md
- [ ] Verify all roadmap phases are complete
- [ ] Prepare deployment package:
  - Docker image (optional)
  - Deployment instructions
  - Configuration templates
  - Database migration scripts (if applicable)
- [ ] Deploy to production or staging
- [ ] Smoke tests on deployed system
- [ ] Verify all critical workflows in production

### Files Expected to Be Created or Modified

```text
docs/
  RELEASE_NOTES.md
  RELEASE_CHECKLIST.md
Dockerfile                                  # Optional
docker-compose.yml                          # Optional
.github/workflows/
  deploy.yml                                # Optional
```

### Data Models / Contracts Affected

None; this is final verification.

### Testing Requirements

* [ ] Full UAT test suite
* [ ] Smoke tests on deployed system
* [ ] Performance tests with production data

### Validation Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
# Deploy to staging
# Run smoke tests
# Verify all workflows
```

### Acceptance Criteria

* [ ] All UAT tests pass
* [ ] Security audit passes (no critical vulnerabilities)
* [ ] Performance tests pass
* [ ] All BUILD_SPECIFICATION.md requirements are met
* [ ] All roadmap phases are complete
* [ ] Release notes are comprehensive
* [ ] System is deployable and operational

### Human Review Gate

A human (product owner, security expert, operations) should verify:
- All requirements are met
- System is production-ready
- Security is adequate
- Performance is acceptable
- Documentation is complete

### Rollback Notes

If critical issues are found, revert to last stable deployment.

### Commit Guidance

```text
chore(phase-21): final acceptance and release

- Conduct full user acceptance testing
- Execute formal security audit
- Perform production performance testing
- Create release notes and deployment guide
- Deploy to production/staging
- Verify all critical workflows
```

---

## Open Decisions

1. **Database vs. File-based Persistence:** Current plan uses file-based JSON. For production at scale, a database adapter should be added. Decision: Implement file-based in MVP, design adapter layer for future database migration.

2. **Real LLM Agent Integration:** Phases 6 & 8 use mock agents initially. Real LLM integration (calling Claude, GPT-4, etc.) happens in Phase 13+. Decision: Use mock agents for early phases to validate orchestration logic, switch to real agents in Phase 13 when contract validation is solid.

3. **WebSocket vs. Polling for Live Updates:** Phase 14 can use either WebSocket (more efficient) or polling (simpler, no server state). Decision: Start with polling, upgrade to WebSocket if performance becomes issue.

4. **Database Choice:** If database is added, PostgreSQL (structured, well-understood) or MongoDB (flexible, document-based)? Decision: Defer to Phase 2+ assessment of data model stability.

5. **Authentication Method:** OAuth (GitHub, Google) or username/password? Decision: Phase 19 should support both; OAuth for convenience, local auth for security-conscious deployments.

6. **GitHub Integration Timing:** Phase 17 integrates GitHub. Should this be earlier or later? Decision: Later (Phase 17) is correct; core orchestration must work without GitHub first.

7. **Container/Deployment Strategy:** Docker, VM, bare metal, cloud platform (AWS, Azure, GCP)? Decision: Provide Docker as option (Dockerfile in Phase 21), but system should work on any Node.js-capable system.

8. **Scaling Strategy:** How to handle 100s of concurrent orchestration runs? Decision: File-based persistence won't scale; use polling-based locking and eventual database migration.

---

## Future Enhancements (Beyond MVP)

1. **Machine Learning-Based Agent Tuning:** Use trajectory data from runs to automatically optimize prompts (DSPy-like system).

2. **Multi-Tenancy:** Support multiple teams/organizations with isolated data and agents.

3. **Advanced Scheduling:** Cron-based orchestration execution or scheduled run generation.

4. **Pull Request Feedback Integration:** GitHub PR comments feed back into system for refinement.

5. **Distributed Execution:** Parallel agent execution across multiple machines.

6. **Advanced Visualization:** Interactive architecture diagrams, dependency graphs, real-time cost flame graphs.

7. **Agent Marketplace:** Share and discover agents, prompts, and roadmaps across organizations.

8. **Custom Agent SDK:** TypeScript/Python SDK for building custom agents.

9. **Webhook Integrations:** Slack, email, custom webhooks for notifications and approvals.

10. **Advanced Analytics:** Long-term cost analysis, agent performance metrics, failure pattern analysis.

---

## Summary

This roadmap provides a 21-phase implementation plan for building the Web-Based Multi-Agent Orchestration Platform. Each phase is detailed, checkable, and builds naturally on prior phases. The roadmap is suitable for continuous execution by coding agents and is designed for incremental, demonstrable delivery.

**Key Milestones:**

- **Phase 5 Complete (Application Intake):** First end-to-end feature validates full stack
- **Phase 9 Complete (Roadmap Approval):** Design-to-roadmap workflow is solid
- **Phase 13 Complete (Orchestration Engine):** Core multi-agent execution works
- **Phase 17 Complete (GitHub Integration):** Can push code to repositories
- **Phase 21 Complete (Release):** Production-ready system

**Estimated Effort:** 26 weeks (6 months) with parallel work possible on independent components.


