# Build Specification: Web-Based Multi-Agent Orchestration Platform

**Date:** June 14, 2026  
**Status:** Ready for implementation  
**Target:** Comprehensive web-based UI for designing, managing, and executing multi-agent software development workflows

---

## Phase 1: Repository and Directory Assessment

### 1.1 Repository Purpose

This directory (`2026-06-13_Orchestration`) is a **multi-agent orchestration framework and asset library** for complex software development workflows. It contains:

- **25+ agent definitions** (YAML + JSON) representing specialized roles in software development
- **Contract definitions** (JSON schemas) for agent-to-agent communication, build processes, and failure handling
- **Node.js/JavaScript runtime libraries** for run tracking, cost calculation, and REST API
- **Lessons learned knowledge base** capturing insights from past orchestration runs
- **Past execution artifacts** from 40+ attempted orchestration runs
- **Gap analysis document** identifying missing orchestration contracts and patterns
- **Senior prompt engineer skill** with references on agent design and LLM evaluation

**Current State:** This is a **prototype orchestration runtime and asset library**, not yet a cohesive web application. The components exist but lack a unified UI, state management layer, and complete orchestration workflows.

**Use Case:** Teams building complex software applications using multi-agent AI systems where:
- Different specialized agents handle different phases (architecture, implementation, testing, review)
- Work must be trackable, auditable, and reversible
- Costs and token usage must be visible
- Approval gates control progression to expensive/destructive operations
- Generated roadmaps must be reviewable before execution

### 1.2 Existing Orchestration Assets

#### Agent Definitions (25+ roles)
Located in `agents/`:
- **Commissioner** - Evaluates business value and cost-benefit, gate keeper for approval
- **Engineer** - Produces code, tests, and configurations
- **Architect** - Designs technical solutions with multiple options and trade-offs
- **Researcher** - Investigates requirements, constraints, and patterns
- **Synthesizer** - Aggregates inputs and produces comprehensive summaries
- **Critic** - Reviews outputs for quality, correctness, and alignment
- **Supervisor** - Coordinates overall execution and handles failures
- **Test & Validation Agent** - Executes tests and validates acceptance criteria
- **Security Analyst** - Reviews for security vulnerabilities
- **Documentation Agent** - Produces runbooks and technical documentation
- **Feature Implementation Agent** - Executes specific feature development
- **Release Hardening Agent** - Prepares releases with robustness and testing
- Plus 13 additional specialized agents (Performance, UX/Design, Accessibility, etc.)

Each agent definition includes:
- **Unique ID** (`ag_20251202_commissioner`)
- **Purpose and mission** statement
- **Input/output schemas** with full JSON schema definitions
- **Tools and capabilities** list
- **Playbook** (step-by-step execution instructions)
- **Constraints** (latency, token budget, output requirements)
- **Style guidance** (pragmatic, detailed, creative, etc.)
- **Routing hints** (preferred models, max tokens)

#### Contracts (A2A Communication Schemas)
Located in `contracts/`:
- **build_app_contract.v1.json** - Complete build execution contract with job type, pipeline, agent roster, gates, artifact policy
- **build_app_request.v1.json** - Request schema for initiating builds
- **maintenance_contract.v1.json** - Contract for maintenance operations with stricter change controls
- **maintenance_request.v1.json** - Request schema for maintenance ops
- **failure_treatment_policy.v1.json** - Policy for handling failures (retry, escalate, repair)
- **repo_context_schema.v1.json** - Schema for repository context passed to agents

These contracts define:
- Required and optional fields
- Data types and validation rules
- Nested object structures
- Policy constraints

#### Library Files
Located in `lib/`:
- **api-server.js** - Express.js server providing REST endpoints for run CRUD and cost queries
- **run-tracker.js** - Run persistence, cost calculations, human-equivalent comparisons
- **config-loader.js** - Configuration file loading
- **example-orchestration.js** - Example workflow demonstrating run tracking

