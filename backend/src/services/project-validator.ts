import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

export type ValidationErrorType = 'type' | 'lint' | 'test' | 'build' | 'unknown';

export interface ValidationError {
  type: ValidationErrorType;
  file?: string;
  line?: number;
  column?: number;
  message: string;
  raw: string;
}

export interface ValidationResult {
  tool: string;
  passed: boolean;
  errors: ValidationError[];
  output: string;
  durationMs: number;
}

export interface ProjectValidationReport {
  runId: string;
  projectRoot: string;
  validatedAt: string;
  passed: boolean;
  results: ValidationResult[];
  totalErrors: number;
  summary: string;
}

// Runs real build tools against a project directory and returns structured
// error reports suitable for feeding into the repair loop.
export class ProjectValidator {
  constructor(private projectRoot: string, private runId: string) {}

  async validate(
    tools: ('tsc' | 'vitest' | 'lint')[] = ['tsc', 'vitest'],
    opts: { skipInstall?: boolean } = {}
  ): Promise<ProjectValidationReport> {
    const results: ValidationResult[] = [];

    // Detect project type — bail gracefully if no package.json.
    const hasPackage = await this.fileExists('package.json');
    if (!hasPackage) {
      return this.emptyReport('No package.json found — skipping validation');
    }

    // npm install — skip if the caller already gave up after exhausting repairs.
    if (!opts.skipInstall) {
      const installResult = await this.runNpmInstall();
      results.push(installResult);
    }

    const installPassed = opts.skipInstall || results.find(r => r.tool === 'npm-install')?.passed !== false;
    // Only run code tools if install succeeded (or was skipped).
    if (installPassed) {
      for (const tool of tools) {
        if (tool === 'tsc') {
          const hasTsConfig = await this.fileExists('tsconfig.json');
          if (hasTsConfig) {
            results.push(await this.runTsc());
          }
        } else if (tool === 'vitest') {
          results.push(await this.runVitest());
        } else if (tool === 'lint') {
          results.push(await this.runLint());
        }
      }
    }

    const totalErrors = results.reduce((n, r) => n + r.errors.length, 0);
    const passed = results.every(r => r.passed);

    return {
      runId: this.runId,
      projectRoot: this.projectRoot,
      validatedAt: new Date().toISOString(),
      passed,
      results,
      totalErrors,
      summary: passed
        ? `All ${results.length} tool(s) passed`
        : `${results.filter(r => !r.passed).map(r => r.tool).join(', ')} failed — ${totalErrors} error(s)`,
    };
  }

  private async runNpmInstall(): Promise<ValidationResult> {
    const start = Date.now();
    let output = '';
    let passed = true;

    try {
      output = this.run('npm install 2>&1', 120_000);
    } catch (err: unknown) {
      passed = false;
      output = this.execErrorOutput(err);
    }

    return {
      tool: 'npm-install',
      passed,
      errors: passed ? [] : this.parseNpmInstallErrors(output),
      output,
      durationMs: Date.now() - start,
    };
  }

