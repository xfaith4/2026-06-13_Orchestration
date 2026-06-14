# Orchestrator Monitoring Guide

This guide explains how to use the elegant monitoring dashboard to watch your orchestrator run.

## Quick Start

### Two-Terminal Setup (Recommended)

**Terminal 1: Run the orchestrator**
```powershell
cd "g:\Development\20_Staging\AI Projects\2026-06-13_Orchestration"
.\Invoke-Orchestrator.ps1
```

**Terminal 2: Monitor progress (same repo directory)**
```powershell
cd "g:\Development\20_Staging\AI Projects\2026-06-13_Orchestration"
.\Watch-Orchestrator.ps1
```

The dashboard will update every second showing real-time progress.

## Dashboard Overview

```
╔══════════════════════════════════════════════════════════════════════════════╗
║ 🚀 ROADMAP ORCHESTRATOR — PROGRESS MONITOR                                  ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Status: Executing 1.2 | Progress: 7/15 (47%) | Budget: $5.23               ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Progress: ████████████████████████░░░░░░░░░░░░░░░░░░░░░░                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ ROADMAP                                                                      ║
║ v0.x  0.0✓ 0.1✓ 0.2✓ 0.3✓ 0.4✓                                             ║
║ v1.x  1.0✓ 1.1✓ 1.2◆ 1.3  1.4                                              ║
║ v2.x  2.0  2.1  2.2  2.3  2.4                                               ║
║ Current: 1.2 – Design Plan Approval Gate                                     ║
║ ⚠ Carryover: Fix design validation schema before proceeding                ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ LOG (last 20 lines)                                                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ 2026-06-14T15:35:10.1234567Z [INFO] Selected phase 1.2: Design Plan Approva...║
║ 2026-06-14T15:35:11.2345678Z [INFO] Invoking Claude for phase 1.2...        ║
║ 2026-06-14T15:40:45.3456789Z [INFO] Self-reported status for 1.2: needs-ame...║
║ 2026-06-14T15:40:46.4567890Z [GATE] Independent gate rejected phase 1.2...   ║
╚══════════════════════════════════════════════════════════════════════════════╝
Last updated: 15:40:50 | Refresh: 1s | Ctrl+C to exit
```

## Dashboard Sections

### **Status Line**
```
Status: Executing 1.2 | Progress: 7/15 (47%) | Budget: $5.23
```
- **Status:** What's currently happening (`Executing X`, `Idle`, `Waiting`)
- **Progress:** `completed/total (percentage)` phases done
- **Budget:** Cumulative cost spent so far

### **Progress Bar**
```
Progress: ████████████████████████░░░░░░░░░░░░░░░░░░░░░░
```
Visual representation of roadmap completion. Each character ≈ 2% progress.

### **Roadmap Phases**
```
v0.x  0.0✓ 0.1✓ 0.2✓ 0.3✓ 0.4✓
v1.x  1.0✓ 1.1✓ 1.2◆ 1.3  1.4
v2.x  2.0  2.1  2.2  2.3  2.4
```

**Phase Status Indicators:**
- `✓` (green) — Completed and passed gate
- `◆` (cyan) — Currently executing
- `✗` (red) — Failed, needs amendment
- (gray/blank) — Pending, waiting for dependencies

Phases are grouped by version (v0.x, v1.x, v2.x) for easy scanning.

### **Current Phase Details**
```
Current: 1.2 – Design Plan Approval Gate
```
Shows which phase is running and its full title (useful to cross-reference with ROADMAP.md).

### **Carryover Amendments**
```
⚠ Carryover: Fix design validation schema before proceeding
```
If the previous phase flagged amendments that the next phase must address, they appear here. This is the carry-forward communication channel between phases.

### **Live Log**
```
2026-06-14T15:35:10.1234567Z [INFO] Selected phase 1.2: Design Plan Approval...
2026-06-14T15:35:11.2345678Z [INFO] Invoking Claude for phase 1.2...
2026-06-14T15:40:45.3456789Z [INFO] Self-reported status for 1.2: needs-amend...
```

**Color-coded by severity:**
- `[INFO]` (cyan) — Informational
- `[WARN]` (yellow) — Warnings
- `[ERROR]` (red) — Errors
- `[GATE]` (blue/green) — Gate verification results

Last 20 lines shown by default.

## Usage Options

### **Basic monitoring (default)**
```powershell
.\Watch-Orchestrator.ps1
```
Updates every 1 second, shows last 20 log lines.

### **Faster updates**
```powershell
.\Watch-Orchestrator.ps1 -RefreshInterval 0.5
```
Update twice per second (good for faster feedback).

### **Slower updates (save CPU)**
```powershell
.\Watch-Orchestrator.ps1 -RefreshInterval 5
```
Update every 5 seconds (lighter on system).

