# Model Routing Baseline — Evidence-Based Model Assignment

> Researched 2026-06-27. Purpose: stop guessing which model goes where in the
> orchestration pipeline. This is the prior-art-backed baseline; deviations
> should cite a measured result, not intuition.

## TL;DR — the architecture

**Strong ends, cheap middle, tool-grounded verifier.** Put the expensive model at
PLANNING, do the bulk EXECUTION on a cheaper-but-reliable tier, let the
**compiler/tests** (not an LLM) be the primary supervisor, and **escalate model
tier only when execution feedback (tsc/vitest) fails.**

This is exactly Anthropic's own production pattern: an Opus lead + Sonnet workers
beat single-agent Opus by **90.2%** on their internal research eval.

## Role → tier assignment (our tiers: Haiku $0.80/$4 · Sonnet $3/$15 · Opus $15/$75)

| Stage | Component | Model | Rationale |
|-------|-----------|-------|-----------|
| PLAN | `roadmap-generator` | **Opus 4.8** | Planner choice swings pipeline error 7.35% → 40.49%; ~42% of failures originate in spec/planning. Runs **once per run** → cost amortizes over all tasks. Highest-leverage dollar. |
| EXECUTE | Engineer, Test agent | **Sonnet 4.6** (Haiku only for pure boilerplate: configs, .gitignore, README) | aider architect/editor pattern: cheaper editor on bulk volume. Haiku measured to ignore "no prose" + over-scaffold (64 files for a 2-fn util). |
| VERIFY | tsc + vitest | **deterministic, no LLM** | Tool-grounded verification beats LLM self-check. Already built (`project-validator.ts`). This is the real supervisor. |
| CRITIQUE | Critic (semantic vs spec) | **Sonnet 4.6 min — never Haiku** | DeepMind: cheap-critiques-cheap *degrades* quality. Critic must be ≥ the worker it reviews. |
| REPAIR | repair loop | **Sonnet**, escalate to **Opus** after 2nd failed repair on same file | EcoAssistant beat GPT-4 at <50% cost by escalating only on execution-feedback failure. |

### Routing rule (the cascade)
Default to the assigned tier. **Escalate by exception** when tsc/vitest still fail
after N repair attempts on a file — bump that file's repair task up one tier
(Sonnet → Opus). Never escalate blindly; escalate on a *real* signal.

## Evidence base (sources)

### Coding-agent model splits — the strongest direct prior art
- **aider architect/editor** — strong architect + cheaper editor. R1(architect)+Sonnet(editor)
  scored **64.0% @ $13.29** vs o1-solo **61.7% @ $186.50** (better *and* ~14× cheaper).
  https://aider.chat/2025/01/24/r1-sonnet.html · https://aider.chat/2024/09/26/architect.html
- **OpenHands** SWE-bench, model-swap in fixed scaffold: Claude Sonnet best at ~$0.30/issue;
  DeepSeek-V2.5 at ~$0.003/issue (100× cheaper, lower accuracy).
  https://www.openhands.dev/blog/evaluation-of-llms-as-coding-agents-on-swe-bench-at-30x-speed
- **SWE-agent** caps cost at **$3/instance** (cost, not steps, is the ceiling). Useful budget primitive.
  https://swe-agent.com/latest/config/models/
- Counterpoint: single-agent + curated context ~**70.6%** vs multi-agent ~**72.2%** —
  most of the multi-agent gain is recoverable with clean per-role context, not more agents.

### Where errors originate → spend on PLAN
- Role-specialized pipelines: **best planner 7.35% error vs worst 40.49%** (33-pt swing from planner alone).
  Strongest evidence for strong-model-at-PLAN. https://arxiv.org/html/2510.07614
- ~**41.8%** of failures are Specification & System Design; bad plans cascade irrecoverably.
  https://arxiv.org/pdf/2509.25370

### Verification — the supervisor must be external/tool-grounded
- **"LLMs Cannot Self-Correct Reasoning Yet"** (DeepMind, ICLR 2024): intrinsic self-correction
  *degrades* (GSM8K 75.9%→74.7%); prior "successes" secretly used oracle labels. A cheap model
  judging its own output is the documented anti-pattern. https://arxiv.org/abs/2310.01798
- **Reflexion**: 91% HumanEval — but only because it's fed external (unit-test) signals.
  https://arxiv.org/abs/2303.11366
- **Weaver**: verification is easier than generation; an *ensemble of cheap verifiers* can beat a
  single strong one. https://arxiv.org/html/2506.18203v1
- Implication: our tsc/vitest is the correct primary verifier. LLM critic is for semantic
  spec-conformance only, and must be ≥ worker tier.

### Routing & cascades — default cheap, escalate on signal
- **RouteLLM**: 95% of GPT-4 quality with only 14–26% strong-model calls; 85% cost cut on MT-Bench.
  https://www.lmsys.org/blog/2024-07-01-routellm/ · arXiv:2406.18665
- **FrugalGPT**: cascade cheap→strong, stop when answer judged reliable. Up to 98% cost reduction.
  https://arxiv.org/abs/2305.05176
