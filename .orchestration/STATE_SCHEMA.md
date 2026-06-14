# State Schema (v1)

The `.orchestration/state.json` file is the single source of truth for roadmap progress. 
It is written by Claude Code headless runs and read by the orchestrator watcher.

## Schema

```json
{
  "schema_version": 1,
  "run_id": "uuid string, set once at creation",
  "completed": [
    "phase-id-1",
    "phase-id-2"
  ],
  "current": "current-phase-id-being-executed",
  "carryover": [
    "Amendment 1 that the next phase must address",
    "Amendment 2 — fixes, gaps, or clarification requests"
  ],
  "total_cost_usd": 0.0,
  "history": [
    {
      "phase": "0.4",
      "status": "complete|needs-amendment|blocked",
      "critic_verdict": "pass|fail",
      "notes": "Human-readable summary of what happened"
    }
  ]
}
```

## Field Semantics

| Field | Type | Mutability | Notes |
|-------|------|-----------|-------|
| `schema_version` | number | read-only (Claude) | Preserved verbatim across runs. Current version: 1. |
| `run_id` | string | read-only (Claude) | UUID set on first run creation. Preserved verbatim. |
| `completed` | string[] | append-only (Claude) | Phase IDs that passed the independent gate. Only append. |
| `current` | string | write-once per run (Claude) | The phase ID just executed. Set by the run, not by the watcher. |
| `carryover` | string[] | replace (Claude) | REPLACE entire array with amendments for the next phase. Empty array `[]` if none. |
| `total_cost_usd` | number | write-only (Watcher) | Updated by the orchestrator after each run. Claude must not modify. |
| `history` | object[] | append-only (Claude) | One entry per phase attempt (including failed attempts that do not enter `completed`). |

## History Entry Semantics

```json
{
  "phase": "string (phase id)",
  "status": "complete|needs-amendment|blocked",
  "critic_verdict": "pass|fail",
  "notes": "Human-readable summary"
}
```

- **`status = complete`**: Phase fully passed (Critic verdict = pass, deliverables verified, independent gate accepted).  
  Append this phase ID to `completed`. Watcher will advance.
- **`status = needs-amendment`**: Phase failed initial Critic loop (after 3 iterations), but unresolved issues are not  
  structural. Watcher halts and surfaces carryover for human review; next run will retry with amendments.
- **`status = blocked`**: Phase encountered a structural failure (clarification request, infrastructure issue, etc.).  
  Watcher halts; human must intervene before roadmap can proceed.

## Invariants

1. **`completed` is monotonically increasing.** Phases never leave `completed`.
2. **`current` reflects the phase just executed** (whether it passed or failed).
3. **`carryover` is completely replaced per run.** It is the carry-forward communication channel for amendments.
4. **`history` is append-only.** Each attempt (pass or fail) gets one entry.
5. **`total_cost_usd` is never written by Claude.** It is updated by the orchestrator after the run succeeds or fails.
6. **`schema_version` and `run_id` are preserved verbatim by Claude** across all runs.

## Example Progression

Initial state (first run):
```json
{
  "schema_version": 1,
  "run_id": "550e8400-e29b-41d4-a716-446655440000",
  "completed": [],
  "current": null,
  "carryover": [],
  "total_cost_usd": 0.0,
  "history": []
}
```

After Phase 0.4 passes:
```json
{
  "schema_version": 1,
  "run_id": "550e8400-e29b-41d4-a716-446655440000",
  "completed": ["0.4"],
  "current": "0.4",
  "carryover": [],
  "total_cost_usd": 1.23,
  "history": [
    {
      "phase": "0.4",
      "status": "complete",
      "critic_verdict": "pass",
      "notes": "Bootstrap orchestration engine complete. Roadmap parsing and phase selection deterministic."
    }
  ]
}
```

After Phase 0.5 needs amendments:
```json
{
  "schema_version": 1,
  "run_id": "550e8400-e29b-41d4-a716-446655440000",
  "completed": ["0.4"],
  "current": "0.5",
  "carryover": [
    "STATE_SCHEMA.md missing: Define the state.json contract with field semantics and invariants",
    "Test-PhaseGate function needs real Critic/ReviewGate system prompt from agents-full.md"
  ],
  "total_cost_usd": 3.45,
  "history": [
    {
      "phase": "0.4",
      "status": "complete",
      "critic_verdict": "pass",
      "notes": "Bootstrap orchestration engine complete."
    },
    {
      "phase": "0.5",
      "status": "needs-amendment",
      "critic_verdict": "fail",
      "notes": "Schema and gate implementation incomplete. Critic loop capped at 3 iterations."
    }
  ]
}
```
