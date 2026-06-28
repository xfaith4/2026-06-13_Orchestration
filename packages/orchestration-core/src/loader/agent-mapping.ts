import { AgentDefinition, AgentExecutionInput } from '@unifiedaitoolbox/shared';

// Bridges the stored/loaded AgentDefinition (v2) to the per-invocation
// AgentExecutionInput. Kept as one tested function so the definition->execution
// mapping isn't duplicated ad-hoc at call sites.
export function toExecutionInput(
  def: AgentDefinition,
  inputData: Record<string, unknown>,
  overrides: Partial<AgentExecutionInput> = {}
): AgentExecutionInput {
  return {
    agentId: def.id,
    agentName: def.name,
    prompt: def.prompt ?? '',
    inputData,
    inputSchema: def.ioContract?.inputSchema,
    outputSchema: def.ioContract?.outputSchema,
    ...overrides,
  };
}
