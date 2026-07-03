# Minimal Viable Test Case: Hello World REST API

**Objective:** Prove the orchestration system can produce real application code end-to-end.

**Scope:** A complete, runnable REST API with 2 endpoints and SQLite persistence:
- `GET /health` → `{status: "ok"}`
- `POST /items {name}` → stores in SQLite, returns `{id, name}`

**Success Criteria:** After orchestration completes:
```bash
cd output/projects/{runId}
npm install
npm run dev
# curl http://localhost:3007/health
# {"status": "ok"}
```

---

## Phase-by-Phase Trace

### PHASE 0: Application Intake (User Input)

**What:** User submits application idea via UI.

**Input (HTTP POST /api/applications):**
```json
{
  "name": "Hello World API",
  "description": "A minimal REST API with health check and item management",
  "goal": "Demonstrate a working Node.js + Express + SQLite application",
  "requirements": [
    "GET /health endpoint returns {status: 'ok'}",
    "POST /items endpoint accepts {name} and stores in SQLite",
    "GET /items returns all stored items"
  ],
  "constraints": [
    "Must use Express.js",
    "Must use SQLite for persistence",
    "Must be fully functional with npm install && npm run dev",
    "No external APIs or services required"
  ]
}
```

**Output (persisted to `data/applications/{id}.json`):**
```json
{
  "id": "app-hello-world-test",
  "name": "Hello World API",
  "description": "...",
  "goal": "...",
  "requirements": [...],
  "constraints": [...],
  "status": "draft",
  "createdAt": "2026-06-29T00:00:00.000Z",
  "updatedAt": "2026-06-29T00:00:00.000Z"
}
```

**Data Flow:** `Application` → stored in `PersistenceService('applications')`

---

### PHASE 1: Design Plan Generation

**What:** LLM analyzes requirements and produces architecture plan.

**Triggered by:** User clicks "Generate Design" on Application detail page.

**Input (HTTP POST /api/design-plans/generate/{applicationId}):**
- Reads: `data/applications/app-hello-world-test.json`
- Calls: `DesignPlanGenerator.generateFromApplication(application)`
- Internally calls LLM if `ANTHROPIC_API_KEY` is set, else uses template

**System Prompt (design-plan-generator.ts):**
```
Generate an architectural design plan for a REST API application.
Return JSON with:
- overview: 1-2 sentence summary
- architecture: brief architectural pattern (e.g., "Layered: Express routes → Service → DB")
- components: array of {name, description, responsibility, interfaces}
- tradeoffs: array of architecture decisions
- recommendations: array of next steps
```

**Output (persisted to `data/design-plans/{id}.json`):**
```json
{
  "id": "design-hello-world-test",
  "applicationId": "app-hello-world-test",
  "status": "draft",
  "overview": "A minimal Node.js + Express REST API with SQLite persistence. Two endpoints: health check and item CRUD. Demonstrates basic project setup, routing, and database integration.",
  "architecture": "Layered: Express HTTP routes → TypeScript service layer → SQLite database. Synchronous execution, single process. No external dependencies beyond stdlib.",
  "components": [
    {
      "name": "HTTP API Gateway",
      "description": "Express.js server handling HTTP requests",
      "responsibility": "Route incoming requests, validate input, return responses",
      "interfaces": ["HTTP REST"]
    },
    {
      "name": "Service Layer",
      "description": "Business logic for health checks and item management",
      "responsibility": "Implement endpoint logic, call database, return data",
      "interfaces": ["TypeScript interfaces", "SQL queries"]
    },
    {
      "name": "SQLite Database",
      "description": "Local file-based database for persistent storage",
      "responsibility": "Persist items, provide ACID guarantees",
      "interfaces": ["SQL", "sqlite3 driver"]
    },
    {
      "name": "Project Setup",
      "description": "Build configuration and dependencies",
      "responsibility": "Define package.json, tsconfig, build scripts",
      "interfaces": ["npm", "TypeScript"]
    }
  ],
  "tradeoffs": [
    "Synchronous execution chosen for simplicity; easy to add async/await later",
    "SQLite chosen for zero-config persistence; would migrate to PostgreSQL at scale",
    "Single main.ts file is minimal; would split into modules for larger apps"
  ],
  "recommendations": [
    "Implement schema validation for POST /items input",
    "Add error handling and logging from day one",
    "Set up .gitignore and .env example",
    "Create README with quick-start instructions"
  ],
  "createdAt": "2026-06-29T00:00:00.000Z",
  "updatedAt": "2026-06-29T00:00:00.000Z"
}
```

