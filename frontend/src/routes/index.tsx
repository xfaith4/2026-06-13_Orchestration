import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { Dashboard } from '../pages/Dashboard';

export function AppRoutes() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <MainLayout>
              <Dashboard />
            </MainLayout>
          }
        />
        <Route
          path="/applications"
          element={
            <MainLayout>
              <div>
                <h1 className="text-3xl font-bold">Applications</h1>
                <p className="text-gray-600 mt-2">Coming soon</p>
              </div>
            </MainLayout>
          }
        />
        <Route
          path="/design-plans"
          element={
            <MainLayout>
              <div>
                <h1 className="text-3xl font-bold">Design Plans</h1>
                <p className="text-gray-600 mt-2">Coming soon</p>
              </div>
            </MainLayout>
          }
        />
        <Route
          path="/roadmaps"
          element={
            <MainLayout>
              <div>
                <h1 className="text-3xl font-bold">Roadmaps</h1>
                <p className="text-gray-600 mt-2">Coming soon</p>
              </div>
            </MainLayout>
          }
        />
        <Route
          path="/runs"
          element={
            <MainLayout>
              <div>
                <h1 className="text-3xl font-bold">Execution Runs</h1>
                <p className="text-gray-600 mt-2">Coming soon</p>
              </div>
            </MainLayout>
          }
        />
        <Route
          path="/agents"
          element={
            <MainLayout>
              <div>
                <h1 className="text-3xl font-bold">Agents</h1>
                <p className="text-gray-600 mt-2">Coming soon</p>
              </div>
            </MainLayout>
          }
        />
        <Route
          path="/prompts"
          element={
            <MainLayout>
              <div>
                <h1 className="text-3xl font-bold">Prompts</h1>
                <p className="text-gray-600 mt-2">Coming soon</p>
              </div>
            </MainLayout>
          }
        />
        <Route
          path="/contracts"
          element={
            <MainLayout>
              <div>
                <h1 className="text-3xl font-bold">Contracts</h1>
                <p className="text-gray-600 mt-2">Coming soon</p>
              </div>
            </MainLayout>
          }
        />
        <Route
          path="*"
          element={
            <MainLayout>
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900">404 Not Found</h1>
                <p className="text-gray-600 mt-2">The page you're looking for doesn't exist</p>
              </div>
            </MainLayout>
          }
        />
      </Routes>
    </Router>
  );
}
