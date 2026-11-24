import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import AuthPage from './pages/AuthPage';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  const role = (user?.role || '').toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Routes>
        <Route path="/auth" element={<AuthPage />} />

        <Route
          path="/student"
          element={
            role === 'STUDENT' ? (
              <>
                <Navbar />
                <StudentDashboard />
              </>
            ) : (
              <Navigate to={role === 'ADMIN' ? '/admin' : '/auth'} replace />
            )
          }
        />

        <Route
          path="/admin"
          element={
            role === 'ADMIN' ? (
              <>
                <Navbar />
                <AdminDashboard />
              </>
            ) : (
              <Navigate to={role === 'STUDENT' ? '/student' : '/auth'} replace />
            )
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to={role === 'ADMIN' ? '/admin' : role === 'STUDENT' ? '/student' : '/auth'}
              replace
            />
          }
        />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}