import { AgentDefinition } from '@unifiedaitoolbox/shared';
import { PersistenceService } from './persistence.js';
import { AgentLoader, LoadedAgent } from './agent-loader.js';
import { v4 as uuidv4 } from 'uuid';

export interface AgentStats {
  totalAgents: number;
  agentsByType: Record<string, number>;
  agentsByCapability: Record<string, number>;
  recentAgents: LoadedAgent[];
  mostUsedAgents: Array<{ name: string; usageCount: number }>;
}

export class AgentRegistry {
  private loader: AgentLoader;
  private agents: Map<string, AgentDefinition> = new Map();
  private customAgents: Map<string, AgentDefinition> = new Map();
  private initialized: boolean = false;

  constructor(
    private persistence: PersistenceService,
    agentsDir: string
  ) {
    this.loader = new AgentLoader(agentsDir);
  }

  // Initialize registry by loading all agents
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Load from legacy agents directory
    const loadedAgents = await this.loader.loadAllAgents();
    for (const agent of loadedAgents) {
      this.agents.set(agent.id, agent);
    }

    // Load custom agents from persistence if they exist
    try {
      const customAgents = await this.persistence.list<AgentDefinition>('agents');
      for (const agent of customAgents) {
        this.customAgents.set(agent.id, agent);
      }
    } catch {
      // agents collection may not exist yet
    }

    this.initialized = true;
  }

  // Get all agents (loaded + custom)
  getAllAgents(): AgentDefinition[] {
    return [
      ...Array.from(this.agents.values()),
      ...Array.from(this.customAgents.values()),
    ];
  }

  // Get agent by ID
  getAgent(agentId: string): AgentDefinition | undefined {
    return this.customAgents.get(agentId) || this.agents.get(agentId);
  }

  // Get agents by role
  getAgentsByType(role: string): AgentDefinition[] {
    return this.getAllAgents().filter(agent => agent.role === role);
  }

  // Search agents
  searchAgents(query: string): AgentDefinition[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllAgents().filter(
      agent =>
        agent.name.toLowerCase().includes(lowerQuery) ||
        agent.description?.toLowerCase().includes(lowerQuery)
    );
  }

  // Get unique agent roles
  getAgentTypes(): string[] {
    const roles = new Set<string>();
    for (const agent of this.getAllAgents()) {
      if (agent.role) {
        roles.add(agent.role);
      }
    }
    return Array.from(roles).sort();
  }

  // Get agents by capability
  getAgentsByCapability(capability: string): AgentDefinition[] {
    const lowerCap = capability.toLowerCase();
    return this.getAllAgents().filter(
      agent =>
        agent.capabilities &&
        agent.capabilities.some(cap => cap.toLowerCase().includes(lowerCap))
    );
  }

  // Create a new custom agent
  async createAgent(agent: Omit<AgentDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentDefinition> {
    const newAgent: AgentDefinition = {
      ...agent,
      id: `custom-${uuidv4()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.persistence.create<AgentDefinition>('agents', newAgent);
    this.customAgents.set(newAgent.id, newAgent);

    return newAgent;
  }

  // Update an agent
  async updateAgent(agentId: string, updates: Partial<AgentDefinition>): Promise<AgentDefinition | null> {
    const agent = this.customAgents.get(agentId);
    if (!agent) {
      return null;
    }

    const updated: AgentDefinition = {
      ...agent,
      ...updates,
      id: agent.id,
      createdAt: agent.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await this.persistence.update<AgentDefinition>('agents', agentId, updated);
    this.customAgents.set(agentId, updated);

    return updated;
  }

  // Delete a custom agent
  async deleteAgent(agentId: string): Promise<boolean> {
    if (!this.customAgents.has(agentId)) {
      return false;
    }

    await this.persistence.delete('agents', agentId);
    this.customAgents.delete(agentId);

    return true;
  }

  // Get agent statistics
  async getStatistics(): Promise<AgentStats> {
    const allAgents = this.getAllAgents();

    // Count by role
    const agentsByType: Record<string, number> = {};
    for (const agent of allAgents) {
      agentsByType[agent.role] = (agentsByType[agent.role] || 0) + 1;
    }

    // Count by capability
    const agentsByCapability: Record<string, number> = {};
    for (const agent of allAgents) {
      if (agent.capabilities) {
        for (const cap of agent.capabilities) {
          agentsByCapability[cap] = (agentsByCapability[cap] || 0) + 1;
        }
      }
    }

    // Get recent agents (custom ones are newer)
    const recentAgents = Array.from(this.customAgents.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      totalAgents: allAgents.length,
      agentsByType,
      agentsByCapability,
      recentAgents,
      mostUsedAgents: [], // Placeholder: would need execution tracking
    };
  }

  // Reload agents from filesystem
  async reload(): Promise<void> {
    this.agents.clear();
    this.initialized = false;
    await this.initialize();
  }
}
