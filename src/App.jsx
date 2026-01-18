import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ResultsView from './components/ResultsView';
import AdminDashboard from './components/AdminDashboard';
import CompareView from './components/CompareView';
import LoginPage from './components/LoginPage';
import AdminLoginPage from './components/AdminLoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

function App() {
  const { user } = useAuth();

  return (
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
  );
}

export default App;
