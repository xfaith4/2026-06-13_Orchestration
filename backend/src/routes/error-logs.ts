import { Router, Request, Response } from 'express';
import { PersistenceService } from '../services/persistence.js';
import { ErrorLogger } from '../services/error-logger.js';
import { ErrorRecord } from '@unifiedaitoolbox/shared';
import { createResponse, ApiError } from '../types/responses.js';

export const createErrorLogRoutes = (persistence: PersistenceService) => {
  const router = Router();
  const errorLogger = new ErrorLogger(persistence);

  // Get all error logs with optional filtering
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { severity, errorType, runId, taskId, limit = '100', resolved = 'false' } = req.query;

      let logs = await persistence.list<ErrorRecord>('error-logs');

      // Filter by severity
      if (severity) {
        logs = logs.filter(log => log.severity === severity);
      }

      // Filter by error type
      if (errorType) {
        logs = logs.filter(log => log.errorType === errorType);
      }

      // Filter by run ID
      if (runId) {
        logs = logs.filter(log => log.context.runId === runId);
      }

      // Filter by task ID
      if (taskId) {
        logs = logs.filter(log => log.context.taskId === taskId);
      }

      // Filter by resolved status
      const showResolved = resolved === 'true';
      logs = logs.filter(log => {
        if (showResolved) return !!log.resolvedAt;
        return !log.resolvedAt;
      });

      // Sort by timestamp descending (most recent first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Limit results
      const limitNum = parseInt(limit as string, 10);
      logs = logs.slice(0, limitNum);

      res.json(createResponse(logs));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch error logs',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get single error log entry
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const log = await persistence.read<ErrorRecord>('error-logs', id);
      if (!log) {
        throw new ApiError(404, 'Error log entry not found');
      }

      res.json(createResponse(log));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to fetch error log',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Get error statistics
  router.get('/stats/summary', async (req: Request, res: Response) => {
    try {
      const stats = await errorLogger.getErrorStatistics();
      res.json(createResponse(stats));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch error statistics',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get errors by severity
  router.get('/severity/:level', async (req: Request, res: Response) => {
    try {
      const { level } = req.params;

      const validSeverities = ['low', 'medium', 'high', 'critical'];
      if (!validSeverities.includes(level)) {
        throw new ApiError(400, `Invalid severity level. Must be one of: ${validSeverities.join(', ')}`);
      }

      const errors = await errorLogger.getErrorsBySeverity(level as any);
      res.json(createResponse(errors));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to fetch errors by severity',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Mark error as resolved
  router.patch('/:id/resolve', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { resolution } = req.body;

      if (!resolution) {
        throw new ApiError(400, 'resolution is required');
      }

      const updated = await errorLogger.markErrorResolved(id, resolution);
      if (!updated) {
        throw new ApiError(404, 'Error log entry not found');
      }

      res.json(createResponse(updated));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to resolve error',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Get errors for a run
  router.get('/run/:runId', async (req: Request, res: Response) => {
    try {
      const { runId } = req.params;
      const errors = await errorLogger.getErrorsForContext({ runId });
      res.json(createResponse(errors));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch run errors',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
};
