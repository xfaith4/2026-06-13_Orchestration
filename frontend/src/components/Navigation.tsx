import { useAppStore } from '../stores';
import { Link } from 'react-router-dom';

export function Navigation() {
  const user = useAppStore((state) => state.user);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-blue-600">
              UnifiedAIToolbox
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <div className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{user.name}</span>
              </div>
            )}
            <button className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
              Profile
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
