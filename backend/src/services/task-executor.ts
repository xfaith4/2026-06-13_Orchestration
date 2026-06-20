import { ExecutionTask, CostMetrics, StackConstraints } from '@unifiedaitoolbox/shared';
import { AgentRegistry } from './agent-registry.js';
import { PromptRegistry } from './prompt-registry.js';
import { CostCalculator } from './cost-calculator.js';
import { ErrorHandler } from './error-handler.js';
import { RecoveryService } from './recovery-service.js';
import { LLMClient } from './llm-client.js';
import { OutputParser } from './output-parser.js';
import { StackConstraintBuilder } from './stack-constraint-builder.js';

export interface TaskExecutionInput {
  task: ExecutionTask;
  agentId: string;
  promptId?: string;
  variables?: Record<string, string>;
  timeout?: number;
  // Context passed through to artifact saving in the caller
  runId?: string;
  phaseId?: string;
  stackConstraints?: StackConstraints;
}

export interface TaskExecutionWarning {
  code: 'STACK_CONSTRAINT_LANGUAGE_MISMATCH';
  message: string;
  detectedLanguages: string[];
  expectedLanguages: string[];
  violatingLanguages: string[];
}

export interface TaskExecutionOutput {
  taskId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  errorType?: 'transient' | 'permanent' | 'unknown';
  duration: number;
  tokensUsed?: {
    input: number;
    output: number;
  };
  cost?: CostMetrics;
  retries?: number;
  warnings?: TaskExecutionWarning[];
}

const FALLBACK_SYSTEM_PROMPT =
  'You are a software engineer. Execute the assigned task and produce detailed, ' +
  'production-ready output. Follow the provided project stack constraints when they exist. ' +
  'Project language: unspecified until the task context defines it. For code tasks, write ' +
  'complete, runnable code. For design tasks, produce clear specifications. For analysis tasks, ' +
  'provide thorough analysis.';

const LANGUAGE_ALIASES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  typescript: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  javascript: 'javascript',
  node: 'javascript',
  py: 'python',
  python: 'python',
  java: 'java',
  json: 'json',
  md: 'markdown',
  markdown: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'shell',
  bash: 'shell',
  shell: 'shell',
  ps1: 'powershell',
  powershell: 'powershell',
  sql: 'sql',
  html: 'html',
  css: 'css',
};

const LANGUAGE_LABELS: Record<string, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  json: 'JSON',
  markdown: 'Markdown',
  yaml: 'YAML',
  shell: 'Shell',
  powershell: 'PowerShell',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
};

const AUXILIARY_OUTPUT_LANGUAGES = new Set(['json', 'markdown', 'yaml']);

function normalizeLanguage(value?: string): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/^language[:\s-]*/u, '')
    .replace(/\s*\(.*\)$/u, '');

  return LANGUAGE_ALIASES[cleaned] || null;
}

function inferLanguageFromFilePath(filePath: string): string | null {
  const extension = filePath.split('.').pop()?.toLowerCase();
  return extension ? normalizeLanguage(extension) : null;
}

function formatLanguageLabel(language: string): string {
  return LANGUAGE_LABELS[language] || language;
}

export function detectOutputLanguages(output: unknown): string[] {
  const detected = new Set<string>();
  const parser = new OutputParser();

  const addLanguage = (value?: string | null) => {
    const normalized = normalizeLanguage(value || undefined);
    if (normalized) {
      detected.add(normalized);
    }
  };

  if (typeof output === 'string') {
    for (const match of output.matchAll(/```([\w+-]+)?[^\n]*\n[\s\S]*?```/g)) {
      addLanguage(match[1]);
    }
  }

  for (const artifact of parser.parseTaskOutput(output)) {
    addLanguage(artifact.language);
    addLanguage(inferLanguageFromFilePath(artifact.filePath));
  }

  return Array.from(detected);
}

export class TaskExecutor {
  private errorHandler: ErrorHandler;
  private recoveryService: RecoveryService;
  private costCalculator: CostCalculator;
  private stackConstraintBuilder: StackConstraintBuilder;

  constructor(
    private agentRegistry: AgentRegistry,
    private promptRegistry: PromptRegistry
  ) {
    this.errorHandler = new ErrorHandler();
    this.recoveryService = new RecoveryService();
    this.costCalculator = new CostCalculator();
    this.stackConstraintBuilder = new StackConstraintBuilder();
  }

