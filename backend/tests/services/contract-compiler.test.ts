import { describe, it, expect } from 'vitest';
import {
  compileContract,
  validateContract,
  buildAndValidate,
  type JobTypeConfig,
} from '../../src/services/contract-compiler.js';

const jobConfig: JobTypeConfig = {
  contract_universe: 'app_factory',
  contract_version: '1.0',
  default_agents: ['Researcher', 'Engineer', 'Critic'],
  default_stages: ['plan', 'generate', 'validate', 'repair'],
  stage_policy: { required: ['plan', 'generate', 'validate'], optional: ['repair'], forbidden: ['maintain'] },
  budget: { max_time_minutes: 30 },
  gate_policy: { mode: 'advisory' },
  artifact_policy: { mode: 'required', required: ['generated_app'] },
  logging: { level: 'info' },
};

describe('compileContract', () => {
  it('merges job-type defaults over a loose request', () => {
    const c = compileContract({ jobType: 'build_new_app', goal: 'build a thing', runId: 'r1' }, jobConfig);
    expect(c.job_type).toBe('build_new_app');
    expect(c.goal).toBe('build a thing');
    expect(c.run_id).toBe('r1');
    expect(c.agent_roster).toEqual(['Researcher', 'Engineer', 'Critic']);
    expect(c.stages).toEqual(['plan', 'generate', 'validate', 'repair']);
    expect(c.contract_universe).toBe('app_factory');
    expect(c.pipeline_id).toBe('pipeline-r1');
    expect(c.schema_version).toBe('1.0');
  });

  it('honors explicit overrides', () => {
    const c = compileContract(
      { jobType: 'build_new_app', goal: 'g', runId: 'r2', agentRoster: ['OnlyOne'], stages: ['plan', 'generate', 'validate'] },
      jobConfig
    );
    expect(c.agent_roster).toEqual(['OnlyOne']);
    expect(c.stages).toEqual(['plan', 'generate', 'validate']);
  });

  it('falls back to the job default when budget is an empty object', () => {
    const c = compileContract({ jobType: 'build_new_app', goal: 'g', runId: 'r3', budget: {} }, jobConfig);
    expect(c.budget).toEqual(jobConfig.budget);
    expect(validateContract(c, jobConfig).valid).toBe(true);
  });
});

describe('validateContract', () => {
  it('passes for a complete, policy-respecting contract', () => {
    const { validation } = buildAndValidate({ jobType: 'build_new_app', goal: 'g', runId: 'r1' }, jobConfig);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('fails when a required field is empty (no goal)', () => {
    const { validation } = buildAndValidate({ jobType: 'build_new_app', goal: '', runId: 'r1' }, jobConfig);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => /goal/i.test(e))).toBe(true);
  });

  it('fails when the agent roster is empty', () => {
    const c = compileContract({ jobType: 'build_new_app', goal: 'g', runId: 'r1' }, jobConfig);
    c.agent_roster = [];
    const v = validateContract(c, jobConfig);
    expect(v.valid).toBe(false);
    expect(v.errors.some(e => /agent_roster/.test(e))).toBe(true);
  });

  it('fails when a required stage is missing', () => {
    const { validation } = buildAndValidate(
      { jobType: 'build_new_app', goal: 'g', runId: 'r1', stages: ['plan', 'generate'] },
      jobConfig
    );
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => /Required stage missing: validate/.test(e))).toBe(true);
  });

  it('fails when a forbidden stage is present', () => {
    const { validation } = buildAndValidate(
      { jobType: 'build_new_app', goal: 'g', runId: 'r1', stages: ['plan', 'generate', 'validate', 'maintain'] },
      jobConfig
    );
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => /Forbidden stage present: maintain/.test(e))).toBe(true);
  });
});
