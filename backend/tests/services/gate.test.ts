import { describe, it, expect } from 'vitest';
import { isReviewerRole, orderProducersFirst, checkPlanIntegrity } from '../../src/services/gate.js';
import type { ExecutionPhase } from '@unifiedaitoolbox/shared';

describe('isReviewerRole', () => {
  it('identifies reviewer roles', () => {
    expect(isReviewerRole('Critic')).toBe(true);
    expect(isReviewerRole('validator')).toBe(true);
    expect(isReviewerRole('Engineer')).toBe(false);
    expect(isReviewerRole(undefined)).toBe(false);
  });
});

describe('orderProducersFirst', () => {
  it('moves reviewers after producers, preserving relative order', () => {
    const tasks = [
      { id: 't1', role: 'critic' },
      { id: 't2', role: 'engineer' },
      { id: 't3', role: 'reviewer' },
      { id: 't4', role: 'researcher' },
    ];
    const ordered = orderProducersFirst(tasks, t => t.role);
    expect(ordered.map(t => t.id)).toEqual(['t2', 't4', 't1', 't3']);
  });
});

function phase(tasks: { id: string; dependencies?: string[] }[]): ExecutionPhase {
  return {
    id: 'p0',
    number: 0,
    name: 'p',
    goal: '',
    estimatedHours: 1,
    dependencies: [],
    status: 'pending',
    tasks: tasks.map(t => ({
      id: t.id,
      name: t.id,
      description: '',
      status: 'pending' as const,
      estimatedHours: 1,
      dependencies: t.dependencies || [],
    })),
  } as ExecutionPhase;
}

describe('checkPlanIntegrity', () => {
  it('passes a valid DAG', () => {
    const r = checkPlanIntegrity([
      phase([{ id: 'a' }, { id: 'b', dependencies: ['a'] }, { id: 'c', dependencies: ['a', 'b'] }]),
    ]);
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it('flags a dependency on an unknown task', () => {
    const r = checkPlanIntegrity([phase([{ id: 'a', dependencies: ['ghost'] }])]);
    expect(r.ok).toBe(false);
    expect(r.errors.some(e => /unknown task "ghost"/.test(e))).toBe(true);
  });

  it('detects a dependency cycle', () => {
    const r = checkPlanIntegrity([
      phase([{ id: 'a', dependencies: ['c'] }, { id: 'b', dependencies: ['a'] }, { id: 'c', dependencies: ['b'] }]),
    ]);
    expect(r.ok).toBe(false);
    expect(r.errors.some(e => /cycle detected/i.test(e))).toBe(true);
  });

  it('handles dependencies across phases', () => {
    const r = checkPlanIntegrity([
      phase([{ id: 'a' }]),
      { ...phase([{ id: 'b', dependencies: ['a'] }]), id: 'p1', number: 1 } as ExecutionPhase,
    ]);
    expect(r.ok).toBe(true);
  });
});
