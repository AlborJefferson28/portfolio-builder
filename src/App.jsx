import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import EditorPage from './pages/EditorPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import PublicPortfolioPage from './pages/PublicPortfolioPage.jsx';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="adm-shell adm-loading-screen">Cargando…</div>;
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/editor/:id" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />
            <Route path="/analytics/:id" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/p/:slug" element={<PublicPortfolioPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
