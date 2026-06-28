import { describe, it, expect, beforeEach } from 'vitest';
import { HandoffValidator } from '@fuhrhaus/orchestration-core';
import { HandoffContract } from '@unifiedaitoolbox/shared';

describe('HandoffValidator', () => {
  let validator: HandoffValidator;
  let designContract: HandoffContract;
  let engineeringContract: HandoffContract;

  beforeEach(() => {
    validator = new HandoffValidator();

    designContract = {
      id: 'contract-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0',
      fromAgent: 'design-agent',
      toAgent: 'engineering-agent',
      trigger: 'design_complete',
      preconditions: [
        { field: 'architecture', condition: 'non-empty', expectedType: 'string' },
        { field: 'components', condition: 'non-null', expectedType: 'object' },
      ],
      payloadSchema: {
        required: ['architecture', 'components', 'tradeoffs'],
      },
      failureRoute: 'repair',
      repairSuggestions: ['Ensure architecture field is non-empty', 'Check components object'],
    };

    engineeringContract = {
      id: 'contract-2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0',
      fromAgent: 'engineering-agent',
      toAgent: 'testing-agent',
      trigger: 'code_complete',
      preconditions: [
        { field: 'codeFiles', condition: 'non-empty', expectedType: 'object' },
        { field: 'buildStatus', condition: 'non-null', expectedType: 'string' },
      ],
      payloadSchema: {
        required: ['codeFiles', 'buildStatus', 'testCoverage'],
      },
      failureRoute: 'escalate',
      repairSuggestions: [],
    };

    validator.registerContracts([designContract, engineeringContract]);
  });

  describe('Contract registration', () => {
    it('should register a single contract', () => {
      const newValidator = new HandoffValidator();
      newValidator.registerContract(designContract);

      const found = newValidator.findContract('design-agent', 'engineering-agent');
      expect(found).toBeDefined();
      expect(found?.fromAgent).toBe('design-agent');
    });

    it('should register multiple contracts', () => {
      const newValidator = new HandoffValidator();
      newValidator.registerContracts([designContract, engineeringContract]);

      expect(newValidator.findContract('design-agent', 'engineering-agent')).toBeDefined();
      expect(newValidator.findContract('engineering-agent', 'testing-agent')).toBeDefined();
    });

    it('should find registered contract', () => {
      const contract = validator.findContract('design-agent', 'engineering-agent');
      expect(contract).toBeDefined();
      expect(contract?.fromAgent).toBe('design-agent');
      expect(contract?.toAgent).toBe('engineering-agent');
    });

    it('should return undefined for non-existent contract', () => {
      const contract = validator.findContract('unknown-agent', 'other-agent');
      expect(contract).toBeUndefined();
    });
  });

  describe('Valid handoffs', () => {
    it('should pass valid handoff', () => {
      const output = {
        architecture: 'MVC with microservices',
        components: { controller: {}, model: {}, view: {} },
        tradeoffs: ['Complexity vs Scalability'],
      };

      const result = validator.validateHandoff('design-agent', 'engineering-agent', output);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass handoff with extra fields', () => {
      const output = {
        architecture: 'MVC',
        components: { c1: {}, c2: {} },
        tradeoffs: ['Trade1'],
        metadata: { version: '1.0' },
        timestamp: new Date().toISOString(),
      };

      const result = validator.validateHandoff('design-agent', 'engineering-agent', output);

      expect(result.valid).toBe(true);
    });
  });

  describe('Precondition validation', () => {
    it('should reject handoff with missing precondition field', () => {
      const output = {
        components: { c1: {} },
        tradeoffs: ['Trade1'],
      };

      const result = validator.validateHandoff('design-agent', 'engineering-agent', output);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('architecture'))).toBe(true);
    });

    it('should reject handoff with empty required field', () => {
      const output = {
        architecture: '',
        components: { c1: {} },
        tradeoffs: ['Trade1'],
      };

      const result = validator.validateHandoff('design-agent', 'engineering-agent', output);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('empty'))).toBe(true);
    });

    it('should reject handoff with null field', () => {
      const output = {
        architecture: 'MVC',
        components: null,
        tradeoffs: ['Trade1'],
      };

      const result = validator.validateHandoff('design-agent', 'engineering-agent', output);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('null'))).toBe(true);
    });

    it('should reject handoff with wrong type', () => {
      const output = {
        architecture: 'MVC',
        components: 'not an object',
        tradeoffs: ['Trade1'],
      };

      const result = validator.validateHandoff('design-agent', 'engineering-agent', output);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('type'))).toBe(true);
    });
  });

  describe('Schema validation', () => {
    it('should reject handoff with missing required field', () => {
      const output = {
        architecture: 'MVC',
        components: { c1: {} },
      };

      const result = validator.validateHandoff('design-agent', 'engineering-agent', output);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('tradeoffs'))).toBe(true);
    });

    it('should validate against provided input schema', () => {
      const output = { field1: 'value' };
      const inputSchema = { required: ['field1', 'field2'] };

      const result = validator.validateHandoff(
        'design-agent',
        'engineering-agent',
        output,
        inputSchema
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('field2'))).toBe(true);
    });
  });

  describe('Artifact validation', () => {
    it('should require artifacts if specified in contract', () => {
      const contractWithArtifacts: HandoffContract = {
        ...designContract,
        artifactRefsRequired: ['diagram', 'spec'],
      };

      const newValidator = new HandoffValidator({ requireArtifacts: true });
      newValidator.registerContract(contractWithArtifacts);

      const output = {
        architecture: 'MVC',
        components: { c1: {} },
        tradeoffs: ['Trade1'],
      };

      const result = newValidator.validateHandoff('design-agent', 'engineering-agent', output);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('artifact'))).toBe(true);
    });

    it('should validate artifact references', () => {
      const contractWithArtifacts: HandoffContract = {
        ...designContract,
        artifactRefsRequired: ['diagram', 'spec'],
      };

      validator.registerContract(contractWithArtifacts);

      const output = {
        architecture: 'MVC',
        components: { c1: {} },
        tradeoffs: ['Trade1'],
        artifacts: { diagram: 'diag-123' },
      };

      const result = validator.validateHandoff('design-agent', 'engineering-agent', output);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('spec'))).toBe(true);
    });
  });

  describe('Failure routing', () => {
    it('should indicate repair routing on failure', () => {
      const output = {
        architecture: '',
        components: { c1: {} },
        tradeoffs: ['Trade1'],
      };

      const result = validator.validateHandoff('design-agent', 'engineering-agent', output);

      expect(result.valid).toBe(false);
      expect(result.failureRoute).toBe('repair');
    });

    it('should indicate escalate routing on failure', () => {
      const output = {
        codeFiles: '',
        buildStatus: null,
        testCoverage: 0.5,
      };

      const result = validator.validateHandoff('engineering-agent', 'testing-agent', output);

      expect(result.valid).toBe(false);
      expect(result.failureRoute).toBe('escalate');
    });
  });

  describe('Repair suggestions', () => {
    it('should provide repair suggestions on failure', () => {
      const output = {
        architecture: '',
        components: { c1: {} },
        tradeoffs: ['Trade1'],
      };

      const result = validator.validateHandoff('design-agent', 'engineering-agent', output);

      expect(result.repairSuggestions).toBeDefined();
      expect(result.repairSuggestions.length).toBeGreaterThan(0);
    });

    it('should get repair suggestions for failed handoff', () => {
      const suggestions = validator.getRepairSuggestions('design-agent', 'engineering-agent');

      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Handoff paths', () => {
    it('should validate handoff path between agents', () => {
      const path = validator.getHandoffPath(['design-agent', 'engineering-agent', 'testing-agent']);

      expect(path.valid).toBe(true);
      expect(path.contracts).toHaveLength(2);
    });

    it('should reject invalid handoff path', () => {
      const path = validator.getHandoffPath(['design-agent', 'unknown-agent']);

      expect(path.valid).toBe(false);
      expect(path.contracts).toHaveLength(0);
    });

    it('should handle single agent path', () => {
      const path = validator.getHandoffPath(['design-agent']);

      expect(path.valid).toBe(true);
      expect(path.contracts).toHaveLength(0);
    });
  });

  describe('Handoff messages', () => {
    it('should create handoff message', () => {
      const payload = {
        architecture: 'MVC',
        components: { c1: {} },
        tradeoffs: ['Trade1'],
      };

      const message = validator.createHandoffMessage('design-agent', 'engineering-agent', payload);

      expect(message.messageId).toBeDefined();
      expect(message.fromAgent).toBe('design-agent');
      expect(message.toAgent).toBe('engineering-agent');
      expect(message.payload).toEqual(payload);
      expect(message.timestamp).toBeDefined();
    });

    it('should validate handoff message', () => {
      const payload = {
        architecture: 'MVC',
        components: { c1: {} },
        tradeoffs: ['Trade1'],
      };

      const message = validator.createHandoffMessage('design-agent', 'engineering-agent', payload);
      const result = validator.validateHandoffMessage(message);

      expect(result.valid).toBe(true);
    });
  });

  describe('Validation history', () => {
    it('should track validation history', () => {
      const output = {
        architecture: 'MVC',
        components: { c1: {} },
        tradeoffs: ['Trade1'],
      };

      validator.validateHandoff('design-agent', 'engineering-agent', output);
      validator.validateHandoff('design-agent', 'engineering-agent', output);

      const history = validator.getValidationHistory();
      expect(history).toHaveLength(2);
    });

    it('should clear validation history', () => {
      const output = {
        architecture: 'MVC',
        components: { c1: {} },
        tradeoffs: ['Trade1'],
      };

      validator.validateHandoff('design-agent', 'engineering-agent', output);
      expect(validator.getValidationHistory()).toHaveLength(1);

      validator.clearHistory();
      expect(validator.getValidationHistory()).toHaveLength(0);
    });

    it('should skip logging with history disabled', () => {
      const noLogValidator = new HandoffValidator({ logValidations: false });
      noLogValidator.registerContracts([designContract]);

      const output = {
        architecture: 'MVC',
        components: { c1: {} },
        tradeoffs: ['Trade1'],
      };

      noLogValidator.validateHandoff('design-agent', 'engineering-agent', output);
      expect(noLogValidator.getValidationHistory()).toHaveLength(0);
    });
  });

  describe('Validation statistics', () => {
    it('should calculate validation statistics', () => {
      const validOutput = {
        architecture: 'MVC',
        components: { c1: {} },
        tradeoffs: ['Trade1'],
      };

      const invalidOutput = {
        architecture: '',
        components: { c1: {} },
        tradeoffs: ['Trade1'],
      };

      validator.validateHandoff('design-agent', 'engineering-agent', validOutput);
      validator.validateHandoff('design-agent', 'engineering-agent', invalidOutput);
      validator.validateHandoff('engineering-agent', 'testing-agent', invalidOutput);

      const stats = validator.getValidationStats();

      expect(stats.total).toBe(3);
      expect(stats.passed).toBe(1);
      expect(stats.failed).toBe(2);
      expect(stats.repaired).toBe(1);
      expect(stats.escalated).toBe(1);
    });
  });

  describe('Contract queries', () => {
    it('should get all registered contracts', () => {
      const contracts = validator.getAllContracts();

      expect(contracts).toHaveLength(2);
    });

    it('should get outgoing contracts for agent', () => {
      const outgoing = validator.getOutgoingContracts('design-agent');

      expect(outgoing).toHaveLength(1);
      expect(outgoing[0].fromAgent).toBe('design-agent');
    });

    it('should get incoming contracts for agent', () => {
      const incoming = validator.getIncomingContracts('engineering-agent');

      expect(incoming).toHaveLength(1);
      expect(incoming[0].toAgent).toBe('engineering-agent');
    });
  });

  describe('Repair suggestions', () => {
    it('should suggest repair for failed handoff', () => {
      const repair = validator.suggestRepair('design-agent', 'engineering-agent', [
        'architecture',
      ]);

      expect(repair.retry).toBe(true);
      expect(repair.escalate).toBe(false);
      expect(repair.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should suggest escalation when appropriate', () => {
      const repair = validator.suggestRepair('engineering-agent', 'testing-agent', ['buildStatus']);

      expect(repair.escalate).toBe(true);
      expect(repair.retry).toBe(false);
    });
  });

  describe('Strict mode', () => {
    it('should require contracts in strict mode', () => {
      const strictValidator = new HandoffValidator({ strictMode: true });

      const result = strictValidator.validateHandoff(
        'unknown-agent',
        'other-agent',
        { data: 'test' }
      );

      expect(result.valid).toBe(false);
      expect(result.failureRoute).toBe('escalate');
    });

    it('should allow missing contracts in non-strict mode', () => {
      const result = validator.validateHandoff('unknown-agent', 'other-agent', { data: 'test' });

      expect(result.warnings.some(w => w.includes('No handoff contract'))).toBe(true);
    });
  });
});
