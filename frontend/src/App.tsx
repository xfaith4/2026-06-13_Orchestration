import { Routes, Route } from 'react-router-dom';

function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <nav className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">UnifiedAIToolbox</h1>
          <p className="text-sm text-gray-600 mt-1">Phase 0.1 - Monorepo Bootstrap</p>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          <Route
            path="/"
            element={
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Welcome to UnifiedAIToolbox
                </h2>
                <p className="text-gray-700 mb-4">
                  The frontend monorepo workspace is ready for development.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    <strong>Status:</strong> React 18 + TypeScript + Vite development
                    environment initialized
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    <strong>Available ports:</strong> Frontend on 5173, Backend on 3000
                  </p>
                </div>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;
