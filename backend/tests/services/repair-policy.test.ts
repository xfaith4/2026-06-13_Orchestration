import { describe, it, expect } from 'vitest';
import {
  failureSignature,
  classifyFailureClass,
  repairGate,
  DEFAULT_REPAIR_POLICY,
} from '../../src/services/repair-policy.js';
import type { ProjectValidationReport, ValidationResult } from '../../src/services/project-validator.js';

function result(partial: Partial<ValidationResult>): ValidationResult {
  return { tool: 'tsc', passed: true, errors: [], output: '', durationMs: 1, ...partial };
}
function report(partial: Partial<ProjectValidationReport>): ProjectValidationReport {
  const results = partial.results ?? [];
  return {
    runId: 'r',
    projectRoot: '/x',
    validatedAt: 't',
    passed: results.every(r => r.passed),
    results,
    totalErrors: results.reduce((n, r) => n + r.errors.length, 0),
    summary: '',
    ...partial,
  };
}

describe('failureSignature', () => {
  it('is empty for a passing report', () => {
    expect(failureSignature(report({ results: [result({ passed: true })] }))).toBe('');
  });
  it('is stable and order-independent', () => {
    const a = report({ results: [result({ tool: 'tsc', passed: false, errors: [
      { type: 'type', file: 'a.ts', message: 'TS2322: x', raw: '' },
      { type: 'type', file: 'b.ts', message: 'TS2304: y', raw: '' },
    ] })] });
    const b = report({ results: [result({ tool: 'tsc', passed: false, errors: [
      { type: 'type', file: 'b.ts', message: 'TS2304: y', raw: '' },
      { type: 'type', file: 'a.ts', message: 'TS2322: x', raw: '' },
    ] })] });
    expect(failureSignature(a)).toBe(failureSignature(b));
  });
  it('changes when the errors change', () => {
    const a = report({ results: [result({ tool: 'tsc', passed: false, errors: [{ type: 'type', file: 'a.ts', message: 'TS2322: x', raw: '' }] })] });
    const b = report({ results: [result({ tool: 'tsc', passed: false, errors: [{ type: 'type', file: 'a.ts', message: 'TS2304: y', raw: '' }] })] });
    expect(failureSignature(a)).not.toBe(failureSignature(b));
  });
});

describe('classifyFailureClass', () => {
  it('npm-install failure -> environment_blocker', () => {
    expect(classifyFailureClass(report({ results: [result({ tool: 'npm-install', passed: false, errors: [{ type: 'unknown', message: 'boom', raw: '' }] })] }))).toBe('environment_blocker');
  });
  it('tsc failure -> implementation_defect', () => {
    expect(classifyFailureClass(report({ results: [result({ tool: 'tsc', passed: false, errors: [{ type: 'type', message: 'TS1', raw: '' }] })] }))).toBe('implementation_defect');
  });
  it('vitest failure -> unverifiable_acceptance', () => {
    expect(classifyFailureClass(report({ results: [result({ tool: 'vitest', passed: false, errors: [{ type: 'test', message: 'x', raw: '' }] })] }))).toBe('unverifiable_acceptance');
  });
});

describe('repairGate', () => {
  const policy = DEFAULT_REPAIR_POLICY;

  it('proceeds on the first generation', () => {
    expect(repairGate({ attempt: 0, currentSignature: 's1', signatureCounts: { s1: 1 }, policy }).proceed).toBe(true);
  });

  it('stops at the generation cap', () => {
    const d = repairGate({ attempt: policy.maxRepairGenerations, currentSignature: 's1', signatureCounts: { s1: 1 }, policy });
    expect(d.proceed).toBe(false);
    expect(d.escalateAfter).toBe('planner_repair_limit_reached');
  });

  it('stops when the same signature recurs too often', () => {
    const d = repairGate({ attempt: 1, currentSignature: 's1', signatureCounts: { s1: policy.maxSameFailureSignature }, policy });
    expect(d.proceed).toBe(false);
    expect(d.escalateAfter).toBe('same_signature_repeated');
  });
});
