import { ErrorRecord, ErrorType, ErrorSeverity } from '@unifiedaitoolbox/shared';
import { PersistenceService } from './persistence.js';
import { ErrorHandler, ErrorContext } from '@fuhrhaus/orchestration-core';
import { v4 as uuidv4 } from 'uuid';

export class ErrorLogger {
  private errorHandler: ErrorHandler;

  constructor(private persistence: PersistenceService) {
    this.errorHandler = new ErrorHandler();
  }

  // Log an error with full context
  async logError(
    error: unknown,
    context: ErrorContext,
    retryCount: number = 0,
    maxRetries: number = 0
  ): Promise<ErrorRecord> {
    const errorLog = this.errorHandler.formatErrorLog(error, context, retryCount, maxRetries);

    const errorRecord: ErrorRecord = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timestamp: errorLog.timestamp || new Date().toISOString(),
      errorMessage: errorLog.errorMessage || 'Unknown error',
      errorCode: errorLog.errorCode,
      errorType: errorLog.errorType as ErrorType,
      severity: errorLog.severity as ErrorSeverity,
      context: errorLog.context || context,
      stack: errorLog.stack,
      retryCount: errorLog.retryCount || 0,
      maxRetries: errorLog.maxRetries || 0,
    };

    // Persist to error log
    await this.persistence.create<ErrorRecord>('error-logs', errorRecord);

    return errorRecord;
  }

  // Get errors for a specific context (e.g., run, task)
  async getErrorsForContext(context: Partial<ErrorContext>): Promise<ErrorRecord[]> {
    const allErrors = await this.persistence.list<ErrorRecord>('error-logs');

    return allErrors.filter(err => {
      if (context.runId && err.context.runId !== context.runId) return false;
      if (context.phaseId && err.context.phaseId !== context.phaseId) return false;
      if (context.taskId && err.context.taskId !== context.taskId) return false;
      if (context.service && err.context.service !== context.service) return false;
      return true;
    });
  }

  // Mark error as resolved
  async markErrorResolved(
    errorId: string,
    resolution: string
  ): Promise<ErrorRecord | null> {
    const error = await this.persistence.read<ErrorRecord>('error-logs', errorId);
    if (!error) return null;

    const updated: ErrorRecord = {
      ...error,
      resolvedAt: new Date().toISOString(),
      resolution,
      updatedAt: new Date().toISOString(),
    };

    return await this.persistence.update<ErrorRecord>('error-logs', errorId, updated);
  }

  // Get error statistics
  async getErrorStatistics(): Promise<{
    totalErrors: number;
    errorsBySeverity: Record<ErrorSeverity, number>;
    errorsByType: Record<ErrorType, number>;
    unresolvedCount: number;
    recentErrors: ErrorRecord[];
  }> {
    const allErrors = await this.persistence.list<ErrorRecord>('error-logs');

    const errorsBySeverity: Record<ErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const errorsByType: Record<ErrorType, number> = {
      transient: 0,
      permanent: 0,
      unknown: 0,
    };

    let unresolvedCount = 0;

    for (const err of allErrors) {
      errorsBySeverity[err.severity]++;
      errorsByType[err.errorType]++;
      if (!err.resolvedAt) {
        unresolvedCount++;
      }
    }

    // Get recent errors (last 20)
    const recentErrors = allErrors
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);

    return {
      totalErrors: allErrors.length,
      errorsBySeverity,
      errorsByType,
      unresolvedCount,
      recentErrors,
    };
  }

  // Get errors by severity level
  async getErrorsBySeverity(severity: ErrorSeverity): Promise<ErrorRecord[]> {
    const allErrors = await this.persistence.list<ErrorRecord>('error-logs');
    return allErrors.filter(err => err.severity === severity);
  }

  // Cleanup old error logs (older than specified days)
  async cleanupOldErrors(daysOld: number): Promise<number> {
    const allErrors = await this.persistence.list<ErrorRecord>('error-logs');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let deletedCount = 0;
    for (const err of allErrors) {
      const errorDate = new Date(err.timestamp);
      if (errorDate < cutoffDate && err.resolvedAt) {
        // Only delete resolved errors
        await this.persistence.delete('error-logs', err.id);
        deletedCount++;
      }
    }

    return deletedCount;
  }
}
