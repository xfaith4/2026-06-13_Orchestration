import { Run } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';

interface CostDistributionProps {
  runs: Run[];
}

export function CostDistribution({ runs }: CostDistributionProps) {
  // Sort runs by cost for distribution visualization
  const sortedByCost = [...runs]
    .sort((a, b) => (a.totalCost?.estimatedCost || 0) - (b.totalCost?.estimatedCost || 0));

  const costs = sortedByCost.map(r => r.totalCost?.estimatedCost || 0);

  // Calculate quartiles
  const sorted = [...costs].sort((a, b) => a - b);
  const n = sorted.length;
  const q1Index = Math.floor(n * 0.25);
  const q2Index = Math.floor(n * 0.5); // median
  const q3Index = Math.floor(n * 0.75);

  const q1 = sorted[q1Index];
  const q2 = sorted[q2Index];
  const q3 = sorted[q3Index];
  const min = sorted[0];
  const max = sorted[n - 1];

  const mean = costs.reduce((a, b) => a + b, 0) / costs.length;

  // Calculate standard deviation
  const variance = costs.reduce((sum, cost) => sum + Math.pow(cost - mean, 2), 0) / costs.length;
  const stdDev = Math.sqrt(variance);

  // Create histogram data (bins)
  const numBins = Math.min(10, Math.ceil(Math.sqrt(costs.length)));
  const binWidth = (max - min) / numBins || 1;

  const histogram: Array<{ range: string; count: number; costs: number[] }> = Array(numBins)
    .fill(0)
    .map((_, i) => ({
      range: `$${(min + i * binWidth).toFixed(1)}-${(min + (i + 1) * binWidth).toFixed(1)}`,
      count: 0,
      costs: [],
    }));

  costs.forEach(cost => {
    const binIndex = Math.min(Math.floor((cost - min) / binWidth), numBins - 1);
    histogram[binIndex].count++;
    histogram[binIndex].costs.push(cost);
  });

  // Create scatter data for cost distribution points
  const scatterData = sortedByCost.map((run, idx) => ({
    x: idx,
    y: run.totalCost?.estimatedCost || 0,
    runId: run.id,
    status: run.status,
  }));

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded p-4">
          <span className="text-xs font-semibold text-blue-600">MEAN</span>
          <div className="text-2xl font-bold text-blue-900 mt-1">${mean.toFixed(2)}</div>
          <p className="text-xs text-blue-600 mt-2">average cost</p>
        </div>

        <div className="bg-purple-50 rounded p-4">
          <span className="text-xs font-semibold text-purple-600">MEDIAN (Q2)</span>
          <div className="text-2xl font-bold text-purple-900 mt-1">${q2.toFixed(2)}</div>
          <p className="text-xs text-purple-600 mt-2">middle value</p>
        </div>

        <div className="bg-green-50 rounded p-4">
          <span className="text-xs font-semibold text-green-600">STD DEV</span>
          <div className="text-2xl font-bold text-green-900 mt-1">${stdDev.toFixed(2)}</div>
          <p className="text-xs text-green-600 mt-2">variability</p>
        </div>

        <div className="bg-orange-50 rounded p-4">
          <span className="text-xs font-semibold text-orange-600">RANGE</span>
          <div className="text-2xl font-bold text-orange-900 mt-1">${(max - min).toFixed(2)}</div>
          <p className="text-xs text-orange-600 mt-2">max - min</p>
        </div>
      </div>

      {/* Quartile Analysis */}
      <div className="bg-white rounded border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Quartile Distribution</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-gray-600 w-16">Min</span>
            <div className="flex-1 bg-gray-100 rounded h-8 flex items-center px-3">
              <span className="text-sm font-semibold text-gray-900">${min.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-gray-600 w-16">Q1 (25%)</span>
            <div className="flex-1 bg-blue-100 rounded h-8 flex items-center px-3">
              <span className="text-sm font-semibold text-blue-900">${q1.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-gray-600 w-16">Q2 (50%)</span>
            <div className="flex-1 bg-purple-100 rounded h-8 flex items-center px-3">
              <span className="text-sm font-semibold text-purple-900">${q2.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-gray-600 w-16">Q3 (75%)</span>
            <div className="flex-1 bg-indigo-100 rounded h-8 flex items-center px-3">
              <span className="text-sm font-semibold text-indigo-900">${q3.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-gray-600 w-16">Max</span>
            <div className="flex-1 bg-red-100 rounded h-8 flex items-center px-3">
              <span className="text-sm font-semibold text-red-900">${max.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Histogram Chart */}
      <div className="bg-gray-50 rounded p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Cost Distribution Histogram</h4>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={histogram}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="range"
              stroke="#6b7280"
              style={{ fontSize: '11px' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#6b7280"
              label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }}
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
              }}
              formatter={(value: number) => value}
            />
            <Bar dataKey="count" fill="#3b82f6" name="Runs in Range" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scatter plot - all runs */}
      <div className="bg-gray-50 rounded p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Cost Distribution Scatter</h4>
        <ResponsiveContainer width="100%" height={250}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="x"
              type="number"
              stroke="#6b7280"
              label={{ value: 'Run Index', position: 'insideBottomRight', offset: -10 }}
              style={{ fontSize: '12px' }}
            />
            <YAxis
              dataKey="y"
              type="number"
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
            <Scatter
              dataKey="y"
              data={scatterData}
              fill="#8b5cf6"
              name="Cost Distribution"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Box plot visualization using bars */}
      <div className="bg-white rounded border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Statistical Summary</h4>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-semibold text-gray-600">TOTAL RUNS</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">{costs.length}</div>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-600">RANGE</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">
                ${min.toFixed(2)} → ${max.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-semibold text-gray-600">VARIANCE</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">${variance.toFixed(2)}</div>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-600">IQR (Q3-Q1)</span>
              <div className="text-2xl font-bold text-gray-900 mt-1">${(q3 - q1).toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
