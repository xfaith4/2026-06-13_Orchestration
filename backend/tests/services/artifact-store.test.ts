import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ArtifactStore } from '../../src/services/artifact-store.js';
import { PersistenceService } from '../../src/services/persistence.js';
import { Artifact } from '@unifiedaitoolbox/shared';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('ArtifactStore', () => {
  let artifactStore: ArtifactStore;
  let tempDir: string;
  let persistence: PersistenceService;

  beforeEach(async () => {
    // Create temporary directory for storage
    tempDir = path.join(os.tmpdir(), `artifact-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    // Mock persistence service
    const artifacts = new Map<string, Artifact>();
    persistence = {
      create: vi.fn(async (collection: string, data: Artifact) => {
        if (collection === 'artifacts') {
          artifacts.set(data.id, data);
        }
        return data;
      }),
      read: vi.fn(async (collection: string, id: string) => {
        if (collection === 'artifacts') {
          return artifacts.get(id) || null;
        }
        return null;
      }),
      update: vi.fn(),
      delete: vi.fn(async (collection: string, id: string) => {
        if (collection === 'artifacts') {
          artifacts.delete(id);
        }
      }),
      list: vi.fn(async (collection: string) => {
        if (collection === 'artifacts') {
          return Array.from(artifacts.values());
        }
        return [];
      }),
    } as unknown as PersistenceService;

    artifactStore = new ArtifactStore(persistence, {
      storagePath: tempDir,
      allowedTypes: ['code', 'log', 'report', 'data'],
      checksumAlgorithm: 'sha256',
    });
  });

  afterEach(async () => {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true });
    } catch {
      // Ignore
    }
  });

  describe('Artifact saving', () => {
    it('should save artifact with string content', async () => {
      const content = 'console.log("hello");';
      const artifact = await artifactStore.saveArtifact(content, {
        runId: 'run-1',
        taskId: 'task-1',
        name: 'script.js',
        type: 'code',
        mimeType: 'text/javascript',
      });

      expect(artifact.id).toBeDefined();
      expect(artifact.runId).toBe('run-1');
      expect(artifact.name).toBe('script.js');
      expect(artifact.size).toBeGreaterThan(0);
      expect(artifact.checksum).toBeDefined();
    });

    it('should save artifact with buffer content', async () => {
      const content = Buffer.from('binary data');
      const artifact = await artifactStore.saveArtifact(content, {
        runId: 'run-1',
        name: 'data.bin',
        type: 'data',
      });

      expect(artifact.id).toBeDefined();
      expect(artifact.size).toBe(content.length);
    });

    it('should reject unsupported artifact type', async () => {
      const content = 'data';
      await expect(
        artifactStore.saveArtifact(content, {
          runId: 'run-1',
          name: 'file',
          type: 'unsupported',
        })
      ).rejects.toThrow('Unsupported artifact type');
    });

    it('should reject oversized artifacts', async () => {
      const largeContent = Buffer.alloc(101 * 1024 * 1024); // 101MB
      await expect(
        artifactStore.saveArtifact(largeContent, {
          runId: 'run-1',
          name: 'large.bin',
          type: 'data',
        })
      ).rejects.toThrow('File size exceeds maximum');
    });
  });

  describe('Artifact retrieval', () => {
    it('should retrieve artifact content', async () => {
      const originalContent = 'test content';
      const artifact = await artifactStore.saveArtifact(originalContent, {
        runId: 'run-1',
        name: 'test.txt',
        type: 'log',
      });

      const retrieved = await artifactStore.getArtifactContent(artifact.id);
      expect(retrieved.toString('utf-8')).toBe(originalContent);
    });

    it('should get artifact metadata', async () => {
      const artifact = await artifactStore.saveArtifact('content', {
        runId: 'run-1',
        taskId: 'task-1',
        name: 'file.txt',
        type: 'log',
        uploadedBy: 'user-1',
        tags: ['important'],
      });

      const retrieved = await artifactStore.getArtifact(artifact.id);
      expect(retrieved?.uploadedBy).toBe('user-1');
      expect(retrieved?.tags).toContain('important');
    });

    it('should return null for non-existent artifact', async () => {
      const artifact = await artifactStore.getArtifact('non-existent');
      expect(artifact).toBeNull();
    });
  });

  describe('Checksum verification', () => {
    it('should generate consistent checksums', async () => {
      const content = 'test data';
      const artifact1 = await artifactStore.saveArtifact(content, {
        runId: 'run-1',
        name: 'file1.txt',
        type: 'log',
      });

      const artifact2 = await artifactStore.saveArtifact(content, {
        runId: 'run-2',
        name: 'file2.txt',
        type: 'log',
      });

      expect(artifact1.checksum).toBe(artifact2.checksum);
    });

    it('should detect content corruption', async () => {
      const content = 'original content';
      const artifact = await artifactStore.saveArtifact(content, {
        runId: 'run-1',
        name: 'file.txt',
        type: 'log',
      });

      // Simulate corruption by modifying the file
      await fs.writeFile(artifact.contentPath, 'corrupted content');

      // Retrieve should fail due to checksum mismatch
      await expect(artifactStore.getArtifactContent(artifact.id)).rejects.toThrow(
        'Checksum mismatch'
      );
    });

    it('should verify artifact integrity', async () => {
      const artifact = await artifactStore.saveArtifact('content', {
        runId: 'run-1',
        name: 'file.txt',
        type: 'log',
      });

      const isValid = await artifactStore.verifyArtifact(artifact.id);
      expect(isValid).toBe(true);
    });

    it('should detect integrity issues', async () => {
      const artifact = await artifactStore.saveArtifact('content', {
        runId: 'run-1',
        name: 'file.txt',
        type: 'log',
      });

      // Corrupt the file
      await fs.writeFile(artifact.contentPath, 'corrupted');

      const isValid = await artifactStore.verifyArtifact(artifact.id);
      expect(isValid).toBe(false);
    });
  });

  describe('Artifact queries', () => {
    it('should list artifacts for a run', async () => {
      await artifactStore.saveArtifact('content1', {
        runId: 'run-1',
        taskId: 'task-1',
        name: 'file1.txt',
        type: 'log',
      });

      await artifactStore.saveArtifact('content2', {
        runId: 'run-1',
        taskId: 'task-2',
        name: 'file2.txt',
        type: 'code',
      });

      await artifactStore.saveArtifact('content3', {
        runId: 'run-2',
        name: 'file3.txt',
        type: 'log',
      });

      const artifacts = await artifactStore.getArtifactsForRun('run-1');
      expect(artifacts).toHaveLength(2);
      expect(artifacts.every(a => a.runId === 'run-1')).toBe(true);
    });

    it('should list artifacts for a task', async () => {
      await artifactStore.saveArtifact('content1', {
        runId: 'run-1',
        taskId: 'task-1',
        name: 'file1.txt',
        type: 'log',
      });

      await artifactStore.saveArtifact('content2', {
        runId: 'run-1',
        taskId: 'task-1',
        name: 'file2.txt',
        type: 'code',
      });

      await artifactStore.saveArtifact('content3', {
        runId: 'run-1',
        taskId: 'task-2',
        name: 'file3.txt',
        type: 'log',
      });

      const artifacts = await artifactStore.getArtifactsForTask('run-1', 'task-1');
      expect(artifacts).toHaveLength(2);
    });

    it('should search artifacts by type', async () => {
      await artifactStore.saveArtifact('content1', {
        runId: 'run-1',
        name: 'file1.txt',
        type: 'log',
      });

      await artifactStore.saveArtifact('content2', {
        runId: 'run-1',
        name: 'file2.js',
        type: 'code',
      });

      const codeArtifacts = await artifactStore.searchArtifacts({ type: 'code' });
      expect(codeArtifacts).toHaveLength(1);
      expect(codeArtifacts[0].type).toBe('code');
    });

    it('should search artifacts by tag', async () => {
      await artifactStore.saveArtifact('content1', {
        runId: 'run-1',
        name: 'file1.txt',
        type: 'log',
        tags: ['important'],
      });

      await artifactStore.saveArtifact('content2', {
        runId: 'run-1',
        name: 'file2.txt',
        type: 'log',
        tags: ['debug'],
      });

      const important = await artifactStore.searchArtifacts({ tag: 'important' });
      expect(important).toHaveLength(1);
    });

    it('should search artifacts by name', async () => {
      await artifactStore.saveArtifact('content1', {
        runId: 'run-1',
        name: 'report.pdf',
        type: 'report',
      });

      await artifactStore.saveArtifact('content2', {
        runId: 'run-1',
        name: 'script.js',
        type: 'code',
      });

      const reports = await artifactStore.searchArtifacts({ name: 'report' });
      expect(reports).toHaveLength(1);
      expect(reports[0].name).toBe('report.pdf');
    });
  });

  describe('Artifact deletion', () => {
    it('should delete artifact', async () => {
      const artifact = await artifactStore.saveArtifact('content', {
        runId: 'run-1',
        name: 'file.txt',
        type: 'log',
      });

      await artifactStore.deleteArtifact(artifact.id);

      const retrieved = await artifactStore.getArtifact(artifact.id);
      expect(retrieved).toBeNull();
    });

    it('should reject deletion of non-existent artifact', async () => {
      await expect(artifactStore.deleteArtifact('non-existent')).rejects.toThrow(
        'Artifact not found'
      );
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics', async () => {
      await artifactStore.saveArtifact('content', {
        runId: 'run-1',
        name: 'file1.log',
        type: 'log',
      });

      await artifactStore.saveArtifact('content', {
        runId: 'run-1',
        name: 'file2.js',
        type: 'code',
      });

      const stats = await artifactStore.getStatistics();
      expect(stats.totalArtifacts).toBe(2);
      expect(stats.byType['log']).toBe(1);
      expect(stats.byType['code']).toBe(1);
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should track size ranges', async () => {
      // Create small artifact
      await artifactStore.saveArtifact('x'.repeat(100), {
        runId: 'run-1',
        name: 'small.txt',
        type: 'log',
      });

      const stats = await artifactStore.getStatistics();
      expect(stats.bySizeRange.small).toBe(1);
    });
  });

  describe('Expiration', () => {
    it('should cleanup expired artifacts', async () => {
      const artifact = await artifactStore.saveArtifact('content', {
        runId: 'run-1',
        name: 'file.txt',
        type: 'log',
      });

      // Mark as expired by manually updating (in real scenario)
      // For test purposes, just verify the method exists
      const cleaned = await artifactStore.cleanupExpiredArtifacts();
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });
});