### **More log lines**
```powershell
.\Watch-Orchestrator.ps1 -LogLines 30
```
Show last 30 lines instead of 20.

### **Custom repo directory**
```powershell
.\Watch-Orchestrator.ps1 -RepoRoot "C:\path\to\repo"
```

## What Each Status Means

### **Status Line States**

| Status | Meaning | Next Action |
|--------|---------|------------|
| `Status: Idle` | No orchestrator running | Start orchestrator in another terminal |
| `Status: Executing 0.5` | Currently running Phase 0.5 | Wait for completion |
| `Status: Waiting...` | Orchestrator paused or waiting | Check logs for details |

### **Phase Status Indicators**

| Indicator | Meaning | Notes |
|-----------|---------|-------|
| `0.0✓` | Phase passed, gate accepted | Safe to move on |
| `1.2◆` | Phase currently executing | Orchestrator is working on this |
| `1.3✗` | Phase failed or rejected by gate | Check carryover for amendments |
| `2.0` | Phase not yet started | Waiting for dependencies |

## Real-World Scenarios

### **Scenario 1: Watching Phase Execution**
```
Status: Executing 0.1 | Progress: 1/15 (7%) | Budget: $1.45
Progress: █░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
Current: 0.1 – Project Foundation

[Logs show Claude running...]
```
Phase is executing. Cost is accumulating. Watch the logs and budget.

### **Scenario 2: Phase Complete, Gate Passing**
```
Status: Executing 0.2 | Progress: 2/15 (13%) | Budget: $2.34
Progress: ██░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

[Log shows: GATE PASS phase 0.1: deliverables verified]
[Log shows: Selected phase 0.2: Core Data Models...]
```
Phase 0.1 passed gate. Orchestrator automatically moved to 0.2. Everything working as expected.

### **Scenario 3: Phase Failed, Amendments Flagged**
```
Status: Idle | Progress: 5/15 (33%) | Budget: $8.90
Progress: █████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

Current: 1.1 – Design Plan Generation Service
⚠ Carryover: Schema validation failed. Add required 'acceptance_criteria' field
⚠ Carryover: Missing test coverage for error cases

[Log shows: GATE FAIL phase 1.1: blockers prevented acceptance]
[Log shows: Orchestrator stop. Completed: 0.0, 0.1, 0.2, 0.3, 0.4, 1.0]
```
Phase 1.1 failed gate. Amendments show what needs fixing. Orchestrator halted. Human must review carryover and fix issues before next run.

### **Scenario 4: Budget Exceeded**
```
Status: Idle | Progress: 8/15 (53%) | Budget: $25.34
Progress: ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

[Log shows: Budget cap hit ($25.34 >= $25.00). Halting.]
```
Orchestrator hit the max budget. Can restart with higher limit:
```powershell
.\Invoke-Orchestrator.ps1 -MaxTotalCostUsd 50.0
```

## Troubleshooting

### **Dashboard shows "waiting for logs..."**
- Orchestrator hasn't started yet
- Or orchestrator is in dry-run mode

Solution: Start the orchestrator in another terminal:
```powershell
.\Invoke-Orchestrator.ps1
```

### **Dashboard freezes or updates are slow**
- File I/O is slow (check system load)
- Network/antivirus scanning the files

Solution: Increase refresh interval:
```powershell
.\Watch-Orchestrator.ps1 -RefreshInterval 3
```

### **"Permission denied" reading state.json**
- Orchestrator is writing to the file while we read

Solution: This is normal and temporary. Dashboard will retry. If it persists:
```powershell
# Close monitor
# Wait a moment
# Restart monitor
```

### **Want to stop monitoring but keep orchestrator running**
Press `Ctrl+C` in the monitor terminal. The orchestrator keeps running in its terminal.

## Integration with Other Monitoring

You can run multiple monitors simultaneously:

**Terminal 1:** Orchestrator
```powershell
.\Invoke-Orchestrator.ps1
```

**Terminal 2:** Watch-Orchestrator dashboard
```powershell
.\Watch-Orchestrator.ps1
```

**Terminal 3:** Manual state inspection (optional)
```powershell
# Check state whenever you want
Get-Content .orchestration\state.json | ConvertFrom-Json | Format-List
```

## Next Steps

1. **Start orchestrator:** `.\Invoke-Orchestrator.ps1`
2. **Open monitor:** `.\Watch-Orchestrator.ps1` (in another terminal)
3. **Watch progress:** Dashboard updates every second
4. **Review amendments:** If a phase fails, check the carryover in the monitor
5. **Check logs:** Scroll monitor's log section for detailed messages

The dashboard makes it easy to see at a glance whether your roadmap is progressing smoothly.