- **EcoAssistant** (code agents): escalate cheap→strong on *code-execution failure*; beat GPT-4
  by +10 pts at <50% cost. The most code-relevant cascade. https://arxiv.org/abs/2310.03046
- **AutoMix**: self-verify + POMDP meta-verifier (models the verifier's noise). >50% cost cut.
  https://arxiv.org/abs/2310.12963

### Framework patterns
- Heterogeneous per-agent models supported by all major frameworks except ChatDev.
- **Only Anthropic documents + benchmarks** the strong-orchestrator/cheap-worker split
  (Opus lead + Sonnet subagents, +90.2%). CrewAI softly corroborates (`manager_llm`→GPT-4o).
  AutoGen/LangGraph/MetaGPT *enable* the split but default to one model.
  https://www.anthropic.com/engineering/multi-agent-research-system · https://code.claude.com/docs/en/sub-agents
- **Reviewer model-tiering is documented by no one** — universally a prompt/tool-isolation
  (read-only) pattern, not a model-strength pattern.

## Cost economics
- Multi-agent uses **~15× the tokens** of a single chat (Anthropic). Justified only when task
  value is high. Token usage alone explains ~80% of performance variance.
- The bar to beat is **not Haiku — it's a single Opus agent with good context** (~$0.50 for
  ColorUtils, clean tree). Orchestration must out-perform *that*, not just out-cheap Haiku.

## Open gaps (no documented data found)
- **Test-writer** and **Synthesizer/Integrator** roles: no role-specific model-selection data
  in any primary source. These remain judgment calls — default them to the EXECUTE tier (Sonnet).
- Several leaderboard entries surfaced (GPT-5.x, Opus 4.6/4.8, Fable 5) are post-cutoff and were
  **excluded** from conclusions as unverifiable.
- Fable 5 (our newest available model) has **no published agent-pipeline benchmarks** — untested here.

## Recommended next experiment
3-way bake-off on one fixed goal (ColorUtils), same harness:
1. **Uniform Haiku** (current baseline)
2. **Tiered** (this baseline: Opus plan / Sonnet exec+critic / tsc+vitest verify / escalate repair)
3. **Single Opus agent, well-contexted** (the real bar to beat)

Measure: input/output tokens, $, wall-clock, tsc-clean on first pass, # repair loops, file count.

## Empirical bake-off results (2026-06-27) — ColorUtils, n=3 per arm

Harness: `backend/bakeoff.ts` (reuses production OutputParser + ProjectValidator; fixed
scaffold so the comparison isolates code quality/coherence, not config sprawl).

| arm | both tsc+vitest pass | tsc 1st-pass | med $ | med dur | med out-tok | med files |
|-----|:---:|:---:|---:|---:|---:|---:|
| uniform-haiku | 2/3 | 2/3 | $0.036 | 46s | 8054 | 4 |
| tiered (Opus plan/Sonnet exec) | 3/3 | 2/3 | $0.141 | 78s | 6576 | 2 |
| single-opus | 3/3 | 3/3 | $0.134 | 19s | 1674 | 2 |

**Finding:** On this small, sequential task **single-opus dominated** — same correctness as the
orchestrated tiered arm but 4× faster (19s vs 78s), ~4× fewer output tokens, slightly cheaper.
The tiered overhead bought nothing *on a task this size*. uniform-haiku cheapest but least reliable
(unrepairable test-logic bug) and most verbose (4 files vs 2).

**Caveats:** n=3 (directional, not definitive). ColorUtils is the worst case for orchestration
(tiny, sequential, one-context) — this sets the FLOOR, not the verdict on large roadmaps where
the research says multi-agent pays off. Harness repairs tsc only, not vitest.

**What it validated:** (1) Opus planning yields leaner plans (3 tasks/2 files) than Haiku
(4 tasks/4 files). (2) The tiered architecture is correct (3/3). (3) **Real bug found+fixed:**
`ProjectValidator` discarded `err.stdout` (the actual tsc/vitest errors), keeping only
"Command failed…" — the repair loop was blind to error detail. Post-fix, previously-impossible
repairs now succeed.

**Actionable routing rule added:** assess task size/complexity up front; **bypass orchestration
and route small/sequential goals to a single strong agent.** Reserve the multi-agent pipeline for
large, parallelizable roadmaps — and run a LARGE-task bake-off next to find the crossover point.

## Large-task bake-off (2026-06-27) — Agentic App Factory roadmap, First Build Slice, n=1

Harness `backend/bakeoff-roadmap.ts`; standalone dashboard `docs/bakeoff/dashboard.html` (+ results.json).

| arm | cost | dur | files | src lines | test files | assertions | final errors | gate |
|-----|---:|---:|---:|---:|---:|---:|---:|:---:|
| uniform-haiku | $0.37 | 454s | 27 | 2658 | 1 | 9 | 0 | PASS |
| tiered (Opus→Sonnet) | $2.63 | 1030s | 14 | 1704 | 3 | 116 | 44 | fail |
| single-opus | $3.91 | 430s | 21 | 1390 | 9 | 143 | 3 | fail |

