import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { Application, DesignPlan } from '../types';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  reviewing: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [designPlans, setDesignPlans] = useState<DesignPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const fetchDesignPlans = useCallback(async () => {
    if (!id) return;
    try {
      const plans = await apiClient.get<DesignPlan[]>(`/design-plans?applicationId=${id}`);
      setDesignPlans(plans ?? []);
    } catch {
      setDesignPlans([]);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const fetchApplication = async () => {
      try {
        setLoading(true);
        const [data] = await Promise.all([
          apiClient.get<Application>(`/applications/${id}`),
          fetchDesignPlans(),
        ]);
        setApplication(data);
      } catch (err) {
        setError('Failed to load application');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [id, fetchDesignPlans]);

  const handleGenerateDesignPlan = async () => {
    if (!application) return;

    try {
      setGenerating(true);
      setGenerateError(null);
      await apiClient.post<DesignPlan>(`/design-plans/generate/${application.id}`, {});
      await fetchDesignPlans();
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate design plan');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error || !application) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-700"
        >
          ← Back
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Application not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="text-blue-600 hover:text-blue-700"
      >
        ← Back
      </button>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{application.name}</h1>
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {application.status}
            </span>
          </div>
        </div>

        <div className="grid gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
            <p className="text-gray-900">{application.description}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Primary Goal</h3>
            <p className="text-gray-900">{application.goal}</p>
          </div>

          {application.requirements && application.requirements.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Requirements</h3>
              <ul className="list-disc pl-5 space-y-1">
                {application.requirements.map((req, i) => (
                  <li key={i} className="text-gray-900">{req}</li>
                ))}
              </ul>
            </div>
          )}

          {application.targetAudience && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Target Audience</h3>
              <p className="text-gray-900">{application.targetAudience}</p>
            </div>
          )}

          {application.constraints && application.constraints.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Constraints</h3>
              <ul className="list-disc pl-5 space-y-1">
                {application.constraints.map((constraint, i) => (
                  <li key={i} className="text-gray-900">{constraint}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-xs text-gray-500">
              Created: {new Date(application.createdAt).toLocaleString()}
              <br />
              Updated: {new Date(application.updatedAt).toLocaleString()}
            </p>
          </div>

          {/* Design Plans section */}
          <div className="border-t pt-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Design Plans</h2>
            {designPlans.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg">
                <p className="text-gray-500 mb-3">No design plans yet.</p>
                {generateError && (
                  <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">{generateError}</p>
                  </div>
                )}
                <button
                  onClick={handleGenerateDesignPlan}
                  disabled={generating}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? 'Generating...' : 'Generate Design Plan'}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {designPlans.map((plan) => (
                  <Link
                    key={plan.id}
                    to={`/design-plans/${plan.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-900">
                      Design Plan — {new Date(plan.createdAt).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[plan.status] ?? 'bg-gray-100 text-gray-800'}`}>
                      {plan.status}
                    </span>
                  </Link>
                ))}
                <div className="pt-2">
                  {generateError && (
                    <div className="mb-2 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">{generateError}</p>
                    </div>
                  )}
                  <button
                    onClick={handleGenerateDesignPlan}
                    disabled={generating}
                    className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    {generating ? 'Generating...' : '+ Generate new Design Plan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