**Data Flow:** `DesignPlan` → stored in `PersistenceService('design-plans')`

---

### PHASE 2: Design Plan Review & Approval

**What:** Human (or approval gate) reviews and approves design.

**Triggered by:** User clicks "Send for Review" on Design Plan detail, then "Approve".

**HTTP PATCH /api/design-plans/{id}/decision/approve:**
```json
{
  "approver": "current-user"
}
```

**Status Changes:**
- `draft` → `reviewing` (when sent for review)
- `reviewing` → `approved` (when approved)

**Updated Design Plan persisted with:**
```json
{
  "...": "...",
  "status": "approved",
  "approvedBy": "current-user",
  "approvedAt": "2026-06-29T00:05:00.000Z"
}
```

---

### PHASE 3: Roadmap Generation

**What:** LLM or template generates implementation roadmap with phases and tasks.

**Triggered by:** User clicks "Generate Roadmap" on approved Design Plan.

**Input (HTTP POST /api/roadmaps/generate/{designPlanId}):**
- Reads: approved DesignPlan from `data/design-plans/{id}.json`
- Calls: `RoadmapGenerator.generateFromDesignPlan(designPlan, applicationId)`
- Internally calls LLM if `ANTHROPIC_API_KEY` is set, else uses template

**System Prompt (roadmap-generator.ts):**
```
Generate an implementation roadmap as JSON.
Schema:
{
  "title": "...",
  "description": "...",
  "estimatedDuration": "16 hours",
  "phases": [
    {
      "id": "phase-0",
      "number": 0,
      "name": "...",
      "goal": "...",
      "estimatedHours": 8,
      "dependencies": [],
      "tasks": [
        {
          "id": "task-0-1",
          "name": "...",
          "description": "ACTION: X | OUTPUT: file(s) | CONSTRAINT: Y",
          "status": "pending",
          "estimatedHours": 2,
          "dependencies": []
        }
      ]
    }
  ]
}

Task description format (CRITICAL):
- Format: ACTION: X | OUTPUT: Y | CONSTRAINT: Z
- Name every file produced (e.g., src/index.ts)
- One line, no prose
```

