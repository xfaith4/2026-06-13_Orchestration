# Orchestration Synthesis: From Stub to Working System

**Date**: 2026-06-29  
**Status**: Architecture + Implementation Blueprint Ready

---

## I. The Three-Part Problem (Current State)

### Part 1: The Stub (Executor Leaks)
**Location**: `backend/src/services/task-executor.ts:349-372`

The task executor doesn't execute. It returns mocks:
```typescript
// What gets returned:
output: `[MOCK — set ANTHROPIC_API_KEY for real output]\n\nExecuted by ${agentName}: ${task.description}`
```

**Decision Point** (lines 285-288): Routes based on env var, but even the LLM path doesn't actually dispatch to agents—it calls an LLMClient directly.

**Problem**: No agent registry. No contract enforcement. No dispatch logic. Tasks complete instantly with placeholder outputs.

---

### Part 2: The Design (Evidence Spine Already Exists)

**Good news**: Phase 32–37 were already delivered with a complete evidence spine:
- Append-only event stream (`data/run-events/{runId}.jsonl`)
- Validation baseline (Phase 33)
- Traceability reports (Phase 34)
- Repair escalation records (Phase 36)

**What's missing**: The evidence spine *records* that things failed, but nothing **generates** or **repairs** the actual application code during execution.

---

### Part 3: The Test Case (Minimal Viable Proof)

A 5-phase, 12-task "Hello World API" proves the concept:
- Phase 0: Project setup (3 tasks)
- Phase 1: Database layer (2 tasks)
- Phase 2: Services (2 tasks)
- Phase 3: Routes (3 tasks)
- Phase 4: Assembly & validation (2 tasks)

**Success**: `npm install && npm run dev` works, endpoints respond.  
**Cost**: ~$0.012 in LLM tokens (12 LLM calls × ~$0.001/call).  
**Duration**: ~5 minutes end-to-end.

---

## II. The Fix (What Needs to Happen)

### Two-Layer Fix

**Layer 1: Activate Real Agent Dispatch** (Days 1–2)
- Replace `task-executor.ts:349-372` stub with real agent invocation
- Route to agent registry instead of direct LLM calls
- Contract the agent invocation: input/output schemas
- Capture real outputs, not fake "Executed by..." strings

**Layer 2: Build the Agent Chain** (Days 3–5)
- Create specialized agent types (below) for code generation
- Wire them into the registry
- Validate outputs against contracts
- Persist artifacts to `output/projects/{runId}/`

---

## III. The Future: Five Specialized Agent Types

After 2 years of orchestration work, these five agent types emerge as **load-bearing**:

### 1. **ArchitectureDesigner** (Phase 1–2)
*What it does*: Takes a application spec and produces a component architecture.

**Input Contract**:
```typescript
{
  applicationName: string;
  description: string;
  goal: string;
  requirements: string[];
  constraints: string[];
  targetAudience: string;
}
```

**Output Contract**:
```typescript
{
  overview: string;
  architecture: string;
  components: Array<{name, description, responsibility, interfaces}>;
  techStack: {language: string; framework: string; database: string};
  tradeoffs: string[];
  recommendations: string[];
}
```

**Key Learning**: Design must name the tech stack explicitly. Ambiguity here cascades through all downstream tasks.

---

### 2. **RoadmapPlanner** (Phase 2–3)
*What it does*: Takes design + constraints, produces a phased roadmap with task dependencies.

**Input Contract**:
```typescript
{
  designPlan: DesignPlan;
  applicationConstraints: string[];
  estimatedTeamSize: number;
}
```

**Output Contract**:
```typescript
{
  phases: Array<{
    id: string;
    number: number;
    name: string;
    goal: string;
    tasks: Array<{
      id: string;
      name: string;
      description: string;
      outputSpec: string; // FILE: src/foo.ts | CONTENT: exact code structure
      dependencies: string[];
      estimatedHours: number;
    }>;
    estimatedHours: number;
    dependencies: string[];
  }>;
  totalEstimatedHours: number;
  criticalPath: string[];
}
```

**Key Learning**: Task descriptions must include explicit output specs. "Implement X" fails. "Create file src/foo.ts containing..." succeeds.

---

### 3. **CodeGenerator** (Phase 4–5)
*What it does*: Takes a single task with dependencies and produces code files.

