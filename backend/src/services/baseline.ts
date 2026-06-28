import type { ProjectValidationReport } from './project-validator.js';

// Roadmap Phase 33 — Green Baseline Before Repair.
// Capture a typed snapshot of the validation state BEFORE any repair, and distinguish
// genuine code errors from environment/transient failures so the repair loop never
// "repairs" the environment (a real failure class from UnifiedAIToolbox: an
// `npm install EPERM unlink node_modules` file-lock once failed an otherwise-valid app).

export type BaselineStatus = 'green' | 'red' | 'insufficient_evidence';

export interface ValidationBaseline {
  runId: string;
  phaseId?: string;
  capturedAt: string;
  status: BaselineStatus;
  transient: boolean;
  totalErrors: number;
  tools: Array<{ tool: string; passed: boolean; errorCount: number }>;
  errorSignatures: string[];
  environment: { node: string; platform: string };
}

// Signatures of environment/IO failures that are NOT code defects and must not be
// repaired by rewriting source.
const TRANSIENT_PATTERNS: RegExp[] = [
  /\bEPERM\b/i,
  /\bEBUSY\b/i,
  /\bEACCES\b/i,
  /\bEMFILE\b/i,
  /\bENFILE\b/i,
  /\bENOSPC\b/i,
  /\bENOTFOUND\b/i,
  /\bETIMEDOUT\b/i,
  /\bECONNRESET\b/i,
  /\bEAI_AGAIN\b/i,
  /\bENETUNREACH\b/i,
  /being used by another process/i,
  /resource (?:temporarily )?unavailable/i,
  /socket hang ?up/i,
  /network (?:error|timeout)/i,
];

export function isTransientMessage(message: string): boolean {
  return TRANSIENT_PATTERNS.some(re => re.test(message));
}

/** Stable signature for an error — used to detect repair progress / repeated failures. */
export function errorSignature(
  tool: string,
  err: { file?: string; message?: string; raw?: string }
): string {
  const text = err.message || err.raw || '';
  const code = text.match(/TS\d+|[A-Z]{3,}\d*/)?.[0] ?? '';
  const file = err.file ?? '';
  return `${tool}:${file}:${code}`.toLowerCase();
}

/**
 * Classify a failing validation as genuine code errors (`red`) vs an environment /
 * transient problem (`insufficient_evidence`) that must not be repaired. A failure is
 * transient only when EVERY failing tool failed for transient reasons.
 */
export function classifyValidation(report: ProjectValidationReport): {
  status: BaselineStatus;
  transient: boolean;
} {
  if (report.passed) return { status: 'green', transient: false };

  const failing = report.results.filter(r => !r.passed);
  const allTransient =
    failing.length > 0 &&
    failing.every(r =>
      r.errors.length > 0
        ? r.errors.every(e => isTransientMessage(e.message || e.raw || ''))
        : isTransientMessage(r.output || '')
    );

  return allTransient
    ? { status: 'insufficient_evidence', transient: true }
    : { status: 'red', transient: false };
}

/** Capture a typed pre-repair baseline of the current validation state. */
export function captureBaseline(
  runId: string,
  phaseId: string | undefined,
  report: ProjectValidationReport
): ValidationBaseline {
  const { status, transient } = classifyValidation(report);
  const signatures = report.results.flatMap(r => r.errors.map(e => errorSignature(r.tool, e)));
  return {
    runId,
    phaseId,
    capturedAt: new Date().toISOString(),
    status,
    transient,
    totalErrors: report.totalErrors,
    tools: report.results.map(r => ({ tool: r.tool, passed: r.passed, errorCount: r.errors.length })),
    errorSignatures: Array.from(new Set(signatures)),
    environment: { node: process.version, platform: process.platform },
  };
}
