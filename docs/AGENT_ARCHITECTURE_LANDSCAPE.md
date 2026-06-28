# Agent Architecture Landscape — Do Multi-Agent Systems Build Apps?

> Researched 2026-06-28. Question: do any multi-agent orchestration frameworks/products
> successfully build applications? Answer: **products succeed; almost none use multi-agent
> fan-out.** The winners are single strong LLM + scaffolding + narrow scope + human-in-loop.
> Our own bake-off independently reproduced this industry consensus.

## TL;DR

- **Genuine multi-agent fan-out building a complete app: no credible documented case.** Research
  frameworks produce demos that collapse on real complexity; controlled studies show multi-agent
  *underperforms* single-agent on coding by 4–35%.
- **What actually builds apps: single agent in a loop + heavy deterministic scaffolding + narrow
  fixed stack + human review.** Every $100M+ ARR builder follows this.
- **Where multi-agent genuinely wins: READS, not writes** — breadth-first research/parallel
  exploration/verification feeding a single-threaded writer. Anthropic's research system +90% on
  research; explicitly excludes coding.
- **The moat is the scaffolding and scope discipline, not the agent count.**

## Commercial builders — architecture reality (0 of 8 use real fan-out)

| Product | Real architecture | Fan-out? | Builds |
|---|---|---|---|
| Lovable | Single Claude loop + context routing | No — **built multi-agent, measured worse, deleted it** | React+Supabase web apps |
| Bolt.new | Single Claude + WebContainers | No (verified in OSS system prompt) | Full-stack JS web apps |
| v0 (Vercel) | Sequential pipeline: RAG→gen→AutoFix repair model | No | React/Next UI + frontends |
| Replit Agent | One long loop + 1 testing subagent | Partial (one verifier) | Full-stack + deploy |
| Cursor | "Tools in a loop"; N *isolated* agents + best-of-N | No (isolation, not coordination) | IDE edits, repo tasks |
| Devin (Cognition) | Single-threaded linear agent (by manifesto) | No | Bounded SWE tasks → PR |
| GitHub Copilot | "Single agent in a tool-calling loop" (their words) | No | Low-med complexity tasks |
| Factory.ai | "Loop, LLM, tools"; personas; opt-in subagents | No (multi-agent = opt-in `--mission`) | SDLC tasks on existing repos |

**Killer fact:** Lovable A/B-tested a Devin-style multi-agent system against a single well-scaffolded
loop and found it *less accurate, slower, more confusing* — and removed it. The strongest real-world
evidence in the market, and it's against multi-agent for app-building.

**"Agents" plural = marketing, not architecture.** Across every product it resolved to: personas,
isolated parallel sessions, sequential pipeline stages, or best-of-N sampling — never a coordinated
swarm editing one codebase. (Smaller builders a0.dev/Create.xyz/Tempo/Lazy: same — single LLM loop +
fixed stack + scaffolding; Tempo's premium "Agent+" tier is literally human employees.)

## Research frameworks — demos, not apps

- **MetaGPT / ChatDev:** self-report high "executability" — but that means *compiles & runs*, not
  *correct*, on ~150–200 LOC toy programs. On the independent AgileCoder ProjectDev benchmark (14
  slightly-complex multi-file tasks): **MetaGPT 7.73%, ChatDev 32.79% executable.** ChatDev's authors:
  "prototype, not real-world"; stubs DBs with placeholders.
- **GPT-Pilot:** founders' own retrospective — "wasn't able to build a 30k LOC app in any amount of
  time"; real ceiling ~5k LOC; best independent demo ~300-LOC calculator.
- **AutoGPT/BabyAGI/AgentGPT:** no documented real app built end-to-end; all three abandoned autonomy.
- **Multi-agent underperforms single-agent on coding by 4.4–35.3%** (controlled eval). SWE-bench
  leaderboards are topped by *single-agent* scaffolds. **Agentless** (fixed 3-stage pipeline, no agents,
  no loops) beat most agent frameworks at >4× lower cost.
- **Realistic from-scratch ceiling (E2EDevBench, 2025):** SOTA agents fulfill ~50% of a medium app's
  requirements; **55.8% of failures are PLANNING failures**, not code-writing.

## The industry consensus (reads vs writes)

- **Anthropic** (multi-agent research system): +90.2% vs single-agent **on research**, ~15× token cost.
  Explicitly: *"most coding tasks involve fewer truly parallelizable tasks… LLM agents are not yet
  great at coordinating and delegating in real time."* Prompt engineering was the "primary lever"; a
  model upgrade beat doubling the token budget.
- **Cognition** ("Don't Build Multi-Agents"): parallel agents make conflicting implicit decisions that
  don't compose (the Flappy Bird example = our 44-error `PhaseStatus` failure). 2026 follow-up reconciles:
  *"writes stay single-threaded and the additional agents contribute intelligence rather than actions."*
- **LangChain (Chase):** the real problem is *context engineering*, not agent topology; "reads are more
  parallelizable than writes; conflicting writes produce far worse outcomes than conflicting reads."
- **Google/MIT (180 configs):** **+81% multi-agent on parallelizable tasks, −39% to −70% on sequential.**
  "Task structure is the deciding factor"; decomposability predicts the right architecture 87% of the time.
- **MAST (Berkeley, 1600+ traces):** ~42% of multi-agent failures = spec/design, ~37% = inter-agent
  misalignment. Structural, not fixable by a bigger base model.

## What this means for the app factory

The viable architecture the evidence supports (and what every shipping product does):
1. **Single-agent write core** (not a swarm).
2. **Narrow fixed stack** — scope discipline IS the reliability.
3. **Deterministic scaffolding as the moat** (WebContainers, AutoFix repair model, self-test loops) —
   not agent count.
4. **Human at the boundary.**
5. **Parallel agents only for READS** — research/explore/critique/verify feeding the single writer.

Our bake-off (single-agent most coherent/stable; naive fan-out worst; contract-first didn't rescue it)
is not an anomaly — it's the industry consensus, reproduced independently. See `MODEL_ROUTING_BASELINE.md`.

## Sources (load-bearing)
- Lovable removed multi-agent: https://www.zenml.io/llmops-database/building-an-ai-powered-software-development-platform-with-multiple-llm-integration
- Cognition, Don't Build Multi-Agents: https://cognition.com/blog/dont-build-multi-agents · follow-up: https://cognition.com/blog/multi-agents-working
- Anthropic multi-agent research system: https://www.anthropic.com/engineering/multi-agent-research-system · Building Effective Agents: https://www.anthropic.com/research/building-effective-agents
- LangChain, how/when multi-agent: https://www.langchain.com/blog/how-and-when-to-build-multi-agent-systems
- Google/MIT, Science of Scaling Agent Systems: https://research.google/blog/towards-a-science-of-scaling-agent-systems-when-and-why-agent-systems-work/ (arXiv:2512.08296)
- MAST, Why Do Multi-Agent LLM Systems Fail: https://arxiv.org/abs/2503.13657
- AgileCoder ProjectDev (framework collapse): https://arxiv.org/html/2406.11912v2
- E2EDevBench (~50% requirement ceiling): https://arxiv.org/html/2511.04064v1
- Agentless (simple pipeline beats agent frameworks): https://arxiv.org/html/2407.01489v1
- Bolt OSS system prompt: https://github.com/stackblitz/bolt.new/blob/main/app/lib/.server/llm/prompts.ts
- v0 composite model: https://vercel.com/blog/v0-composite-model-family
- Copilot "single agent in a tool-calling loop": https://code.visualstudio.com/blogs/2026/05/15/agent-harnesses-github-copilot-vscode
