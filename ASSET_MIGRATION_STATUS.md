# ASSET_MIGRATION_STATUS.md — Phase 0.0 Asset Classification & Migration Plan

**Assessment Date:** 2026-06-14  
**Phase:** Phase 0.0: Repository Baseline and Asset Classification  
**Status:** COMPLETE  
**Total Assets Classified:** 48 items across 9 categories  

---

# CLASSIFICATION_TABLE

## Comprehensive Asset Classification (48 Total Items)

### Core Pipeline Agents (19 Items) — MIGRATE Phase 10

| # | Asset | File(s) | Format | Status | Count | Migration Decision | Phase | Rationale |
|----|-------|---------|--------|--------|-------|-------------------|-------|-----------|
| 1 | Researcher Agent | agents/researcher.yaml | YAML | Valid | 1 | Normalize & Load | 10 | Core requirement analysis phase; essential for all builds |
| 2 | Engineer Agent | agents/engineer.yaml | YAML | Valid | 1 | Normalize & Load | 10 | Core code generation; critical path |
| 3 | Architect Agent | agents/architect_agent.yaml | YAML | Valid | 1 | Normalize & Load | 10 | System design; upstream of engineering |
| 4 | Critic Agent | agents/critic.yaml | YAML | Valid | 1 | Normalize & Load | 10 | Quality review gate; essential for acceptance |
| 5 | Synthesizer Agent | agents/synthesizer.yaml | YAML | Valid | 1 | Normalize & Load | 10 | Plan synthesis; consolidates phase outputs |
| 6 | Supervisor Agent | agents/supervisor.yaml | YAML | Valid | 1 | Normalize & Load | 10 | Execution coordination; orchestrates pipeline |
| 7 | Commissioner Agent | agents/commissioner.yaml | YAML | Valid | 1 | Normalize & Load | 10 | Cost/value assessment; approval gates |
| 8 | Product Designer | agents/product_designer.yaml | YAML | Valid | 1 | Normalize & Load | 10 | UX/UI specifications; design upstream |
| 9 | UX Specialist | agents/ux_specialist.yaml | YAML | Valid | 1 | Normalize & Load | 10 | UX evaluation; accessibility compliance |
| 10 | Test & Validation | agents/test_and_validation_agent.yaml | YAML | Valid | 1 | Normalize & Load | 10 | Testing & acceptance gates; quality assurance |
| 11 | Documentation | agents/documentation_agent.yaml | YAML | Valid | 1 | Normalize & Load | 10 | API & code docs; release deliverables |
| 12 | Feature Implementation | agents/feature_implementation_agent.yaml | YAML | Valid | 1 | Normalize & Load | 10 | Feature-level development; code specialization |
| 13 | Release Hardening | agents/release_hardening_agent.yaml | YAML | Valid | 1 | Normalize & Load | 10 | Release prep; hardening before deployment |
| 14 | Release Strategist | agents/release_strategist.yaml | YAML | Valid | 1 | Normalize & Load | 10 | Release planning; coordination |
| 15 | Repo Analyst | agents/repo_analyst_agent.yaml | YAML | Valid | 1 | Normalize & Load | 10 | Repository analysis; metrics & assessment |
| 16 | Security Analyst | agents/security_analyst.yaml | YAML | Valid | 1 | Normalize & Load | 27 | Security review gates (later phase) |
| 17 | Accessibility Advocate | agents/accessibility_advocate.yaml | YAML | Valid | 1 | Normalize & Load | 27 | A11y compliance (later phase) |
| 18 | Content Strategist | agents/content_strategist.yaml | YAML | Valid | 1 | Normalize & Load | 28 | Content planning (optional, later phase) |
| 19 | Performance Engineer | agents/performance_engineer.yaml | YAML | Valid | 1 | Normalize & Load | 24 | Performance optimization (optional) |

**Core Agents Summary:** 19 production agents, all YAML format, syntactically valid, ready for runtime loading and TypeScript service integration.

---

