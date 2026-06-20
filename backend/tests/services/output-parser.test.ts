import { describe, it, expect } from 'vitest';
import { OutputParser } from '../../src/services/output-parser.js';

describe('OutputParser', () => {
  const parser = new OutputParser();

  it('parses detailed deliverables from fenced JSON output', () => {
    const raw = `\`\`\`json
{
  "detailed_deliverables": {
    "1_package_json": {
      "content": "{\\n  \\"name\\": \\"demo\\"\\n}"
    },
    "5_prettierignore": {
      "content": "node_modules\\ndist\\n"
    },
    "9_src_index_ts": {
      "content": "export const value = 1;\\n"
    },
    "10_utils_logger_ts": {
      "content": "export const logger = console;\\n"
    }
  }
}
\`\`\``;

    const artifacts = parser.parseTaskOutput(raw);
    const filePaths = artifacts.map(artifact => artifact.filePath);

    expect(filePaths).toContain('package.json');
    expect(filePaths).toContain('.prettierignore');
    expect(filePaths).toContain('src/index.ts');
    expect(filePaths).toContain('src/utils/logger.ts');
  });

  it('parses nested code artifacts that use file_path', () => {
    const raw = {
      implementation_deliverable: {
        code_artifacts: [
          {
            file_path: 'src/controllers/roadmapController.ts',
            language: 'typescript',
            content: 'export const createRoadmap = () => null;\n',
          },
        ],
      },
    };

    const artifacts = parser.parseTaskOutput(raw);

    expect(artifacts).toEqual([
      {
        filePath: 'src/controllers/roadmapController.ts',
        content: 'export const createRoadmap = () => null;\n',
        language: 'typescript',
      },
    ]);
  });

  it('infers source directories for direct filenames', () => {
    const raw = {
      filename: 'UserController.ts',
      content: 'export class UserController {}\n',
      language: 'typescript',
    };

    const artifacts = parser.parseTaskOutput(raw);

    expect(artifacts[0]?.filePath).toBe('src/controllers/UserController.ts');
  });

  it('rejects unsafe traversal paths', () => {
    const raw = {
      code_artifacts: [
        {
          file_path: '../outside.js',
          content: 'console.log("unsafe");\n',
        },
      ],
    };

    const artifacts = parser.parseTaskOutput(raw);

    expect(artifacts).toHaveLength(0);
  });
});
