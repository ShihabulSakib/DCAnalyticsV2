import React, { useState, useEffect } from 'react';
import { Search, Filter, Menu, X, ArrowDownWideNarrow, Layers, Sparkles } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import MeritList from './MeritList';
import ResultModal from './ResultModal';
import AnalyticsView from './AnalyticsView';
import Skeleton from './Skeleton';
import Dropdown from './Dropdown';
import { fetchExams, fetchMeritList, fetchSessions } from '../api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import dataLoader, { USE_JSON_DATA } from '../services/dataLoader';

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

const parseStudentRoll = (roll) => {
    const rollStr = String(roll);
    if (!roll || rollStr.length < 10) return { session: 'All', group: 'All', section: 'All' };

    const sessionPart = rollStr.substring(1, 7);
    const groupPart = rollStr.substring(7, 10);

    const session = `${sessionPart.substring(0, 4)}-20${sessionPart.substring(4, 6)}`;

    let group = 'All';
    if (groupPart === '010') group = 'Science';
    else if (groupPart === '020') group = 'Business Studies';
    else if (groupPart === '030') group = 'Humanities';

    const section = getSectionFromRoll(roll);

    return { session, group, section };
};

const ResultsView = () => {
    const { user, isAdmin } = useAuth();
    const outletCtx = useOutletContext();
    const menuHintDismissed = outletCtx?.menuHintDismissed;

    const [viewMode, setViewMode] = useState('results');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [students, setStudents] = useState([]);
    const [exams, setExams] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [selectedExam, setSelectedExam] = useState(null);

    // Active Filters
    // Active Filters with Lazy Initialization based on User
    const [selectedSession, setSelectedSession] = useState(() => {
        if (user && user.roll) {
            return parseStudentRoll(user.roll).session;
        }
        return 'All';
    });

    const [selectedGroup, setSelectedGroup] = useState(() => {
        if (user && user.roll) {
            return parseStudentRoll(user.roll).group;
        }
        return 'All';
    });

    const [sortBy, setSortBy] = useState('gpa');

    const [selectedSection, setSelectedSection] = useState('All'); // Always default to All per request

    // Temporary Filters (for Mobile Menu)
    const [tempFilters, setTempFilters] = useState({
        sortBy: 'gpa',
        section: 'All',
        group: 'All',
        session: 'All'
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Mobile Menu State
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showDiscoveryHint, setShowDiscoveryHint] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.matchMedia('(max-width: 767px)').matches);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // 1. Initial Load: Sessions & Admin Defaults
    useEffect(() => {
        loadInitialData();
    }, []);

    // 3. Hints Logic
    useEffect(() => {
        if (menuHintDismissed) {
            const filterSeen = localStorage.getItem('filterHintSeen');
            if (!filterSeen) {
                const timer = setTimeout(() => setShowDiscoveryHint(true), 500);
                return () => clearTimeout(timer);
            }
        }
    }, [menuHintDismissed]);

    const handleDismissFilterHint = () => {
        setShowDiscoveryHint(false);
        localStorage.setItem('filterHintSeen', 'true');
    };

    // 4. Fetch Exams when Session or Group changes
    useEffect(() => {
        console.log('Fetching exams for session:', selectedSession, 'and group:', selectedGroup);
        if (selectedSession && selectedGroup) {
            loadExams(selectedSession, selectedGroup);
        }
    }, [selectedSession, selectedGroup]);

    // 5. Fetch Merit List when Exam or Filters change
    useEffect(() => {
        if (selectedExam) {
            loadMeritList();
        } else {
            setStudents([]); // Clear list if no exam selected
        }
    }, [selectedExam, selectedSession, selectedGroup, sortBy, selectedSection]);

    const loadInitialData = async () => {
        try {
            const sessionsRes = await fetchSessions();
            const sessionsList = sessionsRes.data;
            setSessions(sessionsList);

            // Admin Default Filter Logic
            // Only runs if admin is logged in. 
            // Setting state here triggers the loadExams useEffect.
            if (isAdmin() && sessionsList.length > 0) {
                const sortedSessions = [...sessionsList].sort().reverse();
                if (sortedSessions.length > 0) {
                    setSelectedSession(sortedSessions[0]);
                }
                setSelectedGroup('Science');
            }
        } catch (err) {
            console.error('Failed to load sessions:', err);
        }
    };

    const loadExams = async (session, group) => {
        setLoading(true);
        try {
            // Use passed arguments or fallback to state (though args should always be passed now)
            const currentSession = session || selectedSession;
            const currentGroup = group || selectedGroup;

            console.log(`[ResultsView] Fetching exams for Session: ${currentSession}, Group: ${currentGroup}`);
            const response = await fetchExams(currentSession, currentGroup);
            const examsList = response.data;

            if (Array.isArray(examsList)) {
                setExams(examsList);

                // Smart Selection Logic:
                // 1. If currently selected exam exists in new list, keep it.
                // 2. Else, select the latest one from the new list.
                if (examsList.length > 0) {
                    const currentExists = examsList.find(e => e.exam_id_text === selectedExam);
                    if (!currentExists) {
                        setSelectedExam(examsList[0].exam_id_text);
                    }
                } else {
                    setSelectedExam(null);
                }
            } else {
                setExams([]);
                setSelectedExam(null);
            }
        } catch (err) {
            console.error('Failed to load exams:', err);
            setExams([]);
        } finally {
            setLoading(false);
        }
    };

    const loadMeritList = async () => {
        if (!selectedExam) return;
        setLoading(true);
        setError('');

        try {
            // Use JSON data loader if enabled
            if (USE_JSON_DATA) {
                console.log(`[ResultsView] Loading merit list via JSON for exam ${selectedExam}`);
                const meritData = await dataLoader.loadMeritList(selectedExam);

                // Transform JSON format to component format
                let transformedStudents = meritData.students.map(s => ({
                    position: s.pos,
                    roll: s.id,
                    name: s.n,
                    gpa: s.gpa,
                    total_marks: s.tot,
                    status: s.st,
                    photo_url: `/api/student-image/${s.id}`,
                    transcript_url: s.tl,
                    section: getSectionFromRoll(s.id),
                    group: s.g,
                    session: s.s
                }));

                // Apply client-side filters
                transformedStudents = filterAndSortStudents(transformedStudents, {
                    session: selectedSession,
                    group: selectedGroup,
                    section: selectedSection,
                    sortBy
                });

                setStudents(transformedStudents);
                setError('');
            } else {
                // Fallback to API
                console.log('[ResultsView] Using API fallback');
                const response = await fetchMeritList(sortBy, selectedSection, selectedExam, selectedSession, selectedGroup);
                setStudents(response.data);
                setError('');
            }
        } catch (err) {
            console.error('Failed to load from JSON, trying API fallback:', err);

            // Fallback to API if JSON fails
            try {
                const response = await fetchMeritList(sortBy, selectedSection, selectedExam, selectedSession, selectedGroup);
                setStudents(response.data);
                setError('');
            } catch (apiErr) {
                console.error('API fallback also failed:', apiErr);
                setError('Failed to load results.');
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * Client-side filter and sort function (fast, no network calls)
     */
    const filterAndSortStudents = (students, filters) => {
        let filtered = [...students];

        if (filters.session && filters.session !== 'All') {
            filtered = filtered.filter(s => s.session === filters.session);
        }

        if (filters.group && filters.group !== 'All') {
            filtered = filtered.filter(s => s.group === filters.group);
        }

        if (filters.section && filters.section !== 'All') {
            filtered = filtered.filter(s => s.section === filters.section);
        }

        // Sort
        if (filters.sortBy === 'gpa') {
            filtered.sort((a, b) => (b.gpa || 0) - (a.gpa || 0) || (b.total_marks || 0) - (a.total_marks || 0));
        } else {
            filtered.sort((a, b) => (b.total_marks || 0) - (a.total_marks || 0) || (b.gpa || 0) - (a.gpa || 0));
        }

        // Recalculate positions after filtering
        return filtered.map((s, idx) => ({ ...s, position: idx + 1 }));
    };

    const handleOpenMenu = () => {
        // Initialize temp filters with current active values
        setTempFilters({
            sortBy,
            section: selectedSection,
            group: selectedGroup,
            session: selectedSession
        });
        setIsMenuOpen(true);
        handleDismissFilterHint();
    };

    const handleApplyFilters = () => {
        setSortBy(tempFilters.sortBy);
        setSelectedSection(tempFilters.section);
        setSelectedGroup(tempFilters.group);
        setSelectedSession(tempFilters.session);
        setIsMenuOpen(false);
    };

    const filteredStudents = students.filter(s =>
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(s.roll).includes(searchQuery)
    );

    if (loading && !selectedExam && exams.length === 0) {
        // Only show full page skeleton if we have NO data at all
        // AND we are waiting for initial load.
        return (
            <div className="h-[calc(100vh-6rem)] flex flex-col gap-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-[calc(100vh-12rem)] w-full" />
            </div>
        );
    }

    // Transform Data for Dropdowns
    const examOptions = exams.map(e => ({ value: e.exam_id_text, label: e.name }));
    const sortOptions = [
        { value: 'gpa', label: 'Rank by GPA' },
        { value: 'marks', label: 'Rank by Marks' }
    ];
    const sectionOptions = [
        { value: 'All', label: 'All Sections' },
        ...['A', 'B', 'C', 'D', 'E', 'F'].map(s => ({ value: s, label: `Sec ${s}` }))
    ];
    const groupOptions = [
        { value: 'All', label: 'All Groups' },
        { value: 'Science', label: 'Science' },
        { value: 'Business Studies', label: 'Business' },
        { value: 'Humanities', label: 'Humanities' }
    ];
    const sessionOptions = [
        { value: 'All', label: 'All Sessions' },
        ...sessions.map(s => ({ value: s, label: s }))
    ];

    // Desktop Filter Component
    const DesktopFilters = () => (
        <div className="hidden md:flex flex-wrap items-center gap-2">
            <Dropdown
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                options={sessionOptions}
                className="w-40"
            />
            <Dropdown
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                options={groupOptions}
                className="w-40"
            />
            <Dropdown
                value={selectedExam || ''}
                onChange={(e) => setSelectedExam(e.target.value)}
                options={examOptions}
                className="w-48"
            />
            <Dropdown
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={sortOptions}
                className="w-40"
            />
            <Dropdown
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                options={sectionOptions}
                className="w-36"
            />
        </div>
    );

    return (
        <div className="h-[calc(100vh-5rem)] flex flex-col gap-2 pt-2 pb-4">
            {/* Controls Header */}
            <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
                {/* Tabs */}
                <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 shrink-0 self-start">
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

                {/* Search Bar & Mobile Filter - Only in Results mode */}
                {viewMode === 'results' && (
                <div className="flex gap-2 w-full md:w-auto md:flex-1 md:max-w-md">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm shadow-sm"
                        />
                    </div>

                    {/* Mobile Filter Button */}
                    <div className="relative">
                        <button
                            onClick={handleOpenMenu}
                            className="md:hidden flex items-center gap-2 p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm relative shrink-0"
                        >
                            <Filter size={20} />
                            {(selectedSession !== 'All' || selectedGroup !== 'All' || selectedSection !== 'All') && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-white dark:border-zinc-900"></span>
                            )}
                        </button>

                        <AnimatePresence>
                            {showDiscoveryHint && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="md:hidden absolute top-12 right-0 z-40 w-[240px]"
                                >
                                    <div className="relative bg-indigo-600 text-white text-xs p-3 rounded-lg shadow-xl border border-indigo-400/30">
                                        <button onClick={handleDismissFilterHint} className="absolute top-1 right-1 text-indigo-200 hover:text-white"><X size={12} /></button>
                                        <div className="flex gap-2">
                                            <Filter className="w-4 h-4 text-indigo-200 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="font-bold mb-1">Advanced Filters</p>
                                                <p className="leading-relaxed opacity-90">Tap here to sort by Marks, filter by Section, Group, or Session.</p>
                                            </div>
                                        </div>
                                        <div className="absolute -top-1.5 right-4 w-3 h-3 bg-indigo-600 rotate-45"></div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                )}

                {/* Desktop Filters (Visible only on Desktop) */}
                {viewMode === 'results' && <DesktopFilters />}
            </div>

            {/* Mobile Filter Modal */}
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

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Sort</label>
                                                <select
                                                    value={tempFilters.sortBy}
                                                    onChange={(e) => setTempFilters({ ...tempFilters, sortBy: e.target.value })}
                                                    className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                >
                                                    <option value="gpa">Best GPA</option>
                                                    <option value="marks">Highest Marks</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Section</label>
                                                <select
                                                    value={tempFilters.section}
                                                    onChange={(e) => setTempFilters({ ...tempFilters, section: e.target.value })}
                                                    className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                >
                                                    <option value="All">All</option>
                                                    {['A', 'B', 'C', 'D', 'E', 'F'].map(sec => <option key={sec} value={sec}>{sec}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Group</label>
                                            <select
                                                value={tempFilters.group}
                                                onChange={(e) => setTempFilters({ ...tempFilters, group: e.target.value })}
                                                className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            >
                                                <option value="All">All Groups</option>
                                                <option value="Science">Science</option>
                                                <option value="Business Studies">Business</option>
                                                <option value="Humanities">Humanities</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Session</label>
                                            <select
                                                value={tempFilters.session}
                                                onChange={(e) => setTempFilters({ ...tempFilters, session: e.target.value })}
                                                className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            >
                                                <option value="All">All Sessions</option>
                                                {sessions.map((sess, idx) => <option key={idx} value={sess}>{sess}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                    <button onClick={handleApplyFilters} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-transform">Apply Filters</button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm overflow-hidden relative flex flex-col">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center backdrop-blur-[1px]">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                {/* Mobile Exam Select (Visible on Mobile only, at the top of Result tab) */}
                {viewMode === 'results' && (
                    <div className="md:hidden p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <select
                            value={selectedExam || ''}
                            onChange={(e) => setSelectedExam(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm"
                        >
                            {exams.map(exam => <option key={exam.id} value={exam.exam_id_text}>{exam.name}</option>)}
                        </select>
                    </div>
                )}

                {/* Animated View Transition */}
                <AnimatePresence mode="wait">
                    {viewMode === 'results' ? (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="flex-1 min-h-0 flex flex-col"
                        >
                            {filteredStudents.length > 0 ? (
                                <div className="flex-1 min-h-0">
                                    <MeritList
                                        students={filteredStudents}
                                        onStudentClick={setSelectedStudent}
                                        sortBy={sortBy}
                                    />
                                </div>
                            ) : (
                                <div className="p-8 text-center text-zinc-500 flex flex-col items-center justify-center h-full">
                                    <p>No results found for these filters.</p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="analytics"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="flex-1 min-h-0"
                        >
                            <AnalyticsView examId={selectedExam} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <ResultModal student={selectedStudent} examId={selectedExam} isOpen={!!selectedStudent} onClose={() => setSelectedStudent(null)} />
        </div>
    );
};

export default ResultsView;