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

async function loadContracts(): Promise<GovernanceContract[]> {
  let files: string[];
  try {
    files = (await fs.readdir(contractsDir)).filter((f) => f.toLowerCase().endsWith('.json'));
  } catch {
    return []; // no contracts dir — return empty rather than erroring
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
    } catch {
      // skip unparseable file but keep serving the rest
    }
  }
  return out;
}

export const createGovernanceContractRoutes = () => {
  const router = Router();

  router.get('/', async (_req: Request, res: Response) => {
    try {
      res.json(createResponse(await loadContracts()));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load governance contracts',
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const all = await loadContracts();
      const found = all.find((c) => c.id === req.params.id || c.file === req.params.id);
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