**Output (persisted to `data/roadmaps/{id}.json`):**
```json
{
  "id": "roadmap-hello-world-test",
  "applicationId": "app-hello-world-test",
  "designPlanId": "design-hello-world-test",
  "title": "Hello World API Implementation Roadmap",
  "description": "Implementation plan for a minimal REST API with SQLite persistence. Two endpoints: health check and item management.",
  "status": "draft",
  "estimatedDuration": "16 hours",
  "phases": [
    {
      "id": "phase-0",
      "number": 0,
      "name": "Project Setup & Package Configuration",
      "goal": "Initialize Node.js project with TypeScript, Express, and SQLite",
      "estimatedHours": 2,
      "dependencies": [],
      "tasks": [
        {
          "id": "task-0-1",
          "name": "Create package.json and install dependencies",
          "description": "ACTION: Create package.json | OUTPUT: package.json | CONSTRAINT: Include express@5, typescript@5, sqlite3@5, tsx for dev runtime; set type:module and scripts: {dev: 'tsx src/index.ts', build: 'tsc'} | NO other changes",
          "status": "pending",
          "estimatedHours": 0.5,
          "dependencies": []
        },
        {
          "id": "task-0-2",
          "name": "Create tsconfig.json",
          "description": "ACTION: Create tsconfig.json | OUTPUT: tsconfig.json | CONSTRAINT: target:ES2020 module:ESNext moduleResolution:bundler strict:true; NO other files",
          "status": "pending",
          "estimatedHours": 0.5,
          "dependencies": ["task-0-1"]
        },
        {
          "id": "task-0-3",
          "name": "Create .gitignore and README",
          "description": "ACTION: Create .gitignore and README.md | OUTPUT: .gitignore README.md | CONSTRAINT: Ignore node_modules dist .env *.db; README must include: Quick Start (npm install && npm run dev) and API docs (GET /health POST /items GET /items); NO other files",
          "status": "pending",
          "estimatedHours": 0.5,
          "dependencies": []
        }
      ]
    },
    {
      "id": "phase-1",
      "number": 1,
      "name": "Database Schema & Migration",
      "goal": "Set up SQLite schema and initialization",
      "estimatedHours": 2,
      "dependencies": ["phase-0"],
      "tasks": [
        {
          "id": "task-1-1",
          "name": "Create database schema initialization",
          "description": "ACTION: Create src/db/init.ts | OUTPUT: src/db/init.ts | CONSTRAINT: Export async function initDb() that: creates items table (id INTEGER PRIMARY KEY, name TEXT NOT NULL, createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP) if not exists; uses sqlite3 driver; NO ORM; synchronous or async OK",
          "status": "pending",
          "estimatedHours": 1,
          "dependencies": []
        },
        {
          "id": "task-1-2",
          "name": "Create database client singleton",
          "description": "ACTION: Create src/db/client.ts | OUTPUT: src/db/client.ts | CONSTRAINT: Export singleton getInstance() that opens data/app.db with sqlite3; initialize schema on first call using initDb from task-1-1; NO connection pooling; return Database instance; NO other exports",
          "status": "pending",
          "estimatedHours": 1,
          "dependencies": ["task-1-1"]
        }
      ]
    },
    {
      "id": "phase-2",
      "number": 2,
      "name": "Service Layer Implementation",
      "goal": "Implement business logic for health checks and item management",
      "estimatedHours": 3,
      "dependencies": ["phase-1"],
      "tasks": [
        {
          "id": "task-2-1",
          "name": "Create health check service",
          "description": "ACTION: Create src/services/health.ts | OUTPUT: src/services/health.ts | CONSTRAINT: Export async function getHealth() returning {status: 'ok', timestamp: ISO string}; NO database calls; NO other exports",
          "status": "pending",
          "estimatedHours": 0.5,
          "dependencies": []
        },
        {
          "id": "task-2-2",
          "name": "Create items service",
          "description": "ACTION: Create src/services/items.ts | OUTPUT: src/services/items.ts | CONSTRAINT: Export: addItem(name: string) -> Promise<{id: number, name: string}>; getItems() -> Promise<{id:number, name:string}[]>; Uses db client from src/db/client; SQL INSERT returns last insert rowid; NO validation here (routes will validate); NO other exports",
          "status": "pending",
          "estimatedHours": 1.5,
          "dependencies": ["task-1-2"]
        }
      ]
    },
    {
      "id": "phase-3",
      "number": 3,
      "name": "Express Routes & Handlers",
      "goal": "Implement HTTP endpoints",
      "estimatedHours": 3,
      "dependencies": ["phase-2"],
      "tasks": [
        {
          "id": "task-3-1",
          "name": "Create GET /health handler",
          "description": "ACTION: Create src/routes/health.ts | OUTPUT: src/routes/health.ts | CONSTRAINT: Export express Router; GET /health calls getHealth() service; return JSON {status, timestamp}; handle errors with 500; NO other routes; NO other exports",
          "status": "pending",
          "estimatedHours": 0.5,
          "dependencies": []
        },
        {
          "id": "task-3-2",
          "name": "Create POST /items and GET /items handlers",
          "description": "ACTION: Create src/routes/items.ts | OUTPUT: src/routes/items.ts | CONSTRAINT: Export express Router; POST /items: validate {name: string} (required, non-empty); call addItem(name); return 201 + {id, name}; GET /items: call getItems(); return 200 + array; errors return 400/500 with {error: string}; NO other routes",
          "status": "pending",
          "estimatedHours": 1,
          "dependencies": ["task-2-2"]
        },
        {
          "id": "task-3-3",
          "name": "Create error handling middleware",
          "description": "ACTION: Create src/middleware/errorHandler.ts | OUTPUT: src/middleware/errorHandler.ts | CONSTRAINT: Export express ErrorRequestHandler; catch all errors; log to console; return {error: message} with appropriate status code; NO file logging",
          "status": "pending",
          "estimatedHours": 0.5,
          "dependencies": []
        }
      ]
    },
    {
      "id": "phase-4",
      "number": 4,
      "name": "Main Application Assembly",
      "goal": "Assemble all components into a runnable Express app",
      "estimatedHours": 2,
      "dependencies": ["phase-3"],
      "tasks": [
        {
          "id": "task-4-1",
          "name": "Create main.ts entry point",
          "description": "ACTION: Create src/index.ts | OUTPUT: src/index.ts | CONSTRAINT: Express app creation; call initDb() on startup; use PORT env var (default 3007); mount health router at /health; mount items router at /items; attach error handler; listen() and log 'Server running on port X'; NO other files; simple console logging only",
          "status": "pending",
          "estimatedHours": 1,
          "dependencies": ["task-3-1", "task-3-2", "task-3-3"]
        },
        {
          "id": "task-4-2",
          "name": "Verify TypeScript compilation",
          "description": "ACTION: Run tsc --noEmit and ensure zero errors | OUTPUT: None (verification only) | CONSTRAINT: Must produce no tsc errors; npm run build should complete successfully with no output to stderr",
          "status": "pending",
          "estimatedHours": 1,
          "dependencies": ["task-4-1"]
        }
      ]
    }
  ],
  "createdAt": "2026-06-29T00:00:00.000Z",
  "updatedAt": "2026-06-29T00:00:00.000Z"
}
```

