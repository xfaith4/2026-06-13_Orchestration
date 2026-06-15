import {
  FailureType,
  FailureClassification,
  RepairOptions,
  RepairStrategy,
} from '@unifiedaitoolbox/shared';

export class RepairStrategist {
  private readonly defaultMaxRetries = 3;

  getRepairOptions(
    failureType: FailureType,
    classification: FailureClassification,
    taskName: string
  ): RepairOptions[] {
    const options: RepairOptions[] = [];

    // Add appropriate repair strategies based on failure type
    switch (failureType) {
      case 'requirements_missing':
        options.push({
          strategy: 'repair',
          priority: 9,
          description: 'Provide missing required fields and retry',
          riskLevel: 'low',
          estimatedDuration: 5000,
          prerequisites: ['Access to task definition'],
          instructions: [
            'Review task requirements',
            'Provide missing fields',
            'Validate against schema',
            'Retry task',
          ],
        });
        options.push({
          strategy: 'escalate',
          priority: 5,
          description: 'Escalate to human for field clarification',
          riskLevel: 'low',
          prerequisites: ['Human available'],
        });
        break;

      case 'schema_invalid':
        options.push({
          strategy: 'repair',
          priority: 8,
          description: 'Fix data to match schema and retry',
          riskLevel: 'low',
          estimatedDuration: 10000,
          prerequisites: ['Schema definition available'],
          instructions: [
            'Review schema definition',
            'Identify schema violations',
            'Transform data to match schema',
            'Validate transformation',
            'Retry task',
          ],
        });
        options.push({
          strategy: 'escalate',
          priority: 4,
          description: 'Escalate for schema resolution',
          riskLevel: 'low',
        });
        break;

      case 'tool_denied':
        options.push({
          strategy: 'escalate',
          priority: 9,
          description: 'Escalate: Verify permissions and credentials',
          riskLevel: 'low',
          prerequisites: ['Administrator available'],
          instructions: [
            'Check user/service account permissions',
            'Verify credentials/API keys',
            'Grant required permissions',
            'Retry task',
          ],
        });
        options.push({
          strategy: 'skip',
          priority: 3,
          description: 'Skip task (may impact downstream)',
          riskLevel: 'high',
        });
        break;

      case 'command_failed':
        options.push({
          strategy: 'retry',
          priority: 8,
          description: 'Retry command execution',
          riskLevel: 'low',
          estimatedDuration: 5000,
          prerequisites: ['Command environment available'],
        });
        options.push({
          strategy: 'repair',
          priority: 6,
          description: 'Fix command/environment and retry',
          riskLevel: 'medium',
          estimatedDuration: 15000,
          instructions: [
            'Review command syntax',
            'Check command environment',
            'Fix any issues',
            'Retry command',
          ],
        });
        options.push({
          strategy: 'escalate',
          priority: 4,
          description: 'Escalate for manual debugging',
          riskLevel: 'medium',
        });
        break;

      case 'env_missing':
        options.push({
          strategy: 'repair',
          priority: 9,
          description: 'Set environment variable or create required file',
          riskLevel: 'low',
          estimatedDuration: 5000,
          prerequisites: ['Environment access'],
          instructions: [
            'Identify missing environment variable/file',
            'Create/set the required resource',
            'Verify resource is accessible',
            'Retry task',
          ],
        });
        options.push({
          strategy: 'escalate',
          priority: 5,
          description: 'Escalate: Request environment setup',
          riskLevel: 'low',
        });
        break;

      case 'dependency_unavailable':
        options.push({
          strategy: 'repair',
          priority: 8,
          description: 'Install missing dependency',
          riskLevel: 'low',
          estimatedDuration: 30000,
          prerequisites: ['Package manager available'],
          instructions: [
            'Identify missing dependency',
            'Install via package manager',
            'Verify installation',
            'Retry task',
          ],
        });
        options.push({
          strategy: 'escalate',
          priority: 4,
          description: 'Escalate: Request dependency installation',
          riskLevel: 'low',
        });
        break;

      case 'test_failed':
        options.push({
          strategy: 'repair',
          priority: 7,
          description: 'Fix code and re-run test',
          riskLevel: 'medium',
          estimatedDuration: 20000,
          prerequisites: ['Access to source code'],
          instructions: [
            'Review test output',
            'Identify code issue',
            'Fix the code',
            'Run test again',
          ],
        });
        options.push({
          strategy: 'escalate',
          priority: 5,
          description: 'Escalate: Complex test failure',
          riskLevel: 'medium',
        });
        break;

      case 'merge_conflict':
        options.push({
          strategy: 'manual',
          priority: 9,
          description: 'Manually resolve merge conflict',
          riskLevel: 'high',
          estimatedDuration: 30000,
          prerequisites: ['Git access', 'Domain knowledge'],
          instructions: [
            'Review conflicting changes',
            'Resolve conflicts in affected files',
            'Test merged code',
            'Complete merge',
          ],
        });
        options.push({
          strategy: 'escalate',
          priority: 8,
          description: 'Escalate to code review team',
          riskLevel: 'medium',
        });
        break;

      case 'scope_violation':
        options.push({
          strategy: 'escalate',
          priority: 9,
          description: 'Escalate: Requires scope adjustment',
          riskLevel: 'high',
          prerequisites: ['Security review'],
          instructions: [
            'Review scope violation details',
            'Determine if scope needs widening',
            'Perform security review',
            'Approve and retry',
          ],
        });
        options.push({
          strategy: 'skip',
          priority: 5,
          description: 'Skip this operation',
          riskLevel: 'high',
        });
        break;

      case 'low_confidence':
        options.push({
          strategy: 'manual',
          priority: 8,
          description: 'Manual review and approval',
          riskLevel: 'medium',
          estimatedDuration: 10000,
          prerequisites: ['Expert reviewer'],
        });
        options.push({
          strategy: 'retry',
          priority: 4,
          description: 'Retry despite low confidence',
          riskLevel: 'medium',
        });
        break;

      case 'human_approval_required':
        options.push({
          strategy: 'manual',
          priority: 9,
          description: 'Request human approval',
          riskLevel: 'low',
          estimatedDuration: 300000, // 5 minutes typical
          prerequisites: ['Approver available'],
          instructions: ['Submit for approval', 'Wait for decision', 'Proceed based on approval'],
        });
        options.push({
          strategy: 'skip',
          priority: 3,
          description: 'Skip without approval',
          riskLevel: 'high',
        });
        break;

      default:
        // Default fallback
        options.push({
          strategy: 'retry',
          priority: 5,
          description: 'Retry operation',
          riskLevel: 'medium',
          estimatedDuration: 10000,
        });
        options.push({
          strategy: 'escalate',
          priority: 3,
          description: 'Escalate for manual intervention',
          riskLevel: 'medium',
        });
    }

    // Sort by priority (descending)
    options.sort((a, b) => b.priority - a.priority);

    return options;
  }

