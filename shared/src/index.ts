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

export interface Run extends BaseEntity {
  phaseId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  agentId: string;
  output: unknown;
  summary?: string;
}

export interface AgentDefinition extends BaseEntity {
  name: string;
  type: string;
  description: string;
  capabilities: string[];
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}

export interface User extends BaseEntity {
  email: string;
  name: string;
  role?: string;
}
