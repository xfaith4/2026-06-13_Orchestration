import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { AgentDefinition, AgentIOContract, AgentRouting } from '@unifiedaitoolbox/shared';
import { v4 as uuidv4 } from 'uuid';

export type LoadedAgent = AgentDefinition;

export class AgentLoader {
  private agentsDir: string;
  private loadedAgents: Map<string, LoadedAgent> = new Map();

  constructor(agentsDir: string) {
    this.agentsDir = agentsDir;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  private asStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  }

  // Determine the list of raw agent records described by one parsed file.
  //
  // Document-shape rule (frozen in F2, codifies what F1 made implicit):
  //   - YAML/.yml is always exactly one agent document. It is never scanned
  //     for an internal agent array, because agent fields like `capabilities`
  //     and `constraints` are themselves arrays and would otherwise be
  //     mistaken for the agent list (the F1 bug).
  //   - JSON whose top level is an array is a multi-agent container.
  //   - JSON whose top level is an object with an `agents` key (case
  //     insensitive) holding an array is a multi-agent container.
  //   - Anything else is a single agent document.
  // The old "find the first array-valued key" heuristic is banned: it's the
  // root cause of both the YAML failure and the `*.agent.json` stub failure.
  private resolveAgentList(data: unknown, isYaml: boolean): unknown[] {
    if (isYaml) {
      return [data];
    }
    if (Array.isArray(data)) {
      return data;
    }
    const record = this.asRecord(data);
    const agentsKey = Object.keys(record).find(k => k.toLowerCase() === 'agents');
    if (agentsKey && Array.isArray(record[agentsKey])) {
      return record[agentsKey] as unknown[];
    }
    return [data];
  }

  // Load all agents from the agents directory
  async loadAllAgents(): Promise<LoadedAgent[]> {
    try {
      const files = await fs.readdir(this.agentsDir);
      const agents: LoadedAgent[] = [];

      for (const file of files) {
        const isJson = file.endsWith('.json');
        const isYaml = file.endsWith('.yaml') || file.endsWith('.yml');
        if (!isJson && !isYaml) continue;

        try {
          const filePath = path.join(this.agentsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = isYaml ? yaml.load(content) : JSON.parse(content);
          const agentList = this.resolveAgentList(data, isYaml);

          for (const rawAgentData of agentList) {
            const agentData = this.asRecord(rawAgentData);
            if (typeof agentData.name === 'string' && agentData.name.trim()) {
              const agent = this.normalizeAgent(agentData, file);
              agents.push(agent);
              this.loadedAgents.set(agent.id, agent);
            } else {
              console.warn(`Skipped unnamed agent entry in ${file}`);
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

  // Get agents by role
  getAgentsByType(role: string): LoadedAgent[] {
    return Array.from(this.loadedAgents.values()).filter(
      agent => agent.role === role
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

  // Get distinct agent roles
  getAgentTypes(): string[] {
    const roles = new Set<string>();
    for (const agent of this.loadedAgents.values()) {
      if (agent.role) {
        roles.add(agent.role);
      }
    }
    return Array.from(roles).sort();
  }

  // Get agents by capability
  getAgentsByCapability(capability: string): LoadedAgent[] {
    return Array.from(this.loadedAgents.values()).filter(
      agent =>
        agent.capabilities &&
        agent.capabilities.some(cap => cap.toLowerCase().includes(capability.toLowerCase()))
    );
  }

  // Normalize agent data (YAML single-doc, *.agent.json stub, or JSON
  // container entry) into v2 AgentDefinition. Always produces capabilities
  // and constraints as arrays (never undefined) so consumers never branch
  // on missing fields.
  private normalizeAgent(data: Record<string, unknown>, sourceFile: string): LoadedAgent {
    const capabilities = Array.isArray(data.capabilities)
      ? this.asStringArray(data.capabilities)
      : Array.isArray(data.tools)
        ? this.asStringArray(data.tools)
        : Array.isArray(data.skills)
          ? this.asStringArray(data.skills)
          : [];

    const constraints = Array.isArray(data.constraints)
      ? this.asStringArray(data.constraints)
      : (typeof data.constraints === 'object' && data.constraints !== null)
        ? (() => {
            console.warn(`Coercing object-shaped constraints to string[] in ${sourceFile}`);
            return Object.values(data.constraints as Record<string, unknown>).filter(
              (v): v is string => typeof v === 'string'
            );
          })()
        : [];

    const role = typeof data.role === 'string' ? data.role
      : typeof data.type === 'string' ? data.type
      : 'generic';

    const description = typeof data.description === 'string' ? data.description
      : typeof data.role === 'string' ? data.role
      : typeof data.prompt === 'string' ? data.prompt.split('\n')[0].trim()
      : '';

    const ioContractRaw = this.asRecord(data.io_contract);
    const ioContract: AgentIOContract | undefined =
      ioContractRaw.input_schema || ioContractRaw.output_schema
        ? {
            inputSchema: this.asRecord(ioContractRaw.input_schema),
            outputSchema: this.asRecord(ioContractRaw.output_schema),
          }
        : undefined;

    const routingRaw = this.asRecord(data.routing_hints);
    const routing: AgentRouting | undefined =
      routingRaw.preferred_models || routingRaw.max_tokens
        ? {
            preferredModels: this.asStringArray(routingRaw.preferred_models),
            maxTokens: typeof routingRaw.max_tokens === 'number' ? routingRaw.max_tokens : undefined,
          }
        : undefined;

    return {
      id: typeof data.id === 'string' ? data.id : `agent-${uuidv4()}`,
      name: data.name as string,
      role,
      description,
      prompt: typeof data.prompt === 'string' ? data.prompt : undefined,
      capabilities,
      constraints,
      ioContract,
      routing,
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
      sourceFile,
      loadedAt: new Date().toISOString(),
    };
  }
}