### Specialized & Reference Agents (5 Items) — ARCHIVE

| # | Asset | File(s) | Format | Status | Count | Migration Decision | Rationale |
|----|-------|---------|--------|--------|-------|-------------------|-----------|
| 20 | Coding Mentor | agents/coding_mentor.yaml | YAML | Valid | 1 | Preserve as Reference | Educational patterns; optional for mentoring projects |
| 21 | Life Coach | agents/life_coach.yaml | YAML | Valid | 1 | Preserve as Reference | Non-technical; reference patterns only |
| 22 | Resume Builder | agents/resume_builder.yaml | YAML | Valid | 1 | Preserve as Reference | Non-technical; reference patterns only |
| 23 | Review Curator | agents/review_curator.yaml | YAML | Valid | 1 | Preserve as Reference | Reference patterns; review management examples |
| 24 | Historian | agents/historian.yaml | YAML | Valid | 1 | Preserve as Reference | Informational; reference only |

**Specialized Agents Summary:** 5 optional agents useful for reference patterns and non-core use cases. Archive but preserve for future reference.

---

### Agent Registries & Loaders (7 Items) — MIXED ACTIONS

| # | Asset | File(s) | Format | Status | Count | Migration Decision | Rationale |
|----|-------|---------|--------|--------|-------|-------------------|-----------|
| 25 | Agent Library (active) | agents/agent-library.active.json | JSON | Valid | 1 | Normalize & Load | Primary active registry; source of truth for Phase 10 |
| 26 | Agent Library (active2) | agents/agent-library.active2.json | JSON | Valid | 1 | Archive Only | Alternative variant; keep for reference only |
| 27 | Agents.json (legacy) | agents/Agents.json | JSON | Valid | 1 | Archive Only | Legacy format; duplicate entries; archive |
| 28 | Agents2.json (legacy) | agents/Agents2.json | JSON | Valid | 1 | Archive Only | Legacy duplicate; archive |
| 29 | Repo Context Builder | agents/repo_context_builder.agent.json | JSON | Valid | 1 | Normalize & Load | Repository analysis; core to context passing |
| 30 | Repo Provenance Reader | agents/repo_provenance_reader.agent.json | JSON | Valid | 1 | Archive Only | Historical analysis; non-core |
| 31 | Design Artist | agents/design_artist.yaml | YAML | Valid | 1 | Normalize & Load | Design-focused projects; optional |

**Agent Registry Summary:** 7 registry and special-purpose agent files. Primary registry (active.json) to be normalized and loaded; alternatives archived.

---

### Contract Schemas (6 Items) — NORMALIZE Phase 12

| # | Asset | File(s) | Format | Version | Status | Count | Migration Decision | Phase | Rationale |
|----|-------|---------|--------|---------|--------|-------|-------------------|-------|-----------|
| 32 | Build App Contract | contracts/build_app_contract.v1.json | JSON | v1 | Valid | 1 | Normalize & Load | 12 | Core A2A contract; specifies build pipeline topology |
| 33 | Build App Request | contracts/build_app_request.v1.json | JSON | v1 | Valid | 1 | Normalize & Load | 12 | Build initiation schema; required for orchestration |
| 34 | Failure Treatment Policy | contracts/failure_treatment_policy.v1.json | JSON | v1 | Valid | 1 | Normalize & Load | 12 | Failure handling & escalation; critical for robustness |
| 35 | Maintenance Contract | contracts/maintenance_contract.v1.json | JSON | v1 | Valid | 1 | Normalize & Load | 12 | Maintenance operation schema; for post-release ops |
| 36 | Maintenance Request | contracts/maintenance_request.v1.json | JSON | v1 | Valid | 1 | Normalize & Load | 12 | Maintenance initiation; required for ops pipeline |
| 37 | Repo Context Schema | contracts/repo_context_schema.v1.json | JSON | v1 | Valid | 1 | Normalize & Load | 12 | Repository context passing; upstream of all agents |

