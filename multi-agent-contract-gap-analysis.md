# Multi-Agent Contract Gap Analysis

Date: 2026-05-03

## Scope

Investigate current Codex/OpenAI multi-agent capabilities and adjacent orchestration frameworks, compare them to UnifiedAIToolbox orchestration runs, and identify the missing agent-to-agent and software-development workflow contracts.

This is a local handoff note. It does not change the repo-facing roadmap.

## External tooling checked

- OpenAI Codex Skills: <https://developers.openai.com/codex/skills>
- OpenAI Codex Subagents: <https://developers.openai.com/codex/subagents>
- OpenAI Codex AGENTS.md: <https://developers.openai.com/codex/guides/agents-md>
- OpenAI Agents SDK overview: <https://developers.openai.com/api/docs/guides/agents>
- OpenAI Agents SDK handoffs: <https://openai.github.io/openai-agents-python/handoffs/>
- OpenAI Agents SDK guardrails: <https://openai.github.io/openai-agents-python/guardrails/>
- OpenAI Agents SDK tracing: <https://openai.github.io/openai-agents-python/tracing/>
- OpenAI agent evals and trace grading: <https://developers.openai.com/api/docs/guides/agent-evals>, <https://developers.openai.com/api/docs/guides/trace-grading>
- LangChain/LangGraph multi-agent patterns: <https://docs.langchain.com/oss/python/langchain/multi-agent>
- LangChain handoffs and subagents: <https://docs.langchain.com/oss/python/langchain/multi-agent/handoffs>, <https://docs.langchain.com/oss/python/langchain/multi-agent/subagents>
- LangGraph overview: <https://docs.langchain.com/oss/python/langgraph>
- Microsoft AutoGen AgentChat teams: <https://microsoft.github.io/autogen/stable/reference/python/autogen_agentchat.teams.html>
- CrewAI Flows and Crews: <https://docs.crewai.com/en/concepts/flows>, <https://docs.crewai.com/en/concepts/crews>
- DSPy optimization: <https://dspy.ai/>

## Current UnifiedAIToolbox baseline

UnifiedAIToolbox already has several strong orchestration primitives:

- Job-type contracts and policies in `job_types.json`.
  - `build_new_app` binds request schema, contract schema, pipeline, agent roster, gates, artifact policy, command policy, and supervisor policy.
  - `maintain_existing_app` adds stricter baseline/change/diff/review gates, forbidden paths, lockfile policy, PR policy, and command-policy constraints.
- Stage rosters in `pipelines/pipeline_build_app.v1.json` and `pipelines/pipeline_maintenance.v1.json`.
  - These define ordered role execution, but mostly as a linear stage list.
- Agent definitions in `Orchestration/agents/agent-library.json`.
  - Agents can declare `inputs`, `outputs`, `io_contract.input_schema`, `io_contract.output_schema`, prompt, dependencies, routing hints, and capabilities.
- Runtime output contract enforcement in `Orchestration/scripts/POF.ps1`.
  - Agent outputs with `io_contract.output_schema` are normalized, strict JSON validated, repaired once, and persisted as contract failure artifacts if repair fails.
- Blocking gates in `Orchestration/engine/GatePolicy.psm1`.
  - Built-ins include `Critic`, `Commissioner`, `RunCommand`, `ContractValidator`, and `Custom`, with `PASS` / `FAIL` / `RETRY` semantics and persisted gate artifacts.
- App-production proof in `docs/application-production-path.md` and related implementation.
  - The target loop is app materialization, install, build, test/smoke, targeted repair, re-test, package, and learning.
- GitHub/orchestration-bridge task execution notes.
  - `TASK_EXECUTOR_RUNBOOK.md` uses `taskgraph.json`, task artifacts, and `conflict_group`, but notes the current executor is sequential while enforcing group exclusivity.
  - `MERGE_COORDINATOR_RUNBOOK.md` integrates task branches into an integration branch and assumes task branches are ready.

## Comparison

OpenAI Codex Skills are closest to this repo's reusable workflows and AGENTS.md rules. Skills package instructions, references, scripts, and optional metadata. The gap is not "we need skills"; the gap is that repo-specific orchestration knowledge is still split across `AGENTS.md`, docs, JSON configs, PowerShell, and app code instead of being packaged as narrow repeatable skills such as `uaitb-run-contract-review`, `uaitb-agent-schema-authoring`, or `uaitb-app-production-gate-debug`.