  async executeTask(input: TaskExecutionInput): Promise<TaskExecutionOutput> {
    const startTime = Date.now();
    const taskId = input.task.id;

    try {
      // Validate agent
      const agent = this.agentRegistry.getAgent(input.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${input.agentId}`);
      }

      // Load and prepare prompt
      let promptContent = '';
      if (input.promptId) {
        const prompt = this.promptRegistry.getPrompt(input.promptId);
        if (!prompt) {
          throw new Error(`Prompt not found: ${input.promptId}`);
        }
        promptContent = prompt.content;
        await this.promptRegistry.recordUsage(input.promptId);
      } else {
        promptContent = agent.description || FALLBACK_SYSTEM_PROMPT;
      }

      // Substitute variables in prompt
      const finalPrompt = this.substituteVariables(promptContent, input.variables || {});

      // Execute with retry logic
      const result = await this.recoveryService.executeWithCircuitBreaker(
        () => this.runTaskExecution(taskId, agent.name, finalPrompt, input.task, input.stackConstraints),
        `task-${taskId}`
      );

      const duration = Date.now() - startTime;

      if (!result.success) {
        return {
          taskId,
          success: false,
          error: result.lastError || 'Task execution failed',
          errorType: this.errorHandler.classifyError(result.error),
          duration,
          retries: result.retryCount,
        };
      }

      const taskResult = result.data as {
        status: string;
        result?: {
          output: string;
          tokensIn?: number;
          tokensOut?: number;
        };
      };

      const tokensIn = taskResult?.result?.tokensIn ?? Math.floor(finalPrompt.length / 4);
      const tokensOut = taskResult?.result?.tokensOut ?? 0;

      const tokensUsed = { input: tokensIn, output: tokensOut };
      const cost: CostMetrics = {
        tokenInputs: tokensUsed.input,
        tokenOutputs: tokensUsed.output,
        estimatedCost: this.costCalculator.calculateTokenCost(tokensUsed.input, tokensUsed.output),
        currency: 'USD',
      };
      const warnings = this.getConstraintWarnings(
        taskResult?.result?.output ?? result.data,
        input.stackConstraints
      );

      return {
        taskId,
        success: true,
        output: result.data || { status: 'completed' },
        duration,
        tokensUsed,
        cost,
        retries: result.retryCount,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        taskId,
        success: false,
        error: this.errorHandler.getMessage(error),
        errorType: this.errorHandler.classifyError(error),
        duration,
      };
    }
  }

  private async runTaskExecution(
    taskId: string,
    agentName: string,
    systemPrompt: string,
    task: ExecutionTask,
    stackConstraints?: StackConstraints
  ): Promise<{ status: string; result?: unknown }> {
    if (LLMClient.isAvailable()) {
      return this.runWithLLM(taskId, agentName, systemPrompt, task, stackConstraints);
    }
    return this.runMock(taskId, agentName, task);
  }

  private async runWithLLM(
    taskId: string,
    agentName: string,
    systemPrompt: string,
    task: ExecutionTask,
    stackConstraints?: StackConstraints
  ): Promise<{ status: string; result?: unknown }> {
    const client = new LLMClient();
    const stackBlock = this.stackConstraintBuilder.build(stackConstraints);

    const userMessage =
      `${stackBlock}\n\n` +
      `Task: ${task.name}\n\n` +
      `Description: ${task.description}\n\n` +
      (task.estimatedHours
        ? `Estimated effort: ${task.estimatedHours} hours\n\n`
        : '') +
      `Produce complete, detailed output for this task. If this is a code task, ` +
      `write production-ready code with appropriate comments. If this is a design ` +
      `or documentation task, write thorough, actionable content.`;

    const result = await client.call({
      systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      maxTokens: 4096,
    });

    console.log(
      `[TaskExecutor] Task ${taskId} (${agentName}): ` +
        `${result.inputTokens}→${result.outputTokens} tokens, stop=${result.stopReason}`
    );

    return {
      status: 'completed',
      result: {
        taskId,
        agentName,
        taskName: task.name,
        output: result.text,
        tokensIn: result.inputTokens,
        tokensOut: result.outputTokens,
        model: result.model,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async runMock(
    taskId: string,
    agentName: string,
    task: ExecutionTask
  ): Promise<{ status: string; result?: unknown }> {
    // Simulate brief processing delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 400));

    return {
      status: 'completed',
      result: {
        taskId,
        agentName,
        taskName: task.name,
        output: `[MOCK — set ANTHROPIC_API_KEY for real output]\n\nExecuted by ${agentName}: ${task.description}`,
        tokensIn: Math.floor(task.description.length / 4),
        tokensOut: 50,
        model: 'mock',
        timestamp: new Date().toISOString(),
      },
    };
  }

  private substituteVariables(content: string, variables: Record<string, string>): string {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }
    result = result.replace(/\{\{(\w+)\}\}/g, '[UNKNOWN: $1]');
    return result;
  }

  private getConstraintWarnings(
    output: unknown,
    stackConstraints?: StackConstraints
  ): TaskExecutionWarning[] {
    if (!stackConstraints) {
      return [];
    }

    const detectedLanguages = detectOutputLanguages(output);
    const executableLanguages = detectedLanguages.filter(
      language => !AUXILIARY_OUTPUT_LANGUAGES.has(language)
    );

    if (executableLanguages.length === 0) {
      return [];
    }

    const expectedLanguages = this.getExpectedLanguages(stackConstraints);
    const disallowedLanguages = new Set(
      (stackConstraints.disallowedLanguages || [])
        .map((language: string) => normalizeLanguage(language))
        .filter((language): language is string => Boolean(language))
    );

    const violatingLanguages = Array.from(
      new Set(
        executableLanguages.filter(language => {
          if (disallowedLanguages.has(language)) {
            return true;
          }

          return expectedLanguages.size > 0 && !expectedLanguages.has(language);
        })
      )
    );

    if (violatingLanguages.length === 0) {
      return [];
    }

    const expectedLabels = Array.from(expectedLanguages).map(formatLanguageLabel);
    const disallowedMatches = violatingLanguages
      .filter(language => disallowedLanguages.has(language))
      .map(formatLanguageLabel);
    const messageParts = [
      `Detected output language mismatch: ${violatingLanguages.map(formatLanguageLabel).join(', ')}`,
    ];

    if (expectedLabels.length > 0) {
      messageParts.push(`expected ${expectedLabels.join(', ')}`);
    }

    if (disallowedMatches.length > 0) {
      messageParts.push(`explicitly disallowed ${disallowedMatches.join(', ')}`);
    }

    return [
      {
        code: 'STACK_CONSTRAINT_LANGUAGE_MISMATCH',
        message: `${messageParts.join('; ')}.`,
        detectedLanguages,
        expectedLanguages: Array.from(expectedLanguages),
        violatingLanguages,
      },
    ];
  }

  private getExpectedLanguages(stackConstraints: StackConstraints): Set<string> {
    const expected = new Set<string>();
    const primaryLanguage = normalizeLanguage(stackConstraints.language);

    if (primaryLanguage && !AUXILIARY_OUTPUT_LANGUAGES.has(primaryLanguage)) {
      expected.add(primaryLanguage);
    }

    for (const language of stackConstraints.allowedLanguages || []) {
      const normalized = normalizeLanguage(language);
      if (normalized && !AUXILIARY_OUTPUT_LANGUAGES.has(normalized)) {
        expected.add(normalized);
      }
    }

    return expected;
  }

  async getExecutionPlan(task: ExecutionTask): Promise<{
    agentSuggestions: Array<{ id: string; name: string; score: number }>;
    promptSuggestions: Array<{ id: string; name: string; relevance: number }>;
    estimatedDuration: number;
    estimatedCost: number;
  }> {
    const agents = this.agentRegistry.getAllAgents();
    const prompts = this.promptRegistry.getAllPrompts();

    const agentSuggestions = agents.slice(0, 3).map((a, i) => ({
      id: a.id,
      name: a.name,
      score: 1 - i * 0.1,
    }));

    const promptSuggestions = prompts.slice(0, 3).map((p, i) => ({
      id: p.id,
      name: p.name,
      relevance: 1 - i * 0.1,
    }));

    return {
      agentSuggestions,
      promptSuggestions,
      estimatedDuration: 1000 + Math.random() * 5000,
      estimatedCost: 0.01 + Math.random() * 0.05,
    };
  }
}
