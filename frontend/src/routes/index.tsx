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
import { RunList } from '../pages/RunList';
import { RunDetail } from '../pages/RunDetail';
import { ExecutionConsole } from '../pages/ExecutionConsole';
import { CostAnalyticsPage } from '../pages/CostAnalyticsPage';
import { AuditLog } from '../pages/AuditLog';
import { AgentList } from '../pages/AgentList';
import { PromptList } from '../pages/PromptList';
import { ContractList } from '../pages/ContractList';

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
              <RunList />
            </MainLayout>
          }
        />
        <Route
          path="/runs/:id"
          element={
            <MainLayout>
              <RunDetail />
            </MainLayout>
          }
        />
        <Route
          path="/runs/:id/console"
          element={
            <MainLayout>
              <ExecutionConsole />
            </MainLayout>
          }
        />
        <Route
          path="/agents"
          element={
            <MainLayout>
              <AgentList />
            </MainLayout>
          }
        />
        <Route
          path="/prompts"
          element={
            <MainLayout>
              <PromptList />
            </MainLayout>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <MainLayout>
              <AuditLog />
            </MainLayout>
          }
        />
        <Route
          path="/cost-analytics"
          element={
            <MainLayout>
              <CostAnalyticsPage />
            </MainLayout>
          }
        />
        <Route
          path="/contracts"
          element={
            <MainLayout>
              <ContractList />
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
