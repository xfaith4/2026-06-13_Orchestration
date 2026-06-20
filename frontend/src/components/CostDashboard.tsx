import { Run } from '../types';
import { CostTrend } from './CostTrend';
import { CostDistribution } from './CostDistribution';
import { CostBreakdown } from './CostBreakdown';

interface CostDashboardProps {
  runs: Run[];
  currentRun?: Run;
}

export function CostDashboard({ runs, currentRun }: CostDashboardProps) {
  // Calculate aggregate metrics from all runs
  const totalSpent = runs.reduce((sum, run) => sum + (run.totalCost?.estimatedCost || 0), 0);
  const averageCost = runs.length > 0 ? totalSpent / runs.length : 0;
  const maxCost = runs.length > 0 ? Math.max(...runs.map(r => r.totalCost?.estimatedCost || 0)) : 0;
  const minCost = runs.length > 0 ? Math.min(...runs.map(r => r.totalCost?.estimatedCost || 0)) : 0;

  // Budget tracking
  const budgetLimit = 100; // Default $100 budget
  const budgetUsed = totalSpent;
  const budgetPercent = (budgetUsed / budgetLimit) * 100;
  const budgetStatus =
    budgetPercent >= 90 ? 'critical' : budgetPercent >= 75 ? 'warning' : 'healthy';

  // Token metrics
  const totalTokensIn = runs.reduce((sum, run) => sum + (run.totalCost?.tokenInputs || 0), 0);
  const totalTokensOut = runs.reduce((sum, run) => sum + (run.totalCost?.tokenOutputs || 0), 0);
  const totalTokens = totalTokensIn + totalTokensOut;

  // Cost efficiency
  const costPerToken = totalTokens > 0 ? totalSpent / totalTokens : 0;
  const costPerRun = averageCost;

  const getBudgetColor = () => {
    if (budgetStatus === 'critical') return 'text-red-600';
    if (budgetStatus === 'warning') return 'text-yellow-600';
    return 'text-green-600';
  };

  const getBudgetBgColor = () => {
    if (budgetStatus === 'critical') return 'bg-red-50';
    if (budgetStatus === 'warning') return 'bg-yellow-50';
    return 'bg-green-50';
  };

  const getBudgetBorderColor = () => {
    if (budgetStatus === 'critical') return 'border-red-200';
    if (budgetStatus === 'warning') return 'border-yellow-200';
    return 'border-green-200';
  };

  const getBudgetProgressColor = () => {
    if (budgetStatus === 'critical') return 'bg-red-500';
    if (budgetStatus === 'warning') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Top KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-semibold text-gray-600 mb-2">TOTAL SPENT</div>
          <div className="text-3xl font-bold text-gray-900">${totalSpent.toFixed(2)}</div>
          <p className="text-xs text-gray-500 mt-2">across {runs.length} runs</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-semibold text-gray-600 mb-2">AVERAGE COST</div>
          <div className="text-3xl font-bold text-gray-900">${averageCost.toFixed(2)}</div>
          <p className="text-xs text-gray-500 mt-2">per run</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-semibold text-gray-600 mb-2">COST EFFICIENCY</div>
          <div className="text-3xl font-bold text-gray-900">${costPerToken.toFixed(4)}</div>
          <p className="text-xs text-gray-500 mt-2">per token</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm font-semibold text-gray-600 mb-2">TOTAL TOKENS</div>
          <div className="text-3xl font-bold text-gray-900">{totalTokens.toLocaleString()}</div>
          <p className="text-xs text-gray-500 mt-2">input + output</p>
        </div>
      </div>

      {/* Budget Status */}
      <div className={`rounded-lg border ${getBudgetBgColor()} ${getBudgetBorderColor()} p-6`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className={`text-lg font-semibold ${getBudgetColor()}`}>Budget Status</h3>
            <p className="text-sm text-gray-600 mt-1">
              ${budgetUsed.toFixed(2)} of ${budgetLimit.toFixed(2)} budget used
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${
              budgetStatus === 'critical'
                ? 'bg-red-600'
                : budgetStatus === 'warning'
                ? 'bg-yellow-600'
                : 'bg-green-600'
            }`}
          >
            {budgetStatus === 'critical' ? 'CRITICAL' : budgetStatus === 'warning' ? 'WARNING' : 'HEALTHY'}
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${getBudgetProgressColor()}`}
            style={{ width: `${Math.min(budgetPercent, 100)}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-600">0%</span>
          <span className="text-sm font-semibold text-gray-700">{budgetPercent.toFixed(1)}%</span>
          <span className="text-xs text-gray-600">100%</span>
        </div>
      </div>

      {/* Current Run (if available) */}
      {currentRun && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Run</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded p-4">
              <span className="text-xs font-semibold text-blue-600">RUN COST</span>
              <div className="text-2xl font-bold text-blue-900 mt-1">
                ${currentRun.totalCost?.estimatedCost.toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="bg-purple-50 rounded p-4">
              <span className="text-xs font-semibold text-purple-600">STATUS</span>
              <div className="text-lg font-bold text-purple-900 mt-1">
                {currentRun.status ? currentRun.status.charAt(0).toUpperCase() + currentRun.status.slice(1) : 'Unknown'}
              </div>
            </div>
            <div className="bg-indigo-50 rounded p-4">
              <span className="text-xs font-semibold text-indigo-600">PHASES</span>
              <div className="text-2xl font-bold text-indigo-900 mt-1">{currentRun.phases.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Cost Trends */}
      {runs.length > 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Trends</h3>
          <CostTrend runs={runs} />
        </div>
      )}

      {/* Cost Distribution */}
      {runs.length > 2 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Distribution</h3>
          <CostDistribution runs={runs} />
        </div>
      )}

      {/* Cost Breakdown */}
      {currentRun && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Phase Breakdown</h3>
          <CostBreakdown run={currentRun} />
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <span className="text-xs font-semibold text-gray-600">LOWEST COST RUN</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">${minCost.toFixed(2)}</div>
          <p className="text-xs text-gray-500 mt-2">minimum single run</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <span className="text-xs font-semibold text-gray-600">HIGHEST COST RUN</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">${maxCost.toFixed(2)}</div>
          <p className="text-xs text-gray-500 mt-2">maximum single run</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <span className="text-xs font-semibold text-gray-600">TOTAL RUNS</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">{runs.length}</div>
          <p className="text-xs text-gray-500 mt-2">tracked runs</p>
        </div>
      </div>

      {/* Token Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Usage</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <span className="text-sm font-semibold text-gray-600">Input Tokens</span>
            <div className="text-3xl font-bold text-blue-600 mt-2">{totalTokensIn.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-2">
              {totalTokens > 0 ? ((totalTokensIn / totalTokens) * 100).toFixed(1) : '0.0'}% of total
            </p>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-600">Output Tokens</span>
            <div className="text-3xl font-bold text-purple-600 mt-2">{totalTokensOut.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-2">
              {totalTokens > 0 ? ((totalTokensOut / totalTokens) * 100).toFixed(1) : '0.0'}% of total
            </p>
          </div>
        </div>

        {/* Token ratio bar */}
        <div className="mt-6">
          <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-gray-200">
            <div
              className="bg-blue-500"
              style={{ width: `${totalTokens > 0 ? (totalTokensIn / totalTokens) * 100 : 0}%` }}
            />
            <div
              className="bg-purple-500"
              style={{ width: `${totalTokens > 0 ? (totalTokensOut / totalTokens) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
