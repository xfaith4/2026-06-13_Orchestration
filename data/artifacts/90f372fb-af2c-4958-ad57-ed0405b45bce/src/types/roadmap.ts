export type ISO8601String = string;

export interface Roadmap {
  id: string;
  name: string;
  description: string;
  planId: string;
  startDate: ISO8601String;
  endDate: ISO8601String;
  status: 'draft' | 'active' | 'archived';
  version: number;
  milestones?: Milestone[];
  metadata?: Record<string, unknown>;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface Milestone {
  id: string;
  roadmapId: string;
  name: string;
  description?: string;
  targetDate: ISO8601String;
  completedDate?: ISO8601String;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface RoadmapCreateInput {
  name: string;
  description?: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  milestones?: Omit<Milestone, 'id' | 'roadmapId'>[];
  metadata?: Record<string, unknown>;
}

export interface RoadmapUpdateInput {
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: 'draft' | 'active' | 'archived';
  metadata?: Record<string, unknown>;
}
