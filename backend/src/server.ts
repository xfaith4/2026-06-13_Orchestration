import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PersistenceService } from './services/persistence.js';
import { ValidationService } from './services/validation.js';
import { createApiRoutes } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createResponse } from './types/responses.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app: Express = express();
const port = process.env.PORT || 3000;
const dataDir = path.join(__dirname, '..', '..', 'data');
const schemasDir = path.join(__dirname, '..', '..', 'shared', 'src', 'schemas');

// Services
const persistence = new PersistenceService({ dataDir });
const validation = new ValidationService(schemasDir);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json(createResponse({ status: 'ok' }));
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json(createResponse({
    name: 'UnifiedAIToolbox API',
    version: '0.1.0',
    status: 'running',
    message: 'Phase 3: Backend API Foundation'
  }));
});

// API routes
app.use('/api', createApiRoutes(persistence, validation));

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(port, () => {
  console.log(`✓ Backend server running on http://localhost:${port}`);
  console.log(`✓ Persistence layer ready (data dir: ${dataDir})`);
  console.log(`✓ Validation service ready (schemas dir: ${schemasDir})`);
  console.log(`✓ Available endpoints:`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/applications, POST, GET/:id, PUT/:id, DELETE/:id`);
  console.log(`  POST /api/design-plans/generate/:applicationId`);
  console.log(`  PATCH /api/design-plans/:id/review`);
  console.log(`  PATCH /api/design-plans/:id/decision/{approve|reject}`);
  console.log(`  GET  /api/design-plans, POST, GET/:id, PUT/:id, DELETE/:id`);
  console.log(`  GET  /api/roadmaps, POST, GET/:id, PUT/:id, DELETE/:id`);
  console.log(`  GET  /api/runs, POST, GET/:id, PUT/:id, DELETE/:id`);
  console.log(`  GET  /api/agents, POST, GET/:id, PUT/:id, DELETE/:id`);
  console.log(`  GET  /api/prompts, POST, GET/:id, PUT/:id, DELETE/:id`);
  console.log(`  GET  /api/contracts, POST, GET/:id, PUT/:id, DELETE/:id`);
});

export default app;
