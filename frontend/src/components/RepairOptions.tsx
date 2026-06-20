interface RepairOption {
  strategy: string;
  priority: number;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedDuration?: number;
  instructions?: string[];
  prerequisites?: string[];
}

interface RepairOptionsProps {
  options: RepairOption[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSkipPhase: () => void;
  onEscalate: () => void;
}

const strategyLabels: Record<string, string> = {
  retry: 'Retry',
  repair: 'Auto-Repair',
  escalate: 'Escalate',
  skip: 'Skip',
  manual: 'Manual Intervention',
};

const riskColors: Record<string, string> = {
  low: 'text-green-700 bg-green-50 border-green-200',
  medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  high: 'text-red-700 bg-red-50 border-red-200',
};

function formatDuration(ms?: number): string {
  if (!ms) return '';
  if (ms < 1000) return `~${ms}ms`;
  if (ms < 60000) return `~${Math.round(ms / 1000)}s`;
  return `~${Math.round(ms / 60000)}m`;
}

export function RepairOptions({ options, loading, error, onRetry, onSkipPhase, onEscalate }: RepairOptionsProps) {
  const sorted = [...options].sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Primary action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onRetry}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            'Retry Run'
          )}
        </button>
        <button
          onClick={onSkipPhase}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          Skip Failed Phase
        </button>
        <button
          onClick={onEscalate}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
        >
          Escalate
        </button>
      </div>

      {/* Suggested repair strategies */}
      {sorted.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Suggested Strategies
          </p>
          <div className="space-y-2">
            {sorted.map((opt, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {strategyLabels[opt.strategy] || opt.strategy}
                  </span>
                  <div className="flex items-center gap-2">
                    {opt.estimatedDuration && (
                      <span className="text-xs text-gray-500">{formatDuration(opt.estimatedDuration)}</span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${riskColors[opt.riskLevel] || riskColors.medium}`}>
                      {opt.riskLevel} risk
                    </span>
                    <span className="text-xs text-gray-400">P{opt.priority}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mb-2">{opt.description}</p>
                {opt.instructions && opt.instructions.length > 0 && (
                  <ol className="text-xs text-gray-500 space-y-0.5 list-decimal list-inside">
                    {opt.instructions.map((step, j) => (
                      <li key={j}>{step}</li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