**The binary gate inverted the truth.** uniform-haiku "passed" with the SHALLOWEST tests (9 assertions,
1 file). single-opus did the best work (143 assertions, cleanest architecture) and "failed" on 3 trivial
TEST-FILE type errors — one repair attempt past the 2-cap from passing. tiered LOST: most expensive
orchestrated arm, slowest (17 min), 44 errors — almost all **cross-worker contract drift** (`PhaseStatus`
defined as a type by one Sonnet worker, used as a value by another; mismatched `PhaseSummary` shapes).

**Key lesson:** On large work, **naive fan-out orchestration produced the WORST result** — costlier AND
less coherent than a single strong agent or a cheap uniform swarm. Orchestration value is NOT automatic.
tiered failed for the exact reason the roadmap §3.2/§5 warns about: workers fan out before a SHARED TYPE
CONTRACT exists, so each invents its own interfaces. **Next hypothesis: "contract-first tiered"** — the
architect emits shared types/schemas first, written to disk, and every worker MUST import them (never
redefine). That is the predicted crossover where orchestration beats the single agent on large roadmaps.

**Also confirmed:** always measure test depth (assertions) + error density alongside pass/fail — the gate
alone is treacherous. The 2-attempt repair cap is too low (it cost single-opus a likely win).

## Contract-first run (2026-06-27, n=1, 4-way, repair cap raised 2→3)

Added a 4th arm: **contract-first** = Opus emits one shared `src/contracts.ts` BEFORE fan-out; Sonnet
workers told to import it, never redefine. Fresh run of all four arms.

| arm | cost | dur | files | test files | assertions | final errors | gate |
|-----|---:|---:|---:|---:|---:|---:|:---:|
| uniform-haiku | $0.50 | 547s | 20 | 2 | 84 | 61 | fail |
| tiered (naive) | $7.03 | 1549s | 11 | 2 | 83 | 6 | fail |
| contract-first | $8.41 | 1528s | 17 | 4 | 155 | 18 | fail |
| single-opus | $5.11 | 546s | 12 | 4 | 46 | 3 | fail |

**Contract-first did NOT rescue orchestration.** Autopsy of its 18 errors: (1) the one-shot Opus contract
was INCOMPLETE — workers imported types (`RunStatus`, `Run`, `RefinedPrompt`) the architect never exported
(TS2305); (2) some workers IGNORED it and redefined `PhaseStatus`/`TaskStatus` anyway (prompt ≠ enforcement);
(3) drift MIGRATED from types to FUNCTION/API signatures (tests imported functions engineers didn't implement).
The coordination problem is bigger than types and a prompt can't solve it.

**The two findings that dominate:**
1. **Variance is brutal; single-agent is the only stable arm.** Across both runs: uniform-haiku 0→61 errors,
   tiered 44→6, **single-opus 3→3**. The earlier "Haiku won" was luck. Single-context coherence is reproducible;
   orchestration coherence is a dice roll. Real conclusions need n≥5.
2. **Repair escalation is a money pit.** cap=3 + Opus escalation made orchestrated arms $7–8 (Opus alone
   $5.43 / $6.98) and STILL didn't converge. Expensive repair doesn't fix systemic incoherence.

**Verdict (corrected — do not overclaim):** **NONE of the four arms passed.** All failed the tsc+vitest gate,
so the bake-off did NOT determine a "best system" — it characterized *where each architecture's failures
surface*, plus their cost and variance. "Closest to passing" (single-opus, 3 errors) is NOT "best"; 3≠0.
Moreover the test was not a fair test of *success*: repair was capped at 3 attempts, tsc-only (no vitest
repair), single pass, n=1 — so "they all failed" is partly an artifact of the harness budget, not proof the
architectures are intrinsically incapable. What legitimately stands: (a) failure *surfaces* (haiku=volume/
incoherence; tiered & contract-first=cross-worker interface drift in types then function APIs;
single-opus=residual integration errors); (b) orchestrated repair-escalation is expensive and non-convergent;
(c) orchestrated outcomes are high-variance run-to-run while single-context is low-variance. These are
diagnostic + risk signals, NOT a ranking. The founding thesis (fan-out beats single-agent on large work) is
*not supported* by these runs, but neither is "single-agent is best" — no system produced working software.
Contract-first specifically didn't help and revealed the real need = COMPLETE + machine-ENFORCED contract
covering types AND function signatures (a prompt does not deliver this).

**Correct next step:** you cannot rank systems by output quality until ≥1 produces working output. Drive ONE
config to a genuine PASS (fair repair budget incl. vitest, until pass-or-provably-stuck) to establish whether
a working First Build Slice is achievable AT ALL. Only then does "which is best" become answerable.

**Next:** (a) make single-opus actually PASS (it's 3 errors away every time — cheapest experiment, reveals the
simple-architecture ceiling); (b) if orchestration stays, coordination must be DETERMINISTIC (codegen + lint
gate that workers cannot violate), not prompted — only worth it if single-agent hits a wall it hasn't yet.
