import { Router, Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createResponse } from '../types/responses.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// repo-root /contracts — the vendored governance contract DEFINITIONS (JSON Schema),
// distinct from the persistence-backed /contracts CRUD which holds stored instances.
const contractsDir = path.join(__dirname, '..', '..', '..', 'contracts');

const KINDS = ['request', 'contract', 'schema', 'policy'] as const;

interface GovernanceContract {
  id: string;
  name: string;
  group: string;
  kind: string;
  version: string;
  file: string;
  requiredCount: number;
  propertyCount: number;
  schema: Record<string, unknown>;
}

interface ContractLoadError {
  file: string;
  message: string;
}

interface ContractLoadResult {
  contracts: GovernanceContract[];
  errors: ContractLoadError[];
  directoryExists: boolean;
}

function parseMeta(file: string): Omit<GovernanceContract, 'requiredCount' | 'propertyCount' | 'schema'> {
  const noExt = file.replace(/\.json$/i, '');
  const parts = noExt.split('.');
  const version = parts.find((p) => /^v\d+$/i.test(p)) || 'v1';
  const name = parts.filter((p) => !/^v\d+$/i.test(p)).join('.');
  const segs = name.split('_');
  let kind = 'schema';
  let group = name;
  const last = segs[segs.length - 1];
  if ((KINDS as readonly string[]).includes(last)) {
    kind = last;
    group = segs.slice(0, -1).join('_');
  }
  return { id: `${name}.${version}`, name, group, kind, version, file };
}

async function loadContracts(): Promise<ContractLoadResult> {
  let files: string[];
  let directoryExists = true;
  const errors: ContractLoadError[] = [];

  try {
    files = (await fs.readdir(contractsDir)).filter((f) => f.toLowerCase().endsWith('.json'));
  } catch (err) {
    directoryExists = false;
    const message = err instanceof Error ? err.message : 'Directory not found';
    errors.push({ file: contractsDir, message });
    return { contracts: [], errors, directoryExists };
  }

  const out: GovernanceContract[] = [];
  for (const file of files.sort()) {
    try {
      const raw = await fs.readFile(path.join(contractsDir, file), 'utf-8');
      const schema = JSON.parse(raw) as Record<string, unknown>;
      const required = Array.isArray(schema.required) ? (schema.required as string[]) : [];
      const props = (schema.properties as Record<string, unknown> | undefined) || {};
      out.push({
        ...parseMeta(file),
        requiredCount: required.length,
        propertyCount: Object.keys(props).length,
        schema,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse contract';
      errors.push({ file, message });
    }
  }
  return { contracts: out, errors, directoryExists };
}

export const createGovernanceContractRoutes = () => {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      const result = await loadContracts();
      res.json(createResponse(result.contracts));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load governance contracts',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // NEW: Health endpoint (before :id route so it's matched first)
  router.get('/health', async (_req: Request, res: Response) => {
    try {
      const result = await loadContracts();
      const ok = result.directoryExists && result.errors.length === 0;

      res.status(ok ? 200 : 500).json({
        ok,
        loadedCount: result.contracts.length,
        errorCount: result.errors.length,
        directoryExists: result.directoryExists,
        errors: result.errors.length > 0 ? result.errors : undefined,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to check governance contract health',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get specific contract by ID
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const result = await loadContracts();
      const found = result.contracts.find((c) => c.id === req.params.id || c.file === req.params.id);
      if (!found) {
        return res.status(404).json({ error: 'Contract not found', timestamp: new Date().toISOString() });
      }
      res.json(createResponse(found));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load governance contract',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
};
