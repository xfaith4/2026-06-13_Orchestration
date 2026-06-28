/**
 * Model-routing bake-off harness.
 *
 * Runs three architectures on ONE identical goal (ColorUtils) and measures
 * cost / tokens / duration / quality, using the production OutputParser and
 * ProjectValidator so file-extraction and tsc/vitest validation are faithful.
 *
 * Arms:
 *   1. uniform-haiku  — plan + execute + repair all on Haiku (current baseline)
 *   2. tiered         — Opus plan / Sonnet execute+repair, escalate repair→Opus
 *   3. single-opus    — one Opus call produces the whole project (the bar to beat)
 *
 * Scaffold (package.json/tsconfig/vitest.config) is fixed across arms so we
 * isolate code quality & coherence, not config over-scaffolding. Agents emit
 * only src/ + *.test.ts. Run: npx tsx bakeoff.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LLMClient } from '@fuhrhaus/orchestration-core';
import { OutputParser } from './src/services/output-parser.js';
import { ProjectValidator } from './src/services/project-validator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '.bakeoff');

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

// ---- shared goal (identical for every arm) ----
const GOAL = `Build a TypeScript color-conversion utility (ESM, strict, no runtime dependencies).
Functions (export from src/index.ts):
- hexToRgb(hex: string): { r: number; g: number; b: number }
    Accepts "#RRGGBB" or "RRGGBB", case-insensitive. Throws Error on invalid input.
- rgbToHex(r: number, g: number, b: number): string
    Returns "#RRGGBB" UPPERCASE. Throws Error if any component is not an integer in 0..255.
Round-trip invariant: rgbToHex(hexToRgb(x)) === x.toUpperCase() for any valid 6-digit hex.
Tests: a vitest suite (*.test.ts) covering happy path, boundaries (0 and 255), round-trip, and invalid input.`;

// ---- agent system prompts (verbatim from agents/*.yaml) ----
const ENGINEER_PROMPT = `Engineer. Produce complete, working implementation files.

For every file: ## File: path/to/file.ext\n\`\`\`lang\ncontent\`\`\`.
No prose before or after file blocks unless the task explicitly asks for explanation.

Rules:
- Minimal assumptions. State any that are load-bearing in a comment inside the file.
- Error handling at system boundaries (I/O, network, user input).
- Use the stack language and versions specified in the task.
- Smallest correct implementation first — no speculative abstractions.`;

const TEST_PROMPT = `Test and Validation Agent. Write complete test files.

For every test file: ## File: path/to/file.test.ts\n\`\`\`typescript\ncontent\`\`\`.
Use describe/it/expect imported from 'vitest'. Cover: happy path, edge cases, invalid input.
No prose — only file blocks.`;

// roadmap planner prompt (from roadmap-generator SYSTEM_PROMPT, trimmed to the goal-input shape)
const PLANNER_PROMPT = `Generate an implementation roadmap as a single JSON object.

Schema:
{ "phases": [ { "id": "phase-0", "name": "string",
  "tasks": [ { "id": "task-0-1", "name": "string ≤8 words",
    "description": "compact directive: ACTION | OUTPUT file(s) | CONSTRAINT", "agent": "engineer|test" } ] } ] }

Rules:
- The project SCAFFOLD (package.json, tsconfig.json, vitest.config.ts) ALREADY EXISTS. Do NOT create tasks for it.
- Only plan tasks that produce TypeScript source under src/ and vitest tests (*.test.ts).
- Name every file each task must output.
- "agent": "test" for test-writing tasks, "engineer" otherwise.
- 1-4 phases, 1-4 tasks per phase. Keep it minimal — this is a small utility.
- Respond with ONLY the JSON object.`;

// ---- scaffold written into every arm dir ----
const SCAFFOLD: Record<string, string> = {
  'package.json': JSON.stringify(
    {
      name: 'colorutils-bakeoff',
      version: '1.0.0',
      type: 'module',
      scripts: { test: 'vitest run' },
      devDependencies: { typescript: '^5.4.0', vitest: '^1.6.0' },
    },
    null,
    2
  ),
  'tsconfig.json': JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
      },
      include: ['src', 'tests'],
    },
    null,
    2
  ),
  'vitest.config.ts': `import { defineConfig } from 'vitest/config';\nexport default defineConfig({ test: { include: ['**/*.test.ts'] } });\n`,
};

