import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';

interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  createdAt: string;
  sourceFile?: string;
}

interface AgentStats {
  totalAgents: number;
  agentsByType?: Record<string, number>;
  agentsByCapability?: Record<string, number>;
}

export function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [agentTypes, setAgentTypes] = useState<string[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let url = '/agents?limit=200';
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (filterType) url += `&type=${encodeURIComponent(filterType)}`;

      const [data, typesData, statsData] = await Promise.all([
        apiClient.get<Agent[]>(url),
        apiClient.get<{ types: string[] }>('/agents/meta/types'),
        apiClient.get<AgentStats>('/agents/meta/stats'),
      ]);

      setAgents(data || []);
      setAgentTypes(typesData?.types || []);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterType]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      researcher: 'bg-blue-100 text-blue-800',
      architect: 'bg-purple-100 text-purple-800',
      engineer: 'bg-green-100 text-green-800',
      analyst: 'bg-yellow-100 text-yellow-800',
      reviewer: 'bg-pink-100 text-pink-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-600">Loading agents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchAgents}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Agent Registry</h1>
        <p className="text-gray-600">Browse and manage available agents</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 font-medium">Total Agents</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.totalAgents}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 font-medium">Agent Types</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {Object.keys(stats.agentsByType || {}).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600 font-medium">Capabilities</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              {Object.keys(stats.agentsByCapability || {}).length}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400"
            >
              <option value="">All Types</option>
              {agentTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Agent List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {agents.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            No agents found matching your filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-0 divide-y divide-gray-200">
            {agents.map((agent) => (
              <div key={agent.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{agent.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(agent.role)}`}>
                    {agent.role}
                  </span>
                </div>

                {/* Capabilities */}
                {agent.capabilities && agent.capabilities.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-gray-700 mb-2">Capabilities</div>
                    <div className="flex flex-wrap gap-2">
                      {agent.capabilities.slice(0, 5).map((cap, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {cap}
                        </span>
                      ))}
                      {agent.capabilities.length > 5 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          +{agent.capabilities.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                  <div>
                    {agent.sourceFile && (
                      <span>Source: {agent.sourceFile}</span>
                    )}
                  </div>
                  <div>
                    Created: {new Date(agent.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Entry count */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {agents.length} of {stats?.totalAgents || 0} agents
          </div>
        </div>
      </div>
    </div>
  );
}