**Input Contract**:
```typescript
{
  taskId: string;
  taskName: string;
  taskDescription: string;
  outputSpec: string; // FILE: src/foo.ts, CONTENT: [structure]
  dependencies: Array<{taskId, producedFiles: string[]}>;
  projectContext: {
    techStack: {language, framework, database};
    constraints: string[];
  };
  sharedContract: string; // Type definitions all agents import
}
```

**Output Contract**:
```typescript
{
  files: Array<{
    path: string;
    language: string;
    content: string;
    checksum: string;
  }>;
  summary: string;
  errors: string[]; // If compilation failed
}
```

**Key Learning**: The `sharedContract` is load-bearing. Agents must import shared types, not redefine them. Anti-drift enforcement at code generation time.

---

### 4. **ValidationEnforcer** (End of each phase)
*What it does*: Runs TypeScript/vitest/type checks on generated code. Produces evidence.

**Input Contract**:
```typescript
{
  projectRoot: string;
  runId: string;
  phaseId: string;
  validationMode: 'typecheck' | 'test' | 'lint';
}
```

**Output Contract**:
```typescript
{
  status: 'passed' | 'failed' | 'partial';
  output: string; // Full tsc/vitest stderr
  errors: Array<{file, line, code, message}>;
  warnings: string[];
  evidence: {
    timestamp: string;
    baseline: ValidationBaseline;
    driftDetected: boolean;
  };
}
```

**Key Learning**: Validation is the escape hatch. If code doesn't compile, repair agents see the full tsc output, not a summary.

---

### 5. **RepairOrchestrator** (On validation failure)
*What it does*: Reads validation errors, invokes CodeGenerator or ArchitectureDesigner to fix them, loops until pass/give-up.

**Input Contract**:
```typescript
{
  validationFailure: ValidationReport;
  previousRepairAttempts: RepairEscalation[];
  errorSignatureCounts: Map<string, number>;
  maxRepairAttempts: number;
}
```

**Output Contract**:
```typescript
{
  repaired: boolean;
  repairs: Array<{
    attemptNumber: number;
    targetAgent: string; // 'CodeGenerator' | 'ArchitectureDesigner'
    errorsTargeted: string[];
    result: 'success' | 'failed' | 'escalated';
  }>;
  finalStatus: 'passed' | 'failed' | 'escalated';
  escalationReason?: string;
}
```

**Key Learning**: Repair loops must have circuit breakers (repeated error signatures = give up). Otherwise, repair spirals.

---

## IV. The Meta-Orchestration Process (How You're Solving This)

**This is critical**: You are using a meta-orchestration process RIGHT NOW to solve the orchestration problem. Extract this pattern:

### Phase A: Parallel Investigation
- Three independent agents (executor audit, design schema, test case)
- No dependencies between them
- Each produces structured evidence in its domain
- **Cost**: 3 agents × ~4min each = 12 min wall-clock
- **Benefit**: Parallelism; independent perspectives

### Phase B: Synthesis
- Read findings from all three agents
- Identify patterns (stub location, evidence structure, success criteria)
- Consolidate into a coherent model
- **Cost**: 1 synthesis pass, ~5 min
- **Benefit**: Coherent picture, identifies gaps

### Phase C: Design from the Future
- Imagine 2 years of debugging this problem
- Extract agent types that emerge as load-bearing
- Document why each is necessary
- **Cost**: 1 design pass, ~10 min
- **Benefit**: Avoids dead-ends; targets high-leverage fixes

### Phase D: Implementation
- Execute the fixes in order (Layer 1, then Layer 2)
- Validate at each step
- Iterate based on evidence
- **Cost**: Variable by task
- **Benefit**: Incremental progress; early failure detection

### Phase E: Self-Examination
- Look at phases A–D above
- Extract the pattern: parallel → synthesis → future-vision → implement → loop
- **Codify** that pattern into the platform itself

---

## V. Immediate Implementation (Next Steps)

### Step 1: Fix the Executor (Layer 1)
**File**: `backend/src/services/task-executor.ts`

Replace lines 349–372 (the stub) with:

```typescript
private async runWithAgentRegistry(
  taskId: string,
  agentId: string,
  task: ExecutionTask,
  context: TaskExecutionInput
): Promise<{ status: string; result?: unknown }> {
  const agent = this.agentRegistry.getAgent(agentId);
  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const input = {
    ...task,
    dependencies: context.stackConstraints,
    sharedContract: context.sharedContract,
  };

  const result = await agent.execute(input);

  return {
    status: result.success ? 'completed' : 'failed',
    result: {
      taskId,
      agentId,
      taskName: task.name,
      output: result.output,
      tokensIn: result.tokensUsed?.input || 0,
      tokensOut: result.tokensUsed?.output || 0,
      model: result.model || 'unknown',
      timestamp: new Date().toISOString(),
      error: result.error,
    },
  };
}
```

