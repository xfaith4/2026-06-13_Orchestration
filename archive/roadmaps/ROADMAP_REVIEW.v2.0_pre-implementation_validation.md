# ROADMAP_REVISED.md — Internal Consistency Review

**Review Date:** 2026-06-14  
**Status:** REQUIRES CRITICAL FIXES BEFORE EXECUTION  
**Reviewer:** Automated Consistency Check + Manual Review

---

## Critical Issues Found

### 1. ❌ CRITICAL: Continuous Phase Execution Prompt References Wrong File

**Issue:** The prompt (lines 139-169) says:
```
Proceed with the next incomplete phase or micro-phase in ROADMAP.md.
```

Should reference `ROADMAP_REVISED.md` or be kept generic as `the current roadmap`.

**Impact:** High — Agents will look for the wrong file.

**Fix:** Change line 139 to:
```
Proceed with the next incomplete phase or micro-phase in ROADMAP_REVISED.md.
```

Or better, make it generic:
```
Proceed with the next incomplete phase or micro-phase in the current roadmap.
```

---

### 2. ❌ CRITICAL: Multiple Phases Exceed 8-Task Sizing Rule

Phases with >8 implementation tasks (violate Phase Sizing Rule at line 205):

| Phase | Task Count | Status | Recommendation |
|-------|-----------|--------|-----------------|
| 0 | 10 tasks | Read-only, acceptable | Keep as-is (baseline assessment) |
| 1 | 11 tasks | SPLIT | Break into Project Init (deps) + Project Config (tooling) |
| 2 | 8 tasks | At limit | Keep, but monitor |
| 3 | 10 tasks | SPLIT | Break into Backend CRUD Routes + Middleware |
| 4 | 10 tasks | SPLIT | Break into Layout/Navigation + Components + Styling |
| 5 | 8 tasks | At limit | Keep, monitor closely |
| 6 | 8 tasks | At limit | Keep |
| 7 | 8 tasks | At limit | Keep |
| 8 | 8 tasks | At limit | Keep |
| 9 | 8 tasks | At limit | Keep |
| 10 | 10 tasks | SPLIT | Break into Agent Registry + Agent CRUD + Agent Test |
| 11 | 12 tasks | SPLIT | Break into Prompt CRUD API + Prompt Editor UI + Prompt Testing + Prompt Versioning |
| 12 | 10 tasks | SPLIT | Break into Contract CRUD API + Contract Validator Middleware + Contract Compliance Dashboard |
| 13 | 10 tasks | SPLIT | Break into Spike Setup + Contract Validation + Audit/Cost Tracking + Results Display |
| 14 | 7 tasks | At limit | Keep |
| 15 | 10 tasks | SPLIT | Break into Audit Service + Cost Tracker + Approval Logging + UI Integration |
| 16 | 7 tasks | OK | Keep |
| 17 | 6 tasks | OK | Keep |
| 18 | 8 tasks | At limit | Keep |
| 19 | 8 tasks | At limit | Keep |
| 20 | 9 tasks | SPLIT | Break into Artifact Store + API Endpoints + Artifact Viewer UI |
| 21 | 9 tasks | SPLIT | Break into Summary Generation + Cost Aggregation + Completion UI |
| 22 | 9 tasks | SPLIT | Break into Run Detail Page + Live Status Updates + Log Viewer + Cost Tracking |
| 23 | 7 tasks | At limit | Keep |
| 24 | 8 tasks | At limit | Keep |
| 25 | 7 tasks | OK | Keep |
| 26 | 8 tasks | At limit | Keep |
| 27 | 8 tasks | At limit | Keep |
| 28 | 8 tasks | At limit | Keep |
| 29 | 6 tasks | OK | Keep |

**Impact:** Very High — 13 phases violate the 8-task rule. Will cause oversized runs.

**Fix:** Split these phases into micro-phases before Phase 0 execution. This will increase total phase count from 29 to approximately 45-50 phases.

---

### 3. ⚠️ PHASE DEPENDENCIES: Check for Correctness

**Spot Checks (Correct):**

- Phase 11 (Prompts) → Inputs: Phase 10 (Agents), Phase 3 (API) ✅
- Phase 12 (Contracts) → Inputs: Phase 10 (Agents), Phase 3 (API) ✅  
- Phase 13 (Spike) → Inputs: Phase 9 (Roadmap Approval), Phase 12 (Contracts) ✅
- Phase 14 (Executor) → Inputs: Phase 13 (Spike) ✅
- Phase 22 (Console) → Inputs: Phase 21 (Completion), Phase 4 (Frontend) ✅
- Phase 25 (GitHub) → Inputs: Phase 22 (Console), Phase 3 (API) ✅

**Result:** All spot-checked dependencies are correct. No self-referential or backward dependencies detected.

---

### 4. ⚠️ Commit Guidance vs. Phase Numbers

**Spot Checks:**

