import React, { useState, useMemo, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import { motion } from 'framer-motion';
import {
    BarChart3,
    TrendingUp,
    Users,
    AlertTriangle
} from 'lucide-react';
import { useAnalyticsEngine } from '../hooks/useAnalyticsEngine';
import AnalyticsSkeleton from './AnalyticsSkeleton';
import SubjectInsightCard from './SubjectInsightCard';

ChartJS.register(ArcElement, Tooltip, Legend);

// Minimum student count for subject to be considered in rankings
const MIN_STUDENTS_FOR_RANKING = 100;

/**
 * AnalyticsView - Offline-first analytics dashboard
 * Uses static JSON and client-side processing for instant mobile loading
 * 
 * Mobile (<768px): Simplified view - only exam selector, no hover, static stats
 * Desktop (>=768px): Full experience with hover effects, filters in card
 */
const AnalyticsView = ({ examId }) => {
    // Filter state
    const [filters, setFilters] = useState({ section: 'All', group: 'All' });
    const [hoveredCard, setHoveredCard] = useState(null);
    const [isFiltering, setIsFiltering] = useState(false);

    // Mobile detection state
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile viewport
    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 767px)');
        setIsMobile(mediaQuery.matches);

        const handleResize = (e) => setIsMobile(e.matches);
        mediaQuery.addEventListener('change', handleResize);
        return () => mediaQuery.removeEventListener('change', handleResize);
    }, []);

    // Use the analytics engine hook
    const {
        loading,
        error,
        meta,
        passFailStats,
        subjectStats,
        filteredCount,
        availableSections,
        availableGroups
    } = useAnalyticsEngine(examId, filters);

    // Handle filter changes with visual feedback
    const handleFilterChange = (key, value) => {
        setIsFiltering(true);
        // Small timeout to allow skeleton to render and give "processing" feedback
        setTimeout(() => {
            setFilters(prev => ({ ...prev, [key]: value }));
            // Ensure skeleton stays for at least 500ms total for smooth UX
            setTimeout(() => setIsFiltering(false), 500);
        }, 50);
    };

    // Compute Top Subject (filter by MIN_STUDENTS_FOR_RANKING)
    const topSubject = useMemo(() => {
        if (!subjectStats.length) return null;
        const qualified = subjectStats.filter(s => s.count >= MIN_STUDENTS_FOR_RANKING);
        if (!qualified.length) return subjectStats[0]; // Fallback if none qualify
        // Already sorted by avgGP descending
        return qualified[0];
    }, [subjectStats]);

    // Compute Hardest Subject (highest absolute fail count)
    const hardestSubject = useMemo(() => {
        if (!subjectStats.length) return null;
        const qualified = subjectStats.filter(s => s.count >= MIN_STUDENTS_FOR_RANKING);
        const pool = qualified.length ? qualified : subjectStats;
        // Sort by failCount descending
        return [...pool].sort((a, b) => b.failCount - a.failCount)[0];
    }, [subjectStats]);

    // Doughnut chart data
    const chartData = useMemo(() => ({
        labels: ['Passed', 'Failed'],
        datasets: [{
            data: [passFailStats.passed, passFailStats.failed],
            backgroundColor: [
                'rgba(16, 185, 129, 0.85)',  // Emerald-500
                'rgba(244, 63, 94, 0.85)'    // Rose-500
            ],
            borderColor: [
                'rgba(16, 185, 129, 1)',
                'rgba(244, 63, 94, 1)'
            ],
            borderWidth: 2,
            // Desktop: snappy hover; Mobile: no hover offset
            hoverOffset: isMobile ? 0 : 4,
            cutout: '70%'
        }]
    }), [passFailStats, isMobile]);

    // Chart options - Mobile disables hover/tooltip; Desktop has snappy animation
    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        // Disable all animations on mobile for performance
        animation: isMobile ? false : {
            duration: 200 // Snappy animation for desktop
        },
        plugins: {
            legend: {
                display: !isMobile, // Hide legend on mobile (shown statically)
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 16,
                    font: { size: 12, family: "'Inter', sans-serif" }
                }
            },
            tooltip: {
                // Disable tooltip on mobile (can't hover on touch)
                enabled: !isMobile,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                cornerRadius: 8,
                titleFont: { size: 14, weight: 'bold' },
                bodyFont: { size: 12 }
            }
        },
        // Disable hover effects on mobile
        hover: isMobile ? { mode: null } : undefined
    }), [isMobile]);

    // Show skeleton during loading or filtering
    if (loading || isFiltering) {
        return <AnalyticsSkeleton />;
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
                <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
                    Failed to load analytics
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {error}
                </p>
            </div>
        );
    }

    // No data state
    if (!meta) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <BarChart3 className="w-12 h-12 text-zinc-400 mb-4" />
                <p className="text-zinc-500 dark:text-zinc-400">
                    Select an exam to view analytics
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-6 overflow-y-auto h-full">
            {/* Header - Desktop only shows exam info, no filter bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
                        {meta.name}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Showing {filteredCount} of {meta.total} students
                    </p>
                </div>

                {/* Filter Controls - Desktop & Mobile */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                        value={filters.section}
                        onChange={(e) => handleFilterChange('section', e.target.value)}
                        className="flex-1 sm:flex-none px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                        {availableSections.map(s => (
                            <option key={s} value={s}>
                                {s === 'All' ? 'All Sections' : `Section ${s}`}
                            </option>
                        ))}
                    </select>
                    <select
                        value={filters.group}
                        onChange={(e) => handleFilterChange('group', e.target.value)}
                        className="flex-1 sm:flex-none px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                        {availableGroups.map(g => (
                            <option key={g} value={g}>
                                {g === 'All' ? 'All Groups' : g}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Performance Ring (Doughnut Chart) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="lg:col-span-1 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-zinc-800 dark:text-zinc-100">
                            Pass/Fail Rate
                        </h3>
                    </div>

                    {/* Chart Container */}
                    <div className="relative flex-1 min-h-[200px] flex items-center justify-center">
                        <Doughnut data={chartData} options={chartOptions} />
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                                {passFailStats.passRate}%
                            </span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                Pass Rate
                            </span>
                        </div>
                    </div>

                    {/* Mobile: Static Pass/Fail counts below chart (since no hover) */}
                    {isMobile && (
                        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Passed</span>
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                        {passFailStats.passed}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                        {passFailStats.total > 0 ? Math.round((passFailStats.passed / passFailStats.total) * 100) : 0}%
                                    </p>
                                </div>
                                <div>
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                                        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Failed</span>
                                    </div>
                                    <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                                        {passFailStats.failed}
                                    </p>
                                    <p className="text-xs text-zinc-500">
                                        {passFailStats.total > 0 ? Math.round((passFailStats.failed / passFailStats.total) * 100) : 0}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Stats Summary Cards */}
                <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Total Students */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white"
                    >
                        <Users className="w-5 h-5 mb-2 opacity-80" />
                        <p className="text-2xl font-bold">{filteredCount}</p>
                        <p className="text-xs opacity-80">Total Students</p>
                    </motion.div>

                    {/* Passed */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white"
                    >
                        <TrendingUp className="w-5 h-5 mb-2 opacity-80" />
                        <p className="text-2xl font-bold">{passFailStats.passed}</p>
                        <p className="text-xs opacity-80">Passed</p>
                    </motion.div>

                    {/* Failed */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl p-4 text-white"
                    >
                        <AlertTriangle className="w-5 h-5 mb-2 opacity-80" />
                        <p className="text-2xl font-bold">{passFailStats.failed}</p>
                        <p className="text-xs opacity-80">Failed</p>
                    </motion.div>

                    {/* Subject Stats Cards */}
                    {subjectStats.length > 0 && (
                        <>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                                className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800"
                            >
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                                    Subjects Analyzed
                                </p>
                                <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
                                    {subjectStats.length}
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800"
                            >
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                                    Top Subject
                                </p>
                                <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100 truncate">
                                    {topSubject?.name || '-'}
                                </p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                    Avg: {topSubject?.avgGP || '0.00'}
                                </p>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.35 }}
                                className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800"
                            >
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                                    Hardest Subject
                                </p>
                                <p className="text-lg font-bold text-zinc-800 dark:text-zinc-100 truncate">
                                    {hardestSubject?.name || '-'}
                                </p>
                                <p className="text-xs text-rose-600 dark:text-rose-400">
                                    {hardestSubject?.failCount || 0} failed
                                </p>
                            </motion.div>
                        </>
                    )}
                </div>
            </div>

            {/* Subject Analysis Section */}
            {subjectStats.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-4">
                        Subject Performance
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subjectStats.map((subject, index) => (
                            <SubjectInsightCard
                                key={subject.id}
                                subject={subject}
                                index={index}
                                isHovered={hoveredCard !== null && hoveredCard !== subject.id}
                                onHover={(isHovering) => setHoveredCard(isHovering ? subject.id : null)}
                                isMobile={isMobile}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsView;