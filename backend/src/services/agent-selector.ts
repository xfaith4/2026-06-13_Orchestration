import type { AgentDefinition } from '@unifiedaitoolbox/shared';
import type { ExecutionPhase, ExecutionTask } from '@unifiedaitoolbox/shared';

// -------------------------------------------------------------------------
// Task → Agent matching
//
// Scores each agent against a task using two signals:
//   1. Capability keyword overlap — words from the agent's capabilities[]
//      array that appear in the task text (2 pts each match).
//   2. Name-heuristic bonuses — patterns in the task that strongly imply
//      a specific agent class (6 pts each hit).
//
// The Engineer gets a broad implementation-keyword bonus so it wins on any
// coding task that doesn't have a stronger specialist match. This is the
// right fallback: the Engineer prompt is the most complete for open-ended
// coding work, and the other specialists (Critic, SecurityAnalyst, etc.)
// should only win when the task explicitly calls for their domain.
// -------------------------------------------------------------------------

interface TaskLike {
  id: string;
  name: string;
  description: string;
}

// Whole-word match to avoid substring false positives.
// "documented" must not match the "document" agent heuristic.
// "testing" in an npm script context must not match the Test agent.
function word(text: string, w: string): boolean {
  return new RegExp(`\\b${w}\\b`).test(text);
}

function scoreAgent(agent: AgentDefinition, taskText: string): number {
  let score = 0;
  const text = taskText.toLowerCase();
  const agentName = agent.name.toLowerCase();

  // Signal 1 — capability keyword overlap
  for (const cap of agent.capabilities) {
    const words = cap.toLowerCase().replace(/-/g, ' ').split(/\s+/);
    for (const w of words) {
      if (w.length > 3 && text.includes(w)) {
        score += 2;
      }
    }
  }

  // Signal 2 — name/domain heuristic bonuses
  //
  // Rules for each specialist:
  //   • Test/Validation: requires construction-intent signals (describe, expect,
  //     suite, assertion, coverage, test case, test suite). Plain "test" in
  //     a setup/config context ("npm test script", "install vitest") does NOT
  //     qualify — that's an Engineer task. "vitest" alone is not enough either
  //     because it can appear as a dependency name to install.
  //
  //   • Documentation: requires the standalone word "document" or "documentation",
  //     not substrings like "documented", "undocumented". README, JSDoc, and
  //     "write" + "documentation" are strong signals.
  //
  //   • All other specialists use substring matching since their trigger words
  //     are distinctive enough (security, accessibility, architect, etc.)

  const isTestConstruction =
    word(text, 'describe') || word(text, 'expect') ||
    word(text, 'assertion') || word(text, 'assertions') ||
    text.includes('test suite') || text.includes('test case') ||
    text.includes('test coverage') || text.includes('test file') ||
    text.includes('write test') || text.includes('write tests') ||
    text.includes('happy path') || text.includes('edge case') ||
    text.includes('unit test') || text.includes('integration test') ||
    (word(text, 'spec') && !text.includes('specify') && !text.includes('specification'));

  if (isTestConstruction && (agentName.includes('test') || agentName.includes('validation'))) {
    // 8 so Test agent beats Engineer's max of 7 when the task is unambiguously test-writing.
    score += 8;
  }

  const isDocumentation =
    word(text, 'documentation') || word(text, 'readme') ||
    word(text, 'jsdoc') || word(text, 'tsdoc') ||
    text.includes('api doc') || text.includes('api documentation') ||
    (word(text, 'document') && !text.includes('documented') && !text.includes('undocumented'));

  if (isDocumentation && agentName.includes('document')) {
    score += 6;
  }

  if (agentName.includes('security')) {
    // Base: task mentions security at all (+6).
    // Specialist bonus (+8): task uses security-domain vocabulary that a code reviewer
    // wouldn't normally own — vulnerabilities, OWASP, injection, CVE, exploit.
    // Combined ceiling of 14 lets Security Analyst beat Critic even when Critic's
    // code-review capability accidentally stacks with a "review" heuristic on the task.
    if (text.includes('security')) score += 6;
    if (text.includes('vulnerabilit') || text.includes('owasp') || text.includes('exploit') ||
        text.includes('injection') || text.includes('penetration') || word(text, 'cve')) {
      score += 8;
    }
  }
  if ((text.includes('accessibility') || text.includes(' a11y')) && agentName.includes('accessibility')) {
    score += 6;
  }
  if ((text.includes('architect') || text.includes('system design') || text.includes('high-level')) &&
      agentName.includes('architect')) {
    score += 6;
  }
  if ((word(text, 'review') || word(text, 'audit') || word(text, 'defect') ||
       text.includes('quality check') || text.includes('code quality')) && agentName.includes('critic')) {
    score += 6;
  }
  if ((text.includes('research') || text.includes('analys') || text.includes('investigate') ||
       text.includes('benchmark')) && agentName.includes('researcher')) {
    score += 6;
  }
  if ((text.includes('ux') || text.includes('user experience') || text.includes('interaction')) &&
      agentName.includes('ux')) {
    score += 6;
  }
  if ((text.includes('performance') || text.includes('latency') || text.includes('throughput') ||
       text.includes('optimize')) && agentName.includes('performance')) {
    score += 5;
  }
  if ((text.includes('release') || text.includes('deploy') || text.includes('publish') ||
       text.includes('bundle') || text.includes('distribution')) && agentName.includes('release')) {
    score += 5;
  }
  if ((text.includes('product') || text.includes('feature') || text.includes('requirement')) &&
      agentName.includes('product')) {
    score += 4;
  }

  // Signal 3 — Engineer broad implementation bonus
  // Wins on coding/setup tasks that have no stronger specialist claim.
  // Intentionally wide: Engineer is the right fallback for all build/config/impl work.
  if (agentName === 'engineer') {
    const implTerms = [
      'implement', 'code', 'function', 'class', 'module',
      'build', 'write', 'configure', 'setup', 'initialize', 'refactor',
      'typescript', 'javascript', 'tsconfig', 'schema', 'interface', 'type',
      'regex', 'parse', 'format', 'utility', 'helper', 'define', 'export',
      // setup/dependency terms: Engineer wins on npm/package management tasks
      'install', 'npm', 'dependencies', 'dependency', 'package.json',
      'node_modules', 'devdependencies',
    ];
    const matchCount = implTerms.filter(t => text.includes(t)).length;
    // Only award the bonus when at least one term matches — no floor score.
    // Single match = +4, two = +6, three+ = +7.
    if (matchCount > 0) {
      score += Math.min(7, 4 + (matchCount - 1) * 2);
    }
  }

  return score;
}

