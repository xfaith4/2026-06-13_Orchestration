import React from 'react'

export function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">
            UnifiedAIToolbox
          </h1>
          <p className="text-gray-600 mt-2">Multi-Agent Orchestration Platform</p>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-12 px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Welcome
          </h2>
          <p className="text-gray-700 mb-4">
            The application is starting up. This is Phase 1 of the roadmap.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
            <p className="text-blue-700">
              Backend API: <code className="bg-blue-100 px-2 py-1 rounded">http://localhost:3000/api</code>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
