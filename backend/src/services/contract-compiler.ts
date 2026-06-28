import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { RunContract } from '@unifiedaitoolbox/shared';

// Roadmap Phase 35 — Wire the Vendored Contracts.
// Harden a loose request (job_type + goal) into a complete, schema-valid contract by merging
// job-type defaults, and refuse to start a run whose contract is incomplete or violates the
// job's stage policy. Ports the request->contract compiler + job_router stage-policy idea.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..', '..');

export interface StagePolicy {
  required: string[];
  optional?: string[];
  forbidden: string[];
}

export interface JobTypeConfig {
  contract_universe: string;
  contract_version: string;
  contract_schema?: string;
  default_agents: string[];
  default_stages: string[];
  stage_policy: StagePolicy;
  budget: Record<string, unknown>;
  gate_policy: Record<string, unknown>;
  artifact_policy: Record<string, unknown>;
  logging?: Record<string, unknown>;
}

export type JobTypes = Record<string, JobTypeConfig>;

export interface CompileRequest {
  jobType: string;
  goal: string;
  runId: string;
  agentRoster?: string[];
  stages?: string[];
  budget?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ContractValidation {
  valid: boolean;
  errors: string[];
}

// build_app_contract.v1.json / maintenance_contract.v1.json required fields (the "hardened" set).
export const CONTRACT_REQUIRED: (keyof RunContract)[] = [
  'schema_version',
  'job_type',
  'contract_universe',
  'contract_version',
  'pipeline_id',
  'run_id',
  'goal',
  'agent_roster',
  'budget',
  'logging',
  'artifact_policy',
  'gate_policy',
  'stages',
];

export async function loadJobTypes(): Promise<JobTypes> {
  const raw = await fs.readFile(path.join(repoRoot, 'job_types.json'), 'utf-8');
  return JSON.parse(raw) as JobTypes;
}

/** Merge job-type defaults over the request to produce a complete contract. */
export function compileContract(req: CompileRequest, job: JobTypeConfig): RunContract {
  return {
    schema_version: '1.0',
    job_type: req.jobType,
    contract_universe: job.contract_universe,
    contract_version: job.contract_version,
    pipeline_id: `pipeline-${req.runId}`,
    run_id: req.runId,
    goal: req.goal,
    agent_roster: req.agentRoster && req.agentRoster.length ? req.agentRoster : job.default_agents,
    budget: req.budget ?? job.budget,
    logging: job.logging ?? { level: 'info' },
    artifact_policy: job.artifact_policy,
    gate_policy: job.gate_policy,
    stages: req.stages && req.stages.length ? req.stages : job.default_stages,
    ...(req.metadata ? { metadata: req.metadata } : {}),
  };
}

function isEmpty(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return false;
}

/**
 * Validate that the compiled contract is complete (all required fields non-empty) and respects
 * the job's stage policy (required stages present, forbidden stages absent). A run must NOT
 * start unless this passes.
 */
export function validateContract(contract: RunContract, job: JobTypeConfig): ContractValidation {
  const errors: string[] = [];

  for (const key of CONTRACT_REQUIRED) {
    if (isEmpty(contract[key])) errors.push(`Missing or empty required field: ${key}`);
  }

  for (const s of job.stage_policy.required) {
    if (!contract.stages.includes(s)) errors.push(`Required stage missing: ${s}`);
  }
  for (const s of job.stage_policy.forbidden) {
    if (contract.stages.includes(s)) errors.push(`Forbidden stage present: ${s}`);
  }

  return { valid: errors.length === 0, errors };
}

/** Compile + validate in one step. Returns the contract and the validation verdict. */
export function buildAndValidate(
  req: CompileRequest,
  job: JobTypeConfig
): { contract: RunContract; validation: ContractValidation } {
  const contract = compileContract(req, job);
  return { contract, validation: validateContract(contract, job) };
}
