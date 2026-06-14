/**
 * Shared TypeScript Type Definitions
 *
 * This module provides type definitions used across frontend and backend.
 * Phase 0.1: Baseline types only. Additional types added in Phase 1+.
 */

/**
 * API Response Envelope
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Health Check Response
 */
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  environment: string;
}

/**
 * API Version Info
 */
export interface ApiVersionInfo {
  message: string;
  version: string;
  phase: string;
}

/**
 * User entity (placeholder for Phase 1+)
 */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Request context (placeholder for Phase 1+)
 */
export interface RequestContext {
  userId?: string;
  traceId: string;
  timestamp: Date;
}

export type { };
