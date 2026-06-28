import { describe, it, expect } from 'vitest';
import { decideTerminalStatus, toValidationOutcome } from '../../src/services/run-status.js';

describe('decideTerminalStatus (terminal-honesty guard)', () => {
  it('fails when no output was materialized, even if validation passed', () => {
    const d = decideTerminalStatus({ materializedCount: 0, validation: { status: 'passed' } });
    expect(d.status).toBe('failed');
    expect(d.reason).toMatch(/no runnable output/i);
  });

  it('fails when validation ran and failed', () => {
    const d = decideTerminalStatus({
      materializedCount: 5,
      validation: { status: 'failed', summary: 'tsc failed' },
    });
    expect(d.status).toBe('failed');
    expect(d.reason).toMatch(/validation failed/i);
  });

  it('completes when output materialized and validation passed', () => {
    const d = decideTerminalStatus({ materializedCount: 5, validation: { status: 'passed' } });
    expect(d.status).toBe('completed');
    expect(d.reason).toBeUndefined();
  });

  it('completes (honestly unvalidated) when output exists but validation did not run', () => {
    const d = decideTerminalStatus({ materializedCount: 5, validation: { status: 'not_run' } });
    expect(d.status).toBe('completed');
  });
});

describe('toValidationOutcome', () => {
  it('maps a passing report', () => {
    const v = toValidationOutcome({ passed: true, totalErrors: 0, summary: 'all good' });
    expect(v.status).toBe('passed');
    expect(v.totalErrors).toBe(0);
  });

  it('maps a failing report', () => {
    const v = toValidationOutcome({ passed: false, totalErrors: 3, summary: 'tsc failed' });
    expect(v.status).toBe('failed');
    expect(v.totalErrors).toBe(3);
  });

  it('returns not_run when no report', () => {
    expect(toValidationOutcome(null).status).toBe('not_run');
  });
});
