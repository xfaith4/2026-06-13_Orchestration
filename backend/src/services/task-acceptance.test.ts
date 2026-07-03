import { describe, it, expect } from 'vitest';
import { TaskAcceptanceService } from './task-acceptance.js';

describe('TaskAcceptanceService', () => {
  const service = new TaskAcceptanceService();

  describe('accept', () => {
    it('rejects implementation-like task with prose output only', () => {
      const task = {
        id: 'task-1',
        name: 'Implement API Gateway',
        description: 'Create an HTTP server with routing',
        status: 'in-progress' as const,
      };

      const output = 'I have created an HTTP server with routing capabilities. It listens on port 3000.';

      const result = service.accept(task, output);

      expect(result.accepted).toBe(false);
      expect(result.status).toBe('rejected_no_artifacts');
      expect(result.message).toContain('file artifacts');
      expect(result.artifacts.length).toBe(0);
    });

    it('accepts implementation-like task with ## File blocks', () => {
      const task = {
        id: 'task-1',
        name: 'Implement API Gateway',
        description: 'Create an HTTP server with routing',
        status: 'in-progress' as const,
      };

      const output = `
## File: src/index.ts
\`\`\`typescript
import express from 'express';
const app = express();
app.get('/', (req, res) => res.json({ok: true}));
export default app;
\`\`\`
`;

      const result = service.accept(task, output);

      expect(result.accepted).toBe(true);
      expect(result.status).toBe('accepted');
      expect(result.artifacts.length).toBeGreaterThan(0);
      expect(result.artifacts[0].filePath).toBe('src/index.ts');
    });

    it('accepts documentation task without artifacts', () => {
      const task = {
        id: 'task-doc',
        name: 'Write API documentation',
        description: 'Document all endpoints',
        status: 'in-progress' as const,
      };

      const output = 'Here is the API documentation...';

      const result = service.accept(task, output);

      expect(result.accepted).toBe(true);
      expect(result.status).toBe('accepted');
    });

    it('accepts review task without artifacts', () => {
      const task = {
        id: 'task-review',
        name: 'Review architecture design',
        description: 'Assess the architecture for correctness',
        status: 'in-progress' as const,
        kind: 'review',
      };

      const output = 'The architecture looks good. No issues found.';

      const result = service.accept(task, output);

      expect(result.accepted).toBe(true);
      expect(result.status).toBe('accepted');
    });

    it('rejects task with invalid output format', () => {
      const task = {
        id: 'task-1',
        name: 'Create file',
        description: 'Create a config file',
        status: 'in-progress' as const,
      };

      // Simulate unparseable output
      const output = { invalid: 'structure', circular: undefined };

      const result = service.accept(task, output);

      expect(result.accepted).toBe(false);
      expect(result.status).toBe('rejected_no_artifacts');
    });

    it('detects implementation from task keywords', () => {
      const implementationKeywords = [
        'Create authentication middleware',
        'Build the database layer',
        'Write the test suite',
        'Fix the type errors',
        'Implement the repair loop',
      ];

      for (const taskName of implementationKeywords) {
        const task = {
          id: 'task-1',
          name: taskName,
          description: 'Some description',
          status: 'in-progress' as const,
        };

        const output = 'Just some text without code';

        const result = service.accept(task, output);

        expect(result.accepted).toBe(false);
        expect(result.status).toBe('rejected_no_artifacts');
      }
    });

    it('accepts multiple file artifacts in single output', () => {
      const task = {
        id: 'task-multi',
        name: 'Set up project configuration',
        description: 'Create all config files',
        status: 'in-progress' as const,
      };

      const output = `
## File: package.json
\`\`\`json
{"name": "myapp", "version": "1.0.0"}
\`\`\`

## File: tsconfig.json
\`\`\`json
{"compilerOptions": {"strict": true}}
\`\`\`

## File: .gitignore
\`\`\`
node_modules/
dist/
\`\`\`
`;

      const result = service.accept(task, output);

      expect(result.accepted).toBe(true);
      expect(result.artifacts.length).toBe(3);
      expect(result.artifacts.map(a => a.filePath)).toEqual([
        'package.json',
        'tsconfig.json',
        '.gitignore',
      ]);
    });
  });
});
