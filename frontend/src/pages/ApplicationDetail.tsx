import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';

interface Application {
  id: string;
  name: string;
  description: string;
  goal: string;
  requirements: string[];
  targetAudience?: string;
  constraints?: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchApplication = async () => {
      try {
        setLoading(true);
        const data = await apiClient.get<Application>(`/applications/${id}`);
        setApplication(data);
      } catch (err) {
        setError('Failed to load application');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [id]);

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error || !application) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/applications')}
          className="text-blue-600 hover:text-blue-700"
        >
          ← Back to Applications
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
        onClick={() => navigate('/applications')}
        className="text-blue-600 hover:text-blue-700"
      >
        ← Back to Applications
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
                  <li key={i} className="text-gray-900">
                    {req}
                  </li>
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
                  <li key={i} className="text-gray-900">
                    {constraint}
                  </li>
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

          <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700">
            Generate Design Plan
          </button>
        </div>
      </div>
    </div>
  );
}
