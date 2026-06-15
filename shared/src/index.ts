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
  approvedBy?: string;
  approvedAt?: string;
  status: 'draft' | 'reviewing' | 'approved' | 'rejected';
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
  startedAt?: string;
  completedAt?: string;
  summary?: string;
  errorMessage?: string;
  totalCost?: CostMetrics;
  phaseCosts?: PhaseCost[];
}

export interface AgentDefinition extends BaseEntity {
  name: string;
  type: string;
  description: string;
  capabilities: string[];
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
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

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureAt?: string;
  successCount?: number;
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
