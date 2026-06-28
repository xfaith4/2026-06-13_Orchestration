import { AgentDefinition } from '@unifiedaitoolbox/shared';
import type { AgentStore } from '@fuhrhaus/orchestration-core';
import { PersistenceService } from './persistence.js';

// Bridges the application's generic PersistenceService to the package's
// narrow AgentStore interface so AgentRegistry stays env-agnostic.
export class PersistenceAgentStore implements AgentStore {
  constructor(private persistence: PersistenceService) {}

  async list(): Promise<AgentDefinition[]> {
    return this.persistence.list<AgentDefinition>('agents');
  }

  async create(agent: AgentDefinition): Promise<AgentDefinition> {
    return this.persistence.create<AgentDefinition>('agents', agent);
  }

  async update(id: string, agent: AgentDefinition): Promise<AgentDefinition> {
    const result = await this.persistence.update<AgentDefinition>('agents', id, agent);
    if (!result) throw new Error(`Agent ${id} not found`);
    return result;
  }

  async delete(id: string): Promise<void> {
    await this.persistence.delete('agents', id);
  }
}
