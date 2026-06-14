# Roadmap Orchestrator Setup

This document describes the orchestrator system, its configuration, and how to run it.

## Overview

The orchestrator is a deterministic PowerShell watcher that:
1. Selects the next eligible phase from `roadmap.json`
2. Invokes Claude Code headless to execute that phase
3. Validates the phase completion with an independent Critic gate
4. Records progress in `.orchestration/state.json`
5. Carries forward any amendments to the next phase

The separation is intentional:
- **PowerShell decides** which phase runs next, when to advance, and whether the self-report is trustworthy
- **Claude Code executes** the phase and assesses its own completion honestly

## Directory Structure

```
repo/
├── orchestrator/
│   └── Invoke-RoadmapOrchestrator.ps1    ← Core orchestrator logic
├── .orchestration/
│   ├── state.json                        ← Roadmap progress (created on first run)
│   ├── STATE_SCHEMA.md                   ← State file format definition
│   ├── orchestrator.log                  ← Watcher log
│   └── capsules/                         ← Historian memory capsules per phase
├── Invoke-Orchestrator.ps1               ← Convenience wrapper script (at repo root)
└── roadmap.json                          ← Phase definitions (at repo root)
```

## Files Created in This Setup

### 1. **roadmap.json** (repo root)

A **curated execution plan** that specifies the phases to be executed. Each phase specifies:
- `id`: Unique phase identifier (e.g., "0.0", "1.2")
- `title`: Human-readable phase name
- `depends_on`: Array of phase IDs that must complete first
- `job_type`: "build_new_app" or "maintain_existing_app" (determines pipeline)
- `roadmap_md_reference`: Pointer to detailed specification in ROADMAP.md
- `objective`: What the phase is trying to achieve
- `acceptance`: Array of acceptance criteria (runtime-verifiable)

**Relationship to ROADMAP.md:**
- `roadmap.json` is a **structured, machine-readable subset** of the full roadmap
- Each phase includes a `roadmap_md_reference` field pointing to the detailed specification in ROADMAP.md (e.g., "ROADMAP.md line 476 (Phase 0)")
- When executing a phase, refer to ROADMAP.md for full context, detailed acceptance criteria, dependencies, and estimated effort
- `roadmap.json` is curated: it starts with phases 0.0-2.4 (the MVP slice) and can be extended as needed

**Current execution plan covers phases 0.0 through 2.4** (ROADMAP.md Phases 0-14), including:
- Repository baseline and project foundation (Phase 0.0-0.4)
- Core data models and API foundation (Phase 0.0-0.3)
- Frontend shell and UI system (Phase 0.4)
- Application intake and design workflows (Phase 1.0-1.2)
- Roadmap generation and approval (Phase 1.3-1.4)
- Agent registry and execution abstractions (Phase 2.0-2.4)

**Extending the roadmap:** When ready to move beyond Phase 2.4, add phases 2.5+ to roadmap.json by copying the structure from ROADMAP.md Phases 15+ and including `roadmap_md_reference` fields.

### 2. **.orchestration/STATE_SCHEMA.md**
Defines the contract for `state.json`:
- Field semantics and mutability rules
- History entry structure
- Invariants that must hold across runs
- Example progressions

### 3. **orchestrator/Invoke-RoadmapOrchestrator.ps1**
Core orchestrator logic. Parameters:
- `$RepoRoot` — root of the repository (auto-detected from script location)
- `$RoadmapPath` — path to roadmap.json (relative to repo root)
- `$StateDir` — path to .orchestration/ directory (relative to repo root)
- `$MaxPhases` — max phases to execute before halting (safety limit, default 50)
- `$MaxCriticLoops` — max Critic iterations per phase (matches agent-library, default 3)
- `$MaxTurns` — max Claude turns per run (budget cap per execution, default 7)
- `$MaxTotalCostUsd` — hard budget limit across all runs (default $25.00)
- `$AllowedTools` — which tools Claude can use (default: Read,Grep,Glob,Edit,Write)
- `$AgentRefPath` — path to agent-library reference (defaults to user-specific skill mount)
- `-Reset` — wipe state.json before running (fresh start)
- `-DryRun` — plan only; do not invoke Claude

### 4. **Invoke-Orchestrator.ps1** (repo root)
Convenience wrapper that invokes the orchestrator with proper paths.

## How to Run

### From the Repo Root
```powershell
# First run (creates state.json)
.\Invoke-Orchestrator.ps1

# Dry run (plan phases, don't invoke Claude)
.\Invoke-Orchestrator.ps1 -DryRun

# Fresh start (wipe prior state and restart)
.\Invoke-Orchestrator.ps1 -Reset

# Custom budget
.\Invoke-Orchestrator.ps1 -MaxTotalCostUsd 10.0

# Tighter tool scope
.\Invoke-Orchestrator.ps1 -AllowedTools 'Read,Grep,Glob'
```

### From the orchestrator/ Directory
```powershell
.\Invoke-RoadmapOrchestrator.ps1 -RepoRoot '..'
```

