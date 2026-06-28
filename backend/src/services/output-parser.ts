import path from 'path';

export interface FileArtifact {
  filePath: string;
  content: string;
  language?: string;
}

const ROOT_FILE_ALIASES = new Map<string, string>([
  ['package_json', 'package.json'],
  ['package_lock_json', 'package-lock.json'],
  ['tsconfig_json', 'tsconfig.json'],
  ['jest_config', 'jest.config.js'],
  ['jest_config_js', 'jest.config.js'],
  ['nodemon_json', 'nodemon.json'],
  ['gitignore', '.gitignore'],
  ['prettierignore', '.prettierignore'],
  ['prettierrc_json', '.prettierrc.json'],
  ['eslintrc_json', '.eslintrc.json'],
  ['env_example', '.env.example'],
  ['readme_md', 'README.md'],
  ['license_md', 'LICENSE.md'],
  ['dockerfile', 'Dockerfile'],
]);

const ROOT_FILE_NAMES = new Set([
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'jest.config.js',
  'nodemon.json',
  '.gitignore',
  '.prettierignore',
  '.prettierrc.json',
  '.eslintrc.json',
  '.env.example',
  'readme.md',
  'license.md',
  'dockerfile',
]);

const TOP_LEVEL_DIRECTORIES = new Set([
  'src',
  'app',
  'scripts',
  'docs',
  'tests',
  'test',
  'config',
  'data',
  'logs',
  'public',
  'assets',
  'frontend',
  'backend',
  'shared',
  'contracts',
  'agents',
]);

const SOURCE_LIKE_DIRECTORIES = new Set([
  'controllers',
  'services',
  'routes',
  'middleware',
  'utils',
  'repositories',
  'interfaces',
  'entities',
  'schemas',
  'types',
  'components',
  'pages',
  'hooks',
  'layouts',
  'stores',
  'logger',
]);

const EXTENSION_ALIASES: Record<string, string> = {
  ts: 'ts',
  tsx: 'tsx',
  js: 'js',
  jsx: 'jsx',
  json: 'json',
  md: 'md',
  txt: 'txt',
  yaml: 'yaml',
  yml: 'yml',
  css: 'css',
  scss: 'scss',
  html: 'html',
  sql: 'sql',
  py: 'py',
  sh: 'sh',
  ps1: 'ps1',
  bat: 'bat',
  env: 'env',
  toml: 'toml',
};

export class OutputParser {
  parseTaskOutput(raw: unknown): FileArtifact[] {
    const artifacts = new Map<string, FileArtifact>();
    const visited = new Set<object>();

    // Path 1 — JSON-structured output (original behavior).
    const root = this.toStructuredData(raw);
    if (root) {
      this.collectArtifacts(root, artifacts, visited);
    }

    // Path 2 — Markdown file-block extraction.
    // Handles the natural LLM output format:
    //   ## File: src/foo.ts
    //   ```typescript
    //   // code
    //   ```
    // Runs on every string found anywhere in the output object.
    for (const text of this.allStrings(raw)) {
      for (const artifact of this.extractMarkdownFileBlocks(text)) {
        if (!artifacts.has(artifact.filePath)) {
          artifacts.set(artifact.filePath, artifact);
        }
      }
    }

    return Array.from(artifacts.values());
  }

  // Collect every string leaf reachable from `raw` (bounded depth to avoid
  // infinite recursion on unusual structures).
  private allStrings(raw: unknown, depth = 0): string[] {
    if (depth > 8) return [];
    if (typeof raw === 'string') return [raw];
    if (!raw || typeof raw !== 'object') return [];
    const texts: string[] = [];
    for (const v of Object.values(raw as Record<string, unknown>)) {
      texts.push(...this.allStrings(v, depth + 1));
    }
    return texts;
  }

