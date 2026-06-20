import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { Artifact, ArtifactMetadata } from '@unifiedaitoolbox/shared';
import { PersistenceService } from './persistence.js';

export interface ArtifactStoreConfig {
  storagePath: string;
  maxFileSize?: number; // bytes
  allowedTypes?: string[];
  checksumAlgorithm?: 'sha256' | 'sha1';
}

export interface SaveArtifactOptions {
  runId: string;
  phaseId?: string;
  taskId?: string;
  name: string;
  storageSubpath?: string;
  type: string;
  mimeType?: string;
  uploadedBy?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export class ArtifactStore {
  private config: Required<ArtifactStoreConfig>;
  private checksumCache: Map<string, string> = new Map();

  constructor(
    private persistence: PersistenceService,
    config: ArtifactStoreConfig
  ) {
    this.config = {
      storagePath: config.storagePath,
      maxFileSize: config.maxFileSize || 100 * 1024 * 1024, // 100MB default
      allowedTypes: config.allowedTypes || ['code', 'log', 'report', 'document', 'data'],
      checksumAlgorithm: config.checksumAlgorithm || 'sha256',
    };
  }

  // Save artifact content
  async saveArtifact(
    content: string | Buffer,
    options: SaveArtifactOptions
  ): Promise<Artifact> {
    // Validate
    if (!options.type || !this.config.allowedTypes.includes(options.type)) {
      throw new Error(`Unsupported artifact type: ${options.type}`);
    }

    const buffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

    if (buffer.length > this.config.maxFileSize) {
      throw new Error(`File size exceeds maximum: ${buffer.length} > ${this.config.maxFileSize}`);
    }

    // Calculate checksum
    const checksum = this.calculateChecksum(buffer);

    // Generate storage path
    const storagePath = this.generateStoragePath(
      options.runId,
      options.name,
      options.storageSubpath
    );

    // Create directory if needed
    await this.ensureDirectory(path.dirname(storagePath));

    // Write file
    await fs.writeFile(storagePath, buffer);

    // Create artifact record
    const artifact: Artifact = {
      id: `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      runId: options.runId,
      phaseId: options.phaseId,
      taskId: options.taskId,
      name: options.name,
      type: options.type,
      mimeType: options.mimeType,
      size: buffer.length,
      checksum,
      contentPath: storagePath,
      downloadUrl: `/api/artifacts/${options.runId}/${options.name}/download`,
      metadata: options.metadata,
      uploadedBy: options.uploadedBy,
      tags: options.tags,
    };

    // Persist artifact metadata
    await this.persistence.create('artifacts', artifact);

    // Cache checksum
    this.checksumCache.set(artifact.id, checksum);

    return artifact;
  }

  // Retrieve artifact content
  async getArtifactContent(artifactId: string): Promise<Buffer> {
    const artifact = await this.persistence.read<Artifact>('artifacts', artifactId);
    if (!artifact) {
      throw new Error(`Artifact not found: ${artifactId}`);
    }

    // Read file
    const content = await fs.readFile(artifact.contentPath);

    // Verify checksum
    const checksum = this.calculateChecksum(content);
    if (checksum !== artifact.checksum) {
      throw new Error(`Checksum mismatch for artifact ${artifactId}`);
    }

    return content;
  }

  // Get artifact metadata
  async getArtifact(artifactId: string): Promise<Artifact | null> {
    return this.persistence.read<Artifact>('artifacts', artifactId);
  }

  // List artifacts for a run
  async getArtifactsForRun(runId: string): Promise<Artifact[]> {
    const allArtifacts = await this.persistence.list<Artifact>('artifacts');
    return allArtifacts.filter(a => a.runId === runId);
  }

  // List artifacts for a task
  async getArtifactsForTask(runId: string, taskId: string): Promise<Artifact[]> {
    const artifacts = await this.getArtifactsForRun(runId);
    return artifacts.filter(a => a.taskId === taskId);
  }

  async getRunArtifactSummary(runId: string): Promise<{
    totalCount: number;
    totalSize: number;
    byType: Record<string, number>;
  }> {
    const artifacts = await this.getArtifactsForRun(runId);
    const byType: Record<string, number> = {};
    let totalSize = 0;

    for (const artifact of artifacts) {
      totalSize += artifact.size;
      byType[artifact.type] = (byType[artifact.type] || 0) + 1;
    }

    return {
      totalCount: artifacts.length,
      totalSize,
      byType,
    };
  }

  // Delete artifact
  async deleteArtifact(artifactId: string): Promise<void> {
    const artifact = await this.persistence.read<Artifact>('artifacts', artifactId);
    if (!artifact) {
      throw new Error(`Artifact not found: ${artifactId}`);
    }

    // Delete file
    try {
      await fs.unlink(artifact.contentPath);
    } catch (error) {
      // File may already be deleted, continue
    }

    // Delete metadata
    await this.persistence.delete('artifacts', artifactId);

    // Clear cache
    this.checksumCache.delete(artifactId);
  }

  // Verify artifact integrity
  async verifyArtifact(artifactId: string): Promise<boolean> {
    try {
      const artifact = await this.persistence.read<Artifact>('artifacts', artifactId);
      if (!artifact) {
        return false;
      }

      const content = await fs.readFile(artifact.contentPath);
      const checksum = this.calculateChecksum(content);

      return checksum === artifact.checksum;
    } catch {
      return false;
    }
  }

  // Cleanup expired artifacts
  async cleanupExpiredArtifacts(): Promise<number> {
    const artifacts = await this.persistence.list<Artifact>('artifacts');
    let cleaned = 0;

    for (const artifact of artifacts) {
      if (artifact.expiresAt && new Date(artifact.expiresAt) < new Date()) {
        await this.deleteArtifact(artifact.id);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Get statistics
  async getStatistics(): Promise<{
    totalArtifacts: number;
    totalSize: number;
    byType: Record<string, number>;
    bySizeRange: {
      small: number; // < 1MB
      medium: number; // 1MB - 10MB
      large: number; // > 10MB
    };
  }> {
    const artifacts = await this.persistence.list<Artifact>('artifacts');

    const stats = {
      totalArtifacts: artifacts.length,
      totalSize: 0,
      byType: {} as Record<string, number>,
      bySizeRange: {
        small: 0,
        medium: 0,
        large: 0,
      },
    };

    for (const artifact of artifacts) {
      stats.totalSize += artifact.size;

      // By type
      stats.byType[artifact.type] = (stats.byType[artifact.type] || 0) + 1;

      // By size range
      if (artifact.size < 1024 * 1024) {
        stats.bySizeRange.small++;
      } else if (artifact.size < 10 * 1024 * 1024) {
        stats.bySizeRange.medium++;
      } else {
        stats.bySizeRange.large++;
      }
    }

    return stats;
  }

  // Search artifacts
  async searchArtifacts(
    query: Partial<{
      runId: string;
      taskId: string;
      type: string;
      tag: string;
      name: string;
    }>
  ): Promise<Artifact[]> {
    const artifacts = await this.persistence.list<Artifact>('artifacts');

    return artifacts.filter(a => {
      if (query.runId && a.runId !== query.runId) {
        return false;
      }
      if (query.taskId && a.taskId !== query.taskId) {
        return false;
      }
      if (query.type && a.type !== query.type) {
        return false;
      }
      if (query.tag && (!a.tags || !a.tags.includes(query.tag))) {
        return false;
      }
      if (query.name && !a.name.includes(query.name)) {
        return false;
      }
      return true;
    });
  }

  // Private helpers

  private calculateChecksum(content: Buffer): string {
    const hash = createHash(this.config.checksumAlgorithm);
    hash.update(content);
    return hash.digest('hex');
  }

  private generateStoragePath(
    runId: string,
    filename: string,
    storageSubpath?: string
  ): string {
    if (storageSubpath) {
      const safeSegments = storageSubpath
        .replace(/\\/g, '/')
        .split('/')
        .filter(Boolean)
        .map(segment => this.sanitizePathSegment(segment));

      return path.join(this.config.storagePath, runId, ...safeSegments);
    }

    const timestamp = Date.now();
    const sanitized = this.sanitizePathSegment(filename);
    return path.join(this.config.storagePath, runId, timestamp.toString(), sanitized);
  }

  private sanitizePathSegment(segment: string): string {
    return segment.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory may already exist
    }
  }

  // Get checksum for artifact
  async getArtifactChecksum(artifactId: string): Promise<string | null> {
    // Check cache first
    if (this.checksumCache.has(artifactId)) {
      return this.checksumCache.get(artifactId) || null;
    }

    const artifact = await this.persistence.read<Artifact>('artifacts', artifactId);
    if (!artifact) {
      return null;
    }

    this.checksumCache.set(artifactId, artifact.checksum);
    return artifact.checksum;
  }

  // Clear checksum cache
  clearChecksumCache(): void {
    this.checksumCache.clear();
  }
}
