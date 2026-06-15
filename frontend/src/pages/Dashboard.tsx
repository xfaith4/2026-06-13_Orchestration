import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { Application, Roadmap, Run } from '../types';
import { CostSummary } from '../components/CostSummary';

interface DashboardStats {
  totalApplications: number;
  activeRoadmaps: number;
  completedRuns: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalApplications: 0,
    activeRoadmaps: 0,
    completedRuns: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [apps, roadmaps, runs] = await Promise.allSettled([
          apiClient.get<Application[]>('/applications'),
          apiClient.get<Roadmap[]>('/roadmaps'),
          apiClient.get<Run[]>('/runs'),
        ]);

        setStats({
          totalApplications: apps.status === 'fulfilled' ? (apps.value ?? []).length : 0,
          activeRoadmaps: roadmaps.status === 'fulfilled' ? (roadmaps.value ?? []).length : 0,
          completedRuns:
            runs.status === 'fulfilled'
              ? (runs.value ?? []).filter((r) => r.status === 'completed').length
              : 0,
        });
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Applications', value: stats.totalApplications, href: '/applications' },
    { label: 'Active Roadmaps', value: stats.activeRoadmaps, href: '/roadmaps' },
    { label: 'Completed Runs', value: stats.completedRuns, href: '/runs' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome to UnifiedAIToolbox</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {statCards.map((stat) => (
          <Link
            key={stat.label}
            to={stat.href}
            className="bg-white rounded-lg shadow px-6 py-4 hover:shadow-lg transition-shadow"
          >
            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
            {statsLoading ? (
              <div className="h-9 w-16 bg-gray-200 rounded animate-pulse mt-2" />
            ) : (
              <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
            )}
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

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Cost Analysis</h2>
        <CostSummary />
      </div>
    </div>
  );
}
