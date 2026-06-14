import { describe, it, expect, beforeEach } from 'vitest';
import { PersistenceService } from '../../src/services/persistence';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataDir = path.join(__dirname, '../../.test-data');

describe('PersistenceService', () => {
  let persistence: PersistenceService;

  beforeEach(async () => {
    persistence = new PersistenceService({ dataDir: testDataDir });
    try {
      await fs.rm(testDataDir, { recursive: true });
    } catch {}
  });

  it('should create an entity', async () => {
    const data = { name: 'Test App', description: 'Test Description', status: 'draft' };
    const result = await persistence.create('test-collection', data);
    
    expect(result.id).toBeDefined();
    expect(result.name).toBe('Test App');
    expect(result.createdAt).toBeDefined();
  });

  it('should read an entity', async () => {
    const data = { name: 'Test App', status: 'draft' };
    const created = await persistence.create('test-collection', data);
    const read = await persistence.read('test-collection', created.id);
    
    expect(read).toBeDefined();
    expect(read?.name).toBe('Test App');
  });

  it('should list entities', async () => {
    await persistence.create('test-collection', { name: 'App 1', status: 'draft' });
    await persistence.create('test-collection', { name: 'App 2', status: 'draft' });
    
    const list = await persistence.list('test-collection');
    expect(list.length).toBe(2);
  });

  it('should update an entity', async () => {
    const created = await persistence.create('test-collection', { name: 'Test', status: 'draft' });
    const updated = await persistence.update('test-collection', created.id, { status: 'approved' });
    
    expect(updated?.status).toBe('approved');
  });

  it('should delete an entity', async () => {
    const created = await persistence.create('test-collection', { name: 'Test', status: 'draft' });
    const deleted = await persistence.delete('test-collection', created.id);
    const read = await persistence.read('test-collection', created.id);
    
    expect(deleted).toBe(true);
    expect(read).toBeNull();
  });
});
