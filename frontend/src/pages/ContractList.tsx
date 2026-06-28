import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';

/* ------------------------------------------------------------------ shared */

const ROLE_COLORS: Record<string, string> = {
  researcher: 'bg-blue-100 text-blue-800',
  architect: 'bg-purple-100 text-purple-800',
  engineer: 'bg-green-100 text-green-800',
  analyst: 'bg-yellow-100 text-yellow-800',
  reviewer: 'bg-pink-100 text-pink-800',
  critic: 'bg-pink-100 text-pink-800',
  synthesizer: 'bg-indigo-100 text-indigo-800',
};
const roleColor = (role: string) => ROLE_COLORS[role?.toLowerCase()] || 'bg-gray-100 text-gray-800';

const hasSchema = (s?: Record<string, unknown>) => !!s && Object.keys(s).length > 0;

function typeLabel(value: unknown): string {
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    const t = typeof v.type === 'string' ? v.type : undefined;
    if (t === 'array') {
      const items = v.items as Record<string, unknown> | undefined;
      const itemType = items && typeof items.type === 'string' ? items.type : 'any';
      return `array<${itemType}>`;
    }
    if (t) return t;
  }
  return 'any';
}

function humanize(s: string): string {
  return s
    .split(/[_.]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Render a JSON-Schema object's top-level properties as a name/type table. */
function SchemaTable({ schema, emptyLabel }: { schema?: Record<string, unknown>; emptyLabel: string }) {
  if (!hasSchema(schema)) {
    return <div className="text-sm text-gray-400 italic">{emptyLabel}</div>;
  }
  const props = schema!.properties as Record<string, unknown> | undefined;
  const required = Array.isArray(schema!.required) ? (schema!.required as string[]) : [];

  if (props && typeof props === 'object' && Object.keys(props).length > 0) {
    return (
      <div className="divide-y divide-gray-100 rounded border border-gray-200 overflow-hidden">
        {Object.entries(props).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between px-3 py-1.5 bg-white">
            <span className="font-mono text-sm text-gray-800">
              {key}
              {required.includes(key) && <span className="text-red-500 ml-0.5">*</span>}
            </span>
            <span className="font-mono text-xs text-gray-500">{typeLabel(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto text-gray-700">
      {JSON.stringify(schema, null, 2)}
    </pre>
  );
}

/* ----------------------------------------------------- agent I/O contracts */

interface IOContract {
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}
interface Routing {
  preferredModels?: string[];
  maxTokens?: number;
}
interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  constraints?: string[];
  ioContract?: IOContract;
  routing?: Routing;
  sourceFile?: string;
}

function AgentContractsView() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [withContractOnly, setWithContractOnly] = useState(false);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let url = '/agents?limit=200';
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (filterRole) url += `&type=${encodeURIComponent(filterRole)}`;
      const [data, typesData] = await Promise.all([
        apiClient.get<Agent[]>(url),
        apiClient.get<{ types: string[] }>('/agents/meta/types'),
      ]);
      setAgents(data || []);
      setRoles(typesData?.types || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterRole]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const definesContract = (a: Agent) =>
    hasSchema(a.ioContract?.inputSchema) || hasSchema(a.ioContract?.outputSchema);
  const visible = withContractOnly ? agents.filter(definesContract) : agents;
  const stats = {
    total: agents.length,
    withIO: agents.filter(definesContract).length,
    withConstraints: agents.filter((a) => (a.constraints?.length ?? 0) > 0).length,
    withRouting: agents.filter((a) => !!a.routing?.preferredModels?.length || !!a.routing?.maxTokens).length,
  };

  if (loading) return <div className="text-gray-600">Loading agent contracts...</div>;
  if (error)
    return (
      <div>
        <div className="text-red-600 mb-4">{error}</div>
        <button onClick={fetchContracts} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Try Again
        </button>
      </div>
    );

  return (
    <div>
      <p className="text-gray-600 mb-6">
        Input/output schemas, constraints, and model routing for each contract-bound agent.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          ['Agents', stats.total],
          ['With I/O Contract', stats.withIO],
          ['With Constraints', stats.withConstraints],
          ['With Routing', stats.withRouting],
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 font-medium">{label}</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400"
            >
              <option value="">All Roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={withContractOnly}
                onChange={(e) => setWithContractOnly(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Only agents with a defined I/O contract
            </label>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
          No contracts found matching your filters.
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((agent) => {
            const hasIO = definesContract(agent);
            const hasConstraints = (agent.constraints?.length ?? 0) > 0;
            const hasRouting = !!agent.routing?.preferredModels?.length || !!agent.routing?.maxTokens;
            const empty = !hasIO && !hasConstraints && !hasRouting;
            return (
              <div key={agent.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="flex items-start justify-between p-5 border-b border-gray-100">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                    {agent.description && <p className="text-sm text-gray-600 mt-1">{agent.description}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${roleColor(agent.role)}`}>
                    {agent.role}
                  </span>
                </div>
                <div className="p-5">
                  {empty ? (
                    <div className="text-sm text-gray-400 italic">No contract defined for this agent.</div>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Input</div>
                          <SchemaTable schema={agent.ioContract?.inputSchema} emptyLabel="Not specified" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Output</div>
                          <SchemaTable schema={agent.ioContract?.outputSchema} emptyLabel="Not specified" />
                        </div>
                      </div>
                      {hasConstraints && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Constraints</div>
                          <ul className="list-disc list-inside space-y-1">
                            {agent.constraints!.map((c, i) => (
                              <li key={i} className="text-sm text-gray-700">{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {hasRouting && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Routing</div>
                          <div className="flex flex-wrap items-center gap-2">
                            {agent.routing?.preferredModels?.map((m) => (
                              <span key={m} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">{m}</span>
                            ))}
                            {agent.routing?.maxTokens && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                max {agent.routing.maxTokens.toLocaleString()} tokens
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {agent.sourceFile && (
                    <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">Source: {agent.sourceFile}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-4 text-sm text-gray-600">Showing {visible.length} of {stats.total} agents</div>
    </div>
  );
}

/* ------------------------------------------------- governance contracts */

interface GovernanceContract {
  id: string;
  name: string;
  group: string;
  kind: string;
  version: string;
  file: string;
  requiredCount: number;
  propertyCount: number;
  schema: Record<string, unknown>;
}

const KIND_COLORS: Record<string, string> = {
  request: 'bg-blue-100 text-blue-800',
  contract: 'bg-green-100 text-green-800',
  schema: 'bg-purple-100 text-purple-800',
  policy: 'bg-amber-100 text-amber-800',
};
const kindColor = (k: string) => KIND_COLORS[k] || 'bg-gray-100 text-gray-800';

function GovernanceContractsView() {
  const [contracts, setContracts] = useState<GovernanceContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<GovernanceContract[]>('/governance-contracts');
      setContracts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load governance contracts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  if (loading) return <div className="text-gray-600">Loading governance contracts...</div>;
  if (error)
    return (
      <div>
        <div className="text-red-600 mb-4">{error}</div>
        <button onClick={fetchContracts} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Try Again
        </button>
      </div>
    );

  const groups = Array.from(new Set(contracts.map((c) => c.group)));
  const kinds = Array.from(new Set(contracts.map((c) => c.kind)));

  return (
    <div>
      <p className="text-gray-600 mb-6">
        Pipeline-level request, contract, artifact, and policy schemas that govern an entire run.
      </p>

      {contracts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-600">
          No governance contracts found in the <code>contracts/</code> directory.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {[
              ['Contracts', contracts.length],
              ['Groups', groups.length],
              ['Kinds', kinds.length],
            ].map(([label, value]) => (
              <div key={label} className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600 font-medium">{label}</div>
                <div className="text-3xl font-bold text-gray-900 mt-2">{value}</div>
              </div>
            ))}
          </div>

          <div className="space-y-8">
            {groups.map((group) => (
              <div key={group}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">{humanize(group)}</h3>
                <div className="space-y-4">
                  {contracts
                    .filter((c) => c.group === group)
                    .map((c) => (
                      <div key={c.id} className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="flex items-start justify-between p-5 border-b border-gray-100">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900">{humanize(c.name)}</h4>
                            <p className="text-xs text-gray-500 mt-1 font-mono">{c.file}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${kindColor(c.kind)}`}>{c.kind}</span>
                            <span className="px-2 py-1 rounded text-xs font-mono bg-gray-100 text-gray-600">{c.version}</span>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="text-xs text-gray-500 mb-2">
                            {c.requiredCount} required · {c.propertyCount} properties
                          </div>
                          <SchemaTable schema={c.schema} emptyLabel="Empty schema" />
                          <details className="mt-3">
                            <summary className="text-sm text-blue-600 cursor-pointer">View raw schema</summary>
                            <pre className="mt-2 text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto text-gray-700">
                              {JSON.stringify(c.schema, null, 2)}
                            </pre>
                          </details>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ container */

type Tab = 'agent' | 'governance';

export function ContractList() {
  const [tab, setTab] = useState<Tab>('agent');

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
      tab === t
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;

  return (
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Contracts</h1>
        <p className="text-gray-600">Agent I/O contracts and pipeline governance contracts.</p>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-2">
          <button className={tabClass('agent')} onClick={() => setTab('agent')}>
            Agent I/O Contracts
          </button>
          <button className={tabClass('governance')} onClick={() => setTab('governance')}>
            Governance Contracts
          </button>
        </nav>
      </div>

      {tab === 'agent' ? <AgentContractsView /> : <GovernanceContractsView />}
    </div>
  );
}
