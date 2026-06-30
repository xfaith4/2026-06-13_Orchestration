# Task Executor Fix: Activate Real Agent Dispatch

**File**: `backend/src/services/task-executor.ts`  
**Status**: Ready to apply  
**Impact**: Replaces stub execution with real agent invocation  

---

## Problem

Lines 349–372 (the `runMock` method) return fake outputs:
```typescript
output: `[MOCK — set ANTHROPIC_API_KEY for real output]\n\nExecuted by ${agentName}: ${task.description}`,
```

This leaks into the evidence spine and signals a false completion. Downstream agents have nothing real to work with.

---

## Solution

Replace the stub executor with **agent registry dispatch**. The fix has three parts:

### Part 1: Update the Decision Point (Lines 285–289)

**Current**:
```typescript
if (process.env.ANTHROPIC_API_KEY) {
  return this.runWithLLM(taskId, agentName, systemPrompt, task, stackConstraints, sharedContract);
}
return this.runMock(taskId, agentName, task);
```

**Fixed**:
```typescript
// NEW: Check if we have an agent registry first (real agents)
if (this.agentRegistry && process.env.ANTHROPIC_API_KEY) {
  return this.runWithAgentRegistry(
    taskId,
    agentName,
    task,
    { stackConstraints, sharedContract, runId: context.runId }
  );
}
// FALLBACK: Direct LLM call (for backward compat)
if (process.env.ANTHROPIC_API_KEY) {
  return this.runWithLLM(taskId, agentName, systemPrompt, task, stackConstraints, sharedContract);
}
// LAST RESORT: Mock (for testing without API key)
return this.runMock(taskId, agentName, task);
```

### Part 2: Add the Agent Registry Method (Insert before Line 349)