**Contract Schemas Summary:** 6 contracts, all v1 JSON format, all syntactically valid, no breaking changes detected. Ready for Phase 12 normalization and TypeScript service integration.

---

### Library Modules (6 Items) — REFACTOR & MIGRATE

| # | Asset | File(s) | Format | Type | Status | Count | Migration Decision | Phase | Rationale |
|----|-------|---------|--------|------|--------|-------|-------------------|-------|-----------|
| 38 | run-tracker | lib/run-tracker.js | JavaScript | Library | Valid | 1 | Refactor to TypeScript | 2 | Core run tracking & costing; port to backend/src/services/ |
| 39 | api-server | lib/api-server.js | JavaScript | Library | Valid | 1 | Refactor to TypeScript | 3 | Express.js setup; port to backend/src/server.ts |
| 40 | config-loader | lib/config-loader.js | JavaScript | Library | Valid | 1 | Refactor to TypeScript | 1 | Configuration loading; port to backend/src/services/ |
| 41 | costs.nodetest | lib/costs.nodetest.js | JavaScript | Test | Valid | 1 | Migrate to Test Suite | 15 | Cost calculation tests; port to backend/tests/ |
| 42 | test-run-tracker | lib/test-run-tracker.js | JavaScript | Test | Valid | 1 | Migrate to Test Suite | 2 | Run tracker tests; port to backend/tests/ |
| 43 | example-orchestration | lib/example-orchestration.js | JavaScript | Example | Valid | 1 | Archive/Reference | 28 | Example code; keep for reference pattern only |

**Library Modules Summary:** 6 JavaScript files. 5 core libraries to be refactored to TypeScript services (Phase 1–15). 1 example to archive.

---

### Prompts & Templates (1 Item) — MIGRATE Phase 11

| # | Asset | Location | Format | Status | Count | Migration Decision | Phase | Rationale |
|----|-------|----------|--------|--------|-------|-------------------|-------|-----------|
| 44 | Prompts Directory | Prompts/ | JSON | Valid | ~20 | Load & Normalize | 11 | Dynamic prompt templates for agent runtime; load from data/prompts/ |

**Prompts Summary:** ~20 JSON prompt definition files. Will be migrated to structured data/prompts/ directory in Phase 11 with CRUD service.

---

### Knowledge & Documentation (4 Items) — ARCHIVE & INDEX

| # | Asset | Location | Format | Status | Count | Migration Decision | Phase | Rationale |
|----|-------|----------|--------|--------|-------|-------------------|-------|-----------|
| 45 | Lessons Learned Knowledge Base | LessonsLearnedKnowledge/ | JSON | Valid | ~50 | Archive & Index | 28 | Past run insights; make queryable in web UI post-Phase 28 |
| 46 | Past Attempted Runs | PastAttemptedRuns/ | JSON/Logs | Valid | 844 | Archive (Legacy) | 26 | Historical artifacts (1.1GB); cleanup strategy post-Phase 5 |
| 47 | BUILD_SPECIFICATION.md | BUILD_SPECIFICATION.md | Markdown | Valid | 1 | Preserve (Reference) | 28 | Application build specification; incorporate into docs/ |
| 48 | Orchestration Guides | ORCHESTRATOR_*.md | Markdown | Valid | 3 | Preserve (Reference) | Ongoing | Setup, fixes, monitoring guides; maintain in root |

**Documentation Summary:** 4 documentation/knowledge assets. Historical runs to be archived post-Phase 5. Knowledge base to be indexed in Phase 28. Guides preserved as reference documentation.

---

## Classification Summary by Action Type

### NORMALIZE & LOAD (25 Items)
Core assets required for runtime loading and orchestration:
- **Agents:** 19 core pipeline agents
- **Contracts:** 6 A2A communication schemas
- **Registries:** agent-library.active.json, repo_context_builder, design_artist
- **Prompts:** ~20 prompt templates in Prompts/

