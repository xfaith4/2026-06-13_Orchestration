// Core domain types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application extends BaseEntity {
  name: string;
  description: string;
  goal: string;
  requirements: string[];
  targetAudience?: string;
  constraints?: string[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
}

export interface DesignComponent {
  name: string;
  description: string;
  responsibility: string;
  interfaces: string[];
}

export interface DesignPlan extends BaseEntity {
  applicationId: string;
  overview: string;
  architecture: string;
  components: DesignComponent[];
  tradeoffs: string[];
  recommendations: string[];
  approvedBy?: string;
  approvedAt?: string;
  status: 'draft' | 'reviewing' | 'approved' | 'rejected';
}

export interface Roadmap extends BaseEntity {
  applicationId: string;
  designPlanId: string;
  title: string;
  description: string;
  phases: Phase[];
  estimatedDuration: string;
  stackConstraints?: StackConstraints;
  approvedBy?: string;
  approvedAt?: string;
  status: 'draft' | 'reviewing' | 'approved' | 'rejected';
}

export interface StackConstraints {
  language?: string;
  runtime?: string;
  framework?: string;
  dependencies?: string[];
  fileStructure?: string[];
  allowedLanguages?: string[];
  disallowedLanguages?: string[];
  disallowedTechnologies?: string[];
  additionalRequirements?: string[];
  packageManifest?: string;
}

export interface Phase {
  id: string;
  number: number;
  name: string;
  goal: string;
  tasks: Task[];
  startDate?: string;
  endDate?: string;
  estimatedHours?: number;
  dependencies: string[];
}

export interface Task {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  assignee?: string;
  estimatedHours?: number;
  dependencies: string[];
}

export interface ExecutionTask {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'failed' | 'blocked';
  assignee?: string;
  estimatedHours?: number;
  dependencies: string[];
  assignedTo?: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  output?: unknown;
  error?: string;
}

export interface ExecutionPhase {
  id: string;
  number: number;
  name: string;
  goal: string;
  tasks: ExecutionTask[];
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startDate?: string;
  endDate?: string;
  estimatedHours?: number;
  dependencies: string[];
  startedAt?: string;
  completedAt?: string;
}

export interface CostMetrics {
  tokenInputs: number;
  tokenOutputs: number;
  estimatedCost: number;
  currency: string;
}

export interface TaskCost extends CostMetrics {
  taskId: string;
  taskName: string;
  duration?: number;
}

export interface PhaseCost extends CostMetrics {
  phaseId: string;
  phaseName: string;
  taskCosts: TaskCost[];
}

export interface RunCost extends CostMetrics {
  runId: string;
  phaseCosts: PhaseCost[];
}

export type RunStatus = 'draft' | 'pending' | 'running' | 'completed' | 'failed' | 'paused';
export type PhaseStatus = 'pending' | 'in-progress' | 'completed' | 'failed';
export type TaskStatus = 'pending' | 'assigned' | 'in-progress' | 'completed' | 'failed' | 'blocked';

export interface StateTransitionEvent {
  id: string;
  timestamp: string;
  entityType: 'run' | 'phase' | 'task';
  entityId: string;
  fromState: string;
  toState: string;
  reason?: string;
  performedBy?: string;
}

export interface Run extends BaseEntity {
  roadmapId: string;
  applicationId: string;
  title: string;
  description: string;
  phases: ExecutionPhase[];
  status: RunStatus;
  stackConstraints?: StackConstraints;
  startedAt?: string;
  completedAt?: string;
  summary?: string;
  errorMessage?: string;
  totalCost?: CostMetrics;
  phaseCosts?: PhaseCost[];
}

export interface AgentIOContract {
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface AgentRouting {
  preferredModels?: string[];
  maxTokens?: number;
}

export interface AgentDefinition extends BaseEntity {
  // identity
  name: string;
  role: string;
  description: string;

