import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { PersistenceService } from './services/persistence.js';
import { ValidationService } from './services/validation.js';
import { createApiRoutes } from './routes/index.js';
import { createAuditLogRoutes } from './routes/audit-logs.js';
import { createErrorLogRoutes } from './routes/error-logs.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createAuditMiddleware } from './middleware/audit-middleware.js';
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
app.use(createAuditMiddleware(persistence));

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

// Audit log routes
app.use('/api/audit-logs', createAuditLogRoutes(persistence));

// Error log routes
app.use('/api/error-logs', createErrorLogRoutes(persistence));

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
  console.log(`  POST /api/roadmaps/generate/:designPlanId`);
  console.log(`  GET  /api/roadmaps, POST, GET/:id, PUT/:id, DELETE/:id`);
  console.log(`  POST /api/runs/from-roadmap/:roadmapId`);
  console.log(`  PATCH /api/runs/:id/start`);
  console.log(`  PATCH /api/runs/:id/pause`);
  console.log(`  PATCH /api/runs/:id/phase/:phaseId/task/:taskId/{assign|start|complete|fail}`);
  console.log(`  GET  /api/runs/:id/costs (cost breakdown for specific run)`);
  console.log(`  GET  /api/runs/costs/summary (cost statistics across all runs)`);
  console.log(`  GET  /api/runs, POST, GET/:id, PUT/:id, DELETE/:id`);
  console.log(`  GET  /api/audit-logs (with filters: startDate, endDate, userId, action, resourceType, resourceId)`);
  console.log(`  GET  /api/audit-logs/:id`);
  console.log(`  GET  /api/audit-logs/stats/summary`);
  console.log(`  GET  /api/audit-logs/user/:userId`);
  console.log(`  GET  /api/error-logs (with filters: severity, errorType, runId, taskId, resolved)`);
  console.log(`  GET  /api/error-logs/:id`);
  console.log(`  GET  /api/error-logs/stats/summary`);
  console.log(`  GET  /api/error-logs/severity/:level (low|medium|high|critical)`);
  console.log(`  GET  /api/error-logs/run/:runId`);
  console.log(`  PATCH /api/error-logs/:id/resolve (mark error as resolved)`);
  console.log(`  GET  /api/agents, POST, GET/:id, PUT/:id, DELETE/:id`);
  console.log(`  GET  /api/prompts, POST, GET/:id, PUT/:id, DELETE/:id`);
  console.log(`  GET  /api/contracts, POST, GET/:id, PUT/:id, DELETE/:id`);
});

export default app;
