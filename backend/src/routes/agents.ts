import { Router, Request, Response } from 'express';
import { PersistenceService } from '../services/persistence.js';
import type { ValidationService } from '../services/validation.js';
import { AgentRegistry } from '@fuhrhaus/orchestration-core';
import { PersistenceAgentStore } from '../services/persistence-agent-store.js';
import { createResponse, ApiError } from '../types/responses.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const createAgentRoutes = (
  persistence: PersistenceService,
  _validation: ValidationService
) => {
  const router = Router();
  const agentsDir = path.join(__dirname, '..', '..', '..', 'agents');
  const store = new PersistenceAgentStore(persistence);
  const registry = new AgentRegistry(store, agentsDir);
  let registryInitialized = false;

  // Initialize registry on first request
  const ensureInitialized = async () => {
    if (!registryInitialized) {
      await registry.initialize();
      registryInitialized = true;
    }
  };

  // Get all agents
  router.get('/', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { type, search, capability, limit = '100' } = req.query;

      let agents = registry.getAllAgents();

      // Filter by role
      if (type) {
        agents = agents.filter(a => a.role === type);
      }

      // Search by name or description
      if (search) {
        agents = registry.searchAgents(search as string);
      }

      // Filter by capability
      if (capability) {
        agents = registry.getAgentsByCapability(capability as string);
      }

      // Limit results
      const limitNum = parseInt(limit as string, 10);
      agents = agents.slice(0, limitNum);

      res.json(createResponse(agents));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch agents',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get agent by ID
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { id } = req.params;
      const agent = registry.getAgent(id);

      if (!agent) {
        throw new ApiError(404, 'Agent not found');
      }

      res.json(createResponse(agent));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to fetch agent',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Get agents by type
  router.get('/type/:type', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { type } = req.params;
      const agents = registry.getAgentsByType(type);

      res.json(createResponse(agents));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch agents by type',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get agents by capability
  router.get('/capability/:capability', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { capability } = req.params;
      const agents = registry.getAgentsByCapability(capability);

      res.json(createResponse(agents));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch agents by capability',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get agent types
  router.get('/meta/types', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const types = registry.getAgentTypes();
      res.json(createResponse({ types }));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch agent types',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get agent statistics
  router.get('/meta/stats', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const stats = await registry.getStatistics();
      res.json(createResponse(stats));
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch agent statistics',
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Create a new agent
  router.post('/', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { name, type, role, description, capabilities, constraints, prompt } = req.body;
      const agentRole = role || type;

      if (!name || !agentRole) {
        throw new ApiError(400, 'name and role are required');
      }

      const newAgent = await registry.createAgent({
        name,
        role: agentRole,
        description: description || '',
        capabilities: capabilities || [],
        constraints: constraints || [],
        prompt,
      });

      res.status(201).json(createResponse(newAgent));
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Failed to create agent',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Update an agent
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { id } = req.params;
      const updates = req.body;

      const updated = await registry.updateAgent(id, updates);

      if (!updated) {
        throw new ApiError(404, 'Agent not found');
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
          error: error instanceof Error ? error.message : 'Failed to update agent',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Delete an agent
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await ensureInitialized();

      const { id } = req.params;
      const deleted = await registry.deleteAgent(id);

      if (!deleted) {
        throw new ApiError(404, 'Agent not found');
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
          error: error instanceof Error ? error.message : 'Failed to delete agent',
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  return router;
};
