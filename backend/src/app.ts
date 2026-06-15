import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PersistenceService } from './services/persistence.js';
import { ValidationService } from './services/validation.js';
import { createApiRoutes } from './routes/index.js';
import { createAuditLogRoutes } from './routes/audit-logs.js';
import { createErrorLogRoutes } from './routes/error-logs.js';
import { createExecutionRoutes } from './routes/execution.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createAuditMiddleware } from './middleware/audit-middleware.js';
import { createResponse } from './types/responses.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface AppServices {
  persistence: PersistenceService;
  validation: ValidationService;
}

export async function createApp(): Promise<Express> {
  const app: Express = express();
  const dataDir = path.join(__dirname, '..', '..', 'data');
  const schemasDir = path.join(__dirname, '..', '..', 'shared', 'src', 'schemas');

  const services: AppServices = {
    persistence: new PersistenceService({ dataDir }),
    validation: new ValidationService(schemasDir),
  };

  app.use(cors());
  app.use(express.json());
  app.use(createAuditMiddleware(services.persistence));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json(createResponse({ status: 'ok' }));
  });

  app.get('/', (_req: Request, res: Response) => {
    res.json(
      createResponse({
        name: 'UnifiedAIToolbox API',
        version: '0.1.0',
        status: 'running',
        message: 'Phase 3: Backend API Foundation',
      })
    );
  });

  app.use('/api', createApiRoutes(services.persistence, services.validation));
  app.use('/api/audit-logs', createAuditLogRoutes(services.persistence));
  app.use('/api/error-logs', createErrorLogRoutes(services.persistence));
  app.use('/api/execution', createExecutionRoutes(services.persistence));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
