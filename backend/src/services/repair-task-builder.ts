import fs from 'fs/promises';
import path from 'path';
import type { ValidationError, ValidationResult } from './project-validator.js';

export type RepairCategory = 'package-version' | 'type-error' | 'missing-tests' | 'lint' | 'general';

export interface RepairTask {
  id: string;
  category: RepairCategory;
  // Task name/description fed to the agent-selector for routing
  name: string;
  description: string;
  // The file to fix (if single-file repair)
  targetFile?: string;
  // Full content of the target file so the agent has context
  targetFileContent?: string;
  // The raw error lines this task addresses
  errors: ValidationError[];
}

// Converts structured validation results into targeted repair tasks.
// Grouped by file when possible so the agent gets all errors for one
// file in a single call rather than separate calls per error line.
export async function buildRepairTasks(
  results: ValidationResult[],
  projectRoot: string
): Promise<RepairTask[]> {
  const tasks: RepairTask[] = [];
  let idx = 0;

  for (const result of results) {
    if (result.passed) continue;

    if (result.tool === 'tsc') {
      tasks.push(...(await buildTscRepairTasks(result.errors, projectRoot, idx)));
      idx += result.errors.length;
    } else if (result.tool === 'vitest') {
      tasks.push(...buildVitestRepairTasks(result.errors, projectRoot, idx));
      idx += result.errors.length;
    } else if (result.tool === 'eslint') {
      tasks.push(...(await buildLintRepairTasks(result.errors, projectRoot, idx)));
      idx += result.errors.length;
    } else if (result.tool === 'npm-install') {
      tasks.push(...(await buildNpmRepairTasks(result.errors, projectRoot, idx)));
      idx += result.errors.length;
    }
  }

  return tasks;
}

// One repair task per unique file, containing all errors for that file.
async function buildTscRepairTasks(
  errors: ValidationError[],
  projectRoot: string,
  startIdx: number
): Promise<RepairTask[]> {
  // Group errors by file.
  const byFile = new Map<string, ValidationError[]>();
  const noFile: ValidationError[] = [];

  for (const err of errors) {
    if (err.file) {
      const key = err.file;
      byFile.set(key, [...(byFile.get(key) || []), err]);
    } else {
      noFile.push(err);
    }
  }

  const tasks: RepairTask[] = [];
  let i = startIdx;

  for (const [filePath, fileErrors] of byFile) {
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(projectRoot, filePath);

    let fileContent: string | undefined;
    try {
      fileContent = await fs.readFile(absPath, 'utf-8');
    } catch {
      // File may not exist yet; repair agent will need to create it.
    }

    // Format each error as "Line N [TSxxxx]: message"
    const errorSummary = fileErrors
      .map(e => {
        const codeMatch = e.message.match(/^(TS\d+):\s*([\s\S]*)/);
        const bracket = codeMatch ? `[${codeMatch[1]}]` : '';
        const msg     = codeMatch ? codeMatch[2].trim() : e.message;
        return `  Line ${e.line ?? '?'} ${bracket}: ${msg}`;
      })
      .join('\n');

    const lang = filePath.endsWith('.tsx') ? 'tsx' : 'typescript';

    tasks.push({
      id: `repair-${i++}`,
      category: 'type-error',
      name: `Fix TypeScript errors in ${path.basename(filePath)}`,
      description:
        `The file \`${filePath}\` has ${fileErrors.length} TypeScript error(s):\n\n` +
        errorSummary + '\n\n' +
        `YOUR ENTIRE RESPONSE MUST BE THIS FILE IN CORRECTED FORM:\n\n` +
        `## File: ${filePath}\n` +
        `\`\`\`${lang}\n` +
        `[paste the complete corrected file here]\n` +
        `\`\`\`\n\n` +
        `NO prose. NO explanation. ONLY the ## File: block.\n\n` +
        `Current broken file:\n\n` +
        (fileContent
          ? `\`\`\`${lang}\n${fileContent}\n\`\`\``
          : `(file does not exist yet — write it from scratch)`),
      targetFile: filePath,
      targetFileContent: fileContent,
      errors: fileErrors,
    });
  }

  if (noFile.length) {
    // Format each no-file error the same way for consistency
    const noFileSummary = noFile
      .map(e => {
        const codeMatch = e.message.match(/^(TS\d+):\s*([\s\S]*)/);
        const bracket = codeMatch ? `[${codeMatch[1]}]` : '';
        const msg     = codeMatch ? codeMatch[2].trim() : e.message;
        return `  ${bracket}: ${msg}`;
      })
      .join('\n');

    tasks.push({
      id: `repair-${i}`,
      category: 'type-error',
      name: 'Fix TypeScript compilation errors',
      description:
        `The TypeScript compiler reported ${noFile.length} error(s) with no specific file location:\n\n` +
        noFileSummary + '\n\n' +
        `For each file that needs correcting, YOUR ENTIRE RESPONSE MUST BE THE CORRECTED FILE:\n\n` +
        `## File: src/path/to/file.ts\n` +
        `\`\`\`typescript\n` +
        `[complete corrected file here]\n` +
        `\`\`\`\n\n` +
        `NO prose. NO explanation. ONLY ## File: blocks.`,
      errors: noFile,
    });
  }

  return tasks;
}

