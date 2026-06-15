import { Request, Response, NextFunction } from 'express';
import { PersistenceService } from '../services/persistence.js';
import { AuditLogger } from '../services/audit-logger.js';
import { AuditLogEntry } from '@unifiedaitoolbox/shared';

export interface AuditRequest extends Request {
  auditUserId?: string;
  auditMetadata?: Record<string, unknown>;
  originalBody?: unknown;
  originalParams?: Record<string, unknown>;
}

interface ApiEnvelope<T = unknown> {
  data?: T;
}

interface IdentifiableRecord {
  id?: string;
  title?: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
}

function unwrapEnvelope(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const envelope = data as ApiEnvelope;
  return envelope.data ?? data;
}

export function createAuditMiddleware(persistence: PersistenceService) {
  const auditLogger = new AuditLogger();

  return async (req: AuditRequest, res: Response, next: NextFunction) => {
    // Store original request data for later comparison
    req.originalBody = req.body;
    req.originalParams = req.params;

    // Extract user info from request headers/body (you'd typically get this from auth middleware)
    req.auditUserId = req.headers['x-user-id'] as string || 'anonymous';

    // Wrap res.json to log successful operations
    const originalJson = res.json.bind(res);
    res.json = function (data: unknown) {
      // Determine if this was a create/update/delete based on method and route
      const method = req.method.toUpperCase();
      const path = req.path;

      if (method === 'POST' && !path.includes('/generate') && !path.includes('/from-roadmap')) {
        // Create operation
        const resourceType = getResourceTypeFromPath(path);
        const payload = unwrapEnvelope(data);
        const record = (typeof payload === 'object' && payload !== null)
          ? (payload as IdentifiableRecord)
          : undefined;
        const resourceId = record?.id || 'unknown';
        const resourceName = getResourceName(payload);

        const auditEntry = auditLogger.logCreate(
          resourceType,
          resourceId,
          resourceName,
          data,
          {
            userId: req.auditUserId,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            metadata: req.auditMetadata,
          }
        );

        persistence.create<AuditLogEntry>('audit-logs', auditEntry).catch(err => {
          console.error('Failed to log audit entry:', err);
        });
      } else if (method === 'PUT' || method === 'PATCH') {
        // Update operation
        const resourceType = getResourceTypeFromPath(path);
        const payload = unwrapEnvelope(data);
        const record = (typeof payload === 'object' && payload !== null)
          ? (payload as IdentifiableRecord)
          : undefined;
        const resourceId = record?.id || req.originalParams?.id || 'unknown';
        const resourceName = getResourceName(payload);

        const auditEntry = auditLogger.logUpdate(
          resourceType,
          resourceId as string,
          resourceName,
          req.originalBody,
          data,
          {
            userId: req.auditUserId,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            metadata: req.auditMetadata,
          }
        );

        persistence.create<AuditLogEntry>('audit-logs', auditEntry).catch(err => {
          console.error('Failed to log audit entry:', err);
        });
      } else if (method === 'DELETE') {
        // Delete operation
        const resourceType = getResourceTypeFromPath(path);
        const resourceId = req.originalParams?.id || 'unknown';

        const auditEntry = auditLogger.logDelete(
          resourceType,
          resourceId as string,
          undefined,
          req.originalBody,
          {
            userId: req.auditUserId,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            metadata: req.auditMetadata,
          }
        );

        persistence.create<AuditLogEntry>('audit-logs', auditEntry).catch(err => {
          console.error('Failed to log audit entry:', err);
        });
      }

      return originalJson.call(this, data);
    };

    next();
  };
}

function getResourceTypeFromPath(path: string): string {
  // Extract resource type from path like /applications, /design-plans, etc.
  const match = path.match(/\/([a-z-]+)/);
  return match ? match[1] : 'unknown';
}

function getResourceName(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  const obj = data as IdentifiableRecord;

  // Try to find a descriptive name field
  if (obj.title) return obj.title as string;
  if (obj.name) return obj.name as string;
  if (obj.description) return (obj.description as string).substring(0, 50);

  return undefined;
}
