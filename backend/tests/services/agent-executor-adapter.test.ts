import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentExecutorAdapter } from '../../src/services/agent-executor-adapter.js';
import {
  AgentExecutor,
  AgentExecutionInput,
  AgentExecutionResult,
  ExecutionContext,
} from '@unifiedaitoolbox/shared';

describe('AgentExecutorAdapter', () => {
  let mockExecutor: AgentExecutor;
  let adapter: AgentExecutorAdapter;
  let context: ExecutionContext;

  beforeEach(() => {
    mockExecutor = {
      execute: vi.fn(async (input: AgentExecutionInput): Promise<AgentExecutionResult> => {
        return {
          success: true,
          output: { result: 'test output' },
          tokensIn: 100,
          tokensOut: 50,
          durationMs: 1000,
          model: 'test-model',
        };
      }),
    };

    adapter = new AgentExecutorAdapter(mockExecutor);

    context = {
      runId: 'run-1',
      phaseId: 'phase-1',
      taskId: 'task-1',
    };
  });

  describe('Successful execution', () => {
    it('should execute successfully with valid input', async () => {
      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test prompt',
        inputData: { test: 'data' },
      };

      const result = await adapter.execute(input, context);

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ result: 'test output' });
      expect(result.context).toEqual(context);
    });

    it('should extract cost from execution result', async () => {
      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test prompt',
        inputData: {},
      };

      const result = await adapter.execute(input, context, {
        extractCosts: true,
      });

      expect(result.cost).toBeDefined();
      expect(result.cost?.tokenInputs).toBe(100);
      expect(result.cost?.tokenOutputs).toBe(50);
      expect(result.cost?.estimatedCost).toBeGreaterThan(0);
      expect(result.cost?.currency).toBe('USD');
    });

    it('should include execution duration in result', async () => {
      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test prompt',
        inputData: {},
      };

      const result = await adapter.execute(input, context);

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Input preparation', () => {
    it('should substitute variables in prompt', async () => {
      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Hello {{name}}, your age is {{age}}',
        inputData: { name: 'Alice', age: '30' },
      };

      mockExecutor.execute = vi.fn(async (executedInput) => {
        expect(executedInput.prompt).toContain('Hello Alice');
        expect(executedInput.prompt).toContain('age is 30');
        return {
          success: true,
          output: {},
          tokensIn: 100,
          tokensOut: 50,
        };
      });

      await adapter.execute(input, context);

      expect(mockExecutor.execute).toHaveBeenCalled();
    });

    it('should mark unsubstituted variables as unknown', async () => {
      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Hello {{name}}, your {{missing}}',
        inputData: { name: 'Alice' },
      };

      mockExecutor.execute = vi.fn(async (executedInput) => {
        expect(executedInput.prompt).toContain('Hello Alice');
        expect(executedInput.prompt).toContain('[UNKNOWN: missing]');
        return {
          success: true,
          output: {},
          tokensIn: 100,
          tokensOut: 50,
        };
      });

      await adapter.execute(input, context);

      expect(mockExecutor.execute).toHaveBeenCalled();
    });

    it('should handle complex data types in variable substitution', async () => {
      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Data: {{data}}',
        inputData: { data: { nested: 'object' } },
      };

      mockExecutor.execute = vi.fn(async (executedInput) => {
        expect(executedInput.prompt).toContain('nested');
        return {
          success: true,
          output: {},
          tokensIn: 100,
          tokensOut: 50,
        };
      });

      await adapter.execute(input, context);

      expect(mockExecutor.execute).toHaveBeenCalled();
    });
  });

  describe('Input validation', () => {
    it('should validate required fields', async () => {
      const input: AgentExecutionInput = {
        agentId: '',
        agentName: 'Test Agent',
        prompt: 'Test',
        inputData: {},
      };

      const result = await adapter.execute(input, context, {
        validateInput: true,
      });

      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors?.length).toBeGreaterThan(0);
    });

    it('should validate against schema if provided', async () => {
      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test',
        inputData: { name: 'Alice' },
        inputSchema: { required: ['name', 'age'] },
      };

      const result = await adapter.execute(input, context, {
        validateInput: true,
      });

      expect(result.success).toBe(false);
      expect(result.validationErrors?.some(e => e.includes('age'))).toBe(true);
    });

    it('should skip input validation if disabled', async () => {
      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test',
        inputData: {},
      };

      const result = await adapter.execute(input, context, {
        validateInput: false,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Output validation', () => {
    it('should validate output against schema', async () => {
      mockExecutor.execute = vi.fn(async () => ({
        success: true,
        output: { value: 'test' },
        tokensIn: 100,
        tokensOut: 50,
      }));

      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test',
        inputData: {},
        outputSchema: { required: ['value', 'status'] },
      };

      const result = await adapter.execute(input, context, {
        validateOutput: true,
      });

      expect(result.success).toBe(false);
      expect(result.validationErrors?.some(e => e.includes('status'))).toBe(true);
    });

    it('should reject null output', async () => {
      mockExecutor.execute = vi.fn(async () => ({
        success: true,
        output: null,
        tokensIn: 100,
        tokensOut: 50,
      }));

      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test',
        inputData: {},
      };

      const result = await adapter.execute(input, context, {
        validateOutput: true,
      });

      expect(result.success).toBe(false);
      expect(result.validationErrors?.some(e => e.includes('null'))).toBe(true);
    });

    it('should skip output validation if disabled', async () => {
      mockExecutor.execute = vi.fn(async () => ({
        success: true,
        output: null,
        tokensIn: 100,
        tokensOut: 50,
      }));

      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test',
        inputData: {},
      };

      const result = await adapter.execute(input, context, {
        validateOutput: false,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle executor failures', async () => {
      mockExecutor.execute = vi.fn(async () => ({
        success: false,
        error: 'Execution failed',
        tokensIn: 0,
        tokensOut: 0,
      }));

      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test',
        inputData: {},
      };

      const result = await adapter.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Execution failed');
    });

    it('should classify transient errors', async () => {
      mockExecutor.execute = vi.fn(async () => ({
        success: false,
        error: 'Network timeout occurred',
        tokensIn: 0,
        tokensOut: 0,
      }));

      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test',
        inputData: {},
      };

      const result = await adapter.execute(input, context);

      expect(result.errorType).toBe('transient');
    });

    it('should classify permanent errors', async () => {
      mockExecutor.execute = vi.fn(async () => ({
        success: false,
        error: 'Schema validation failed',
        tokensIn: 0,
        tokensOut: 0,
      }));

      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test',
        inputData: {},
      };

      const result = await adapter.execute(input, context);

      expect(result.errorType).toBe('permanent');
    });

    it('should catch thrown exceptions', async () => {
      mockExecutor.execute = vi.fn(async () => {
        throw new Error('Unexpected executor error');
      });

      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test',
        inputData: {},
      };

      const result = await adapter.execute(input, context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected executor error');
    });
  });

  describe('Timeout handling', () => {
    it('should enforce execution timeout', async () => {
      mockExecutor.execute = vi.fn(
        async () =>
          new Promise(resolve => {
            setTimeout(
              () =>
                resolve({
                  success: true,
                  output: {},
                  tokensIn: 100,
                  tokensOut: 50,
                }),
              2000
            );
          })
      );

      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test',
        inputData: {},
      };

      const result = await adapter.execute(input, context, {
        timeout: 100, // 100ms timeout
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Cost extraction', () => {
    it('should skip cost extraction if disabled', async () => {
      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test',
        inputData: {},
      };

      const result = await adapter.execute(input, context, {
        extractCosts: false,
      });

      expect(result.cost).toBeUndefined();
    });

    it('should calculate costs based on tokens and duration', async () => {
      mockExecutor.execute = vi.fn(async () => ({
        success: true,
        output: { result: 'test' },
        tokensIn: 200,
        tokensOut: 100,
        durationMs: 2000,
      }));

      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test',
        inputData: {},
      };

      const result = await adapter.execute(input, context, {
        extractCosts: true,
      });

      expect(result.cost).toBeDefined();
      expect(result.cost?.tokenInputs).toBe(200);
      expect(result.cost?.tokenOutputs).toBe(100);
      expect(result.cost?.estimatedCost).toBeGreaterThan(0);
    });
  });

  describe('Execution report', () => {
    it('should create execution report', async () => {
      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test',
        inputData: {},
      };

      const executionResult = await adapter.execute(input, context, {
        extractCosts: true,
      });

      const report = adapter.createExecutionReport(executionResult);

      expect(report.success).toBe(true);
      expect(report.duration).toBeGreaterThanOrEqual(0);
      expect(report.cost).toBeGreaterThan(0);
      expect(report.context).toEqual(context);
    });
  });

  describe('Timeout recommendations', () => {
    it('should return default timeout', () => {
      const timeout = adapter.getRecommendedTimeout();
      expect(timeout).toBe(30000); // 30 seconds
    });

    it('should return agent-specific timeout', () => {
      const codeGenTimeout = adapter.getRecommendedTimeout('code-generation');
      expect(codeGenTimeout).toBe(60000); // 60 seconds

      const validationTimeout = adapter.getRecommendedTimeout('validation');
      expect(validationTimeout).toBe(20000); // 20 seconds
    });

    it('should return default timeout for unknown agent type', () => {
      const timeout = adapter.getRecommendedTimeout('unknown-type');
      expect(timeout).toBe(30000);
    });
  });

  describe('Context loading', () => {
    it('should use context loader when provided', async () => {
      const contextLoader = vi.fn(async () => ({ contextData: 'loaded' }));
      const adapterWithLoader = new AgentExecutorAdapter(mockExecutor, contextLoader);

      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Data: {{contextData}}',
        inputData: {},
      };

      mockExecutor.execute = vi.fn(async (executedInput) => {
        expect(executedInput.prompt).toContain('loaded');
        return {
          success: true,
          output: {},
          tokensIn: 100,
          tokensOut: 50,
        };
      });

      await adapterWithLoader.execute(input, context);

      expect(contextLoader).toHaveBeenCalledWith(context);
    });

    it('should continue without context loader', async () => {
      const input: AgentExecutionInput = {
        agentId: 'agent-1',
        agentName: 'Test Agent',
        prompt: 'Test prompt',
        inputData: {},
      };

      const result = await adapter.execute(input, context);

      expect(result.success).toBe(true);
    });
  });
});
