# CLAUDE.md — UnifiedAIToolbox Roadmap Orchestration

This file is read automatically by every headless `claude -p` run. It is the
shared contract between the PowerShell orchestrator (which decides *what* runs)
and each Claude run (which *executes* a phase and reports status). Treat
everything here as binding.

---

## Your role in an orchestrated run

You are executing **one phase** of a phase-sliced roadmap (releases 0.4–2.4).
A deterministic PowerShell watcher selects the phase, injects outstanding
amendments, and invokes you headless. You do not choose the next phase — you
execute the one you are given, then write a state artifact the watcher reads.

Division of responsibility (do not cross it):
- **Watcher decides:** which phase runs next, dependency ordering, whether to
  advance, budget/iteration caps. This logic lives in PowerShell. Do not
  attempt to drive the roadmap yourself.
- **You decide:** how to execute the assigned phase, and an honest assessment
  of whether it actually passed.

---

## The agent library

This project orchestrates a named agent library. Full system prompts and output
schemas live in `/mnt/skills/user/agent-library/references/agents-full.md`
(via the `agent-library` skill). Roster: Commissioner, ConceptualModelContract,
Critic, Engineer, Historian, PRPublisher, RepoContextBuilder, Researcher,
ReviewGate, Supervisor, Synthesizer.

**Every agent returns strict JSON only — no markdown, no prose, no code fences.**
Always append to any agent system prompt: `Return strict JSON only. No markdown, no prose.`

### Pipelines

`job_type = build_new_app`:
```
RepoContextBuilder → Researcher → ConceptualModelContract
    → Engineer → Critic → [loop to Engineer if fail, cap 3]
    → Synthesizer → Commissioner → Supervisor → Historian
```

`job_type = maintain_existing_app`:
```
RepoContextBuilder → ReviewGate → Researcher → ConceptualModelContract
    → Engineer → Critic → [loop to Engineer if fail, cap 3] → PRPublisher
    → Synthesizer → Commissioner → Supervisor → Historian
```

### Critic loop
Critic `verdict = fail` when `blockers` is non-empty OR `schema_validation.valid`
is false OR required traceability IDs are missing. On fail, loop back to Engineer
with the Critic's `issues[]`. **Cap at 3 iterations.** If still failing after 3,
do NOT report `complete` — report `needs-amendment` (or `blocked` if the failure
is structural) and put the unresolved blockers in `carryover`.

### Clarification
ConceptualModelContract, Historian, Supervisor, and Synthesizer may emit
`{ "clarification_request": "..." }`. If that happens during an orchestrated run,
treat it as a `blocked` status — set the clarification text as a carryover item
and stop. A human will resolve it; do not guess past a clarification request.

---

## The state contract (how you report back)

At the end of your run you MUST overwrite `.orchestration/state.json`. The watcher
reads this file, not your transcript — if you do not write it, the run is treated
as a silent failure and the loop halts. The full schema is in
`.orchestration/STATE_SCHEMA.md`. Summary of your obligations per run:

- Append your phase id to `completed` **only if** the phase fully passed
  (status `complete`).
- Set `current` to the phase id you just ran.
- **Replace** `carryover` with the array of amendments the *next* phase must
  address first. Empty array if none. This is how fixes propagate forward.
- Append exactly one entry to `history`:
  `{ phase, status, critic_verdict, notes }`.
- Do **not** modify `total_cost_usd` — the watcher owns that field.
- `status` MUST be one of: `complete` | `needs-amendment` | `blocked`.

Honesty rule: an independent ReviewGate/Critic pass re-verifies your work after
you report. Reporting `complete` on incomplete work wastes a gate cycle and gets
rejected anyway. Report the true status.

Also write the Historian `memory_capsule` for the phase to
`.orchestration/capsules/<phase-id>.txt` (plain text, headers
`DECISIONS / CONSTRAINTS / INTERFACES / DATA / RISKS / NEXT`).

---

## Project conventions

- **Language/runtime:** PowerShell 7+ for orchestration tooling; match existing
  module style in the repo. Honor the POF.ps1 / Prompt Orchestration Framework
  v4.1 patterns already present.
- **App-type classification:** be aware of the `Resolve-EffectiveAppType` /
  `_derive_app_type` logic; do not reintroduce the regex false-positive that
  misclassified desktop apps as web apps.
- **Tooling scope:** orchestrated runs are launched with a restricted
  `--allowedTools` set. Do not assume Bash is available unless the invocation
  granted it.
- **Determinism:** prefer deterministic, reproducible output. This repo is a
  factory for reproducible application generation, not a one-off.
- **No invented facts:** Researcher/Historian summarize only what is provided.
  If something is unknown, say so and propose a verification step.

---

## What "done" means for a phase

A phase is done when: its pipeline completed, the Critic verdict is `pass`
(within the 3-loop cap), the deliverables in the roadmap entry's `acceptance`
exist and are runtime-verifiable, and `state.json` + the capsule are written.
Anything short of that is `needs-amendment` or `blocked` — never `complete`.