**Data Flow:** `Roadmap` → stored in `PersistenceService('roadmaps')`

---

### PHASE 4: Roadmap Review & Approval

**What:** Human (or approval gate) reviews and approves roadmap.

**Triggered by:** User clicks "Send for Review" then "Approve".

**HTTP PATCH /api/roadmaps/{id}/decision/approve:**
```json
{
  "approver": "current-user"
}
```

**Status Changes:**
- `draft` → `reviewing` → `approved`

**Updated Roadmap persisted with:**
```json
{
  "...": "...",
  "status": "approved",
  "approvedBy": "current-user",
  "approvedAt": "2026-06-29T00:10:00.000Z"
}
```

---

### PHASE 5: Execution Run Creation

**What:** System creates a Run object to track execution of the roadmap.

**Triggered by:** User clicks "Start Execution" on approved Roadmap.

**Input (HTTP POST /api/runs):**
```json
{
  "roadmapId": "roadmap-hello-world-test",
  "applicationId": "app-hello-world-test"
}
```

**Output (persisted to `data/runs/{id}.json`):**
```json
{
  "id": "run-hello-world-001",
  "roadmapId": "roadmap-hello-world-test",
  "applicationId": "app-hello-world-test",
  "title": "Hello World API Implementation Roadmap",
  "description": "...",
  "status": "pending",
  "startedAt": "2026-06-29T00:15:00.000Z",
  "phases": [
    {
      "id": "phase-0",
      "number": 0,
      "name": "Project Setup & Package Configuration",
      "goal": "...",
      "status": "pending",
      "tasks": [
        {
          "id": "task-0-1",
          "name": "Create package.json and install dependencies",
          "description": "...",
          "status": "pending",
          "assignedTo": null,
          "startedAt": null,
          "completedAt": null,
          "output": null,
          "error": null
        },
        // ... all tasks from phases with status: pending
      ]
    },
    // ... all phases from roadmap
  ],
  "createdAt": "2026-06-29T00:15:00.000Z",
  "updatedAt": "2026-06-29T00:15:00.000Z"
}
```

**Data Flow:** `Run` (derived from `Roadmap`) → stored in `PersistenceService('runs')`

---

### PHASE 6: Execution — Phase 0 (Project Setup)

**What:** Agent executes tasks in parallel (or sequentially based on dependencies).

**Triggered by:** User clicks "Start Phase" or system auto-advances.

**Task 0-1: Create package.json**

**HTTP POST /api/execution/{runId}/phase/{phaseId}/task/{taskId}/execute:**
```json
{
  "agentId": "agent-project-setup",
  "promptId": "prompt-package-json",
  "variables": {
    "projectName": "hello-world-api",
    "dependencies": ["express@5", "sqlite3@5"],
    "devDependencies": ["typescript@5", "tsx@latest"]
  }
}
```