  // behavior
  prompt?: string;
  capabilities: string[];
  constraints: string[];

  // contracts
  ioContract?: AgentIOContract;
  routing?: AgentRouting;

  // provenance (set by loader, not authored)
  sourceFile?: string;
  loadedAt?: string;
}

export interface PromptDefinition extends BaseEntity {
  name: string;
  category?: string;
  content: string;
  description?: string;
  tags?: string[];
  variables?: string[];
  version: number;
  parentId?: string;
  usageCount?: number;
  lastUsedAt?: string;
}

export interface User extends BaseEntity {
  email: string;
  name: string;
  role?: string;
}

// Error Handling
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorType = 'transient' | 'permanent' | 'unknown';

export interface ErrorRecord extends BaseEntity {
  timestamp: string;
  errorMessage: string;
  errorCode?: string;
  errorType: ErrorType;
  severity: ErrorSeverity;
  context: {
    runId?: string;
    phaseId?: string;
    taskId?: string;
    service?: string;
    operation?: string;
  };
  stack?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: string;
  resolvedAt?: string;
  resolution?: string;
}

// Task Queue & Execution
export interface SoftwareTaskOwnershipContract extends BaseEntity {
  taskId: string;
  version: string;
  ownerAgent: string;
  goal: string;
  targetFiles: string[];
  readContextFiles: string[];
  writeScope: string[];
  conflictGroup?: string;
  dependencies: string[];
  expectedExports: Record<string, unknown>;
  acceptanceCriteria: string[];
  validationCommands: string[];
  mergeStrategy: 'auto' | 'manual' | 'conflict-required';
  rollbackStrategy: 'atomic' | 'best-effort' | 'none';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration?: number;
}

export interface QueuedTask {
  taskId: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
  dependencies: string[];
  retryCount: number;
  maxRetries: number;
  output?: unknown;
  error?: string;
  completedAt?: string;
}

// Agent Execution
export interface AgentExecutionInput {
  agentId: string;
  agentName: string;
  prompt: string;
  inputData: Record<string, unknown>;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  timeout?: number;
}

export interface AgentExecutionResult {
  success: boolean;
  output?: Record<string, unknown>;
  tokensIn?: number;
  tokensOut?: number;
  durationMs?: number;
  model?: string;
  error?: string;
  errorType?: string;
  errorCode?: string;
}

export interface AgentExecutor {
  execute(input: AgentExecutionInput): Promise<AgentExecutionResult>;
}

export interface ExecutionContext {
  runId: string;
  phaseId: string;
  taskId: string;
  requestId?: string;
  timestamp?: string;
}

export interface AdapterExecutionOptions {
  timeout?: number;
  validateInput?: boolean;
  validateOutput?: boolean;
  extractCosts?: boolean;
  retryOnValidationFailure?: boolean;
}

// Handoff Contracts
export interface HandoffContract extends BaseEntity {
  version: string;
  fromAgent: string;
  toAgent: string;
  trigger: string;
  preconditions: {
    field: string;
    condition: string;
    expectedType?: string;
  }[];
  payloadSchema: Record<string, unknown>;
  statePatches?: Record<string, unknown>;
  artifactRefsRequired?: string[];
  failureRoute: 'repair' | 'escalate' | 'skip';
  repairSuggestions?: string[];
  maxRetries?: number;
}

export interface HandoffValidationResult {
  valid: boolean;
  fromAgent: string;
  toAgent: string;
  errors: string[];
  warnings: string[];
  repairSuggestions: string[];
  failureRoute: 'repair' | 'escalate' | 'skip';
  timestamp: string;
}

export interface HandoffMessage {
  messageId: string;
  fromAgent: string;
  toAgent: string;
  payload: Record<string, unknown>;
  timestamp: string;
  traceId?: string;
}

// Artifacts
export interface Artifact extends BaseEntity {
  runId: string;
  phaseId?: string;
  taskId?: string;
  name: string;
  type: string; // e.g., 'code', 'log', 'report', 'document'
  mimeType?: string;
  size: number; // bytes
  checksum: string; // SHA256 or similar
  contentPath: string; // internal storage path
  downloadUrl?: string;
  metadata?: Record<string, unknown>;
  uploadedBy?: string;
  expiresAt?: string;
  tags?: string[];
}

export interface ArtifactMetadata {
  type: string;
  mimeType?: string;
  name: string;
  size: number;
  checksum: string;
  uploadedBy?: string;
  uploadedAt: string;
  tags?: string[];
}

// Run Completion
export interface TaskResult {
  taskId: string;
  taskName: string;
  status: 'completed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  repairAttempts?: number;
}

export interface FailureSummary {
  taskId: string;
  taskName: string;
  error: string;
  errorType: ErrorType;
  severity: ErrorSeverity;
  repaired: boolean;
  repairAttempts: number;
}

export interface LessonLearned {
  id: string;
  category: string; // 'performance', 'reliability', 'cost', 'design'
  insight: string;
  priority: 'low' | 'medium' | 'high';
  affectedTasks?: string[];
  actionItems?: string[];
}

export interface RunSummary extends BaseEntity {
  runId: string;
  success: boolean;
  outcome: 'completed' | 'failed' | 'partial';
  duration: number;
  startedAt: string;
  completedAt: string;

