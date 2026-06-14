// Core domain types for UnifiedAIToolbox (Phase 2)

// API Response
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  environment: string;
}

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// Application
export interface Application extends BaseEntity {
  name: string;
  description: string;
  goal: string;
  requirements: string[];
  targetAudience?: string;
  constraints?: string[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
}

// Design Plan
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

export interface DesignComponent {
  name: string;
  description: string;
  responsibility: string;
  interfaces: string[];
}

// Roadmap
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
  phaseId: string;
  title: string;
  description: string;
  assignedAgent?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  estimatedHours?: number;
  acceptanceCriteria: string[];
  dependencies: string[];
}

// Run
export interface Run extends BaseEntity {
  roadmapId: string;
  status: 'pending' | 'executing' | 'paused' | 'completed' | 'failed';
  currentPhase?: number;
  currentTask?: string;
  startedAt?: string;
  completedAt?: string;
  costMetrics: CostMetrics;
  auditEvents: AuditEvent[];
  artifacts: string[];
  failures: FailureRecord[];
  repairs: RepairRecord[];
  summary?: RunSummary;
}

export interface RunSummary {
  success: boolean;
  outcome: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  totalCost: number;
  lessonsLearned: string[];
}

// Agent
export interface AgentDefinition extends BaseEntity {
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  tools: string[];
  playbook: string[];
  constraints?: Record<string, unknown>;
  model?: string;
  status: 'active' | 'inactive' | 'deprecated';
}

// Prompt
export interface PromptDefinition extends BaseEntity {
  name: string;
  agentId: string;
  version: number;
  content: string;
  variables: PromptVariable[];
  status: 'draft' | 'active' | 'archived';
}

export interface PromptVariable {
  name: string;
  description: string;
  type: string;
  required: boolean;
}

// Contract
export interface ContractDefinition extends BaseEntity {
  name: string;
  version: string;
  description: string;
  schema: JSONSchema;
  usage: string;
}

// Audit
export interface AuditEvent extends BaseEntity {
  runId: string;
  eventType: string;
  traceId: string;
  status: 'pending' | 'success' | 'failure';
  metadata: Record<string, unknown>;
}

// Cost
export interface CostMetrics {
  totalCost: number;
  apiCallsCost: number;
  tokensUsed: number;
  modelUsed: string;
}

// Failure
export interface FailureRecord {
  id: string;
  timestamp: string;
  taskId: string;
  failureType: string;
  message: string;
  recoverable: boolean;
}

// Repair
export interface RepairRecord {
  id: string;
  timestamp: string;
  failureId: string;
  strategy: string;
  result: 'success' | 'failure' | 'escalated';
}

// Artifact
export interface Artifact extends BaseEntity {
  runId: string;
  taskId?: string;
  name: string;
  type: string;
  path: string;
  size: number;
  checksum: string;
}

// JSON Schema
export interface JSONSchema {
  type?: string | string[];
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean | JSONSchema;
  enum?: unknown[];
  description?: string;
  [key: string]: unknown;
}

// User
export interface User extends BaseEntity {
  email: string;
  name: string;
  role: 'admin' | 'engineer' | 'reviewer' | 'viewer';
  status: 'active' | 'inactive';
}
