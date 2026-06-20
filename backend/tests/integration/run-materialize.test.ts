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
import { Run } from '@unifiedaitoolbox/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDataDir = path.join(__dirname, '../../.test-data-materialize');

describe('Run materialization API', () => {
  let app: express.Application;
  let persistence: PersistenceService;

  beforeAll(async () => {
    const schemasDir = path.join(__dirname, '../../../shared/src/schemas');
    persistence = new PersistenceService({ dataDir: testDataDir });
    const validation = new ValidationService(schemasDir);

    app = express();
    app.use(express.json());
    app.use('/api', createApiRoutes(persistence, validation));
    app.use(notFoundHandler);
    app.use(errorHandler);

    try {
      await fs.rm(testDataDir, { recursive: true });
    } catch {
      // Ignore cleanup failures before setup.
    }
  });

  afterAll(async () => {
    try {
      await fs.rm(testDataDir, { recursive: true });
    } catch {
      // Ignore cleanup failures after tests.
    }
  });

  it('materializes file artifacts and refreshes the run summary', async () => {
    const run: Run = {
      id: 'run-materialize-1',
      createdAt: new Date(Date.now() - 15000).toISOString(),
      updatedAt: new Date().toISOString(),
      roadmapId: 'roadmap-1',
      applicationId: 'app-1',
      title: 'Materialize test run',
      description: 'Exercise retroactive artifact extraction',
      status: 'completed',
      startedAt: new Date(Date.now() - 10000).toISOString(),
      completedAt: new Date().toISOString(),
      phases: [
        {
          id: 'phase-1',
          number: 1,
          name: 'Foundation',
          goal: 'Generate initial files',
          status: 'completed',
          dependencies: [],
          tasks: [
            {
              id: 'task-1',
              name: 'Generate project files',
              description: 'Create package.json and src/index.ts',
              status: 'completed',
              dependencies: [],
              output: `\`\`\`json
{
  "detailed_deliverables": {
    "1_package_json": {
      "content": "{\\n  \\"name\\": \\"demo-app\\"\\n}"
    },
    "9_src_index_ts": {
      "content": "export const started = true;\\n"
    }
  }
}
\`\`\``,
            },
          ],
        },
      ],
    };

    await persistence.create<Run>('runs', run);

    const response = await request(app)
      .post('/api/runs/run-materialize-1/materialize')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.data?.artifactsCreated).toBe(2);
    expect(response.body.data?.tasksScanned).toBe(1);

    const packageJsonPath = path.join(testDataDir, 'artifacts', 'run-materialize-1', 'package.json');
    const indexTsPath = path.join(testDataDir, 'artifacts', 'run-materialize-1', 'src', 'index.ts');
    const summary = await persistence.read('run-summaries', 'summary-run-materialize-1');

    await expect(fs.readFile(packageJsonPath, 'utf-8')).resolves.toContain('"demo-app"');
    await expect(fs.readFile(indexTsPath, 'utf-8')).resolves.toContain('started = true');
    expect((summary as { artifacts: { totalCount: number } }).artifacts.totalCount).toBe(2);
  });
});
