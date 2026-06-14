# CLAUDE.md — UnifiedAIToolbox Application

This is the primary UnifiedAIToolbox application project. The roadmap is orchestrated by a separate tool located at:

```
g:\Development\20_Staging\2026-06-13_RoadmapOrchestrator
```

---

## Project Overview

**UnifiedAIToolbox** is a multi-agent orchestration platform that:
- Takes application intake requests (plain language)
- Generates design plans and component roadmaps
- Orchestrates multi-agent teams to build the application
- Manages approval gates and design reviews
- Produces a fully-functional application

## Architecture

- **backend/** — Node/TypeScript backend services
- **frontend/** — React/TypeScript frontend
- **shared/** — Shared types and utilities
- **agents/** — Multi-agent definitions and behaviors
- **contracts/** — API contracts and request/response schemas
- **lib/** — Utility libraries (run-tracker, config-loader, cost-calculator, etc.)

## Current Phase

See `ROADMAP.md` for the full roadmap. The orchestrator tracks which phases have been completed via its own state machine.

## Development

This is an orchestrated project. Don't expect a single monolithic codebase — code is generated and integrated phase-by-phase via the separate orchestrator tool.

### Building
```bash
cd backend && npm install && npm run build
cd ../frontend && npm install && npm run build
```

### Testing
```bash
npm test
```

## Reference Files

- **ROADMAP.md** — Application roadmap and phase definitions
- **BUILD_SPECIFICATION.md** — Detailed application requirements and architecture
- **LessonsLearnedKnowledge/** — Insights from development process
- **Prompts/** — Historical prompts used during development

## Orchestrator

The orchestrator is a **separate project** that builds this application. See:
```
g:\Development\20_Staging\2026-06-13_RoadmapOrchestrator/README.md
```

The orchestrator is invoked with:
```powershell
cd 2026-06-13_RoadmapOrchestrator
.\orchestrator\Invoke-RoadmapOrchestrator.ps1 `
  -RepoRoot "g:\Development\20_Staging\AI Projects\2026-06-13_Orchestration"
```

This separation prevents:
- Tool artifacts contaminating application code
- Confusion between orchestrator state and application state
- Mixing build-time concerns with runtime application concerns

---

## Quick Reference

- **Application code** → in this project (backend/, frontend/, shared/)
- **Orchestration tool** → separate project at `2026-06-13_RoadmapOrchestrator`
- **Progress tracking** → orchestrator's `.orchestration/state.json`
- **Roadmap** → `ROADMAP.md` and `orchestrator/roadmap.json` (in orchestrator project)