## How It Works

### Phase Selection (Deterministic, in PowerShell)
1. Load current state from `.orchestration/state.json`
2. Scan `roadmap.json` for the first phase whose dependencies are all completed
3. If found, execute that phase; if not, roadmap is done

### Phase Execution (in Claude Code)
1. Inject the phase definition into the prompt
2. Inject outstanding amendments (carryover from previous phase)
3. Specify the pipeline (agents to dispatch in order)
4. Run `claude -p <prompt> --output-format json --max-turns 7 --allowedTools <restricted-set>`
5. Parse the result
6. Overwrite `.orchestration/state.json` with progress + `carryover` amendments
7. Write memory capsule to `.orchestration/capsules/<phase-id>.txt`

### Verification (Independent Gate in Claude Code)
1. After the run reports completion, spawn an independent `Test-PhaseGate` call
2. Critic scans the repo to verify deliverables actually exist
3. If verified → accept the phase and advance
4. If rejected → mark phase as needing amendment and halt

### Progress Tracking
All progress is recorded in `.orchestration/state.json`:
- `completed[]` — phases that passed the gate (monotonically increasing)
- `current` — the phase just executed (whether it passed or failed)
- `carryover[]` — amendments the next phase must address
- `history[]` — one entry per execution attempt
- `total_cost_usd` — cumulative spend (updated by orchestrator only)

## Configuration

### Agent Reference Path
The script uses a user-specific path to the agent-library reference:
```powershell
[string]$AgentRefPath = 'C:\\Users\\benfu\\.claude\\skills\\agent-library\\agent-library\\references\\agents-full.md'
```

This must be adjusted if the agent-library skill is not installed at that location, or if you're on a different machine.

### Allowed Tools
By default, the orchestrator restricts Claude to:
```
Read, Grep, Glob, Edit, Write
```

This is a safety boundary: no Bash, no external API calls, no git operations. If a phase legitimately needs additional tools, override via `-AllowedTools`.

### Budget Controls
- **Per-run:** `$MaxTurns` (default 7) limits Claude turns in a single execution
- **Per-roadmap:** `$MaxTotalCostUsd` (default $25.00) is a hard stop if cumulative cost exceeds this
- **Safety:** `$MaxPhases` (default 50) prevents infinite loops if phase selection breaks

## State Contract

The orchestrator and Claude Code runs share a strict contract defined in `.orchestration/STATE_SCHEMA.md`:

**What Claude Code writes:**
- `completed[]` ← append phase id **only if status is "complete"**
- `current` ← set to the phase id just executed
- `carryover[]` ← **replace with** amendments for the next phase
- `history[]` ← append one entry per execution
- Historian memory capsule to `.orchestration/capsules/<phase-id>.txt`

**What the orchestrator writes:**
- `total_cost_usd` ← accumulate cost after each run (Claude must not modify)
- Passes or rejects the phase via `Test-PhaseGate`

**What both preserve:**
- `schema_version` and `run_id` (must remain unchanged)

## Honesty Rule

An honest self-report is essential:
- Reporting `complete` when work is incomplete wastes a gate cycle and gets rejected anyway
- The independent Critic gate will re-verify; false reports are caught and surface
- Report the true status: `complete`, `needs-amendment`, or `blocked`

## Troubleshooting

### state.json Corruption
If state.json becomes malformed, reset and restart:
```powershell
Remove-Item .orchestration\state.json
.\Invoke-Orchestrator.ps1
```

Or use the `-Reset` flag:
```powershell
.\Invoke-Orchestrator.ps1 -Reset
```

### Claude Execution Fails
Check the log:
```powershell
Get-Content .orchestration\orchestrator.log -Tail 50
```

Common issues:
- Agent reference path not found → update `$AgentRefPath`
- Tools not allowed → override `-AllowedTools`
- Phase prompt too large → increase `$MaxTurns`

### Phase Not Advancing
1. Check `state.json` to see which phase is `current`
2. Review the `history` entry for that phase
3. Check `carryover` for amendments that need addressing
4. Examine capsule at `.orchestration\capsules\<phase-id>.txt`

### Cost Overrun
If actual cost exceeds `$MaxTotalCostUsd`:
```powershell
.\Invoke-Orchestrator.ps1 -MaxTotalCostUsd 50.0  # Increase budget
```

Or set a tighter budget per-phase by adjusting roadmap acceptance criteria.

## Next Steps

1. **Verify setup:** Run `.\Invoke-Orchestrator.ps1 -DryRun` to test phase selection
2. **Start the roadmap:** Run `.\Invoke-Orchestrator.ps1` to execute Phase 0.0
3. **Monitor progress:** Watch `.orchestration/state.json` and `orchestrator.log` after each run
4. **Address amendments:** Review `carryover` and `capsules/` after each phase

## References

- **CLAUDE.md** — Project contract for orchestrated runs
- **.orchestration/STATE_SCHEMA.md** — State file format definition
- **roadmap.json** — Phase definitions
- **Agent Library** — Full agent system prompts and I/O contracts
