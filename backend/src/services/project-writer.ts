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

// Walk a produced-app directory, returning relative file paths. Caps the count and skips
// heavy/derived directories (node_modules, .git, build output) so the listing stays useful.
const PRODUCED_FILES_CAP = 300;
const PRODUCED_SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', 'coverage', '.turbo']);

export interface ProducedFiles {
  files: string[];
  count: number;
  truncated: boolean;
  hasNodeModules: boolean;
}

export async function collectProducedFiles(dir: string): Promise<ProducedFiles> {
  const files: string[] = [];
  let truncated = false;
  let hasNodeModules = false;

  async function walk(current: string, rel: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (e.name === 'node_modules') hasNodeModules = true;
        if (PRODUCED_SKIP_DIRS.has(e.name)) continue;
        await walk(path.join(current, e.name), childRel);
      } else if (e.isFile()) {
        if (files.length >= PRODUCED_FILES_CAP) {
          truncated = true;
          continue;
        }
        files.push(childRel);
      }
    }
  }

  await walk(dir, '');
  files.sort();
  return { files, count: files.length, truncated, hasNodeModules };
}
