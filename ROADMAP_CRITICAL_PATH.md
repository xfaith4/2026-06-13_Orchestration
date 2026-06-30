# Critical Path Roadmap: Phases 9-29

**Legend:**  
🔴 = **Critical Path** (must do, in order)  
🟡 = **Important** (do before production)  
🟢 = **Nice-to-have** (optional, can defer)  
⏸️ = **Can parallelize** (independent of others)

---

## Phase Timeline (9 of 29)

```
Completed: Phases 1-8 (Intake → Planning)
├─ Phase 1: Project Foundation ✅
├─ Phase 2: Core Data Models ✅
├─ Phase 3: Backend API Foundation ✅
├─ Phase 4: Frontend Shell ✅
├─ Phase 5: Application Intake Workflow ✅
├─ Phase 6: Design Plan Generation ✅
├─ Phase 7: Design Plan Approval Gate ✅
└─ Phase 8: Roadmap Generation ✅

Critical Path: Phases 9-18 (Execution & Operations)
├─ Phase 9: Execution Run Tracking 🔴 ← START HERE
│   └─ Enables: All execution features
│   └─ Time: ~1 session
│   └─ Must-have: Run model, Run CRUD, Run UI
│
├─ Phase 10: Audit Logging System 🔴
│   └─ Depends on: Phase 9
│   └─ Enables: Debugging, compliance
│   └─ Time: ~1 session
│   └─ Must-have: Audit service, log viewer
│
├─ Phase 11: Cost Tracking System 🔴
│   └─ Depends on: Phase 9
│   └─ Enables: Cost control
│   └─ Time: ~1 session
│   └─ Must-have: Cost calculator, cost dashboard
│
├─ Phase 12: Error Handling & Recovery 🔴
│   └─ Depends on: Phase 9
│   └─ Enables: Resilience
│   └─ Time: ~1 session
│   └─ Must-have: Error service, retry logic
│
├─ Phase 13: Agent Loader & Registry 🟡
│   └─ Depends on: None (can start now)
│   └─ Enables: Agent management
│   └─ Time: ~1 session
│   └─ Must-have: Load agents/, agent list UI
│
├─ Phase 14: Prompt Loader & Management 🟡
│   └─ Depends on: None (can start now)
│   └─ Enables: Prompt management
│   └─ Time: ~1 session
│   └─ Must-have: Load Prompts/, prompt list UI
│
├─ Phase 15: Simple Execution Engine 🔴
│   └─ Depends on: Phase 9, 12, 13, 14
│   └─ Enables: Actual task execution
│   └─ Time: ~2 sessions
│   └─ Must-have: Task runner, phase executor
│
├─ Phase 16: Contract Validation System 🟡
│   └─ Depends on: Phase 15
│   └─ Enables: Safe agent communication
│   └─ Time: ~1 session
│   └─ Must-have: Contract loader, validator
│
├─ Phase 17: Multi-Agent Orchestration 🟡
│   └─ Depends on: Phase 15, 16
│   └─ Enables: Parallel execution
│   └─ Time: ~2 sessions
│   └─ Must-have: Dependency solver, parallelizer
│
├─ Phase 18: Dashboard & Monitoring 🟡
│   └─ Depends on: Phase 9, 10, 11
│   └─ Enables: Operational visibility
│   └─ Time: ~1-2 sessions
│   └─ Must-have: Real-time dashboard, metrics

Advanced Features: Phases 19-29 (Scaling & Polish)
├─ Phase 19: Database Migration ⏸️ (optional, do if scaling)
├─ Phase 20: Test Suite & CI 🟡 (important before scaling)
├─ Phase 21: Deployment & DevOps 🟡
├─ Phase 22: Performance & Scaling 🟢
├─ Phase 23: Security & Auth 🟡
├─ Phase 24: API Documentation 🟡
├─ Phase 25: UI/UX Polish 🟢
├─ Phase 26: Advanced Monitoring 🟢
├─ Phase 27: Knowledge Integration 🟢
├─ Phase 28: Documentation & Guides 🟡
└─ Phase 29: Production Hardening 🟡
```

