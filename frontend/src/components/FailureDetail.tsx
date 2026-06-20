interface FailureClassification {
  failureType: string;
  severity: string;
  errorType: string;
  confidence: number;
  evidence: string[];
}

interface FailedTask {
  taskId: string;
  taskName: string;
  phaseId: string;
  error: string;
  classification: FailureClassification;
}

interface FailureDetailProps {
  runError: string | null;
  overallClassification: FailureClassification | null;
  failedTasks: FailedTask[];
}

const severityColors: Record<string, string> = {
  low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  medium: 'bg-orange-50 border-orange-200 text-orange-800',
  high: 'bg-red-50 border-red-200 text-red-800',
  critical: 'bg-red-100 border-red-400 text-red-900',
};

const failureTypeLabels: Record<string, string> = {
  requirements_missing: 'Missing Requirements',
  schema_invalid: 'Schema Invalid',
  tool_denied: 'Tool/Permission Denied',
  command_failed: 'Command Failed',
  env_missing: 'Environment Missing',
  dependency_unavailable: 'Dependency Unavailable',
  test_failed: 'Test Failed',
  merge_conflict: 'Merge Conflict',
  scope_violation: 'Scope Violation',
  low_confidence: 'Low Confidence',
  human_approval_required: 'Human Approval Required',
};

export function FailureDetail({ runError, overallClassification, failedTasks }: FailureDetailProps) {
  return (
    <div className="space-y-4">
      {/* Overall error */}
      {runError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-800 mb-1">Run Error</p>
          <p className="text-sm text-red-700 font-mono">{runError}</p>
        </div>
      )}

      {/* Overall classification */}
      {overallClassification && (
        <div className={`border rounded-lg p-4 ${severityColors[overallClassification.severity] || severityColors.medium}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">
              {failureTypeLabels[overallClassification.failureType] || overallClassification.failureType}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white bg-opacity-50 font-medium">
              {overallClassification.severity} severity
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 bg-white bg-opacity-40 rounded-full h-1.5">
              <div
                className="bg-current h-1.5 rounded-full"
                style={{ width: `${Math.round(overallClassification.confidence * 100)}%` }}
              />
            </div>
            <span className="text-xs">{Math.round(overallClassification.confidence * 100)}% confidence</span>
          </div>
          {overallClassification.evidence.length > 0 && (
            <ul className="text-xs mt-2 space-y-0.5 list-disc list-inside">
              {overallClassification.evidence.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Failed tasks */}
      {failedTasks.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Failed Tasks ({failedTasks.length})
          </p>
          <div className="space-y-2">
            {failedTasks.map(t => (
              <div key={t.taskId} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{t.taskName}</span>
                  <span className="text-xs text-gray-500 font-mono">{t.taskId}</span>
                </div>
                <p className="text-xs text-red-700 font-mono mb-2 truncate" title={t.error}>
                  {t.error}
                </p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${severityColors[t.classification.severity] || severityColors.medium}`}>
                    {failureTypeLabels[t.classification.failureType] || t.classification.failureType}
                  </span>
                  <span className="text-xs text-gray-500">
                    {Math.round(t.classification.confidence * 100)}% confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
