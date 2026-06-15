import {
  FailureType,
  FailureClassification,
  ErrorSeverity,
  ErrorType,
  FailureContext,
} from '@unifiedaitoolbox/shared';

export class FailureClassifier {
  private readonly failurePatterns: Map<FailureType, RegExp[]> = new Map([
    [
      'requirements_missing',
      [
        /required\s+(field|param|arg|argument|input)/i,
        /missing\s+required/i,
        /must provide/i,
        /undefined.*required/i,
      ],
    ],
    [
      'schema_invalid',
      [
        /schema.*invalid|invalid.*schema/i,
        /does not match.*schema/i,
        /validation.*failed/i,
        /json.*schema/i,
        /type.*mismatch/i,
      ],
    ],
    [
      'tool_denied',
      [
        /permission\s+denied|access\s+denied/i,
        /unauthorized|forbidden/i,
        /not.*authorized/i,
        /api.*key|token.*invalid/i,
        /insufficient.*privilege/i,
      ],
    ],
    [
      'command_failed',
      [
        /command.*failed|exit.*code/i,
        /process.*failed|subprocess.*error/i,
        /execution.*failed/i,
        /failed to execute/i,
      ],
    ],
    [
      'env_missing',
      [
        /environment\s+variable|env\s+var/i,
        /no such file or directory/i,
        /path.*not found/i,
        /cannot find.*module|module not found/i,
      ],
    ],
    [
      'dependency_unavailable',
      [
        /dependency.*unavailable|missing.*dependency/i,
        /cannot find.*package/i,
        /npm.*error|package.*not found/i,
        /import.*error|modulenotfounderror/i,
      ],
    ],
    [
      'test_failed',
      [
        /test.*failed|assertion.*failed/i,
        /expect.*toBe|expect.*toEqual/i,
        /failing test/i,
        /test.*error.*expected/i,
      ],
    ],
    [
      'merge_conflict',
      [
        /merge.*conflict|conflict/i,
        /<<<<<<|>>>>>>|\|\|\|\|\|\|\|/,
        /branch.*diverged/i,
      ],
    ],
    [
      'scope_violation',
      [
        /scope.*violation|out.*of.*scope/i,
        /cannot access.*scope/i,
        /scope.*mismatch/i,
      ],
    ],
    [
      'low_confidence',
      [
        /low confidence|confidence.*low/i,
        /uncertain|unsure/i,
        /may fail|might not work/i,
      ],
    ],
    [
      'human_approval_required',
      [
        /requires.*approval|approval.*required/i,
        /manual.*approval|human.*review/i,
        /dangerous|risky.*operation/i,
      ],
    ],
  ]);

  classify(context: FailureContext): FailureClassification {
    const errorMessage = context.errorMessage || '';
    const errorStack = context.errorStack || '';
    const fullText = `${errorMessage}\n${errorStack}`;

    // Find matching failure types
    const matches: Array<{ type: FailureType; confidence: number }> = [];

    for (const [failureType, patterns] of this.failurePatterns) {
      let matchCount = 0;
      for (const pattern of patterns) {
        if (pattern.test(fullText)) {
          matchCount++;
        }
      }

      if (matchCount > 0) {
        const confidence = Math.min(matchCount / patterns.length, 1);
        matches.push({ type: failureType, confidence });
      }
    }

    // If no matches found, default to command_failed with low confidence
    if (matches.length === 0) {
      matches.push({ type: 'command_failed', confidence: 0.3 });
    }

    // Sort by confidence (descending)
    matches.sort((a, b) => b.confidence - a.confidence);
    const bestMatch = matches[0];

    const severity = this.inferSeverity(errorMessage, bestMatch.type);
    const errorType = this.inferErrorType(errorMessage);

    return {
      failureType: bestMatch.type,
      severity,
      errorType,
      confidence: bestMatch.confidence,
      evidence: this.gatherEvidence(errorMessage, bestMatch.type),
    };
  }

  private inferSeverity(error: string, failureType: FailureType): ErrorSeverity {
    const lowerError = error.toLowerCase();

    // Critical failures
    if (
      failureType === 'scope_violation' ||
      failureType === 'merge_conflict' ||
      lowerError.includes('fatal') ||
      lowerError.includes('critical')
    ) {
      return 'critical';
    }

    // High severity
    if (
      failureType === 'schema_invalid' ||
      failureType === 'requirements_missing' ||
      failureType === 'human_approval_required' ||
      lowerError.includes('error')
    ) {
      return 'high';
    }

    // Medium severity
    if (
      failureType === 'tool_denied' ||
      failureType === 'env_missing' ||
      failureType === 'dependency_unavailable' ||
      lowerError.includes('warning')
    ) {
      return 'medium';
    }

    return 'low';
  }

  private inferErrorType(error: string): ErrorType {
    const lowerError = error.toLowerCase();

    if (
      lowerError.includes('timeout') ||
      lowerError.includes('network') ||
      lowerError.includes('econnrefused') ||
      lowerError.includes('temporarily')
    ) {
      return 'transient';
    }

    if (
      lowerError.includes('syntax') ||
      lowerError.includes('schema') ||
      lowerError.includes('validation') ||
      lowerError.includes('invalid')
    ) {
      return 'permanent';
    }

    return 'unknown';
  }

  private gatherEvidence(errorMessage: string, failureType: FailureType): string[] {
    const evidence: string[] = [];

    if (errorMessage.length > 0) {
      evidence.push(`Error message: ${errorMessage.substring(0, 100)}`);
    }

    evidence.push(`Classified as: ${failureType}`);

    // Add type-specific evidence
    switch (failureType) {
      case 'requirements_missing':
        evidence.push('Pattern matched: Missing required field/parameter');
        break;
      case 'schema_invalid':
        evidence.push('Pattern matched: Schema validation failure');
        break;
      case 'tool_denied':
        evidence.push('Pattern matched: Permission/authorization issue');
        break;
      case 'command_failed':
        evidence.push('Pattern matched: Command execution failure');
        break;
      case 'env_missing':
        evidence.push('Pattern matched: Environment variable/file not found');
        break;
      case 'dependency_unavailable':
        evidence.push('Pattern matched: Missing or unavailable dependency');
        break;
      case 'test_failed':
        evidence.push('Pattern matched: Test assertion failure');
        break;
      case 'merge_conflict':
        evidence.push('Pattern matched: Git merge conflict');
        break;
      case 'scope_violation':
        evidence.push('Pattern matched: Scope access violation');
        break;
      case 'low_confidence':
        evidence.push('Pattern matched: Low confidence operation');
        break;
      case 'human_approval_required':
        evidence.push('Pattern matched: Human approval needed');
        break;
    }

    return evidence;
  }

  getFailureTypeDescription(failureType: FailureType): string {
    const descriptions: Record<FailureType, string> = {
      requirements_missing: 'Required input or parameter is missing',
      schema_invalid: 'Data does not conform to expected schema',
      tool_denied: 'Tool access denied due to permissions',
      command_failed: 'Command execution failed',
      env_missing: 'Required environment variable or file not found',
      dependency_unavailable: 'Required dependency is unavailable',
      test_failed: 'Test assertion or validation failed',
      merge_conflict: 'Git merge conflict detected',
      scope_violation: 'Operation violates scope boundaries',
      low_confidence: 'Operation has low confidence of success',
      human_approval_required: 'Operation requires human approval',
    };

    return descriptions[failureType];
  }
}