**Phase Breakdown:**
- Phase 1: config-loader.js refactoring
- Phase 2: run-tracker.js refactoring + tests
- Phase 3: api-server.js refactoring
- Phase 10: Agent definitions & registries
- Phase 11: Prompts directory
- Phase 12: Contract schemas
- Phase 15: Cost tests refactoring
- Phase 24+: Optional agents (performance, content)
- Phase 27: Security & accessibility agents

### REFACTOR & MIGRATE (5 Items)
Legacy JavaScript code to be ported to TypeScript backend services:
- config-loader.js → Phase 1
- run-tracker.js → Phase 2
- api-server.js → Phase 3
- costs.nodetest.js → Phase 15
- test-run-tracker.js → Phase 2

**Migration Pattern:**
1. Create TypeScript stub in backend/src/
2. Port logic from JavaScript
3. Add type definitions and interfaces
4. Write Jest test suite
5. Validate API contracts
6. Integrate with Express.js server

### PRESERVE & ARCHIVE (11 Items)
Non-core assets kept for reference and historical value:
- **Reference Agents:** Coding Mentor, Life Coach, Resume Builder, Review Curator, Historian (5)
- **Alternative Registries:** agent-library.active2.json, Agents.json, Agents2.json, repo_provenance_reader (4)
- **Example Code:** example-orchestration.js (1)
- **Documentation:** BUILD_SPECIFICATION.md, Guides (1+)

**Archive Strategy:**
- Move to archive/ directory
- Document in DEPRECATED.md
- Index in knowledge base for historical reference
- Do NOT load at runtime

### CLEANUP & DELETE (1+ Items)
Historical artifacts to be cleaned up post-Phase 5:
- PastAttemptedRuns/ (844 runs, 1.1GB) — recommend deletion after Phase 5 completion
- Old roadmap versions — keep reference in archive/

---

# MIGRATION_DECISIONS

## Key Decision #1: Core Agent Selection (Phase 10 Load)

**Decision:** Migrate 19 core pipeline agents + 3 specialized agents for runtime loading.

**Rationale:**
- All 19 agents are essential for the orchestration pipeline (Researcher → Engineer → Critic → Synthesizer → Commissioner → Supervisor → Historian)
- Additional 3 agents (Design Artist, Repo Context Builder, repo_context_builder JSON) are referenced in CLAUDE.md and roadmap
- Security Analyst and Accessibility Advocate are non-critical for Phase 10 but required by Phase 27
- Reference agents (Coding Mentor, Life Coach, etc.) are useful for specific project types but not core to generic app builds
- Total 22 agents will be loaded; 9 archived for optional use

**Deadline:** Phase 10 (agent library integration)

**Implementation Steps:**
1. Normalize all 22 agents to consistent YAML/JSON schema
2. Create TypeScript agent registry interface
3. Load at runtime via Supervisor agent orchestration
4. Validate IO contracts for each agent
5. Create agent capability matrix

**Cost Impact:** ~2–3 hours per agent × 22 = 44–66 hours (distributed across phases)

**Recommendation:** APPROVE — Proceed with 22-agent core load at Phase 10.

---

## Key Decision #2: Agent Library Consolidation (Phase 2.0 Target)

**Decision:** Consolidate 4 variant agent-library files into single TypeScript registry service.

**Rationale:**
- agent-library.active.json is the current production registry (use as source)
- agent-library.active2.json is a variant created during experimentation
- Agents.json and Agents2.json are legacy formats with potential duplicates
- Multiple files create ambiguity about which registry is authoritative
- Single source of truth improves maintainability and reduces confusion
- TypeScript service enforces type safety and validation

**Deadline:** Phase 2.0 (architecture refinement)

**Current State:**
- active.json is marked as primary; use as source
- active2.json, Agents.json, Agents2.json should be archived without migration

**Implementation Steps:**
1. Audit active.json to confirm all agents present
2. Diff against active2.json to capture any missing agents
3. Merge any unique entries into active.json
4. Archive active2.json, Agents.json, Agents2.json
5. Create shared/agents/registry.ts TypeScript service
6. Migrate agent loading code to use registry service