// ---- token meter ----
type Meter = Record<string, { in: number; out: number; calls: number }>;
function newMeter(): Meter {
  return {};
}
function record(meter: Meter, model: string, inTok: number, outTok: number) {
  const e = (meter[model] ||= { in: 0, out: 0, calls: 0 });
  e.in += inTok;
  e.out += outTok;
  e.calls += 1;
}
function meterCost(meter: Meter): number {
  return Object.entries(meter).reduce((sum, [model, e]) => {
    const p = PRICE[model] || { in: 0, out: 0 };
    return sum + (e.in * p.in) / 1e6 + (e.out * p.out) / 1e6;
  }, 0);
}
function meterTotals(meter: Meter) {
  return Object.values(meter).reduce(
    (a, e) => ({ in: a.in + e.in, out: a.out + e.out, calls: a.calls + e.calls }),
    { in: 0, out: 0, calls: 0 }
  );
}

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('NO ANTHROPIC_API_KEY in env');
  process.exit(1);
}
const client = new LLMClient({ apiKey });
const parser = new OutputParser();

async function call(
  meter: Meter,
  model: string,
  system: string,
  user: string,
  maxTokens: number
): Promise<string> {
  const r = await client.call({
    model,
    systemPrompt: system,
    messages: [{ role: 'user', content: user }],
    maxTokens,
  });
  record(meter, model, r.inputTokens, r.outputTokens);
  return r.text;
}

function freshDir(arm: string): string {
  const dir = path.join(ROOT, arm);
  // Clear code only; preserve node_modules so npm install is a fast no-op across samples.
  fs.mkdirSync(dir, { recursive: true });
  for (const sub of ['src', 'tests']) fs.rmSync(path.join(dir, sub), { recursive: true, force: true });
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.test.ts')) fs.rmSync(path.join(dir, f), { force: true });
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  for (const [f, content] of Object.entries(SCAFFOLD)) {
    fs.writeFileSync(path.join(dir, f), content);
  }
  return dir;
}

function writeFiles(dir: string, text: string): string[] {
  const arts = parser.parseTaskOutput(text);
  const written: string[] = [];
  for (const a of arts) {
    // keep only src/ + test files; ignore attempts to rewrite scaffold
    if (SCAFFOLD[a.filePath]) continue;
    const full = path.join(dir, a.filePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, a.content);
    written.push(a.filePath);
  }
  return written;
}

const WORKER_TAIL = `\n\nScaffold (package.json, tsconfig.json, vitest.config.ts) already exists — do NOT output it.\nOutput ONLY files as:\n## File: path/to/file.ext\n\`\`\`lang\ncontent\`\`\``;

interface ArmResult {
  arm: string;
  durationMs: number;
  tasks: number;
  filesWritten: number;
  repairAttempts: number;
  tscPassedFirst: boolean | null;
  tscPassedFinal: boolean;
  vitestPassedFinal: boolean;
  meter: Meter;
  cost: number;
  notes: string[];
}

