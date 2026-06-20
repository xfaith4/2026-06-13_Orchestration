import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Represents a Roadmap entity with metadata and parent reference
 */
export interface Roadmap {
  id: string;
  planId: string; // Parent reference
  name: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  startDate: ISO8601String;
  endDate: ISO8601String;
  milestones: Milestone[];
  metadata: Record<string, unknown>;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
  version: number;
}

export interface Milestone {
  id: string;
  name: string;
  targetDate: ISO8601String;
  completedDate?: ISO8601String;
  status: 'pending' | 'in_progress' | 'completed';
}

type ISO8601String = string;

/**
 * RoadmapRepository handles persistence of roadmaps with parent-child relationships
 * Follows same pattern as PlanRepository
 */
export class RoadmapRepository {
  private readonly basePath: string;
  private readonly dataDir = '/data/roadmaps';

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
  }

  /**
   * Initialize repository directory structure
   */
  async initialize(): Promise<void> {
    const fullPath = path.join(this.basePath, this.dataDir);
    try {
      await fs.mkdir(fullPath, { recursive: true });
      // Create index file for quick lookups
      const indexPath = path.join(fullPath, '_index.json');
      try {
        await fs.access(indexPath);
      } catch {
        await fs.writeFile(indexPath, JSON.stringify({ roadmaps: {}, planMap: {} }, null, 2));
      }
    } catch (error) {
      throw new Error(`Failed to initialize RoadmapRepository: ${error}`);
    }
  }

  /**
   * Create a new roadmap
   */
  async create(planId: string, data: Omit<Roadmap, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<Roadmap> {
    const roadmap: Roadmap = {
      ...data,
      id: uuidv4(),
      planId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    const filePath = this.getFilePath(roadmap.id);
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(roadmap, null, 2));

    // Update index
    await this.updateIndex(roadmap.id, planId, 'add');

    return roadmap;
  }

  /**
   * Retrieve roadmap by ID
   */
  async read(roadmapId: string): Promise<Roadmap | null> {
    try {
      const filePath = this.getFilePath(roadmapId);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update roadmap with optimistic concurrency control
   */
  async update(roadmapId: string, updates: Partial<Omit<Roadmap, 'id' | 'planId' | 'createdAt' | 'version'>>, expectedVersion?: number): Promise<Roadmap> {
    const roadmap = await this.read(roadmapId);
    if (!roadmap) {
      throw new Error(`Roadmap ${roadmapId} not found`);
    }

    if (expectedVersion !== undefined && roadmap.version !== expectedVersion) {
      throw new Error(`Version mismatch: expected ${expectedVersion}, got ${roadmap.version}`);
    }

    const updated: Roadmap = {
      ...roadmap,
      ...updates,
      id: roadmap.id,
      planId: roadmap.planId,
      createdAt: roadmap.createdAt,
      version: roadmap.version + 1,
      updatedAt: new Date().toISOString(),
    };

    const filePath = this.getFilePath(roadmapId);
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2));

    return updated;
  }

  /**
   * Delete roadmap and cascade to child runs
   */
  async delete(roadmapId: string, cascadeToRuns: boolean = false): Promise<void> {
    const roadmap = await this.read(roadmapId);
    if (!roadmap) {
      throw new Error(`Roadmap ${roadmapId} not found`);
    }

    // If cascadeToRuns, delete all associated runs (handled by RunRepository)
    if (cascadeToRuns) {
      // This is handled by the service layer coordinating with RunRepository
      // The repository only manages its own deletion
    }

    const filePath = this.getFilePath(roadmapId);
    await fs.unlink(filePath);

    // Update index
    await this.updateIndex(roadmapId, roadmap.planId, 'remove');
  }

  /**
   * Find all roadmaps for a given plan
   */
  async findByPlanId(planId: string): Promise<Roadmap[]> {
    try {
      const indexPath = path.join(this.basePath, this.dataDir, '_index.json');
      const indexData = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexData);

      const roadmapIds: string[] = index.planMap[planId] || [];
      const roadmaps: Roadmap[] = [];

      for (const roadmapId of roadmapIds) {
        const roadmap = await this.read(roadmapId);
        if (roadmap) {
          roadmaps.push(roadmap);
        }
      }

      return roadmaps;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Batch read multiple roadmaps
   */
  async readMany(roadmapIds: string[]): Promise<Map<string, Roadmap>> {
    const results = new Map<string, Roadmap>();

    for (const roadmapId of roadmapIds) {
      const roadmap = await this.read(roadmapId);
      if (roadmap) {
        results.set(roadmapId, roadmap);
      }
    }

    return results;
  }

  /**
   * Query roadmaps by status
   */
  async findByStatus(planId: string, status: Roadmap['status']): Promise<Roadmap[]> {
    const roadmaps = await this.findByPlanId(planId);
    return roadmaps.filter(r => r.status === status);
  }

  /**
   * Private helper: Get file path for roadmap
   */
  private getFilePath(roadmapId: string): string {
    // Organize by first 2 chars of UUID for balanced directory structure
    const prefix = roadmapId.substring(0, 2);
    return path.join(this.basePath, this.dataDir, prefix, `${roadmapId}.json`);
  }

  /**
   * Private helper: Update index for quick lookups
   */
  private async updateIndex(roadmapId: string, planId: string, operation: 'add' | 'remove'): Promise<void> {
    const indexPath = path.join(this.basePath, this.dataDir, '_index.json');

    try {
      const indexData = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(indexData);

      if (operation === 'add') {
        if (!index.planMap[planId]) {
          index.planMap[planId] = [];
        }
        if (!index.planMap[planId].includes(roadmapId)) {
          index.planMap[planId].push(roadmapId);
        }
        index.roadmaps[roadmapId] = { planId, timestamp: new Date().toISOString() };
      } else if (operation === 'remove') {
        if (index.planMap[planId]) {
          index.planMap[planId] = index.planMap[planId].filter((id: string) => id !== roadmapId);
        }
        delete index.roadmaps[roadmapId];
      }

      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    } catch (error) {
      // Index corruption is non-fatal; log and continue
      console.warn(`Warning: Could not update roadmap index: ${error}`);
    }
  }
}
