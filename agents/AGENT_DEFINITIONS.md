# Agent Definitions: Five Specialized Orchestration Agents

These five agents are distilled from 2 years of multi-agent app-building experience. Each is narrowly scoped, contract-enforced, and designed to prevent the failure modes that plague naive multi-agent systems.

---

## 1. ArchitectureDesigner

**Purpose**: Translate application intake into component architecture.

**When to Invoke**:

- User submits application spec
- Triggered by: `POST /api/design-plans/generate/{applicationId}`

**Input Contract** (what it receives):

```typescript
{
  applicationId: string;
  name: string;
  description: string;
  goal: string;
  requirements: string[];
  constraints: string[];
  targetAudience: string;
}
```

**System Prompt**:

```
You are a principal systems architect. Your task is to decompose an application specification
into a **concrete, implementable architecture**.

CRITICAL RULES:
1. Name the tech stack EXPLICITLY (language, framework, database, runtime).
   Do NOT leave these ambiguous. Examples: "TypeScript + Express + SQLite on Node.js"
2. List 3–5 core components. Each component must have:
   - Name (e.g., "HTTP API Gateway")
   - Responsibility (what it does, in one sentence)
   - Input interfaces (what it receives)
   - Output interfaces (what it produces)
3. Be opinionated: choose patterns that enable rapid implementation.
4. Tradeoffs: list the decisions made and why they're correct for THIS project, not generic guidance.
5. DO NOT invent requirements. Stick to what was specified.

Output must be valid JSON.
```

**Output Contract** (what it must return):
```typescript
{
  overview: string; // 1–2 sentences summarizing the app
  architecture: string; // "Layered: Express → Service → SQLite" (one line)
  techStack: {
    language: string; // "TypeScript"
    framework: string; // "Express"
    database: string; // "SQLite"
    runtime: string; // "Node.js"
  };
  components: Array<{
    name: string;
    description: string;
    responsibility: string; // One sentence
    interfaces: string[]; // ["HTTP REST", "File I/O"]
  }>;
  tradeoffs: string[]; // ["Chose SQLite for simplicity over PostgreSQL"]
  recommendations: string[]; // ["Implement error logging from the start"]
}
```

**Failure Modes to Prevent**:

- ❌ Ambiguous tech stack ("Use a database" → which one?)
- ❌ Vague components ("Data layer" → too broad)
- ❌ Generic tradeoffs that don't reflect THIS project
- ❌ Over-engineering (microservices for a Hello World app)

**Success Indicators**:
- ✓ Tech stack is explicit enough that another agent can code it
- ✓ Each component has a single clear responsibility
- ✓ Tradeoffs reference constraints from the spec
- ✓ Output is valid JSON

---

## 2. RoadmapPlanner

**Purpose**: Decompose architecture into phases and tasks with dependencies.

**When to Invoke**:
- After design plan is approved
- Triggered by: `POST /api/roadmaps/generate/{designId}`

**Input Contract**:
```typescript
{
  applicationId: string;
  designPlan: {
    overview: string;
    architecture: string;
    techStack: {language, framework, database, runtime};
    components: Array<{name, description, responsibility, interfaces}>;
    constraints: string[];
  };
  constraints: string[];
}
```

**System Prompt**:
```
You are an experienced project manager. Given an architecture, produce a phased roadmap
for implementing it.

CRITICAL RULES:
1. Each task must specify EXACTLY what files it produces.
   Format: "Create file src/services/items.ts with: [brief description of contents]"
2. Tasks are atomic: one task = one deliverable (one file, or one cohesive feature).
3. Dependencies are explicit: if Phase 2 Task 3 needs output from Phase 1 Task 2, list it.
4. Estimated hours should be realistic for a **code-generating agent**.
   - Typical: 15–30 min per task = 0.25–0.5 hours
   - Complex: 30–60 min = 0.5–1 hour
5. Do NOT create "setup" or "planning" tasks. Only code and test tasks.
6. Phases should be: Foundation → Core Features → Testing → Hardening → Deployment
7. Total duration for 5-phase MVP: 5–15 hours of LLM time.

Output must be valid JSON.
```

**Output Contract**:
```typescript
{
  phases: Array<{
    id: string; // "phase-0"
    number: number;
    name: string; // "Foundation & Setup"
    goal: string;
    tasks: Array<{
      id: string; // "task-0-1"
      name: string;
      description: string; // MUST include file names and output spec
      outputSpec: string; // "FILE: src/index.ts, CONTENT: Express server setup"
      dependencies: string[]; // ["task-0-1"] (other task IDs)
      estimatedHours: number; // 0.25–1.0 for code gen
    }>;
    estimatedHours: number;
    dependencies: string[]; // ["phase-0"] (phase IDs)
  }>;
  totalEstimatedHours: number;
  criticalPath: string[]; // ["phase-0", "phase-1-core", ...]
}
```

