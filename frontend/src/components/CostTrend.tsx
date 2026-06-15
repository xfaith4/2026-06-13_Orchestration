import { Run } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CostTrendProps {
  runs: Run[];
}

export function CostTrend({ runs }: CostTrendProps) {
  // Prepare data for the chart, sorted by creation date
  const sortedRuns = [...runs].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  interface ChartDataPoint {
    name: string;
    cost: number;
    tokens: number;
    date: string;
    trend?: number;
  }

  const chartData: ChartDataPoint[] = sortedRuns.map((run, index) => ({
    name: `Run ${index + 1}`,
    cost: run.totalCost?.estimatedCost || 0,
    tokens: (run.totalCost?.tokenInputs || 0) + (run.totalCost?.tokenOutputs || 0),
    date: new Date(run.createdAt).toLocaleDateString(),
  }));

  // Calculate trend line (simple moving average if enough data)
  const calculateTrendLine = (): ChartDataPoint[] => {
    if (chartData.length < 3) return chartData;

    return chartData.map((point, idx) => {
      if (idx < 1) return { ...point, trend: point.cost };
      if (idx >= chartData.length - 1) return { ...point, trend: point.cost };

      const avgCost = (chartData[idx - 1].cost + chartData[idx].cost + chartData[idx + 1].cost) / 3;
      return { ...point, trend: avgCost };
    });
  };

  const dataWithTrend = calculateTrendLine();

  // Calculate statistics
  const costs = chartData.map(d => d.cost);
  const averageCost = costs.reduce((a, b) => a + b, 0) / costs.length;
  const maxCost = Math.max(...costs);
  const minCost = Math.min(...costs);

  const getCostTrend = () => {
    if (chartData.length < 2) return null;
    const first = chartData[0].cost;
    const last = chartData[chartData.length - 1].cost;
    const diff = last - first;
    const percent = (diff / first) * 100;

    return {
      direction: diff > 0 ? 'up' : 'down',
      percent: Math.abs(percent),
      diff: Math.abs(diff),
    };
  };

  const trend = getCostTrend();

  return (
    <div className="space-y-6">
      {/* Trend indicators */}
      {trend && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded p-4">
            <span className="text-xs font-semibold text-blue-600">AVERAGE COST</span>
            <div className="text-2xl font-bold text-blue-900 mt-1">${averageCost.toFixed(2)}</div>
          </div>

          <div className="bg-green-50 rounded p-4">
            <span className="text-xs font-semibold text-green-600">LOWEST COST</span>
            <div className="text-2xl font-bold text-green-900 mt-1">${minCost.toFixed(2)}</div>
          </div>

          <div className="bg-red-50 rounded p-4">
            <span className="text-xs font-semibold text-red-600">HIGHEST COST</span>
            <div className="text-2xl font-bold text-red-900 mt-1">${maxCost.toFixed(2)}</div>
          </div>

          <div className={`rounded p-4 ${trend.direction === 'up' ? 'bg-orange-50' : 'bg-green-50'}`}>
            <span className={`text-xs font-semibold ${trend.direction === 'up' ? 'text-orange-600' : 'text-green-600'}`}>
              TREND
            </span>
            <div className={`text-2xl font-bold mt-1 ${trend.direction === 'up' ? 'text-orange-900' : 'text-green-900'}`}>
              {trend.direction === 'up' ? '↑' : '↓'} {trend.percent.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Cost trend chart */}
      <div className="bg-gray-50 rounded p-4">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dataWithTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft' }}
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
              }}
              formatter={(value: number) => `$${value.toFixed(2)}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
              name="Run Cost"
            />
            {dataWithTrend.some(d => d.trend !== undefined) && (
              <Line
                type="monotone"
                dataKey="trend"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="Trend (3-point avg)"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Cost range analysis */}
      <div className="bg-white rounded border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Cost Range Analysis</h4>
        <div className="space-y-3">
          {chartData.map((point, idx) => {
            const percentage = ((point.cost - minCost) / (maxCost - minCost)) * 100 || 0;
            const isAboveAverage = point.cost > averageCost;

            return (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-600 w-12">{point.name}</span>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded h-6 relative overflow-hidden">
                    <div
                      className={`h-6 rounded transition-all duration-300 ${
                        isAboveAverage ? 'bg-orange-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-16 text-right">
                  ${point.cost.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Token trend */}
      <div className="bg-gray-50 rounded p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Token Usage Trend</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              label={{ value: 'Tokens', angle: -90, position: 'insideLeft' }}
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              formatter={(value: number) => value.toLocaleString()}
            />
            <Line
              type="monotone"
              dataKey="tokens"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ fill: '#8b5cf6', r: 4 }}
              activeDot={{ r: 6 }}
              name="Total Tokens"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
