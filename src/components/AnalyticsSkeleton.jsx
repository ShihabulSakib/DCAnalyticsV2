import React from 'react';
import { motion } from 'framer-motion';

/**
 * AnalyticsSkeleton - Mimics the analytics dashboard layout while loading
 * Features animated pulse effects for a premium loading experience
 */
const AnalyticsSkeleton = () => {
    return (
        <div className="p-4 md:p-6 space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="h-7 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                <div className="h-9 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
            </div>

            {/* Main Chart + Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Doughnut Chart Skeleton */}
                <div className="lg:col-span-1 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col items-center justify-center min-h-[280px]">
                    <div className="relative">
                        {/* Outer ring */}
                        <div className="w-40 h-40 rounded-full border-[16px] border-zinc-200 dark:border-zinc-800" />
                        {/* Center circle */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900" />
                        </div>
                    </div>
                    <div className="mt-4 flex gap-4">
                        <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                    </div>
                </div>

                {/* Stats Cards Skeleton */}
                <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0.5 }}
                            animate={{ opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4"
                        >
                            <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-3" />
                            <div className="h-8 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
                            <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded" />
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Subject Cards Grid Skeleton */}
            <div>
                <div className="h-6 w-40 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={`subj-${i}`}
                            initial={{ opacity: 0.5 }}
                            animate={{ opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
                            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                <div className="h-6 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                            </div>
                            {/* Grade Bar */}
                            <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full mb-3" />
                            {/* Stats */}
                            <div className="flex justify-between">
                                <div className="h-4 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
                                <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsSkeleton;
