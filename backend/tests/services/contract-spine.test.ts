import { describe, it, expect } from 'vitest';
import {
  extractDeclarations,
  findContractModule,
  checkCoherence,
  type ProjectFile,
} from '../../src/services/contract-spine.js';

describe('extractDeclarations', () => {
  it('finds exported and local type declarations', () => {
    const decls = extractDeclarations(`
      export interface Run { id: string }
      export type Status = 'a' | 'b';
      export enum PhaseStatus { Pending, Done }
      type Local = number;
      class Foo {}
    `);
    const names = decls.map(d => d.name).sort();
    expect(names).toEqual(['Foo', 'Local', 'PhaseStatus', 'Run', 'Status']);
  });

  it('ignores declarations inside block comments and template/string literals', () => {
    const decls = extractDeclarations([
      '/* export interface CommentedOut {} */',
      'const codegen = `export interface GeneratedDTO {}`;',
      'export interface Real { id: string }',
    ].join('\n'));
    expect(decls.map(d => d.name)).toEqual(['Real']);
  });
});

describe('findContractModule', () => {
  it('prefers a contract-named module', () => {
    const files: ProjectFile[] = [
      { path: 'src/foo.ts', content: 'export interface A {}\nexport interface B {}' },
      { path: 'src/contracts.ts', content: 'export interface X {}\nexport type Y = string' },
    ];
    expect(findContractModule(files)?.path).toBe('src/contracts.ts');
  });

  it('falls back to the file with the most types (>=2)', () => {
    const files: ProjectFile[] = [
      { path: 'src/a.ts', content: 'export interface A {}' },
      { path: 'src/b.ts', content: 'export interface B {}\nexport type C = string\nexport enum D { x }' },
    ];
    expect(findContractModule(files)?.path).toBe('src/b.ts');
  });

  it('returns null when nothing qualifies', () => {
    expect(findContractModule([{ path: 'src/a.ts', content: 'export const x = 1' }])).toBeNull();
  });
});

describe('checkCoherence (anti-drift)', () => {
  it('reports coherent when each type is declared once', () => {
    const report = checkCoherence('r1', [
      { path: 'src/contracts.ts', content: 'export enum PhaseStatus { Pending }\nexport interface Run { id: string }' },
      { path: 'src/runDashboard.ts', content: "import { Run, PhaseStatus } from './contracts'\nexport function f(r: Run) { return r.id }" },
    ]);
    expect(report.status).toBe('coherent');
    expect(report.drift).toHaveLength(0);
    expect(report.contractModule).toBe('src/contracts.ts');
    expect(report.contractSymbols.sort()).toEqual(['PhaseStatus', 'Run']);
  });

  it('detects duplicate-definition drift (the bake-off PhaseStatus failure)', () => {
    const report = checkCoherence('r1', [
      { path: 'src/contracts.ts', content: 'export enum PhaseStatus { Pending }' },
      { path: 'src/roadmapStateManager.ts', content: 'export enum PhaseStatus { Pending, Done }' },
      { path: 'src/runDashboard.ts', content: 'export enum PhaseStatus { A, B }' },
    ]);
    expect(report.status).toBe('drift');
    expect(report.drift).toHaveLength(1);
    expect(report.drift[0].symbol).toBe('PhaseStatus');
    expect(report.drift[0].files).toHaveLength(3);
  });

  it('counts a symbol declared across multiple files as drift even without a contract module', () => {
    const report = checkCoherence('r1', [
      { path: 'src/a.ts', content: 'export interface Idea { title: string }' },
      { path: 'src/b.ts', content: 'export interface Idea { name: string }' },
    ]);
    expect(report.status).toBe('drift');
    expect(report.drift[0].symbol).toBe('Idea');
  });

  it('does NOT flag a type re-referenced in a test file as drift', () => {
    const report = checkCoherence('r1', [
      { path: 'src/idea.ts', content: 'export interface Idea { title: string }' },
      { path: 'src/idea.test.ts', content: 'interface Idea { title: string }\n// local mock' },
    ]);
    expect(report.status).toBe('coherent');
  });

  it('does NOT flag duplicate class names as drift (local impls, not shared types)', () => {
    const report = checkCoherence('r1', [
      { path: 'src/a.ts', content: 'export class Helper {}' },
      { path: 'src/b.ts', content: 'export class Helper {}' },
    ]);
    expect(report.status).toBe('coherent');
  });
});
