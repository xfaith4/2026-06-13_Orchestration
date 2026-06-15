import fs from 'fs/promises';
import path from 'path';
import { AgentDefinition } from '@unifiedaitoolbox/shared';
import { v4 as uuidv4 } from 'uuid';

export interface LoadedAgent extends AgentDefinition {
  sourceFile?: string;
  loadedAt?: string;
}

export class AgentLoader {
  private agentsDir: string;
  private loadedAgents: Map<string, LoadedAgent> = new Map();

  constructor(agentsDir: string) {
    this.agentsDir = agentsDir;
  }

  // Load all agents from the agents directory
  async loadAllAgents(): Promise<LoadedAgent[]> {
    try {
      const files = await fs.readdir(this.agentsDir);
      const agents: LoadedAgent[] = [];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const filePath = path.join(this.agentsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);

          // Handle both single agent and array of agents
          const agentList = Array.isArray(data) ? data : [data];

          for (const agentData of agentList) {
            if (agentData.name && agentData.type) {
              const agent = this.normalizeAgent(agentData, file);
              agents.push(agent);
              this.loadedAgents.set(agent.id, agent);
            }
          }
        } catch (error) {
          console.warn(`Failed to load agent from ${file}:`, error);
        }
      }

      return agents;
    } catch (error) {
      console.error('Failed to load agents directory:', error);
      return [];
    }
  }

  // Get a single agent by ID
  getAgent(agentId: string): LoadedAgent | undefined {
    return this.loadedAgents.get(agentId);
  }

  // Get all loaded agents
  getAllAgents(): LoadedAgent[] {
    return Array.from(this.loadedAgents.values());
  }

  // Get agents by type
  getAgentsByType(type: string): LoadedAgent[] {
    return Array.from(this.loadedAgents.values()).filter(
      agent => agent.type === type
    );
  }

  // Search agents by name
  searchAgents(query: string): LoadedAgent[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.loadedAgents.values()).filter(
      agent =>
        agent.name.toLowerCase().includes(lowerQuery) ||
        agent.description?.toLowerCase().includes(lowerQuery)
    );
  }

  // Get agent types (unique types from all agents)
  getAgentTypes(): string[] {
    const types = new Set<string>();
    for (const agent of this.loadedAgents.values()) {
      if (agent.type) {
        types.add(agent.type);
      }
    }
    return Array.from(types).sort();
  }

  // Get agents by capability
  getAgentsByCapability(capability: string): LoadedAgent[] {
    return Array.from(this.loadedAgents.values()).filter(
      agent =>
        agent.capabilities &&
        agent.capabilities.some(cap => cap.toLowerCase().includes(capability.toLowerCase()))
    );
  }

  // Normalize agent data to AgentDefinition format
  private normalizeAgent(data: any, sourceFile: string): LoadedAgent {
    return {
      id: data.id || `agent-${uuidv4()}`,
      name: data.name || 'Unknown Agent',
      type: data.type || 'generic',
      description: data.description || data.prompt || '',
      capabilities: Array.isArray(data.capabilities)
        ? data.capabilities
        : data.tools || data.skills || [],
      inputs: data.inputs || data.parameters || {},
      outputs: data.outputs || data.result || {},
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      sourceFile,
      loadedAt: new Date().toISOString(),
    };
  }
}