---

## Critical Path Detail (Phases 9-12)

These 4 phases must be done sequentially and completely. They form the foundation for execution.

### Phase 9: Execution Run Tracking 🔴

**What:** Ability to create a "run" that tracks the execution of a roadmap.

**Inputs:**

- Roadmap (approved)

**Outputs:**

- Run entity with status tracking
- Task execution states (pending → assigned → in-progress → completed/failed)

**Why Critical:**

- Without this, you can't execute anything
- It's the core data model for execution
- Everything else depends on it

**Key Features:**

- POST /api/runs (create run from roadmap)
- GET /api/runs (list all runs)
- PATCH /api/runs/:id (update run status)
- Frontend Run List page
- Frontend Run Detail page (shows phases/tasks with status)

**Estimated Time:** 1 focused session  
**Files to Create:** `backend/src/services/run-service.ts`, `backend/src/routes/runs.ts`, `frontend/src/pages/RunList.tsx`, `frontend/src/pages/RunDetail.tsx`

**Success Criteria:**

- ✓ Create run from approved roadmap
- ✓ View run list
- ✓ View run detail with all phases/tasks
- ✓ Update task status (pending → in-progress → completed)
- ✓ All builds pass

---

### Phase 10: Audit Logging System 🔴

**What:** Complete audit trail of every change in the system.

**Inputs:**

- All create/update/delete operations (from Phases 1-9)

**Outputs:**

- Audit log for every change
- Search/filter capability
- User attribution for all changes

**Why Critical:**

- Without audit logs, you can't debug failures
- With complex execution, failures will happen
- Audit logs are the only way to understand what happened
- Required for compliance (who changed what when)

**Key Features:**

- POST /api/audit-logs (log every change)
- GET /api/audit-logs (view audit trail)
- Query by date, user, resource type, action
- Frontend Audit Log viewer

**Estimated Time:** 1 focused session  
**Files to Create:** `backend/src/services/audit-logger.ts`, `backend/src/middleware/audit-middleware.ts`, `frontend/src/pages/AuditLog.tsx`

**Success Criteria:**

- ✓ Every create/update/delete is logged
- ✓ Audit log includes: timestamp, user, action, resource, old/new values
- ✓ Can search audit logs by date, user, resource
- ✓ All builds pass

---

### Phase 11: Cost Tracking System 🔴

**What:** Track the cost of operations (LLM API calls, agent execution).

**Inputs:**

- Execution runs and their tasks
- Agent API calls

**Outputs:**

- Cost breakdown by run/phase/task
- Total cost summary
- Cost dashboard

**Why Critical:**

- Multi-agent orchestration is expensive
- Without cost tracking from the start, you'll accumulate hidden costs
- Must know which agents/tasks are expensive
- Essential for cost control and optimization

**Key Features:**

- Cost calculation service
- Track costs per run, per phase, per task
- Dashboard widget showing total costs
- Cost trends over time

**Estimated Time:** 1 focused session  
**Files to Create:** `backend/src/services/cost-calculator.ts`, update `frontend/src/pages/Dashboard.tsx`

**Success Criteria:**

- ✓ Cost tracked for every run
- ✓ Cost breakdown visible in Run detail
- ✓ Cost summary on Dashboard
- ✓ Total cost calculated correctly
- ✓ All builds pass

---

### Phase 12: Error Handling & Recovery 🔴

**What:** Don't let single errors crash the system. Handle, log, and recover.

**Inputs:**

- All services and endpoints
- Execution engine (from Phase 15)

**Outputs:**

- Error service (classify, log, retry)
- Recovery mechanism (exponential backoff, circuit breaker)
- Clear error messages for users

**Why Critical:**

