# Roadmap Archive

This directory contains previous versions of the orchestration platform roadmap, archived prior to Phase 0 implementation.

## Current Active Roadmap

**File:** `../../../ROADMAP.md` (at project root)  
**Version:** 2.0 (Revised for Coding-Agent Execution)  
**Status:** Implementation-ready  
**Last Updated:** 2026-06-14

The active roadmap contains:
- ✅ 29 phases (0-29)
- ✅ Existing Asset Migration Policy
- ✅ Asset Classification Table requirement (Phase 0)
- ✅ Fixed Continuous Phase Execution Prompt
- ✅ Micro-phase template for agents
- ✅ All latest fixes and improvements

## Archived Versions

### ROADMAP.v1.0_original.md
**Status:** Archived (superseded)  
**Date Created:** 2026-06-14  
**Why Archived:** Original roadmap version before revisions for coding-agent execution  
**Differences:** 
- 21 phases instead of 29
- No Existing Asset Migration Policy
- No Asset Classification Table requirement
- Contained oversized phases (>8 tasks)
- Original Continuous Phase Execution Prompt referenced wrong files

**Use Case:** Historical reference only. Do not use for implementation.

---

### Roadmap_execution_prompt.v1.0_original.md
**Status:** Archived (superseded)  
**Date Created:** 2026-06-14  
**Why Archived:** Original execution prompt before fixes  
**Differences:**
- Referenced "ROADMAP.md" instead of "ROADMAP_REVISED.md"
- No micro-phase template
- No "READY TO CODE" checkpoint

**Use Case:** Historical reference only. The updated prompt is in the active ROADMAP.md.

---

### ROADMAP_REVIEW.v2.0_pre-implementation_validation.md
**Status:** Archived (reference)  
**Date Created:** 2026-06-14  
**Purpose:** Internal consistency review of ROADMAP_REVISED.md  
**Contents:**
- Identified 13 phases with >8 tasks needing splits
- Validated phase dependencies
- Checked commit guidance consistency
- Proposed micro-phase splits with detailed mappings

**Use Case:** Reference for understanding what was fixed. Phase 0 agent will use this to guide micro-phase splits.

---

### ROADMAP_FIXES_APPLIED.v2.0_pre-implementation.md
**Status:** Archived (reference)  
**Date Created:** 2026-06-14  
**Purpose:** Validation summary of fixes applied before Phase 0  
**Contents:**
- List of critical fixes applied ✅
- List of deferred fixes for Phase 0 agent ⏳
- Validation checklist
- Phase 0 agent task summary

**Use Case:** Reference for understanding implementation readiness and what Phase 0 must handle.

---

## Roadmap Timeline

| Version | Date | Status | Purpose |
|---------|------|--------|---------|
| 1.0 | 2026-06-14 | Archived | Original 21-phase roadmap |
| 2.0 | 2026-06-14 | Active | Revised for coding-agent execution (29 phases) |
| 2.1 (implied) | When Phase 0 completes | TBD | After micro-phase splits (45-50 phases) |

---

## Phase 0 Agent Task

When Phase 0 begins execution:

1. **Read active ROADMAP.md** (at project root, not in archive)
2. **Follow Continuous Phase Execution Prompt** (in active ROADMAP.md)
3. **Reference ROADMAP_REVIEW.v2.0** (in this archive) for micro-phase split guidance
4. **Create micro-phase splits** for all phases with >8 tasks
5. **Update Phase Index** with new micro-phases
6. **Create ASSET_MIGRATION_STATUS.md** (new file, not in archive)

---

## Do Not Delete

These archived files are kept as:
- ✅ Historical reference
- ✅ Evidence of decision process
- ✅ Guidance for Phase 0 agent

**Do not delete until after Phase 0 completion and validation.**

---

## Archive Organization

```
archive/
├── roadmaps/
│   ├── README.md (this file)
│   ├── ROADMAP.v1.0_original.md
│   ├── Roadmap_execution_prompt.v1.0_original.md
│   ├── ROADMAP_REVIEW.v2.0_pre-implementation_validation.md
│   └── ROADMAP_FIXES_APPLIED.v2.0_pre-implementation.md
└── [other archives...]
```

---

## Questions?

- **"Which roadmap should I use?"** → Use ROADMAP.md in the project root
- **"Why was the old version archived?"** → See ROADMAP_REVIEW.v2.0 for details on what was fixed
- **"What do I need to know before Phase 0?"** → Read ROADMAP_FIXES_APPLIED.v2.0 for readiness summary
- **"What should Phase 0 do with micro-phases?"** → See ROADMAP_REVIEW.v2.0 for split recommendations

