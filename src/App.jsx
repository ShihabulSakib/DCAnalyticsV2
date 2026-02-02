import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Skeleton from './components/Skeleton';

// Lazy load components for performance
const Layout = lazy(() => import('./components/Layout'));
const ResultsView = lazy(() => import('./components/ResultsView'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const CompareView = lazy(() => import('./components/CompareView'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const AdminLoginPage = lazy(() => import('./components/AdminLoginPage'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));

// Loading Fallback
const PageLoader = () => (
    <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm animate-pulse">Loading Application...</p>
    </div>
);

function App() {
  const { user } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* Student Login Route */}
        <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <LoginPage />}
        />

        {/* Admin Login Route */}
        <Route
            path="/admin/login"
            element={user && user.role === 'admin' ? <Navigate to="/admin" replace /> : <AdminLoginPage />}
        />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<ResultsView />} />
            <Route path="compare" element={<CompareView />} />
            <Route
            path="admin"
            element={
                <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
                </ProtectedRoute>
            }
            />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </Suspense>
  );
}

export default App;