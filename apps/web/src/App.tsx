import { type ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { Crosshair } from 'lucide-react';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { IocsPage } from './pages/IocsPage';
import { HuntsPage } from './pages/HuntsPage';
import { ResearchPage } from './pages/ResearchPage';
import { ArticlePage } from './pages/ArticlePage';
import { ToolsPage } from './pages/ToolsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { ReportsPage } from './pages/ReportsPage';
import { ReportEditorPage } from './pages/ReportEditorPage';
import { CommunityPage } from './pages/CommunityPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

function FullPageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg">
      <span className="flex h-11 w-11 animate-pulse items-center justify-center rounded-lg border border-accent/30 bg-accent/12 text-accent">
        <Crosshair className="h-5 w-5" />
      </span>
      <span className="text-[13px] text-ink-3">Loading KillChain Hub…</span>
    </div>
  );
}

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function ShellLayout() {
  return (
    <Protected>
      <AppShell>
        <Outlet />
      </AppShell>
    </Protected>
  );
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user) return <Navigate to="/" replace />;
  return <LoginPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route element={<ShellLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="iocs" element={<IocsPage />} />
                <Route path="hunts" element={<HuntsPage />} />
                <Route path="research" element={<ResearchPage />} />
                <Route path="research/:id" element={<ArticlePage />} />
                <Route path="tools" element={<ToolsPage />} />
                <Route path="resources" element={<ResourcesPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="reports/:id" element={<ReportEditorPage />} />
                <Route path="community" element={<CommunityPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
