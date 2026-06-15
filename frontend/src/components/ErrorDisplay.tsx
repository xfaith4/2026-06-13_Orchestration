interface ErrorDisplayProps {
  error?: string;
  errorCode?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  retryCount?: number;
  maxRetries?: number;
  isRetrying?: boolean;
}

export function ErrorDisplay({
  error,
  errorCode,
  severity = 'medium',
  retryCount = 0,
  maxRetries = 0,
  isRetrying = false,
}: ErrorDisplayProps) {
  if (!error) return null;

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getSeverityLabel = (sev: string) => {
    switch (sev) {
      case 'critical':
        return '🔴 Critical';
      case 'high':
        return '🟠 High';
      case 'medium':
        return '🟡 Medium';
      case 'low':
        return '🔵 Low';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getSeverityColor(severity)}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            {severity === 'critical' && <span className="text-2xl">⚠️</span>}
            {severity === 'high' && <span className="text-2xl">⚠️</span>}
            {severity === 'medium' && <span className="text-2xl">⚡</span>}
            {severity === 'low' && <span className="text-2xl">ℹ️</span>}
          </div>
          <div className="ml-3">
            <h3 className="font-semibold text-sm">{getSeverityLabel(severity)}</h3>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      </div>

      {errorCode && (
        <div className="mt-3 text-xs font-mono bg-black bg-opacity-5 rounded px-2 py-1 inline-block">
          {errorCode}
        </div>
      )}

      {maxRetries > 0 && (
        <div className="mt-3 text-xs">
          <div className="font-semibold mb-1">
            Retry Progress: {retryCount} / {maxRetries}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                isRetrying ? 'bg-blue-500' : 'bg-green-500'
              } transition-all`}
              style={{ width: `${((retryCount / maxRetries) * 100).toFixed(0)}%` }}
            />
          </div>
          {isRetrying && (
            <div className="mt-2 text-blue-700">
              ⏳ Retrying... Please wait
            </div>
          )}
        </div>
      )}
    </div>
  );
}
