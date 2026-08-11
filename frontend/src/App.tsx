import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { HeroPage } from './pages/HeroPage';
import { SearchPage } from './pages/SearchPage';
import { AnalyticsDashboard } from './pages/AnalyticsDashboard';
import { ScrapedExplorer } from './pages/ScrapedExplorer';
import { DocsPage } from './pages/DocsPage';
import { LoginPage } from './pages/LoginPage';
import { AuthCallback } from './pages/AuthCallback';
import { AppShell } from './components/AppShell';
import { useAuthStore } from './store/useAuthStore';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, mode, init } = useAuthStore();

  useEffect(() => { init(); }, []);

  if (mode === 'cloud' && !token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HeroPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route element={
        <AuthGuard>
          <AppShell />
        </AuthGuard>
      }>
        <Route path="/search" element={<SearchPage />} />
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/explorer" element={<ScrapedExplorer />} />
        <Route path="/docs" element={<DocsPage />} />
      </Route>
    </Routes>
  );
}

export default App;
