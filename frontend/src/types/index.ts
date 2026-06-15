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

// Roadmap
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

// User
export interface User {
  id: string;
  email: string;
  name: string;
}
