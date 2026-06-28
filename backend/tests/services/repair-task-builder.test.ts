import { describe, it, expect } from 'vitest';
import { buildRepairTasks } from '../../src/services/repair-task-builder.js';
import type { ValidationResult } from '../../src/services/project-validator.js';

// Minimal project root — tsc tasks read files but we control the errors directly,
// so the file-read will simply fail and fileContent will be undefined (valid path).
const PROJECT_ROOT = '/nonexistent/project';

function makeTscResult(errors: Array<{ file?: string; line?: number; message: string }>): ValidationResult {
  return {
    tool: 'tsc',
    passed: false,
    errors: errors.map(e => ({
      type: 'type' as const,
      file: e.file,
      line: e.line,
      message: e.message,
      raw: e.file ? `${e.file}(${e.line},1): error ${e.message}` : e.message,
    })),
    output: '',
    durationMs: 0,
  };
}

describe('buildTscRepairTasks — prompt contract', () => {
  it('places the output format contract before the broken file section', async () => {
    const result = makeTscResult([{
      file: 'src/types/index.ts',
      line: 26,
      message: "TS1005: '=>' expected.",
    }]);
    const tasks = await buildRepairTasks([result], PROJECT_ROOT);

    expect(tasks).toHaveLength(1);
    const { description } = tasks[0];

    const contractPos  = description.indexOf('YOUR ENTIRE RESPONSE MUST BE THIS FILE IN CORRECTED FORM:');
    const brokenPos    = description.indexOf('Current broken file:');

    expect(contractPos).toBeGreaterThan(0);
    expect(brokenPos).toBeGreaterThan(0);
    // Contract must appear before the broken file section
    expect(contractPos).toBeLessThan(brokenPos);
  });

  it('places the ## File: example before the broken file section', async () => {
    const result = makeTscResult([{
      file: 'src/types/index.ts',
      line: 10,
      message: 'TS2304: Cannot find name "Foo".',
    }]);
    const tasks = await buildRepairTasks([result], PROJECT_ROOT);
    const { description } = tasks[0];

    const fileExamplePos = description.indexOf('## File: src/types/index.ts');
    const brokenPos      = description.indexOf('Current broken file:');

    expect(fileExamplePos).toBeGreaterThan(0);
    expect(brokenPos).toBeGreaterThan(0);
    expect(fileExamplePos).toBeLessThan(brokenPos);
  });

  it('contains "NO prose. NO explanation. ONLY the ## File: block."', async () => {
    const result = makeTscResult([{ file: 'src/foo.ts', line: 1, message: 'TS2322: error.' }]);
    const tasks = await buildRepairTasks([result], PROJECT_ROOT);

    expect(tasks[0].description).toContain('NO prose. NO explanation. ONLY the ## File: block.');
  });

  it('does not contain soft wording from the old format instruction', async () => {
    const result = makeTscResult([{ file: 'src/foo.ts', line: 1, message: 'TS2322: error.' }]);
    const tasks = await buildRepairTasks([result], PROJECT_ROOT);
    const { description } = tasks[0];

    expect(description).not.toContain('when your response includes file content');
    expect(description).not.toContain('Correct each error so that');
  });

  it('includes the file path in the description', async () => {
    const result = makeTscResult([{ file: 'src/schemas/index.ts', line: 5, message: 'TS2304: error.' }]);
    const tasks = await buildRepairTasks([result], PROJECT_ROOT);

    expect(tasks[0].description).toContain('src/schemas/index.ts');
  });

  it('includes the error count', async () => {
    const result = makeTscResult([
      { file: 'src/foo.ts', line: 1, message: 'TS1005: error.' },
      { file: 'src/foo.ts', line: 8, message: 'TS2322: error.' },
    ]);
    const tasks = await buildRepairTasks([result], PROJECT_ROOT);

    // One task groups both errors for the same file
    expect(tasks).toHaveLength(1);
    expect(tasks[0].description).toContain('2 TypeScript error(s)');
  });

  it('includes line number and TS diagnostic code for each error', async () => {
    const result = makeTscResult([{ file: 'src/types/index.ts', line: 26, message: "TS1005: '=>' expected." }]);
    const tasks = await buildRepairTasks([result], PROJECT_ROOT);
    const { description } = tasks[0];

    expect(description).toContain('Line 26');
    expect(description).toContain('[TS1005]');
    expect(description).toContain("'=>' expected.");
  });

  it('groups multiple errors for the same file into one task', async () => {
    const result = makeTscResult([
      { file: 'src/a.ts', line: 1, message: 'TS1005: error one.' },
      { file: 'src/a.ts', line: 2, message: 'TS2345: error two.' },
      { file: 'src/b.ts', line: 5, message: 'TS2304: error three.' },
    ]);
    const tasks = await buildRepairTasks([result], PROJECT_ROOT);

    expect(tasks).toHaveLength(2);
    const taskA = tasks.find(t => t.description.includes('src/a.ts'))!;
    expect(taskA.description).toContain('2 TypeScript error(s)');
    expect(taskA.description).toContain('[TS1005]');
    expect(taskA.description).toContain('[TS2345]');
  });

  it('handles no-file errors with the same strict output contract', async () => {
    const result = makeTscResult([{ message: 'TS6059: rootDir is expected.' }]);
    const tasks = await buildRepairTasks([result], PROJECT_ROOT);

    expect(tasks).toHaveLength(1);
    const { description } = tasks[0];
    expect(description).toContain('YOUR ENTIRE RESPONSE MUST BE THE CORRECTED FILE');
    expect(description).toContain('NO prose. NO explanation. ONLY ## File: blocks.');
    expect(description).not.toContain('when your response includes file content');
  });

  it('sets targetFile to the error file path', async () => {
    const result = makeTscResult([{ file: 'src/types/index.ts', line: 1, message: 'TS2304: err.' }]);
    const tasks = await buildRepairTasks([result], PROJECT_ROOT);

    expect(tasks[0].targetFile).toBe('src/types/index.ts');
  });

  it('sets category to type-error', async () => {
    const result = makeTscResult([{ file: 'src/foo.ts', line: 1, message: 'TS2322: err.' }]);
    const tasks = await buildRepairTasks([result], PROJECT_ROOT);

    expect(tasks[0].category).toBe('type-error');
  });
});