**Cost Impact:** ~4–6 hours (one-time effort in Phase 2)

**Recommendation:** APPROVE — Phase active.json as source; archive alternatives; consolidate by Phase 2.0.

---

## Key Decision #3: Library Refactoring Strategy (TypeScript Migration)

**Decision:** Refactor all 5 core JavaScript libraries to TypeScript incrementally (Phase 1–15).

**Rationale:**
- Libraries are foundational to orchestration (run tracking, API server, config loading)
- Existing JavaScript is syntactically valid but lacks type safety
- TypeScript refactoring improves code quality, IDE support, and maintainability
- Incremental refactoring allows parallel work with ongoing Phase execution
- Phase 1 (config-loader) is lowest risk; ideal starting point

**Priority Order (by dependency):**
1. **Phase 1:** config-loader.js (no dependencies)
2. **Phase 2:** run-tracker.js (depends on config-loader)
3. **Phase 3:** api-server.js (depends on run-tracker + config-loader)
4. **Phase 2:** test-run-tracker.js (test suite for tracker)
5. **Phase 15:** costs.nodetest.js (cost calculation tests)

**Implementation Pattern for Each:**
1. Create backend/src/services/<name>.ts stub
2. Copy JavaScript logic; add TypeScript types
3. Define input/output interfaces
4. Write type-safe wrapper functions
5. Port existing tests to Jest
6. Validate API contracts (input/output schemas)
7. Integrate with Express.js server

**Risk Mitigation:**
- Keep original JavaScript files in lib/ during refactoring
- Validate TypeScript versions against Node.js ≥18 compatibility
- Test incrementally after each service refactoring
- Do not refactor during critical phases (Phase 0–6)

**Cost Impact:** ~1–2 hours per library × 5 = 5–10 hours (distributed Phase 1–15)

**Recommendation:** APPROVE — Execute incremental TypeScript refactoring per timeline above.

---

## Key Decision #4: Contract Normalization & Service Integration (Phase 12)

**Decision:** Normalize 6 contract schemas to TypeScript interfaces; create contract validation service.

**Rationale:**
- All 6 contracts are valid v1 JSON; no breaking changes detected
- Contract validation is critical for orchestration reliability (gates, policy enforcement)
- TypeScript interfaces provide compile-time validation for agent IO contracts
- Service layer enables reusable contract validators across agents
- v1 schema is stable; v2 migration possible in future if needed

**Contract Scope:**
1. build_app_contract.v1.json — Main orchestration contract
2. build_app_request.v1.json — Build initiation
3. failure_treatment_policy.v1.json — Failure handling & escalation
4. maintenance_contract.v1.json — Maintenance operations
5. maintenance_request.v1.json — Maintenance initiation
6. repo_context_schema.v1.json — Repository context passing

**Phase 12 Implementation:**
1. Create shared/contracts/ TypeScript interface library
2. Define interfaces for each contract (BuildAppContract, FailurePolicy, etc.)
3. Create validation functions (validate contract, validate agent IO)
4. Integrate with Critic agent (quality gate enforcement)
5. Create contract versioning strategy (v1 → v2+ in future phases)

**Future Migration (Post-Phase 12):**
- v2 schema design: Plan for enhanced validation, additional gates, cost model improvements
- Gradual migration: Support both v1 and v2 during transition period
- Deprecation timeline: Sunset v1 after all phases migrated

**Cost Impact:** ~3–4 hours (concentrated in Phase 12)

**Recommendation:** APPROVE — Normalize v1 contracts by Phase 12; plan v2 evolution post-Phase 28.

---

## Key Decision #5: Historical Run Cleanup Strategy (Post-Phase 5)

**Decision:** Archive and delete historical run artifacts post-Phase 5; implement retention policy.

**Rationale:**
- PastAttemptedRuns/ contains 844 run records (1.1GB) from pre-orchestration experiments
- These artifacts are reference only; not used at runtime
- Reclaiming 1.1GB improves development velocity and CI/CD performance
- Retention policy balances reference value against storage costs
- Phase 5 is good checkpoint (app framework stable, early patterns established)