**Agent Execution (TaskExecutor):**
1. Loads agent definition from `agents/agent-project-setup.yaml` (or json)
2. Loads prompt from `Prompts/` if specified
3. Constructs LLM call with task description as context
4. LLM returns code block: `package.json`
5. `OutputParser` extracts file artifacts
6. `ProjectWriter` writes to `output/projects/{runId}/package.json`
7. Validates output exists and is valid JSON
8. Returns success/error

**Expected Output File:** `output/projects/run-hello-world-001/package.json`
```json
{
  "name": "hello-world-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "express": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "latest"
  }
}
```

**Task Status Update:** `pending` → `in-progress` → `completed`

**Run Event Log Entry:**
```json
{
  "ts": "2026-06-29T00:16:00.000Z",
  "level": "info",
  "runId": "run-hello-world-001",
  "type": "agent_completed",
  "agent": "agent-project-setup",
  "stage": "phase-0",
  "step": "task-0-1",
  "msg": "Generated package.json",
  "data": {
    "taskId": "task-0-1",
    "file": "package.json",
    "tokensIn": 250,
    "tokensOut": 120,
    "cost": 0.0018
  }
}
```

**Task 0-2 & 0-3:** Similar execution for tsconfig.json and .gitignore

**Phase 0 Completion:** All 3 tasks complete → phase status becomes `completed`

**Files Written to Disk:**
```
output/projects/run-hello-world-001/
├── package.json          ← task-0-1
├── tsconfig.json         ← task-0-2
├── .gitignore            ← task-0-3
├── README.md             ← task-0-3
└── .run-manifest.json    ← created by ProjectWriter.writeManifest()
```

---

### PHASE 6B: Execution — Phase 1 (Database Schema)

**Task 1-1: Create src/db/init.ts**

**Agent Execution:**
- Agent receives task description with dependencies (task-0-1, 0-2 completed)
- LLM generates TypeScript file
- `OutputParser` extracts: `src/db/init.ts`
- `ProjectWriter` writes file
- Validates TypeScript syntax (via tsc --noEmit on generated file)

**Expected Output File:** `output/projects/run-hello-world-001/src/db/init.ts`
```typescript
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

export async function initDb(db: sqlite3.Database) {
  const run = promisify(db.run.bind(db));
  
  await run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
```

**Task 1-2: Create src/db/client.ts**

**Expected Output File:** `output/projects/run-hello-world-001/src/db/client.ts`
```typescript
import sqlite3 from 'sqlite3';
import { initDb } from './init.js';

let db: sqlite3.Database | null = null;

export function getDb(): sqlite3.Database {
  if (!db) {
    db = new sqlite3.Database('data/app.db');
    initDb(db);
  }
  return db;
}
```

**Phase 1 Completion:** Both tasks done → phase status `completed`

---

### PHASE 6C: Execution — Phase 2 (Service Layer)

**Task 2-1: Create src/services/health.ts**

**Expected Output:** `output/projects/run-hello-world-001/src/services/health.ts`
```typescript
export async function getHealth() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };
}
```

**Task 2-2: Create src/services/items.ts**

**Expected Output:** `output/projects/run-hello-world-001/src/services/items.ts`
```typescript
import { getDb } from '../db/client.js';
import { promisify } from 'util';

export async function addItem(name: string): Promise<{ id: number; name: string }> {
  const db = getDb();
  const run = promisify(db.run.bind(db));
  
  const result = await run('INSERT INTO items (name) VALUES (?)', [name]);
  return { id: result.lastID, name };
}

export async function getItems(): Promise<{ id: number; name: string }[]> {
  const db = getDb();
  const all = promisify(db.all.bind(db));
  
  return all('SELECT id, name FROM items ORDER BY createdAt DESC');
}
```

**Phase 2 Completion:** 2 tasks done

---

### PHASE 6D: Execution — Phase 3 (Routes)

**Task 3-1, 3-2, 3-3:** Create route handlers and middleware

**Expected Files:**
- `output/projects/run-hello-world-001/src/routes/health.ts`
- `output/projects/run-hello-world-001/src/routes/items.ts`
- `output/projects/run-hello-world-001/src/middleware/errorHandler.ts`