OpenAI Codex Subagents overlap with this repo's intended parallel workers. Codex supports specialized `default`, `worker`, and `explorer` agents plus custom agent TOML files, parallel execution, and explicit parent collection of results. UnifiedAIToolbox has rosters and worktree isolation, but it lacks a first-class run artifact that says: "this parent delegated this exact task to this child, with this write scope, this expected output schema, this validation command, and this merge contract."

OpenAI Agents SDK handoffs are a useful reference model. Handoffs are represented as tools, can carry a typed `input_type` payload, can filter context for the next agent, and stay within a single run. UnifiedAIToolbox has source/consumer hints in agent definitions, but pipeline transitions are mostly implicit in stage order and prompt instructions.

OpenAI Agents SDK guardrails and tracing highlight two runtime gaps. Guardrails have explicit workflow boundaries, including tool guardrails for custom tool calls. Tracing records LLM generations, tool calls, handoffs, guardrails, and custom spans. UnifiedAIToolbox has events, gate artifacts, and run manifests, but no canonical handoff span or tool-call span schema across all engines.

OpenAI agent evals and trace grading map directly to the missing training loop. This repo has prompt gates and some eval cases, but not a trajectory dataset that grades whether agent handoffs, tool choices, repair loops, and software-development outputs met expectations across many runs.

LangChain/LangGraph frames the key design choice: subagents for isolated parallel work, handoffs for stateful control transfer, skills for on-demand specialized context, routers for classification, and custom workflows for deterministic orchestration. UnifiedAIToolbox currently blends these patterns, but the run model does not clearly label which pattern a stage uses.

AutoGen and LangGraph both make graph flow more explicit than the current pipeline files. They support graph edges, conditional routing, loops, state persistence/resume, and team-level execution. UnifiedAIToolbox has retries and stage sequences, but no canonical graph schema for conditional agent-to-agent transitions beyond gates and stage ordering.

CrewAI Flows/Crews are less directly applicable as a replacement, but they reinforce two missing pieces: structured state and explicit process type. CrewAI exposes sequential/hierarchical crews and structured flow state. UnifiedAIToolbox has manifests and scratchpads, but not a single typed shared-state contract that every agent reads/writes through.

DSPy is not an orchestration runtime, but it is relevant for "training tools." It shows how to turn examples, metrics, and traces into optimized prompts/programs. UnifiedAIToolbox has learning capture, but does not yet convert run artifacts into an optimization dataset with stable metrics and regression gates for agent prompts.

## Missing contracts

### 1. Canonical agent message envelope

Current outputs can match each agent's JSON schema, but there is no universal wrapper that identifies provenance and handoff metadata.

Recommended `agent_message_envelope.v1` fields:

- `run_id`
- `stage_id`
- `agent_id`
- `agent_role`
- `schema_id`
- `schema_version`
- `trace_id`
- `parent_message_id`
- `handoff_id`
- `input_artifact_refs`
- `output_artifact_refs`
- `status`
- `failure_type`
- `confidence`
- `payload`

This makes every agent output traceable even when each agent's payload schema differs.

### 2. Explicit handoff contract

Current handoffs are mostly implied by pipeline order, `source_agent`, `consumed_by`, and prompt wording.

Recommended `handoff_contract.v1` fields:

- `handoff_id`
- `from_agent`
- `to_agent`
- `trigger`
- `preconditions`
- `payload_schema`
- `state_patch_schema`
- `context_policy`
- `artifact_refs_required`
- `expected_response_schema`
- `allowed_next_handoffs`
- `timeout`
- `retry_policy`
- `failure_route`

This should be runtime-enforced before the receiving agent starts.

### 3. Typed shared run state

The run has manifests, events, checkpoints, scratchpads, and artifacts, but agents do not share one typed state model with merge rules.

Needed:

- `run_state_schema.v1` for high-level fields such as requirements, plan, task graph, gates, repair targets, readiness, and learning.
- `state_patch` contract for every agent that mutates shared state.
- Merge policy for concurrent worker patches.
- Visibility policy that says what state slice each agent can see.

