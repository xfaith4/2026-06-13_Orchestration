# Findings & Decisions

## Requirements
- Audit `ROADMAP.md` to decide whether the next logical steps are well designed.
- If the roadmap is not well aligned, inspect recent changes to assess unfinished work.
- Proceed with the next logical incomplete task.
- Harden code along the way to avoid avoidable runtime or validation errors.
- Preserve unrelated dirty worktree changes.

## Research Findings
- `ROADMAP.md` claims Phases 23 and 24 are complete and introduces Phases 30 and 31, but many earlier phases (1-15) still read as `Not Started`, which is structurally inconsistent with the implemented repo state.
- Repo memory for this exact checkout says a real browser run already worked through create -> design plan -> roadmap -> run, while the known gaps were failed-run diagnostics and hardcoded roadmap phase-count wording.
- The current worktree is heavily dirty across roadmap docs, backend, frontend, agents, contracts, and generated `data/` files, so the next slice must be chosen surgically.
- Recent committed history on `main` includes Phase 23, Phase 24, UX fixes, audit-log additions, and a latest commit adding multiple test roadmaps and runs with varied statuses.
- The strongest truthful incomplete seam is Phase 31, not Phase 25: current code already saves raw task-output blobs, persisted run data shows real file-like output patterns, and the repo even contains a manually materialized artifact tree for run `90f372fb-*`.
- Real task outputs use at least three extractable shapes: keyed `detailed_deliverables` containers, `code_artifacts` arrays, and direct `filename`/`file_path` + `content` objects.
- The first implementation pass exposed a concrete runtime hardening bug: artifact output paths were hardcoded to the repo’s default `data/artifacts` tree instead of following the active persistence root.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Judge the roadmap against live code instead of trusting phase labels | The roadmap already shows ordering drift and stale completion metadata. |
| Use commit history plus current diffs to find the next slice | The user explicitly asked to investigate recent changes if roadmap design is weak. |
| Implement Phase 31 as a bounded backend slice | It is already partially underway, directly tied to observed run output, and improves real usability without broadening into GitHub/auth/CI work. |
| Add a dedicated `OutputParser` service instead of embedding ad-hoc parsing in the route | The same extraction logic is needed for auto-execution and retroactive materialization, and it benefits from direct unit coverage. |
| Keep full backend typecheck failure as a repo-level blocker, not a regression from this slice | `npm run typecheck` still fails across many untouched files because the backend workspace cannot resolve `@unifiedaitoolbox/shared` and contains older type errors unrelated to this patch. |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| No existing planning files in repo root | Created fresh planning files and continued. |
| Backend workspace had no installed local toolchain | Ran `npm ci` at the repo root before validation. |
| Materialization used a hardcoded artifact root | Routed artifact storage through `PersistenceService.getDataDir()`. |

## Resources
- `ROADMAP.md`
- `README.md`
- `backend/src/routes/*`
- `backend/src/services/*`
- `frontend/src/pages/*`
- `git log --oneline --decorate -n 12`
- `git diff --stat`
- `backend/src/routes/runs.ts`
- `backend/src/services/output-parser.ts`
- `backend/tests/integration/run-materialize.test.ts`

## Visual/Browser Findings
- No browser inspection yet in this turn.
