import { Router, Request, Response } from 'express';
import { PersistenceService } from '../services/persistence.js';
import { AuditLogEntry } from '@unifiedaitoolbox/shared';
import { createResponse, ApiError } from '../types/responses.js';

export const createAuditLogRoutes = (persistence: PersistenceService) => {
  const router = Router();

  // Get all audit logs with optional filtering
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, userId, action, resourceType, resourceId, status, limit = '100' } = req.query;

      let logs = await persistence.list<AuditLogEntry>('audit-logs');

      // Filter by date range
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate as string).getTime() : 0;
        const end = endDate ? new Date(endDate as string).getTime() : Date.now();

        logs = logs.filter(log => {
          const logTime = new Date(log.timestamp).getTime();
          return logTime >= start && logTime <= end;
        });
      }

      // Filter by user
      if (userId) {
        logs = logs.filter(log => log.userId === userId);
      }

      // Filter by action
      if (action) {
        logs = logs.filter(log => log.action === action);
      }

      // Filter by resource type
      if (resourceType) {
        logs = logs.filter(log => log.resourceType === resourceType);
      }

      // Filter by resource ID
      if (resourceId) {
        logs = logs.filter(log => log.resourceId === resourceId);
      }

      // Filter by status
      if (status) {
        logs = logs.filter(log => log.status === (status as string));
      }

      // Sort by timestamp descending (most recent first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Limit results
      const limitNum = parseInt(limit as string, 10);
      logs = logs.slice(0, limitNum);

      res.json(createResponse(logs));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch audit logs',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get single audit log entry
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const log = await persistence.read<AuditLogEntry>('audit-logs', id);
      if (!log) {
        throw new ApiError(404, 'Audit log entry not found');
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
          error: error instanceof Error ? error.message : 'Failed to fetch audit log',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Get audit log summary/statistics
  router.get('/stats/summary', async (req: Request, res: Response) => {
    try {
      const logs = await persistence.list<AuditLogEntry>('audit-logs');

      const summary = {
        totalEntries: logs.length,
        byAction: {
          CREATE: logs.filter(l => l.action === 'CREATE').length,
          UPDATE: logs.filter(l => l.action === 'UPDATE').length,
          DELETE: logs.filter(l => l.action === 'DELETE').length,
        },
        byStatus: {
          success: logs.filter(l => l.status === 'success').length,
          failure: logs.filter(l => l.status === 'failure').length,
        },
        byResourceType: {} as Record<string, number>,
        recentFailures: logs
          .filter(l => l.status === 'failure')
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10),
      };

      // Count by resource type
      for (const log of logs) {
        summary.byResourceType[log.resourceType] = (summary.byResourceType[log.resourceType] || 0) + 1;
      }

      res.json(createResponse(summary));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch summary',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get activity by user
  router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { limit = '50' } = req.query;

      let logs = await persistence.list<AuditLogEntry>('audit-logs');
      logs = logs.filter(log => log.userId === userId);

      // Sort by timestamp descending
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Limit results
      const limitNum = parseInt(limit as string, 10);
      logs = logs.slice(0, limitNum);

      res.json(createResponse(logs));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch user activity',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
};