- Without error handling, any unexpected condition crashes the system
- In multi-agent execution, unexpected conditions are common
- Error cascades are the #1 cause of system failure
- Must recover automatically where possible, fail gracefully otherwise

**Key Features:**

- Error classification (transient vs. permanent)
- Retry logic with exponential backoff
- Circuit breakers for external APIs
- Error reporting in Run detail
- Clear error messages

**Estimated Time:** 1 focused session  
**Files to Create:** `backend/src/services/error-handler.ts`, `backend/src/services/recovery-service.ts`, update `frontend/src/pages/RunDetail.tsx`

**Success Criteria:**

- ✓ Transient errors auto-retry (up to 3 times, exponential backoff)
- ✓ Permanent errors are captured and reported
- ✓ Circuit breaker prevents thundering herd
- ✓ Error messages are clear and actionable
- ✓ All builds pass

---

## Why Stop at Phase 12?

**After Phases 9-12, you have:**

✅ Ability to track execution (Phase 9)  
✅ Complete visibility into what happened (Phase 10)  
✅ Cost control (Phase 11)  
✅ Resilience to failures (Phase 12)

**This is a stable, production-grade foundation.**

At this point, you can optionally proceed to:

- **Phase 13-14:** Load agents and prompts (prerequisites for execution)
- **Phase 15:** Build execution engine (the actual work happens here)

---

## Decision Tree

```
Proceed with Phase 9?
│
├─ YES: Continue with critical path (Phase 9 → 10 → 11 → 12)
│       Then decide: Stop after Phase 12, or continue to Phase 15?
│
└─ NO: Choose alternative:
    ├─ "I want to skip execution and focus on UI first"
    │  → Go to Phase 20 (Testing & CI) instead
    │     Then Phase 25 (UI Polish)
    │     Then return to Phase 9-12 before Phase 15
    │
    ├─ "I want to parallelize work"
    │  → Phase 13-14 can start now (independent)
    │     Phase 9-12 must follow in order
    │
    └─ "I want to reconsider the architecture"
       → Let's discuss (what concerns you?)
```

---

## Time Estimates

| Phase | Time | Notes |
|-------|------|-------|
| 9 | 1 session | Create run model and UI |
| 10 | 1 session | Audit logging throughout |
| 11 | 1 session | Cost calculation and dashboard |
| 12 | 1 session | Error handling and recovery |
| 13 | 1 session | Agent loader (preserve legacy assets) |
| 14 | 1 session | Prompt loader (preserve legacy assets) |
| 15 | 2 sessions | Execution engine (core complexity) |
| 16 | 1 session | Contract validation (safety layer) |
| 17 | 2 sessions | Multi-agent orchestration (scheduling) |
| 18 | 1-2 sessions | Dashboard and real-time updates |
| **9-18 Total** | **~12-13 sessions** | **~3-4 weeks** |

---

## Parallel Work Opportunities

While Phase 9-12 are sequential, Phases 13-14 can start immediately:

- **Assign:** Someone starts Phase 13 (Agent Loader)  
- **While:** Someone else does Phase 9 (Execution Run Tracking)
- **Then:** Merge Phase 13 results into Phase 15

This could save 1-2 sessions.

---

## The North Star

Every decision from here should ask: **"Does this help us reach a production-grade execution engine with full observability?"**

- ✅ Audit logging → Observability
- ✅ Error handling → Production-grade
- ✅ Cost tracking → Operational awareness
- ❌ UI polish → Nice, but not essential right now
- ❌ Database migration → Can defer if file persistence is working
- ❌ Advanced monitoring → Can add after Phase 18

---

## Next Steps

1. **Review this evaluation** ← You are here
2. **Decide:** Proceed with Phase 9, or discuss first?
3. **If yes:** I'll implement Phase 9 (Execution Run Tracking)
4. **If no:** Let's discuss your concerns

**Ready for Phase 9?**
