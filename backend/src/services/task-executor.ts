import { ExecutionTask, CostMetrics } from '@unifiedaitoolbox/shared';
import { AgentRegistry } from './agent-registry.js';
import { PromptRegistry } from './prompt-registry.js';
import { CostCalculator } from './cost-calculator.js';
import { ErrorHandler } from './error-handler.js';
import { RecoveryService } from './recovery-service.js';
import { LLMClient } from './llm-client.js';

export interface TaskExecutionInput {
  task: ExecutionTask;
  agentId: string;
  promptId?: string;
  variables?: Record<string, string>;
  timeout?: number;
  // Context passed through to artifact saving in the caller
  runId?: string;
  phaseId?: string;
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
}

const FALLBACK_SYSTEM_PROMPT =
  'You are a software engineer. Execute the assigned task and produce detailed, ' +
  'production-ready output. For code tasks, write complete, runnable code. ' +
  'For design tasks, produce clear specifications. For analysis tasks, provide thorough analysis.';

export class TaskExecutor {
  private errorHandler: ErrorHandler;
  private recoveryService: RecoveryService;
  private costCalculator: CostCalculator;

  constructor(
    private agentRegistry: AgentRegistry,
    private promptRegistry: PromptRegistry
  ) {
    this.errorHandler = new ErrorHandler();
    this.recoveryService = new RecoveryService();
    this.costCalculator = new CostCalculator();
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
        () => this.runTaskExecution(taskId, agent.name, finalPrompt, input.task),
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

      return {
        taskId,
        success: true,
        output: result.data || { status: 'completed' },
        duration,
        tokensUsed,
        cost,
        retries: result.retryCount,
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
    task: ExecutionTask
  ): Promise<{ status: string; result?: unknown }> {
    if (LLMClient.isAvailable()) {
      return this.runWithLLM(taskId, agentName, systemPrompt, task);
    }
    return this.runMock(taskId, agentName, task);
  }

  private async runWithLLM(
    taskId: string,
    agentName: string,
    systemPrompt: string,
    task: ExecutionTask
  ): Promise<{ status: string; result?: unknown }> {
    const client = new LLMClient();

    const userMessage =
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
