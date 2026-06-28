import fs from 'fs/promises';
import path from 'path';
import type { FileArtifact } from './output-parser.js';

export interface WriteResult {
  written: string[];
  skipped: string[];
  errors: Array<{ path: string; message: string }>;
}

// Writes the extracted file artifacts from a run into a real directory tree
// so downstream tools (tsc, vitest, npm) can operate against them.
//
// Output lives at: output/projects/{runId}/{filePath}
// Files are always overwritten — the caller is responsible for deciding
// whether to call this (typically once per completed phase or per run).
export class ProjectWriter {
  constructor(private projectRoot: string) {}

  async write(artifacts: FileArtifact[]): Promise<WriteResult> {
    const result: WriteResult = { written: [], skipped: [], errors: [] };

    for (const artifact of artifacts) {
      const absPath = path.join(this.projectRoot, artifact.filePath);

      // Reject any path that escapes the project root.
      if (!absPath.startsWith(this.projectRoot + path.sep) &&
          absPath !== this.projectRoot) {
        result.errors.push({ path: artifact.filePath, message: 'Path escapes project root — skipped' });
        continue;
      }

      try {
        await fs.mkdir(path.dirname(absPath), { recursive: true });
        await fs.writeFile(absPath, artifact.content, 'utf-8');
        result.written.push(artifact.filePath);
      } catch (err) {
        result.errors.push({
          path: artifact.filePath,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return result;
  }

  async writeManifest(artifacts: FileArtifact[], runId: string): Promise<void> {
    const manifest = {
      runId,
      generatedAt: new Date().toISOString(),
      files: artifacts.map(a => ({ path: a.filePath, language: a.language })),
    };
    await fs.mkdir(this.projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(this.projectRoot, '.run-manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf-8'
    );
  }

  get root(): string {
    return this.projectRoot;
  }
}

// Resolve the project output directory for a given run.
// Kept separate so the Validator and Repair loop can locate the same root
// without needing a ProjectWriter instance.
export function projectOutputDir(repoRoot: string, runId: string): string {
  return path.join(repoRoot, 'output', 'projects', runId);
}
