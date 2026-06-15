import { CircuitBreakerState } from '@unifiedaitoolbox/shared';
import { ErrorHandler } from './error-handler.js';

export interface RetryPolicy {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: unknown;
  retryCount: number;
  totalDurationMs: number;
  lastError?: string;
}

export class RecoveryService {
  private errorHandler: ErrorHandler;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  private readonly defaultRetryPolicy: RetryPolicy = {
    maxRetries: 3,
    initialDelayMs: 100,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
  };

  private readonly circuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    openTimeoutMs: 30000, // 30 seconds
  };

  constructor() {
    this.errorHandler = new ErrorHandler();
  }

  // Execute with automatic retry on transient errors
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    policy: Partial<RetryPolicy> = {}
  ): Promise<RetryResult<T>> {
    const finalPolicy = { ...this.defaultRetryPolicy, ...policy };
    const startTime = Date.now();
    let lastError: unknown;
    let lastErrorMsg: string | undefined;

    for (let attempt = 0; attempt <= finalPolicy.maxRetries; attempt++) {
      try {
        const data = await operation();
        this.recordSuccess(operationName);
        return {
          success: true,
          data,
          retryCount: attempt,
          totalDurationMs: Date.now() - startTime,
        };
      } catch (error) {
        lastError = error;
        lastErrorMsg = this.errorHandler.getMessage(error);
        const errorType = this.errorHandler.classifyError(error);

        // Don't retry permanent errors
        if (errorType === 'permanent') {
          this.recordFailure(operationName);
          return {
            success: false,
            error,
            retryCount: attempt,
            totalDurationMs: Date.now() - startTime,
            lastError: lastErrorMsg,
          };
        }

        // If not the last attempt, wait before retrying
        if (attempt < finalPolicy.maxRetries) {
          const delayMs = this.calculateBackoffDelay(
            attempt,
            finalPolicy.initialDelayMs,
            finalPolicy.maxDelayMs,
            finalPolicy.backoffMultiplier
          );
          await this.delay(delayMs);
        }
      }
    }

    // All retries exhausted
    this.recordFailure(operationName);
    return {
      success: false,
      error: lastError,
      retryCount: finalPolicy.maxRetries + 1,
      totalDurationMs: Date.now() - startTime,
      lastError: lastErrorMsg,
    };
  }

  // Circuit breaker: prevent cascading failures
  async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<RetryResult<T>> {
    const breaker = this.getOrCreateCircuitBreaker(operationName);

    // If circuit is open, fail fast
    if (breaker.state === 'open') {
      const timeSinceOpen = Date.now() - (new Date(breaker.lastFailureAt || '').getTime());
      if (timeSinceOpen < this.circuitBreakerConfig.openTimeoutMs) {
        return {
          success: false,
          error: new Error(`Circuit breaker open for ${operationName}`),
          retryCount: 0,
          totalDurationMs: 0,
          lastError: 'Circuit breaker is open. Too many recent failures.',
        };
      } else {
        // Try half-open
        breaker.state = 'half-open';
        breaker.successCount = 0;
      }
    }

    // Execute with retry
    const result = await this.executeWithRetry(operation, operationName);

    // Update circuit breaker state
    if (result.success) {
      if (breaker.state === 'half-open') {
        breaker.successCount = (breaker.successCount || 0) + 1;
        if (breaker.successCount >= this.circuitBreakerConfig.successThreshold) {
          breaker.state = 'closed';
          breaker.failureCount = 0;
        }
      }
    } else {
      breaker.failureCount++;
      breaker.lastFailureAt = new Date().toISOString();
      if (breaker.failureCount >= this.circuitBreakerConfig.failureThreshold) {
        breaker.state = 'open';
      }
    }

    return result;
  }

  // Get retry recommendation
  getRetryRecommendation(retryResult: RetryResult<unknown>): {
    shouldRetry: boolean;
    message: string;
    nextRetryDelayMs?: number;
  } {
    if (retryResult.success) {
      return {
        shouldRetry: false,
        message: 'Operation succeeded',
      };
    }

    if (retryResult.retryCount >= 3) {
      return {
        shouldRetry: false,
        message: 'Maximum retries exceeded. Please try again later.',
      };
    }

    return {
      shouldRetry: true,
      message: 'Operation failed. Will retry automatically.',
      nextRetryDelayMs: this.calculateBackoffDelay(
        retryResult.retryCount,
        100,
        5000,
        2
      ),
    };
  }

  // Get circuit breaker status
  getCircuitBreakerStatus(operationName: string): CircuitBreakerState {
    return this.getOrCreateCircuitBreaker(operationName);
  }

  // Reset circuit breaker
  resetCircuitBreaker(operationName: string): void {
    const breaker = this.circuitBreakers.get(operationName);
    if (breaker) {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      breaker.successCount = 0;
    }
  }

  // Private helpers
  private calculateBackoffDelay(
    attemptNumber: number,
    initialDelayMs: number,
    maxDelayMs: number,
    multiplier: number
  ): number {
    const exponentialDelay = initialDelayMs * Math.pow(multiplier, attemptNumber);
    const jitter = Math.random() * exponentialDelay * 0.1; // 10% jitter
    const delayWithJitter = exponentialDelay + jitter;
    return Math.min(delayWithJitter, maxDelayMs);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getOrCreateCircuitBreaker(name: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, {
        state: 'closed',
        failureCount: 0,
        successCount: 0,
      });
    }
    return this.circuitBreakers.get(name)!;
  }

  private recordSuccess(operationName: string): void {
    const breaker = this.getOrCreateCircuitBreaker(operationName);
    breaker.failureCount = 0;
  }

  private recordFailure(operationName: string): void {
    const breaker = this.getOrCreateCircuitBreaker(operationName);
    breaker.failureCount++;
    breaker.lastFailureAt = new Date().toISOString();
  }
}
