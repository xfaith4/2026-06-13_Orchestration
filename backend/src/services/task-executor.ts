import { ExecutionTask, CostMetrics } from '@unifiedaitoolbox/shared';
import { AgentRegistry } from './agent-registry.js';
import { PromptRegistry } from './prompt-registry.js';
import { CostCalculator } from './cost-calculator.js';
import { ErrorHandler } from './error-handler.js';
import { RecoveryService, RetryResult } from './recovery-service.js';

export interface TaskExecutionInput {
  task: ExecutionTask;
  agentId: string;
  promptId?: string;
  variables?: Record<string, string>;
  timeout?: number;
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

  // Execute a single task
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

        // Record prompt usage
        await this.promptRegistry.recordUsage(input.promptId);
      } else {
        // Use agent's default prompt or description
        promptContent = agent.description || 'Execute the following task';
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

      // Calculate cost (mock implementation)
      const tokensUsed = {
        input: Math.floor(finalPrompt.length / 4), // Rough estimation
        output: 100, // Mock output tokens
      };

      const cost = {
        tokenInputs: tokensUsed.input,
        tokenOutputs: tokensUsed.output,
        estimatedCost: this.costCalculator.calculateTokenCost(
          tokensUsed.input,
          tokensUsed.output
        ),
        currency: 'USD' as const,
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

  // Mock task execution (in real implementation, would call actual agent)
  private async runTaskExecution(
    taskId: string,
    agentName: string,
    prompt: string,
    task: ExecutionTask
  ): Promise<{ status: string; result?: unknown }> {
    // Simulate execution with slight delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));

    // Simulate success/failure ratio (90% success)
    if (Math.random() < 0.9) {
      return {
        status: 'completed',
        result: {
          taskId,
          agentName,
          taskName: task.name,
          output: `Executed by ${agentName}: ${task.description}`,
          timestamp: new Date().toISOString(),
        },
      };
    } else {
      throw new Error(`Task execution failed: ${task.name}`);
    }
  }

  // Substitute variables in prompt content
  private substituteVariables(
    content: string,
    variables: Record<string, string>
  ): string {
    let result = content;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, value);
    }

    // Replace any unsubstituted variables with placeholder
    result = result.replace(/\{\{(\w+)\}\}/g, '[UNKNOWN: $1]');

    return result;
  }

  // Get execution recommendations
  async getExecutionPlan(task: ExecutionTask): Promise<{
    agentSuggestions: Array<{ id: string; name: string; score: number }>;
    promptSuggestions: Array<{ id: string; name: string; relevance: number }>;
    estimatedDuration: number;
    estimatedCost: number;
  }> {
    // Mock implementation
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
