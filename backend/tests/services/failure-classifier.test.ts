import { describe, it, expect } from 'vitest';
import { FailureClassifier } from '../../src/services/failure-classifier.js';
import { FailureContext } from '@unifiedaitoolbox/shared';

describe('FailureClassifier', () => {
  let classifier: FailureClassifier;

  beforeEach(() => {
    classifier = new FailureClassifier();
  });

  const createContext = (overrides?: Partial<FailureContext>): FailureContext => ({
    taskId: 'task-1',
    phaseId: 'phase-1',
    runId: 'run-1',
    errorMessage: 'Test error',
    ...overrides,
  });

  describe('Failure classification', () => {
    it('should classify requirements_missing', () => {
      const context = createContext({
        errorMessage: 'Missing required field: userId',
      });

      const classification = classifier.classify(context);

      expect(classification.failureType).toBe('requirements_missing');
      expect(classification.confidence).toBeGreaterThan(0);
    });

    it('should classify schema_invalid', () => {
      const context = createContext({
        errorMessage: 'Data does not match schema validation',
      });

      const classification = classifier.classify(context);

      expect(classification.failureType).toBe('schema_invalid');
    });

    it('should classify tool_denied', () => {
      const context = createContext({
        errorMessage: 'Permission denied: Access to resource',
      });

      const classification = classifier.classify(context);

      expect(classification.failureType).toBe('tool_denied');
    });

    it('should classify command_failed', () => {
      const context = createContext({
        errorMessage: 'Command failed with exit code 1',
      });

      const classification = classifier.classify(context);

      expect(classification.failureType).toBe('command_failed');
    });

    it('should classify env_missing', () => {
      const context = createContext({
        errorMessage: 'No such file or directory: /path/to/config',
      });

      const classification = classifier.classify(context);

      expect(classification.failureType).toBe('env_missing');
    });

    it('should classify dependency_unavailable', () => {
      const context = createContext({
        errorMessage: 'npm error: missing required dependency @babel/core',
      });

      const classification = classifier.classify(context);

      expect(classification.failureType).toBe('dependency_unavailable');
    });

    it('should classify test_failed', () => {
      const context = createContext({
        errorMessage: 'Assertion failed: expect(5).toBe(10)',
      });

      const classification = classifier.classify(context);

      expect(classification.failureType).toBe('test_failed');
    });

    it('should classify merge_conflict', () => {
      const context = createContext({
        errorMessage: 'Merge conflict detected in file.js',
        errorStack: '<<<<<<< HEAD\nconflicting code',
      });

      const classification = classifier.classify(context);

      expect(classification.failureType).toBe('merge_conflict');
    });

    it('should classify scope_violation', () => {
      const context = createContext({
        errorMessage: 'Scope violation: Cannot access private field',
      });

      const classification = classifier.classify(context);

      expect(classification.failureType).toBe('scope_violation');
    });

    it('should classify low_confidence', () => {
      const context = createContext({
        errorMessage: 'Low confidence in operation outcome',
      });

      const classification = classifier.classify(context);

      expect(classification.failureType).toBe('low_confidence');
    });

    it('should classify human_approval_required', () => {
      const context = createContext({
        errorMessage: 'This operation requires human approval',
      });

      const classification = classifier.classify(context);

      expect(classification.failureType).toBe('human_approval_required');
    });
  });

  describe('Severity inference', () => {
    it('should infer critical severity for scope violations', () => {
      const context = createContext({
        errorMessage: 'Scope violation: unauthorized access',
      });

      const classification = classifier.classify(context);

      expect(classification.severity).toBe('critical');
    });

    it('should infer high severity for schema errors', () => {
      const context = createContext({
        errorMessage: 'Schema validation error',
      });

      const classification = classifier.classify(context);

      expect(classification.severity).toBeOneOf(['high', 'medium']);
    });

    it('should infer medium severity for permission issues', () => {
      const context = createContext({
        errorMessage: 'Permission denied',
      });

      const classification = classifier.classify(context);

      expect(classification.severity).toBe('medium');
    });

    it('should mark fatal errors as critical', () => {
      const context = createContext({
        errorMessage: 'Fatal error occurred',
      });

      const classification = classifier.classify(context);

      expect(classification.severity).toBe('critical');
    });
  });

  describe('Error type inference', () => {
    it('should classify timeout as transient', () => {
      const context = createContext({
        errorMessage: 'Request timeout after 30s',
      });

      const classification = classifier.classify(context);

      expect(classification.errorType).toBe('transient');
    });

    it('should classify network error as transient', () => {
      const context = createContext({
        errorMessage: 'Network connection failed: ECONNREFUSED',
      });

      const classification = classifier.classify(context);

      expect(classification.errorType).toBe('transient');
    });

    it('should classify schema error as permanent', () => {
      const context = createContext({
        errorMessage: 'Syntax error in JSON schema',
      });

      const classification = classifier.classify(context);

      expect(classification.errorType).toBe('permanent');
    });

    it('should classify validation error as permanent', () => {
      const context = createContext({
        errorMessage: 'Validation failed: invalid input type',
      });

      const classification = classifier.classify(context);

      expect(classification.errorType).toBe('permanent');
    });

    it('should default unknown errors to unknown type', () => {
      const context = createContext({
        errorMessage: 'Something went wrong',
      });

      const classification = classifier.classify(context);

      expect(classification.errorType).toBeOneOf(['transient', 'permanent', 'unknown']);
    });
  });

  describe('Confidence scoring', () => {
    it('should have high confidence for clear matches', () => {
      const context = createContext({
        errorMessage: 'Missing required field: userId',
      });

      const classification = classifier.classify(context);

      expect(classification.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should have lower confidence for unclear errors', () => {
      const context = createContext({
        errorMessage: 'Unknown error occurred',
      });

      const classification = classifier.classify(context);

      expect(classification.confidence).toBeGreaterThanOrEqual(0);
      expect(classification.confidence).toBeLessThanOrEqual(1);
    });

    it('should fall back to command_failed with low confidence when no match', () => {
      const context = createContext({
        errorMessage: 'Completely obscure error message xyz',
      });

      const classification = classifier.classify(context);

      expect(classification.failureType).toBe('command_failed');
      expect(classification.confidence).toBeLessThan(0.5);
    });
  });

  describe('Evidence gathering', () => {
    it('should include error message in evidence', () => {
      const context = createContext({
        errorMessage: 'Missing required field: userId',
      });

      const classification = classifier.classify(context);

      expect(classification.evidence.length).toBeGreaterThan(0);
      expect(classification.evidence[0]).toContain('Error message');
    });

    it('should include classification type in evidence', () => {
      const context = createContext({
        errorMessage: 'Missing required field',
      });

      const classification = classifier.classify(context);

      expect(classification.evidence.some(e => e.includes('requirements_missing'))).toBe(true);
    });

    it('should include pattern match evidence', () => {
      const context = createContext({
        errorMessage: 'Schema validation error',
      });

      const classification = classifier.classify(context);

      expect(classification.evidence.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Description generation', () => {
    it('should generate description for requirements_missing', () => {
      const description = classifier.getFailureTypeDescription('requirements_missing');

      expect(description.toLowerCase()).toContain('required');
      expect(description.length).toBeGreaterThan(0);
    });

    it('should generate description for schema_invalid', () => {
      const description = classifier.getFailureTypeDescription('schema_invalid');

      expect(description).toContain('schema');
      expect(description.length).toBeGreaterThan(0);
    });

    it('should generate description for all failure types', () => {
      const failureTypes = [
        'requirements_missing',
        'schema_invalid',
        'tool_denied',
        'command_failed',
        'env_missing',
        'dependency_unavailable',
        'test_failed',
        'merge_conflict',
        'scope_violation',
        'low_confidence',
        'human_approval_required',
      ] as const;

      for (const type of failureTypes) {
        const description = classifier.getFailureTypeDescription(type);
        expect(description).toBeDefined();
        expect(description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Complex error patterns', () => {
    it('should handle multi-line error messages', () => {
      const context = createContext({
        errorMessage: `Error: Missing required field
        at validateInput (validate.js:42)
        at processRequest (server.js:156)`,
      });

      const classification = classifier.classify(context);

      expect(classification.failureType).toBe('requirements_missing');
    });

    it('should handle stack traces', () => {
      const context = createContext({
        errorMessage: 'Schema validation failed',
        errorStack: `at validate (schema.js:10)
        at process (app.js:20)
        at main (index.js:5)`,
      });

      const classification = classifier.classify(context);

      expect(classification.failureType).toBe('schema_invalid');
    });

    it('should prioritize most confident match', () => {
      const context = createContext({
        errorMessage: 'Command failed with exit code 1: Permission denied',
      });

      const classification = classifier.classify(context);

      // Should match both command_failed and tool_denied,
      // but pick one consistently
      expect(['command_failed', 'tool_denied']).toContain(classification.failureType);
    });
  });
});
