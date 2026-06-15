import { useNavigate } from 'react-router-dom';
import { ApplicationIntakeForm } from '../components/ApplicationIntakeForm';

export function NewApplication() {
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Application</h1>
        <p className="text-gray-600 mt-2">
          Describe your application idea and requirements. AI agents will generate a design plan and implementation roadmap.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <ApplicationIntakeForm
          onSubmitSuccess={() => {
            navigate('/applications');
          }}
        />
      </div>
    </div>
  );
}
