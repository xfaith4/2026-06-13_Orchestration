import { describe, it, expect, beforeEach } from 'vitest';
import { RepairStrategist } from '../../src/services/repair-strategist.js';
import { FailureClassification } from '@unifiedaitoolbox/shared';

describe('RepairStrategist', () => {
  let strategist: RepairStrategist;

  beforeEach(() => {
    strategist = new RepairStrategist();
  });

  const createClassification = (): FailureClassification => ({
    failureType: 'command_failed',
    severity: 'high',
    errorType: 'permanent',
    confidence: 0.9,
    evidence: ['Test evidence'],
  });

  describe('Repair options generation', () => {
    it('should generate options for requirements_missing', () => {
      const options = strategist.getRepairOptions(
        'requirements_missing',
        createClassification(),
        'test-task'
      );

      expect(options.length).toBeGreaterThan(0);
      expect(options.some(o => o.strategy === 'repair')).toBe(true);
      expect(options.some(o => o.strategy === 'escalate')).toBe(true);
    });

    it('should generate options for schema_invalid', () => {
      const options = strategist.getRepairOptions(
        'schema_invalid',
        createClassification(),
        'test-task'
      );

      expect(options.length).toBeGreaterThan(0);
      expect(options.some(o => o.strategy === 'repair')).toBe(true);
    });

    it('should generate options for tool_denied', () => {
      const options = strategist.getRepairOptions(
        'tool_denied',
        createClassification(),
        'test-task'
      );

      expect(options.length).toBeGreaterThan(0);
      expect(options.some(o => o.strategy === 'escalate')).toBe(true);
    });

    it('should generate options for command_failed', () => {
      const options = strategist.getRepairOptions(
        'command_failed',
        createClassification(),
        'test-task'
      );

      expect(options.length).toBeGreaterThan(0);
      expect(options.some(o => o.strategy === 'retry')).toBe(true);
    });

    it('should generate options for env_missing', () => {
      const options = strategist.getRepairOptions(
        'env_missing',
        createClassification(),
        'test-task'
      );

      expect(options.length).toBeGreaterThan(0);
      expect(options.some(o => o.strategy === 'repair')).toBe(true);
    });

    it('should generate options for dependency_unavailable', () => {
      const options = strategist.getRepairOptions(
        'dependency_unavailable',
        createClassification(),
        'test-task'
      );

      expect(options.length).toBeGreaterThan(0);
      expect(options.some(o => o.strategy === 'repair')).toBe(true);
    });

    it('should generate options for test_failed', () => {
      const options = strategist.getRepairOptions(
        'test_failed',
        createClassification(),
        'test-task'
      );

      expect(options.length).toBeGreaterThan(0);
      expect(options.some(o => o.strategy === 'repair')).toBe(true);
    });

    it('should generate options for merge_conflict', () => {
      const options = strategist.getRepairOptions(
        'merge_conflict',
        createClassification(),
        'test-task'
      );

      expect(options.length).toBeGreaterThan(0);
      expect(options.some(o => o.strategy === 'manual')).toBe(true);
    });

    it('should generate options for scope_violation', () => {
      const options = strategist.getRepairOptions(
        'scope_violation',
        createClassification(),
        'test-task'
      );

      expect(options.length).toBeGreaterThan(0);
      expect(options.some(o => o.strategy === 'escalate')).toBe(true);
    });

    it('should generate options for low_confidence', () => {
      const options = strategist.getRepairOptions(
        'low_confidence',
        createClassification(),
        'test-task'
      );

      expect(options.length).toBeGreaterThan(0);
      expect(options.some(o => o.strategy === 'manual')).toBe(true);
    });

    it('should generate options for human_approval_required', () => {
      const options = strategist.getRepairOptions(
        'human_approval_required',
        createClassification(),
        'test-task'
      );

      expect(options.length).toBeGreaterThan(0);
      expect(options.some(o => o.strategy === 'manual')).toBe(true);
    });

    it('should sort options by priority', () => {
      const options = strategist.getRepairOptions(
        'command_failed',
        createClassification(),
        'test-task'
      );

      for (let i = 0; i < options.length - 1; i++) {
        expect(options[i].priority).toBeGreaterThanOrEqual(options[i + 1].priority);
      }
    });

    it('should include descriptions for all options', () => {
      const options = strategist.getRepairOptions(
        'command_failed',
        createClassification(),
        'test-task'
      );

      options.forEach(option => {
        expect(option.description).toBeDefined();
        expect(option.description.length).toBeGreaterThan(0);
      });
    });

    it('should include risk levels', () => {
      const options = strategist.getRepairOptions(
        'command_failed',
        createClassification(),
        'test-task'
      );

      options.forEach(option => {
        expect(['low', 'medium', 'high']).toContain(option.riskLevel);
      });
    });
  });

  describe('Strategy selection', () => {
    it('should select best strategy when retries available', () => {
      const options = strategist.getRepairOptions(
        'command_failed',
        createClassification(),
        'test-task'
      );

      const strategy = strategist.selectBestStrategy(options, 0, 3);

      expect(strategy).toBeDefined();
      expect(['retry', 'repair', 'escalate', 'manual', 'skip']).toContain(strategy);
    });

    it('should escalate when retries exhausted', () => {
      const options = strategist.getRepairOptions(
        'command_failed',
        createClassification(),
        'test-task'
      );

      const strategy = strategist.selectBestStrategy(options, 3, 3);

      expect(['escalate', 'manual']).toContain(strategy);
    });

    it('should pick highest priority strategy', () => {
      const options = strategist.getRepairOptions(
        'command_failed',
        createClassification(),
        'test-task'
      );

      const strategy = strategist.selectBestStrategy(options, 0, 3);
      const selectedOption = options.find(o => o.strategy === strategy);

      expect(selectedOption?.priority).toBe(options[0].priority);
    });
  });

  describe('Max retries determination', () => {
    it('should return max retries for command_failed', () => {
      const maxRetries = strategist.getMaxRetries('command_failed');

      expect(maxRetries).toBeGreaterThan(0);
      expect(maxRetries).toBeLessThanOrEqual(3);
    });

    it('should allow no retries for scope_violation', () => {
      const maxRetries = strategist.getMaxRetries('scope_violation');

      expect(maxRetries).toBe(0);
    });

    it('should allow limited retries for schema_invalid', () => {
      const maxRetries = strategist.getMaxRetries('schema_invalid');

      expect(maxRetries).toBeLessThan(3);
    });

    it('should allow retries for test_failed', () => {
      const maxRetries = strategist.getMaxRetries('test_failed');

      expect(maxRetries).toBeGreaterThan(0);
    });

    it('should disallow retries for human_approval_required', () => {
      const maxRetries = strategist.getMaxRetries('human_approval_required');

      expect(maxRetries).toBe(0);
    });
  });

  describe('Strategy properties', () => {
    it('should identify retryable strategies', () => {
      expect(strategist.isRetryable('retry')).toBe(true);
      expect(strategist.isRetryable('repair')).toBe(true);
      expect(strategist.isRetryable('escalate')).toBe(false);
      expect(strategist.isRetryable('manual')).toBe(false);
      expect(strategist.isRetryable('skip')).toBe(false);
    });

    it('should identify escalatable strategies', () => {
      expect(strategist.isEscalatable('escalate')).toBe(true);
      expect(strategist.isEscalatable('manual')).toBe(true);
      expect(strategist.isEscalatable('retry')).toBe(false);
      expect(strategist.isEscalatable('repair')).toBe(false);
      expect(strategist.isEscalatable('skip')).toBe(false);
    });

    it('should identify skippable failure types', () => {
      expect(strategist.canSkip('low_confidence')).toBe(true);
      expect(strategist.canSkip('tool_denied')).toBe(true);
      expect(strategist.canSkip('scope_violation')).toBe(true);
      expect(strategist.canSkip('human_approval_required')).toBe(true);
      expect(strategist.canSkip('command_failed')).toBe(false);
    });
  });

  describe('Option prerequisites and instructions', () => {
    it('should include prerequisites for repair strategies', () => {
      const options = strategist.getRepairOptions(
        'requirements_missing',
        createClassification(),
        'test-task'
      );

      const repairOption = options.find(o => o.strategy === 'repair');
      expect(repairOption?.prerequisites).toBeDefined();
      expect(repairOption?.prerequisites?.length).toBeGreaterThan(0);
    });

    it('should include instructions for complex repairs', () => {
      const options = strategist.getRepairOptions(
        'merge_conflict',
        createClassification(),
        'test-task'
      );

      const repairOption = options.find(o => o.strategy === 'manual');
      expect(repairOption?.instructions).toBeDefined();
      expect(repairOption?.instructions?.length).toBeGreaterThan(0);
    });

    it('should include estimated duration for time-consuming operations', () => {
      const options = strategist.getRepairOptions(
        'dependency_unavailable',
        createClassification(),
        'test-task'
      );

      const repairOption = options.find(o => o.strategy === 'repair');
      expect(repairOption?.estimatedDuration).toBeDefined();
      expect(repairOption?.estimatedDuration).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle unknown failure types gracefully', () => {
      const options = strategist.getRepairOptions(
        'unknown_type' as any,
        createClassification(),
        'test-task'
      );

      expect(options.length).toBeGreaterThan(0);
      expect(options.some(o => o.strategy === 'retry')).toBe(true);
    });

    it('should handle empty options list in strategy selection', () => {
      const strategy = strategist.selectBestStrategy([], 0, 3);

      expect(strategy).toBeDefined();
    });

    it('should respect max retry limits', () => {
      const options = strategist.getRepairOptions(
        'tool_denied',
        createClassification(),
        'test-task'
      );

      const maxRetries = strategist.getMaxRetries('tool_denied');
      const strategy = strategist.selectBestStrategy(options, maxRetries, maxRetries);

      expect(['escalate', 'manual']).toContain(strategy);
    });
  });
});
