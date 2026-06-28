import { describe, it, expect } from 'vitest';
import {
  isTransientMessage,
  errorSignature,
  classifyValidation,
  captureBaseline,
} from '../../src/services/baseline.js';
import type { ProjectValidationReport, ValidationResult } from '../../src/services/project-validator.js';

function result(partial: Partial<ValidationResult>): ValidationResult {
  return { tool: 'tsc', passed: true, errors: [], output: '', durationMs: 1, ...partial };
}

function report(partial: Partial<ProjectValidationReport>): ProjectValidationReport {
  const results = partial.results ?? [];
  return {
    runId: 'r1',
    projectRoot: '/x',
    validatedAt: 't',
    passed: results.every(r => r.passed),
    results,
    totalErrors: results.reduce((n, r) => n + r.errors.length, 0),
    summary: '',
    ...partial,
  };
}

describe('isTransientMessage', () => {
  it('flags environment/IO failures', () => {
    expect(isTransientMessage('npm error EPERM: operation not permitted, unlink ...node_modules')).toBe(true);
    expect(isTransientMessage('file is being used by another process')).toBe(true);
    expect(isTransientMessage('getaddrinfo ENOTFOUND registry.npmjs.org')).toBe(true);
  });
  it('does not flag genuine code errors', () => {
    expect(isTransientMessage("TS2322: Type 'string' is not assignable to type 'number'.")).toBe(false);
    expect(isTransientMessage('Expected 1 arguments but got 0')).toBe(false);
  });
});

describe('classifyValidation', () => {
  it('green when the report passed', () => {
    const c = classifyValidation(report({ results: [result({ tool: 'tsc', passed: true })] }));
    expect(c.status).toBe('green');
    expect(c.transient).toBe(false);
  });

  it('red for genuine code errors', () => {
    const c = classifyValidation(
      report({
        results: [
          result({ tool: 'tsc', passed: false, errors: [{ type: 'type', file: 'a.ts', message: 'TS2322: bad', raw: '' }] }),
        ],
      })
    );
    expect(c.status).toBe('red');
    expect(c.transient).toBe(false);
  });

  it('insufficient_evidence when every failing tool is transient', () => {
    const c = classifyValidation(
      report({
        results: [
          result({
            tool: 'npm-install',
            passed: false,
            errors: [{ type: 'unknown', message: 'npm error EPERM: unlink ...node_modules', raw: '' }],
          }),
        ],
      })
    );
    expect(c.status).toBe('insufficient_evidence');
    expect(c.transient).toBe(true);
  });

  it('stays red when only SOME failures are transient (a real code error remains)', () => {
    const c = classifyValidation(
      report({
        results: [
          result({ tool: 'npm-install', passed: false, errors: [{ type: 'unknown', message: 'EBUSY locked', raw: '' }] }),
          result({ tool: 'tsc', passed: false, errors: [{ type: 'type', file: 'a.ts', message: 'TS2304: cannot find name', raw: '' }] }),
        ],
      })
    );
    expect(c.status).toBe('red');
  });
});

describe('errorSignature', () => {
  it('combines tool, file, and error code', () => {
    expect(errorSignature('tsc', { file: 'src/a.ts', message: "TS2322: Type 'x'..." })).toBe('tsc:src/a.ts:ts2322');
  });
});

describe('captureBaseline', () => {
  it('captures status, signatures, and environment', () => {
    const b = captureBaseline(
      'run-1',
      'phase-0',
      report({
        results: [
          result({ tool: 'tsc', passed: false, errors: [{ type: 'type', file: 'a.ts', message: 'TS2322: bad', raw: '' }] }),
        ],
      })
    );
    expect(b.runId).toBe('run-1');
    expect(b.phaseId).toBe('phase-0');
    expect(b.status).toBe('red');
    expect(b.errorSignatures).toContain('tsc:a.ts:ts2322');
    expect(b.environment.node).toBe(process.version);
    expect(b.tools[0]).toEqual({ tool: 'tsc', passed: false, errorCount: 1 });
  });
});
