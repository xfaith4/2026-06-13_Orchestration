import { Router, Request, Response } from 'express';
import { PersistenceService } from '../services/persistence.js';
import type { ValidationService } from '../services/validation.js';
import { PromptRegistry } from '../services/prompt-registry.js';
import { createResponse, ApiError } from '../types/responses.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const createPromptRoutes = (
  persistence: PersistenceService,
  _validation: ValidationService
) => {
  const router = Router();
  const promptsDir = path.join(__dirname, '..', '..', '..', 'Prompts');
  const registry = new PromptRegistry(persistence, promptsDir);
  let registryInitialized = false;

  // Initialize registry on first request
  const ensureInitialized = async () => {
    if (!registryInitialized) {
      await registry.initialize();
      registryInitialized = true;
    }
  };

  // Get all prompts
  router.get('/', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { category, search, tag, limit = '100' } = req.query;

      let prompts = registry.getAllPrompts();

      // Filter by category
      if (category) {
        prompts = prompts.filter(p => p.category === category);
      }

      // Search by name, description, or content
      if (search) {
        prompts = registry.searchPrompts(search as string);
      }

      // Filter by tag
      if (tag) {
        prompts = registry.getPromptsByTag(tag as string);
      }

      // Limit results
      const limitNum = parseInt(limit as string, 10);
      prompts = prompts.slice(0, limitNum);

      res.json(createResponse(prompts));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch prompts',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get prompt by ID
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { id } = req.params;
      const prompt = registry.getPrompt(id);

      if (!prompt) {
        throw new ApiError(404, 'Prompt not found');
      }

      res.json(createResponse(prompt));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to fetch prompt',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Get prompts by category
  router.get('/category/:category', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { category } = req.params;
      const prompts = registry.getPromptsByCategory(category);

      res.json(createResponse(prompts));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch prompts by category',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get prompts by tag
  router.get('/tag/:tag', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { tag } = req.params;
      const prompts = registry.getPromptsByTag(tag);

      res.json(createResponse(prompts));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch prompts by tag',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get categories
  router.get('/meta/categories', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const categories = registry.getCategories();
      res.json(createResponse({ categories }));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch categories',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get tags
  router.get('/meta/tags', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const tags = registry.getAllTags();
      res.json(createResponse({ tags }));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch tags',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get prompt statistics
  router.get('/meta/stats', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const stats = await registry.getStatistics();
      res.json(createResponse(stats));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch prompt statistics',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Create a new prompt
  router.post('/', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { name, content, category, description, tags, variables } = req.body;

      if (!name || !content) {
        throw new ApiError(400, 'name and content are required');
      }

      const newPrompt = await registry.createPrompt({
        name,
        content,
        category: category || 'general',
        description: description || '',
        tags: tags || [],
        variables: variables || [],
      });

      res.status(201).json(createResponse(newPrompt));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to create prompt',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Update a prompt
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { id } = req.params;
      const updates = req.body;

      const updated = await registry.updatePrompt(id, updates);

      if (!updated) {
        throw new ApiError(404, 'Prompt not found');
      }

      res.json(createResponse(updated));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to update prompt',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Delete a prompt
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { id } = req.params;
      const deleted = await registry.deletePrompt(id);

      if (!deleted) {
        throw new ApiError(404, 'Prompt not found');
      }

      res.json(createResponse({ success: true, deletedId: id }));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to delete prompt',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Record prompt usage
  router.patch('/:id/use', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { id } = req.params;
      await registry.recordUsage(id);

      const prompt = registry.getPrompt(id);
      res.json(createResponse(prompt));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to record prompt usage',
        timestamp: new Date().toISOString(),
      });
    }
  });

  return router;
};
