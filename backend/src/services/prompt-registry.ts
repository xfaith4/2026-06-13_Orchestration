import { PromptDefinition } from '@unifiedaitoolbox/shared';
import { PersistenceService } from './persistence.js';
import { PromptLoader, LoadedPrompt } from './prompt-loader.js';
import { v4 as uuidv4 } from 'uuid';

export interface PromptStats {
  totalPrompts: number;
  promptsByCategory: Record<string, number>;
  promptsByTag: Record<string, number>;
  categories: string[];
  mostUsedPrompts: Array<{ name: string; usageCount: number }>;
}

export class PromptRegistry {
  private loader: PromptLoader;
  private prompts: Map<string, PromptDefinition> = new Map();
  private customPrompts: Map<string, PromptDefinition> = new Map();
  private initialized: boolean = false;

  constructor(
    private persistence: PersistenceService,
    promptsDir: string
  ) {
    this.loader = new PromptLoader(promptsDir);
  }

  // Initialize registry by loading all prompts
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load from legacy Prompts directory
    const loadedPrompts = await this.loader.loadAllPrompts();
    for (const prompt of loadedPrompts) {
      this.prompts.set(prompt.id, prompt);
    }

    // Load custom prompts from persistence if they exist
    try {
      const customPrompts = await this.persistence.list<PromptDefinition>('prompts');
      for (const prompt of customPrompts) {
        this.customPrompts.set(prompt.id, prompt);
      }
    } catch {
      // prompts collection may not exist yet
    }

    this.initialized = true;
  }

  // Get all prompts (loaded + custom)
  getAllPrompts(): PromptDefinition[] {
    return [
      ...Array.from(this.prompts.values()),
      ...Array.from(this.customPrompts.values()),
    ];
  }

  // Get prompt by ID
  getPrompt(promptId: string): PromptDefinition | undefined {
    return this.customPrompts.get(promptId) || this.prompts.get(promptId);
  }

  // Get prompts by category
  getPromptsByCategory(category: string): PromptDefinition[] {
    return this.getAllPrompts().filter(prompt => prompt.category === category);
  }

  // Search prompts
  searchPrompts(query: string): PromptDefinition[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllPrompts().filter(
      prompt =>
        prompt.name.toLowerCase().includes(lowerQuery) ||
        prompt.description?.toLowerCase().includes(lowerQuery) ||
        prompt.content.toLowerCase().includes(lowerQuery)
    );
  }

  // Get unique categories
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const prompt of this.getAllPrompts()) {
      if (prompt.category) {
        categories.add(prompt.category);
      }
    }
    return Array.from(categories).sort();
  }

  // Get prompts by tag
  getPromptsByTag(tag: string): PromptDefinition[] {
    const lowerTag = tag.toLowerCase();
    return this.getAllPrompts().filter(
      prompt =>
        prompt.tags &&
        prompt.tags.some(t => t.toLowerCase() === lowerTag)
    );
  }

  // Get all unique tags
  getAllTags(): string[] {
    const tags = new Set<string>();
    for (const prompt of this.getAllPrompts()) {
      if (prompt.tags) {
        for (const tag of prompt.tags) {
          tags.add(tag);
        }
      }
    }
    return Array.from(tags).sort();
  }

  // Create a new custom prompt
  async createPrompt(
    prompt: Omit<PromptDefinition, 'id' | 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<PromptDefinition> {
    const newPrompt: PromptDefinition = {
      ...prompt,
      id: `custom-${uuidv4()}`,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.persistence.create<PromptDefinition>('prompts', newPrompt);
    this.customPrompts.set(newPrompt.id, newPrompt);

    return newPrompt;
  }

  // Update a prompt
  async updatePrompt(
    promptId: string,
    updates: Partial<PromptDefinition>
  ): Promise<PromptDefinition | null> {
    const prompt = this.customPrompts.get(promptId);
    if (!prompt) {
      return null;
    }

    const updated: PromptDefinition = {
      ...prompt,
      ...updates,
      id: prompt.id,
      createdAt: prompt.createdAt,
      version: (prompt.version || 1) + 1,
      updatedAt: new Date().toISOString(),
    };

    await this.persistence.update<PromptDefinition>('prompts', promptId, updated);
    this.customPrompts.set(promptId, updated);

    return updated;
  }

  // Delete a custom prompt
  async deletePrompt(promptId: string): Promise<boolean> {
    if (!this.customPrompts.has(promptId)) {
      return false;
    }

    await this.persistence.delete('prompts', promptId);
    this.customPrompts.delete(promptId);

    return true;
  }

  // Record prompt usage
  async recordUsage(promptId: string): Promise<void> {
    const prompt = this.getPrompt(promptId);
    if (!prompt) return;

    await this.updatePrompt(promptId, {
      usageCount: (prompt.usageCount || 0) + 1,
      lastUsedAt: new Date().toISOString(),
    });
  }

  // Get prompt statistics
  async getStatistics(): Promise<PromptStats> {
    const allPrompts = this.getAllPrompts();

    // Count by category
    const promptsByCategory: Record<string, number> = {};
    for (const prompt of allPrompts) {
      const category = prompt.category || 'general';
      promptsByCategory[category] = (promptsByCategory[category] || 0) + 1;
    }

    // Count by tag
    const promptsByTag: Record<string, number> = {};
    for (const prompt of allPrompts) {
      if (prompt.tags) {
        for (const tag of prompt.tags) {
          promptsByTag[tag] = (promptsByTag[tag] || 0) + 1;
        }
      }
    }

    // Get most used
    const mostUsedPrompts = allPrompts
      .filter(p => p.usageCount && p.usageCount > 0)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 5)
      .map(p => ({
        name: p.name,
        usageCount: p.usageCount || 0,
      }));

    return {
      totalPrompts: allPrompts.length,
      promptsByCategory,
      promptsByTag,
      categories: this.getCategories(),
      mostUsedPrompts,
    };
  }

  // Reload prompts from filesystem
  async reload(): Promise<void> {
    this.prompts.clear();
    this.initialized = false;
    await this.initialize();
  }
}
