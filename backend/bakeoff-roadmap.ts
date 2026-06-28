/**
 * Roadmap bake-off — three architectures process the SAME large roadmap
 * (Ultimate Agentic App Factory), bounded to its own "First Build Slice".
 *
 * All arms: plan -> per-phase execute -> validate(tsc)+repair. They differ only
 * in models + whether execution fans out to agent-cast workers (tiered/haiku) or
 * one shared-context agent (single-opus).
 *
 * Emits .bakeoff-roadmap/results.json with per-phase, per-agent, per-model
 * breakdown. Run: npx tsx bakeoff-roadmap.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LLMClient } from '@fuhrhaus/orchestration-core';
import { OutputParser } from './src/services/output-parser.js';
import { ProjectValidator } from './src/services/project-validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '.bakeoff-roadmap');
const ROADMAP_PATH = path.join(
  __dirname,
  '..',
  'data',
  'roadmaps',
  'Ultimate Agentic App Factory Roadmap.md'
);

const M = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-8',
} as const;
const PRICE: Record<string, { in: number; out: number }> = {
  [M.haiku]: { in: 0.8, out: 4 },
  [M.sonnet]: { in: 3, out: 15 },
  [M.opus]: { in: 15, out: 75 },
};
const short = (m: string) => m.split('-')[1];

const ROADMAP = fs.readFileSync(ROADMAP_PATH, 'utf8');

// Compressed slice brief given to WORKERS (bounds input; planner sees full roadmap).
const BRIEF = `AGENTIC APP FACTORY — First Build Slice (core skeleton), implemented as a TypeScript
library (ESM, strict, vitest). No browser/JSX runtime — model UI routes & state as typed
modules + pure functions with tests. Build ONLY these 8 skeleton concerns:
1. Web shell + route map (typed route registry for /, /ideas, /concierge, /recipes, /build, /runs, /runs/:id, /memory, /observe, /admin)
2. Idea intake (capture concept, constraints, goals, users, risks -> typed Idea object + validation)
3. Prompt refinement panel (3-5 iteration loop model: raw -> clarified -> assumptions/constraints/non-goals)
4. Roadmap state model (Roadmap/Phase/Task types + status state-machine, resumable)
5. Agent registry viewer (AgentDefinition type + in-memory registry + lookup)
6. Run dashboard shell (Run/Phase status model + selectors for cost/tokens/duration by phase)
7. Manual phase status updates (validated state transitions pending->in-progress->completed/failed)
8. Artifact manifest viewer (Artifact type + manifest add/list/trace-to-phase)
All code under src/. Tests as *.test.ts importing from 'vitest'. Strict TS, no runtime deps.`;

// ---- agent role -> system prompt (the "agent cast") ----
const ROLE_PROMPTS: Record<string, string> = {
  architect: `Architect. Produce design + type/schema files only: TypeScript interfaces, typed
registries, JSON-shaped schema objects, route maps. Output ## File: blocks. No prose. Strict TS.`,
  engineer: `Engineer. Produce complete, working implementation files.
For every file: ## File: path/to/file.ext\n\`\`\`lang\ncontent\`\`\`. No prose before/after blocks.
Minimal correct implementation, error handling at boundaries, strict TS, no runtime deps.`,
  test: `Test and Validation Agent. Write complete vitest test files.
For every file: ## File: path/to/file.test.ts\n\`\`\`typescript\ncontent\`\`\`. Use describe/it/expect
imported from 'vitest'. Cover happy path, edges, invalid input. No prose — only file blocks.`,
  critic: `Critic. Review existing files for defects and contract gaps. Where a fix is needed,
output the corrected file as a ## File: block. Strict TS. No speculative changes.`,
};
const ROLES = Object.keys(ROLE_PROMPTS);

const PLANNER_PROMPT = `You are the Roadmap Builder + Supervisor. Decompose ONLY the "First Build Slice"
(core skeleton) of the provided roadmap into an execution plan as a single JSON object.

Schema:
{ "phases": [ { "name": "string", "tasks": [ { "name": "string ≤8 words",
  "description": "compact directive: ACTION | OUTPUT file(s) under src/ | CONSTRAINT",
  "agent": "architect|engineer|test|critic" } ] } ] }

Rules:
- The project SCAFFOLD (package.json, tsconfig.json, vitest.config.ts) ALREADY EXISTS — no tasks for it.
- 3-5 phases, 2-4 tasks per phase. Name every file each task outputs (under src/).
- Cast the right agent per task: architect for types/schemas/route maps, engineer for logic,
  test for vitest suites, critic for review/repair tasks.
- Implement as TypeScript modules + vitest tests (no JSX/browser).
- Respond with ONLY the JSON object.`;

const WORKER_TAIL = `\n\nScaffold already exists — do NOT output package.json/tsconfig/vitest.config.
Output ONLY files as:\n## File: path/to/file.ext\n\`\`\`lang\ncontent\`\`\``;

const SCAFFOLD: Record<string, string> = {
  'package.json': JSON.stringify(
    { name: 'app-factory-slice', version: '1.0.0', type: 'module', scripts: { test: 'vitest run' }, devDependencies: { typescript: '^5.4.0', vitest: '^1.6.0' } },
    null, 2
  ),
  'tsconfig.json': JSON.stringify(
    { compilerOptions: { target: 'ES2020', module: 'ESNext', moduleResolution: 'Bundler', strict: true, noEmit: true, esModuleInterop: true, skipLibCheck: true, forceConsistentCasingInFileNames: true }, include: ['src'] },
    null, 2
  ),
  'vitest.config.ts': `import { defineConfig } from 'vitest/config';\nexport default defineConfig({ test: { include: ['**/*.test.ts'] } });\n`,
};