async function repairLoop(
  dir: string,
  meter: Meter,
  arm: string,
  repairModelFor: (attempt: number) => string,
  notes: string[]
): Promise<{ attempts: number; tscFirst: boolean; report: any }> {
  const validator = new ProjectValidator(dir, arm);
  let report = await validator.validate(['tsc', 'vitest']);
  const tscFirst = report.results.find((r: any) => r.tool === 'tsc')?.passed ?? false;
  let attempt = 0;
  while (!report.passed && attempt < 3) {
    attempt++;
    const model = repairModelFor(attempt);
    // group tsc errors by file
    const tsc = report.results.find((r: any) => r.tool === 'tsc');
    const byFile = new Map<string, any[]>();
    for (const e of tsc?.errors || []) {
      if (!e.file) continue;
      const list = byFile.get(e.file) ?? [];
      list.push(e);
      byFile.set(e.file, list);
    }
    if (byFile.size === 0) {
      notes.push(`repair ${attempt}: no file-attributed tsc errors; stopping (${report.summary})`);
      break;
    }
    for (const [file, errs] of byFile) {
      const abs = path.join(dir, file);
      let current = '';
      try {
        current = fs.readFileSync(abs, 'utf8');
      } catch {
        continue;
      }
      const errLines = errs.map((e) => `  Line ${e.line} [${(e.message || '').split(':')[0]}]: ${e.message}`).join('\n');
      const prompt =
        `The file \`${file}\` has ${errs.length} TypeScript error(s):\n\n${errLines}\n\n` +
        `YOUR ENTIRE RESPONSE MUST BE THIS FILE IN CORRECTED FORM:\n\n## File: ${file}\n\`\`\`typescript\n[corrected file]\n\`\`\`\n\n` +
        `NO prose. NO explanation. ONLY the ## File: block.\n\nCurrent broken file:\n\n\`\`\`typescript\n${current}\n\`\`\``;
      const out = await call(meter, model, ENGINEER_PROMPT, prompt, 4096);
      writeFiles(dir, out);
    }
    report = await validator.validate(['tsc', 'vitest']);
    notes.push(`repair ${attempt} (${model.split('-')[1]}): ${report.summary}`);
  }
  return { attempts: attempt, tscFirst, report };
}

async function runOrchestrated(
  arm: string,
  plannerModel: string,
  workerModel: () => string,
  repairModelFor: (attempt: number) => string
): Promise<ArmResult> {
  const t0 = Date.now();
  const meter = newMeter();
  const notes: string[] = [];
  const dir = freshDir(arm);

  // PLAN
  const planText = await call(meter, plannerModel, PLANNER_PROMPT, `GOAL:\n${GOAL}\n\nProduce the roadmap JSON.`, 4096);
  let plan: any;
  try {
    plan = JSON.parse(LLMClient.extractJSON(planText));
  } catch (e) {
    notes.push('PLAN parse failed; falling back to single engineer task');
    plan = { phases: [{ tasks: [{ name: 'Implement ColorUtils + tests', description: GOAL, agent: 'engineer' }] }] };
  }
  const tasks: any[] = (plan.phases || []).flatMap((p: any) => p.tasks || []);
  if (tasks.length > 20) {
    notes.push(`planner produced ${tasks.length} tasks; capping at 20`);
    tasks.length = 20;
  }

  // EXECUTE (sequential, mirroring phase-executor)
  const created: string[] = [];
  for (const task of tasks) {
    const sys = task.agent === 'test' ? TEST_PROMPT : ENGINEER_PROMPT;
    const existing = created.length ? `\nExisting files (import from these): ${created.join(', ')}` : '';
    const user = `PROJECT BRIEF:\n${GOAL}\n${existing}\n\nTASK: ${task.name}\n${task.description}${WORKER_TAIL}`;
    const out = await call(meter, workerModel(), sys, user, 4096);
    for (const f of writeFiles(dir, out)) if (!created.includes(f)) created.push(f);
  }

  // VALIDATE + REPAIR
  const { attempts, tscFirst, report } = await repairLoop(dir, meter, arm, repairModelFor, notes);
  const tscFinal = report.results.find((r: any) => r.tool === 'tsc')?.passed ?? false;
  const vitestFinal = report.results.find((r: any) => r.tool === 'vitest')?.passed ?? false;

  return {
    arm,
    durationMs: Date.now() - t0,
    tasks: tasks.length,
    filesWritten: created.length,
    repairAttempts: attempts,
    tscPassedFirst: tscFirst,
    tscPassedFinal: tscFinal,
    vitestPassedFinal: vitestFinal,
    meter,
    cost: meterCost(meter),
    notes,
  };
}

