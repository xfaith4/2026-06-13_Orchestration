import { useState } from 'react';
import { usePost } from '../hooks/useApi';

interface ApplicationFormData {
  name: string;
  description: string;
  goal: string;
  requirements: string;
  targetAudience?: string;
  constraints?: string;
}

interface ApplicationIntakeFormProps {
  onSubmitSuccess?: () => void;
}

export function ApplicationIntakeForm({ onSubmitSuccess }: ApplicationIntakeFormProps) {
  const [formData, setFormData] = useState<ApplicationFormData>({
    name: '',
    description: '',
    goal: '',
    requirements: '',
    targetAudience: '',
    constraints: '',
  });

  const { loading, error, post } = usePost('/applications');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formData.name.trim()) {
      setSubmitError('Application name is required');
      return;
    }

    if (!formData.description.trim()) {
      setSubmitError('Description is required');
      return;
    }

    if (!formData.goal.trim()) {
      setSubmitError('Goal is required');
      return;
    }

    const payload = {
      name: formData.name,
      description: formData.description,
      goal: formData.goal,
      requirements: formData.requirements
        .split('\n')
        .map((r) => r.trim())
        .filter((r) => r),
      targetAudience: formData.targetAudience || undefined,
      constraints: formData.constraints
        ? formData.constraints
            .split('\n')
            .map((c) => c.trim())
            .filter((c) => c)
        : undefined,
      status: 'draft',
    };

    const result = await post(payload);
    if (result) {
      setSubmitted(true);
      setFormData({
        name: '',
        description: '',
        goal: '',
        requirements: '',
        targetAudience: '',
        constraints: '',
      });
      setTimeout(() => {
        onSubmitSuccess?.();
      }, 1500);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-800 font-medium">✓ Application created successfully!</p>
        <p className="text-green-700 text-sm mt-1">Redirecting...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(submitError || error) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-700 text-sm">{submitError || error}</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Application Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
          placeholder="e.g., Customer Portal"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description *
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
          placeholder="Describe what your application does..."
        />
      </div>

      <div>
        <label htmlFor="goal" className="block text-sm font-medium text-gray-700">
          Primary Goal *
        </label>
        <textarea
          id="goal"
          name="goal"
          value={formData.goal}
          onChange={handleChange}
          rows={2}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
          placeholder="What is the main objective of this application?"
        />
      </div>

      <div>
        <label htmlFor="requirements" className="block text-sm font-medium text-gray-700">
          Requirements
        </label>
        <textarea
          id="requirements"
          name="requirements"
          value={formData.requirements}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
          placeholder="List requirements, one per line"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700">
            Target Audience
          </label>
          <input
            type="text"
            id="targetAudience"
            name="targetAudience"
            value={formData.targetAudience}
            onChange={handleChange}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
            placeholder="e.g., Enterprise users, Mobile users"
          />
        </div>

        <div>
          <label htmlFor="constraints" className="block text-sm font-medium text-gray-700">
            Constraints
          </label>
          <textarea
            id="constraints"
            name="constraints"
            value={formData.constraints}
            onChange={handleChange}
            rows={3}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 border px-3 py-2"
            placeholder="List constraints, one per line"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Creating...' : 'Create Application'}
      </button>
    </form>
  );
}