// Select the best-fit agent for a single task. Never returns null — falls
// back to agents[0] when nothing scores above 0 (shouldn't happen in practice
// given the broad Engineer bonus, but keeps the signature honest).
export function selectAgentForTask(
  task: TaskLike,
  agents: AgentDefinition[]
): AgentDefinition {
  if (!agents.length) throw new Error('selectAgentForTask: no agents available');

  const taskText = `${task.name} ${task.description}`;

  let best = agents[0];
  let bestScore = scoreAgent(agents[0], taskText);

  for (const agent of agents.slice(1)) {
    const score = scoreAgent(agent, taskText);
    if (score > bestScore) {
      bestScore = score;
      best = agent;
    }
  }

  return best;
}

// Filter agents by contract roster — only return agents that are in the allowed list
export function filterAgentsByRoster(
  agents: AgentDefinition[],
  rosterNames: string[]
): AgentDefinition[] {
  if (!rosterNames.length) {
    console.warn('[agent-selector] Empty agent roster — returning all agents');
    return agents;
  }
  const rosterSet = new Set(rosterNames.map(n => n.toLowerCase()));
  const filtered = agents.filter(a => rosterSet.has(a.name.toLowerCase()));
  if (filtered.length === 0) {
    console.error(`[agent-selector] No agents matched roster ${rosterNames.join(', ')}. Available: ${agents.map(a => a.name).join(', ')}`);
    return agents; // fallback to all agents rather than zero agents
  }
  return filtered;
}

// Build the full taskId → agentId map for a phase, logging each assignment.
// If rosterNames is provided, only agents in the roster will be considered.
export function buildAgentAssignments(
  phase: ExecutionPhase,
  agents: AgentDefinition[],
  rosterNames?: string[]
): Record<string, string> {
  const availableAgents = rosterNames ? filterAgentsByRoster(agents, rosterNames) : agents;
  const assignments: Record<string, string> = {};
  for (const task of phase.tasks) {
    const agent = selectAgentForTask(task, availableAgents);
    assignments[task.id] = agent.id;
    const rosterNote = rosterNames ? ` [roster-constrained to ${rosterNames.length} agents]` : '';
    console.log(`[agent-selector] Phase "${phase.name}" / "${task.name}" → ${agent.name}${rosterNote}`);
  }
  return assignments;
}

// Build scored suggestion list for the execution planner UI.
export function rankAgentsForTask(
  task: ExecutionTask,
  agents: AgentDefinition[],
  topN = 3
): Array<{ id: string; name: string; score: number }> {
  const taskText = `${task.name} ${task.description}`;
  return agents
    .map(a => ({ id: a.id, name: a.name, score: scoreAgent(a, taskText) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
