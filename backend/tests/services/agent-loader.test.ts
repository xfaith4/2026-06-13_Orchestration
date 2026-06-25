import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { AgentLoader } from '../../src/services/agent-loader.js';
import { toExecutionInput } from '../../src/services/agent-mapping.js';
import { AgentDefinition } from '@unifiedaitoolbox/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REAL_AGENTS_DIR = path.join(__dirname, '../../../agents');

const NAMED_TEAM: Record<string, string> = {
  Critic: 'Reviews for defects, risks, and adherence to specs/schemas.',
  Engineer: 'Produces code, configurations, and artifacts; integrates tools and tests.',
  Synthesizer: 'Merges variants, resolves contradictions, prepares consumable outputs.',
  Commissioner: 'Assesses real-world value, cost/latency, and recommends go/no-go.',
  Supervisor: 'Scores quality, issues corrective guidance, promotes durable insights to global memory.',
  Historian: "Produces a compact, durable run summary ('memory capsule') for reuse.",
  Researcher: 'Gathers sources, derives facts, proposes options.',
};

describe('AgentLoader against the real agents/ directory (live, not mocked)', () => {
  it('loads every agent file and surfaces the named team with correct roles (F1 pin)', async () => {
    const loader = new AgentLoader(REAL_AGENTS_DIR);
    const agents = await loader.loadAllAgents();

    expect(agents.length).toBeGreaterThan(30);

    for (const [name, role] of Object.entries(NAMED_TEAM)) {
      const agent = agents.find(a => a.name === name && a.sourceFile?.endsWith('.yaml'));
      expect(agent, `${name} should load from its .yaml file`).toBeDefined();
      expect(agent?.role).toBe(role);
    }
  });

  it('normalizes a loaded YAML agent with prompt, ioContract, constraints, and routing populated', async () => {
    const loader = new AgentLoader(REAL_AGENTS_DIR);
    const agents = await loader.loadAllAgents();
    const critic = agents.find(a => a.name === 'Critic' && a.sourceFile === 'critic.yaml');

    expect(critic).toBeDefined();
    expect(critic?.prompt).toBeTruthy();
    expect(Array.isArray(critic?.constraints)).toBe(true);
    expect(critic!.constraints.length).toBeGreaterThan(0);
    expect(critic?.ioContract?.inputSchema).toBeTruthy();
    expect(critic?.ioContract?.outputSchema).toBeTruthy();
    expect(critic?.routing?.preferredModels?.length).toBeGreaterThan(0);
  });
});

