import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { collectProducedFiles, projectOutputDir } from '../../src/services/project-writer.js';

let tmp: string;

beforeAll(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'produced-'));
  await fs.mkdir(path.join(tmp, 'src'), { recursive: true });
  await fs.writeFile(path.join(tmp, 'package.json'), '{}');
  await fs.writeFile(path.join(tmp, 'src', 'index.ts'), 'export {}');
  // node_modules should be detected but excluded from the listing
  await fs.mkdir(path.join(tmp, 'node_modules', 'left-pad'), { recursive: true });
  await fs.writeFile(path.join(tmp, 'node_modules', 'left-pad', 'index.js'), '//');
});

afterAll(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
});

describe('projectOutputDir', () => {
  it('resolves to output/projects/<runId>', () => {
    expect(projectOutputDir('/repo', 'abc-123')).toBe(path.join('/repo', 'output', 'projects', 'abc-123'));
  });
});

describe('collectProducedFiles', () => {
  it('lists files relative to root (sorted), flags node_modules but skips it', async () => {
    const r = await collectProducedFiles(tmp);
    expect(r.files).toEqual(['package.json', 'src/index.ts']);
    expect(r.count).toBe(2);
    expect(r.hasNodeModules).toBe(true);
    expect(r.truncated).toBe(false);
  });

  it('returns an empty result for a non-existent directory', async () => {
    const r = await collectProducedFiles(path.join(tmp, 'nope'));
    expect(r.count).toBe(0);
    expect(r.files).toEqual([]);
    expect(r.hasNodeModules).toBe(false);
  });
});
