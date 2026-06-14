# Project Separation: Application & Orchestrator

## Overview

As of 2026-06-14, this project has been **separated into two independent repositories**:

1. **UnifiedAIToolbox Application** (this directory)
   - Location: `g:\Development\20_Staging\AI Projects\2026-06-13_Orchestration`
   - Contains: Application code (backend, frontend, shared), agents, contracts, specs
   - Purpose: The actual application being built

2. **Roadmap Orchestrator** (separate project)
   - Location: `g:\Development\20_Staging\2026-06-13_RoadmapOrchestrator`
   - Contains: Orchestration tool, phase definitions, state management
   - Purpose: The framework that builds the application

## Why Separate?

### The Problem
Using an orchestrator to build an orchestrator creates dangerous ambiguity:
- Tool logs get confused with application logs
- Tool state gets confused with application state
- Tool configuration contaminates application code
- Same concepts (phases, agents, state) refer to different things at different levels

### The Solution
Complete separation prevents all of this:
- **Clear boundaries** — tool concerns are isolated from application concerns
- **Reusable framework** — the orchestrator can be used to build ANY application
- **Clean git history** — no mixing of build-time and runtime artifacts
- **Independent debugging** — gate issues don't block application development

## What Moved

### To Orchestrator Project
- `orchestrator/Invoke-RoadmapOrchestrator.ps1`
- `orchestrator/roadmap.json`
- `.orchestration/STATE_SCHEMA.md`
- Orchestration documentation (ORCHESTRATOR_SETUP.md, MONITORING_GUIDE.md, etc.)

### Remains in Application Project
- `backend/`, `frontend/`, `shared/` (application code)
- `agents/` (application agent definitions)
- `contracts/` (application API contracts)
- `lib/` (application utilities)
- `ROADMAP.md` (application roadmap)
- `BUILD_SPECIFICATION.md` (application spec)
- Reference files (LessonsLearnedKnowledge/, Prompts/)

## How to Use

### Running the Orchestrator

```powershell
cd g:\Development\20_Staging\2026-06-13_RoadmapOrchestrator

# Point it at this application project
.\orchestrator\Invoke-RoadmapOrchestrator.ps1 `
  -RepoRoot "g:\Development\20_Staging\AI Projects\2026-06-13_Orchestration" `
  -Effort high
```

### Application Development

Work as normal in this directory:
```powershell
cd "g:\Development\20_Staging\AI Projects\2026-06-13_Orchestration"

# Build, test, commit application code
npm install
npm test
git add/commit
```

## Next Steps

1. **Orchestrator Debugging** — The gate JSON parsing issue can now be debugged independently in the orchestrator project without confusing it with application concerns
2. **Application Development** — This project is now clean and ready for standard application development
3. **Integration** — When orchestrator is fixed, re-run against this project to continue building

## File Reference

- **Application CLAUDE.md** — [CLAUDE.md](CLAUDE.md) (guides Claude runs in this project)
- **Orchestrator README** — See `2026-06-13_RoadmapOrchestrator/README.md`
- **This document** — [PROJECT_SEPARATION.md](PROJECT_SEPARATION.md)