  selectBestStrategy(
    options: RepairOptions[],
    attemptCount: number,
    maxAttempts: number
  ): RepairStrategy {
    // If we've exhausted retries, escalate
    if (attemptCount >= maxAttempts) {
      const escalateOption = options.find(o => o.strategy === 'escalate');
      if (escalateOption) {
        return 'escalate';
      }
      const manualOption = options.find(o => o.strategy === 'manual');
      if (manualOption) {
        return 'manual';
      }
      return 'escalate';
    }

    // Otherwise pick the highest priority option
    if (options.length > 0) {
      return options[0].strategy;
    }

    return 'escalate';
  }

  getMaxRetries(failureType: FailureType): number {
    const retryLimits: Record<FailureType, number> = {
      requirements_missing: 2,
      schema_invalid: 2,
      tool_denied: 1,
      command_failed: 3,
      env_missing: 1,
      dependency_unavailable: 1,
      test_failed: 3,
      merge_conflict: 1,
      scope_violation: 0,
      low_confidence: 2,
      human_approval_required: 0,
    };

    return failureType in retryLimits ? retryLimits[failureType] : this.defaultMaxRetries;
  }

  isRetryable(strategy: RepairStrategy): boolean {
    return strategy === 'retry' || strategy === 'repair';
  }

  isEscalatable(strategy: RepairStrategy): boolean {
    return strategy === 'escalate' || strategy === 'manual';
  }

  canSkip(failureType: FailureType): boolean {
    const skippable: FailureType[] = [
      'low_confidence',
      'tool_denied',
      'scope_violation',
      'human_approval_required',
    ];
    return skippable.includes(failureType);
  }
}
