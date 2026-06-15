// Application intake
export interface Application {
  id: string;
  name: string;
  description: string;
  goal: string;
  requirements: string[];
  targetAudience?: string;
  constraints?: string[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

// Design plan
export interface DesignComponent {
  name: string;
  description: string;
  responsibility: string;
  interfaces: string[];
}

export interface DesignPlan {
  id: string;
  applicationId: string;
  overview: string;
  architecture: string;
  components: DesignComponent[];
  tradeoffs: string[];
  recommendations: string[];
  approvedBy?: string;
  approvedAt?: string;
  status: 'draft' | 'reviewing' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

// Roadmap & Execution
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

export interface Roadmap {
  id: string;
  applicationId: string;
  designPlanId: string;
  title: string;
  description: string;
  phases: Phase[];
  estimatedDuration: string;
  approvedBy?: string;
  approvedAt?: string;
  status: 'draft' | 'reviewing' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
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

export interface Run {
  id: string;
  roadmapId: string;
  applicationId: string;
  title: string;
  description: string;
  phases: ExecutionPhase[];
  status: 'draft' | 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  startedAt?: string;
  completedAt?: string;
  summary?: string;
  errorMessage?: string;
  totalCost?: CostMetrics;
  phaseCosts?: PhaseCost[];
  createdAt: string;
  updatedAt: string;
}

// User
export interface User {
  id: string;
  email: string;
  name: string;
}
