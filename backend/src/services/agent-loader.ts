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

  private asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
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

          // Handle single agent, root array, or nested { "Agents": [...] } structure
          let agentList: unknown[];
          if (Array.isArray(data)) {
            agentList = data;
          } else {
            const record = this.asRecord(data);
            const nestedKey = Object.keys(record).find(
              k => Array.isArray(record[k]) && k !== 'ids'
            );
            agentList = nestedKey ? (record[nestedKey] as unknown[]) : [data];
          }

          for (const rawAgentData of agentList) {
            const agentData = this.asRecord(rawAgentData);
            if (agentData.name) {
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
  private normalizeAgent(data: Record<string, unknown>, sourceFile: string): LoadedAgent {
    const capabilities = Array.isArray(data.capabilities)
      ? (data.capabilities as string[])
      : Array.isArray(data.tools)
        ? (data.tools as string[])
        : Array.isArray(data.skills)
          ? (data.skills as string[])
          : [];

    const inputs = this.asRecord(data.inputs ?? data.parameters ?? {});
    const outputs = this.asRecord(data.outputs ?? data.result ?? {});

    return {
      id: typeof data.id === 'string' ? data.id : `agent-${uuidv4()}`,
      name: typeof data.name === 'string' ? data.name : 'Unknown Agent',
      type: typeof data.type === 'string' ? data.type : typeof data.role === 'string' ? data.role : 'generic',
      description: typeof data.description === 'string'
        ? data.description
        : typeof data.prompt === 'string'
          ? data.prompt
          : '',
      capabilities,
      inputs,
      outputs,
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
      sourceFile,
      loadedAt: new Date().toISOString(),
    };
  }
}
