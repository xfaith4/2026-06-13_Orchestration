import { Run } from '@unifiedaitoolbox/shared';

interface CostBreakdownProps {
  run: Run;
}

export function CostBreakdown({ run }: CostBreakdownProps) {
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(4)}`;
  };

  if (!run.totalCost) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
        <div className="text-gray-600">No cost data available</div>
      </div>
    );
  }

  const totalCost = run.totalCost;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Cost Breakdown</h3>

      {/* Total Cost Card */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
        <div className="text-sm text-blue-600 font-medium">Total Cost</div>
        <div className="text-3xl font-bold text-blue-900 mt-2">
          {formatCurrency(totalCost.estimatedCost)}
        </div>
        <div className="text-xs text-blue-600 mt-2">
          Input: {totalCost.tokenInputs.toLocaleString()} | Output: {totalCost.tokenOutputs.toLocaleString()} tokens
        </div>
      </div>

      {/* Phase Costs */}
      {run.phaseCosts && run.phaseCosts.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">By Phase</h4>
          <div className="space-y-2">
            {run.phaseCosts.map((phase) => (
              <div key={phase.phaseId} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{phase.phaseName}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {phase.taskCosts.length} task{phase.taskCosts.length !== 1 ? 's' : ''} • {phase.tokenInputs.toLocaleString()} input tokens
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatCurrency(phase.estimatedCost)}</div>
                  <div className="text-xs text-gray-600">
                    {((phase.estimatedCost / totalCost.estimatedCost) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Expand details */}
          <details className="mt-4 pt-4 border-t border-gray-200">
            <summary className="cursor-pointer font-medium text-sm text-gray-700 hover:text-gray-900">
              View task-level details
            </summary>
            <div className="mt-3 space-y-2">
              {run.phaseCosts.map((phase) => (
                <div key={phase.phaseId} className="ml-4">
                  <div className="text-xs font-semibold text-gray-600 mt-2 mb-1">{phase.phaseName}</div>
                  {phase.taskCosts.map((task) => (
                    <div key={task.taskId} className="flex justify-between text-xs py-1 px-2 bg-white rounded">
                      <span className="text-gray-700">{task.taskName}</span>
                      <span className="text-gray-900 font-medium">{formatCurrency(task.estimatedCost)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : (
        <div className="text-gray-600 text-sm">No phase cost data available yet</div>
      )}
    </div>
  );
}