async function runSingleOpus(): Promise<ArmResult> {
  const arm = 'single-opus';
  const t0 = Date.now();
  const meter = newMeter();
  const notes: string[] = [];
  const dir = freshDir(arm);

  const user =
    `${GOAL}\n\nProduce the COMPLETE project in one response: the implementation under src/ and a vitest test suite (*.test.ts). ` +
    `Make it coherent and self-consistent.${WORKER_TAIL}`;
  const out = await call(meter, M.opus, ENGINEER_PROMPT, user, 16000);
  const created = writeFiles(dir, out);

  const { attempts, tscFirst, report } = await repairLoop(dir, meter, arm, () => M.opus, notes);
  const tscFinal = report.results.find((r: any) => r.tool === 'tsc')?.passed ?? false;
  const vitestFinal = report.results.find((r: any) => r.tool === 'vitest')?.passed ?? false;

  return {
    arm,
    durationMs: Date.now() - t0,
    tasks: 1,
    filesWritten: created.length,
    repairAttempts: attempts,
    tscPassedFirst: tscFirst,
    tscPassedFinal: tscFinal,
    vitestPassedFinal: vitestFinal,
    meter,
    cost: meterCost(meter),
    notes,
  };
}

function fmt(r: ArmResult): string {
  const t = meterTotals(r.meter);
  const models = Object.keys(r.meter).map((m) => m.split('-')[1]).join('+');
  return [
    `\n=== ${r.arm} ===`,
    `models: ${models}   llm calls: ${t.calls}`,
    `tokens: in ${t.in}  out ${t.out}`,
    `cost: $${r.cost.toFixed(4)}`,
    `duration: ${(r.durationMs / 1000).toFixed(1)}s`,
    `tasks: ${r.tasks}   files: ${r.filesWritten}   repairAttempts: ${r.repairAttempts}`,
    `tsc first-pass: ${r.tscPassedFirst}   tsc final: ${r.tscPassedFinal}   vitest final: ${r.vitestPassedFinal}`,
    `notes: ${r.notes.join(' | ') || '(none)'}`,
  ].join('\n');
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function main() {
  fs.mkdirSync(ROOT, { recursive: true });
  const SAMPLES = Number(process.env.BAKEOFF_SAMPLES || 3);
  console.log(`SAMPLES per arm: ${SAMPLES}`);

  const runners: Record<string, () => Promise<ArmResult>> = {
    'uniform-haiku': () => runOrchestrated('uniform-haiku', M.haiku, () => M.haiku, () => M.haiku),
    tiered: () => runOrchestrated('tiered', M.opus, () => M.sonnet, (a) => (a >= 2 ? M.opus : M.sonnet)),
    'single-opus': () => runSingleOpus(),
  };

  const all: Record<string, ArmResult[]> = {};
  for (const [name, run] of Object.entries(runners)) {
    all[name] = [];
    for (let s = 0; s < SAMPLES; s++) {
      console.log(`\n### ${name} — sample ${s + 1}/${SAMPLES}`);
      const r = await run();
      all[name].push(r);
      console.log(fmt(r));
    }
  }

  console.log('\n\n========== BAKE-OFF AGGREGATE (median over samples) ==========');
  console.log(
    'arm'.padEnd(16),
    'BOTH-pass'.padEnd(10),
    'tscF1st'.padEnd(9),
    'med$'.padEnd(9),
    'medDur'.padEnd(8),
    'medOut'.padEnd(8),
    'medFiles'
  );
  for (const [name, rs] of Object.entries(all)) {
    const bothPass = rs.filter((r) => r.tscPassedFinal && r.vitestPassedFinal).length;
    const tscFirst = rs.filter((r) => r.tscPassedFirst).length;
    console.log(
      name.padEnd(16),
      `${bothPass}/${rs.length}`.padEnd(10),
      `${tscFirst}/${rs.length}`.padEnd(9),
      `$${median(rs.map((r) => r.cost)).toFixed(3)}`.padEnd(9),
      `${median(rs.map((r) => r.durationMs / 1000)).toFixed(0)}s`.padEnd(8),
      String(median(rs.map((r) => meterTotals(r.meter).out))).padEnd(8),
      String(median(rs.map((r) => r.filesWritten)))
    );
  }
  fs.writeFileSync(path.join(ROOT, 'results.json'), JSON.stringify(all, null, 2));
  console.log('\nWrote', path.join(ROOT, 'results.json'));
}

main().catch((e) => {
  console.error('BAKEOFF FAILED:', e);
  process.exit(1);
});