Update the decision point (lines 285–288):

```typescript
if (process.env.ANTHROPIC_API_KEY && this.agentRegistry) {
  return this.runWithAgentRegistry(taskId, agentName, task, context);
}
if (process.env.ANTHROPIC_API_KEY) {
  return this.runWithLLM(taskId, agentName, systemPrompt, task, stackConstraints, sharedContract);
}
return this.runMock(taskId, agentName, task);
```

**Result**: Real agents invoked instead of stubs. Outputs persisted to evidence spine.

---

### Step 2: Create Agent Implementations
**Files**: Create in `agents/` directory:
- `architecture-designer.ts` → ArchitectureDesigner agent
- `roadmap-planner.ts` → RoadmapPlanner agent
- `code-generator.ts` → CodeGenerator agent
- `validation-enforcer.ts` → ValidationEnforcer agent
- `repair-orchestrator.ts` → RepairOrchestrator agent

Each agent:
- Implements `Agent` interface: `execute(input): Promise<AgentResult>`
- Validates input against contract
- Produces output matching contract
- Returns success/failure + artifacts

---

### Step 3: Wire to Agent Registry
**File**: `backend/src/services/agent-registry.ts`

Register the five agents at startup:

```typescript
this.agents.set('ArchitectureDesigner', new ArchitectureDesigner(this.llm));
this.agents.set('RoadmapPlanner', new RoadmapPlanner(this.llm));
this.agents.set('CodeGenerator', new CodeGenerator(this.llm));
this.agents.set('ValidationEnforcer', new ValidationEnforcer());
this.agents.set('RepairOrchestrator', new RepairOrchestrator(this.llm, this.agents));
```

---

### Step 4: Run the Minimal Test Case
Trigger the 5-phase Hello World API orchestration:

```bash
POST /api/applications
{ name: "Hello World API", ... }

POST /api/design-plans/generate/{appId}
# Should call ArchitectureDesigner

POST /api/roadmaps/generate/{designId}
# Should call RoadmapPlanner

POST /api/runs/{roadmapId}/execute
# Should invoke CodeGenerator × 12 tasks
# Then ValidationEnforcer
# If failed: RepairOrchestrator
```

**Expected Result**: `output/projects/{runId}/` contains 12 files, server runs, endpoints work.

---

## VI. Cost & Timeline

| Phase | Effort | Cost | Timeline |
|-------|--------|------|----------|
| Executor fix (Step 1) | 1–2 hours | $0 (code) | Today |
| Agent implementations (Step 2) | 4–6 hours | $5–10 (testing) | Days 2–3 |
| Registry wiring (Step 3) | 1–2 hours | $0 (code) | Day 3 |
| Test case validation (Step 4) | 2–3 hours | $0.05–0.10 (tokens) | Day 4 |
| **Total** | **8–13 hours** | **$5–10** | **3–4 days** |

Compare to current waste: Unknown (no metrics), but likely >$100/week on fake completions.

---

## VII. Success Metrics

✓ `output/projects/{runId}/` exists with 12 generated files  
✓ `npm install && npm run dev` succeeds  
✓ `GET /health` returns `{status: "ok"}`  
✓ `POST /items` and `GET /items` work  
✓ Total execution time < 5 minutes  
✓ Total token cost < $0.10  
✓ Evidence spine captures every agent invocation  
✓ Validation passes all TypeScript checks  

Once green baseline passes, scale to multi-phase orchestration, repair loops, and contract enforcement.

---

## VIII. The Meta-Pattern (Codify This)

Your orchestration process is:

```
Parallel(
  Investigate(executor),
  Investigate(design),
  Investigate(test-case)
).then(Synthesize)
.then(DesignFromFuture(2-years-experience))
.then(Implement(layer-by-layer))
.then(SelfExamine) // ← You are here
.then(Codify) // ← Extract pattern into platform
```

The platform should embody this:
1. **Parallel investigation** → Fan out independent agents
2. **Synthesis** → Collect evidence, identify patterns
3. **Future vision** → Design what works at scale
4. **Incremental implementation** → Build layer-by-layer
5. **Self-examination** → Observe your process; improve the orchestration

This loop should be baked into the run execution. Every run is a mini-orchestration using this same pattern.