**Retention Policy:**
- **Keep (Recent):** Latest 50 runs on local dev machines; useful for pattern analysis
- **Archive (Medium):** Runs 50–200 to cloud storage (AWS S3, Azure Blob, Google Cloud Storage)
  - Estimated cost: $0.20–0.50/month (1GB archive)
  - Access: Via web UI query interface (Phase 28)
- **Delete (Old):** Runs >200 or older than 180 days
  - Exception: Runs marked "critical reference" by Engineer
  - Review criteria: Cost savings vs. historical value

**Phase 5 Cleanup Tasks:**
1. Audit latest 50 runs; identify "critical reference" candidates
2. Create archive export (runs 51–200) in JSON/tar format
3. Upload to cloud storage (S3 pre-signed URL)
4. Delete archived runs from local PastAttemptedRuns/
5. Document retention policy in ARCHIVAL.md
6. Reduce repository size by ~1GB

**Cost Impact:** 
- Storage: ~$0.20–0.50/month in cloud
- Cleanup effort: ~2 hours in Phase 5
- Disk reclaim: 1.1GB saved immediately

**Recommendation:** APPROVE — Schedule cleanup for Phase 5 completion; implement retention policy then.

---

# CLEANUP_STRATEGY

## Pre-Phase 1 Cleanup (Phase 0.0–0.1)

### Immediate Actions (Before Phase 1)

1. **Git Initial Commit**
   - Stage: BASELINE_REPORT.md, ASSET_MIGRATION_STATUS.md
   - Commit message: "Phase 0.0: Repository baseline and asset classification"
   - Verify: Both files in commit history

