import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { PersistenceService } from '../../src/services/persistence.js';

// Fresh-clone guarantee: data/ is gitignored (local-only), so a brand-new clone has NO data
// directory. These tests prove the persistence store bootstraps itself from nothing — the app
// must run on a clean checkout without any committed runtime state.

let base: string;
let dataDir: string;

beforeAll(async () => {
  base = await fs.mkdtemp(path.join(os.tmpdir(), 'persist-'));
  dataDir = path.join(base, 'data'); // intentionally NOT created — simulates a fresh clone
});

afterAll(async () => {
  await fs.rm(base, { recursive: true, force: true });
});

describe('PersistenceService fresh-clone bootstrap', () => {
  it('lists an absent collection as [] without crashing', async () => {
    const p = new PersistenceService({ dataDir });
    expect(await p.list('runs')).toEqual([]);
  });

  it('creates the data store on first write and reads it back', async () => {
    const p = new PersistenceService({ dataDir });
    const created = await p.create<{ id: string; title: string }>('runs', { id: 'r1', title: 'x' });
    expect(created.id).toBe('r1');

    const read = await p.read<{ id: string }>('runs', 'r1');
    expect(read?.id).toBe('r1');

    const all = await p.list<{ id: string }>('runs');
    expect(all.map(r => r.id)).toContain('r1');

    // The directory tree now exists on disk, regenerated from nothing.
    expect((await fs.stat(dataDir)).isDirectory()).toBe(true);
  });
});
