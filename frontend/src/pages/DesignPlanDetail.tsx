import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { DesignPlan, Roadmap } from '../types';

export function DesignPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [designPlan, setDesignPlan] = useState<DesignPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [roadmapGenerating, setRoadmapGenerating] = useState(false);
  const [roadmapError, setRoadmapError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDesignPlan = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<DesignPlan>(`/design-plans/${id}`);
        setDesignPlan(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load design plan');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDesignPlan();
    }
  }, [id]);

  const handleMoveToReview = async () => {
    if (!id) return;
    try {
      setApprovalLoading(true);
      setApprovalError(null);
      const updated = await apiClient.patch<DesignPlan>(`/design-plans/${id}/review`, {});
      setDesignPlan(updated);
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : 'Failed to move to review');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    try {
      setApprovalLoading(true);
      setApprovalError(null);
      const updated = await apiClient.patch<DesignPlan>(
        `/design-plans/${id}/decision/approve`,
        { approver: 'current-user' }
      );
      setDesignPlan(updated);
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : 'Failed to approve design plan');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    try {
      setApprovalLoading(true);
      setApprovalError(null);
      const updated = await apiClient.patch<DesignPlan>(
        `/design-plans/${id}/decision/reject`,
        { approver: 'current-user' }
      );
      setDesignPlan(updated);
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : 'Failed to reject design plan');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!id) return;
    try {
      setRoadmapGenerating(true);
      setRoadmapError(null);
      const roadmap = await apiClient.post<Roadmap>(
        `/roadmaps/generate/${id}`,
        {}
      );
      navigate(`/roadmaps/${roadmap.id}`);
    } catch (err) {
      setRoadmapError(err instanceof Error ? err.message : 'Failed to generate roadmap');
    } finally {
      setRoadmapGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-600">Loading design plan...</div>
      </div>
    );
  }

  if (error || !designPlan) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Design Plans
          </button>
        </div>
        <div className="text-red-600">
          {error || 'Design plan not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4">
        <button
          onClick={() => navigate('/design-plans')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Design Plans
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Design Plan</h1>
            <p className="text-sm text-gray-600 mt-1">
              Application ID: <code className="bg-gray-100 px-2 py-1 rounded">{designPlan.applicationId}</code>
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            designPlan.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
            designPlan.status === 'approved' ? 'bg-green-100 text-green-800' :
            designPlan.status === 'rejected' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {designPlan.status ? designPlan.status.charAt(0).toUpperCase() + designPlan.status.slice(1) : 'Draft'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8 text-sm text-gray-600">
          <div>
            <span className="font-semibold">Created:</span> {new Date(designPlan.createdAt).toLocaleDateString()}
          </div>
          <div>
            <span className="font-semibold">Updated:</span> {new Date(designPlan.updatedAt).toLocaleDateString()}
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Overview</h2>
            <p className="text-gray-700 leading-relaxed">{designPlan.overview}</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Architecture</h2>
            <p className="text-gray-700 leading-relaxed">{designPlan.architecture}</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Components</h2>
            <div className="space-y-4">
              {designPlan.components.map((component, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                  <h3 className="font-bold text-gray-900">{component.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{component.description}</p>
                  <p className="text-sm text-gray-700 mt-2">
                    <span className="font-semibold">Responsibility:</span> {component.responsibility}
                  </p>
                  {component.interfaces.length > 0 && (
                    <div className="mt-2">
                      <span className="font-semibold text-sm text-gray-700">Interfaces:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {component.interfaces.map((iface, i) => (
                          <span key={i} className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-sm">
                            {iface}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Tradeoffs</h2>
            <ul className="space-y-2">
              {designPlan.tradeoffs.map((tradeoff, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="text-yellow-600 font-bold mt-1">⚠</span>
                  <span className="text-gray-700">{tradeoff}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Recommendations</h2>
            <ul className="space-y-2">
              {designPlan.recommendations.map((rec, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="text-green-600 font-bold mt-1">✓</span>
                  <span className="text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {approvalError && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{approvalError}</p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-200">
          {designPlan.status === 'draft' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">Ready for review?</p>
              <button
                onClick={handleMoveToReview}
                disabled={approvalLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {approvalLoading ? 'Moving to Review...' : 'Move to Review'}
              </button>
            </div>
          )}

          {designPlan.status === 'reviewing' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">Review complete. Approve or reject?</p>
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={approvalLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {approvalLoading ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={handleReject}
                  disabled={approvalLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {approvalLoading ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          )}

          {(designPlan.status === 'approved' || designPlan.status === 'rejected') && designPlan.approvedBy && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-900">
                {designPlan.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
              </p>
              <p className="text-sm text-gray-600">
                by <span className="font-semibold">{designPlan.approvedBy}</span> on{' '}
                <span className="font-semibold">{new Date(designPlan.approvedAt || '').toLocaleDateString()}</span>
              </p>
              {designPlan.status === 'approved' && (
                <>
                  {roadmapError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">{roadmapError}</p>
                    </div>
                  )}
                  <button
                    onClick={handleGenerateRoadmap}
                    disabled={roadmapGenerating}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {roadmapGenerating ? 'Generating Roadmap...' : 'Generate Roadmap'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