  private parseNpmInstallErrors(output: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.startsWith('npm error')) {
        errors.push({ type: 'unknown', message: line.replace(/^npm error\s*/, '').trim(), raw: line });
      }
    }
    if (!errors.length && output.trim()) {
      errors.push({ type: 'unknown', message: output.slice(0, 500), raw: output });
    }
    return errors;
  }

  private async runTsc(): Promise<ValidationResult> {
    const start = Date.now();
    let output = '';
    let passed = true;

    try {
      output = this.run('npx tsc --noEmit --pretty false', 30_000);
    } catch (err: unknown) {
      passed = false;
      output = this.execErrorOutput(err);
    }

    return {
      tool: 'tsc',
      passed,
      errors: passed ? [] : this.parseTscErrors(output),
      output,
      durationMs: Date.now() - start,
    };
  }

  private async runVitest(): Promise<ValidationResult> {
    const start = Date.now();
    let output = '';
    let passed = true;

    try {
      // Reporter=verbose gives structured pass/fail per test
      output = this.run('npx vitest run --reporter=verbose 2>&1', 60_000);
    } catch (err: unknown) {
      passed = false;
      output = this.execErrorOutput(err);
    }

    return {
      tool: 'vitest',
      passed,
      errors: passed ? [] : this.parseVitestErrors(output),
      output,
      durationMs: Date.now() - start,
    };
  }

  private async runLint(): Promise<ValidationResult> {
    const start = Date.now();
    let output = '';
    let passed = true;

    try {
      output = this.run('npx eslint . --ext .ts,.tsx,.js,.jsx --format compact 2>&1', 30_000);
    } catch (err: unknown) {
      passed = false;
      output = this.execErrorOutput(err);
    }

    return {
      tool: 'eslint',
      passed,
      errors: passed ? [] : this.parseEslintErrors(output),
      output,
      durationMs: Date.now() - start,
    };
  }

  private run(command: string, timeout: number): string {
    return execSync(command, {
      cwd: this.projectRoot,
      timeout,
      encoding: 'utf-8',
      // Merge stderr into stdout so we capture all output.
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString();
  }

  // On non-zero exit, execSync throws an error whose `.message` is only
  // "Command failed: <cmd>" — the actual tool output (tsc/vitest errors, which
  // go to STDOUT) lives on `.stdout`/`.stderr`. Using `.message` here silently
  // discarded every error detail, leaving the repair loop unable to attribute
  // errors to files. Always prefer the captured streams.
  private execErrorOutput(err: unknown): string {
    const e = err as { stdout?: unknown; stderr?: unknown; message?: string };
    const captured =
      (e?.stdout ? e.stdout.toString() : '') + (e?.stderr ? e.stderr.toString() : '');
    if (captured.trim()) return captured;
    return err instanceof Error ? err.message : String(err);
  }

  // --- Error parsers ---

  // tsc output: "src/foo.ts(12,5): error TS2322: Type 'string' is not assignable..."
  private parseTscErrors(output: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const pattern = /^(.+)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/gm;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(output)) !== null) {
      errors.push({
        type: 'type',
        file: match[1].trim(),
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        message: `${match[5]}: ${match[6].trim()}`,
        raw: match[0],
      });
    }
    // Fall back to raw lines if no structured errors parsed.
    if (!errors.length && output.trim()) {
      errors.push({ type: 'type', message: output.slice(0, 1000), raw: output });
    }
    return errors;
  }

  // vitest output: look for FAIL lines and assertion errors.
  private parseVitestErrors(output: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const failPattern = /^\s*×\s+(.+)$/gm;
    let match: RegExpExecArray | null;
    while ((match = failPattern.exec(output)) !== null) {
      errors.push({
        type: 'test',
        message: match[1].trim(),
        raw: match[0],
      });
    }
    if (!errors.length && output.trim()) {
      errors.push({ type: 'test', message: output.slice(0, 1000), raw: output });
    }
    return errors;
  }

  // eslint compact format: "path/to/file.ts: line N, col M, error  message  (rule)"
  private parseEslintErrors(output: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const pattern = /^(.+):\s+line (\d+),\s+col (\d+),\s+error\s+(.+)\s+\(.+\)$/gm;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(output)) !== null) {
      errors.push({
        type: 'lint',
        file: match[1].trim(),
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        message: match[4].trim(),
        raw: match[0],
      });
    }
    if (!errors.length && output.trim()) {
      errors.push({ type: 'lint', message: output.slice(0, 1000), raw: output });
    }
    return errors;
  }

  private async fileExists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.projectRoot, relativePath));
      return true;
    } catch {
      return false;
    }
  }

  private emptyReport(summary: string): ProjectValidationReport {
    return {
      runId: this.runId,
      projectRoot: this.projectRoot,
      validatedAt: new Date().toISOString(),
      passed: true,
      results: [],
      totalErrors: 0,
      summary,
    };
  }
}
