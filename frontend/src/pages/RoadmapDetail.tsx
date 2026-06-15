import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { DesignPlan, Roadmap, Run } from '../types';

export function RoadmapDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [designPlan, setDesignPlan] = useState<DesignPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [runCreating, setRunCreating] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.get<Roadmap>(`/roadmaps/${id}`);
        setRoadmap(data);
        if (data?.designPlanId) {
          try {
            const plan = await apiClient.get<DesignPlan>(`/design-plans/${data.designPlanId}`);
            setDesignPlan(plan);
          } catch {
            // design plan fetch is best-effort
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load roadmap');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRoadmap();
    }
  }, [id]);

  const handleApprove = async () => {
    if (!id) return;
    try {
      setApprovalLoading(true);
      setApprovalError(null);
      const updated = await apiClient.patch<Roadmap>(`/roadmaps/${id}/approve`, {
        approver: 'current-user',
      });
      setRoadmap(updated);
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : 'Failed to approve roadmap');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id || !rejectReason.trim()) return;
    try {
      setApprovalLoading(true);
      setApprovalError(null);
      const updated = await apiClient.patch<Roadmap>(`/roadmaps/${id}/reject`, {
        approver: 'current-user',
        reason: rejectReason.trim(),
      });
      setRoadmap(updated);
      setShowRejectInput(false);
      setRejectReason('');
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : 'Failed to reject roadmap');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleCreateRun = async () => {
    if (!id) return;
    try {
      setRunCreating(true);
      setRunError(null);
      const run = await apiClient.post<Run>(`/runs/from-roadmap/${id}`, {});
      navigate(`/runs/${run.id}`);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Failed to create run');
    } finally {
      setRunCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-gray-600">Loading roadmap...</div>
      </div>
    );
  }

  if (error || !roadmap) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back
          </button>
        </div>
        <div className="text-red-600">
          {error || 'Roadmap not found'}
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTotalHours = () => {
    return roadmap.phases.reduce((total, phase) => total + (phase.estimatedHours || 0), 0);
  };

  const isPendingReview = roadmap.status === 'draft' || roadmap.status === 'reviewing';
  const isApproved = roadmap.status === 'approved';

  return (
    <div className="p-6">
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{roadmap.title}</h1>
          <p className="text-sm text-gray-600 mt-2">{roadmap.description}</p>
          <div className="flex gap-4 mt-4">
            <div>
              <span className="text-xs font-semibold text-gray-600">DESIGN PLAN</span>
              <div className="mt-1">
                <Link
                  to={`/design-plans/${roadmap.designPlanId}`}
                  className="text-blue-600 hover:underline text-sm font-medium"
                >
                  {designPlan
                    ? (designPlan.overview.length > 70 ? designPlan.overview.substring(0, 70) + '…' : designPlan.overview)
                    : roadmap.designPlanId}
                </Link>
              </div>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-600">STATUS</span>
              <div className={`px-3 py-1 rounded text-sm font-medium mt-1 inline-block ${
                roadmap.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                roadmap.status === 'approved' ? 'bg-green-100 text-green-800' :
                roadmap.status === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {roadmap.status.charAt(0).toUpperCase() + roadmap.status.slice(1)}
              </div>
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-600">DURATION</span>
              <div className="text-sm font-semibold text-gray-900 mt-1">{roadmap.estimatedDuration}</div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {roadmap.phases.map((phase) => (
            <div key={phase.id} className="border-l-4 border-blue-500 pl-4 py-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Phase {phase.number}: {phase.name}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">{phase.goal}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{phase.estimatedHours || 0}</div>
                  <p className="text-xs text-gray-600">hours</p>
                </div>
              </div>

              {phase.dependencies.length > 0 && (
                <div className="mb-3 text-sm">
                  <span className="font-semibold text-gray-700">Dependencies:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {phase.dependencies.map((dep, i) => (
                      <span key={i} className="bg-gray-200 text-gray-800 px-2 py-1 rounded text-xs">
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 mt-3">
                {phase.tasks.map((task) => (
                  <div key={task.id} className="bg-gray-50 rounded p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{task.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                        {task.estimatedHours && (
                          <p className="text-xs text-gray-600 mt-2">
                            <span className="font-semibold">{task.estimatedHours}h</span>
                          </p>
                        )}
                        {task.dependencies.length > 0 && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {task.dependencies.map((dep) => (
                              <span key={dep} className="bg-gray-300 text-gray-800 px-1 py-0.5 rounded text-xs">
                                {dep}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`ml-4 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusColor(task.status)}`}>
                        {task.status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-semibold text-gray-700">Total Estimate</span>
              <div className="text-3xl font-bold text-blue-600 mt-1">{getTotalHours()} hours</div>
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-700">Phases</span>
              <div className="text-3xl font-bold text-gray-900 mt-1">{roadmap.phases.length}</div>
            </div>
          </div>
        </div>

        {/* Approval Panel — visible when roadmap is not yet approved or rejected */}
        {isPendingReview && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Review Decision</h3>
            {approvalError && (
              <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{approvalError}</p>
              </div>
            )}
            {!showRejectInput ? (
              <div className="flex gap-3">
                <button
                  onClick={handleApprove}
                  disabled={approvalLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {approvalLoading ? 'Approving...' : 'Approve Roadmap'}
                </button>
                <button
                  onClick={() => setShowRejectInput(true)}
                  disabled={approvalLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for rejection..."
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleReject}
                    disabled={!rejectReason.trim() || approvalLoading}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {approvalLoading ? 'Rejecting...' : 'Confirm Rejection'}
                  </button>
                  <button
                    onClick={() => { setShowRejectInput(false); setRejectReason(''); }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Approved state — show who approved and Create Run button */}
        {isApproved && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="space-y-3">
              {roadmap.approvedBy && (
                <p className="text-sm text-gray-600">
                  ✓ Approved by <span className="font-semibold">{roadmap.approvedBy}</span>
                  {roadmap.approvedAt && (
                    <> on <span className="font-semibold">{new Date(roadmap.approvedAt).toLocaleDateString()}</span></>
                  )}
                </p>
              )}
              {runError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">{runError}</p>
                </div>
              )}
              <button
                onClick={handleCreateRun}
                disabled={runCreating}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {runCreating ? 'Creating Run...' : 'Create Execution Run'}
              </button>
            </div>
          </div>
        )}

        {/* Rejected state */}
        {roadmap.status === 'rejected' && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-semibold text-red-700">✗ Roadmap Rejected</p>
          </div>
        )}
      </div>
    </div>
  );
}
