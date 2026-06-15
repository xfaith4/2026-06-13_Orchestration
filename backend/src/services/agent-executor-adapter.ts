import {
  AgentExecutor,
  AgentExecutionInput,
  AgentExecutionResult,
  ExecutionContext,
  AdapterExecutionOptions,
  CostMetrics,
  ErrorType,
} from '@unifiedaitoolbox/shared';
import { ErrorHandler } from './error-handler.js';
import { CostCalculator } from './cost-calculator.js';

export interface AdaptedExecutionResult extends AgentExecutionResult {
  context: ExecutionContext;
  cost?: CostMetrics;
  validationErrors?: string[];
}

export class AgentExecutorAdapter {
  private errorHandler: ErrorHandler;
  private costCalculator: CostCalculator;

  constructor(
    private executor: AgentExecutor,
    private contextLoader?: (context: ExecutionContext) => Promise<Record<string, unknown>>
  ) {
    this.errorHandler = new ErrorHandler();
    this.costCalculator = new CostCalculator();
  }

  async execute(
    input: AgentExecutionInput,
    context: ExecutionContext,
    options: AdapterExecutionOptions = {}
  ): Promise<AdaptedExecutionResult> {
    const startTime = Date.now();
    const defaultOptions: AdapterExecutionOptions = {
      timeout: 30000,
      validateInput: true,
      validateOutput: true,
      extractCosts: true,
      retryOnValidationFailure: false,
      ...options,
    };

    try {
      // Step 1: Load execution context
      const contextData = await this.loadContext(context);

      // Step 2: Prepare input (substitute variables, merge context)
      const preparedInput = await this.prepareInput(input, contextData);

      // Step 3: Validate input if enabled
      const inputValidationErrors = defaultOptions.validateInput
        ? this.validateInput(preparedInput, input.inputSchema)
        : [];

      if (inputValidationErrors.length > 0 && !defaultOptions.retryOnValidationFailure) {
        return {
          success: false,
          context,
          error: `Input validation failed: ${inputValidationErrors.join(', ')}`,
          errorType: 'permanent',
          errorCode: 'VALIDATION_ERROR',
          validationErrors: inputValidationErrors,
          durationMs: Date.now() - startTime,
        };
      }

      // Step 4: Execute via agent executor
      const executionResult = await this.executeWithTimeout(
        preparedInput,
        defaultOptions.timeout!
      );

      const duration = Date.now() - startTime;

      if (!executionResult.success) {
        return {
          ...executionResult,
          context,
          durationMs: duration,
          errorType: this.classifyExecutionError(executionResult.error),
        };
      }

      // Step 5: Validate output if enabled
      const outputValidationErrors = defaultOptions.validateOutput
        ? this.validateOutput(executionResult.output, input.outputSchema)
        : [];

      if (outputValidationErrors.length > 0) {
        return {
          success: false,
          context,
          output: executionResult.output,
          error: `Output validation failed: ${outputValidationErrors.join(', ')}`,
          errorType: 'permanent',
          errorCode: 'OUTPUT_VALIDATION_ERROR',
          validationErrors: outputValidationErrors,
          durationMs: duration,
          tokensIn: executionResult.tokensIn,
          tokensOut: executionResult.tokensOut,
        };
      }

      // Step 6: Extract costs if enabled
      let cost: CostMetrics | undefined;
      if (defaultOptions.extractCosts) {
        cost = this.extractCost(
          executionResult.tokensIn || 0,
          executionResult.tokensOut || 0,
          duration
        );
      }

      return {
        success: true,
        context,
        output: executionResult.output,
        tokensIn: executionResult.tokensIn,
        tokensOut: executionResult.tokensOut,
        durationMs: duration,
        model: executionResult.model,
        cost,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';

      return {
        success: false,
        context,
        error: errorMessage,
        errorType: this.errorHandler.classifyError(error),
        errorCode: this.errorHandler.getErrorCode(error),
        durationMs: duration,
      };
    }
  }

  private async loadContext(context: ExecutionContext): Promise<Record<string, unknown>> {
    if (!this.contextLoader) {
      return {};
    }

    try {
      return await this.contextLoader(context);
    } catch (error) {
      throw new Error(
        `Failed to load context: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async prepareInput(
    input: AgentExecutionInput,
    contextData: Record<string, unknown>
  ): Promise<AgentExecutionInput> {
    // Merge context data with input data
    const mergedData = {
      ...contextData,
      ...input.inputData,
    };

    // Substitute variables in prompt using {{variable}} syntax
    const interpolatedPrompt = this.interpolatePrompt(input.prompt, mergedData);

    return {
      ...input,
      prompt: interpolatedPrompt,
      inputData: mergedData,
    };
  }

  private interpolatePrompt(prompt: string, variables: Record<string, unknown>): string {
    let result = prompt;

    // Replace {{variable}} patterns
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      result = result.replace(regex, stringValue);
    }

    // Mark any unsubstituted variables as unknown
    result = result.replace(/\{\{(\w+)\}\}/g, '[UNKNOWN: $1]');

    return result;
  }

  private validateInput(
    input: AgentExecutionInput,
    schema?: Record<string, unknown>
  ): string[] {
    const errors: string[] = [];

    // Basic validation
    if (!input.agentId) {
      errors.push('Missing required field: agentId');
    }
    if (!input.agentName) {
      errors.push('Missing required field: agentName');
    }
    if (!input.prompt) {
      errors.push('Missing required field: prompt');
    }

    // Schema validation (if provided)
    if (schema) {
      errors.push(...this.validateAgainstSchema(input.inputData, schema));
    }

    return errors;
  }

  private validateOutput(output: unknown, schema?: Record<string, unknown>): string[] {
    const errors: string[] = [];

    if (output === null || output === undefined) {
      errors.push('Output is null or undefined');
    }

    if (schema && typeof output === 'object') {
      errors.push(...this.validateAgainstSchema(output as Record<string, unknown>, schema));
    }

    return errors;
  }

  private validateAgainstSchema(
    data: Record<string, unknown>,
    schema: Record<string, unknown>
  ): string[] {
    const errors: string[] = [];
    const schemaObj = schema as Record<string, unknown> & { required?: string[] };

    // Check required fields
    if (schemaObj.required && Array.isArray(schemaObj.required)) {
      for (const requiredField of schemaObj.required) {
        if (!(requiredField in data)) {
          errors.push(`Missing required field: ${requiredField}`);
        }
      }
    }

    return errors;
  }

  private extractCost(tokensIn: number, tokensOut: number, durationMs: number): CostMetrics {
    const tokenCost = this.costCalculator.calculateTokenCost(tokensIn, tokensOut);
    const executionCost = this.costCalculator.calculateExecutionTimeCost(durationMs);

    return {
      tokenInputs: tokensIn,
      tokenOutputs: tokensOut,
      estimatedCost: tokenCost + executionCost,
      currency: 'USD',
    };
  }

  private async executeWithTimeout(
    input: AgentExecutionInput,
    timeoutMs: number
  ): Promise<AgentExecutionResult> {
    return Promise.race([
      this.executor.execute(input),
      this.createTimeoutPromise(timeoutMs),
    ]);
  }

  private createTimeoutPromise(timeoutMs: number): Promise<AgentExecutionResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Execution timeout: exceeded ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  private classifyExecutionError(error?: string): ErrorType {
    if (!error) {
      return 'unknown';
    }

    const lowerError = error.toLowerCase();

    if (
      lowerError.includes('timeout') ||
      lowerError.includes('network') ||
      lowerError.includes('econnrefused') ||
      lowerError.includes('econnreset')
    ) {
      return 'transient';
    }

    if (
      lowerError.includes('validation') ||
      lowerError.includes('schema') ||
      lowerError.includes('invalid')
    ) {
      return 'permanent';
    }

    return 'unknown';
  }

  // Utility: Get recommended timeout for agent
  getRecommendedTimeout(agentType?: string): number {
    // Different agent types may have different timeout requirements
    const defaultTimeout = 30000; // 30 seconds

    if (!agentType) {
      return defaultTimeout;
    }

    const timeoutMap: Record<string, number> = {
      'code-generation': 60000, // 60 seconds for code gen
      'analysis': 45000, // 45 seconds for analysis
      'planning': 40000, // 40 seconds for planning
      'validation': 20000, // 20 seconds for validation
    };

    return timeoutMap[agentType] || defaultTimeout;
  }

  // Utility: Create execution report
  createExecutionReport(result: AdaptedExecutionResult): {
    success: boolean;
    duration: number;
    cost?: number;
    errorType?: ErrorType | string;
    validationErrors?: string[];
    context: ExecutionContext;
  } {
    return {
      success: result.success,
      duration: result.durationMs || 0,
      cost: result.cost?.estimatedCost,
      errorType: result.errorType,
      validationErrors: result.validationErrors,
      context: result.context,
    };
  }
}