---

### PHASE 6E: Execution — Phase 4 (Main Assembly & Validation)

**Task 4-1: Create src/index.ts**

**Expected Output:** `output/projects/run-hello-world-001/src/index.ts`
```typescript
import express from 'express';
import { getDb } from './db/client.js';
import { initDb } from './db/init.js';
import healthRoutes from './routes/health.js';
import itemsRoutes from './routes/items.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3007;

app.use(express.json());

// Routes
app.use('/health', healthRoutes);
app.use('/items', itemsRoutes);

// Error handler
app.use(errorHandler);

async function main() {
  const db = getDb();
  await initDb(db);
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

main().catch(console.error);
```

**Task 4-2: Validate TypeScript Compilation**

**Agent Execution:**
1. Agent receives task: "Run tsc --noEmit and ensure zero errors"
2. Agent changes to `output/projects/run-hello-world-001/`
3. Runs: `npx tsc --noEmit`
4. If exit code 0: task succeeds
5. If exit code != 0: task fails, agent reports errors

**Expected Result:** No TypeScript errors

**Phase 4 Completion:** All 5 phases and 12 tasks executed

---

### PHASE 7: Validation & Verification

**What:** System validates that generated code is correct.

**Automated Checks (ProjectValidator):**
1. All files exist at expected paths
2. All files are valid JSON/TypeScript/JavaScript
3. No syntax errors (tsc --noEmit passes)
4. All imports resolve correctly
5. Required exports are present (e.g., `export async function getHealth()`)

**Files Checked:**
```
output/projects/run-hello-world-001/
├── package.json                      ✓ valid JSON, has dependencies
├── tsconfig.json                     ✓ valid JSON
├── .gitignore                        ✓ text file
├── README.md                         ✓ text file
├── src/
│   ├── index.ts                      ✓ valid TS, main export
│   ├── db/
│   │   ├── init.ts                   ✓ valid TS, exports initDb
│   │   └── client.ts                 ✓ valid TS, exports getDb
│   ├── services/
│   │   ├── health.ts                 ✓ valid TS, exports getHealth
│   │   └── items.ts                  ✓ valid TS, exports addItem getItems
│   ├── routes/
│   │   ├── health.ts                 ✓ valid TS, exports Router
│   │   └── items.ts                  ✓ valid TS, exports Router
│   └── middleware/
│       └── errorHandler.ts           ✓ valid TS, exports ErrorHandler
```

**Validation Output (Run.validation):**
```json
{
  "status": "passed",
  "totalErrors": 0,
  "checkedAt": "2026-06-29T00:45:00.000Z",
  "summary": "All 12 files validated. TypeScript compilation passes. All exports present and correctly typed."
}
```

---

### PHASE 8: Artifact Collection & Reporting

**What:** System collects all produced files and creates run report.

**Output Directory:** `output/projects/run-hello-world-001/`

**Run Manifest Created:** `.run-manifest.json`
```json
{
  "runId": "run-hello-world-001",
  "generatedAt": "2026-06-29T00:45:00.000Z",
  "totalFiles": 12,
  "filesByType": {
    "json": 2,
    "typescript": 8,
    "markdown": 1,
    "plaintext": 1
  },
  "files": [
    { "path": "package.json", "language": "json" },
    { "path": "tsconfig.json", "language": "json" },
    { "path": ".gitignore", "language": "plaintext" },
    { "path": "README.md", "language": "markdown" },
    { "path": "src/index.ts", "language": "typescript" },
    { "path": "src/db/init.ts", "language": "typescript" },
    { "path": "src/db/client.ts", "language": "typescript" },
    { "path": "src/services/health.ts", "language": "typescript" },
    { "path": "src/services/items.ts", "language": "typescript" },
    { "path": "src/routes/health.ts", "language": "typescript" },
    { "path": "src/routes/items.ts", "language": "typescript" },
    { "path": "src/middleware/errorHandler.ts", "language": "typescript" }
  ]
}
```

