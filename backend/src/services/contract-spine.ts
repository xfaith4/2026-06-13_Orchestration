import fs from 'fs/promises';
import path from 'path';

// Roadmap Phase 34 — Shared-Contract / Traceability Spine.
// Deterministic anti-drift check: the bake-off's #1 failure was workers redefining each
// other's types (e.g. `PhaseStatus` declared as a type in one file and used as a value in
// another). The reliable, prompt-free signal is a shared type DECLARED in more than one
// file. This module detects that, and locates the single "contract module" to inject into
// downstream workers so they import shared types instead of reinventing them.

export interface ProjectFile {
  path: string;
  content: string;
}

export type DriftKind = 'duplicate_definition';

export interface DriftFinding {
  symbol: string;
  kind: DriftKind;
  files: string[];
}

export interface TraceabilityReport {
  runId: string;
  checkedAt: string;
  status: 'coherent' | 'drift';
  contractModule: string | null;
  contractSymbols: string[];
  drift: DriftFinding[];
  fileCount: number;
}

const CONTRACT_BASENAMES = new Set([
  'contracts',
  'contract',
  'types',
  'type',
  'schema',
  'schemas',
  'models',
  'model',
  'domain',
]);

const DECL_RE =
  /(?:^|\n)\s*(?:export\s+)?(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(interface|type|enum|class)\s+([A-Za-z_$][\w$]*)/g;

// Remove comments and string/template literals so a declaration keyword inside a block comment
// or a code-generating template string is not mistaken for a real declaration (false drift).
function stripCommentsAndStrings(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // block comments
    .replace(/\/\/[^\n]*/g, ' ') // line comments
    .replace(/`(?:\\.|[^`\\])*`/g, '``') // template literals
    .replace(/'(?:\\.|[^'\\])*'/g, "''") // single-quoted strings
    .replace(/"(?:\\.|[^"\\])*"/g, '""'); // double-quoted strings
}

/** Extract the type-level declarations (interface/type/enum/class) declared in a TS file. */
export function extractDeclarations(content: string): { name: string; kind: string }[] {
  const cleaned = stripCommentsAndStrings(content);
  const out: { name: string; kind: string }[] = [];
  for (const m of cleaned.matchAll(DECL_RE)) {
    out.push({ kind: m[1], name: m[2] });
  }
  return out;
}

function baseName(p: string): string {
  return (p.split(/[\\/]/).pop() ?? '').replace(/\.ts$/i, '').toLowerCase();
}

/**
 * Identify the shared contract module: prefer a non-test src file whose basename is a
 * contract-ish name (contracts/types/schema/models/domain), else the file declaring the
 * most types (needs ≥2 to qualify). Used to inject the shared types into downstream workers.
 */
export function findContractModule(files: ProjectFile[]): ProjectFile | null {
  const tsFiles = files.filter(f => f.path.endsWith('.ts') && !f.path.endsWith('.test.ts'));
  const typeCount = (f: ProjectFile) => extractDeclarations(f.content).filter(d => d.kind !== 'class').length;

  const named = tsFiles.filter(f => CONTRACT_BASENAMES.has(baseName(f.path)));
  if (named.length) {
    return [...named].sort((a, b) => typeCount(b) - typeCount(a))[0];
  }

  const ranked = tsFiles
    .map(f => ({ f, score: typeCount(f) }))
    .sort((a, b) => b.score - a.score);
  return ranked.length > 0 && ranked[0].score >= 2 ? ranked[0].f : null;
}

/**
 * Deterministic coherence/traceability check. A type declared in more than one `.ts` file
 * is `duplicate_definition` drift — multiple workers reinvented the same interface.
 */
export function checkCoherence(runId: string, files: ProjectFile[]): TraceabilityReport {
  // Drift is about SHARED type definitions across source files — exclude test files (which
  // legitimately re-reference/mock types) and `class` declarations (local impls, not shared
  // contract types). Mirrors findContractModule's exclusions.
  const tsFiles = files.filter(
    f => f.path.endsWith('.ts') && !f.path.endsWith('.test.ts') && !f.path.endsWith('.spec.ts')
  );

  const declMap = new Map<string, Set<string>>();
  for (const f of tsFiles) {
    for (const d of extractDeclarations(f.content)) {
      if (d.kind === 'class') continue;
      if (!declMap.has(d.name)) declMap.set(d.name, new Set());
      declMap.get(d.name)!.add(f.path);
    }
  }

  const drift: DriftFinding[] = [];
  for (const [symbol, fileSet] of declMap) {
    if (fileSet.size > 1) {
      drift.push({ symbol, kind: 'duplicate_definition', files: [...fileSet].sort() });
    }
  }
  drift.sort((a, b) => a.symbol.localeCompare(b.symbol));

  const contract = findContractModule(files);
  return {
    runId,
    checkedAt: new Date().toISOString(),
    status: drift.length > 0 ? 'drift' : 'coherent',
    contractModule: contract?.path ?? null,
    contractSymbols: contract
      ? [...new Set(extractDeclarations(contract.content).map(d => d.name))]
      : [],
    drift,
    fileCount: tsFiles.length,
  };
}

/** Read all `.ts` source files under a project root (skips node_modules/.git/dist). */
export async function readProjectFiles(root: string): Promise<ProjectFile[]> {
  const out: ProjectFile[] = [];
  async function walk(dir: string): Promise<void> {
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full);
      } else if (e.name.endsWith('.ts')) {
        try {
          out.push({
            path: path.relative(root, full).replace(/\\/g, '/'),
            content: await fs.readFile(full, 'utf-8'),
          });
        } catch {
          /* skip unreadable file */
        }
      }
    }
  }
  await walk(root);
  return out;
}