  // Task Results
  taskResults: TaskResult[];
  tasksCompleted: number;
  tasksFailed: number;
  tasksSkipped: number;

  // Failures
  failures: FailureSummary[];

  // Costs
  totalCost: number;
  costByPhase: Record<string, number>;
  estimatedSavings?: number;

  // Artifacts
  artifacts: {
    totalCount: number;
    totalSize: number;
    byType: Record<string, number>;
  };

  // Lessons
  lessonsLearned: LessonLearned[];

  // Metadata
  generatedBy?: string;
  notes?: string;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureAt?: string;
  successCount?: number;
}

// Failure Taxonomy
export type FailureType =
  | 'requirements_missing'
  | 'schema_invalid'
  | 'tool_denied'
  | 'command_failed'
  | 'env_missing'
  | 'dependency_unavailable'
  | 'test_failed'
  | 'merge_conflict'
  | 'scope_violation'
  | 'low_confidence'
  | 'human_approval_required';

export type RepairStrategy = 'retry' | 'repair' | 'escalate' | 'skip' | 'manual';

export interface FailureClassification {
  failureType: FailureType;
  severity: ErrorSeverity;
  errorType: ErrorType;
  confidence: number; // 0-1, how confident in classification
  evidence: string[]; // evidence for classification
}

export interface RepairAttempt {
  attemptNumber: number;
  timestamp: string;
  strategy: RepairStrategy;
  result: 'success' | 'failed' | 'escalated';
  notes?: string;
}

export interface FailureContext {
  taskId: string;
  phaseId: string;
  runId: string;
  errorMessage: string;
  errorStack?: string;
  context?: Record<string, unknown>;
}

export interface RepairOptions {
  strategy: RepairStrategy;
  priority: number; // 1-10, higher is better
  description: string;
  estimatedDuration?: number; // ms
  riskLevel: 'low' | 'medium' | 'high';
  prerequisites?: string[];
  instructions?: string[];
}

export interface TaskFailure extends BaseEntity {
  taskId: string;
  taskName: string;
  phaseId: string;
  runId: string;
  originalError: string;
  classification: FailureClassification;
  repairAttempts: RepairAttempt[];
  suggestedRepairs: RepairOptions[];
  maxRetries: number;
  status: 'active' | 'resolved' | 'escalated' | 'skipped';
  resolvedAt?: string;
  resolutionDetails?: string;
}

// Audit Logging
export interface AuditLogEntry extends BaseEntity {
  timestamp: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  changes?: {
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
  }[];
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}
