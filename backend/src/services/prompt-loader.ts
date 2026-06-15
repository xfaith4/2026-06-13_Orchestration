import fs from 'fs/promises';
import path from 'path';
import { PromptDefinition } from '@unifiedaitoolbox/shared';
import { v4 as uuidv4 } from 'uuid';

export interface LoadedPrompt extends PromptDefinition {
  sourceFile?: string;
  loadedAt?: string;
}

export class PromptLoader {
  private promptsDir: string;
  private loadedPrompts: Map<string, LoadedPrompt> = new Map();

  constructor(promptsDir: string) {
    this.promptsDir = promptsDir;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  }

  // Load all prompts from the Prompts directory
  async loadAllPrompts(): Promise<LoadedPrompt[]> {
    try {
      const files = await fs.readdir(this.promptsDir);
      const prompts: LoadedPrompt[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filePath = path.join(this.promptsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);

          // Handle both single prompt and array of prompts
          const promptList = Array.isArray(data) ? data : [data];

          for (const rawPromptData of promptList) {
            const promptData = this.asRecord(rawPromptData);
            if (promptData.content || promptData.prompt) {
              const prompt = this.normalizePrompt(promptData, file);
              prompts.push(prompt);
              this.loadedPrompts.set(prompt.id, prompt);
            }
          }
        } catch (error) {
          console.warn(`Failed to load prompt from ${file}:`, error);
        }
      }

      return prompts;
    } catch (error) {
      console.error('Failed to load prompts directory:', error);
      return [];
    }
  }

  // Get a single prompt by ID
  getPrompt(promptId: string): LoadedPrompt | undefined {
    return this.loadedPrompts.get(promptId);
  }

  // Get all loaded prompts
  getAllPrompts(): LoadedPrompt[] {
    return Array.from(this.loadedPrompts.values());
  }

  // Get prompts by category
  getPromptsByCategory(category: string): LoadedPrompt[] {
    return Array.from(this.loadedPrompts.values()).filter(
      prompt => prompt.category === category
    );
  }

  // Search prompts by name or content
  searchPrompts(query: string): LoadedPrompt[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.loadedPrompts.values()).filter(
      prompt =>
        prompt.name.toLowerCase().includes(lowerQuery) ||
        prompt.description?.toLowerCase().includes(lowerQuery) ||
        prompt.content.toLowerCase().includes(lowerQuery)
    );
  }

  // Get unique categories
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const prompt of this.loadedPrompts.values()) {
      if (prompt.category) {
        categories.add(prompt.category);
      }
    }
    return Array.from(categories).sort();
  }

  // Get prompts by tag
  getPromptsByTag(tag: string): LoadedPrompt[] {
    const lowerTag = tag.toLowerCase();
    return Array.from(this.loadedPrompts.values()).filter(
      prompt =>
        prompt.tags &&
        prompt.tags.some(t => t.toLowerCase() === lowerTag)
    );
  }

  // Extract variables from prompt content (looks for {{variable}} patterns)
  extractVariables(content: string): string[] {
    const regex = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = regex.exec(content)) !== null) {
      variables.add(match[1].trim());
    }

    return Array.from(variables).sort();
  }

  // Normalize prompt data to PromptDefinition format
  private normalizePrompt(data: Record<string, unknown>, sourceFile: string): LoadedPrompt {
    const content = typeof data.content === 'string'
      ? data.content
      : typeof data.prompt === 'string'
        ? data.prompt
        : typeof data.text === 'string'
          ? data.text
          : '';
    const variables = this.extractVariables(content);
    const normalizedVariables = Array.isArray(data.variables)
      ? (data.variables as string[])
      : variables;
    const tags = Array.isArray(data.tags)
      ? (data.tags as string[])
      : Array.isArray(data.keywords)
        ? (data.keywords as string[])
        : [];

    return {
      id: typeof data.id === 'string' ? data.id : `prompt-${uuidv4()}`,
      name: typeof data.name === 'string'
        ? data.name
        : typeof data.title === 'string'
          ? data.title
          : path.basename(sourceFile, '.json'),
      category: typeof data.category === 'string'
        ? data.category
        : typeof data.type === 'string'
          ? data.type
          : 'general',
      content,
      description: typeof data.description === 'string'
        ? data.description
        : typeof data.summary === 'string'
          ? data.summary
          : '',
      tags,
      variables: normalizedVariables,
      version: typeof data.version === 'number' ? data.version : 1,
      parentId: typeof data.parentId === 'string' ? data.parentId : undefined,
      usageCount: typeof data.usageCount === 'number' ? data.usageCount : 0,
      lastUsedAt: typeof data.lastUsedAt === 'string' ? data.lastUsedAt : undefined,
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
      sourceFile,
      loadedAt: new Date().toISOString(),
    };
  }
}
