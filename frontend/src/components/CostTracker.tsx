import { Run, PhaseCost } from '../types';

interface CostTrackerProps {
  run: Run;
}

export function CostTracker({ run }: CostTrackerProps) {
  const totalCost = run.totalCost?.estimatedCost ?? 0;
  const totalTokensIn = run.totalCost?.tokenInputs ?? 0;
  const totalTokensOut = run.totalCost?.tokenOutputs ?? 0;

  const getProgressColor = (cost: number) => {
    if (cost < 1) return 'bg-green-500';
    if (cost < 5) return 'bg-blue-500';
    if (cost < 10) return 'bg-yellow-500';
    if (cost < 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getProgressLabel = (cost: number) => {
    if (cost < 1) return 'LOW';
    if (cost < 5) return 'MODERATE';
    if (cost < 10) return 'MODERATE-HIGH';
    if (cost < 20) return 'HIGH';
    return 'VERY HIGH';
  };

  // Calculate estimated cost by phase if phaseCosts available
  const phaseCosts: PhaseCost[] = run.phaseCosts || [];

  return (
    <div className="space-y-6">
      {/* Overall Cost */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Cost Summary</h3>
            <p className="text-sm text-gray-600 mt-1">Real-time token usage and estimated cost</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${getProgressColor(totalCost)}`}>
            {getProgressLabel(totalCost)}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <span className="text-xs font-semibold text-green-600">TOTAL COST</span>
            <div className="text-3xl font-bold text-green-700 mt-1">
              ${totalCost.toFixed(2)}
            </div>
            <p className="text-xs text-green-600 mt-2">
              {run.totalCost?.currency || 'USD'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <span className="text-xs font-semibold text-blue-600">INPUT TOKENS</span>
            <div className="text-3xl font-bold text-blue-700 mt-1">
              {totalTokensIn.toLocaleString()}
            </div>
            <p className="text-xs text-blue-600 mt-2">tokens consumed</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
            <span className="text-xs font-semibold text-purple-600">OUTPUT TOKENS</span>
            <div className="text-3xl font-bold text-purple-700 mt-1">
              {totalTokensOut.toLocaleString()}
            </div>
            <p className="text-xs text-purple-600 mt-2">tokens generated</p>
          </div>
        </div>

        {/* Cost gauge */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Cost Level</span>
            <span className="text-xs text-gray-600">
              $0 ─────────────────── $20
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(totalCost)}`}
              style={{
                width: `${Math.min((totalCost / 20) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Phase-by-phase breakdown */}
      {phaseCosts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-base font-semibold text-gray-900 mb-4">Cost by Phase</h4>

          <div className="space-y-4">
            {phaseCosts.map((phaseCost: PhaseCost, index: number) => {
              const phasePercentage = totalCost > 0 ? (phaseCost.estimatedCost / totalCost) * 100 : 0;

              return (
                <div key={phaseCost.phaseId}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h5 className="text-sm font-medium text-gray-900">
                        Phase {index + 1}: {phaseCost.phaseName}
                      </h5>
                      <p className="text-xs text-gray-600">
                        {phaseCost.tokenInputs} input · {phaseCost.tokenOutputs} output
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        ${phaseCost.estimatedCost.toFixed(2)}
                      </div>
                      <p className="text-xs text-gray-600">{phasePercentage.toFixed(1)}% of total</p>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${phasePercentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cost warnings */}
      {totalCost > 10 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-yellow-800">High Cost Alert</h3>
              <p className="text-sm text-yellow-700 mt-1">
                This run has cost ${totalCost.toFixed(2)} so far. Consider monitoring token usage
                and optimizing expensive operations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Efficiency metric */}
      {run.phases.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-base font-semibold text-gray-900 mb-4">Efficiency Metrics</h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded p-4">
              <span className="text-xs font-semibold text-gray-600">COST PER PHASE</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                ${(totalCost / run.phases.length).toFixed(2)}
              </div>
              <p className="text-xs text-gray-600 mt-1">average cost per phase</p>
            </div>

            <div className="bg-gray-50 rounded p-4">
              <span className="text-xs font-semibold text-gray-600">COST PER TASK</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                ${(totalCost / Math.max(run.phases.flatMap(p => p.tasks).length, 1)).toFixed(2)}
              </div>
              <p className="text-xs text-gray-600 mt-1">average cost per task</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
