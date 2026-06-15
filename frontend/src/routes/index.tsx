import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { Dashboard } from '../pages/Dashboard';
import { ApplicationsList } from '../pages/ApplicationsList';
import { NewApplication } from '../pages/NewApplication';
import { ApplicationDetail } from '../pages/ApplicationDetail';
import { DesignPlansList } from '../pages/DesignPlansList';
import { DesignPlanDetail } from '../pages/DesignPlanDetail';
import { RoadmapList } from '../pages/RoadmapList';
import { RoadmapDetail } from '../pages/RoadmapDetail';

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
              <ApplicationsList />
            </MainLayout>
          }
        />
        <Route
          path="/applications/new"
          element={
            <MainLayout>
              <NewApplication />
            </MainLayout>
          }
        />
        <Route
          path="/applications/:id"
          element={
            <MainLayout>
              <ApplicationDetail />
            </MainLayout>
          }
        />
        <Route
          path="/design-plans"
          element={
            <MainLayout>
              <DesignPlansList />
            </MainLayout>
          }
        />
        <Route
          path="/design-plans/:id"
          element={
            <MainLayout>
              <DesignPlanDetail />
            </MainLayout>
          }
        />
        <Route
          path="/roadmaps"
          element={
            <MainLayout>
              <RoadmapList />
            </MainLayout>
          }
        />
        <Route
          path="/roadmaps/:id"
          element={
            <MainLayout>
              <RoadmapDetail />
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
