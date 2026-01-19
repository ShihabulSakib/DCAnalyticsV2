import React, { useState, useEffect } from 'react';
import { Search, Filter, Menu, X, ArrowDownWideNarrow, Layers, Sparkles } from 'lucide-react';
import MeritList from './MeritList';
import ResultModal from './ResultModal';
import AnalyticsView from './AnalyticsView';
import Skeleton from './Skeleton';
import { fetchExams, fetchMeritList, fetchSessions } from '../api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const parseStudentRoll = (roll) => {
    const rollStr = String(roll);
    if (!roll || rollStr.length < 10) return { session: 'All', group: 'All', section: 'All' };

    // Example: 1 202425 010 471
    const sessionPart = rollStr.substring(1, 7);
    const groupPart = rollStr.substring(7, 10);

    const session = `${sessionPart.substring(0, 4)}-20${sessionPart.substring(4, 6)}`;

    let group = 'All';
    if (groupPart === '010') group = 'Science';
    else if (groupPart === '020') group = 'Business Studies';
    else if (groupPart === '030') group = 'Humanities';

    let section = 'All';
    try {
        const last3 = parseInt(rollStr.slice(-3));
        if (last3 >= 1 && last3 <= 150) section = 'A';
        else if (last3 <= 300) section = 'B';
        else if (last3 <= 450) section = 'C';
        else if (last3 <= 600) section = 'D';
        else if (last3 <= 750) section = 'E';
        else if (last3 > 750) section = 'F';
    } catch (e) {
        section = 'All';
    }

    return { session, group, section };
};

