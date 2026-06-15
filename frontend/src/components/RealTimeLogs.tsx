import { useState, useEffect, useRef } from 'react';
import { ExecutionLog } from '../hooks/useExecutionUpdates';

interface RealTimeLogsProps {
  logs: ExecutionLog[];
  runId: string;
}

export function RealTimeLogs({ logs, runId }: RealTimeLogsProps) {
  const [filter, setFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'debug'>('all');
  const [searchText, setSearchText] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getLogColor = (level: string) => {
    switch (level) {
      case 'info':
        return 'text-blue-600';
      case 'warn':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      case 'debug':
        return 'text-gray-600';
      default:
        return 'text-gray-700';
    }
  };

  const getLogBgColor = (level: string) => {
    switch (level) {
      case 'info':
        return 'bg-blue-50';
      case 'warn':
        return 'bg-yellow-50';
      case 'error':
        return 'bg-red-50';
      case 'debug':
        return 'bg-gray-50';
      default:
        return 'bg-white';
    }
  };

  const getLogBadgeColor = (level: string) => {
    switch (level) {
      case 'info':
        return 'bg-blue-100 text-blue-800';
      case 'warn':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'debug':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesLevel = filter === 'all' || log.level === filter;
    const matchesSearch = searchText === '' ||
      log.message.toLowerCase().includes(searchText.toLowerCase()) ||
      log.source?.toLowerCase().includes(searchText.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const logStats = {
    info: logs.filter(l => l.level === 'info').length,
    warn: logs.filter(l => l.level === 'warn').length,
    error: logs.filter(l => l.level === 'error').length,
    debug: logs.filter(l => l.level === 'debug').length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Controls */}
      <div className="bg-white border-b border-gray-200 p-4 space-y-4">
        {/* Filter buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({logs.length})
          </button>
          <button
            onClick={() => setFilter('info')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              filter === 'info'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Info ({logStats.info})
          </button>
          <button
            onClick={() => setFilter('warn')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              filter === 'warn'
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
            }`}
          >
            Warn ({logStats.warn})
          </button>
          <button
            onClick={() => setFilter('error')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              filter === 'error'
                ? 'bg-red-600 text-white'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            Error ({logStats.error})
          </button>
          <button
            onClick={() => setFilter('debug')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              filter === 'debug'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Debug ({logStats.debug})
          </button>
        </div>

        {/* Search and controls */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              autoScroll
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
          </button>
        </div>

        <div className="text-xs text-gray-600">
          Showing {filteredLogs.length} of {logs.length} logs
        </div>
      </div>

      {/* Logs container */}
      <div className="flex-1 overflow-y-auto bg-gray-50 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {logs.length === 0 ? 'No logs yet' : 'No logs match the current filter'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`p-3 border-l-4 border-transparent hover:bg-white transition-colors ${getLogBgColor(
                  log.level
                )}`}
              >
                <div className="flex gap-3 items-start">
                  <span
                    className={`font-semibold whitespace-nowrap pt-0.5 ${getLogColor(
                      log.level
                    )}`}
                  >
                    [{log.level.toUpperCase()}]
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-900 break-words">{log.message}</div>
                    <div className="flex gap-2 mt-1">
                      <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      {log.source && (
                        <span className={`${getLogBadgeColor(log.level)} px-2 py-0.5 rounded text-xs`}>
                          {log.source}
                        </span>
                      )}
                      {log.phaseId && (
                        <span className="text-gray-500">Phase: {log.phaseId}</span>
                      )}
                      {log.taskId && (
                        <span className="text-gray-500">Task: {log.taskId}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