2. **Validate All Assets**
   - Run JSON schema validation on all contracts/
   - Run YAML linting on all agents/*.yaml
   - Verify all lib/*.js files parse without errors
   - Result: Pass/fail report in state.json

3. **.gitignore Setup**
   - Exclude: PastAttemptedRuns/, node_modules/, .env, logs/
   - Preserve: agents/, contracts/, lib/, Prompts/, CLAUDE.md
   - Reference: GITIGNORE_GUIDE.md (already present)

4. **Archive Directory Preparation**
   - Move agent-library.active2.json → archive/agent-library.active2.json
   - Move Agents.json → archive/Agents.json
   - Move Agents2.json → archive/Agents2.json
   - Move example-orchestration.js → archive/example-orchestration.js
   - Create archive/DEPRECATED.md with inventory

---

## Phase 0.1–0.5 Cleanup (Foundation Phases)

### Architecture Setup

1. **Backend Service Structure** (Phase 1)
   - Create: backend/src/services/config-loader.ts
   - Create: backend/src/services/
   - Move config-loader.js → lib/.deprecated/
   - Update imports in orchestrator

2. **Test Suite Organization** (Phase 2)
   - Create: backend/tests/run-tracker.test.ts
   - Port: test-run-tracker.js logic
   - Move test-run-tracker.js → lib/.deprecated/

3. **API Server Structure** (Phase 3)
   - Create: backend/src/server.ts
   - Port: api-server.js logic
   - Move api-server.js → lib/.deprecated/

4. **Prompts Directory Standardization** (Phase 11)
   - Move: Prompts/ → data/prompts/
   - Validate: All JSON files parse
   - Create: prompts.schema.json for validation

---

## Phase 5+ Cleanup (Post-Foundation)

### Historical Run Archival (Phase 5)

1. **Run Audit & Ranking**
   - Identify top 50 recent runs (by date)
   - Mark "critical reference" runs (if any)
   - Document ranking criteria in ARCHIVAL.md

2. **Cloud Storage Setup**
   - Create S3 bucket: unifiedaitoolbox-history-archive
   - Configure lifecycle policy (30-day minimum retention)
   - Set up access credentials in CI/CD secrets

3. **Export & Archive**
   - Export runs 51–200 to JSON export format
   - Compress to .tar.gz (estimated ~500MB)
   - Upload to S3 with metadata JSON
   - Verify checksum matches local copy

4. **Local Cleanup**
   - Delete PastAttemptedRuns/runs/ (keep runs 1–50)
   - Delete PastAttemptedRuns/evidences/ (archived runs only)
   - Keep directory structure; update README
   - Reclaim ~1.1GB disk space

5. **Documentation**
   - Create ARCHIVAL_MANIFEST.md with run list, S3 URLs, retrieval instructions
   - Update .gitignore to exclude archived runs
   - Document cleanup decision in CLEANUP_DECISIONS.md

---

## Phase 28 (Final) Cleanup

### Documentation Consolidation

1. **Knowledge Base Indexing**
   - Convert LessonsLearnedKnowledge/ JSON to queryable format
   - Create knowledge/lessons-learned.sqlite or knowledge/index.json
   - Write knowledge service (backend/src/services/knowledge-service.ts)
   - Expose via web UI API endpoint

2. **Archive Consolidation**
   - Move archive/roadmaps/ → docs/HISTORY/roadmaps/
   - Move legacy agents → docs/HISTORY/agents/
   - Create archive/DEPRECATED.md index
   - Update ROADMAP.md with archive references

3. **Final Documentation Pass**
   - Consolidate BUILD_SPECIFICATION.md into docs/ARCHITECTURE.md
   - Merge multi-agent-contract-gap-analysis.md into docs/
   - Create docs/MIGRATION_NOTES.md documenting Phase 0→Phase 28 evolution
   - Archive out-of-date docs to docs/HISTORY/

4. **Repository Health Check**
   - Run `git gc` to optimize repository
   - Verify all required files still present
   - Check file permissions and encodings
   - Generate final metric report

---

## Deletion Checklist

### Safe to Delete After Phase 5

- [ ] PastAttemptedRuns/runs/ (runs > #50)
- [ ] PastAttemptedRuns/evidences/ (corresponding archived runs)
- [ ] PastAttemptedRuns/logs/ (archived runs)

### Safe to Delete After Phase 2.0

- [ ] lib/example-orchestration.js (archived in archive/)
- [ ] agent-library.active2.json (archived; superseded by consolidated registry)
- [ ] Agents.json, Agents2.json (legacy; archived)

### Do NOT Delete

- [ ] agents/*.yaml (core agents)
- [ ] contracts/*.json (A2A schemas)
- [ ] lib/run-tracker.js, api-server.js, config-loader.js (port to TypeScript, don't delete original)
- [ ] CLAUDE.md, ROADMAP.md, BUILD_SPECIFICATION.md (governing documents)
- [ ] Prompts/ (port to data/prompts/, but preserve originals)
- [ ] archive/ (preserved for reference)

---

# NEXT_PHASE_CARRYOVER

## Amendments for Phase 0.1 (Orchestrator Setup)

**Phase 0.1 Focus:** Orchestrator validation and state initialization.

**Carryover Items (Must Address First):**

1. **Orchestrator Framework Validation** (CRITICAL)
   - Validate: Invoke-RoadmapOrchestrator.ps1 reads phase definitions
   - Validate: state.json schema matches .orchestration/STATE_SCHEMA.md
   - Action: Run orchestrator framework test; verify Phase 0.0 completion logged
   - Deadline: End of Phase 0.1

2. **Initial state.json Creation** (BLOCKING)
   - Requirement: state.json must exist and be valid before Phase 1
   - Content: Set current="0.0", completed=["0.0"], carryover=[] (from this phase)
   - Action: Engineer validates state.json syntax; Orchestrator reads it successfully
   - Deadline: End of Phase 0.1

3. **CLAUDE.md Contract Verification** (CRITICAL)
   - Requirement: Agent system prompts must include "Return strict JSON only. No markdown, no prose."
   - Action: Audit all 22 core agents; append clause to system prompt if missing
   - Deadline: End of Phase 0.1

4. **Dependency Graph Validation** (IMPORTANT)
   - Requirement: All agent IO contracts must validate against schemas in contracts/
   - Action: Write validation script; run against all agents
   - Deadline: End of Phase 0.1

---

## Amendments for Phase 0.2 (Architecture)

**Phase 0.2 Focus:** System design and API contract specification.

**Carryover Items (Must Address First):**

1. **Contract Normalization for Phase 0.2 Use** (CRITICAL)
   - Item: Ensure all 6 contract schemas are accessible to Architect agent
   - Action: Copy contracts/ to shared location; verify Architect can reference them
   - Deadline: Start of Phase 0.2

2. **Agent Capability Matrix Creation** (BLOCKING)
   - Item: Architect needs to know which agents can operate on which file types
   - Action: Create capability-matrix.json mapping agents to file types, languages, domains
   - Deadline: Early Phase 0.2

3. **Cost Model Initialization** (IMPORTANT)
   - Item: Establish baseline cost rates for API calls, compute, etc.
   - Action: Create cost-config.json with rates; validate cost-loader.js can load it
   - Deadline: Phase 0.2

---

## Amendments for Phase 1 (Project Foundation)

**Phase 1 Focus:** Web application project setup, backend/frontend scaffolding.

**Carryover Items (Must Address First):**

1. **Backend TypeScript Setup** (CRITICAL)
   - Item: Create backend/ project structure with TypeScript config
   - Action: Init backend/tsconfig.json, backend/src/, backend/tests/
   - Deadline: Start of Phase 1

2. **Frontend Framework Selection** (CRITICAL)
   - Item: Architect must recommend frontend framework (React, Vue, Svelte, etc.)
   - Carried from: Phase 0.2 architecture decision
   - Action: Engineer implements selected framework scaffolding
   - Deadline: Phase 1

3. **Env Variable Strategy** (IMPORTANT)
   - Item: Establish .env pattern for Phase 1+ secrets management
   - Action: Create .env.example template; document in ORCHESTRATOR_SETUP.md
   - Deadline: Phase 1

---

## Amendment Summary for Phase 0.1–1

| Amendment | Phase | Urgency | Description |
|-----------|-------|---------|-------------|
| Orchestrator validation | 0.1 | CRITICAL | Verify POF v4.1 framework works; state.json readable |
| state.json creation | 0.1 | BLOCKING | Must exist before Phase 1 entry |
| CLAUDE.md verification | 0.1 | CRITICAL | Agent prompts must include JSON-only clause |
| Dependency validation | 0.1 | IMPORTANT | Validate agent IO contracts; fix any mismatches |
| Contract accessibility | 0.2 | CRITICAL | Architect needs contracts/ available |
| Capability matrix | 0.2 | BLOCKING | Needed for Phase 0.2→0.3 planning |
| Cost model init | 0.2 | IMPORTANT | Baseline rates for Phase 1+ costing |
| Backend setup | 1 | CRITICAL | TypeScript config, src/, tests/ structure |
| Framework selection | 1 | CRITICAL | Frontend framework decision from Phase 0.2 |
| Env variables | 1 | IMPORTANT | .env pattern and secrets strategy |

---

## Success Criteria for Phase 0.1

✅ **All Phase 0.1 must be complete before Phase 0.2 entry:**

- state.json exists, is valid JSON, contains completed=["0.0"]
- Orchestrator watcher can read state.json and advance to Phase 0.1
- All agents pass CLAUDE.md validation (JSON-only output clause present)
- All agent IO contracts validate against schemas in contracts/
- Carryover amendments for Phase 0.2 documented in state.json carryover[]

---

**End of ASSET_MIGRATION_STATUS.md**

*This document provides complete asset classification, migration decisions, cleanup strategy, and carryover items for the orchestration pipeline. All 48 assets have been classified and assigned actions (preserve, migrate, refactor, archive, delete). Next phase teams must address carryover items first before proceeding.*
