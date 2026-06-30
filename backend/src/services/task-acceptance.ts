import { ExecutionTask } from '@unifiedaitoolbox/shared';
import { OutputParser, FileArtifact } from './output-parser.js';

export type AcceptanceStatus =
  | 'accepted'
  | 'rejected_no_artifacts'
  | 'rejected_invalid_format'
  | 'rejected_stack_violation';

export interface TaskAcceptanceResult {
  accepted: boolean;
  status: AcceptanceStatus;
  message: string;
  artifacts: FileArtifact[];
}

export class TaskAcceptanceService {
  private outputParser: OutputParser;

  // Keywords that indicate a task expects code/artifact output
  private readonly implementationKeywords = new Set([
    'implement',
    'create',
    'build',
    'write',
    'repair',
    'fix',
    'code',
    'component',
    'service',
    'route',
    'handler',
    'middleware',
    'model',
    'schema',
    'test',
    'spec',
    'config',
    'type',
    'interface',
    'class',
    'function',
    'endpoint',
    'api',
    'database',
    'migration',
  ]);

  // Task kinds that explicitly require artifacts
  private readonly artifactRequiredKinds = new Set([
    'implementation',
    'repair',
    'code',
    'test',
    'config',
  ]);

  // Task kinds that explicitly do NOT require artifacts
  private readonly artifactExemptKinds = new Set([
    'documentation',
    'review',
    'planning',
    'design',
    'analysis',
    'research',
  ]);

  constructor() {
    this.outputParser = new OutputParser();
  }

  /**
   * Determine if a task is implementation-like based on keywords.
   */
  private isImplementationLike(task: ExecutionTask): boolean {
    // If kind is explicit, use it (always take precedence)
    if ('kind' in task && typeof task.kind === 'string') {
      if (this.artifactRequiredKinds.has(task.kind)) {
        return true;
      }
      if (this.artifactExemptKinds.has(task.kind)) {
        return false;
      }
    }

    // Check exempt keywords first (documentation, review, etc. disable code requirement)
    const textToCheck = `${task.name} ${task.description}`.toLowerCase();

    // If contains doc/review/design keywords, it's NOT implementation-like
    const exemptKeywords = ['documentation', 'document', 'review', 'design', 'analysis', 'analyze', 'research'];
    for (const keyword of exemptKeywords) {
      if (textToCheck.includes(keyword)) {
        return false;
      }
    }

    // Then check implementation keywords
    for (const keyword of this.implementationKeywords) {
      if (textToCheck.includes(keyword)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Accept or reject a task based on its output and requirements.
   *
   * Implementation-like tasks MUST produce file artifacts.
   * Documentation/review tasks do not require artifacts.
   */
  accept(task: ExecutionTask, taskOutput: unknown): TaskAcceptanceResult {
    // Parse artifacts from output
    let artifacts: FileArtifact[] = [];
    try {
      artifacts = this.outputParser.parseTaskOutput(taskOutput);
    } catch (err) {
      const message = `Failed to parse task output: ${err instanceof Error ? err.message : String(err)}`;
      return {
        accepted: false,
        status: 'rejected_invalid_format',
        message,
        artifacts: [],
      };
    }

    // Check if this task requires artifacts
    const isImpl = this.isImplementationLike(task);

    if (isImpl && artifacts.length === 0) {
      return {
        accepted: false,
        status: 'rejected_no_artifacts',
        message: `Task "${task.name}" is implementation-like but produced no file artifacts. ` +
                 `Expected ## File: blocks in output (e.g., ## File: src/foo.ts)`,
        artifacts: [],
      };
    }

    // If we got here, accept the task
    return {
      accepted: true,
      status: 'accepted',
      message: `Task accepted with ${artifacts.length} artifact(s)`,
      artifacts,
    };
  }
}
