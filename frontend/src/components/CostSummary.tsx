import { useEffect, useState } from 'react';
import { apiClient } from '../services/api';

interface CostStatistics {
  totalSpent: number;
  averageRunCost: number;
  highestCostRun: { title: string; cost: number } | null;
  lowestCostRun: { title: string; cost: number } | null;
  medianRunCost: number;
  projectedMonthlyCost: number;
}

interface CostTrend {
  runId: string;
  runTitle: string;
  cost: number;
  date: string;
}

interface CostSummaryResponse {
  statistics: CostStatistics;
  trends: CostTrend[];
  runsCount: number;
  completedRunsCount: number;
}

export function CostSummary() {
  const [statistics, setStatistics] = useState<CostStatistics | null>(null);
  const [trends, setTrends] = useState<CostTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCostData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<CostSummaryResponse>('/runs/costs/summary');
        if (data && data.statistics && data.trends) {
          setStatistics(data.statistics);
          setTrends(data.trends);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cost data');
      } finally {
        setLoading(false);
      }
    };

    fetchCostData();
  }, []);

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-600">Loading cost summary...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-600">No cost data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cost Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spent */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-xs font-semibold text-blue-600 uppercase">Total Spent</div>
          <div className="text-2xl font-bold text-blue-900 mt-2">
            {formatCurrency(statistics.totalSpent)}
          </div>
          <div className="text-xs text-blue-600 mt-1">All completed runs</div>
        </div>

        {/* Average Run Cost */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="text-xs font-semibold text-green-600 uppercase">Average Run</div>
          <div className="text-2xl font-bold text-green-900 mt-2">
            {formatCurrency(statistics.averageRunCost)}
          </div>
          <div className="text-xs text-green-600 mt-1">Per run average</div>
        </div>

        {/* Median Run Cost */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="text-xs font-semibold text-purple-600 uppercase">Median Cost</div>
          <div className="text-2xl font-bold text-purple-900 mt-2">
            {formatCurrency(statistics.medianRunCost)}
          </div>
          <div className="text-xs text-purple-600 mt-1">Middle value</div>
        </div>

        {/* Projected Monthly */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
          <div className="text-xs font-semibold text-orange-600 uppercase">Monthly Projection</div>
          <div className="text-2xl font-bold text-orange-900 mt-2">
            {formatCurrency(statistics.projectedMonthlyCost)}
          </div>
          <div className="text-xs text-orange-600 mt-1">Estimated @ 20 runs/month</div>
        </div>
      </div>

      {/* Cost Range */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Range</h3>
        <div className="grid grid-cols-2 gap-4">
          {statistics.highestCostRun && (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <div className="text-sm font-medium text-red-700">Highest Cost Run</div>
              <div className="text-xl font-bold text-red-900 mt-2">
                {formatCurrency(statistics.highestCostRun.cost)}
              </div>
              <div className="text-xs text-red-600 mt-2 truncate">{statistics.highestCostRun.title}</div>
            </div>
          )}
          {statistics.lowestCostRun && (
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <div className="text-sm font-medium text-green-700">Lowest Cost Run</div>
              <div className="text-xl font-bold text-green-900 mt-2">
                {formatCurrency(statistics.lowestCostRun.cost)}
              </div>
              <div className="text-xs text-green-600 mt-2 truncate">{statistics.lowestCostRun.title}</div>
            </div>
          )}
        </div>
      </div>

      {/* Cost Trends */}
      {trends.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Trends</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Run</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-700">Date</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Cost</th>
                </tr>
              </thead>
              <tbody>
                {trends.slice(-10).reverse().map((trend) => (
                  <tr key={trend.runId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-900 font-medium truncate max-w-xs">
                      {trend.runTitle}
                    </td>
                    <td className="py-2 px-3 text-gray-600">
                      {new Date(trend.date).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-900 font-medium">
                      {formatCurrency(trend.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
