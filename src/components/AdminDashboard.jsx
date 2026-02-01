import React, { useState, useEffect } from 'react';
import { Users, FileText, Activity, FileEdit, BarChart3, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import { getAdminDashboard } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import AccessLogTable from './admin/AccessLogTable';
import ExamManager from './admin/ExamManager';
import StudentManager from './admin/StudentManager';

/**
 * Overview Tab - Stats and quick summary
 */
const OverviewTab = ({ stats, recentLogs }) => {
    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 }}
                    className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Users size={22} />
                        </div>
                        <div>
                            <p className="text-sm text-zinc-500">Total Students</p>
                            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {stats.total_students?.toLocaleString() || 0}
                            </h3>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <FileText size={22} />
                        </div>
                        <div>
                            <p className="text-sm text-zinc-500">Total Exams</p>
                            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {stats.total_exams?.toLocaleString() || 0}
                            </h3>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                            <Activity size={22} />
                        </div>
                        <div>
                            <p className="text-sm text-zinc-500">Recent Activity</p>
                            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {recentLogs?.length || 0}
                            </h3>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                            <TrendingUp size={22} />
                        </div>
                        <div>
                            <p className="text-sm text-zinc-500">System Status</p>
                            <h3 className="text-lg font-bold text-green-600 dark:text-green-400">
                                Online
                            </h3>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Recent Activity Preview */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm"
            >
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
                    <Clock size={18} className="text-zinc-500" />
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Recent Activity</h3>
                </div>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {recentLogs && recentLogs.length > 0 ? (
                        recentLogs.slice(0, 5).map((log, idx) => (
                            <div key={log.id || idx} className="px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                                        {log.accessor_roll?.slice(-3) || log.actor_roll?.slice(-3) || '?'}
                                    </div>
                                    <div>
                                        <p className="text-sm text-zinc-900 dark:text-zinc-100">
                                            {log.action || log.action_type || 'Unknown action'}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {log.roll || log.target_roll || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs text-zinc-400">
                                    {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-8 text-center text-zinc-500">
                            No recent activity
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

/**
 * Main Admin Dashboard Component with Tab-based UI
 */
const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({ total_students: 0, total_exams: 0 });
    const [recentLogs, setRecentLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Tab configuration
    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'logs', label: 'Access Logs', icon: Activity },
        { id: 'exams', label: 'Exam Manager', icon: FileEdit },
        { id: 'students', label: 'Students', icon: Users }
    ];

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await getAdminDashboard();
            setStats(response.data.stats || { total_students: 0, total_exams: 0 });
            setRecentLogs(response.data.recent_logs || []);
        } catch (err) {
            console.error('Failed to load dashboard:', err);
            setError('Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-zinc-500">Loading Dashboard...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h1 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-100">
                    Admin Dashboard
                </h1>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8">
                <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${isActive
                                        ? 'text-indigo-600 dark:text-indigo-400'
                                        : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                                    }`}
                            >
                                <Icon size={18} />
                                <span className="hidden sm:inline">{tab.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="activeAdminTab"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'overview' && (
                        <OverviewTab stats={stats} recentLogs={recentLogs} />
                    )}
                    {activeTab === 'logs' && <AccessLogTable />}
                    {activeTab === 'exams' && <ExamManager />}
                    {activeTab === 'students' && <StudentManager />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default AdminDashboard;