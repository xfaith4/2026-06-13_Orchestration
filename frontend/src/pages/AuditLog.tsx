import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  changes?: { field: string; oldValue?: unknown; newValue?: unknown }[];
  status: 'success' | 'failure';
  errorMessage?: string;
}

export function AuditLog() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterResourceType, setFilterResourceType] = useState<string>('');
  const [filterUserId, setFilterUserId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filterAction) params.append('action', filterAction);
        if (filterResourceType) params.append('resourceType', filterResourceType);
        if (filterUserId) params.append('userId', filterUserId);
        params.append('limit', '100');

        const data = await apiClient.get<AuditLogEntry[]>(`/audit-logs?${params.toString()}`);
        setLogs(data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [filterAction, filterResourceType, filterUserId]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'failure':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterStatus && log.status !== filterStatus) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-600">Loading audit logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded hover:border-gray-400"
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
            <select
              value={filterResourceType}
              onChange={(e) => setFilterResourceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded hover:border-gray-400"
            >
              <option value="">All Types</option>
              <option value="applications">Applications</option>
              <option value="design-plans">Design Plans</option>
              <option value="roadmaps">Roadmaps</option>
              <option value="runs">Runs</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <input
              type="text"
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              placeholder="Filter by user..."
              className="w-full px-3 py-2 border border-gray-300 rounded hover:border-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded hover:border-gray-400"
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            No audit log entries found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Timestamp</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">User</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Resource</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Details</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900 font-medium">
                      {log.userId}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-900">
                      <div>{log.resourceType}</div>
                      {log.resourceName && (
                        <div className="text-xs text-gray-600">{log.resourceName}</div>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {log.changes && log.changes.length > 0 ? (
                        <div className="space-y-1">
                          {log.changes.slice(0, 2).map((change, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-medium">{change.field}:</span> {JSON.stringify(change.newValue).substring(0, 20)}
                            </div>
                          ))}
                          {log.changes.length > 2 && (
                            <div className="text-xs text-gray-500">+{log.changes.length - 2} more</div>
                          )}
                        </div>
                      ) : (
                        log.errorMessage ? (
                          <span className="text-red-600 text-xs">{log.errorMessage}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span className={getStatusColor(log.status)}>
                        {log.status === 'success' ? '✓' : '✗'} {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        Showing {filteredLogs.length} of {logs.length} entries
      </div>
    </div>
  );
}
