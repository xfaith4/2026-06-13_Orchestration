import {
  HandoffContract,
  HandoffValidationResult,
  HandoffMessage,
  AgentDefinition,
} from '@unifiedaitoolbox/shared';

export interface HandoffValidatorConfig {
  strictMode?: boolean;
  requireArtifacts?: boolean;
  logValidations?: boolean;
}

export class HandoffValidator {
  private contracts: Map<string, HandoffContract> = new Map();
  private validationHistory: HandoffValidationResult[] = [];

  constructor(private config: HandoffValidatorConfig = {}) {
    this.config = {
      strictMode: false,
      requireArtifacts: false,
      logValidations: true,
      ...config,
    };
  }

  // Register a handoff contract
  registerContract(contract: HandoffContract): void {
    const key = `${contract.fromAgent}->${contract.toAgent}`;
    this.contracts.set(key, contract);
  }

  // Register multiple contracts
  registerContracts(contracts: HandoffContract[]): void {
    for (const contract of contracts) {
      this.registerContract(contract);
    }
  }

  // Find contract for agent pair
  findContract(fromAgent: string, toAgent: string): HandoffContract | undefined {
    const key = `${fromAgent}->${toAgent}`;
    return this.contracts.get(key);
  }

  // Validate handoff between agents
  validateHandoff(
    fromAgent: string,
    toAgent: string,
    output: Record<string, unknown>,
    inputSchema?: Record<string, unknown>
  ): HandoffValidationResult {
    const result: HandoffValidationResult = {
      valid: true,
      fromAgent,
      toAgent,
      errors: [],
      warnings: [],
      repairSuggestions: [],
      failureRoute: 'repair',
      timestamp: new Date().toISOString(),
    };

    // Find contract
    const contract = this.findContract(fromAgent, toAgent);
    if (!contract) {
      if (this.config.strictMode) {
        result.valid = false;
        result.errors.push(`No handoff contract found for ${fromAgent} → ${toAgent}`);
        result.failureRoute = 'escalate';
      } else {
        result.warnings.push(`No handoff contract found for ${fromAgent} → ${toAgent}`);
      }
    } else {
      // Validate preconditions
      const preconditionErrors = this.validatePreconditions(output, contract.preconditions);
      if (preconditionErrors.length > 0) {
        result.valid = false;
        result.errors.push(...preconditionErrors);
        result.failureRoute = contract.failureRoute;
        result.repairSuggestions.push(...(contract.repairSuggestions || []));
      }

      // Validate against payload schema
      const schemaErrors = this.validateAgainstSchema(output, contract.payloadSchema);
      if (schemaErrors.length > 0) {
        result.valid = false;
        result.errors.push(...schemaErrors);
      }

      // Check required artifacts
      if (contract.artifactRefsRequired && contract.artifactRefsRequired.length > 0) {
        const artifactErrors = this.validateArtifacts(output, contract.artifactRefsRequired);
        if (artifactErrors.length > 0) {
          result.valid = false;
          result.errors.push(...artifactErrors);
        }
      }
    }

    // Validate input schema if provided
    if (inputSchema) {
      const inputErrors = this.validateAgainstSchema(output, inputSchema);
      if (inputErrors.length > 0) {
        result.valid = false;
        result.errors.push(...inputErrors.map(e => `Input validation: ${e}`));
      }
    }

    // Log validation if enabled
    if (this.config.logValidations) {
      this.validationHistory.push(result);
    }

    return result;
  }

  // Validate preconditions
  private validatePreconditions(
    data: Record<string, unknown>,
    preconditions: Array<{
      field: string;
      condition: string;
      expectedType?: string;
    }>
  ): string[] {
    const errors: string[] = [];

    for (const precondition of preconditions) {
      if (!(precondition.field in data)) {
        errors.push(
          `Precondition failed: field '${precondition.field}' not found in output`
        );
        continue;
      }

      const value = data[precondition.field];

      // Type check if specified
      if (precondition.expectedType) {
        const actualType = typeof value;
        if (actualType !== precondition.expectedType) {
          errors.push(
            `Precondition failed: field '${precondition.field}' has type '${actualType}', expected '${precondition.expectedType}'`
          );
        }
      }

      // Condition check (simple string matching for now)
      if (precondition.condition === 'non-empty' && !value) {
        errors.push(`Precondition failed: field '${precondition.field}' is empty`);
      }

      if (precondition.condition === 'non-null' && value === null) {
        errors.push(`Precondition failed: field '${precondition.field}' is null`);
      }
    }

    return errors;
  }