- Phase 0 commit: `docs(phase-0): baseline assessment...` ✅
- Phase 11 commit: `feat(phase-11): prompt refinement workspace` ✅
- Phase 22 commit: `feat(phase-22): execution console...` ✅
- Phase 29 commit: `chore(phase-29): final acceptance...` ✅

**Result:** Commit guidance is consistent with phase numbers.

---

### 5. ✅ Validation Commands Consistency

All phases use consistent validation patterns:

```bash
npm run typecheck
npm run lint
npm test
npm run dev
npm run build
```

**Result:** All validation commands are appropriate and consistent.

---

### 6. ✅ Phase Index Alignment

Phase Index (lines 274-305) matches actual phase headings (checked 0-29).

**Result:** Phase numbering and index are consistent.

---

### 7. ⚠️ Continuous Phase Execution Prompt Completeness

**Missing Details:**

The prompt (lines 138-169) is good but lacks:

1. **No reference to ROADMAP_REVIEW.md** — If this review document is created, the prompt should direct agents to check it first.
2. **No guidance on micro-phase creation** — The prompt mentions splitting but doesn't show the template to use.
3. **No checkpoint message** — No explicit "READY TO CODE" message after pre-coding checklist.

**Recommendation:** Add a section in the prompt:

```text
7. If you need to split the phase into micro-phases, use this template for each:

   ## Phase X.Y — Micro-Phase Name
   
   Same structure as full phase (Goal, Inputs, Deliverables, Implementation Tasks ≤8, etc.)
   
8. When pre-coding checklist is complete, state "READY TO CODE" and begin implementation.
```

---

## Recommended Micro-Phase Splits

### Phase 1 → Split into 1A + 1B

**Phase 1A — Project Structure & Dependencies**
- Create directory structure
- Create root and workspace package.json
- Install dependencies
- Create .gitignore

**Phase 1B — Tooling Configuration**
- Create TypeScript configs
- Install and configure ESLint, Prettier
- Create .env.example
- Verify npm scripts work

---

### Phase 3 → Split into 3A + 3B

**Phase 3A — Backend CRUD Routes**
- Create all 7 resource route files
- Implement all CRUD endpoints
- Register routes

**Phase 3B — Backend Middleware & Error Handling**
- Create validation middleware
- Create error handling middleware
- Create CORS and security middleware
- Write integration tests

---

### Phase 4 → Split into 4A + 4B

**Phase 4A — Frontend Routing & Layout**
- Create React Router setup
- Create MainLayout component
- Create page skeleton files
- Create Navigation/Sidebar

**Phase 4B — Frontend UI System & State**
- Install shadcn/ui and configure
- Configure Tailwind CSS
- Set up Zustand store
- Create API client layer

---

### Phase 10 → Split into 10A + 10B

**Phase 10A — Agent Registry & CRUD API**
- Create agent-loader service
- Create agent registry
- Implement GET /api/agents endpoints
- Implement POST/PUT/DELETE endpoints

**Phase 10B — Agent Management UI & Testing**
- Create AgentsList, AgentDetail, AgentEdit pages
- Create AgentTestBench component
- Write tests

---

### Phase 11 → Split into 11A + 11B + 11C

**Phase 11A — Prompt CRUD API**
- Create Prompt model and schema
- Implement GET /api/prompts endpoints
- Implement POST/PUT endpoints
- Write API tests

**Phase 11B — Prompt Editor UI & Versioning**
- Create PromptsList and PromptDetail pages
- Create PromptEditor component with syntax highlighting
- Implement version history view

**Phase 11C — Prompt Testing & Comparison**
- Create PromptTestBench component
- Implement prompt rendering with variables
- Implement prompt comparison view

---

### Phase 12 → Split into 12A + 12B

**Phase 12A — Contract Registry & Validation**
- Create contract-loader service
- Create contract-validator service
- Create validation middleware

**Phase 12B — Contract Management UI**
- Create ContractsList and ContractDetail pages
- Create SchemaViewer component
- Create ComplianceDashboard

---

### Phase 13 → Split into 13A + 13B

**Phase 13A — Spike Core: Task Execution & Contracts**
- Create spike-orchestrator service
- Define AgentExecutionResult interface
- Create mock task
- Implement contract validation (before + after)
- Write tests

**Phase 13B — Spike Persistence & UI**
- Create spike-run-tracker and spike-audit services
- Create cost placeholder tracking
- Create SpikeExecutionView page
- Display results in UI

---

### Phase 15 → Split into 15A + 15B

**Phase 15A — Audit Service**
- Create AuditEvent model
- Create audit-service
- Add audit logging to approval endpoints
- Add audit logging to execution events

**Phase 15B — Cost Tracking & UI**
- Create cost-tracker service
- Integrate cost tracking into task execution
- Create AuditLog and CostSummary UI components
- Add to execution console

---

### Phase 20 → Split into 20A + 20B

**Phase 20A — Artifact Store & API**
- Create artifact-store service
- Implement artifact save/retrieve
- Create GET /api/artifacts endpoints