This is the LangGraph/CrewAI-style state discipline adapted to the existing PowerShell/Next/Python stack.

### 4. Tool and capability contract per agent

Agents list tools/capabilities, but runtime permission boundaries are not first-class enough for software development.

Needed:

- allowed tool names
- read path allowlist
- write path allowlist
- forbidden path/file patterns
- network permission
- command policy
- approval requirement
- maximum runtime
- artifact write policy

This should be joined to the existing job-type policy and enforced before tool/command execution.

### 5. Software task ownership contract

The app-production docs describe task DAGs and FileWriter packets, and the bridge has `taskgraph.json`, but there is no one canonical software-development task packet used across app factory, maintenance, and bridge runs.

Recommended `software_task_contract.v1` fields:

- `task_id`
- `owner_agent`
- `goal`
- `target_files`
- `read_context_files`
- `write_scope`
- `conflict_group`
- `depends_on`
- `expected_exports`
- `acceptance_criteria`
- `validation_commands`
- `merge_strategy`
- `rollback_strategy`
- `risk_level`
- `review_required`

This should be the unit of parallel worktree execution and later merge coordination.

### 6. Handoff and workflow trace spans

Current events and manifests are useful, but they are not enough for trace grading or run replay.

Needed span types:

- `agent.start`
- `agent.complete`
- `agent.fail`
- `handoff.start`
- `handoff.complete`
- `tool.call`
- `tool.result`
- `gate.start`
- `gate.verdict`
- `repair.start`
- `repair.complete`
- `merge.start`
- `merge.complete`

Each span should carry `trace_id`, `parent_span_id`, duration, status, artifact refs, and sanitized metadata.

### 7. Failure taxonomy and recovery protocol

Current failures appear as gate failures, contract failures, checkpoint blockers, or app-production statuses. Those are useful but not yet a shared agent-to-agent language.

Recommended taxonomy:

- `requirements_missing`
- `schema_invalid`
- `tool_denied`
- `command_failed`
- `env_missing`
- `dependency_unavailable`
- `test_failed`
- `merge_conflict`
- `scope_violation`
- `low_confidence`
- `human_approval_required`

Every failure should declare `recoverable`, `retryable`, `suggested_next_agent`, and `evidence_refs`.

### 8. Eval/training loop over trajectories

Prompt gates currently validate candidate libraries and run eval cases, but the system does not yet grade whole orchestration trajectories.

Needed:

- curated eval dataset from real runs
- trace graders for handoff correctness, tool choice, schema compliance, gate evidence, repair efficiency, and final app readiness
- regression suite before agent prompt/library changes
- optional optimizer loop for prompts once the metrics are stable

## Priority implementation sequence

1. Define `agent_message_envelope.v1` and `handoff_contract.v1`.
   - Do this before more runtime expansion, because it gives every later feature a stable surface.

2. Add a handoff validator.
   - Validate outgoing payload schema, required artifact refs, receiving agent input schema, and allowed next handoff before dispatch.

3. Normalize software task packets.
   - Unify app-production FileWriter packets and orchestration-bridge `taskgraph.json` around `software_task_contract.v1`.

4. Add trace spans for agent, handoff, tool, gate, repair, and merge events.
   - Keep payloads sanitized and use artifact refs instead of dumping raw content into traces.

5. Make tool/capability permissions executable.
   - Enforce per-agent read/write scope and command policy at the runtime boundary, not only in prompt text.

6. Build a trajectory eval suite.
   - Start with 10-20 representative runs and grade: contract adherence, handoff correctness, validation evidence, repair routing, and delivery readiness.

7. Package repo-specific Codex skills.
   - Create narrow local skills for recurring orchestration work after the contracts above stabilize.

## Bottom line

UnifiedAIToolbox is not missing basic multi-agent orchestration. It is missing the runtime contracts that make a multi-agent software-development workflow auditable, replayable, and optimizable:

- a universal agent message envelope
- explicit handoff contracts
- typed shared state with merge rules
- executable agent tool/capability permissions
- a canonical software task contract
- trace spans suitable for grading
- a trajectory eval/training loop

Those are additive to the current engine. They should not replace the existing job-type policies, gate system, app-production proof path, or worktree isolation.
