import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import express from 'express';
import { PersistenceService } from '../../src/services/persistence.js';
import { ValidationService } from '../../src/services/validation.js';
import { createApiRoutes } from '../../src/routes/index.js';
import { errorHandler, notFoundHandler } from '../../src/middleware/error-handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataDir = path.join(__dirname, '../../.test-data');

describe('Applications API', () => {
  let app: express.Application;
  let persistence: PersistenceService;
  let schemasDir: string;

  beforeAll(async () => {
    schemasDir = path.join(__dirname, '../../../shared/src/schemas');
    persistence = new PersistenceService({ dataDir: testDataDir });
    
    const validation = new ValidationService(schemasDir);

    app = express();
    app.use(express.json());
    app.use('/api', createApiRoutes(persistence, validation));
    app.use(notFoundHandler);
    app.use(errorHandler);

    try {
      await fs.rm(testDataDir, { recursive: true });
    } catch {}
  });

  afterAll(async () => {
    try {
      await fs.rm(testDataDir, { recursive: true });
    } catch {}
  });

  it('POST /api/applications - create application', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({
        name: 'Test App',
        description: 'Test Description',
        goal: 'Test Goal',
        requirements: ['req1'],
        status: 'draft'
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.name).toBe('Test App');
  });

  it('GET /api/applications - list applications', async () => {
    const res = await request(app).get('/api/applications');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/applications/:id - get application by id', async () => {
    const created = await request(app)
      .post('/api/applications')
      .send({
        name: 'Test App 2',
        description: 'Desc',
        goal: 'Goal',
        requirements: [],
        status: 'draft'
      });

    const id = created.body.data.id;
    const res = await request(app).get(`/api/applications/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  it('POST /api/applications - validation error', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({ name: 'Test' }); // Missing required fields

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('GET /api/applications/:id - not found', async () => {
    const res = await request(app).get('/api/applications/nonexistent');

    expect(res.status).toBe(404);
  });
});