const ResultsView = () => {
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState('results'); // 'results' | 'analytics'
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [students, setStudents] = useState([]);
    const [exams, setExams] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [selectedExam, setSelectedExam] = useState(null);

    // Filters
    const [selectedSession, setSelectedSession] = useState('All');
    const [selectedGroup, setSelectedGroup] = useState('All');
    const [sortBy, setSortBy] = useState('gpa'); // 'gpa' or 'marks'
    const [selectedSection, setSelectedSection] = useState('All');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Mobile Menu State
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showDiscoveryHint, setShowDiscoveryHint] = useState(false);

    useEffect(() => {
        if (user && user.roll) {
            const { session, group, section } = parseStudentRoll(user.roll);
            setSelectedSession(session);
            setSelectedGroup(group);
            setSelectedSection(section);
        }

        const timer = setTimeout(() => setShowDiscoveryHint(true), 1000);
        loadData();
        return () => clearTimeout(timer);
    }, [user]);

    useEffect(() => {
        if (selectedExam) {
            loadMeritList();
        }
    }, [selectedExam, selectedSession, selectedGroup, sortBy, selectedSection]);

    const loadData = async () => {
        try {
            const [examsRes, sessionsRes] = await Promise.all([
                fetchExams(),
                fetchSessions()
            ]);

            const examsList = examsRes.data;
            setExams(examsList);
            setSessions(sessionsRes.data);

            if (examsList.length > 0) {
                const latest = examsList[examsList.length - 1];
                setSelectedExam(latest.id);
            } else {
                setLoading(false);
            }
        } catch (err) {
            console.error('Failed to load data:', err);
            setError('Failed to load data. Please check connection.');
            setLoading(false);
        }
    };

    const loadMeritList = async () => {
        if (!selectedExam) return;
        setLoading(true);
        try {
            const response = await fetchMeritList(sortBy, selectedSection, selectedExam, selectedSession, selectedGroup);
            setStudents(response.data);
            setError('');
        } catch (err) {
            console.error('Failed to load merit list:', err);
            setError('Failed to load results.');
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(s.roll).includes(searchQuery)
    );

    if (loading && !selectedExam) {
        return (
            <div className="h-[calc(100vh-6rem)] flex flex-col gap-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-[calc(100vh-12rem)] w-full" />
            </div>
        );
    }

    // Desktop Filter Component
    const DesktopFilters = () => (
        <div className="hidden md:flex flex-wrap items-center gap-2">
            <select
                value={selectedExam || ''}
                onChange={(e) => setSelectedExam(e.target.value)}
                className="min-w-[140px] px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
            >
                {exams.map(exam => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
            </select>

            <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
            >
                <option value="gpa">Rank by GPA</option>
                <option value="marks">Rank by Marks</option>
            </select>

            <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
            >
                <option value="All">All Sections</option>
                {['A', 'B', 'C', 'D', 'E', 'F'].map(sec => <option key={sec} value={sec}>Sec {sec}</option>)}
            </select>

            <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
            >
                <option value="All">All Groups</option>
                <option value="Science">Science</option>
                <option value="Business Studies">Business</option>
                <option value="Humanities">Humanities</option>
            </select>
        </div>
    );

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-4 relative">
            {/* ... Discovery Hint ... */}
            <AnimatePresence>
                {showDiscoveryHint && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, x: 20 }}
                        animate={{ opacity: 1, y: 0, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="md:hidden absolute top-12 right-2 z-50 w-[250px]"
                    >
                        <div className="relative bg-indigo-600 text-white text-xs p-3 rounded-lg shadow-xl border border-indigo-400/30">
                            <button onClick={() => setShowDiscoveryHint(false)} className="absolute top-1 right-1 text-indigo-200 hover:text-white"><X size={12} /></button>
                            <div className="flex gap-2">
                                <Sparkles className="w-4 h-4 text-yellow-300 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold mb-1">Explore & Filter</p>
                                    <p className="leading-relaxed opacity-90">Tap filters to sort by marks, check sections, and more!</p>
                                </div>
                            </div>
                            <div className="absolute -top-1.5 right-6 w-3 h-3 bg-indigo-600 rotate-45"></div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header: Tabs + Search + Desktop Filters + Mobile Filter Button */}
            <div className="flex flex-col gap-3">
                <div className="flex gap-3 items-center justify-between">
                    {/* Tabs */}
                    <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 shrink-0">
                        <button
                            onClick={() => setViewMode('results')}
                            className={`px-3 md:px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'results' ? 'bg-white dark:bg-zinc-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                        >
                            Results
                        </button>
                        <button
                            onClick={() => setViewMode('analytics')}
                            className={`px-3 md:px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'analytics' ? 'bg-white dark:bg-zinc-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                        >
                            Analytics
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm shadow-sm"
                        />
                    </div>

                    {/* Mobile Filter Button (Visible only on mobile) */}
                    <button
                        onClick={() => {
                            setIsMenuOpen(true);
                            setShowDiscoveryHint(false);
                        }}
                        className="md:hidden flex items-center gap-2 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm relative shrink-0"
                    >
                        <Filter size={20} />
                        {(selectedSession !== 'All' || selectedGroup !== 'All' || selectedSection !== 'All') && (
                            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white dark:border-zinc-900"></span>
                        )}
                    </button>
                </div>

                {/* Desktop Filters (Visible only on Desktop) */}
                <DesktopFilters />
            </div>

            {/* Mobile Filter Modal (Same as before) */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden" />
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[320px] bg-white dark:bg-zinc-950 z-[70] shadow-2xl border-l border-zinc-200 dark:border-zinc-800 md:hidden"
                        >
                            <div className="p-5 flex flex-col h-full">
                                <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                                    <h2 className="text-xl font-display font-bold text-zinc-900 dark:text-zinc-100">Filters</h2>
                                    <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"><X size={20} /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Exam</label>
                                            <select value={selectedExam || ''} onChange={(e) => setSelectedExam(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20">
                                                {exams.map(exam => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sort</label>
                                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20">
                                                    <option value="gpa">Best GPA</option>
                                                    <option value="marks">Highest Marks</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Section</label>
                                                <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20">
                                                    <option value="All">All</option>
                                                    {['A', 'B', 'C', 'D', 'E', 'F'].map(sec => <option key={sec} value={sec}>{sec}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Group</label>
                                            <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20">
                                                <option value="All">All Groups</option>
                                                <option value="Science">Science</option>
                                                <option value="Business Studies">Business</option>
                                                <option value="Humanities">Humanities</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Session</label>
                                            <select value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20">
                                                <option value="All">All Sessions</option>
                                                {sessions.map((sess, idx) => <option key={idx} value={sess}>{sess}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                    <button onClick={() => setIsMenuOpen(false)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-transform">Apply Filters</button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {viewMode === 'results' ? (
                    filteredStudents.length > 0 ? (
                        <MeritList
                            students={filteredStudents}
                            onStudentClick={setSelectedStudent}
                        />
                    ) : (
                        <div className="p-8 text-center text-zinc-500 flex flex-col items-center justify-center h-full">
                            <p>No results found for these filters.</p>
                        </div>
                    )
                ) : (
                    <AnalyticsView examId={selectedExam} />
                )}
            </div>

            <ResultModal student={selectedStudent} isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} />
        </div>
    );
};

export default ResultsView;
