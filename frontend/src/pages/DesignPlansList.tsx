import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { Application, DesignPlan } from '../types';

export function DesignPlansList() {
  const navigate = useNavigate();
  const [designPlans, setDesignPlans] = useState<DesignPlan[]>([]);
  const [applicationNames, setApplicationNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [plans, apps] = await Promise.all([
        apiClient.get<DesignPlan[]>('/design-plans'),
        apiClient.get<Application[]>('/applications'),
      ]);
      setDesignPlans(plans || []);
      const names: Record<string, string> = {};
      for (const app of apps || []) {
        names[app.id] = app.name;
      }
      setApplicationNames(names);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load design plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-600">Loading design plans...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Design Plans</h1>
        <button
          onClick={() => navigate('/applications')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Applications
        </button>
      </div>

      {designPlans.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Design Plans Yet</h3>
          <p className="text-gray-600 mb-4">
            Create an application and generate a design plan to see it here.
          </p>
          <button
            onClick={() => navigate('/applications')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Applications
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {designPlans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => navigate(`/design-plans/${plan.id}`)}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Design Plan for {applicationNames[plan.applicationId] ?? 'Unknown Application'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Application:{' '}
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/applications/${plan.applicationId}`); }}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {applicationNames[plan.applicationId] ?? plan.applicationId}
                    </button>
                  </p>
                  <p className="text-gray-700 mt-3 line-clamp-2">{plan.overview}</p>
                  <div className="flex gap-2 mt-4">
                    <span className={`px-3 py-1 rounded text-sm font-medium ${
                      plan.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      plan.status === 'approved' ? 'bg-green-100 text-green-800' :
                      plan.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {plan.status ? plan.status.charAt(0).toUpperCase() + plan.status.slice(1) : 'Draft'}
                    </span>
                    <span className="text-xs text-gray-600 py-1">
                      {new Date(plan.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {plan.components.length}
                  </div>
                  <p className="text-xs text-gray-600">Components</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
