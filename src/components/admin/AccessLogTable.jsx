import React, { useState, useEffect, useCallback } from 'react';
import { Eye, GitCompare, LogIn, Edit, ChevronLeft, ChevronRight, RefreshCw, Filter, X, Smartphone, Monitor, Tablet, ListOrdered, Shield } from 'lucide-react';
import { getActivityLogs } from '../../api';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Get relative time string (e.g., "2 mins ago")
 */
const getRelativeTime = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return then.toLocaleDateString();
};

/**
 * Action type configuration
 */
const ACTION_CONFIG = {
    VIEW_RESULT: {
        icon: Eye,
        label: 'View Result',
        colors: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    },
    COMPARE_RESULT: {
        icon: GitCompare,
        label: 'Compare',
        colors: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    },
    LOGIN: {
        icon: LogIn,
        label: 'Login',
        colors: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    },
    UPDATE_EXAM: {
        icon: Edit,
        label: 'Edit Exam',
        colors: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    },
    VIEW_MERITLIST: {
        icon: ListOrdered,
        label: 'View Merit List',
        colors: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
    }
};

/**
 * Action badge component
 */
const ActionBadge = ({ actionType }) => {
    const config = ACTION_CONFIG[actionType] || {
        icon: Eye,
        label: actionType?.replace('_', ' ') || 'Unknown',
        colors: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
    };
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${config.colors}`}>
            <Icon size={14} />
            {config.label}
        </span>
    );
};

/**
 * Device type badge component
 */
const DeviceBadge = ({ deviceType }) => {
    const config = {
        mobile: { icon: Smartphone, label: 'Mobile', color: 'text-blue-600 dark:text-blue-400' },
        tablet: { icon: Tablet, label: 'Tablet', color: 'text-purple-600 dark:text-purple-400' },
        desktop: { icon: Monitor, label: 'Desktop', color: 'text-zinc-600 dark:text-zinc-400' }
    };

    const device = config[deviceType?.toLowerCase()] || config.desktop;
    const Icon = device.icon;

    return (
        <span className={`inline-flex items-center gap-1 ${device.color}`} title={device.label}>
            <Icon size={14} />
        </span>
    );
};

/**
 * Student avatar with fallback
 */
const StudentAvatar = ({ imageUrl, name, roll, size = 'md' }) => {
    const [imgError, setImgError] = useState(false);
    const sizes = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-10 h-10'
    };

    const imgSrc = imageUrl && !imgError
        ? (imageUrl.includes('http') ? imageUrl : `/api/student-image/${roll}`)
        : null;

    return (
        <div className={`${sizes[size]} rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 flex-shrink-0`}>
            {imgSrc ? (
                <img
                    src={imgSrc}
                    alt={name || roll}
                    className="w-full h-full object-cover"
                    onError={() => setImgError(true)}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-xs font-bold">
                    {name?.charAt(0)?.toUpperCase() || '?'}
                </div>
            )}
        </div>
    );
};

/**
 * Activity detail modal
 */
const ActivityDetailModal = ({ log, onClose }) => {
    if (!log) return null;

    const parseMetadata = () => {
        try {
            return log.metadata ? JSON.parse(log.metadata) : null;
        } catch {
            return null;
        }
    };

    const metadata = parseMetadata();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl max-w-md w-full overflow-hidden"
            >
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100">Activity Details</h3>
                    <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Action */}
                    <div>
                        <p className="text-xs text-zinc-500 mb-1">Action</p>
                        <ActionBadge actionType={log.action_type} />
                    </div>

                    {/* Actor */}
                    <div>
                        <p className="text-xs text-zinc-500 mb-1">Performed By</p>
                        <div className="flex items-center gap-3">
                            <StudentAvatar imageUrl={log.actor_image} name={log.actor_name} roll={log.actor_roll} size="lg" />
                            <div>
                                <p className="font-medium text-zinc-900 dark:text-zinc-100">{log.actor_name || 'Unknown'}</p>
                                <p className="text-sm text-zinc-500 font-mono">{log.actor_roll}</p>
                            </div>
                        </div>
                    </div>

                    {/* Target */}
                    {log.target_roll && (
                        <div>
                            <p className="text-xs text-zinc-500 mb-1">Target Student</p>
                            <div className="flex items-center gap-3">
                                <StudentAvatar imageUrl={log.target_image} name={log.target_name} roll={log.target_roll} size="lg" />
                                <div>
                                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{log.target_name || 'Unknown'}</p>
                                    <p className="text-sm text-zinc-500 font-mono">{log.target_roll}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Metadata */}
                    {metadata && Object.keys(metadata).length > 0 && (
                        <div>
                            <p className="text-xs text-zinc-500 mb-1">Additional Info</p>
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 text-sm">
                                {Object.entries(metadata).map(([key, value]) => (
                                    <div key={key} className="flex justify-between">
                                        <span className="text-zinc-500">{key.replace('_', ' ')}</span>
                                        <span className="text-zinc-900 dark:text-zinc-100 font-mono">{String(value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Timestamp, IP, & Device */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <p className="text-xs text-zinc-500 mb-1">Time</p>
                            <p className="text-zinc-900 dark:text-zinc-100 text-xs">
                                {new Date(log.timestamp).toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 mb-1">IP Address</p>
                            <p className="text-zinc-900 dark:text-zinc-100 font-mono text-xs">{log.ip_address || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 mb-1">Device</p>
                            <div className="flex items-center gap-1.5">
                                <DeviceBadge deviceType={log.device_type} />
                                <span className="text-zinc-900 dark:text-zinc-100 text-xs capitalize">{log.device_type || 'desktop'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

/**
 * Main Access Log Table component
 */
const AccessLogTable = () => {
    const [logs, setLogs] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, page_size: 50, total: 0, total_pages: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [actionFilter, setActionFilter] = useState(null);
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    const loadLogs = useCallback(async (page, filter = null) => {
        setLoading(true);
        try {
            const response = await getActivityLogs(page, 50, filter);
            setLogs(response.data.logs || []);
            setPagination(response.data.pagination || { page: 1, total: 0, total_pages: 0 });
        } catch (error) {
            console.error('Failed to load logs:', error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs(currentPage, actionFilter);
    }, [currentPage, actionFilter, loadLogs]);

    const handleRefresh = () => {
        loadLogs(currentPage, actionFilter);
    };

    const filterOptions = [
        { value: null, label: 'All Actions' },
        { value: 'VIEW_RESULT', label: 'View Result' },
        { value: 'VIEW_MERITLIST', label: 'View Merit List' },
        { value: 'COMPARE_RESULT', label: 'Compare' },
        { value: 'LOGIN', label: 'Login' },
        { value: 'UPDATE_EXAM', label: 'Edit Exam' }
    ];

    return (
        <div className="space-y-4">
            {/* Header Actions */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button
                            onClick={() => setShowFilterMenu(!showFilterMenu)}
                            className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${actionFilter
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400'
                                : 'bg-white border-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300'
                                } hover:bg-zinc-50 dark:hover:bg-zinc-800`}
                        >
                            <Filter size={16} />
                            {actionFilter ? filterOptions.find(f => f.value === actionFilter)?.label : 'Filter'}
                        </button>

                        <AnimatePresence>
                            {showFilterMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute top-full left-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-10 py-1 min-w-[150px]"
                                >
                                    {filterOptions.map(option => (
                                        <button
                                            key={option.value || 'all'}
                                            onClick={() => {
                                                setActionFilter(option.value);
                                                setCurrentPage(1);
                                                setShowFilterMenu(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${actionFilter === option.value ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-zinc-700 dark:text-zinc-300'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-zinc-500">Actor</th>
                                <th className="px-4 py-3 text-left font-medium text-zinc-500">Action</th>
                                <th className="px-4 py-3 text-left font-medium text-zinc-500">Target</th>
                                <th className="px-4 py-3 text-left font-medium text-zinc-500">Device</th>
                                <th className="px-4 py-3 text-left font-medium text-zinc-500">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-3"><div className="h-8 w-32 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"></div></td>
                                        <td className="px-4 py-3"><div className="h-6 w-24 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"></div></td>
                                        <td className="px-4 py-3"><div className="h-6 w-28 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"></div></td>
                                        <td className="px-4 py-3"><div className="h-4 w-12 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"></div></td>
                                        <td className="px-4 py-3"><div className="h-4 w-20 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"></div></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-8 text-center text-zinc-500">
                                        No activity logs found
                                    </td>
                                </tr>
                            ) : (
                                logs.map(log => (
                                    <tr
                                        key={log.id}
                                        onClick={() => setSelectedLog(log)}
                                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <StudentAvatar imageUrl={log.actor_image} name={log.actor_name} roll={log.actor_roll} />
                                                <div className="min-w-0">
                                                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                                        {log.actor_name || 'Unknown'}
                                                    </p>
                                                    <p className="text-xs text-zinc-500 font-mono">{log.actor_roll}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <ActionBadge actionType={log.action_type} />
                                        </td>
                                        <td className="px-4 py-3">
                                            {log.target_roll ? (
                                                <div className="flex items-center gap-2">
                                                    <StudentAvatar imageUrl={log.target_image} name={log.target_name} roll={log.target_roll} size="sm" />
                                                    <span className="text-zinc-700 dark:text-zinc-300 truncate">
                                                        {log.target_name || log.target_roll}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-zinc-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <DeviceBadge deviceType={log.device_type} />
                                        </td>
                                        <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                                            {getRelativeTime(log.timestamp)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
                <div className="flex justify-between items-center">
                    <p className="text-sm text-zinc-500">
                        Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1 || loading}
                            className="flex items-center gap-1 px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                        >
                            <ChevronLeft size={16} />
                            Previous
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => p + 1)}
                            disabled={currentPage >= pagination.total_pages || loading}
                            className="flex items-center gap-1 px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                        >
                            Next
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedLog && (
                    <ActivityDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default AccessLogTable;