**Run Cost Report:**
```json
{
  "runId": "run-hello-world-001",
  "totalCost": 0.012,
  "currency": "USD",
  "pricingAsOf": "2026-06-29",
  "calls": 12,
  "tokenInputs": 3500,
  "tokenOutputs": 2100,
  "cacheWriteTokens": 0,
  "cacheReadTokens": 0,
  "cacheHitRatio": 0,
  "costByTokenType": {
    "input": 0.0053,
    "output": 0.0063,
    "cacheWrite": 0,
    "cacheRead": 0
  },
  "byPhase": [
    { "phase": "Project Setup", "cost": 0.003 },
    { "phase": "Database Schema", "cost": 0.002 },
    { "phase": "Service Layer", "cost": 0.002 },
    { "phase": "Routes", "cost": 0.002 },
    { "phase": "Main Assembly", "cost": 0.003 }
  ]
}
```

**Final Run Status:** `completed`

**Run Summary:** `data/runs/run-hello-world-001.json` updated with:
```json
{
  "id": "run-hello-world-001",
  "status": "completed",
  "completedAt": "2026-06-29T00:45:00.000Z",
  "summary": "Successfully generated Hello World API with 12 files across 5 phases",
  "validation": {
    "status": "passed",
    "totalErrors": 0,
    "summary": "All files validated. TypeScript compilation passes."
  },
  "totalCost": {
    "estimatedCost": 0.012,
    "currency": "USD"
  },
  "phaseCosts": [...]
}
```

---

## Verification: Running the Generated Application

**Test Protocol (Manual or Automated):**

```bash
# 1. Navigate to generated project
cd output/projects/run-hello-world-001

# 2. Verify file structure
ls -la
# Expected: package.json tsconfig.json src/ README.md .gitignore

# 3. Install dependencies
npm install
# Expected: exit 0, creates node_modules/

# 4. Compile TypeScript
npm run build
# Expected: exit 0, creates dist/ or compiles in place

# 5. Start server (in background)
npm run dev &
# Expected: "Server running on port 3007"

# 6. Test GET /health endpoint
curl http://localhost:3007/health
# Expected: {"status": "ok", "timestamp": "2026-06-29T00:46:00.000Z"}
# HTTP 200

# 7. Test POST /items endpoint
curl -X POST http://localhost:3007/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Item"}'
# Expected: {"id": 1, "name": "Test Item"}
# HTTP 201

# 8. Test GET /items endpoint
curl http://localhost:3007/items
# Expected: [{"id": 1, "name": "Test Item"}]
# HTTP 200

# 9. Test POST /items with another item
curl -X POST http://localhost:3007/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Another Item"}'
# Expected: {"id": 2, "name": "Another Item"}

# 10. Verify database persistence
curl http://localhost:3007/items
# Expected: [{"id": 2, "name": "Another Item"}, {"id": 1, "name": "Test Item"}]

# 11. Stop server
pkill -f "npm run dev"
```

**Success Criteria (All Must Pass):**
- ✓ File structure matches roadmap output
- ✓ `npm install` completes without errors
- ✓ `npm run build` (tsc) completes without errors
- ✓ Server starts and listens on port 3007
- ✓ `GET /health` returns 200 + correct JSON
- ✓ `POST /items` returns 201 + created item with ID
- ✓ `GET /items` returns 200 + array of items
- ✓ Items persist across requests (stored in data/app.db)
- ✓ No runtime errors in console

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Files Generated** | 12 | Count in .run-manifest.json |
| **Phases Completed** | 5 | Run.phases[*].status == 'completed' |
| **Tasks Completed** | 12 | Run.phases[*].tasks[*].status == 'completed' |
| **Validation Status** | passed | Run.validation.status == 'passed' |
| **TypeScript Errors** | 0 | tsc --noEmit exit code == 0 |
| **Runtime Test: GET /health** | 200 + {status: 'ok'} | curl test |
| **Runtime Test: POST /items** | 201 + {id, name} | curl test |
| **Runtime Test: GET /items** | 200 + array | curl test |
| **Time to Completion** | < 5 minutes | End timestamp - start timestamp |
| **Cost** | < $0.05 | Run.totalCost |

---

## Data Persistence Paths

**All state persists to `data/` directory:**