// ---- instrumentation ----
interface CallRec { scope: string; phase: string; agent: string; model: string; inTok: number; outTok: number; ms: number; }
interface PhaseRec { name: string; tasks: { name: string; agent: string; model: string }[]; durationMs: number; filesAfter: number; repairAttempts: number; tscPassed: boolean | null; }
interface ArmResult {
  arm: string; durationMs: number; phaseCount: number; taskCount: number; filesWritten: number;
  tscPassedFinal: boolean; vitestPassedFinal: boolean; totalErrorsFinal: number;
  testFiles: number; assertions: number; srcLines: number;
  calls: CallRec[]; phases: PhaseRec[];
  byModel: Record<string, { in: number; out: number; calls: number; cost: number }>;
  agentHistogram: Record<string, number>;
  totalCost: number; notes: string[];
}

// Quality-depth scan — written into results.json so the dashboard survives dir cleanup.
function scanQuality(dir: string): { testFiles: number; assertions: number; srcLines: number } {
  let testFiles = 0, assertions = 0, srcLines = 0;
  const walk = (d: string) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.ts')) {
        const c = fs.readFileSync(p, 'utf8');
        srcLines += c.split('\n').length;
        if (e.name.endsWith('.test.ts')) { testFiles++; assertions += (c.match(/expect\(/g) || []).length; }
      }
    }
  };
  walk(path.join(dir, 'src'));
  return { testFiles, assertions, srcLines };
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error('NO ANTHROPIC_API_KEY'); process.exit(1); }
const client = new LLMClient({ apiKey });
const parser = new OutputParser();

