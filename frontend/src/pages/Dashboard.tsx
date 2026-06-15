import { Link } from 'react-router-dom';

export function Dashboard() {
  const stats = [
    { label: 'Total Applications', value: '0', href: '/applications' },
    { label: 'Active Roadmaps', value: '0', href: '/roadmaps' },
    { label: 'Completed Runs', value: '0', href: '/runs' },
    { label: 'Agents', value: '0', href: '/agents' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome to UnifiedAIToolbox</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.href}
            className="bg-white rounded-lg shadow px-6 py-4 hover:shadow-lg transition-shadow"
          >
            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Start</h2>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                1
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                <Link to="/applications" className="hover:text-blue-600">
                  Create an Application
                </Link>
              </h3>
              <p className="mt-2 text-gray-600">
                Describe your application idea and requirements
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                2
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Generate Design Plan
              </h3>
              <p className="mt-2 text-gray-600">
                AI agents create an architectural design plan
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                3
              </div>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">
                Execute Roadmap
              </h3>
              <p className="mt-2 text-gray-600">
                Watch as agents build and test your application
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
