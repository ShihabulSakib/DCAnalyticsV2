import React, { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Users, Filter } from 'lucide-react';
import { getFilteredStudents, fetchSessions } from '../../api';
import { motion } from 'framer-motion';

/**
 * Get section from roll number
 */
const getSectionFromRoll = (roll) => {
    try {
        const rollStr = String(roll);
        const last3 = parseInt(rollStr.slice(-3));
        if (last3 >= 1 && last3 <= 150) return 'A';
        if (last3 >= 151 && last3 <= 300) return 'B';
        if (last3 >= 301 && last3 <= 450) return 'C';
        if (last3 >= 451 && last3 <= 600) return 'D';
        if (last3 >= 601 && last3 <= 750) return 'E';
        if (last3 >= 751) return 'F';
    } catch (e) {
        return 'Unknown';
    }
    return 'Unknown';
};

/**
 * Student card component
 */
const StudentCard = ({ student }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 hover:shadow-md transition-shadow"
        >
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700 flex-shrink-0">
                    {student.image_url && !imgError ? (
                        <img
                            src={`/api/student-image/${student.roll}`}
                            alt={student.name}
                            className="w-full h-full object-cover"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-lg font-bold">
                            {student.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {student.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-zinc-500 font-mono">{student.roll}</p>
                    <div className="flex gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400">
                            {student.student_group}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded text-indigo-600 dark:text-indigo-400">
                            Sec {getSectionFromRoll(student.roll)}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

/**
 * Student Manager component with advanced filtering
 */
const StudentManager = () => {
    // Data states
    const [students, setStudents] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, page_size: 50, total: 0, total_pages: 0 });
    const [currentPage, setCurrentPage] = useState(1);

    // Filter states
    const [filters, setFilters] = useState({
        session: 'All',
        group: 'All',
        section: 'All'
    });
    const [searchQuery, setSearchQuery] = useState('');

    // Options
    const groups = [
        { value: 'All', label: 'All Groups' },
        { value: 'Science', label: 'Science' },
        { value: 'Business Studies', label: 'Business Studies' },
        { value: 'Humanities', label: 'Humanities' }
    ];

    const sections = [
        { value: 'All', label: 'All Sections' },
        ...['A', 'B', 'C', 'D', 'E', 'F'].map(s => ({ value: s, label: `Section ${s}` }))
    ];

    // Load sessions on mount
    useEffect(() => {
        loadSessions();
    }, []);

    // Load students when filters or page changes
    useEffect(() => {
        loadStudents();
    }, [filters, currentPage]);

    const loadSessions = async () => {
        try {
            const response = await fetchSessions();
            setSessions([{ value: 'All', label: 'All Sessions' }, ...(response.data || []).map(s => ({ value: s, label: s }))]);
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    };

    const loadStudents = async () => {
        setLoading(true);
        try {
            const response = await getFilteredStudents(
                filters.session,
                filters.group,
                filters.section,
                currentPage,
                50
            );
            setStudents(response.data.students || []);
            setPagination(response.data.pagination || { page: 1, total: 0, total_pages: 0 });
        } catch (error) {
            console.error('Failed to load students:', error);
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to first page on filter change
    };

    // Client-side search filtering
    const filteredStudents = students.filter(s =>
        !searchQuery ||
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(s.roll).includes(searchQuery)
    );

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex flex-wrap gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                            Search
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                            <input
                                type="text"
                                placeholder="Name or Roll..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Session Filter */}
                    <div className="min-w-[160px]">
                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                            Session
                        </label>
                        <select
                            value={filters.session}
                            onChange={e => handleFilterChange('session', e.target.value)}
                            className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        >
                            {sessions.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Group Filter */}
                    <div className="min-w-[160px]">
                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                            Group
                        </label>
                        <select
                            value={filters.group}
                            onChange={e => handleFilterChange('group', e.target.value)}
                            className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        >
                            {groups.map(g => (
                                <option key={g.value} value={g.value}>{g.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Section Filter */}
                    <div className="min-w-[140px]">
                        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                            Section
                        </label>
                        <select
                            value={filters.section}
                            onChange={e => handleFilterChange('section', e.target.value)}
                            className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        >
                            {sections.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Results Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-zinc-500">
                    <Users size={18} />
                    <span>{pagination.total} students found</span>
                </div>
            </div>

            {/* Student Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-28 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"></div>
                                    <div className="h-3 w-20 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                    <Users size={48} className="mx-auto mb-4 opacity-30" />
                    <p>No students found with the current filters</p>
                </div>
            ) : (
                <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                    {filteredStudents.map(student => (
                        <StudentCard key={student.roll} student={student} />
                    ))}
                </motion.div>
            )}

            {/* Pagination */}
            {pagination.total_pages > 1 && (
                <div className="flex justify-between items-center pt-4">
                    <p className="text-sm text-zinc-500">
                        Page {pagination.page} of {pagination.total_pages}
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
        </div>
    );
};

export default StudentManager;