function buildVitestRepairTasks(
  errors: ValidationError[],
  projectRoot: string,
  startIdx: number
): RepairTask[] {
  const noTestFiles = errors.some(e =>
    e.raw.includes('No test files found') || e.message.includes('No test files found')
  );

  const fileFormat =
    `\n\nOutput each file using this EXACT format (no prose before or between blocks):\n\n` +
    `## File: tests/types.test.ts\n` +
    `\`\`\`typescript\n` +
    `// complete file content here\n` +
    `\`\`\``;

  if (noTestFiles) {
    return [{
      id: `repair-${startIdx}`,
      category: 'missing-tests',
      name: 'Create Vitest test files',
      description:
        `Vitest found no test files. Test files must match **/*.{test,spec}.{ts,js} ` +
        `and be placed under \`src/\` or \`tests/\`.\n\n` +
        `Write a test suite covering the main exported types and schemas. ` +
        fileFormat,
      errors,
    }];
  }

  return [{
    id: `repair-${startIdx}`,
    category: 'missing-tests',
    name: 'Fix failing Vitest test assertions',
    description:
      `${errors.length} Vitest test(s) failed:\n\n` +
      errors.map(e => '  × ' + e.message).join('\n') + '\n\n' +
      `Fix the failing assertions so all expect() calls pass. ` +
      `Update the test file or the implementation it covers.` +
      fileFormat,
    errors,
  }];
}

async function buildLintRepairTasks(
  errors: ValidationError[],
  projectRoot: string,
  startIdx: number
): Promise<RepairTask[]> {
  const byFile = new Map<string, ValidationError[]>();
  for (const err of errors) {
    if (err.file) {
      byFile.set(err.file, [...(byFile.get(err.file) || []), err]);
    }
  }

  const tasks: RepairTask[] = [];
  let i = startIdx;
  for (const [filePath, fileErrors] of byFile) {
    let fileContent: string | undefined;
    try {
      fileContent = await fs.readFile(path.join(projectRoot, filePath), 'utf-8');
    } catch { /* ignore */ }

    tasks.push({
      id: `repair-${i++}`,
      category: 'lint',
      name: `Fix lint errors in ${path.basename(filePath)}`,
      description:
        `ESLint reported ${fileErrors.length} error(s) in \`${filePath}\`:\n\n` +
        fileErrors.map(e => `  Line ${e.line}: ${e.message}`).join('\n') + '\n\n' +
        `Fix each lint error. Return the corrected file using the ## File: format.\n\n` +
        (fileContent ? `Current content:\n\`\`\`\n${fileContent}\n\`\`\`` : ''),
      targetFile: filePath,
      targetFileContent: fileContent,
      errors: fileErrors,
    });
  }
  return tasks;
}

// npm install failures — read package.json so the agent has content to rewrite.
async function buildNpmRepairTasks(
  errors: ValidationError[],
  projectRoot: string,
  startIdx: number
): Promise<RepairTask[]> {
  let pkgContent: string | undefined;
  try {
    pkgContent = await fs.readFile(path.join(projectRoot, 'package.json'), 'utf-8');
  } catch { /* may not exist yet */ }

  const versionErrors = errors.filter(e =>
    e.raw.includes('notarget') || e.raw.includes('ETARGET') || e.message.includes('notarget')
  );

  const badPackages = versionErrors
    .map(e => {
      const m = e.raw.match(/No matching version found for ([^\s.]+)/);
      return m ? m[1] : null;
    })
    .filter((p): p is string => Boolean(p));

  const desc =
    `npm install failed. ` +
    (badPackages.length
      ? `These package versions do not exist in the registry:\n\n` +
        badPackages.map(p => `  • ${p}`).join('\n') + '\n\n'
      : `Error output:\n\n` + errors.map(e => '  ' + e.message).join('\n') + '\n\n') +
    `Fix package.json so \`npm install\` succeeds. Rules:\n` +
    `- Only use package versions that actually exist on npm\n` +
    `- jsonwebtoken latest stable is ^9.0.0 (9.1.x does not exist)\n` +
    `- Replace any version above the known latest with the closest stable version\n` +
    `- Do not add new packages not already present\n` +
    `- Return the complete corrected package.json using the ## File: format\n\n` +
    (pkgContent
      ? `Current package.json:\n\`\`\`json\n${pkgContent}\n\`\`\``
      : `package.json does not exist yet — create a minimal one with only the necessary deps.`);

  return [{
    id: `repair-${startIdx}`,
    category: 'package-version',
    name: 'Fix invalid npm package versions in package.json',
    description: desc,
    targetFile: 'package.json',
    targetFileContent: pkgContent,
    errors: versionErrors.length ? versionErrors : errors,
  }];
}