  // Validate against schema
  private validateAgainstSchema(
    data: Record<string, unknown>,
    schema: Record<string, unknown>
  ): string[] {
    const errors: string[] = [];
    const schemaObj = schema as Record<string, unknown> & { required?: string[] };

    if (schemaObj.required && Array.isArray(schemaObj.required)) {
      for (const requiredField of schemaObj.required) {
        if (!(requiredField in data)) {
          errors.push(`Required field '${requiredField}' not found in handoff payload`);
        }
      }
    }

    return errors;
  }

  // Validate artifact references
  private validateArtifacts(data: Record<string, unknown>, required: string[]): string[] {
    const errors: string[] = [];
    const artifacts = data.artifacts as Record<string, unknown> | undefined;

    if (!artifacts && required.length > 0) {
      if (this.config.requireArtifacts) {
        errors.push('No artifacts provided in handoff');
        return errors;
      }
    }

    if (artifacts && typeof artifacts === 'object') {
      for (const ref of required) {
        if (!(ref in artifacts)) {
          errors.push(`Required artifact reference '${ref}' not found`);
        }
      }
    }

    return errors;
  }

  // Get handoff path (chain of agents)
  getHandoffPath(agents: string[]): { valid: boolean; contracts: HandoffContract[] } {
    const contracts: HandoffContract[] = [];

    for (let i = 0; i < agents.length - 1; i++) {
      const from = agents[i];
      const to = agents[i + 1];
      const contract = this.findContract(from, to);

      if (!contract) {
        return {
          valid: false,
          contracts: [],
        };
      }

      contracts.push(contract);
    }

    return {
      valid: contracts.length === agents.length - 1,
      contracts,
    };
  }

  // Get repair suggestions for failed handoff
  getRepairSuggestions(fromAgent: string, toAgent: string): string[] {
    const contract = this.findContract(fromAgent, toAgent);
    return contract?.repairSuggestions || [];
  }

  // Create handoff message
  createHandoffMessage(
    fromAgent: string,
    toAgent: string,
    payload: Record<string, unknown>
  ): HandoffMessage {
    return {
      messageId: `handoff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromAgent,
      toAgent,
      payload,
      timestamp: new Date().toISOString(),
    };
  }

  // Validate entire handoff message
  validateHandoffMessage(message: HandoffMessage): HandoffValidationResult {
    return this.validateHandoff(message.fromAgent, message.toAgent, message.payload);
  }

  // Get validation history
  getValidationHistory(): HandoffValidationResult[] {
    return [...this.validationHistory];
  }

  // Get validation statistics
  getValidationStats(): {
    total: number;
    passed: number;
    failed: number;
    repaired: number;
    escalated: number;
    skipped: number;
  } {
    const stats = {
      total: this.validationHistory.length,
      passed: 0,
      failed: 0,
      repaired: 0,
      escalated: 0,
      skipped: 0,
    };

    for (const result of this.validationHistory) {
      if (result.valid) {
        stats.passed++;
      } else {
        stats.failed++;
        if (result.failureRoute === 'repair') {
          stats.repaired++;
        } else if (result.failureRoute === 'escalate') {
          stats.escalated++;
        } else if (result.failureRoute === 'skip') {
          stats.skipped++;
        }
      }
    }

    return stats;
  }

  // Clear validation history
  clearHistory(): void {
    this.validationHistory = [];
  }

  // Get all registered contracts
  getAllContracts(): HandoffContract[] {
    return Array.from(this.contracts.values());
  }

  // Get contracts for agent (as source)
  getOutgoingContracts(agent: string): HandoffContract[] {
    return Array.from(this.contracts.values()).filter(c => c.fromAgent === agent);
  }

  // Get contracts for agent (as target)
  getIncomingContracts(agent: string): HandoffContract[] {
    return Array.from(this.contracts.values()).filter(c => c.toAgent === agent);
  }

  // Suggest repair for failed handoff
  suggestRepair(
    fromAgent: string,
    toAgent: string,
    failedFields: string[]
  ): {
    suggestions: string[];
    retry: boolean;
    escalate: boolean;
  } {
    const contract = this.findContract(fromAgent, toAgent);
    const suggestions = contract?.repairSuggestions || [];

    return {
      suggestions,
      retry: contract?.failureRoute === 'repair',
      escalate: contract?.failureRoute === 'escalate',
    };
  }
}
