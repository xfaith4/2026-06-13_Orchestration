# Platform Guidance: Orchestration Principles & Architecture

**Audience**: Developers and agents working on this platform.  
**Purpose**: Formal statement of orchestration approach, agent architecture, and engineering principles.  
**Source**: Distilled from bake-off analysis, session learnings (2026-06-28 to 2026-06-30), and self-examination.

---

## 1. Core Problem Statement

Orchestration runs failed not because of agent arrangement, but because:

1. **Execution was fake** — `task-executor.ts` returned stub outputs; no real agent dispatch
2. **No evidence** — tasks marked "completed" with no code artifacts produced
3. **No shared contracts** — each agent redefined types independently, causing interface drift
4. **No repair signal** — repair loops saw fake success, so they never triggered on real failures

Fix ordering: evidence spine → honest failure signals → shared contracts → repair loops that see reality.

---

## 2. The Meta-Orchestration Algorithm

The pattern used to diagnose and fix orchestration failures is itself the orchestration algorithm. Every run should apply it:

### Phase A — Parallel Investigation (Fan Out)
Identify independent questions. Spawn one focused agent per question. No dependencies between investigations. Collect structured evidence, not prose.

```typescript
const [architectureEvidence, designEvidence, validationEvidence] = await parallel([
  agent('Audit current architecture and identify gaps'),
  agent('Design the target component layout'),
  agent('Define testable success criteria'),
]);
```

**Principle**: Investigations are embarrassingly parallel. Serial investigation wastes wall-clock time with no benefit.

### Phase B — Synthesis (Consolidate Evidence)
Read all parallel results. Find patterns: what repeats, what's missing, what's surprising. Produce a single unified model. Synthesis happens once — not iteratively.

**Principle**: Synthesis is sequential by necessity, but should be a single pass, not a loop.

### Phase C — Design from the Future (Temporal Inversion)
Ask: "Two years from now, this platform works reliably. What had to exist for that to be true?" Work backward from future success to present requirements. Defines load-bearing components only.

**Principle**: Forward design produces local optima. Future-vision design produces necessary architecture.

### Phase D — Layered Implementation
Build in dependency order. Each layer is testable independently. Failures stop the layer — they don't cascade to the next.

```
Layer 1: Fix the leak (stub → real dispatch)
Layer 2: Define agents (contracts, not implementations)
Layer 3: Prove concept (minimal viable test case)
Layer 4: Scale (multi-phase, multi-agent)
```

### Phase E — Self-Examination (Close the Loop)
After each run: what did we learn? What failed? What surprised us? Persist lessons to `LessonsLearnedKnowledge/`. Feed back to agent prompts and MetaOrchestrator logic.

**Principle**: The orchestration is self-improving only if it examines its own process after each run.

---

## 3. Five-Agent Architecture (Target Model)

After bake-off analysis and session experience, these five agent types are load-bearing:

| Agent | Input | Output | Failure mode prevented |
|-------|-------|--------|------------------------|
| **ArchitectureDesigner** | Application spec | Component architecture (typed JSON) | Ambiguous or missing design |
| **RoadmapPlanner** | Architecture | Phase/task plan | Vague, untestable tasks |
| **CodeGenerator** | Task + shared contracts | File artifacts (`## File:` blocks) | Type drift, prose-only output |
| **ValidationEnforcer** | Output files | tsc + vitest results (structured) | Silent failures |
| **RepairOrchestrator** | Validation failures | Targeted repair tasks | Infinite repair loops |

Each agent:
- Has a narrow scope (one job)
- Is defined by contract (input/output schemas), not implementation
- Produces deterministic, structured evidence
- Escalates rather than silently retrying

### MetaOrchestrator Interface

```typescript
export interface MetaOrchestration {
  investigateParallel(questions: string[]): Promise<Evidence[]>;
  synthesize(evidence: Evidence[]): Promise<UnifiedModel>;
  designFromFuture(timeHorizon: string): Promise<Architecture>;
  implementLayered(architecture: Architecture): Promise<Artifact[]>;
  selfExamine(process: Process): Promise<ImprovementPlan>;
}
```

---

## 4. Engineering Principles

### Evidence at Every Step
Every task completion must be backed by deterministic backend evidence — real file artifacts, not prose. See `TaskAcceptanceService` (`backend/src/services/task-acceptance.ts`).

### Contracts Over Implementations
Define agent I/O schemas first. Implementations can vary; contracts are invariant. This allows agents to be swapped without breaking the pipeline. Contracts live in `contracts/`.

### Honest Failure Signals
Fake success is worse than honest failure. A task that produces prose when code was expected must fail, not succeed. Repair loops can only fix what they know is broken.

### Parallelization Where Possible
Independent investigations, independent code generation tasks, and independent validation checks should all run in parallel. Sequential execution wastes wall-clock time with no coordination benefit.

### Shared Type Definitions
All agents must consume from `shared/` types (`@unifiedaitoolbox/shared`). No agent may redefine a type that already exists in shared. Contract enforcement at dispatch time prevents this.

### Circuit Breakers on Repair
Repair loops have a maximum attempt count (3). On max attempts, escalate to human review rather than looping indefinitely. Each repair attempt is logged with structured evidence.

---

## 5. What the Target Run Looks Like

A successful run produces, in `output/projects/{runId}/`:
- All source files (`src/`, `tests/`, config)
- A README with build/run instructions
- Structured run evidence (`data/run-events/{runId}.jsonl`)
- A cost report

And ends with these all true:
- `npm install && npm run build` passes
- `npm test` passes
- `npm run dev` starts without crashing
- At least one integration test makes a real HTTP request and asserts the response

Until all four are true, the run is not "complete".

---

## 6. Roadmap (Priority Track — Phases 32–37)

The current priority track (Phases 32–37) directly implements this guidance:

- **32** Evidence spine + lifecycle invariants
- **33** Green baseline before repair
- **34** Shared-contract/traceability spine (anti-drift)
- **35** Wire vendored contracts (compiler + casting)
- **36** Signature-aware planner-first repair
- **37** Typed gates + sequencing + isolation

See `ROADMAP.md` for status of each phase.