  // Extract files from LLM markdown that uses the ## File: header convention.
  private extractMarkdownFileBlocks(text: string): FileArtifact[] {
    const results: FileArtifact[] = [];
    // Matches: ## File: path/to/file.ext\n```lang\ncontent\n```
    const pattern = /^##\s+[Ff]ile:\s*(\S+)[ \t]*\n```(\w+)?[ \t]*\n([\s\S]*?)^```/gm;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const rawPath = match[1].trim();
      const language = match[2] || undefined;
      const content = match[3];  // preserve internal whitespace exactly
      if (!rawPath || !content.trim()) continue;
      const filePath = this.normalizeFilePath(rawPath);
      if (filePath) {
        results.push({ filePath, content, language });
      }
    }
    return results;
  }

  private toStructuredData(raw: unknown): unknown {
    if (raw == null) {
      return null;
    }

    if (typeof raw === 'string') {
      return this.parseJsonLikeString(raw);
    }

    if (Array.isArray(raw)) {
      return raw;
    }

    if (typeof raw === 'object') {
      const record = raw as Record<string, unknown>;
      const nested = this.tryStructuredChild(record);
      return nested ?? record;
    }

    return null;
  }

  private tryStructuredChild(record: Record<string, unknown>): unknown {
    const candidates = [record.result, record.output, record.payload];

    for (const candidate of candidates) {
      if (candidate == null) {
        continue;
      }

      if (typeof candidate === 'string') {
        const parsed = this.parseJsonLikeString(candidate);
        if (parsed) {
          return parsed;
        }
      }

      if (typeof candidate === 'object') {
        const candidateRecord = candidate as Record<string, unknown>;
        if (typeof candidateRecord.output === 'string') {
          const parsed = this.parseJsonLikeString(candidateRecord.output);
          if (parsed) {
            return parsed;
          }
        }
      }
    }

    return null;
  }

  private parseJsonLikeString(text: string): unknown | null {
    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }

    const candidates = [
      trimmed,
      this.stripCodeFence(trimmed),
      this.extractBracketedJson(trimmed),
    ].filter((candidate): candidate is string => Boolean(candidate));

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch {
        // Try the next candidate form.
      }
    }

    return null;
  }

  private stripCodeFence(text: string): string | null {
    const match = text.match(/^```[\w-]*\n([\s\S]*?)\n```$/);
    return match ? match[1].trim() : null;
  }

  private extractBracketedJson(text: string): string | null {
    const objectStart = text.indexOf('{');
    const objectEnd = text.lastIndexOf('}');
    if (objectStart !== -1 && objectEnd > objectStart) {
      return text.slice(objectStart, objectEnd + 1);
    }

    const arrayStart = text.indexOf('[');
    const arrayEnd = text.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd > arrayStart) {
      return text.slice(arrayStart, arrayEnd + 1);
    }

    return null;
  }

  private collectArtifacts(
    node: unknown,
    artifacts: Map<string, FileArtifact>,
    visited: Set<object>
  ): void {
    if (node == null) {
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        this.collectArtifacts(item, artifacts, visited);
      }
      return;
    }

    if (typeof node !== 'object') {
      return;
    }

    if (visited.has(node)) {
      return;
    }
    visited.add(node);

    const record = node as Record<string, unknown>;

    this.collectFromDeliverableContainer(record.detailed_deliverables, artifacts);
    this.collectFromDeliverableContainer(record.deliverables, artifacts);
    this.collectFromCodeArtifacts(record.code_artifacts, artifacts);

    if (typeof record.content === 'string') {
      const explicitPath =
        typeof record.file_path === 'string'
          ? record.file_path
          : typeof record.filename === 'string'
            ? record.filename
            : null;

      if (explicitPath) {
        this.addArtifact(artifacts, explicitPath, record.content, this.readLanguage(record));
      }
    }

    for (const value of Object.values(record)) {
      this.collectArtifacts(value, artifacts, visited);
    }
  }

  private collectFromDeliverableContainer(
    container: unknown,
    artifacts: Map<string, FileArtifact>
  ): void {
    if (!container || typeof container !== 'object' || Array.isArray(container)) {
      return;
    }

    for (const [key, value] of Object.entries(container)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        continue;
      }

      const record = value as Record<string, unknown>;
      if (typeof record.content !== 'string') {
        continue;
      }

      this.addArtifact(artifacts, this.keyToFilePath(key), record.content, this.readLanguage(record));
    }
  }

  private collectFromCodeArtifacts(
    collection: unknown,
    artifacts: Map<string, FileArtifact>
  ): void {
    if (!Array.isArray(collection)) {
      return;
    }

    for (const item of collection) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        continue;
      }

      const record = item as Record<string, unknown>;
      if (typeof record.content !== 'string') {
        continue;
      }

      const explicitPath =
        typeof record.file_path === 'string'
          ? record.file_path
          : typeof record.filename === 'string'
            ? record.filename
            : null;

      if (!explicitPath) {
        continue;
      }

      this.addArtifact(artifacts, explicitPath, record.content, this.readLanguage(record));
    }
  }

  private addArtifact(
    artifacts: Map<string, FileArtifact>,
    candidatePath: string,
    content: string,
    language?: string
  ): void {
    if (!content.trim()) {
      return;
    }

    const normalizedPath = this.normalizeFilePath(candidatePath);
    if (!normalizedPath) {
      return;
    }

    const existing = artifacts.get(normalizedPath);
    if (existing && existing.content.length >= content.length) {
      return;
    }

    artifacts.set(normalizedPath, {
      filePath: normalizedPath,
      content,
      language,
    });
  }

  private readLanguage(record: Record<string, unknown>): string | undefined {
    if (typeof record.language === 'string') {
      return record.language;
    }
    if (typeof record.framework === 'string') {
      return record.framework;
    }
    return undefined;
  }

  private keyToFilePath(key: string): string {
    const stripped = key.replace(/^\d+_/, '').trim();
    const normalizedKey = stripped.toLowerCase();

    const alias = ROOT_FILE_ALIASES.get(normalizedKey);
    if (alias) {
      return alias;
    }

    const tokensOriginal = stripped.split('_').filter(Boolean);
    if (tokensOriginal.length === 0) {
      return 'artifact.txt';
    }

    const tokensLower = tokensOriginal.map(token => token.toLowerCase());
    const lastToken = tokensLower[tokensLower.length - 1];
    const extension = EXTENSION_ALIASES[lastToken] || 'txt';

    if (EXTENSION_ALIASES[lastToken]) {
      tokensOriginal.pop();
      tokensLower.pop();
    }

    if (tokensOriginal.length === 0) {
      return `artifact.${extension}`;
    }

    if (!TOP_LEVEL_DIRECTORIES.has(tokensLower[0])) {
      tokensOriginal.unshift('src');
      tokensLower.unshift('src');
    }

    const baseName = tokensOriginal.pop() || 'artifact';
    const directories = tokensOriginal;

    return [...directories, `${baseName}.${extension}`].join('/');
  }

  private normalizeFilePath(candidatePath: string): string | null {
    const trimmed = candidatePath.trim();
    if (!trimmed) {
      return null;
    }

    if (!trimmed.includes('/') && !trimmed.includes('\\')) {
      return this.normalizeSimpleName(trimmed);
    }

    return this.normalizeNestedPath(trimmed);
  }

  private normalizeSimpleName(name: string): string | null {
    const lowered = name.toLowerCase();
    if (ROOT_FILE_NAMES.has(lowered)) {
      return name;
    }

    if (/^[A-Z].*Controller\.(ts|tsx|js|jsx)$/u.test(name)) {
      return `src/controllers/${name}`;
    }

    if (/^[A-Z].*Service\.(ts|tsx|js|jsx)$/u.test(name)) {
      return `src/services/${name}`;
    }

    if (/^[A-Z].*Repository\.(ts|tsx|js|jsx)$/u.test(name)) {
      return `src/repositories/${name}`;
    }

    if (/^I[A-Z].*\.(ts|tsx|js|jsx)$/u.test(name)) {
      return `src/interfaces/${name}`;
    }

    if (/^[A-Z][A-Za-z0-9]+\.(ts|tsx)$/u.test(name)) {
      return `src/entities/${name}`;
    }

    if (/\.(ts|tsx|js|jsx|py)$/u.test(name)) {
      return `src/${name}`;
    }

    return name;
  }

  private normalizeNestedPath(candidatePath: string): string | null {
    const normalized = path.posix.normalize(candidatePath.replace(/\\/g, '/').replace(/^\.\//, ''));
    if (
      !normalized ||
      normalized === '.' ||
      normalized.startsWith('../') ||
      normalized.includes('/../') ||
      path.posix.isAbsolute(normalized)
    ) {
      return null;
    }

    const segments = normalized.split('/').filter(Boolean);
    if (segments.some(segment => segment === '..')) {
      return null;
    }

    return segments.join('/');
  }
}
