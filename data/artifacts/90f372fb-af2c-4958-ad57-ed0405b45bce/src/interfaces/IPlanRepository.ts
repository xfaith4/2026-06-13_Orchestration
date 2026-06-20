import { IRepository, ListOptions, PagedResult, ITransaction } from './IRepository';

/**
 * Plan Entity
 * Represents a plan with metadata and status tracking
 */
export interface Plan {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  owner: string; // User ID
  roadmapId: string;
  createdAt: Date;
  updatedAt: Date;
  startDate?: Date;
  endDate?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Plan Repository Interface
 * Specialized operations for plan management
 */
export interface IPlanRepository extends IRepository<Plan> {
  /**
   * Find all plans for a specific roadmap
   * @param roadmapId The roadmap identifier
   * @param options Pagination and filtering options
   * @returns Paged result of plans
   */
  findByRoadmapId(
    roadmapId: string,
    options?: ListOptions
  ): Promise<PagedResult<Plan>>;

  /**
   * Find all plans owned by a specific user
   * @param ownerId The user identifier
   * @param options Pagination and filtering options
   * @returns Paged result of plans
   */
  findByOwnerId(
    ownerId: string,
    options?: ListOptions
  ): Promise<PagedResult<Plan>>;

  /**
   * Find plans by status
   * @param status The plan status
   * @param options Pagination and filtering options
   * @returns Paged result of plans
   */
  findByStatus(
    status: Plan['status'],
    options?: ListOptions
  ): Promise<PagedResult<Plan>>;

  /**
   * Update plan status atomically
   * @param planId The plan identifier
   * @param newStatus The new status
   * @param transaction Optional transaction context
   * @returns Updated plan
   */
  updateStatus(
    planId: string,
    newStatus: Plan['status'],
    transaction?: ITransaction
  ): Promise<Plan>;

  /**
   * Bulk update plans matching criteria
   * @param filter Filter criteria
   * @param updates Updates to apply
   * @param transaction Optional transaction context
   * @returns Count of updated plans
   */
  bulkUpdate(
    filter: Partial<Plan>,
    updates: Partial<Plan>,
    transaction?: ITransaction
  ): Promise<number>;

  /**
   * Archive old plans
   * @param beforeDate Plans created before this date
   * @param transaction Optional transaction context
   * @returns Count of archived plans
   */
  archiveOlderThan(
    beforeDate: Date,
    transaction?: ITransaction
  ): Promise<number>;

  /**
   * Get plans with related roadmap and run information
   * @param planId The plan identifier
   * @returns Plan with nested relations
   */
  readWithRelations(planId: string): Promise<PlanWithRelations | null>;

  /**
   * Check if plan name is unique within roadmap
   * @param name Plan name
   * @param roadmapId Roadmap identifier
   * @param excludePlanId Optional plan ID to exclude from check
   * @returns True if name is unique
   */
  isNameUnique(
    name: string,
    roadmapId: string,
    excludePlanId?: string
  ): Promise<boolean>;
}

/**
 * Plan with relations
 */
export interface PlanWithRelations extends Plan {
  roadmap?: {
    id: string;
    name: string;
  };
  runs?: Array<{
    id: string;
    status: string;
    createdAt: Date;
  }>;
}
