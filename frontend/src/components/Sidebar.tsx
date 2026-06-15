import { Link, useLocation } from 'react-router-dom';

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Applications', href: '/applications', icon: '📱' },
  { name: 'Design Plans', href: '/design-plans', icon: '📐' },
  { name: 'Roadmaps', href: '/roadmaps', icon: '🗺️' },
  { name: 'Runs', href: '/runs', icon: '▶️' },
  { name: 'Agents', href: '/agents', icon: '🤖' },
  { name: 'Prompts', href: '/prompts', icon: '💬' },
  { name: 'Contracts', href: '/contracts', icon: '📋' },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-gray-900">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <nav className="mt-5 flex-1 space-y-1 px-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="mr-3 text-base">{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
