# Orchestrator Blueprint — UnifiedAIToolbox

> **Anti-hallucination guarantee:** Every claim in this document is backed by a source citation.
> Claims that cannot be proven are marked `INFERRED`, `PARTIALLY VERIFIED`, or `UNVERIFIED`.
> The section [Unverified or Inferred Areas](#unverified-or-inferred-areas) lists all gaps.

---

## 1. Executive Summary

UnifiedAIToolbox is a multi-phase, LLM-backed application factory. A user submits a plain-language application description through a React form; the system turns it into a structured `Application`, generates a `DesignPlan`, generates a `Roadmap`, compiles a governance `RunContract`, then drives a set of YAML-defined agents through sequenced execution phases — each phase generating code files, validating them with `tsc` + `vitest`, and running a signature-aware repair loop before moving on. Every event, artifact, cost, and validation result is persisted to disk.

**Current verified state (2026-06-30):** ~130 completed run JSON files exist in `data/runs/`. None of the bake-off arms produced a working application; the validator bug (`project-validator.ts` previously discarding `err.stdout`) was found and fixed. The repair loop, contract compilation, phase ordering, and traceability gate are implemented. The Commissioner, Supervisor, and Synthesizer agents are defined but not wired into the live execution path.

---

## 2. Source Map

| Symbol / File | Role |
|---|---|
| `frontend/src/components/ApplicationIntakeForm.tsx` | Intake UI |
| `frontend/src/pages/NewApplication.tsx` | Page hosting the intake form |
| `frontend/src/hooks/useApi.ts` | `usePost<T>` HTTP hook that POSTs the form |
| `backend/src/routes/applications.ts` | `POST /api/applications` — create + validate |
| `backend/src/routes/design-plans.ts` | Design-plan CRUD + approve/reject |
| `backend/src/routes/roadmaps.ts` | Roadmap CRUD + generate + approve |
| `backend/src/routes/runs.ts` | Full run lifecycle; hosts `executeRunAsync` |
| `backend/src/routes/execution.ts` | Dev-only direct task/phase execution routes |
| `backend/src/routes/governance-contracts.ts` | Serves + validates `contracts/*.json` schemas |
| `backend/src/services/design-plan-generator.ts` | LLM call → `DesignPlan` JSON |
| `backend/src/services/roadmap-generator.ts` | LLM call → `Roadmap` JSON |
| `backend/src/services/task-executor.ts` | Per-task LLM call; prompt assembly |
| `backend/src/services/phase-executor.ts` | Drives task loop; acceptance gate |
| `backend/src/services/task-acceptance.ts` | Post-task acceptance gate (artifact required?) |
| `backend/src/services/agent-selector.ts` | Scoring algorithm → best-fit agent |
| `backend/src/services/output-parser.ts` | Markdown `## File:` block extraction |
| `backend/src/services/project-writer.ts` | Writes files to `output/projects/{runId}/` |
| `backend/src/services/project-validator.ts` | Runs `tsc`, `vitest`, `eslint`, `npm install` |
| `backend/src/services/repair-task-builder.ts` | Builds targeted repair tasks from errors |
| `backend/src/services/repair-policy.ts` | Circuit-breaker + signature tracking |
| `backend/src/services/repair-strategist.ts` | Maps failure types to strategies (analysis UI only) |
| `backend/src/services/contract-compiler.ts` | Compiles `RunContract` from `job_types.json` |
| `backend/src/services/contract-spine.ts` | Drift detection; shared-contract injection |
| `backend/src/services/gate.ts` | DAG integrity check; producer-then-reviewer ordering |
| `backend/src/services/run-service.ts` | Pure state machine: create/start/pause/complete run |
| `backend/src/services/run-event-log.ts` | Append-only JSONL event log |
| `backend/src/services/run-completion.ts` | Final RunSummary + lessons generation |
| `backend/src/services/persistence.ts` | `data/{collection}/{id}.json` storage |
| `backend/src/services/prompt-registry.ts` | Loads prompts from `Prompts/` + `data/prompts/` |
| `backend/src/services/prompt-loader.ts` | Filesystem prompt file parsing |
| `backend/src/services/artifact-store.ts` | Internal artifact DB records |
| `backend/src/services/cost-meter.ts` | Per-run cost roll-up |
| `backend/src/services/cost-tracker.ts` | In-memory per-phase cost accumulation |
| `backend/src/services/baseline.ts` | Baseline capture before repair (transient detection) |
| `shared/src/index.ts` | All canonical TypeScript types |
| `agents/*.yaml`, `agents/*.json` | Agent definitions (27 total) |
| `contracts/*.json` | A2A governance schemas (6 files) |
| `job_types.json` | Job-type configuration: `build_new_app`, `maintain_existing_app` |
| `data/runs/*.json` | ~130 persisted run records |
| `data/run-events/*.jsonl` | Append-only event streams |
| `output/projects/{runId}/` | Generated application files |

---

## 3. System Blueprint (Mermaid)

```mermaid
flowchart TD
    subgraph UI["Frontend (React + Vite :5176)"]
        A[ApplicationIntakeForm.tsx\nfields: name/desc/goal/reqs/audience/constraints] -->|usePost POST /api/applications| B
    end

    subgraph IntakeAPI["Intake API"]
        B[POST /api/applications\nroutes/applications.ts\nValidationService schema check] -->|Application record| C[data/applications/{id}.json]
        C --> D[POST /api/design-plans/generate/{appId}\nDesignPlanGenerator → LLM → JSON]
        D -->|DesignPlan record| E[PATCH /approve → DesignPlan.status=approved]
        E --> F[POST /api/roadmaps/generate/{designPlanId}\nRoadmapGenerator → LLM → JSON]
        F -->|Roadmap record| G[PATCH /approve → Roadmap.status=approved]
        G --> H[POST /api/runs/from-roadmap/{roadmapId}\nRunService.createRunFromRoadmap]
    end

    subgraph RunStart["Run Initialization"]
        H -->|Run.status=draft| I[PATCH /api/runs/:id/start\nruns.ts:778]
        I --> I1{checkPlanIntegrity\ngate.ts}
        I1 -->|cycles / unknown deps| I1F[422 Abort]
        I1 -->|OK| I2[buildAndValidate\ncontract-compiler.ts\njob_types.json → RunContract]
        I2 -->|contract invalid| I2F[422 Abort]
        I2 -->|valid| I3[runService.startRun\nRun.status=running\nstartedAt set]
        I3 --> I4[persistence.update Run]
        I4 -->|HTTP 200| Client
        I4 -->|fire-and-forget| EXEC
    end

    subgraph EXEC["executeRunAsync  runs.ts:230"]
        EXEC --> EX1[AgentRegistry.initialize\nagents/*.yaml + *.json]
        EX1 --> EX2[PromptRegistry.initialize\nPrompts/*.json + data/prompts/]
        EX2 --> EX3[new ProjectWriter\noutput/projects/{runId}/]
        EX3 --> EX4[new RunEventLog\ndata/run-events/{runId}.jsonl]
        EX4 --> PHLOOP

        subgraph PHLOOP["Phase Loop  (sequential)"]
            PHLOOP --> PH1{phase.status\n== pending?}
            PH1 -->|no| NEXTPHASE[skip to next phase]
            PH1 -->|yes| PH2[buildAgentAssignments\nagent-selector.ts\nscoring: capability overlap\n+ domain heuristics]
            PH2 --> PH3[orderProducersFirst\ngate.ts\ncritic/reviewer tasks last]
            PH3 --> PH4[findContractModule\ncontract-spine.ts\nshared TS types module]
            PH4 --> PH5[PhaseExecutor.executePhase\nphase-executor.ts]

            subgraph TASKLOOP["Task Loop  (sequential)"]
                PH5 --> T1[TaskExecutor.executeTask\ntask-executor.ts]
                T1 --> T2[Resolve prompt:\npromptId → PromptRegistry\n|| agent.prompt\n|| FALLBACK_SYSTEM_PROMPT]
                T2 --> T3[substituteVariables\n{{ key }} → value]
                T3 --> T4[Build userMessage:\ncontractBlock + stackBlock\n+ TASK + description\n+ ## File: instruction]
                T4 --> T5{ANTHROPIC_API_KEY\npresent?}
                T5 -->|no| MOCK[runMock: simulated delay\n200-600ms]
                T5 -->|yes| LLM[LLMClient.call\nsystemPrompt + userMessage\nmaxTokens:4096]
                LLM --> T6[result.text]
                T6 --> T7[TaskAcceptanceService.accept\nrequires ## File: blocks\nif implementation task]
                T7 -->|rejected| TASKFAIL[task failed permanent]
                T7 -->|accepted| T8[OutputParser.parseTaskOutput\nextract ## File: blocks]
                T8 --> T9[ProjectWriter.write\noutput/projects/{runId}/{path}]
                T9 --> T10[emit artifact_created\nrun-event-log]
            end

            PH5 -->|phaseResult| VAL
        end

        subgraph VAL["Validate → Repair Loop  runs.ts:419"]
            VAL --> V1[ProjectValidator.validate\ntsc + vitest\nproject-validator.ts]
            V1 --> V2[captureBaseline\nbaseline.ts]
            V2 -->|transient IO failure| SKIP[validation = insufficient_evidence\nno repair attempt]
            V2 -->|code failure| REPAIR

            subgraph REPAIR["Repair Loop  (max 3 generations)"]
                REPAIR --> R1{report.passed?}
                R1 -->|yes| DRIFT
                R1 -->|no| R2[repairGate\nrepair-policy.ts\nmax 3 gens\nno same-sig repeat]
                R2 -->|gate open| R3[buildRepairTasks\nrepair-task-builder.ts\ngroup errors by file]
                R3 --> R4[selectAgentForTask\nagent-selector.ts]
                R4 --> R5[TaskExecutor.executeTask\nrepair prompt + error context]
                R5 --> R6[OutputParser + ProjectWriter\nwrite repaired files]
                R6 --> R7[ProjectValidator.validate again]
                R7 --> R8{new sig ==\nold sig?}
                R8 -->|no progress| ESC[escalateAfter=\nno_plan_delta_detected]
                R8 -->|changed| R1
                R2 -->|gate closed| ESC
                ESC --> ESCREC[persist repair-escalation\nemit agent_blocked warn]
            end

            subgraph DRIFT["Drift Repair  runs.ts:564"]
                DRIFT --> DR1{coherence\n== drift?}
                DR1 -->|coherent| NEXTPHASE2[continue to next phase]
                DR1 -->|drift| DR2[buildDriftRepairTask\ncontract-spine.ts]
                DR2 --> DR3[up to 2 generations\nrolls back if regresses build]
                DR3 --> NEXTPHASE2
            end
        end

        PHLOOP --> FINAL
        subgraph FINAL["Run Finalization  runs.ts:662"]
            FINAL --> F1[decideTerminalStatus\nmaterializedCount + lastValidation]
            F1 --> F2[ProjectWriter.writeManifest\n.run-manifest.json]
            F2 --> F3[checkCoherence final\npersist traceability-report]
            F3 --> F4[transitionRunStatus\nrun_completed or run_failed\nemit run_completed or run_failed]
            F4 --> F5[costMeter.report\nper-run cost breakdown]
            F5 --> F6[RunCompletion.generateSummary\nRunSummary + lessons]
            F6 --> F7[persist run-summaries]
        end
    end

    style UI fill:#e8f4f8,stroke:#2196F3
    style IntakeAPI fill:#f3e5f5,stroke:#9C27B0
    style RunStart fill:#fff3e0,stroke:#FF9800
    style EXEC fill:#f1f8e9,stroke:#4CAF50
    style PHLOOP fill:#e8f5e9,stroke:#388E3C
    style TASKLOOP fill:#e0f2f1,stroke:#00796B
    style VAL fill:#fff8e1,stroke:#FFC107
    style REPAIR fill:#fce4ec,stroke:#E91E63
    style DRIFT fill:#f3e5f5,stroke:#7B1FA2
    style FINAL fill:#e3f2fd,stroke:#1565C0
```

---

## 4. Intake Flow

### 4.1 Form Fields

**Source:** `frontend/src/components/ApplicationIntakeForm.tsx`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | YES | Application name |
| `description` | string | YES | What it does |
| `goal` | string | YES | Primary objective |
| `requirements` | textarea | YES | Newline-split into `string[]` at submit |
| `targetAudience` | string | NO | Optional |
| `constraints` | textarea | NO | Newline-split into `string[]` at submit |

Client-side: null/empty checks on `name`, `description`, `goal` before POST.

### 4.2 API Endpoint

```
POST /api/applications
```

**Source:** `backend/src/routes/applications.ts` lines 22–35

Server-side validation: `ValidationService.loadSchema('application')` → `validation.validate(req.body, schema)`. Returns `400` with error detail on failure.

### 4.3 Resulting Type

`Application` — `shared/src/index.ts` line 15:

```typescript
interface Application extends BaseEntity {
  name: string
  description: string
  goal: string
  requirements: string[]
  targetAudience?: string
  constraints?: string[]
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
}
```

Stored at: `data/applications/{uuid}.json`

---

## 5. Orchestration Initialization

### 5.1 Pre-Run Pipeline (user-driven, not automated)

The intake form submission is step 1 of a **5-step human-gated workflow** before execution begins:

```
POST /api/applications          → Application (draft)
POST /api/design-plans/generate/{appId}  → DesignPlan (via DesignPlanGenerator + LLM)
PATCH /api/design-plans/:id/approve      → DesignPlan.status = approved
POST /api/roadmaps/generate/{designId}   → Roadmap (via RoadmapGenerator + LLM)
PATCH /api/roadmaps/:id/approve          → Roadmap.status = approved
POST /api/runs/from-roadmap/{roadmapId}  → Run (draft)
PATCH /api/runs/:id/start                → EXECUTION
```

**Evidence:**

- `backend/src/routes/design-plans.ts` — generate + approve routes
- `backend/src/routes/roadmaps.ts` — generate + approve routes
- `backend/src/routes/runs.ts` lines 778+ — start route

### 5.2 Run Creation

**Source:** `backend/src/routes/runs.ts` — `POST /api/runs/from-roadmap/:roadmapId`

`RunService.createRunFromRoadmap()` (run-service.ts) builds an in-memory `Run` object with:

- `roadmapId`, `applicationId`, `title`, `description`
- `phases: ExecutionPhase[]` (copied from roadmap phases with task status reset to `'pending'`)
- `status: 'draft'`
- `stackConstraints?` (copied from roadmap)

`PersistenceService.create('runs', run)` assigns `id = uuid()`, `createdAt`, `updatedAt` and writes to `data/runs/{id}.json`.

### 5.3 Run Start (PATCH /api/runs/:id/start)

**Source:** `backend/src/routes/runs.ts` lines 778–832

**Sequence:**

1. **DAG integrity gate** — `checkPlanIntegrity(run.phases)` (`gate.ts`). Checks: duplicate task IDs, unknown dependency references, dependency cycles via DFS. Returns `422` on failure.

2. **Contract compilation** — `buildAndValidate(jobType, goal, runId, ...)` (`contract-compiler.ts`). Loads `job_types.json`, merges job-type defaults → `RunContract`. Validates against `contracts/build_app_contract.v1.json`. Returns `422` if invalid.

3. **Status transition** — `runService.startRun(run)` → `Run.status = 'running'`, `startedAt = now`.

4. **Persist** — `persistence.update<Run>('runs', id, updated)`.

5. **HTTP 200** returned to client.

6. **Fire-and-forget** — `executeRunAsync(id, persistence)` begins asynchronously.

### 5.4 IDs and Paths Generated

| Item | Value |
|---|---|
| Run ID | `uuid()` via `persistence.create()` |
| Run file | `data/runs/{runId}.json` |
| Event log | `data/run-events/{runId}.jsonl` |
| Contract | `runs[n].contract` field (embedded in run JSON) |
| Output directory | `output/projects/{runId}/` |
| Manifest | `output/projects/{runId}/.run-manifest.json` |

---

## 6. Agent Inventory

**Source:** `agents/` directory (27 files); `agents/AGENT_DEFINITIONS.md`

All YAML agents are loaded by `AgentRegistry.initialize()` from the `agents/` directory at run start. Each becomes an `AgentDefinition` record in the registry.

### 6.1 Core Orchestration Agents (VERIFIED — yaml files)

| Agent | ID | File | Role | Prompt Source | Used When |
|---|---|---|---|---|---|
| **Engineer** | ag_20251202_engineer | `agents/engineer.yaml` | Code generation, implementation | `agents/engineer.yaml` prompt field | Default for implementation tasks; wins broad-keyword scoring |
| **Researcher** | ag_20251109_researcher | `agents/researcher.yaml` | Facts, options, risks | `agents/researcher.yaml` prompt field | Keyword: research/analyse/investigate |
| **Critic** | ag_20251202_critic | `agents/critic.yaml` | Code review, defect finding | `agents/critic.yaml` prompt field | Keyword: review/audit/defect/quality check |
| **Synthesizer** | ag_20251202_synthesizer | `agents/synthesizer.yaml` | Merge + conflict resolution | `agents/synthesizer.yaml` prompt field | Keyword: synthesize/merge/integrate (INFERRED — no production use verified) |
| **Commissioner** | ag_20251202_commissioner | `agents/commissioner.yaml` | Go/no-go value assessment | `agents/commissioner.yaml` prompt field | UNVERIFIED — not invoked in live path |
| **Supervisor** | ag_20251202_supervisor | `agents/supervisor.yaml` | Quality scoring, memory | `agents/supervisor.yaml` prompt field | Escalation target in repair policy (`escalation_target: "Supervisor"`) but not invoked as LLM call |
| **Architect Agent** | ag_20260407_architect | `agents/architect_agent.yaml` | Architecture → interface contracts | `agents/architect_agent.yaml` prompt field | Keyword: architect/system design/high-level; also `ROLE_PROMPTS.architect` in bakeoff |
| **Test and Validation** | ag_20260407_test_validation | `agents/test_and_validation_agent.yaml` | Write vitest test files | `agents/test_and_validation_agent.yaml` prompt field | Keyword: describe/expect/test suite/assertions |
| **Feature Implementation** | (in file) | `agents/feature_implementation_agent.yaml` | Feature code implementation | YAML prompt field | Implementation tasks |
| **Release Hardening** | (in file) | `agents/release_hardening_agent.yaml` | Hardening, final quality | YAML prompt field | Release/hardening tasks |
| **Repo Analyst** | (in file) | `agents/repo_analyst_agent.yaml` | Repository analysis | YAML prompt field | Keyword: analysis |
| **Documentation** | (in file) | `agents/documentation_agent.yaml` | Write docs / README | YAML prompt field | Keyword: document/readme/jsdoc |
| **Security Analyst** | (in file) | `agents/security_analyst.yaml` | Security review | YAML prompt field | Keyword: security/cve/owasp/injection |
| **Performance Engineer** | (in file) | `agents/performance_engineer.yaml` | Latency/throughput optimization | YAML prompt field | Keyword: performance/latency/throughput |
| **UX Specialist** | (in file) | `agents/ux_specialist.yaml` | UX design | YAML prompt field | Keyword: ux/user experience/interaction |
| **Accessibility Advocate** | (in file) | `agents/accessibility_advocate.yaml` | Accessibility | YAML prompt field | Keyword: accessibility/a11y |
| **Product Designer** | (in file) | `agents/product_designer.yaml` | Product/feature requirements | YAML prompt field | Keyword: product/feature/requirement |
| **Repo Context Builder** | (in file) | `agents/repo_context_builder.agent.json` | Read existing repo context | JSON agent definition | `maintain_existing_app` job type |
| **Repo Provenance Reader** | (in file) | `agents/repo_provenance_reader.agent.json` | Read repo history/git | JSON agent definition | PARTIALLY VERIFIED |
| **Historian** | (in file) | `agents/historian.yaml` | Record/replay history | YAML prompt field | INFERRED |
| **Review Curator** | (in file) | `agents/review_curator.yaml` | Curate reviews | YAML prompt field | INFERRED |
| **Release Strategist** | (in file) | `agents/release_strategist.yaml` | Release planning | YAML prompt field | INFERRED |
| **Content Strategist** | (in file) | `agents/content_strategist.yaml` | Content planning | YAML prompt field | INFERRED |
| **Coding Mentor** | (in file) | `agents/coding_mentor.yaml` | Teaching/explanation | YAML prompt field | INFERRED |
| **Design Artist** | (in file) | `agents/design_artist.yaml` | Visual/UI design | YAML prompt field | INFERRED |
| **Life Coach** | (in file) | `agents/life_coach.yaml` | Guidance | YAML prompt field | INFERRED (off-topic) |
| **Resume Builder** | (in file) | `agents/resume_builder.yaml` | Resume writing | YAML prompt field | INFERRED (off-topic) |

### 6.2 Service-Level (Hardcoded) Prompts — VERIFIED

These exist in source code, not in agent YAML files:

| Prompt | Location | Used For |
|---|---|---|
| `SYSTEM_PROMPT` | `backend/src/services/design-plan-generator.ts:4` | DesignPlan generation LLM call |
| `SYSTEM_PROMPT` | `backend/src/services/roadmap-generator.ts:11` | Roadmap generation LLM call |
| `FALLBACK_SYSTEM_PROMPT` | `backend/src/services/task-executor.ts:48` | Task execution when agent has no prompt |
| `ROLE_PROMPTS.{architect,engineer,test,critic}` | `backend/bakeoff-roadmap.ts:58` | Bakeoff arms only (not production path) |
| `PLANNER_PROMPT` | `backend/bakeoff-roadmap.ts:72` | Bakeoff planner only |

---

## 7. Agent Selection Logic

**Source:** `backend/src/services/agent-selector.ts`

### 7.1 Scoring Algorithm

`scoreAgent(agent, taskText)` computes a numeric score:

**Signal 1 — Capability keyword overlap (+2 per match):**
Each word in `agent.capabilities[]` longer than 3 chars that appears anywhere in the task text scores +2. Case-insensitive.

**Signal 2 — Domain heuristic bonuses:**

| Domain trigger in task text | Target agent | Score bonus |
|---|---|---|
| `describe`, `expect`, `test suite`, `test case`, `write test`, `unit test`, `assertion` | test/validation agent | +8 |
| `documentation`, `readme`, `jsdoc` | documentation agent | +6 |
| `security`, `CVE`, `OWASP`, `injection`, `exploit` | security agent | +6 to +8 |
| `accessibility`, `a11y`, `aria`, `wcag` | accessibility agent | +6 |
| `architect`, `system design`, `high-level design` | architect agent | +6 |
| `review`, `audit`, `defect`, `quality check` | critic agent | +6 |
| `research`, `analys`, `investigate`, `benchmark` | researcher agent | +6 |
| `ux`, `user experience`, `interaction design` | ux agent | +6 |
| `performance`, `latency`, `throughput`, `optimize` | performance agent | +5 |
| `release`, `deploy`, `publish`, `bundle` | release agent | +5 |
| `product`, `feature requirement`, `user story` | product agent | +4 |

**Signal 3 — Engineer broad implementation bonus (+4/+6/+7 capped):**
Only applies to the `engineer` agent. 27 implementation keywords (`implement`, `create`, `build`, `write`, `code`, `function`, `class`, `module`, `npm`, `package.json`, etc.). Score: 1 match=+4, 2 matches=+6, 3+ matches=+7.

### 7.2 Fallback

`selectAgentForTask()` (`agent-selector.ts` line 160): if all agents score 0 or only one agent exists, returns `agents[0]`. Never returns null.

`buildAgentAssignments(phase, agents)` (`agent-selector.ts` line 183) calls `selectAgentForTask` for every task in the phase, building a `{ taskId: agentId }` map.

### 7.3 Fragility Assessment

- **No model-selection:** agent `routing_hints.preferred_models` fields list GPT-5.x models (which do not exist as of this writing). The `LLMClient` always uses the Anthropic API with a single model determined by environment variables. Model routing is `UNVERIFIED`.
- **No capability gaps detected:** if the task has unusual keywords matching no agent, the fallback is always the first agent in the array — typically arbitrary.
- **Agents not in the live path:** Commissioner, Supervisor, Synthesizer, Historian, Life Coach, Resume Builder are loaded into the registry and scorable but will only be selected if task text strongly matches their keywords.

---

## 8. Phase and Task Execution Flow

### 8.1 `executeRunAsync` Phase Loop

**Source:** `backend/src/routes/runs.ts` lines 230–700+

```
for each phase in run.phases (sequential):
  1. Re-read run from disk  →  abort if status ≠ 'running'
  2. Skip if phase.status ≠ 'pending'
  3. Mark phase in-progress  →  persist
  4. buildAgentAssignments(phase, allAgents)   [agent-selector.ts]
  5. orderProducersFirst(phase.tasks, roleOf)  [gate.ts]
  6. findContractModule(priorProjectFiles)     [contract-spine.ts]
  7. phaseExecutor.executePhase(...)           [phase-executor.ts]
     └── for each task (sequential):
           a. get agentId from assignments
           b. emit agent_started
           c. taskExecutor.executeTask(...)   [task-executor.ts]
              ├── resolve prompt
              ├── build user message (contract + stack + task description)
              ├── LLMClient.call(systemPrompt, userMessage)
              └── return { output: text, tokens, model }
           d. TaskAcceptanceService.accept(task, output)
              └── if implementation task with no ## File: blocks → reject (permanent)
           e. emit agent_completed
           f. OutputParser.parseTaskOutput(output)  [output-parser.ts]
           g. ProjectWriter.write(artifacts)         [project-writer.ts]
           h. emit artifact_created per file
  8. On permanent task failure → fail phase → transitionRunStatus('failed') → return
  9. emit validation_started
 10. ProjectValidator.validate(['tsc','vitest'])  [project-validator.ts]
     ├── npm install (120s)
     ├── tsc --noEmit (30s)
     └── vitest run (60s)
 11. captureBaseline(report)  [baseline.ts]
     └── if transient → lastValidation = insufficient_evidence → skip repair → continue
 12. Repair Loop (while !report.passed):
     a. repairGate(attempt, signatures, policy)  [repair-policy.ts]
        ├── attempt >= 3 → escalate planner_repair_limit_reached
        └── same sig × 2 → escalate same_signature_repeated
     b. buildRepairTasks(report.results, root)   [repair-task-builder.ts]
        └── one RepairTask per failing file (groups all errors for that file)
     c. for each RepairTask:
           selectAgentForTask(repairTask, agents)
           taskExecutor.executeTask(repair prompt + raw error context)
           outputParser + projectWriter → write fixes
     d. ProjectValidator.validate (again)
     e. if newSig == oldSig → escalate no_plan_delta_detected → break
 13. On escalation → persist repair-escalation → emit agent_blocked
 14. Drift repair (if build green, up to 2 gens, rollback on regression)
 15. emit validation_completed
 16. persist to validation-reports collection
 17. update phase status → persist run

after all phases:
  18. decideTerminalStatus(materializedCount, lastValidation)
  19. writeManifest (output/projects/{runId}/.run-manifest.json)
  20. checkCoherence → persist traceability-report
  21. transitionRunStatus → emit run_completed or run_failed
  22. costMeter.report → persist cost records
  23. RunCompletion.generateSummary → persist run-summaries
```

### 8.2 Task Acceptance Gate

**Source:** `backend/src/services/task-acceptance.ts`

After each task, `TaskAcceptanceService.accept(task, output)` is called. If the task description contains implementation keywords (`implement`, `create`, `build`, `write`, `repair`, `fix`, `code`, `test`, `interface`, `class`, etc.) **and** the output contains zero `## File:` blocks, the task is rejected with `AcceptanceStatus = 'rejected_no_artifacts'` and marked as a permanent failure. This ensures the repair loop fires rather than silently accepting prose responses.

### 8.3 Gate: DAG Integrity

**Source:** `backend/src/services/gate.ts`

`checkPlanIntegrity(phases)` runs before execution starts. It:

- Finds duplicate task IDs → error
- Finds `task.dependencies` referencing IDs not in the plan → error
- Performs a DFS cycle check (three-color: WHITE/GRAY/BLACK) → error on back-edge

Returns `{ ok: boolean, errors: string[] }`.

### 8.4 Gate: Producer-then-Reviewer Ordering

**Source:** `backend/src/services/gate.ts:26`

`orderProducersFirst(tasks, roleOf)` moves tasks whose assigned agent has role `'critic'`, `'reviewer'`, `'validator'`, or `'qa'` to the end. Stable sort — non-reviewer order preserved.

---

## 9. A2A / Contract Flow

### 9.1 Governance Contract Compilation

**Source:** `backend/src/services/contract-compiler.ts`, `job_types.json`, `contracts/*.json`

At run start, `buildAndValidate(jobType, goal, runId)`:

1. Loads `job_types.json` → picks config for `'build_new_app'` or `'maintain_existing_app'`.
2. Calls `compileContract(req, job)` → produces `RunContract`:

```typescript
{
  schema_version: '1.0',
  job_type: 'build_new_app',
  contract_universe: 'app_factory',
  contract_version: '1.0',
  pipeline_id: `pipeline-${runId}`,
  run_id: runId,
  goal: goal,
  agent_roster: job.default_agents,  // e.g. ['Researcher','Engineer','Critic','Synthesizer','Commissioner','Supervisor']
  budget: { max_time_minutes: 30 },
  logging: { level: 'info' },
  artifact_policy: { mode: 'required', required: ['generated_app'] },
  gate_policy: { mode: 'advisory' },
  stages: ['plan','generate','validate','repair','review']
}
```

1. Validates against JSON schema from `contracts/build_app_contract.v1.json`. Contract is embedded in `run.contract` on the persisted run JSON.

**Key gap:** The `agent_roster` in the contract lists 6 agent names but **the live execution engine ignores this list**. `executeRunAsync` loads all agents from the `agents/` directory and uses score-based selection. The contract's `agent_roster` is advisory metadata only. `PARTIALLY VERIFIED`.

### 9.2 Shared Contract Injection (Anti-Drift)

**Source:** `backend/src/services/contract-spine.ts`, `backend/src/routes/runs.ts` lines 305–312

Before each phase executes, `findContractModule(priorProjectFiles)` scans the growing `output/projects/{runId}/` directory for the canonical shared-types module (preferring files named `contracts.ts`, `types.ts`, `schema.ts` etc., ranked by interface/type declaration count).

If found, the full content (up to 8000 chars) is passed as `sharedContract` into `TaskExecutor`. The task's user message begins with:

```
SHARED CONTRACT — import all shared types from the contracts module;
DO NOT redefine any type below:
```typescript
[contents of contracts.ts]
```

```

This is the anti-drift mechanism for Phase 34.

### 9.3 Agent Response Format (Required)

The task user message always ends with:

```

For each output file:

## File: path/to/file.ext

```lang
content
```

```

Agents are expected to produce one or more `## File:` blocks. The `OutputParser` regex is:

```

/^##\s+[Ff]ile:\s*[\S+]( \t)*\n```(\w+)?[ \t]*\n([\s\S]*?)^```/gm

```

**Evidence:** `backend/src/services/output-parser.ts` line 148

If an agent produces prose without `## File:` blocks, the `TaskAcceptanceService` rejects the output as a permanent failure (for implementation tasks).

### 9.4 Known A2A Failure Modes

1. **Prose instead of files:** Agent responds with explanatory text, no `## File:` blocks → rejected → repair triggered.
2. **Partial file blocks:** Agent writes a file block that doesn't close the triple-backtick → regex fails silently → zero artifacts extracted.
3. **Type redefinition drift:** Agent redefines a type already in `contracts.ts` → compiles but drift detector flags it.
4. **Contract roster ignored:** The `agent_roster` field in the compiled `RunContract` is not enforced during execution.

---

## 10. File and Deliverable Flow

```

LLM Response (raw text)
       │
       ▼
OutputParser.parseTaskOutput()          [output-parser.ts]
   ├── Path 1: if JSON structured output
   │     └── look for code_artifacts[] / deliverables{} keys
   └── Path 2: extract ## File: blocks via regex
         ├── group by path (dedup: longer content wins)
         └── normalizeFilePath()
               ├── strip leading ./
               ├── reject absolute paths or .. traversal
               └── heuristic placement for bare filenames
                   (e.g. FooController.ts → src/controllers/)
       │
       ▼
FileArtifact[] = [{ filePath, language, content }]
       │
       ├──→ ArtifactStore.saveArtifact()    [artifact-store.ts]
       │      data/artifacts/{uuid}.json     (internal record)
       │
       └──→ ProjectWriter.write(artifacts)  [project-writer.ts]
              ├── path escape guard (rejects outside project root)
              ├── fs.mkdir(parentDir, { recursive: true })
              └── fs.writeFile(absPath, content, 'utf-8')   [ALWAYS OVERWRITES]
                     output/projects/{runId}/{filePath}
       │
       ▼
EventLog.emit('artifact_created', { path, agent })    [run-event-log.ts]
       │
       ▼
ProjectValidator.validate(['tsc','vitest'])            [project-validator.ts]
   ├── npm install (reads package.json)
   ├── tsc --noEmit --pretty false
   └── vitest run --reporter=verbose
       │
       ▼
ProjectWriter.writeManifest(allArtifacts, runId)
   output/projects/{runId}/.run-manifest.json
   { runId, generatedAt, files: [{path, language}] }
       │
       ▼
collectProducedFiles(outputDir)   [project-writer.ts]
   walks output dir, skips node_modules/.git/dist, capped at 300 files
   → final file listing for run report card

```

**Evidence:** `backend/src/services/output-parser.ts`, `backend/src/services/project-writer.ts`, `backend/src/routes/runs.ts` lines 354–372

---

## 11. Validation and Repair Flow

### 11.1 Validation Tools

**Source:** `backend/src/services/project-validator.ts`

| Tool | Command | Timeout | Error Format |
|---|---|---|---|
| `npm-install` | `npm install 2>&1` | 120s | Exit code non-zero |
| `tsc` | `npx tsc --noEmit --pretty false` | 30s | `file(line,col): error TSxxxx: msg` |
| `vitest` | `npx vitest run --reporter=verbose 2>&1` | 60s | `× testName` lines |
| `eslint` | `npx eslint . --ext .ts,.tsx,.js,.jsx --format compact 2>&1` | 30s | ESLint compact format |

The fixed `execErrorOutput()` helper (post-validator-bug-fix) now captures **both** `err.stdout` and `err.stderr`, so the repair loop sees real compiler output.

### 11.2 Baseline Classification

**Source:** `backend/src/services/baseline.ts`

`captureBaseline(runId, phaseId, report)` detects **transient** failures (IO errors, npm EPERM, file locks, network errors) by pattern matching on error messages. If transient:
- `validation = 'insufficient_evidence'`
- Repair loop is **not triggered**
- Run continues to next phase

### 11.3 Repair Policy

**Source:** `backend/src/services/repair-policy.ts`

`DEFAULT_REPAIR_POLICY`:
```typescript
{
  maxRepairGenerations: 3,
  maxSameFailureSignature: 2,
  escalationTarget: 'Supervisor'
}
```

`repairGate({ attempt, currentSignature, signatureCounts, policy })`:

- Returns `proceed: false, escalateAfter: 'planner_repair_limit_reached'` if `attempt >= 3`
- Returns `proceed: false, escalateAfter: 'same_signature_repeated'` if same signature seen >= 2 times

`failureSignature(report)` computes a deterministic string from the set of error codes present — if two rounds produce the same signature, the loop stops.

### 11.4 Repair Task Building

**Source:** `backend/src/services/repair-task-builder.ts`

`buildRepairTasks(results, projectRoot)`:

- Groups tsc errors by file → one `RepairTask` per file, all errors for that file included
- Reads the file content so the agent has full context (`targetFileContent` field)
- For vitest: one `RepairTask` per failing test
- For eslint: one `RepairTask` per file with warnings
- For npm-install: one `RepairTask` for package.json issues

Each `RepairTask` has: `id`, `category`, `name`, `description` (includes raw error lines), `targetFile`, `targetFileContent`, `errors[]`.

### 11.5 Escalation

On `escalateAfter != null`:

1. Persist to `data/repair-escalations/{uuid}.json`
2. Emit `agent_blocked` event with `severity: 'soft_blocker'`, `needed_from: 'Supervisor'`
3. **The run continues to the next phase** — escalation is logged but not blocking.

**Evidence:** `backend/src/routes/runs.ts` lines 517–543

---

## 12. Runtime State and Traceability

### 12.1 Persisted State Files

| Path | Written by | Contains |
|---|---|---|
| `data/runs/{runId}.json` | persistence.update after every state change | Full Run object: phases, tasks, status, costs, validation, contract |
| `data/run-events/{runId}.jsonl` | run-event-log after every event | Line-delimited JSON events |
| `data/applications/{id}.json` | persistence.create on intake | Application record |
| `data/design-plans/{id}.json` | persistence.create/update | DesignPlan record |
| `data/roadmaps/{id}.json` | persistence.create/update | Roadmap record |
| `data/artifacts/{uuid}.json` | artifact-store.saveArtifact | FileArtifact record |
| `data/validation-reports/{uuid}.json` | executeRunAsync line 650 | ProjectValidationReport per phase |
| `data/validation-baselines/{uuid}.json` | executeRunAsync line 445 | Baseline classification per phase |
| `data/repair-escalations/{uuid}.json` | executeRunAsync line 520 | Escalation records |
| `data/traceability-reports/{uuid}.json` | executeRunAsync line 678 | Final drift analysis |
| `data/run-summaries/{uuid}.json` | RunCompletion.generateSummary | RunSummary with lessons |
| `data/error-logs/{uuid}.json` | error-logger.logError | Error records with context |
| `output/projects/{runId}/` | project-writer.write | Generated application files |
| `output/projects/{runId}/.run-manifest.json` | project-writer.writeManifest | File listing |

### 12.2 Event Log Format

**Source:** `backend/src/services/run-event-log.ts`; `shared/src/index.ts` lines 292–315

```typescript
{
  ts: string,          // ISO 8601
  level: 'debug'|'info'|'warn'|'error',
  runId: string,
  type: OrchestrationEventType,  // one of 14 event types
  msg?: string,
  agent?: string,
  stage?: string,      // phase name
  step?: string,       // task id
  attemptId?: string,
  data?: Record<string, unknown>
}
```

Event types: `run_created`, `run_queued`, `run_started`, `agent_started`, `agent_progress`, `agent_blocked`, `agent_completed`, `artifact_created`, `validation_started`, `validation_completed`, `cost_report`, `run_completed`, `run_failed`, `run_recovered`

### 12.3 How to Audit a Run

1. **Read `data/runs/{runId}.json`** — full run record including final status, all phases/tasks, cost, validation outcome, contract.
2. **Read `data/run-events/{runId}.jsonl`** — complete chronological event stream. Parse with `run-event-log.ts:read()`.
3. **Check `output/projects/{runId}/`** — all generated files, manifest.
4. **Read `data/validation-reports/`** — filter by `phaseId` to see per-phase tsc/vitest results.
5. **Read `data/repair-escalations/`** — filter by `runId` to see if escalation occurred.
6. **Read `data/traceability-reports/`** — filter by `runId` to see drift findings.
7. **Read `data/run-summaries/`** — filter by `runId` for the final summary with lessons.

The `GET /api/runs/:id/events` route returns the full event log for a run. `GET /api/runs/:id/costs` returns cost breakdown.

---

## 13. Expected Outcomes

### 13.1 Success State

`Run.status = 'completed'`

Triggered by `decideTerminalStatus()` when:

- `materializedCount > 0` (at least one file was extracted)
- `lastValidation.status === 'passed'` (tsc + vitest all green)

Final artifacts: `output/projects/{runId}/` contains a buildable TypeScript/Node.js application with `package.json`, source files, test files, and `.run-manifest.json`.

### 13.2 Warning / Partial State

`Run.status = 'completed'` but validation outcome may be `'insufficient_evidence'` or escalation records exist.

Drift findings in `data/traceability-reports/` do not block completion.

### 13.3 Failure State

`Run.status = 'failed'`

Causes:

- Phase failed during task execution (permanent agent failure)
- All repair generations exhausted AND validation still failing
- No agents available (`agents.length === 0`)
- Run was paused/cancelled externally

### 13.4 What "Done" Means in Code

**Source:** `backend/src/routes/runs.ts` lines 662–690 (`decideTerminalStatus`)

The function takes `{ materializedCount, validation }`:

- If `materializedCount === 0` → `'failed'` ("no files produced")
- If `validation.status === 'failed'` → `'failed'`
- If `validation.status === 'insufficient_evidence'` → `'completed'` (benefit of doubt)
- If `validation.status === 'passed'` → `'completed'`

This is a lenient terminal policy: **a run with zero files produced fails; a run that produced files but could not validate is marked completed.**

---

## 14. Known Gaps and Unverified Areas

### VERIFIED (directly proven)

- Intake form fields, POST endpoint, server validation
- 5-step pre-run pipeline (Application → DesignPlan → Roadmap → Run → Start)
- `executeRunAsync` full phase/task loop
- Agent scoring algorithm (3 signals)
- `## File:` block extraction regex
- ProjectWriter path escape guard + overwrite behavior
- Validator tools: tsc, vitest, npm-install, eslint
- Repair loop: max 3 generations, signature-based stopping
- Event log format and 14 event types
- Contract compilation from `job_types.json`
- ~130 run records exist in `data/runs/`
- `decideTerminalStatus` logic

### PARTIALLY VERIFIED (supported but incomplete)

- Agent `routing_hints.preferred_models` — fields exist in YAML but `LLMClient` uses Anthropic API only; GPT-5.x model names listed do not exist
- `agent_roster` in RunContract — compiled and stored but not enforced during execution
- Drift repair (up to 2 gens, rollback logic exists in code at runs.ts:564)
- `RepairStrategist` — exists in `repair-strategist.ts` and is called from `/failure-analysis` endpoint but not wired into the live repair loop

### INFERRED (reasonable but not explicit)

- Agent `checksum` field (SHA256 in YAML) is computed but its verification behavior is not observed
- `preferred_models` in agent YAML files may be stale from an earlier GPT-based design
- The 5-step human-gated workflow is manual — there is no auto-advancement trigger

### UNVERIFIED (not proven by source)

- Commissioner agent ever invoked during a real run
- Supervisor agent performing LLM quality scoring during a run (the `escalationTarget: 'Supervisor'` emits an event but does not trigger an LLM call)
- `GateVerdict` / `GateResult` types defined in `gate.ts` — appear to be placeholders; no code found using them in the current run path
- `RecoveryService.executeWithCircuitBreaker` inner behavior — referenced in `task-executor.ts:197` but the implementation was not read
- `maintain_existing_app` job type — defined in `job_types.json` but no UI route for creating this job type was found

---

## 15. Risk Areas

### R1 — CRITICAL: Agent Roster in Contract Not Enforced

The `RunContract.agent_roster` lists specific agents but execution uses score-based selection from all 27 available agents. Any agent in the registry can be selected for any task regardless of the contract.

**Source:** `backend/src/routes/runs.ts` lines 263–297 (no roster filtering before `buildAgentAssignments`)

### R2 — HIGH: TaskAcceptanceService Only Guards Implementation Tasks

Non-implementation tasks (documentation, analysis, planning) do not require `## File:` blocks. An agent that responds with prose for a documentation task is accepted even if no artifact was produced.

**Source:** `backend/src/services/task-acceptance.ts` line 59 (`artifactExemptKinds`)

### R3 — HIGH: Repair Loop Does Not Re-Plan

Repair agents receive raw error context and attempt file-level fixes. There is no RoadmapPlanner/ArchitectureDesigner involved in repair. A task with a wrong architectural decision is repaired at the code level (which may not fix the underlying issue).

**Source:** `backend/src/routes/runs.ts` lines 474–499 (repair loop calls `taskExecutor.executeTask` with repair description, not a planner invocation)

### R4 — MEDIUM: Run Continues After Escalation

When repair escalates (`escalateAfter != null`), the run logs a `agent_blocked` event and continues to the next phase. A run can "complete" with persistent tsc/vitest failures from escalated phases.

**Source:** `backend/src/routes/runs.ts` lines 543–548

### R5 — MEDIUM: Overwrite Without Merge

`ProjectWriter.write()` always overwrites files with `fs.writeFile`. A repair agent that returns only the changed function will overwrite the entire file with just that function if its output only contains that fragment.

**Source:** `backend/src/services/project-writer.ts` line 30

### R6 — MEDIUM: Non-Deterministic Agent Selection

The scoring algorithm produces a total score but agents with equal scores have undefined relative ordering. YAML agent load order from `fs.readdir` (filesystem order) determines the tiebreak.

### R7 — LOW: Event Log Is Crash-Tolerant but Lossy

`run-event-log.ts` swallows all `fs.appendFile` errors. If the disk is full or the event JSONL file is locked, events are silently lost.

**Source:** `backend/src/services/run-event-log.ts` line 69

### R8 — LOW: 300-File Cap on collectProducedFiles

`project-writer.ts:collectProducedFiles` is capped at 300 files. A generated application with more than 300 files will have truncated manifest and missing artifacts in the run summary.

---

## 16. Recommended Next Hardening Steps

1. **Wire `agent_roster` enforcement** (Phase 35+): Filter `buildAgentAssignments` to only select from agents listed in `RunContract.agent_roster`. This makes the contract actually authoritative.

2. **Supervisor LLM call** (Phase 40): After each phase completes, invoke the Supervisor agent as an LLM call to score quality and detect failures the `tsc`/`vitest` tools miss (logic errors, spec violations, missing features).

3. **Planner-first repair** (Phase 36 intent): When `escalateAfter = 'no_plan_delta_detected'`, re-invoke `RoadmapPlanner` to produce a revised task plan rather than repeating file-level repair.

4. **File-merge repair**: Instead of full overwrite, diff-and-merge repair agent output against existing file content when only specific lines/functions need to change.

5. **Model routing**: Connect `agent.routing_hints.preferred_models` to actual Anthropic model IDs (Sonnet/Opus/Haiku), replacing the non-functional GPT-5.x references.

6. **Contract roster enforcement test**: Add a test verifying that `buildAgentAssignments` only selects agents in `RunContract.agent_roster`.

7. **Escalation should halt the run** (or create an approval gate): Currently escalation is advisory. A phase with 50 tsc errors that exhausts repair generations leaves a broken project while the run "completes."