function freshDir(arm: string): string {
  const dir = path.join(ROOT, arm);
  fs.mkdirSync(dir, { recursive: true });
  fs.rmSync(path.join(dir, 'src'), { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  for (const [f, c] of Object.entries(SCAFFOLD)) fs.writeFileSync(path.join(dir, f), c);
  return dir;
}
function writeFiles(dir: string, text: string): string[] {
  const written: string[] = [];
  for (const a of parser.parseTaskOutput(text)) {
    if (SCAFFOLD[a.filePath]) continue;
    const full = path.join(dir, a.filePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, a.content);
    written.push(a.filePath);
  }
  return written;
}
function countFiles(dir: string): number {
  let n = 0;
  const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.ts')) n++; } };
  const src = path.join(dir, 'src'); if (fs.existsSync(src)) walk(src);
  return n;
}

async function repairPhase(dir: string, arm: string, calls: CallRec[], phaseName: string, repairModelFor: (a: number) => string): Promise<{ attempts: number; tscPassed: boolean }> {
  const validator = new ProjectValidator(dir, arm);
  let report = await validator.validate(['tsc']);
  let attempt = 0;
  while (!report.passed && attempt < 3) {
    attempt++;
    const model = repairModelFor(attempt);
    const tsc = report.results.find((r: any) => r.tool === 'tsc');
    const byFile = new Map<string, any[]>();
    for (const e of tsc?.errors || []) { if (!e.file) continue; const l = byFile.get(e.file) ?? []; l.push(e); byFile.set(e.file, l); }
    if (!byFile.size) break;
    for (const [file, errs] of byFile) {
      const abs = path.join(dir, file); let cur = '';
      try { cur = fs.readFileSync(abs, 'utf8'); } catch { continue; }
      const errLines = errs.map((e) => `  Line ${e.line}: ${e.message}`).join('\n');
      const prompt = `The file \`${file}\` has ${errs.length} TypeScript error(s):\n\n${errLines}\n\nYOUR ENTIRE RESPONSE MUST BE THIS FILE CORRECTED:\n\n## File: ${file}\n\`\`\`typescript\n[corrected file]\n\`\`\`\n\nNO prose. ONLY the ## File: block.\n\nCurrent broken file:\n\n\`\`\`typescript\n${cur}\n\`\`\``;
      const t = Date.now();
      const r = await client.call({ model, systemPrompt: ROLE_PROMPTS.engineer, messages: [{ role: 'user', content: prompt }], maxTokens: 4096 });
      calls.push({ scope: 'repair', phase: phaseName, agent: 'repair', model, inTok: r.inputTokens, outTok: r.outputTokens, ms: Date.now() - t });
      writeFiles(dir, r.text);
    }
    report = await validator.validate(['tsc']);
  }
  return { attempts: attempt, tscPassed: report.passed };
}

function summarize(arm: string, t0: number, calls: CallRec[], phases: PhaseRec[], dir: string, notes: string[]): ArmResult {
  const byModel: ArmResult['byModel'] = {};
  const agentHistogram: Record<string, number> = {};
  for (const c of calls) {
    const e = (byModel[c.model] ||= { in: 0, out: 0, calls: 0, cost: 0 });
    e.in += c.inTok; e.out += c.outTok; e.calls++;
    e.cost += (c.inTok * PRICE[c.model].in) / 1e6 + (c.outTok * PRICE[c.model].out) / 1e6;
    if (c.scope === 'task') agentHistogram[c.agent] = (agentHistogram[c.agent] || 0) + 1;
  }
  const totalCost = Object.values(byModel).reduce((s, e) => s + e.cost, 0);
  const q = scanQuality(dir);
  return {
    arm, durationMs: Date.now() - t0, phaseCount: phases.length,
    taskCount: phases.reduce((s, p) => s + p.tasks.length, 0), filesWritten: countFiles(dir),
    tscPassedFinal: false, vitestPassedFinal: false, totalErrorsFinal: 0,
    testFiles: q.testFiles, assertions: q.assertions, srcLines: q.srcLines,
    calls, phases, byModel, agentHistogram, totalCost, notes,
  };
}

// ---- orchestrated arms (haiku / tiered) ----
async function runOrchestrated(arm: string, plannerModel: string, workerModel: () => string, repairModelFor: (a: number) => string): Promise<ArmResult> {
  const t0 = Date.now();
  const calls: CallRec[] = [];
  const phases: PhaseRec[] = [];
  const notes: string[] = [];
  const dir = freshDir(arm);

  // PLAN (sees full roadmap)
  let tp = Date.now();
  const planR = await client.call({ model: plannerModel, systemPrompt: PLANNER_PROMPT, messages: [{ role: 'user', content: `ROADMAP:\n${ROADMAP}\n\nProduce the First Build Slice plan JSON.` }], maxTokens: 4096 });
  calls.push({ scope: 'plan', phase: 'PLANNING', agent: 'planner', model: plannerModel, inTok: planR.inputTokens, outTok: planR.outputTokens, ms: Date.now() - tp });
  let plan: any;
  try { plan = JSON.parse(LLMClient.extractJSON(planR.text)); } catch { plan = { phases: [{ name: 'Skeleton', tasks: [{ name: 'Implement slice', description: BRIEF, agent: 'engineer' }] }] }; notes.push('plan parse failed -> fallback'); }
  let planPhases: any[] = (plan.phases || []).slice(0, 5);

  const createdFiles: string[] = [];
  for (const ph of planPhases) {
    const pStart = Date.now();
    const tasks = (ph.tasks || []).slice(0, 4);
    const taskRecs: PhaseRec['tasks'] = [];
    for (const task of tasks) {
      const role = ROLES.includes(task.agent) ? task.agent : 'engineer';
      const model = workerModel();
      const existing = createdFiles.length ? `\nExisting files (import from these): ${createdFiles.join(', ')}` : '';
      const user = `PROJECT BRIEF:\n${BRIEF}\n${existing}\n\nTASK: ${task.name}\n${task.description}${WORKER_TAIL}`;
      const t = Date.now();
      const r = await client.call({ model, systemPrompt: ROLE_PROMPTS[role], messages: [{ role: 'user', content: user }], maxTokens: 4096 });
      calls.push({ scope: 'task', phase: ph.name, agent: role, model, inTok: r.inputTokens, outTok: r.outputTokens, ms: Date.now() - t });
      for (const f of writeFiles(dir, r.text)) if (!createdFiles.includes(f)) createdFiles.push(f);
      taskRecs.push({ name: task.name, agent: role, model });
    }
    const rep = await repairPhase(dir, arm, calls, ph.name, repairModelFor);
    phases.push({ name: ph.name, tasks: taskRecs, durationMs: Date.now() - pStart, filesAfter: createdFiles.length, repairAttempts: rep.attempts, tscPassed: rep.tscPassed });
  }

  const res = summarize(arm, t0, calls, phases, dir, notes);
  const finalReport = await new ProjectValidator(dir, arm).validate(['tsc', 'vitest']);
  res.tscPassedFinal = finalReport.results.find((r: any) => r.tool === 'tsc')?.passed ?? false;
  res.vitestPassedFinal = finalReport.results.find((r: any) => r.tool === 'vitest')?.passed ?? false;
  res.totalErrorsFinal = finalReport.totalErrors;
  return res;
}

// ---- single-opus: one Opus agent plans then implements each phase with shared context ----
async function runSingleOpus(): Promise<ArmResult> {
  const arm = 'single-opus';
  const t0 = Date.now();
  const calls: CallRec[] = [];
  const phases: PhaseRec[] = [];
  const notes: string[] = [];
  const dir = freshDir(arm);

  let tp = Date.now();
  const planR = await client.call({ model: M.opus, systemPrompt: PLANNER_PROMPT, messages: [{ role: 'user', content: `ROADMAP:\n${ROADMAP}\n\nProduce the First Build Slice plan JSON.` }], maxTokens: 4096 });
  calls.push({ scope: 'plan', phase: 'PLANNING', agent: 'planner', model: M.opus, inTok: planR.inputTokens, outTok: planR.outputTokens, ms: Date.now() - tp });
  let plan: any;
  try { plan = JSON.parse(LLMClient.extractJSON(planR.text)); } catch { plan = { phases: [{ name: 'Skeleton', tasks: [] }] }; notes.push('plan parse failed'); }
  const planPhases: any[] = (plan.phases || []).slice(0, 5);

  const createdFiles: string[] = [];
  for (const ph of planPhases) {
    const pStart = Date.now();
    const taskList = (ph.tasks || []).map((t: any) => `- ${t.name}: ${t.description}`).join('\n') || ph.name;
    const existing = createdFiles.length ? `\nExisting files (import from these, keep them coherent): ${createdFiles.join(', ')}` : '';
    const user = `PROJECT BRIEF:\n${BRIEF}\n${existing}\n\nIMPLEMENT THIS PHASE — ${ph.name}:\n${taskList}\n\nProduce all source + vitest files for this phase, coherent with existing files.${WORKER_TAIL}`;
    const t = Date.now();
    const r = await client.call({ model: M.opus, systemPrompt: ROLE_PROMPTS.engineer, messages: [{ role: 'user', content: user }], maxTokens: 6000 });
    calls.push({ scope: 'task', phase: ph.name, agent: 'opus-solo', model: M.opus, inTok: r.inputTokens, outTok: r.outputTokens, ms: Date.now() - t });
    for (const f of writeFiles(dir, r.text)) if (!createdFiles.includes(f)) createdFiles.push(f);
    const rep = await repairPhase(dir, arm, calls, ph.name, () => M.opus);
    phases.push({ name: ph.name, tasks: [{ name: ph.name, agent: 'opus-solo', model: M.opus }], durationMs: Date.now() - pStart, filesAfter: createdFiles.length, repairAttempts: rep.attempts, tscPassed: rep.tscPassed });
  }

  const res = summarize(arm, t0, calls, phases, dir, notes);
  const finalReport = await new ProjectValidator(dir, arm).validate(['tsc', 'vitest']);
  res.tscPassedFinal = finalReport.results.find((r: any) => r.tool === 'tsc')?.passed ?? false;
  res.vitestPassedFinal = finalReport.results.find((r: any) => r.tool === 'vitest')?.passed ?? false;
  res.totalErrorsFinal = finalReport.totalErrors;
  return res;
}

// ---- contract-first tiered: Opus emits ONE shared contracts.ts FIRST, then Sonnet
//      workers import from it (forbidden to redefine). Repair Sonnet->Opus. ----
async function runContractFirst(): Promise<ArmResult> {
  const arm = 'contract-first';
  const t0 = Date.now();
  const calls: CallRec[] = [];
  const phases: PhaseRec[] = [];
  const notes: string[] = [];
  const dir = freshDir(arm);
  const workerModel = () => M.sonnet;
  const repairModelFor = (a: number) => (a >= 2 ? M.opus : M.sonnet);

  // PLAN (Opus, full roadmap)
  let tp = Date.now();
  const planR = await client.call({ model: M.opus, systemPrompt: PLANNER_PROMPT, messages: [{ role: 'user', content: `ROADMAP:\n${ROADMAP}\n\nProduce the First Build Slice plan JSON.` }], maxTokens: 4096 });
  calls.push({ scope: 'plan', phase: 'PLANNING', agent: 'planner', model: M.opus, inTok: planR.inputTokens, outTok: planR.outputTokens, ms: Date.now() - tp });
  let plan: any;
  try { plan = JSON.parse(LLMClient.extractJSON(planR.text)); } catch { plan = { phases: [{ name: 'Skeleton', tasks: [{ name: 'Implement slice', description: BRIEF, agent: 'engineer' }] }] }; notes.push('plan parse failed -> fallback'); }
  const planPhases: any[] = (plan.phases || []).slice(0, 5);

  // CONTRACT PHASE (Opus) — one shared source-of-truth file, written first.
  const tc = Date.now();
  const contractUser = `PROJECT BRIEF:\n${BRIEF}\n\nProduce EXACTLY ONE file: src/contracts.ts — the single source of truth for ALL shared types in this slice. Export every interface/type/enum more than one module needs: route ids, Idea, RefinedPrompt, AgentDefinition, AgentCapability, Roadmap, Phase, Task, Run, Artifact, and all status types. CRITICAL: define status types (PhaseStatus, RunStatus, TaskStatus) as TypeScript string ENUMS so they are usable as BOTH types and runtime values. Types/enums/const-maps only — no logic.${WORKER_TAIL}`;
  const contractR = await client.call({ model: M.opus, systemPrompt: ROLE_PROMPTS.architect, messages: [{ role: 'user', content: contractUser }], maxTokens: 4096 });
  calls.push({ scope: 'contract', phase: 'CONTRACTS', agent: 'architect', model: M.opus, inTok: contractR.inputTokens, outTok: contractR.outputTokens, ms: Date.now() - tc });
  writeFiles(dir, contractR.text);
  let contractsContent = '';
  try { contractsContent = fs.readFileSync(path.join(dir, 'src', 'contracts.ts'), 'utf8'); } catch { notes.push('contracts.ts not produced — workers run without shared contract'); }
  const contractBlock = contractsContent
    ? `SHARED CONTRACTS — src/contracts.ts (import ALL shared types from here via a correct relative path to src/contracts.ts; DO NOT redefine anything below):\n\`\`\`typescript\n${contractsContent}\n\`\`\`\n\n`
    : '';
  phases.push({ name: 'CONTRACTS', tasks: [{ name: 'shared contracts.ts', agent: 'architect', model: M.opus }], durationMs: Date.now() - tc, filesAfter: countFiles(dir), repairAttempts: 0, tscPassed: null });

  // EXECUTE — Sonnet workers, each fed the shared contract.
  const createdFiles: string[] = ['src/contracts.ts'];
  for (const ph of planPhases) {
    const pStart = Date.now();
    const tasks = (ph.tasks || []).slice(0, 4);
    const taskRecs: PhaseRec['tasks'] = [];
    for (const task of tasks) {
      const role = ROLES.includes(task.agent) ? task.agent : 'engineer';
      const model = workerModel();
      const existing = createdFiles.length ? `\nExisting files (import from these): ${createdFiles.join(', ')}` : '';
      const user = `${contractBlock}PROJECT BRIEF:\n${BRIEF}\n${existing}\n\nTASK: ${task.name}\n${task.description}\n\nImport shared types from src/contracts.ts — never redefine them.${WORKER_TAIL}`;
      const t = Date.now();
      const r = await client.call({ model, systemPrompt: ROLE_PROMPTS[role], messages: [{ role: 'user', content: user }], maxTokens: 4096 });
      calls.push({ scope: 'task', phase: ph.name, agent: role, model, inTok: r.inputTokens, outTok: r.outputTokens, ms: Date.now() - t });
      for (const f of writeFiles(dir, r.text)) if (!createdFiles.includes(f)) createdFiles.push(f);
      taskRecs.push({ name: task.name, agent: role, model });
    }
    const rep = await repairPhase(dir, arm, calls, ph.name, repairModelFor);
    phases.push({ name: ph.name, tasks: taskRecs, durationMs: Date.now() - pStart, filesAfter: createdFiles.length, repairAttempts: rep.attempts, tscPassed: rep.tscPassed });
  }

  const res = summarize(arm, t0, calls, phases, dir, notes);
  const finalReport = await new ProjectValidator(dir, arm).validate(['tsc', 'vitest']);
  res.tscPassedFinal = finalReport.results.find((r: any) => r.tool === 'tsc')?.passed ?? false;
  res.vitestPassedFinal = finalReport.results.find((r: any) => r.tool === 'vitest')?.passed ?? false;
  res.totalErrorsFinal = finalReport.totalErrors;
  return res;
}

function line(r: ArmResult) {
  console.log(`\n=== ${r.arm} ===`);
  console.log(`cost $${r.totalCost.toFixed(3)}  dur ${(r.durationMs / 1000).toFixed(0)}s  phases ${r.phaseCount}  tasks ${r.taskCount}  files ${r.filesWritten}`);
  console.log(`models: ${Object.entries(r.byModel).map(([m, e]) => `${short(m)}(${e.calls}c,${e.out}out,$${e.cost.toFixed(2)})`).join(' ')}`);
  console.log(`agents: ${Object.entries(r.agentHistogram).map(([a, n]) => `${a}×${n}`).join(' ') || '(solo)'}`);
  console.log(`tsc ${r.tscPassedFinal}  vitest ${r.vitestPassedFinal}  errors ${r.totalErrorsFinal}`);
}

async function main() {
  fs.mkdirSync(ROOT, { recursive: true });
  const results: Record<string, ArmResult> = {};

  console.log('### uniform-haiku');
  results['uniform-haiku'] = await runOrchestrated('uniform-haiku', M.haiku, () => M.haiku, () => M.haiku);
  line(results['uniform-haiku']);

  console.log('\n### tiered (naive fan-out)');
  results['tiered'] = await runOrchestrated('tiered', M.opus, () => M.sonnet, (a) => (a >= 2 ? M.opus : M.sonnet));
  line(results['tiered']);

  console.log('\n### contract-first (shared contracts.ts before fan-out)');
  results['contract-first'] = await runContractFirst();
  line(results['contract-first']);

  console.log('\n### single-opus');
  results['single-opus'] = await runSingleOpus();
  line(results['single-opus']);

  const payload = { goal: 'Ultimate Agentic App Factory — First Build Slice', generatedFromSamples: 1, arms: results };
  fs.writeFileSync(path.join(ROOT, 'results.json'), JSON.stringify(payload, null, 2));
  console.log('\nWrote', path.join(ROOT, 'results.json'));
}

main().catch((e) => { console.error('FAILED:', e); process.exit(1); });
