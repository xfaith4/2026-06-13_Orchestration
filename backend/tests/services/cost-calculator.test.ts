import { describe, it, expect } from 'vitest';
import { CostCalculator, resolveModelTier, PRICING_AS_OF } from '@fuhrhaus/orchestration-core';

const M = 1_000_000;

describe('resolveModelTier', () => {
  it('classifies known model strings', () => {
    expect(resolveModelTier('claude-opus-4-8')).toBe('opus');
    expect(resolveModelTier('claude-sonnet-4-6')).toBe('sonnet');
    expect(resolveModelTier('claude-haiku-4-5-20251001')).toBe('haiku');
    expect(resolveModelTier('mock')).toBe('mock');
  });
  it('returns unknown for empty/unclassifiable', () => {
    expect(resolveModelTier('')).toBe('unknown');
    expect(resolveModelTier(undefined)).toBe('unknown');
    expect(resolveModelTier('gpt-4o')).toBe('unknown');
  });
});

describe('CostCalculator.priceUsage (definitive, model + 4 token types)', () => {
  const calc = new CostCalculator();

  it('prices each token type at the pinned per-model rate', () => {
    expect(calc.priceUsage('claude-opus-4-8', { input: M, output: 0 }).cost).toBeCloseTo(15, 6);
    expect(calc.priceUsage('claude-opus-4-8', { input: 0, output: M }).cost).toBeCloseTo(75, 6);
    expect(calc.priceUsage('claude-opus-4-8', { input: 0, output: 0, cacheWrite: M }).cost).toBeCloseTo(18.75, 6);
    expect(calc.priceUsage('claude-opus-4-8', { input: 0, output: 0, cacheRead: M }).cost).toBeCloseTo(1.5, 6);
    expect(calc.priceUsage('claude-sonnet-4-6', { input: M, output: 0 }).cost).toBeCloseTo(3, 6);
    expect(calc.priceUsage('claude-haiku-4-5', { input: 0, output: M }).cost).toBeCloseTo(4, 6);
  });

  it('sums the per-type breakdown to the total', () => {
    const p = calc.priceUsage('claude-opus-4-8', { input: M, output: M, cacheWrite: M, cacheRead: M });
    expect(p.breakdown.input + p.breakdown.output + p.breakdown.cacheWrite + p.breakdown.cacheRead).toBeCloseTo(p.cost, 6);
    expect(p.cost).toBeCloseTo(15 + 75 + 18.75 + 1.5, 6);
  });

  it('prices mock at zero', () => {
    expect(calc.priceUsage('mock', { input: M, output: M, cacheWrite: M, cacheRead: M }).cost).toBe(0);
  });

  it('flags unknown models and prices them at the fallback (haiku) rate, never zero', () => {
    const p = calc.priceUsage('gpt-4o', { input: M, output: 0 });
    expect(p.tier).toBe('unknown');
    expect(p.cost).toBeCloseTo(0.8, 6); // haiku input rate
  });

  it('legacy calculateTokenCost is corrected (real haiku rates, not the old ~250x-low placeholder)', () => {
    expect(calc.calculateTokenCost(M, M)).toBeCloseTo(0.8 + 4, 6);
  });

  it('exposes a pinned pricing date', () => {
    expect(PRICING_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
