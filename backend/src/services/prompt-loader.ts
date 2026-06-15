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

          for (const promptData of promptList) {
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
  private normalizePrompt(data: any, sourceFile: string): LoadedPrompt {
    const content = data.content || data.prompt || data.text || '';
    const variables = this.extractVariables(content);

    return {
      id: data.id || `prompt-${uuidv4()}`,
      name: data.name || data.title || path.basename(sourceFile, '.json'),
      category: data.category || data.type || 'general',
      content,
      description: data.description || data.summary || '',
      tags: Array.isArray(data.tags) ? data.tags : (data.keywords || []),
      variables: data.variables || variables,
      version: data.version || 1,
      parentId: data.parentId,
      usageCount: data.usageCount || 0,
      lastUsedAt: data.lastUsedAt,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      sourceFile,
      loadedAt: new Date().toISOString(),
    };
  }
}
