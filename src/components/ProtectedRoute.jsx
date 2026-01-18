import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
    const { user, loading, isAdmin } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center">
                <div className="animate-pulse text-zinc-400">Loading...</div>
            </div>
        );
    }

    if (!user) {
        if (requireAdmin) {
            return <Navigate to="/admin/login" replace />;
        }
        return <Navigate to="/login" replace />;
    }
    if (requireAdmin && !isAdmin()) {
        return <Navigate to="/admin/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
