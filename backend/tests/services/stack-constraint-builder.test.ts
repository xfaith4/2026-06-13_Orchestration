import { describe, it, expect } from 'vitest';
import { StackConstraintBuilder } from '../../src/services/stack-constraint-builder.js';

describe('StackConstraintBuilder', () => {
  it('formats a complete stack constraint block', () => {
    const builder = new StackConstraintBuilder();

    const block = builder.build({
      language: 'TypeScript',
      runtime: 'Node.js >= 18',
      framework: 'Express.js 4.x',
      dependencies: ['express', 'joi', 'winston'],
      fileStructure: ['src/ for source', 'tests/ for tests'],
      disallowedLanguages: ['Python'],
      disallowedTechnologies: ['Prisma'],
      additionalRequirements: ['Use file-based persistence'],
      packageManifest: '{ "name": "demo-app" }',
    });

    expect(block).toContain('## Project Stack (REQUIRED - do not deviate)');
    expect(block).toContain('- Language: TypeScript');
    expect(block).toContain('- Runtime: Node.js >= 18');
    expect(block).toContain('- Dependencies available: express, joi, winston');
    expect(block).toContain('- Do NOT use: Python, Prisma');
    expect(block).toContain('{ "name": "demo-app" }');
  });

  it('uses safe placeholders when constraints are missing', () => {
    const builder = new StackConstraintBuilder();

    const block = builder.build();

    expect(block).toContain('- Language: unspecified');
    expect(block).toContain('- Runtime: unspecified');
    expect(block).toContain('- Do NOT use: unspecified');
  });
});