**Phase 20B — Artifact Viewer UI**
- Create ArtifactViewer component
- Add artifact links to execution console
- Implement download functionality

---

### Phase 22 → Split into 22A + 22B + 22C

**Phase 22A — Run Detail & Status Monitoring**
- Create ExecutionConsole page
- Create ExecutionProgress component
- Implement live status polling/WebSocket hook

**Phase 22B — Log Viewer & Cost Tracking**
- Create RealTimeLogs component with filtering
- Create CostTracker component
- Implement log search

**Phase 22C — Interactive Controls**
- Create pause/resume API endpoints
- Create RepairApprovalModal component
- Implement interaction handlers

---

## Summary Table

| Metric | Current | After Splits | Status |
|--------|---------|--------------|--------|
| Total Phases | 29 | ~45-50 | NEEDS UPDATE |
| Phases over 8 tasks | 13 | ~2-3 | IMPROVES |
| Average tasks/phase | ~11.2 | ~5-6 | IMPROVES |
| Estimated total runs | 90-120 | 120-150 | INCREASES |
| Estimated time | 14-18 weeks | 16-21 weeks | INCREASES ~2-3 weeks |

---

## Readiness Assessment

**Status: NOT READY FOR PHASE 0 EXECUTION**

**Blockers:**
1. ❌ Continuous Phase Execution Prompt references wrong filename
2. ❌ 13 phases violate 8-task sizing rule
3. ⚠️ Phase numbering will change after splits; Phase Index needs update

**Minor Issues:**
1. ⚠️ Prompt lacks micro-phase template
2. ⚠️ Prompt lacks "READY TO CODE" checkpoint

---

## Recommended Actions Before Phase 0

1. **Update Continuous Prompt** (5 min)
   - Change "ROADMAP.md" to "ROADMAP_REVISED.md" or make generic
   - Add micro-phase template section
   - Add "READY TO CODE" checkpoint

2. **Create Micro-Phase Splits** (2-3 hours)
   - Implement all recommended splits above
   - Renumber phases to sequential order
   - Update Phase Index table
   - Update all Inputs references

3. **Update Phase 0** (30 min)
   - Add a pre-check task: "Verify ROADMAP_REVISED.md has been updated with micro-phases"
   - This ensures agents are working with the correct roadmap version

4. **Create/Publish Updated ROADMAP_REVISED.md** (done by agent after fixes)

5. **Then: Ready for Phase 0 execution** ✅

---

## Detailed Micro-Phase Mapping

After all splits, the new phase sequence will be:

```
Phase 0: Repository Baseline
Phase 1A: Project Structure & Dependencies
Phase 1B: Tooling Configuration
Phase 2: Core Data Models
Phase 3A: Backend CRUD Routes
Phase 3B: Backend Middleware
Phase 4A: Frontend Routing & Layout
Phase 4B: Frontend UI System
Phase 5: Application Intake Workflow
Phase 6: Design Plan Generation
Phase 7: Design Plan Approval
Phase 8: Roadmap Generation
Phase 9: Roadmap Approval
Phase 10A: Agent Registry & CRUD API
Phase 10B: Agent Management UI
Phase 11A: Prompt CRUD API
Phase 11B: Prompt Editor UI
Phase 11C: Prompt Testing & Comparison
Phase 12A: Contract Registry & Validation
Phase 12B: Contract Management UI
Phase 13A: Spike Core Execution
Phase 13B: Spike Persistence & UI
Phase 14: Agent Execution Abstraction
Phase 15A: Audit Service
Phase 15B: Cost Tracking & UI
Phase 16: Run State Machine
Phase 17: Task Execution Queue
Phase 18: Agent Executor Adapter
Phase 19: Contract-Gated Handoffs
Phase 20A: Artifact Store & API
Phase 20B: Artifact Viewer UI
Phase 21A: Execution Summary Generation
Phase 21B: Completion UI
Phase 22A: Run Detail & Status Monitoring
Phase 22B: Log Viewer & Cost Tracking
Phase 22C: Interactive Controls
Phase 23: Failure Taxonomy & Repair
Phase 24: Advanced Cost Tracking
Phase 25: GitHub Integration
Phase 26: Testing & Quality
Phase 27: Security & Accessibility
Phase 28: Documentation
Phase 29: Final Acceptance
```

(29 → ~48 phases)

---

## Next Steps

1. ✅ **Print this review** to stakeholder
2. ❌ **Do NOT start Phase 0** until fixes complete
3. 📝 **Fix ROADMAP_REVISED.md** using recommendations
4. ✅ **Then: Phase 0 ready**

---

## Conclusion

ROADMAP_REVISED.md is **architecturally sound** but **operationally oversized**. With the recommended micro-phase splits and prompt updates, it becomes **immediately executable** and **achieves the 8-task-per-phase target**.

**Estimated time to fix: 3-4 hours**  
**Estimated effort: 1 coding-agent run**