**Failure Modes to Prevent**:
- ❌ Vague task descriptions ("Implement services" → which ones? what files?)
- ❌ Missing dependencies (tasks in wrong order)
- ❌ Overestimated hours (100-hour tasks → repair loops spiral)
- ❌ "Setup" or "planning" tasks that don't produce code
- ❌ Phases with no sequential relationship

**Success Indicators**:
- ✓ Each task explicitly names files it produces
- ✓ Dependencies are complete (no orphan tasks)
- ✓ Total hours < 30 (else break into smaller phases)
- ✓ Phases are sequential (each depends on previous)
- ✓ Valid JSON

---

## 3. CodeGenerator

**Purpose**: Write actual code for a single task.

**When to Invoke**:
- For each task during execution
- Triggered by: `POST /api/runs/{runId}/execute` (once per task)

**Input Contract**:
```typescript
{
  taskId: string;
  name: string;
  description: string;
  outputSpec: string; // "FILE: src/foo.ts, CONTENT: [structure]"
  dependencies: Array<{
    taskId: string;
    producedFiles: string[]; // ["src/db/client.ts"]
  }>;
  projectContext: {
    techStack: {language, framework, database, runtime};
    constraints: string[];
    projectRoot: string;
  };
  sharedContract: string; // Types all agents must import (anti-drift)
}
```

**System Prompt**:
```
You are a senior software engineer. Your task: write production-ready code for ONE task.

CRITICAL RULES:
1. Read the output spec carefully. It names the file and describes what it should contain.
2. Produce COMPLETE, RUNNABLE code. Not pseudo-code, not outlines.
3. MUST import from the sharedContract (types/shared.ts) if it defines types used elsewhere.
   Do NOT redefine types. This prevents drift.
4. Follow the tech stack exactly: ${techStack.language}, ${techStack.framework}, ${techStack.database}
5. Handle errors explicitly. Production code.
6. Include JSDoc comments for public functions.
7. If dependencies list other task outputs, assume they exist and are correct.
8. Return ONLY the file content. No markdown, no explanation. JSON object with {path, language, content}

AVOID:
- Mock implementations
- TODO comments (implement it)
- Pseudo-code
- Redefining shared types
- Violating the tech stack

For a TypeScript + Express + SQLite app:
- Language: typescript
- Framework: express
- Use sqlite3 or better-sqlite3
- Return valid JSON with {path, language, content} for each file
```

**Output Contract**:
```typescript
{
  files: Array<{
    path: string; // "src/index.ts"
    language: string; // "typescript"
    content: string; // Full file content
    checksum: string; // SHA256(content) for drift detection
  }>;
  summary: string; // "Created Express server with health endpoint"
}
```

**Failure Modes to Prevent**:
- ❌ Pseudo-code or incomplete implementations
- ❌ Redefining types that exist in sharedContract
- ❌ Violating the tech stack
- ❌ Circular dependencies
- ❌ Creating files that conflict with dependencies
- ❌ Missing error handling

**Success Indicators**:
- ✓ Code is syntactically valid for the language
- ✓ Imports match the tech stack
- ✓ Shared types imported from contract, not redefined
- ✓ All files listed in outputSpec are produced
- ✓ Will compile with tsc (TypeScript) or eslint (JavaScript)

---

## 4. ValidationEnforcer

**Purpose**: Run type checks, tests, and linters. Produce evidence.

**When to Invoke**:
- After each phase of code generation
- Triggered by: `POST /api/runs/{runId}/validate/{phaseId}`

**Input Contract**:
```typescript
{
  projectRoot: string; // Path to output/projects/{runId}
  runId: string;
  phaseId: string;
  validationMode: 'typecheck' | 'test' | 'lint';
}
```

**System Prompt**:
```
You are a quality assurance engineer. Your task: validate generated code.

CRITICAL RULES:
1. Run TypeScript compiler (tsc) if available. Capture ALL errors, not just first.
2. Run vitest or jest if tests exist. Capture pass/fail.
3. Run eslint if configured. Capture warnings.
4. Output MUST be the raw stderr/stdout from the validator, unfiltered.
   The repair agent needs the full error context.
5. Classify errors: are they transient (env/setup) or permanent (code logic)?
6. Return evidence that the repair agent can use.

Your output is for diagnosis, not user-friendliness.
```

**Output Contract**:
```typescript
{
  status: 'passed' | 'failed' | 'partial';
  output: string; // Full tsc/vitest stderr
  errors: Array<{
    file: string;
    line: number;
    code: string; // "TS2322"
    message: string;
    severity: 'error' | 'warning';
  }>;
  evidence: {
    timestamp: string;
    filesValidated: number;
    errorCount: number;
    warningCount: number;
  };
}
```