**New method**:
```typescript
private async runWithAgentRegistry(
  taskId: string,
  agentName: string,
  task: ExecutionTask,
  context: {stackConstraints?: StackConstraints; sharedContract?: string; runId?: string}
): Promise<{ status: string; result?: unknown }> {
  const agent = this.agentRegistry.getAgent(agentName);
  if (!agent) {
    // Fallback to LLM if agent not registered
    console.warn(`[TaskExecutor] Agent not found: ${agentName}, falling back to LLM`);
    return this.runWithLLM(
      taskId,
      agentName,
      FALLBACK_SYSTEM_PROMPT, // defined below
      task,
      context.stackConstraints,
      context.sharedContract
    );
  }

  try {
    const startTime = Date.now();
    
    // Prepare agent input
    const agentInput = {
      ...task,
      taskId,
      dependencies: context.stackConstraints,
      sharedContract: context.sharedContract,
      runId: context.runId,
    };

    // Invoke the agent
    const agentResult = await agent.execute(agentInput);

    const duration = Date.now() - startTime;

    // Validate output contract
    if (!agentResult || typeof agentResult !== 'object') {
      return {
        status: 'failed',
        result: {
          taskId,
          agentName,
          taskName: task.name,
          output: agentResult,
          error: `Agent returned invalid output type: ${typeof agentResult}`,
          timestamp: new Date().toISOString(),
          duration,
        },
      };
    }

    // Log execution
    console.log(
      `[TaskExecutor] Agent execution: ${agentName} (task ${taskId}) ` +
        `completed in ${duration}ms, ` +
        `success=${agentResult.success}, ` +
        `tokens=${agentResult.tokensUsed?.input || 0}→${agentResult.tokensUsed?.output || 0}`
    );

    // Return result with evidence spine fields
    return {
      status: agentResult.success ? 'completed' : 'failed',
      result: {
        taskId,
        agentName,
        taskName: task.name,
        output: agentResult.output,
        error: agentResult.error,
        tokensIn: agentResult.tokensUsed?.input || 0,
        tokensOut: agentResult.tokensUsed?.output || 0,
        tokensCacheWrite: agentResult.tokensUsed?.cacheWrite || 0,
        tokensCacheRead: agentResult.tokensUsed?.cacheRead || 0,
        model: agentResult.model || 'agent-registry',
        timestamp: new Date().toISOString(),
        duration,
      },
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[TaskExecutor] Agent execution failed: ${agentName}, task ${taskId}: ${errorMsg}`);

    return {
      status: 'failed',
      result: {
        taskId,
        agentName,
        taskName: task.name,
        output: null,
        error: `Agent execution error: ${errorMsg}`,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
```

### Part 3: Update the Constructor

Add agent registry injection to the TaskExecutor constructor:

**Current** (lines ~50–80, depends on actual code):
```typescript
constructor(
  private llmClient: LLMClient,
  private promptRegistry: PromptRegistry,
  private errorHandler: ErrorHandler,
  private outputParser: OutputParser
) {
  // ...
}
```

**Fixed**:
```typescript
constructor(
  private llmClient: LLMClient,
  private promptRegistry: PromptRegistry,
  private errorHandler: ErrorHandler,
  private outputParser: OutputParser,
  private agentRegistry?: AgentRegistry // NEW: optional agent registry
) {
  // ...
}
```

### Part 4: Add Fallback System Prompt

Add this constant near the top of the file:

```typescript
const FALLBACK_SYSTEM_PROMPT = `You are a specialized code-generation agent. Your task is to produce production-ready code.

CRITICAL RULES:
1. Produce COMPLETE, RUNNABLE code. Not pseudo-code, not outlines.
2. Follow the tech stack and constraints exactly.
3. Handle errors explicitly. Production code.
4. If dependencies list other task outputs, assume they exist and import them correctly.
5. Return ONLY the file content in the specified format.

For each file:
## File: path/to/file.ext
\`\`\`language
content
\`\`\``;
```

---

## How to Apply

### Mechanical Steps

1. **Open** `backend/src/services/task-executor.ts`
2. **Replace** lines 285–289 with the fixed decision point
3. **Insert** the `runWithAgentRegistry` method before line 349
4. **Update** the constructor to accept optional `agentRegistry`
5. **Add** the `FALLBACK_SYSTEM_PROMPT` constant at the top

### Testing

1. Start the dev server: `npm run dev`
2. Verify `agentRegistry` is injected into TaskExecutor
3. Create an application and trigger a run
4. Check `/api/runs/{runId}` to see:
   - Tasks now have real output (not "Executed by Commissioner...")
   - Token counts are real (from agent execution)
   - Evidence spine records agent invocations

### Rollback

If something breaks:
- The fallback chain ensures backward compatibility
- Revert the decision point logic to prefer `runWithLLM`
- The mock executor still exists and will be used

---

## Result

**Before**:
```json
{
  "status": "completed",
  "output": "Executed by Commissioner: Implement API Gateway"
}
```

**After**:
```json
{
  "status": "completed",
  "output": {
    "files": [
      {"path": "src/index.ts", "language": "typescript", "content": "import express..."}
    ],
    "summary": "Created Express server with health endpoint"
  },
  "tokensIn": 450,
  "tokensOut": 1200,
  "model": "claude-opus-4-8"
}
```

Real agents produce real code. Evidence spine captures real events. Repair loops have something to work with.

---

## Agent Registry Initialization

The agent registry must be initialized in `backend/src/app.ts` or `backend/src/index.ts`:

```typescript
import { AgentRegistry } from './services/agent-registry.js';
import { ArchitectureDesigner } from './agents/architecture-designer.js';
import { RoadmapPlanner } from './agents/roadmap-planner.js';
import { CodeGenerator } from './agents/code-generator.js';
import { ValidationEnforcer } from './agents/validation-enforcer.js';
import { RepairOrchestrator } from './agents/repair-orchestrator.js';

const agentRegistry = new AgentRegistry();
agentRegistry.register('ArchitectureDesigner', new ArchitectureDesigner(llmClient));
agentRegistry.register('RoadmapPlanner', new RoadmapPlanner(llmClient));
agentRegistry.register('CodeGenerator', new CodeGenerator(llmClient));
agentRegistry.register('ValidationEnforcer', new ValidationEnforcer());
agentRegistry.register('RepairOrchestrator', new RepairOrchestrator(llmClient, agentRegistry));

// Pass to TaskExecutor
const taskExecutor = new TaskExecutor(
  llmClient,
  promptRegistry,
  errorHandler,
  outputParser,
  agentRegistry // ← NEW
);
```

---

## Expected Impact

| Metric | Before | After |
|--------|--------|-------|
| Tasks completed | 12 | 12 |
| Task output type | String (placeholder) | Object (real code) |
| Tokens consumed | ~100 per task (fake) | ~1000 per task (real) |
| Files generated | 0 | 12 |
| Application runs? | No | Yes |
| Cost per run | ~$0.01 (fake) | ~$0.10 (real) |

The jump in token cost is expected and **correct**. We're finally doing real work instead of simulating it.

---

## Next Steps After This Fix

1. Create the five agent implementations (ArchitectureDesigner, RoadmapPlanner, etc.)
2. Wire them into the agent registry
3. Run the minimal test case (Hello World API)
4. Validate that output/projects/{runId}/ contains real code
5. Implement repair loop logic in phase-executor.ts
6. Scale to multi-phase orchestration

See `AGENT_DEFINITIONS.md` for agent implementation specifications.