| Entity | Path | Format |
|--------|------|--------|
| Application | `data/applications/{id}.json` | JSON |
| Design Plan | `data/design-plans/{id}.json` | JSON |
| Roadmap | `data/roadmaps/{id}.json` | JSON |
| Run | `data/runs/{id}.json` | JSON |
| Audit Logs | `data/audit-logs/{id}.json` | JSON (one per action) |
| Run Events | `data/run-logs/{runId}/events.jsonl` | JSONL (append-only) |
| Error Logs | `data/error-logs/{runId}.json` | JSON |
| Generated Code | `output/projects/{runId}/**/*` | Source files (TS, JSON, etc.) |
| Generated Database | `output/projects/{runId}/data/app.db` | SQLite binary |

---

## Key Design Insights

### 1. **Task Descriptions Are Critical**

Each task's `description` field must be a **compact directive**, not prose:
- ✓ Good: `ACTION: Create package.json | OUTPUT: package.json | CONSTRAINT: Include express@5`
- ✗ Bad: `Create a comprehensive package.json file with all necessary dependencies`

The agent uses this description as its **primary instruction**, so ambiguity costs tokens and risks interpretive drift.

### 2. **Output Specification Must Be Explicit**

Every task must name the exact files it produces:
- ✓ Good: `OUTPUT: src/db/init.ts src/db/client.ts`
- ✗ Bad: `OUTPUT: database setup files`

The orchestration system uses this to extract and persist the correct artifacts.

### 3. **Dependencies Drive Sequencing**

Tasks with dependencies wait for predecessors:
- Phase 1 (DB schema) waits for Phase 0 (tsconfig, package.json)
- Phase 2 (Services) waits for Phase 1 (DB client)
- Phase 3 (Routes) waits for Phase 2 (Service exports)
- Phase 4 (Main) waits for Phase 3 (All routes/middleware)

Missing or incorrect dependencies cause the run to stall or fail.

### 4. **Validation is the Escape Hatch**

When agents produce code that doesn't type-check, the **ProjectValidator** catches it:
- Runs `tsc --noEmit` on generated code
- Reports all errors back to the repair loop
- Agent can then re-generate correctly

This is why Task 4-2 (Verify TypeScript Compilation) is critical: it proves all prior tasks succeeded.

### 5. **Cost is Incurred Per Task Execution**

Each LLM call costs tokens. A 12-task roadmap costs 12 calls:
- Total tokens: ~5600 (3500 input + 2100 output)
- Total cost at Haiku rates: ~$0.012
- Optimization: Reuse prompts (Task 2-2 can inherit from Task 2-1)

---

## Running This Test Case

**To execute this test case in the orchestration UI:**

1. **Create Application:**
   - Navigate to `http://localhost:5176/applications`
   - Click "New Application"
   - Paste the application JSON from PHASE 0 (above)
   - Click "Create"

2. **Generate Design Plan:**
   - View the created Application
   - Click "Generate Design Plan"
   - Review the generated design (should match PHASE 1 output)
   - Click "Send for Review" → "Approve"

3. **Generate Roadmap:**
   - Click "Generate Roadmap" on approved Design Plan
   - Review the generated roadmap with 5 phases and 12 tasks
   - Click "Send for Review" → "Approve"

4. **Execute Roadmap:**
   - Click "Create Run" on approved Roadmap
   - Monitor the Run Detail page as tasks execute
   - Watch the event log and cost accumulate in real-time

5. **Verify Results:**
   - Once run completes, navigate to `output/projects/{runId}/`
   - Run the verification protocol (npm install, npm run dev, curl tests)
   - All 5 success criteria should pass

---

## Future Test Cases

Once this minimal case succeeds, the next test cases should be:

1. **Add Database Migrations** (2 phases, 4 tasks)
   - ALTER TABLE operations
   - Multi-table relationships (users, posts, comments)
   - Foreign key constraints

2. **Add Authentication** (3 phases, 8 tasks)
   - JWT token generation
   - Password hashing
   - Protected routes

3. **Add Validation & Error Handling** (2 phases, 6 tasks)
   - Input schema validation (Zod or similar)
   - Comprehensive error responses
   - Structured logging

4. **Add Testing** (2 phases, 5 tasks)
   - Unit tests (Vitest)
   - Integration tests
   - 80%+ code coverage

Each builds on this baseline, proving that the orchestration system scales from simple (Hello World) to realistic (production-ready API).
