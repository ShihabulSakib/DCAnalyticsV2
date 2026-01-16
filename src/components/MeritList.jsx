
import React, { useRef, useEffect } from 'react';
import { Trophy, Medal, Award, ChevronDown, Filter } from 'lucide-react';

const MeritList = ({ meritList, onSelectStudent, highlightRoll, sortBy, onSortChange, sectionFilter, onSectionChange }) => {
    const listRef = useRef(null);
    const studentRefs = useRef({});

    // Scroll to highlighted student when highlightRoll changes
    useEffect(() => {
        if (highlightRoll && studentRefs.current[highlightRoll]) {
            studentRefs.current[highlightRoll].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, [highlightRoll]);

    if (!meritList || meritList.length === 0) return null;

    const getRankIcon = (position) => {
        if (position === 1) return <Trophy className="h-5 w-5 text-yellow-500" />;
        if (position === 2) return <Medal className="h-5 w-5 text-gray-400" />;
        if (position === 3) return <Medal className="h-5 w-5 text-orange-500" />;
        return <span className="text-sm font-bold text-gray-500 dark:text-gray-400">#{position}</span>;
    };

    // Generate section options based on roll number suffix (1-150=A, 151-300=B, etc.)
    const sections = ['All', 'A', 'B', 'C', 'D', 'E', 'F'];

    return (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden h-[500px] flex flex-col transition-colors duration-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <h3 className="text-lg font-serif font-bold text-gray-800 dark:text-white flex items-center">
                    <Award className="h-5 w-5 mr-2 text-indigo-500 " />
                    Merit List
                </h3>

                {/* Sort & Filter Controls */}
                <div className="flex gap-2 mt-3">
                    {/* Sort Dropdown */}
                    <div className="relative flex-1">
                        <select
                            value={sortBy}
                            onChange={(e) => onSortChange(e.target.value)}
                            className="w-full text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-200"
                        >
                            <option value="gpa">By GPA</option>
                            <option value="marks">By Total Marks</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-2 h-3 w-3 text-gray-400 pointer-events-none" />
                    </div>

                    {/* Section Filter */}
                    <div className="relative flex-1">
                        <select
                            value={sectionFilter}
                            onChange={(e) => onSectionChange(e.target.value)}
                            className="w-full text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500 text-gray-700 dark:text-gray-200"
                        >
                            {sections.map(s => (
                                <option key={s} value={s}>{s === 'All' ? 'All Sections' : `Section ${s}`}</option>
                            ))}
                        </select>
                        <Filter className="absolute right-2 top-2 h-3 w-3 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Scrollable List */}
            <div ref={listRef} className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
                {meritList.map((student, index) => (
                    <div
                        key={student.roll}
                        ref={(el) => studentRefs.current[student.roll] = el}
                        onClick={() => onSelectStudent(student.roll)}
                        className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 border ${highlightRoll === student.roll
                            ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-300 dark:border-indigo-700 ring-2 ring-indigo-500'
                            : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border-transparent hover:border-indigo-100 dark:hover:border-indigo-800'
                            }`}
                    >
                        <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 w-8 flex justify-center">
                                {getRankIcon(index + 1)}
                            </div>
                            <div>
                                <p className={`text-sm font-semibold truncate w-32 md:w-40 ${highlightRoll === student.roll
                                    ? 'text-indigo-700 dark:text-indigo-300'
                                    : 'text-gray-900 dark:text-gray-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400'
                                    }`}>
                                    {student.name || 'Unknown'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Roll: {student.roll}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {student.gpa !== undefined && student.gpa !== null ? student.gpa.toFixed(2) : '-'}
                            </p>
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                                {student.total_marks !== undefined && student.total_marks !== null ? student.total_marks.toFixed(0) : 0} pts
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MeritList;
