import { IRepository, ListOptions, PagedResult, ITransaction } from './IRepository';
import { Plan } from './IPlanRepository';

/**
 * Roadmap Entity
 * Represents a high-level roadmap containing multiple plans
 */
export interface Roadmap {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'draft' | 'published' | 'deprecated' | 'archived';
  owner: string; // User ID
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  deprecated?: boolean;
  deprecatedAt?: Date;
  planCount?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Roadmap Repository Interface
 * Specialized operations for roadmap management
 */
export interface IRoadmapRepository extends IRepository<Roadmap> {
  /**
   * Find all roadmaps owned by a user
   * @param ownerId The user identifier
   * @param options Pagination and filtering options
   * @returns Paged result of roadmaps
   */
  findByOwnerId(
    ownerId: string,
    options?: ListOptions
  ): Promise<PagedResult<Roadmap>>;

  /**
   * Find published roadmaps
   * @param options Pagination and filtering options
   * @returns Paged result of published roadmaps
   */
  findPublished(
    options?: ListOptions
  ): Promise<PagedResult<Roadmap>>;

  /**
   * Publish a roadmap (mark as published and create version snapshot)
   * @param roadmapId The roadmap identifier
   * @param transaction Optional transaction context
   * @returns Updated roadmap
   */
  publish(
    roadmapId: string,
    transaction?: ITransaction
  ): Promise<Roadmap>;

  /**
   * Deprecate a roadmap
   * @param roadmapId The roadmap identifier
   * @param replacementRoadmapId Optional ID of replacement roadmap
   * @param transaction Optional transaction context
   * @returns Updated roadmap
   */
  deprecate(
    roadmapId: string,
    replacementRoadmapId?: string,
    transaction?: ITransaction
  ): Promise<Roadmap>;

  /**
   * Duplicate a roadmap with all its plans
   * @param sourceRoadmapId The roadmap to duplicate
   * @param newName Name for the duplicated roadmap
   * @param transaction Optional transaction context
   * @returns The new roadmap
   */
  duplicate(
    sourceRoadmapId: string,
    newName: string,
    transaction?: ITransaction
  ): Promise<Roadmap>;

  /**
   * Get roadmap with all related plans
   * @param roadmapId The roadmap identifier
   * @returns Roadmap with nested plans
   */
  readWithPlans(roadmapId: string): Promise<RoadmapWithPlans | null>;

  /**
   * Get roadmap statistics
   * @param roadmapId The roadmap identifier
   * @returns Statistics about the roadmap
   */
  getStatistics(roadmapId: string): Promise<RoadmapStatistics>;

  /**
   * Check if roadmap name is unique for owner
   * @param name Roadmap name
   * @param ownerId Owner identifier
   * @param excludeRoadmapId Optional roadmap ID to exclude from check
   * @returns True if name is unique
   */
  isNameUnique(
    name: string,
    ownerId: string,
    excludeRoadmapId?: string
  ): Promise<boolean>;

  /**
   * Update roadmap version
   * @param roadmapId The roadmap identifier
   * @param newVersion New version string
   * @param transaction Optional transaction context
   * @returns Updated roadmap
   */
  updateVersion(
    roadmapId: string,
    newVersion: string,
    transaction?: ITransaction
  ): Promise<Roadmap>;
}

/**
 * Roadmap with nested plans
 */
export interface RoadmapWithPlans extends Roadmap {
  plans: Plan[];
}

/**
 * Roadmap statistics
 */
export interface RoadmapStatistics {
  totalPlans: number;
  plansByStatus: Record<string, number>;
  plansByPriority: Record<string, number>;
  averagePlanDuration?: number;
  totalRunsCount: number;
  successRatePercentage: number;
  lastModifiedDate: Date;
}