describe('AgentLoader against isolated fixtures', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `agent-loader-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function writeFixture(name: string, content: string): Promise<void> {
    await fs.writeFile(path.join(tempDir, name), content, 'utf-8');
  }

  it('loads a YAML doc with a capabilities array as ONE agent, not capability fragments (F1 second-bug regression)', async () => {
    await writeFixture(
      'rich.yaml',
      [
        'id: ag_test_rich',
        'name: RichAgent',
        'role: Does rich things',
        'capabilities: [alpha, beta, gamma]',
        'constraints:',
        '  - "Be careful"',
        '  - "Be precise"',
        'prompt: |',
        '  You are RichAgent.',
        'io_contract:',
        '  input_schema:',
        '    type: object',
        '  output_schema:',
        '    type: object',
        'routing_hints:',
        '  preferred_models: [model-a, model-b]',
        '  max_tokens: 1234',
        '',
      ].join('\n')
    );

    const loader = new AgentLoader(tempDir);
    const agents = await loader.loadAllAgents();

    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('RichAgent');
    expect(agents[0].role).toBe('Does rich things');
    expect(agents[0].capabilities).toEqual(['alpha', 'beta', 'gamma']);
    expect(agents[0].constraints).toEqual(['Be careful', 'Be precise']);
    expect(agents[0].prompt).toContain('You are RichAgent.');
    expect(agents[0].ioContract?.inputSchema).toEqual({ type: 'object' });
    expect(agents[0].routing).toEqual({ preferredModels: ['model-a', 'model-b'], maxTokens: 1234 });
  });

  it('defaults capabilities and constraints to [] when absent, and role to generic', async () => {
    await writeFixture('bare.yaml', ['id: ag_test_bare', 'name: BareAgent', ''].join('\n'));

    const loader = new AgentLoader(tempDir);
    const agents = await loader.loadAllAgents();

    expect(agents).toHaveLength(1);
    expect(agents[0].capabilities).toEqual([]);
    expect(agents[0].constraints).toEqual([]);
    expect(agents[0].role).toBe('generic');
    expect(agents[0].prompt).toBeUndefined();
    expect(agents[0].ioContract).toBeUndefined();
  });

  it('treats a top-level JSON array as a multi-agent container', async () => {
    await writeFixture(
      'container-array.json',
      JSON.stringify([
        { id: 'a1', name: 'First', type: 'alpha' },
        { id: 'a2', name: 'Second', type: 'beta' },
      ])
    );

    const loader = new AgentLoader(tempDir);
    const agents = await loader.loadAllAgents();

    expect(agents).toHaveLength(2);
    expect(agents.map(a => a.name).sort()).toEqual(['First', 'Second']);
  });

  it('treats a JSON object with a case-insensitive "agents" key as a multi-agent container', async () => {
    await writeFixture(
      'container-object.json',
      JSON.stringify({
        Agents: [
          { id: 'a1', name: 'First', role: 'alpha' },
          { id: 'a2', name: 'Second', role: 'beta' },
        ],
      })
    );

    const loader = new AgentLoader(tempDir);
    const agents = await loader.loadAllAgents();

    expect(agents).toHaveLength(2);
  });

  it('loads a single-object JSON stub as one agent despite array-valued fields (banned-heuristic regression)', async () => {
    await writeFixture(
      'stub.agent.json',
      JSON.stringify({
        id: 'stub-1',
        name: 'StubAgent',
        description: 'A thin stub',
        inputs: ['repo path', 'contract'],
        outputs: ['result.json'],
      })
    );

    const loader = new AgentLoader(tempDir);
    const agents = await loader.loadAllAgents();

    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('StubAgent');
    expect(agents[0].description).toBe('A thin stub');
  });

  it('skips unnamed entries with a warning instead of crashing', async () => {
    await writeFixture('unnamed.json', JSON.stringify([{ id: 'x' }]));

    const loader = new AgentLoader(tempDir);
    const agents = await loader.loadAllAgents();

    expect(agents).toHaveLength(0);
  });
});

describe('toExecutionInput', () => {
  it('maps prompt and both schemas onto AgentExecutionInput', () => {
    const def: AgentDefinition = {
      id: 'agent-1',
      name: 'Critic',
      role: 'reviewer',
      description: 'Reviews things',
      prompt: 'You are the Critic.',
      capabilities: ['code-review'],
      constraints: ['Be specific'],
      ioContract: {
        inputSchema: { type: 'object' },
        outputSchema: { type: 'object', properties: { issues: { type: 'array' } } },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const input = toExecutionInput(def, { implementation: 'foo' });

    expect(input.agentId).toBe('agent-1');
    expect(input.agentName).toBe('Critic');
    expect(input.prompt).toBe('You are the Critic.');
    expect(input.inputData).toEqual({ implementation: 'foo' });
    expect(input.inputSchema).toEqual({ type: 'object' });
    expect(input.outputSchema).toEqual({ type: 'object', properties: { issues: { type: 'array' } } });
  });

  it('defaults prompt to empty string and schemas to undefined when the definition has none', () => {
    const def: AgentDefinition = {
      id: 'agent-2',
      name: 'Stub',
      role: 'generic',
      description: '',
      capabilities: [],
      constraints: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const input = toExecutionInput(def, {});

    expect(input.prompt).toBe('');
    expect(input.inputSchema).toBeUndefined();
    expect(input.outputSchema).toBeUndefined();
  });

  it('lets overrides win over derived fields', () => {
    const def: AgentDefinition = {
      id: 'agent-3',
      name: 'Stub',
      role: 'generic',
      description: '',
      prompt: 'original prompt',
      capabilities: [],
      constraints: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const input = toExecutionInput(def, {}, { prompt: 'overridden prompt', timeout: 5000 });

    expect(input.prompt).toBe('overridden prompt');
    expect(input.timeout).toBe(5000);
  });
});
