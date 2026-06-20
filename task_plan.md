# Task Plan: Roadmap audit and next incomplete orchestration slice

## Goal
Determine whether this repo's roadmap is still well designed against the live code and recent changes, identify the next truthful incomplete slice, implement that slice with focused hardening, and verify the result.

## Current Phase
Phase 5

## Phases

### Phase 1: Roadmap and repo discovery
- [x] Understand user intent
- [x] Identify constraints and requirements
- [x] Document findings in findings.md
- **Status:** complete

### Phase 2: Assess roadmap quality and recent unfinished work
- [x] Compare roadmap status against live code and commit history
- [x] Inspect recent staged/unstaged changes for incomplete work
- [x] Choose the smallest truthful next slice
- **Status:** complete

### Phase 3: Implement bounded hardening slice
- [x] Edit only the files needed for the chosen slice
- [x] Add tests or tighten existing coverage where practical
- [x] Preserve unrelated dirty worktree changes
- **Status:** complete

### Phase 4: Verification
- [x] Run targeted tests for the changed slice
- [x] Check for regressions or type errors in touched areas
- [x] Record results in progress.md
- **Status:** complete

### Phase 5: Delivery
- [x] Summarize roadmap findings and code changes
- [x] Call out residual risks or remaining unfinished phases
- [x] Deliver next-step guidance anchored to repo state
- **Status:** in_progress

## Key Questions
1. Does `ROADMAP.md` still represent the actual execution order and completion state of the repo?
2. Which recent code changes indicate the next unfinished but already-started slice?
3. What focused hardening change best reduces error risk without broadening scope?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use planning files for this turn | The task spans roadmap review, change audit, implementation, and verification. |
| Treat the worktree as user-owned and non-destructive | The repo already has substantial unrelated dirtiness, so changes must stay narrowly scoped. |
| Use Phase 31 artifact materialization as the next slice | The roadmap’s early phases are stale, while recent code and persisted run data show this seam is unfinished and already partially started. |
| Derive artifact storage from `PersistenceService` instead of a hardcoded repo path | The first integration test exposed that hardcoded artifact roots break alternate data directories and would be brittle in real runtime variants. |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `rg --files` returned no planning files | 1 | Created fresh `task_plan.md`, `findings.md`, and `progress.md` for this slice. |
| Backend test/typecheck commands initially failed with `vitest` / `tsc` not found | 1 | Installed workspace dependencies with `npm ci` at the repo root. |
| Materialization integration test failed with `ENOENT` on expected artifact path | 1 | Replaced hardcoded `data/artifacts` lookup with the active persistence data root. |

## Notes
- Re-read the roadmap and current diffs before choosing the implementation seam.
- Prefer the smallest bounded incomplete task over broad roadmap cleanup.