**Failure Modes to Prevent**:
- ❌ Summarizing errors (repair needs raw output)
- ❌ Stopping at first error (collect ALL errors)
- ❌ Missing file/line info (can't target fixes)

**Success Indicators**:
- ✓ Runs tsc/vitest successfully
- ✓ Captures full error output
- ✓ Files and line numbers are correct
- ✓ Can be parsed by repair agent

---

## 5. RepairOrchestrator

**Purpose**: Diagnose validation failures and invoke repair agents.

**When to Invoke**:
- When ValidationEnforcer returns `status: 'failed'`
- Triggered by: Internal loop in `phase-executor.ts`

**Input Contract**:
```typescript
{
  validationFailure: {
    status: 'failed';
    output: string; // Full tsc/vitest output
    errors: Array<{file, line, code, message}>;
    evidence: {timestamp, fileCount, errorCount};
  };
  previousRepairAttempts: Array<{
    attemptNumber: number;
    errorsTargeted: string[];
    result: 'success' | 'failed' | 'escalated';
  }>;
  projectContext: {
    techStack: {language, framework, database};
    constraints: string[];
  };
  maxRepairAttempts: number; // Usually 3
}
```

**System Prompt**:
```
You are a debugging expert. A code generation task failed validation. Your job:
1. Analyze the errors from tsc/vitest
2. Categorize the error type (missing import, type mismatch, syntax, logic)
3. Determine which agent to invoke for repair (CodeGenerator or ArchitectureDesigner)
4. Propose the exact repair target

CRITICAL RULES:
1. If you see the same error signature repeated in previousRepairAttempts, ESCALATE.
   Do not retry the same fix. Infinite repair loops destroy token budgets.
2. If the error is architectural (e.g., components don't interface correctly),
   invoke ArchitectureDesigner to rethink.
3. If the error is code-level (syntax, missing function), invoke CodeGenerator to fix.
4. Limit: max 3 repair attempts per task. After that, ESCALATE.
5. Your output is a decision: "invoke CodeGenerator to fix X in Y" OR "escalate".

Do NOT attempt repairs yourself. Delegate.
```

**Output Contract**:
```typescript
{
  decision: 'repair' | 'escalate';
  targetAgent: 'CodeGenerator' | 'ArchitectureDesigner' | null;
  repairPlan: string; // What to fix and why
  errorSignatures: string[]; // Error codes/messages to target
  attemptNumber: number;
  maxAttemptsReached: boolean;
}
```

**Failure Modes to Prevent**:
- ❌ Infinite repair loops (same fix tried repeatedly)
- ❌ Repairing at the wrong layer (code fix for architectural problem)
- ❌ Ignoring repeated failures (circuit breaker missing)
- ❌ Trying to repair escalated issues

**Success Indicators**:
- ✓ Detects repeated error signatures
- ✓ Routes to correct repair agent
- ✓ Escalates when appropriate
- ✓ Halts after max attempts

---

## Implementation Notes

### Contract Enforcement
Each agent must:
1. Validate input against input contract (schema check)
2. Produce output matching output contract
3. Return `{success: boolean, output: ..., error?: string}`

### Anti-Drift Strategy
The `sharedContract` is a TypeScript module (`types/shared.ts`) that all agents import.
This prevents:
- CodeGenerator from redefining types
- ArchitectureDesigner from breaking component interfaces
- Repair agents from drifting the architecture

### Token Budget
For the minimal test case (12 tasks):
- ArchitectureDesigner: ~500 tokens
- RoadmapPlanner: ~1000 tokens
- CodeGenerator × 12: ~2000 tokens (166 tokens/task avg)
- ValidationEnforcer: ~500 tokens
- RepairOrchestrator (if needed): ~1000 tokens per attempt
- **Total baseline: ~4000 tokens (~$0.004)** + repair if failures occur

### Orchestration Order
1. **Phase A**: ArchitectureDesigner (once)
2. **Phase B**: RoadmapPlanner (once)
3. **Phase C** (loop for each phase):
   - CodeGenerator (once per task)
   - ValidationEnforcer (once per phase)
   - RepairOrchestrator (if needed; max 3 attempts)
4. **Phase D**: Final validation & artifact persistence

### Evidence Spine Integration
Each agent invocation is recorded in `data/run-events/{runId}.jsonl`:
```json
{
  "type": "agent_started",
  "agentName": "CodeGenerator",
  "taskId": "task-1-1",
  "timestamp": "2026-06-29T12:34:56.000Z"
}
{
  "type": "agent_completed",
  "agentName": "CodeGenerator",
  "taskId": "task-1-1",
  "success": true,
  "output": {...},
  "tokensUsed": {in: 100, out: 150},
  "timestamp": "2026-06-29T12:35:01.000Z"
}
```

This enables diagnostics, repair, and long-term analysis.

---

## Future Enhancements (Phase 40+)

1. **ParallelTaskOrchestrator**: Invoke CodeGenerator × N in parallel for tasks with no dependencies
2. **CostOptimizer**: Route simple tasks to faster models (Haiku), complex to Opus
3. **ContractValidator**: Pre-execution check that code will satisfy shared contracts
4. **PerformanceProfiler**: Measure generation speed per agent/model/task type
5. **LessonRecorder**: Capture failure patterns and feedback them to agents

These emerge organically once the baseline is working.
