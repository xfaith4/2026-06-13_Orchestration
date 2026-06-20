import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExecutionTask } from '@unifiedaitoolbox/shared';
import { TaskExecutor, detectOutputLanguages } from '../../src/services/task-executor.js';
import { AgentRegistry } from '../../src/services/agent-registry.js';
import { PromptRegistry } from '../../src/services/prompt-registry.js';
import { LLMClient } from '../../src/services/llm-client.js';

const baseTask: ExecutionTask = {
  id: 'task-1',
  name: 'Implement API route',
  description: 'Build the roadmap execution route.',
  status: 'pending',
  dependencies: [],
};

function createExecutor(): TaskExecutor {
  const agentRegistry = {
    getAgent: vi.fn().mockReturnValue({
      id: 'agent-1',
      name: 'Backend Engineer',
      type: 'implementation',
      description: 'Implement the assigned backend task.',
      capabilities: ['typescript'],
      inputs: {},
      outputs: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  } as unknown as AgentRegistry;

  const promptRegistry = {
    getPrompt: vi.fn(),
    recordUsage: vi.fn().mockResolvedValue(undefined),
    getAllPrompts: vi.fn().mockReturnValue([]),
  } as unknown as PromptRegistry;

  return new TaskExecutor(agentRegistry, promptRegistry);
}

describe('TaskExecutor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('injects the stack constraint block into LLM task prompts', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';

    vi.spyOn(LLMClient, 'isAvailable').mockReturnValue(true);
    const callSpy = vi.spyOn(LLMClient.prototype, 'call').mockResolvedValue({
      text: 'Implementation complete.',
      inputTokens: 120,
      outputTokens: 80,
      model: 'test-model',
      stopReason: 'end_turn',
    });

    const executor = createExecutor();
    const result = await executor.executeTask({
      task: baseTask,
      agentId: 'agent-1',
      stackConstraints: {
        language: 'TypeScript',
        runtime: 'Node.js >= 18',
        framework: 'Express.js 4.x',
        dependencies: ['express', 'joi', 'winston'],
        fileStructure: ['src/ for source', 'tests/ for tests'],
        disallowedLanguages: ['Python'],
        disallowedTechnologies: ['Prisma'],
      },
    });

    expect(result.success).toBe(true);

    const request = callSpy.mock.calls[0]?.[0];
    expect(request?.messages[0]?.content).toContain('## Project Stack (REQUIRED - do not deviate)');
    expect(request?.messages[0]?.content).toContain('- Language: TypeScript');
    expect(request?.messages[0]?.content).toContain('- Runtime: Node.js >= 18');
  });

  it('detects languages from fenced output and materialized artifact paths', () => {
    const output = `\`\`\`json
{
  "code_artifacts": [
    {
      "file_path": "src/index.ts",
      "content": "export const started = true;\\n"
    },
    {
      "file_path": "app/main.py",
      "content": "print('hello')\\n"
    }
  ]
}
\`\`\``;

    expect(detectOutputLanguages(output)).toEqual(['json', 'typescript', 'python']);
  });

  it('returns a warning when generated code violates the constrained language', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';

    vi.spyOn(LLMClient, 'isAvailable').mockReturnValue(true);
    vi.spyOn(LLMClient.prototype, 'call').mockResolvedValue({
      text: `\`\`\`json
{
  "code_artifacts": [
    {
      "file_path": "app/main.py",
      "content": "print('hello')\\n"
    }
  ]
}
\`\`\``,
      inputTokens: 140,
      outputTokens: 90,
      model: 'test-model',
      stopReason: 'end_turn',
    });

    const executor = createExecutor();
    const result = await executor.executeTask({
      task: baseTask,
      agentId: 'agent-1',
      stackConstraints: {
        language: 'TypeScript',
        runtime: 'Node.js >= 18',
        disallowedLanguages: ['Python'],
      },
    });

    expect(result.success).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings?.[0]?.code).toBe('STACK_CONSTRAINT_LANGUAGE_MISMATCH');
    expect(result.warnings?.[0]?.expectedLanguages).toContain('typescript');
    expect(result.warnings?.[0]?.violatingLanguages).toContain('python');
  });
});