The library provides:
- ISO timestamp utilities
- UUID generation (with fallback to Node's crypto.randomUUID)
- File-based JSON persistence under `runs/` directory
- Cost calculation (API, compute, storage)
- Environmental impact metrics (energy in kWh, water in liters)
- Human-equivalent time/cost comparisons

#### Gap Analysis Document
`multi-agent-contract-gap-analysis.md` identifies **7 critical missing contracts**:

1. **Canonical agent message envelope** - Universal wrapper identifying provenance, handoff metadata
2. **Explicit handoff contract** - Typed payload schema, preconditions, state patches, retry/failure routes
3. **Typed shared run state** - A unified state model with merge rules for concurrent workers
4. **Tool and capability contract per agent** - Executable permissions, read/write scope, command policy
5. **Software task ownership contract** - Task ID, owner, goal, conflict groups, dependencies, rollback
6. **Handoff and workflow trace spans** - Agent, handoff, tool, gate, repair, merge event spans
7. **Failure taxonomy and recovery protocol** - Shared language for failure types, recovery routes

The document also lists priorities: define envelopes and handoffs first, then add validators, normalize tasks, add trace spans, make permissions executable, build eval suite, package skills.

#### Lessons Learned
`LessonsLearnedKnowledge/knowledge_base.json` captures:
- 40+ past orchestration runs with goals, outcomes, and tokens
- Patterns from successful and failed runs
- Context-specific decisions (e.g., member portal architecture)

### 1.3 Important Files and Preservation Strategy

| File/Directory | Purpose | Preserve | Refactor | Deprecate |
|---|---|---|---|---|
| `agents/*.yaml`, `agents/*.json` | Agent definitions | ✅ Yes | Update to unified schema | Remove inactive agent files |
| `contracts/*.json` | A2A communication schemas | ✅ Yes | Extend with missing contracts | Keep existing but add v2 |
| `lib/api-server.js` | REST API runtime | ✅ Yes | Add auth, versioning, expanded endpoints | None |
| `lib/run-tracker.js` | Persistence and cost | ✅ Yes | Add database backend option | None |
| `lib/config-loader.js` | Config management | ✅ Yes | Add env var overrides, secret management | None |
| `lib/example-orchestration.js` | Workflow example | ✅ Yes | Keep as test/reference | Deprecate in favor of real UI |
| `multi-agent-contract-gap-analysis.md` | Gap analysis | ✅ Yes | Use as requirements for missing contracts | None |
| `LessonsLearnedKnowledge/` | Past run insights | ✅ Yes | Migrate to UI-accessible format | None |
| `PastAttemptedRuns/` | Historical run artifacts | Reference | Archive or summarize | Clean up after summarization |

### 1.4 Current Architecture

```
User Input (Intent/Goal)
        ↓
 [API Server]
        ↓
 [Run Tracker] → Persistence (runs/*.json)
        ↓
 [Agent Roster Selection] → Choose agents from agent-library
        ↓
 [Pipeline Execution] → Sequential or parallel agent calls
        ↓
 [Cost Calculation] → Track tokens, compute, energy
        ↓
 [Run Summary] → Save run record, show results
```

**Current Limitations:**
- No web UI (all code-based)
- No intermediate approval gates before expensive operations
- No prompt refinement tooling
- No design plan generation/approval
- No roadmap generation/approval
- No explicit handoff contracts
- No shared state management
- No test failure analysis
- No repair loop tracking
- No GitHub integration
- No cost/token tracking per agent

### 1.5 Gaps and Missing Capabilities

| Gap | Impact | Priority |
|---|---|---|
| **Web Interface** | Cannot be used without code; no non-technical access | Critical |
| **Application Intake Form** | No structured way to collect project requirements | Critical |
| **Design Plan Generation** | No intermediate approval step before roadmap | Critical |
| **Design Plan Approval** | Can execute bad designs; wastes tokens | Critical |
| **Roadmap Generation** | No phased breakdown before execution | Critical |
| **Roadmap Approval** | Can execute incomplete/bad roadmaps | Critical |
| **Agent Message Envelope** | No canonical way to identify handoff points | High |
| **Explicit Handoff Contracts** | Implicit handoffs are fragile | High |
| **Shared Run State** | Hard to coordinate concurrent agents | High |
| **Test Result Inspection** | Cannot see why tests failed | High |
| **Repair Loop Tracking** | Cannot trace repair attempts and outcomes | High |
| **GitHub Integration** | Cannot drive PR/branch/commit operations | High |
| **Cost Tracking per Agent** | Cannot see which agent consumed resources | Medium |
| **Prompt Refinement UI** | Cannot edit/test prompts without code | Medium |
| **Agent Definition Manager** | Cannot add/remove agents without code | Medium |
| **Contract Manager UI** | Cannot create/edit contracts without code | Medium |
| **Run History** | Cannot easily find/compare past runs | Medium |
| **Audit Trail** | Cannot see who approved what and when | Low |
| **Token Limit Enforcement** | No hard stops on token usage | Medium |

### 1.6 Recommended Reusable Skills from Existing Assets

The `skills/senior-prompt-engineer/` directory contains references on:
- Agentic system design patterns
- LLM evaluation frameworks
- Prompt engineering patterns

These should be available to the app's agents:
- For refining prompts during development
- For evaluating agent outputs against acceptance criteria
- For optimizing prompts based on trajectory data

---

## Phase 2: Product Definition

### 2.1 Product Goal

Build a **professional web-based UI for designing, approving, and executing multi-agent software development workflows**. The platform should enable teams to:

1. **Describe an application idea** in plain English
2. **Generate a design plan** with architecture, data model, and component structure
3. **Review and approve the design** before committing resources
4. **Generate an implementation roadmap** with phases, tasks, dependencies, and acceptance criteria
5. **Review and approve the roadmap** before execution
6. **Execute the roadmap** using a choreographed multi-agent team
7. **Monitor and repair** failures in real-time
8. **Track costs, tokens, and time** across the entire workflow
9. **Capture lessons learned** for future runs

### 2.2 Target Users

- **Product Managers** - Intake application ideas, review design plans, approve roadmaps
- **Technical Leads** - Review architectures, approve designs, oversee execution
- **Engineers** - View roadmaps, understand tasks, inspect failures
- **Platform Engineers** - Configure agents, define prompts, manage contracts
- **Non-technical Stakeholders** - Submit ideas, see progress, understand costs

### 2.3 Key Principles

- **Auditability** - Every decision is logged with timestamp and owner
- **Reversibility** - Approval gates prevent accidental execution of bad plans
- **Transparency** - All costs, token usage, and decisions are visible
- **Extensibility** - New agents and contracts can be added without code changes
- **Contract-Driven** - All handoffs are validated against contracts
- **Test-First** - Generated code must pass acceptance criteria before merge

---

## Phase 3: Target Architecture

### 3.1 Frontend Architecture

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui

**Key Features:**
- Server-side routing with React Router v6
- Global state management (Zustand or Redux Toolkit)
- API client layer with error handling and retry logic
- Real-time run monitoring with WebSocket or polling
- Rich text editors for prompt/plan editing
- Mermaid diagrams for architecture visualization
- Monaco editor for code preview
- Terminal-style output log viewer

**Performance:**
- Code splitting per major feature area
- Lazy loading of large artifact displays
- Optimized re-renders with React.memo and useMemo
- Virtualized lists for long run history

### 3.2 Backend Architecture

**Stack:** Node.js + Express + TypeScript

**Components:**
- REST API layer (existing `api-server.js` extended)
- Business logic services:
  - ApplicationIntakeService
  - DesignPlanGenerationService
  - RoadmapGenerationService
  - ExecutionOrchestrationService
  - ApprovalGateService
  - RunTrackerService
- Persistence layer:
  - File-based JSON (current `run-tracker.js`)
  - Optional database adapter (PostgreSQL/MongoDB for production)
- Agent execution layer:
  - Agent roster management
  - Contract validation
  - Handoff coordination
  - Error recovery

**API Endpoints:**
```
POST   /api/applications              - Create application intake
GET    /api/applications/:id          - Get application details
GET    /api/applications              - List applications

POST   /api/design-plans              - Generate design plan
GET    /api/design-plans/:id          - Get design plan
PUT    /api/design-plans/:id          - Update design plan
POST   /api/design-plans/:id/approve  - Approve design plan

POST   /api/roadmaps                  - Generate roadmap
GET    /api/roadmaps/:id              - Get roadmap
PUT    /api/roadmaps/:id              - Update roadmap
POST   /api/roadmaps/:id/approve      - Approve roadmap

POST   /api/runs                      - Create/execute run
GET    /api/runs/:id                  - Get run details
GET    /api/runs                      - List runs
GET    /api/runs/:id/log              - Get run log
GET    /api/runs/:id/artifacts        - List artifacts
GET    /api/runs/:id/cost             - Get cost breakdown

POST   /api/agents                    - Create agent definition
GET    /api/agents/:id                - Get agent definition
PUT    /api/agents/:id                - Update agent definition
GET    /api/agents                    - List agents

POST   /api/prompts                   - Create/save prompt
GET    /api/prompts/:id               - Get prompt
PUT    /api/prompts/:id               - Update prompt
GET    /api/prompts                   - List prompts
POST   /api/prompts/:id/test          - Test prompt

POST   /api/contracts                 - Create contract
GET    /api/contracts/:id             - Get contract
PUT    /api/contracts/:id             - Update contract
GET    /api/contracts                 - List contracts

GET    /api/config/costs              - Get cost configuration
GET    /api/config/agents             - Get available agents
GET    /api/health                    - Health check
```

### 3.3 Data Persistence

**Primary Storage:**
- **File-based JSON** (for MVP using existing `run-tracker.js`)
- Location: `runs/`, `design-plans/`, `roadmaps/`, `applications/`, `artifacts/`
- Index files for fast lookup

**Optional Production Storage:**
- PostgreSQL or MongoDB for:
  - Applications
  - Design plans
  - Roadmaps
  - Runs
  - Approval records
  - Agent definitions
  - Prompts
  - Contracts
- Full-text search on documents
- Query history and analytics

**Caching Strategy:**
- In-memory cache for agent definitions and contracts
- Redis for session state and run cache (optional)

### 3.4 Agent Orchestration Layer

**Execution Model:**
```
1. Receive approved roadmap
2. For each phase in roadmap:
   a. Validate phase preconditions (all dependencies complete)
   b. Select appropriate agent(s)
   c. Prepare context and inputs
   d. Validate inputs against contracts
   e. Execute agent with timeout
   f. Validate outputs against contracts
   g. Handle failures (retry, repair, escalate)
   h. Persist outputs and cost data
   i. Check gate policy (approve or reject)
   j. Store decision and rationale
   k. Move to next phase
3. Generate final summary and cost report
```

**Concurrency:**
- Phases with no dependencies can execute in parallel
- Explicit conflict groups prevent concurrent modifications to same files
- Work isolation using worktrees (if file-based) or transaction scopes

**Error Handling:**
- **Transient Failures** (timeout, rate limit) → retry with exponential backoff
- **Contract Violations** (invalid output schema) → repair agent attempts fix
- **Tool Failures** (command execution fails) → escalate to human + log evidence
- **Gate Failures** (critic rejects output) → allow refinement or escalate

### 3.5 Prompt and Agent Management

**Prompt Storage:**
- Version all prompts with timestamps
- Store in JSON with:
  - Prompt ID and name
  - Agent role it's for
  - Template text (with placeholders)
  - Variables and their types
  - Associated contracts
  - Test cases
  - Performance metrics
  - Creation/update history
- Enable A/B testing of prompts

**Agent Registry:**
- Load agent definitions from `agents/` YAML/JSON
- UI allows:
  - Creating new agents
  - Editing existing agent definitions
  - Disabling/enabling agents
  - Viewing agent history
  - Testing agents against sample inputs
- Validation of agent schema before save

### 3.6 GitHub Integration

**Capabilities:**
- Create repository
- Create feature branch from roadmap phase
- Commit generated code with clear messages
- Open pull request with design/roadmap link
- Run CI checks and report results
- Merge after approval
- Tag releases
- Create issues from tasks

**Implementation:**
- GitHub App for OAuth + permissions
- Octokit SDK for API calls
- Signed commits when available
- Webhook listeners for CI status

---

## Phase 4: Data Models

### 4.1 Application

```typescript
interface Application {
  id: string;                          // UUID
  name: string;
  description: string;
  createdAt: ISO8601;
  createdBy: string;                   // User ID or email
  status: 'intake' | 'design-pending' | 'design-approved' | 'roadmap-pending' | 'roadmap-approved' | 'executing' | 'complete' | 'failed';
  
  intake: {
    targetUsers: string;
    primaryUseCases: string[];
    platformTargets: ('web' | 'mobile' | 'desktop' | 'cli' | 'api' | 'library')[];
    preferredTechStack: string;
    authenticationNeeds: string;
    dataPersistenceNeeds: string;
    externalIntegrations: string[];
    deploymentTarget: string;
    testingExpectations: string;
    securityRequirements: string;
    accessibilityRequirements: string;
    performanceRequirements: string;
    constraints: string;
    niceToHaves: string;
    nonGoals: string;
  };
  
  designPlanId?: string;               // Link to approved design plan
  roadmapId?: string;                  // Link to approved roadmap
  
  metadata: Record<string, any>;
  tags: string[];
}
```

### 4.2 Design Plan

```typescript
interface DesignPlan {
  id: string;
  applicationId: string;
  generatedAt: ISO8601;
  generatedBy: string;                 // Agent ID or 'system'
  
  status: 'draft' | 'approved' | 'rejected';
  approvedAt?: ISO8601;
  approvedBy?: string;
  
  content: {
    summary: string;
    userPersonas: {
      name: string;
      description: string;
      goals: string[];
      painPoints: string[];
    }[];
    coreWorkflows: {
      name: string;
      steps: string[];
      actors: string[];
    }[];
    featureList: {
      name: string;
      description: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      estimatedComplexity: 'simple' | 'moderate' | 'complex';
    }[];
    nonGoals: string[];
    architectureProposal: string;
    techStackRecommendation: {
      frontend?: string;
      backend?: string;
      database?: string;
      deployment?: string;
      ci?: string;
    };
    dataModel: string;                 // Markdown or mermaid diagram
    apiDesign: string;                 // OpenAPI snippet or description
    uiStructure: string;               // Component hierarchy
    componentMap: Record<string, string>; // Component name -> description
    securityConsiderations: string[];
    testingStrategy: string;
    deploymentStrategy: string;
    risks: {
      title: string;
      impact: 'high' | 'medium' | 'low';
      mitigation: string;
    }[];
    assumptions: string[];
    openDecisions: {
      decision: string;
      options: string[];
      recommendation: string;
    }[];
    acceptanceCriteria: string[];
  };
  
  version: number;
  revisions: {
    timestamp: ISO8601;
    author: string;
    change: string;
  }[];
}
```

### 4.3 Roadmap

```typescript
interface Roadmap {
  id: string;
  applicationId: string;
  designPlanId: string;
  generatedAt: ISO8601;
  generatedBy: string;
  
  status: 'draft' | 'approved' | 'rejected';
  approvedAt?: ISO8601;
  approvedBy?: string;
  
  phases: Phase[];
  
  version: number;
  revisions: {
    timestamp: ISO8601;
    author: string;
    change: string;
  }[];
}

interface Phase {
  id: string;
  name: string;
  description: string;
  order: number;
  
  tasks: Task[];
  
  dependencies: string[];            // Phase IDs
  estimatedTokens: number;
  estimatedTime: string;
  
  successCriteria: string[];
  risks: string[];
  
  assignedAgents: string[];          // Agent IDs
  expectedArtifacts: string[];
  
  validationGates: {
    type: 'test' | 'review' | 'approval' | 'contract';
    description: string;
    required: boolean;
  }[];
}

interface Task {
  id: string;
  phaseId: string;
  name: string;
  description: string;
  order: number;
  
  goal: string;
  targetFiles: string[];
  readContextFiles: string[];
  writeScope: string;                // File path pattern
  conflictGroup: string;             // For exclusivity with other tasks
  
  dependencies: string[];            // Task IDs
  expectedExports: Record<string, string>; // Field name -> description
  
  acceptanceCriteria: string[];
  validationCommands: string[];
  mergeStrategy: 'auto' | 'manual' | 'squash';
  rollbackStrategy: string;
  
  riskLevel: 'low' | 'medium' | 'high';
  reviewRequired: boolean;
  
  ownerAgent?: string;              // Preferred agent
  
  prompts?: {
    agentId: string;
    promptId: string;
  }[];
  
  contracts?: {
    inputSchema?: string;           // Contract ID
    outputSchema?: string;          // Contract ID
  };
}
```

### 4.4 Orchestration Run

```typescript
interface OrchestrationRun {
  id: string;
  name: string;
  roadmapId: string;
  applicationId: string;
  
  startTime: ISO8601;
  endTime?: ISO8601;
  status: 'queued' | 'executing' | 'paused' | 'complete' | 'failed';
  
  currentPhase?: string;             // Phase ID
  currentTask?: string;              // Task ID
  
  phases: PhaseRun[];
  
  resources: {
    tokens_in: number;
    tokens_out: number;
    api_calls: number;
    compute_seconds: number;
    duration_ms: number;
  };
  
  costs: {
    api_cost_usd: number;
    compute_cost_usd: number;
    storage_cost_usd: number;
    total_usd: number;
    energy_kwh: number;
    water_liters: number;
  };
  
  summary: {
    success: boolean;
    outcome: string;
    errors: string[];
  };
  
  artifacts: {
    name: string;
    path: string;
    type: string;
    size: number;
    checksum: string;
  }[];
  
  approvals: {
    phaseName: string;
    approved: boolean;
    approvedBy: string;
    approvedAt: ISO8601;
    notes: string;
  }[];
}

interface PhaseRun {
  phaseId: string;
  phaseName: string;
  startTime: ISO8601;
  endTime?: ISO8601;
  status: 'pending' | 'executing' | 'paused' | 'complete' | 'failed';
  
  tasks: TaskRun[];
  
  resources: {
    tokens_in: number;
    tokens_out: number;
  };
}

interface TaskRun {
  taskId: string;
  taskName: string;
  assignedAgent: string;
  
  startTime: ISO8601;
  endTime?: ISO8601;
  duration_ms: number;
  status: 'pending' | 'executing' | 'complete' | 'failed';
  
  input: Record<string, any>;
  output: Record<string, any>;
  
  resources: {
    tokens_in: number;
    tokens_out: number;
    calls: number;
  };
  
  validationResults: {
    passed: boolean;
    errors: string[];
    warnings: string[];
  };
  
  artifacts: string[];              // Paths
  
  repairAttempts: {
    attemptNumber: number;
    reason: string;
    startTime: ISO8601;
    result: 'success' | 'failed';
  }[];
}
```

### 4.5 Agent Definition

```typescript
interface AgentDefinition {
  id: string;
  name: string;
  purpose: string;
  mission: string;
  
  role: string;
  capabilities: string[];
  style: string;
  
  inputs?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  
  outputs?: {
    name: string;
    type: string;
    description: string;
  }[];
  
  ioContract?: {
    inputSchema: JSONSchema;
    outputSchema: JSONSchema;
  };
  
  tools: string[];
  constraints: string[];
  
  playbook: string[];
  
  prompt: string;                    // System prompt template
  
  promptReferences?: {
    promptId: string;
    usage: string;
  }[];
  
  routingHints?: {
    preferredModels: string[];
    maxTokens: number;
    temperature?: number;
  };
  
  status: 'draft' | 'ready' | 'deprecated';
  createdAt: ISO8601;
  updatedAt: ISO8601;
  
  versions: {
    version: number;
    timestamp: ISO8601;
    changes: string;
  }[];
}
```

### 4.6 Prompt Definition

```typescript
interface PromptDefinition {
  id: string;
  name: string;
  agentId: string;
  
  category: 'system' | 'role' | 'task' | 'review' | 'repair' | 'roadmap' | 'github';
  
  template: string;                  // With {placeholder} syntax
  variables: {
    name: string;
    type: string;
    description: string;
    required: boolean;
  }[];
  
  metadata: {
    tokens_avg: number;
    tokens_max: number;
    latency_avg_ms: number;
    success_rate: number;           // From test runs
  };
  
  testCases: {
    name: string;
    inputs: Record<string, any>;
    expectedOutput: any;
    notes: string;
  }[];
  
  status: 'draft' | 'approved' | 'deprecated';
  
  createdAt: ISO8601;
  updatedAt: ISO8601;
  
  versions: {
    version: number;
    timestamp: ISO8601;
    changes: string;
  }[];
}
```

### 4.7 Contract Definition

```typescript
interface ContractDefinition {
  id: string;
  name: string;
  type: 'input' | 'output' | 'handoff' | 'state' | 'task' | 'error';
  
  version: string;                   // e.g., "v1", "v2"
  
  schema: JSONSchema;
  
  examples: {
    name: string;
    payload: any;
  }[];
  
  validation: {
    required: string[];
    constraints: string[];
  };
  
  fromAgent?: string;
  toAgent?: string;
  
  description: string;
  createdAt: ISO8601;
  updatedAt: ISO8601;
  
  compliance: {
    lastCheckedAt: ISO8601;
    violatingRuns: string[];        // Run IDs
  };
}
```

---

## Phase 5: UI Pages and Workflows

### 5.1 Major Pages

#### Dashboard
- List of recent applications and runs
- Key metrics (success rate, avg tokens, cost trend)
- Quick-start buttons for common flows
- System health status

#### Applications
- **List View:** All applications with status, created by, last updated
- **Create/Edit:** Form to capture application intake
- **Details:** View intake details, linked design plan and roadmap

#### Design Plans
- **List View:** All design plans filtered by application
- **Create:** Generate design plan from application (triggers Design Plan Generation Agent)
- **Details:** Full design plan with version history
- **Review:** Side-by-side editor for approving/editing before lock
- **Approval:** Gate showing who approved, when, any notes

#### Roadmaps
- **List View:** All roadmaps filtered by application/design plan
- **Create:** Generate roadmap from approved design plan
- **Details:** Gantt-style phase view, expandable tasks
- **Edit:** Drag-to-reorder phases, add/remove tasks
- **Approval:** Gate and approval record

#### Runs / Execution
- **List View:** All runs with status, start time, duration, cost
- **Create:** Select roadmap, review preconditions, confirm execution
- **Details/Monitor:** Real-time progress of phases and tasks
  - Current phase highlighted
  - Task log with timestamps and resource usage
  - Live cost tracking
  - Artifact preview links
- **Repair:** If a task fails, offer repair options (retry, escalate, use alt agent)
- **Summary:** Final report with costs, artifacts, lessons learned

#### Agents
- **List View:** All available agents with status
- **Details:** Agent definition, capabilities, recent runs
- **Create/Edit:** Form to create or update agent definition
- **Test:** Input sample data, execute agent, see output

#### Prompts
- **List View:** All prompts filtered by agent
- **Create/Edit:** Template editor with variable insertion
- **Test:** Test prompt with sample variables, see output
- **Versions:** View and compare prompt versions

#### Contracts
- **List View:** All contracts by type
- **Details:** Schema view with examples
- **Compliance:** Which runs violated this contract

#### Approval Workflows
- **Pending Approvals:** Design plans and roadmaps awaiting approval
- **Approval Detail:** Full content, approval notes, approve/reject buttons
- **Approval History:** Audit trail of all approvals

### 5.2 Key Workflows

#### Workflow 1: Application to Execution (Happy Path)

```
1. User clicks "New Application"
2. Application Intake Form
   - Name, description, users, use cases, tech stack, etc.
   - Submit → saves Application in 'intake' status
   
3. System generates Design Plan
   - Product Manager Agent analyzes intake
   - Architect Agent designs solution
   - Returns design document (approval pending)
   
4. User reviews Design Plan
   - Read design document
   - Can edit sections or request refinements
   - Click "Approve Design Plan"
   - Status → 'design-approved'
   
5. System generates Roadmap
   - Architect Agent breaks design into phases
   - Engineer Agent estimates time/complexity
   - Returns roadmap with tasks (approval pending)
   
6. User reviews Roadmap
   - Read phases and tasks
   - Can reorder, add/remove tasks
   - Can adjust phase assignments
   - Click "Approve Roadmap"
   - Status → 'roadmap-approved'
   
7. User starts Execution
   - Confirm cost estimate and token budget
   - Choose to execute immediately or schedule
   - Status → 'executing'
   
8. System executes phases sequentially
   - For each phase:
     - Select appropriate agents
     - Execute tasks in order (or parallel if no conflicts)
     - Validate outputs against contracts
     - If pass: move to next
     - If fail: offer repair
   
9. User monitors Execution
   - Watch progress in real-time
   - See costs accumulating
   - See artifacts being generated
   
10. Execution Complete
    - Final summary with costs, artifacts, lessons
    - Save run record
    - Option to push code to GitHub or export
```

#### Workflow 2: Design Plan Refinement

```
1. User views Design Plan in review
2. User identifies a section to improve
3. User selects "Request Refinement"
4. System prompts for feedback
5. Designer Agent receives feedback + current design
6. Returns refined section (keeps other sections)
7. User can accept or iterate again
8. Once satisfied, "Approve"
```

#### Workflow 3: Execution Repair

```
1. During execution, a task fails (e.g., test fails)
2. Repair Agent reads the failure evidence
3. Repair Agent offers: retry, alt approach, escalate to human
4. User selects repair option
5. Repair Agent executes fix
6. Validation runs again
7. If pass: continue execution
   If still fail: escalate to human, pause execution
```

#### Workflow 4: Prompt Tuning

```
1. Platform Engineer views Prompts list
2. Selects a prompt used by Architect Agent
3. Views template + recent test results
4. Identifies low success rate
5. Edits prompt template
6. Tests against test cases
7. Reviews token usage
8. If satisfied: approve new version (marks old as deprecated)
9. New version used in next roadmap generation
```

---

## Phase 6: Agent Workflow and Handoff Protocol

### 6.1 Multi-Agent Execution Sequence

```
User submits application intake
    ↓
[Intake Validation] - Verify all required fields
    ↓
[Design Plan Generation Phase]
    ├─ Researcher Agent
    │  ├─ Input: Application description, constraints
    │  └─ Output: Requirements summary, risk list, architectural options
    │
    ├─ Architect Agent
    │  ├─ Input: Researcher output + design decisions
    │  └─ Output: Technical design, component map, data model
    │
    ├─ Designer Agent (optional)
    │  ├─ Input: Architect design, UI requirements
    │  └─ Output: UI/UX recommendations, wireframes
    │
    ├─ Security Analyst Agent
    │  ├─ Input: Design, data flows, integrations
    │  └─ Output: Security risks, mitigations
    │
    └─ Synthesizer Agent
       ├─ Input: All above outputs
       └─ Output: Unified Design Plan document
    ↓
[Approval Gate 1] - Product Manager reviews design plan
    ↓
[Roadmap Generation Phase]
    ├─ Architect Agent
    │  ├─ Input: Approved design plan
    │  └─ Output: Phase breakdown with dependencies
    │
    ├─ Engineer Agent
    │  ├─ Input: Architecture, phases
    │  └─ Output: Task breakdown, complexity estimates, time estimates
    │
    ├─ Test Agent
    │  ├─ Input: Design, components
    │  └─ Output: Test strategy, test cases, validation criteria
    │
    └─ Synthesizer Agent
       ├─ Input: All above
       └─ Output: Unified Roadmap document
    ↓
[Approval Gate 2] - Technical Lead reviews roadmap
    ↓
[Execution Phase]
For each phase:
    ├─ [Validate Preconditions]
    │  └─ Check all dependency phases are complete
    │
    ├─ For each task in phase:
    │  ├─ [Select Agent] - Use task.assignedAgent or select from eligible
    │  │
    │  ├─ [Prepare Context]
    │  │  ├─ Gather inputs from previous tasks
    │  │  ├─ Load relevant documentation
    │  │  └─ Validate against inputSchema contract
    │  │
    │  ├─ [Execute Agent]
    │  │  ├─ Invoke with timeout
    │  │  └─ Stream logs and progress
    │  │
    │  ├─ [Validate Output]
    │  │  ├─ Check against outputSchema contract
    │  │  ├─ Run validationCommands if present
    │  │  └─ If invalid: attempt repair
    │  │
    │  └─ [Persist Output]
    │     ├─ Save artifacts
    │     ├─ Log cost data
    │     └─ Advance to next task
    │
    ├─ [Execute Gate Policy]
    │  ├─ If gate == 'test': run tests, report results
    │  ├─ If gate == 'review': route to Critic Agent
    │  ├─ If gate == 'approval': wait for human approval
    │  └─ If gate == 'contract': validate handoff contracts
    │
    └─ [Move to next phase]
    ↓
[Completion Phase]
    ├─ Generate summary
    ├─ Calculate total costs
    ├─ Capture lessons learned
    ├─ Save run record
    └─ Offer export/push to GitHub
```

### 6.2 Handoff Contracts

Every agent-to-agent handoff is validated using a **Handoff Contract** before work begins.

**Contract Validation:**
```
From Agent Output
    ↓
[Validate Output Schema]
    → Against outputSchema in agent definition
    → Must pass JSON schema validation
    → If fail: Repair Agent attempts fix
    ↓
[Validate Handoff Contract]
    → Check presence of required artifacts
    → Check output contains expected fields
    → Verify confidence scores if present
    ↓
[Match to Next Agent Input Schema]
    → Verify output fields match next agent's inputSchema
    → Ensure required fields are present
    → Check type compatibility
    ↓
[Check Gate Policy]
    → Does next agent need manual review?
    → Does next agent need approval?
    → Is there a test gate?
    ↓
[Execute Handoff]
    → Pass validated output to next agent
    → Log handoff metadata (from, to, timestamp, tokens)
    → Store in run artifact
```

### 6.3 Repair Loop Protocol

If an agent's output fails validation:

```
Agent Output Fails Validation
    ↓
[Analyze Failure]
    ├─ Schema violation: field missing or wrong type
    ├─ Value violation: value outside acceptable range
    ├─ Contract violation: missing required context
    ├─ Tool failure: command execution failed
    └─ Quality issue: test failed or confidence too low
    ↓
[Determine Repair Strategy]
    ├─ If schema violation:
    │  └─ Repair Agent receives output + error, attempts fix
    │
    ├─ If tool failure:
    │  └─ Check environment, permissions, dependencies, retry
    │
    ├─ If quality issue:
    │  ├─ Critic Agent reviews and provides feedback
    │  └─ Original agent receives feedback + output, refines
    │
    └─ If human review needed:
       └─ Pause execution, notify user, wait for manual fix
    ↓
[Re-validate]
    └─ If pass: continue
       If fail (2nd attempt): escalate to human
```

---

## Phase 7: Contract Validation and A2A Handoff

### 7.1 Contract Enforcement Strategy

**Before Execution:**
1. At roadmap creation time, validate that all task pairs have compatible contracts
2. At phase start time, validate that all artifacts from previous phase exist
3. At task assignment time, validate inputs against agent's inputSchema

**During Execution:**
1. After agent completes, validate output against outputSchema
2. Before next agent starts, validate that all required inputs are present
3. Log all validation passes and failures

**Contract Types:**

| Contract | Purpose | Enforced When |
|---|---|---|
| Agent Input Schema | Validates task inputs to agent | Before agent execution |
| Agent Output Schema | Validates agent output structure | After agent completes |
| Handoff Contract | Validates transition from one agent to next | Before next agent starts |
| State Patch Schema | Validates mutations to shared state | When agent writes to state |
| Tool Capability Contract | Restricts tools agent can use | Before tool execution |
| Task Ownership Contract | Defines task boundary and conflicts | At task assignment |

### 7.2 Failure Taxonomy

Every failure is categorized for better repair routing:

```
SCHEMA_INVALID
  ├─ Required field missing
  ├─ Field type mismatch
  └─ Nested object validation failed

TOOL_DENIED
  ├─ Command not in allowlist
  ├─ Path not in write scope
  └─ Network access denied

COMMAND_FAILED
  ├─ Non-zero exit code
  ├─ Timeout
  └─ Resource exhausted

CONTRACT_VIOLATION
  ├─ Handoff precondition not met
  ├─ Artifact reference missing
  └─ State patch invalid

QUALITY_FAILURE
  ├─ Test failed
  ├─ Confidence too low
  └─ Critic review rejected

APPROVAL_REQUIRED
  ├─ Human must approve before proceeding
  └─ Gate blocking continuation
```

---

## Phase 8: Testing Strategy

### 8.1 Unit Tests

Test individual agent definitions, prompt templates, and contract schemas.

```typescript
describe('Agent: Architect', () => {
  it('produces valid output matching schema', async () => {
    const input = { specification: '...' };
    const output = await architectAgent.execute(input);
    expect(validateSchema(output, architectOutputSchema)).toBe(true);
  });
  
  it('respects token budget constraints', async () => {
    const tokens = await estimateTokens(output);
    expect(tokens).toBeLessThan(4000); // from constraints
  });
});
```

### 8.2 Contract Tests

Verify that agent handoffs are compatible.

```typescript
describe('Handoff: Researcher -> Architect', () => {
  it('researcher output satisfies architect input', () => {
    const researcherOutput = { ... };
    const errors = validateSchema(
      researcherOutput, 
      architectInputSchema
    );
    expect(errors).toEqual([]);
  });
});
```

### 8.3 Integration Tests

Test complete workflows end-to-end with real agents (or mocked LLM).

```typescript
describe('Workflow: Design Plan Generation', () => {
  it('produces roadmap from application intake', async () => {
    const application = { name: '...' };
    const designPlan = await generateDesignPlan(application);
    
    expect(designPlan.status).toBe('draft');
    expect(designPlan.content.featureList).toBeDefined();
    expect(designPlan.content.acceptanceCriteria.length).toBeGreaterThan(0);
  });
});
```

### 8.4 UI Tests

Test React components with Vitest/RTL.

```typescript
describe('DesignPlanReview component', () => {
  it('renders design plan content', () => {
    const { getByText } = render(
      <DesignPlanReview plan={mockPlan} />
    );
    expect(getByText('User Personas')).toBeInTheDocument();
  });
  
  it('shows approval button when not approved', () => {
    const { getByRole } = render(
      <DesignPlanReview plan={{ ...mockPlan, status: 'draft' }} />
    );
    expect(getByRole('button', { name: /approve/i })).toBeInTheDocument();
  });
});
```

### 8.5 E2E Tests

Test full user journeys with Playwright/Cypress.

```typescript
test('user can submit application and approve design', async ({ page }) => {
  await page.goto('/applications/new');
  await page.fill('[name="name"]', 'Test App');
  await page.fill('[name="description"]', 'A test application');
  
  // ... fill other fields ...
  
  await page.click('text=Submit');
  
  // Wait for design plan to generate
  await page.waitForNavigation();
  
  // Approve design plan
  await page.click('text=Approve Design');
  await page.fill('[name="approvalNotes"]', 'Looks good');
  await page.click('text=Confirm Approval');
  
  expect(page.url()).toContain('/applications/');
});
```

---

## Phase 9: Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Set up project structure, integrate existing assets, basic UI scaffold

- [ ] Create Vite + React + TypeScript project
- [ ] Set up Express backend with TypeScript
- [ ] Migrate existing `lib/` files to backend
- [ ] Create data directory structure for persistence
- [ ] Implement basic authentication/user context
- [ ] Create React Router structure
- [ ] Set up shadcn/ui component library
- [ ] Create common UI components (buttons, forms, modals)

**Artifacts:**
- Working dev server (npm run dev starts frontend + backend)
- Initial page skeleton (Dashboard, Applications, Runs)

### Phase 2: Core Data Models & API (Week 3-4)

**Goal:** Implement all data models and core API endpoints

- [ ] Implement Application model and CRUD API
- [ ] Implement DesignPlan model and CRUD API
- [ ] Implement Roadmap model and CRUD API
- [ ] Implement Run model and CRUD API
- [ ] Implement Agent Definition model and CRUD API
- [ ] Implement Prompt Definition model and CRUD API
- [ ] Implement Contract Definition model and CRUD API
- [ ] Create file-based persistence layer
- [ ] Implement index files for fast lookup
- [ ] Add validation middleware to all endpoints

**Artifacts:**
- All endpoints functional with test data
- Unit tests for all models
- Postman collection for API testing

### Phase 3: Application Intake Flow (Week 5-6)

**Goal:** Enable users to submit application ideas

- [ ] Create ApplicationIntakeForm component
- [ ] Implement form validation and submission
- [ ] Create Application API endpoints
- [ ] Create ApplicationList and ApplicationDetails pages
- [ ] Add application status tracking

**Artifacts:**
- Working intake form
- Application list and details views
- E2E test for intake workflow

### Phase 4: Design Plan Generation & Approval (Week 7-8)

**Goal:** Integrate design plan generation and approval gates

- [ ] Create DesignPlanGenerator service (mock for now)
- [ ] Create DesignPlanReview component
- [ ] Implement approval gate UI
- [ ] Add design plan versioning
- [ ] Create approval history tracking
- [ ] Implement design plan editing

**Artifacts:**
- Working design plan generation flow
- Approval gate functional
- Design plan review page

### Phase 5: Roadmap Generation & Approval (Week 9-10)

**Goal:** Implement roadmap generation and phase/task visualization

- [ ] Create RoadmapGenerator service (mock for now)
- [ ] Create RoadmapViewer component with Gantt-style visualization
- [ ] Implement phase and task editing (drag-to-reorder, add/remove)
- [ ] Create approval gate for roadmap
- [ ] Add roadmap versioning

**Artifacts:**
- Working roadmap generation
- Roadmap visualization and editing
- E2E test for design → roadmap flow

### Phase 6: Agent Registry & Management (Week 11-12)

**Goal:** Enable management of agent definitions

- [ ] Load agents from `agents/` directory
- [ ] Create AgentList and AgentDetails pages
- [ ] Implement AgentEdit form
- [ ] Create AgentTest component (run agent against sample input)
- [ ] Add agent validation before save

**Artifacts:**
- Agent management UI
- Agent testing interface
- Agent validation logic

### Phase 7: Prompt Management (Week 13-14)

**Goal:** Implement prompt management and testing

- [ ] Create PromptList and PromptDetails pages
- [ ] Implement PromptEdit component with template editor
- [ ] Create PromptTest interface
- [ ] Add prompt versioning
- [ ] Implement prompt comparison view

**Artifacts:**
- Prompt management UI
- Prompt testing interface
- Prompt version history

### Phase 8: Execution Engine (Week 15-18)

**Goal:** Implement multi-agent orchestration execution

- [ ] Create ExecutionOrchestrator service
- [ ] Implement phase execution loop
- [ ] Implement task execution with contract validation
- [ ] Create repair loop handler
- [ ] Implement gate policy enforcement
- [ ] Add real-time progress monitoring
- [ ] Implement cost tracking per agent/task
- [ ] Create artifact persistence

**Artifacts:**
- Working execution engine
- Real-time monitoring UI
- Cost tracking and reporting

### Phase 9: Error Handling & Repair (Week 19-20)

**Goal:** Implement comprehensive error handling and repair

- [ ] Implement failure taxonomy
- [ ] Create RepairAgent integration
- [ ] Implement repair strategy selection UI
- [ ] Add retry with exponential backoff
- [ ] Create escalation flow for human review
- [ ] Add error reporting and logging

**Artifacts:**
- Failure taxonomy implemented
- Repair UI functional
- Error logs and reporting

### Phase 10: Contract Validation (Week 21-22)

**Goal:** Implement contract validation throughout execution

- [ ] Load contracts from `contracts/` directory
- [ ] Implement contract validation at all handoff points
- [ ] Add contract violation reporting
- [ ] Create contract compliance view
- [ ] Implement schema validation for all inputs/outputs

**Artifacts:**
- Contract validation throughout execution
- Contract compliance dashboard
- Schema validation working

### Phase 11: GitHub Integration (Week 23-24)

**Goal:** Enable push to GitHub for executed code

- [ ] Set up GitHub OAuth
- [ ] Create GitHub integration service
- [ ] Implement branch creation from roadmap phase
- [ ] Implement commit creation from task output
- [ ] Implement PR creation from roadmap
- [ ] Add CI status monitoring
- [ ] Implement merge workflow

**Artifacts:**
- GitHub integration working
- Code pushed to branches/PRs
- CI status visible in UI

### Phase 12: Polish & Documentation (Week 25-26)

**Goal:** Final polish, testing, and documentation

- [ ] Complete all E2E tests
- [ ] Performance optimization
- [ ] Dark mode support
- [ ] Accessibility audit and fixes
- [ ] Create user documentation
- [ ] Create API documentation
- [ ] Create deployment guide

**Artifacts:**
- Production-ready application
- Complete test suite
- Full documentation

---

## Phase 10: Acceptance Criteria

### Functional Requirements

- ✅ User can submit application intake form
- ✅ System generates design plan from intake
- ✅ User can review and approve design plan
- ✅ System generates roadmap from approved design plan
- ✅ User can review, edit, and approve roadmap
- ✅ System executes roadmap using multi-agent team
- ✅ User can monitor execution in real-time
- ✅ System validates all handoffs against contracts
- ✅ System repairs failures automatically where possible
- ✅ User can view cost tracking and resource usage
- ✅ System persists all runs and artifacts
- ✅ User can manage agent definitions
- ✅ User can create and test prompts
- ✅ User can view approval history and audit trail
- ✅ System can push generated code to GitHub

### Non-Functional Requirements

- ✅ API response time < 500ms (95th percentile)
- ✅ Real-time updates to execution status (< 1s latency)
- ✅ Support 100+ concurrent monitoring sessions
- ✅ Graceful degradation if LLM APIs are slow
- ✅ Full audit trail of all decisions
- ✅ Database query < 100ms for list operations
- ✅ Mobile-responsive design (90%+ of pages)
- ✅ Dark mode support
- ✅ WCAG 2.1 AA accessibility compliance
- ✅ No sensitive data in logs
- ✅ Secure session management
- ✅ CORS properly configured

### Quality Targets

- ✅ >= 80% test coverage for core services
- ✅ >= 90% test coverage for critical paths
- ✅ All contracts validated in tests
- ✅ All APIs documented with examples
- ✅ < 5 open critical bugs at release
- ✅ No TypeScript compilation errors
- ✅ All security best practices followed

---

## Phase 11: Risks and Mitigations

### Architectural Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| LLM API failures impact execution | High | High | Implement retry logic, timeout handling, fallback to simpler models |
| Agent outputs don't match contracts | High | High | Implement repair loop, repair agent for schema fixes |
| State consistency issues with concurrent agents | Medium | High | Use explicit conflict groups, serialize writes, add validation |
| Token cost overruns | Medium | Medium | Add hard token limits per phase, implement cost tracking and alerts |
| GitHub integration security issues | Low | High | Use GitHub App, minimal permissions, rotate tokens regularly |

### Execution Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Design plan generation produces unusable output | Medium | High | Multiple reviewers, iteration loops, fallback to manual design |
| Roadmap generation misses critical tasks | Medium | High | Comprehensive validation against design, peer review before execution |
| Task failures cascade to dependent tasks | High | Medium | Explicit dependency tracking, clear failure classification, repair options |
| Repair loop gets stuck in infinite cycle | Low | High | Max repair attempts = 2, then escalate; timeout on repairs |

### Data Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Data loss due to file system issues | Low | High | Regular backups, optional database persistence, redundant storage |
| Sensitive data exposed in logs | Low | High | Sanitize logs, never log full prompts/outputs, redact tokens |
| Concurrent write conflicts | Medium | Medium | File locking, transactional writes, version control |
| Schema migrations break existing runs | Low | Medium | Versioned schemas, backward compatibility tests |

### UX Risks

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Execution takes too long (user abandons) | Medium | Medium | Real-time progress updates, estimated time remaining, pause/resume |
| Cost surprises (exceeds estimate) | Medium | Medium | Token tracking, cost alerts, ability to pause before threshold |
| Unclear failure messages | High | Medium | Clear error taxonomy, actionable repair suggestions |
| Too many approval gates (workflow too slow) | Medium | Low | Configurable gates, pre-approval of similar patterns |

---

## Phase 12: First Coding Task

### Recommended Entry Point: Foundation & Data Layer

**Task:** Set up the complete project structure and implement the core data model persistence layer.

**Why First:**
- All subsequent features depend on this
- Provides clear success criteria (working API endpoints)
- Allows parallel work on UI components
- De-risks the entire project early

**Scope (1-2 weeks):**

1. **Create Vite + React + TypeScript frontend**
   - Page routing scaffold
   - shadcn/ui integration
   - API client with axios/fetch wrapper
   - Global state (Zustand or Redux)

2. **Create Express + TypeScript backend**
   - Request validation middleware
   - Error handling middleware
   - Logging middleware
   - CORS configuration

3. **Implement Data Models & Persistence**
   - Application: create, read, update, list
   - DesignPlan: create, read, update, list
   - Roadmap: create, read, update, list
   - Run: create, read, update, list
   - All with file-based JSON persistence
   - Index files for fast lookup

4. **Create API Endpoints**
   - POST /api/applications
   - GET /api/applications
   - GET /api/applications/:id
   - PUT /api/applications/:id
   - Same pattern for design-plans, roadmaps, runs

5. **Add Comprehensive Tests**
   - Unit tests for models
   - Integration tests for API endpoints
   - Contract tests for data shapes
   - E2E test for create → read → update flow

**Success Criteria:**
- ✅ npm run dev starts both frontend and backend
- ✅ All CRUD endpoints functional and tested
- ✅ Data persists to disk and survives restart
- ✅ API client works from React components
- ✅ All TypeScript compiles without errors
- ✅ Test suite passes with >80% coverage

**Next Task After:**
- Application Intake Flow (Week 3-4 in roadmap)
- Design Plan Generation integration (week 5-6)

---

## Summary

This specification transforms the existing orchestration asset library into a **professional, production-grade web application** for multi-agent software development workflows. 

**Key Achievements:**
1. **Preserves all existing assets** (agents, contracts, libraries) and extends them
2. **Adds missing pieces** from gap analysis (handoff contracts, shared state, trace spans)
3. **Provides complete UI** for intake → design → roadmap → execution → monitoring
4. **Implements approval gates** before expensive/destructive operations
5. **Adds comprehensive testing** and contract validation
6. **Enables GitHub integration** for code push and collaboration
7. **Tracks costs and tokens** transparently throughout

**Architecture Highlights:**
- React frontend with TypeScript, Vite, tailwind, shadcn/ui
- Express backend with contract validation and error recovery
- File-based persistence (with DB adapter for future)
- Multi-agent orchestration with repair loops
- Real-time monitoring and cost tracking
- Comprehensive audit trail

This specification is **ready for a coding agent to begin implementation** without additional architectural questions.

---

**Generated:** June 14, 2026  
**For:** Multi-Agent Orchestration Platform Team  
**Status:** ✅ Ready for Implementation
