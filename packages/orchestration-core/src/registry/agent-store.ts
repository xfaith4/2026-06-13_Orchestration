import { AgentDefinition } from '@unifiedaitoolbox/shared';

// Minimal storage interface for custom/persisted agents.
// The application injects a concrete implementation; the package never
// depends on any specific persistence technology.
export interface AgentStore {
  list(): Promise<AgentDefinition[]>;
  create(agent: AgentDefinition): Promise<AgentDefinition>;
  update(id: string, agent: AgentDefinition): Promise<AgentDefinition>;
  delete(id: string): Promise<void>;
}
