import { AuditLogEntry } from '@unifiedaitoolbox/shared';

export interface AuditLogOptions {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export class AuditLogger {
  private defaultUserId = 'system';

  logCreate(
    resourceType: string,
    resourceId: string,
    resourceName: string | undefined,
    data: unknown,
    options: AuditLogOptions = {}
  ): Omit<AuditLogEntry, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      timestamp: new Date().toISOString(),
      userId: options.userId || this.defaultUserId,
      action: 'CREATE',
      resourceType,
      resourceId,
      resourceName,
      changes: this.extractChanges(data),
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      status: 'success',
      metadata: options.metadata,
    };
  }

  logUpdate(
    resourceType: string,
    resourceId: string,
    resourceName: string | undefined,
    oldData: unknown,
    newData: unknown,
    options: AuditLogOptions = {}
  ): Omit<AuditLogEntry, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      timestamp: new Date().toISOString(),
      userId: options.userId || this.defaultUserId,
      action: 'UPDATE',
      resourceType,
      resourceId,
      resourceName,
      changes: this.computeChanges(oldData as Record<string, unknown>, newData as Record<string, unknown>),
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      status: 'success',
      metadata: options.metadata,
    };
  }

  logDelete(
    resourceType: string,
    resourceId: string,
    resourceName: string | undefined,
    data: unknown,
    options: AuditLogOptions = {}
  ): Omit<AuditLogEntry, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      timestamp: new Date().toISOString(),
      userId: options.userId || this.defaultUserId,
      action: 'DELETE',
      resourceType,
      resourceId,
      resourceName,
      changes: this.extractChanges(data),
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      status: 'success',
      metadata: options.metadata,
    };
  }

  logError(
    resourceType: string,
    resourceId: string | undefined,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    error: string,
    options: AuditLogOptions = {}
  ): Omit<AuditLogEntry, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      timestamp: new Date().toISOString(),
      userId: options.userId || this.defaultUserId,
      action,
      resourceType,
      resourceId: resourceId || 'unknown',
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      status: 'failure',
      errorMessage: error,
      metadata: options.metadata,
    };
  }

  private extractChanges(data: unknown): { field: string; newValue: unknown }[] {
    if (!data || typeof data !== 'object') {
      return [];
    }

    const changes: { field: string; newValue: unknown }[] = [];
    const obj = data as Record<string, unknown>;

    for (const [key, value] of Object.entries(obj)) {
      if (!['id', 'createdAt', 'updatedAt'].includes(key)) {
        changes.push({
          field: key,
          newValue: value,
        });
      }
    }

    return changes;
  }

  private computeChanges(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>
  ): { field: string; oldValue?: unknown; newValue?: unknown }[] {
    const changes: { field: string; oldValue?: unknown; newValue?: unknown }[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      if (['id', 'createdAt', 'updatedAt'].includes(key)) {
        continue;
      }

      const oldValue = oldData[key];
      const newValue = newData[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue,
          newValue,
        });
      }
    }

    return changes;
  }
}
