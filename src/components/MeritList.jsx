import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Trophy, Medal } from 'lucide-react';

const MeritList = ({ students, onStudentClick, sortBy = 'gpa' }) => {
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useLayoutEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };

        window.addEventListener('resize', updateSize);
        updateSize();

        return () => window.removeEventListener('resize', updateSize);
    }, []);

    useEffect(() => {
        if (containerRef.current) {
            setDimensions({
                width: containerRef.current.offsetWidth,
                height: containerRef.current.offsetHeight
            });
        }
    }, [students]);

    const getRankIcon = (rank) => {
        if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500 fill-yellow-500" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-gray-400 fill-gray-400" />;
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-700 fill-amber-700" />;
        return <span className="font-mono text-zinc-500 font-bold">#{rank}</span>;
    };

    // Row Component for Virtualized List
    const Row = ({ index, style }) => {
        const student = students[index];
        const isEven = index % 2 === 0;
        const rank = student.position; // Use static rank from API

        return (
            <div
                style={style}
                className={`flex items-center px-4 border-b border-zinc-100 dark:border-zinc-800 transition-colors cursor-pointer ${isEven ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50/50 dark:bg-zinc-900/50'
                    } hover:bg-indigo-50 dark:hover:bg-indigo-900/20`}
                onClick={() => onStudentClick(student)}
            >
                {/* Rank */}
                <div className="w-12 md:w-16 flex justify-center shrink-0">
                    {getRankIcon(rank)}
                </div>

                {/* Roll (Last 3 digits) */}
                <div className="w-16 md:w-20 font-mono text-zinc-500 dark:text-zinc-400 font-medium text-sm md:text-base shrink-0 text-center">
                    {String(student.roll).slice(-3)}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0 px-3">
                    <div className="truncate font-medium text-zinc-700 dark:text-zinc-300 text-sm md:text-base">
                        {student.name}
                    </div>
                </div>

                {/* GPA or Marks */}
                <div className="w-16 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm md:text-base shrink-0">
                    {sortBy === 'marks'
                        ? (student.total_marks !== null ? student.total_marks : '-')
                        : (student.gpa !== null ? student.gpa : '-')
                    }
                </div>
            </div>
        );
    };

    return (
        <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center px-4 py-3 bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <div className="w-12 md:w-16 text-center shrink-0">Rank</div>
                <div className="w-16 md:w-20 text-center shrink-0">Roll</div>
                <div className="flex-1 px-3">Name</div>
                <div className="w-16 text-right shrink-0">{sortBy === 'marks' ? 'Marks' : 'GPA'}</div>
            </div>

            {/* Virtualized List Container */}
            <div className="flex-1 min-h-0" ref={containerRef}>
                {dimensions.height > 0 && (
                    <List
                        height={dimensions.height}
                        itemCount={students.length}
                        itemSize={50}
                        width={dimensions.width}
                    >
                        {Row}
                    </List>
                )}
            </div>
        </div>
    );
};

export default MeritList;