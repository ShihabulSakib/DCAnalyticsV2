import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Users } from 'lucide-react';

/**
 * SubjectInsightCard - Individual subject analysis card
 * 
 * Props:
 * - subject: { id, name, avgGP, failCount, failRate, gradeDistribution, count }
 * - index: Card index for stagger animation
 * - isHovered: Whether another card is being hovered (for dim effect)
 * - isMobile: Whether on mobile viewport (disables hover effects)
 */
const SubjectInsightCard = ({ subject, index, isHovered, onHover, isMobile = false }) => {
    const { name, avgGP, failCount, failRate, gradeDistribution, count } = subject;

    // Calculate total for percentage widths
    const total = Object.values(gradeDistribution).reduce((a, b) => a + b, 0);

    // Grade colors (matching semantic palette)
    const gradeColors = {
        'A+': 'bg-emerald-500',
        'A': 'bg-emerald-400',
        'A-': 'bg-teal-400',
        'B': 'bg-indigo-400',
        'C': 'bg-amber-400',
        'D': 'bg-orange-400',
        'F': 'bg-rose-500'
    };

    // Determine badge color based on average GP
    const getBadgeColor = (gp) => {
        const gpNum = parseFloat(gp);
        if (gpNum >= 4.5) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
        if (gpNum >= 3.5) return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
        if (gpNum >= 2.5) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400';
    };

    // Warning threshold for fail rate
    const isHighFailRate = failRate > 20;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
                opacity: isHovered ? 0.5 : 1,
                y: 0,
                scale: 1
            }}
            whileHover={isMobile ? undefined : {
                scale: 1.02,
                opacity: 1,
                boxShadow: '0 10px 40px -10px rgba(99, 102, 241, 0.2)'
            }}
            transition={{
                duration: 0.3,
                delay: index * 0.05  // Stagger effect
            }}
            onHoverStart={isMobile ? undefined : () => onHover?.(true)}
            onHoverEnd={isMobile ? undefined : () => onHover?.(false)}
            className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 cursor-pointer transition-shadow"
        >
            {/* Header: Subject Name + GPA Badge */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-zinc-800 dark:text-zinc-100 truncate pr-2">
                    {name}
                </h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getBadgeColor(avgGP)}`}>
                    {avgGP}
                </span>
            </div>

            {/* Grade Distribution Bar */}
            <div className="h-2.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex mb-3">
                {Object.entries(gradeDistribution).map(([grade, value]) => {
                    const percentage = total > 0 ? (value / total) * 100 : 0;
                    if (percentage === 0) return null;
                    return (
                        <div
                            key={grade}
                            className={`${gradeColors[grade]} h-full transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                            title={`${grade}: ${value} (${percentage.toFixed(1)}%)`}
                        />
                    );
                })}
            </div>

            {/* Grade Legend (compact) */}
            <div className="flex flex-wrap gap-1.5 mb-3">
                {Object.entries(gradeDistribution).map(([grade, value]) => {
                    if (value === 0) return null;
                    return (
                        <span
                            key={grade}
                            className="inline-flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400"
                        >
                            <span className={`w-2 h-2 rounded-full ${gradeColors[grade]}`} />
                            {grade}: {value}
                        </span>
                    );
                })}
            </div>

            {/* Footer Stats */}
            <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                    <Users size={12} />
                    {count} students
                </span>

                <span
                    className={`flex items-center gap-1 font-medium ${isHighFailRate
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                >
                    {isHighFailRate ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                    {failCount} failed ({failRate}%)
                </span>
            </div>
        </motion.div>
    );
};

export default SubjectInsightCard;
