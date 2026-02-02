
import React, { useState, useEffect } from 'react';
import { fetchResult, fetchAnalytics, fetchMeritList, fetchExams } from '../api';
import ResultCard from './ResultCard';
import TranscriptTable from './TranscriptTable';
import AnalyticsCharts from './AnalyticsCharts';
import MeritList from './MeritList';
import Navbar from './Navbar';
import { Search, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function Dashboard({ toggleTheme, isDark, currentUser, onLogout }) {
    const navigate = useNavigate();
    const [exams, setExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState(null);

    const [searchRoll, setSearchRoll] = useState('');
    const [result, setResult] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [meritList, setMeritList] = useState([]);

    const [sortBy, setSortBy] = useState('gpa');
    const [sectionFilter, setSectionFilter] = useState('All');
    const [highlightRoll, setHighlightRoll] = useState(null);

    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(true);

    // Load Exams on Mount
    useEffect(() => {
        loadExams();
    }, []);

    // Load Data when Exam Changes
    useEffect(() => {
        if (selectedExam) {
            loadAnalytics(selectedExam);
            loadMeritList(selectedExam, sortBy, sectionFilter);
            if (searchRoll) {
                performSearch(searchRoll, selectedExam);
            } else {
                setResult(null);
                setShowAnalytics(true);
            }
        }
    }, [selectedExam]);

    // Handle Sort/Filter Changes
    useEffect(() => {
        if (selectedExam) {
            loadMeritList(selectedExam, sortBy, sectionFilter);
        }
    }, [sortBy, sectionFilter]);

    const loadExams = async () => {
        try {
            const response = await fetchExams();
            setExams(response.data);
            if (response.data.length > 0) {
                setSelectedExam(response.data[0].id);
            }
        } catch (err) {
            console.error("Failed to load exams", err);
        }
    };

    const loadAnalytics = async (examId) => {
        try {
            const response = await fetchAnalytics(examId);
            setAnalytics(response.data);
        } catch (err) {
            console.error("Failed to load analytics", err);
        }
    };

    const loadMeritList = async (examId, sort, section) => {
        try {
            const response = await fetchMeritList(sort, section, examId);
            setMeritList(response.data);
        } catch (err) {
            console.error("Failed to load merit list", err);
        }
    };

    const handleSearch = async (e) => {
        e && e.preventDefault();
        if (!searchRoll) return;
        performSearch(searchRoll, selectedExam);
    };

    const performSearch = async (roll, examId) => {
        if (!examId) {
            setError("Please select an exam first.");
            return;
        }
        setLoading(true);
        setError(null);
        setResult(null);
        setShowAnalytics(false);

        try {
            const response = await fetchResult(roll, examId, currentUser);
            setResult(response.data);
            setSearchRoll(roll);
            setHighlightRoll(roll);
        } catch (err) {
            console.error(err);
            setError("Result not found for this Roll Number in selected exam.");
            setResult(null);
        } finally {
            setLoading(false);
        }
    };

    const handleReturnToAnalytics = () => {
        setResult(null);
        setShowAnalytics(true);
        setHighlightRoll(null);
        setSearchRoll('');
    };

    const handleLogout = () => {
        // In a real app, clear auth token
        navigate('/');
    };

    const currentExamName = exams.find(e => e.id === selectedExam)?.name || 'Loading...';

    return (
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text transition-colors duration-300 font-sans">
            <Navbar
                toggleTheme={toggleTheme}
                isDark={isDark}
                exams={exams}
                selectedExam={selectedExam}
                onExamChange={setSelectedExam}
                onLogout={handleLogout}
            />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

                {/* Helper/Hero Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleReturnToAnalytics}
                            className={`p-3 rounded-xl transition-colors ${showAnalytics ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200'}`}
                            title="Analytics Dashboard"
                        >
                            <img src="/file.svg" alt="DCAnalytics Logo" className="h-[60px] w-[60px]" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold font-display text-gray-900 dark:text-white">
                                {showAnalytics ? 'Dashboard' : 'Student Result'}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{currentExamName}</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80">
                            <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Enter Roll Number..."
                                className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-medium shadow-sm"
                                value={searchRoll}
                                onChange={(e) => setSearchRoll(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 font-semibold transition-colors shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-50"
                            disabled={loading || !selectedExam}
                        >
                            {loading ? '...' : 'Search'}
                        </button>
                    </form>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium border border-red-100 dark:border-red-900/30 animate-pulse">
                        {error}
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Column (8 cols) */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        {!showAnalytics && result ? (
                            <div className="animate-fade-in-up">
                                <ResultCard result={result.result} student={result.student} />
                                <TranscriptTable subjects={result.subjects} />
                            </div>
                        ) : (
                            <div className="h-full">
                                {analytics ? (
                                    <AnalyticsCharts
                                        analytics={analytics}
                                        examName={currentExamName}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-64 bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-gray-700">
                                        <div className="text-gray-400 animate-pulse">Loading Analytics...</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column (Merit List - 4 cols) */}
                    <div className="lg:col-span-4">
                        <MeritList
                            meritList={meritList}
                            onSelectStudent={(roll) => performSearch(roll, selectedExam)}
                            highlightRoll={highlightRoll}
                            sortBy={sortBy}
                            onSortChange={setSortBy}
                            sectionFilter={sectionFilter}
                            onSectionChange={setSectionFilter}
                        />

                        {/* Quick Stats */}
                        {analytics && (
                            <div className="mt-6 grid grid-cols-2 gap-4">
                                <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
                                    <div className="text-indigo-100 text-xs font-bold uppercase tracking-wider">Total Students</div>
                                    <div className="text-3xl font-bold mt-1">{analytics.total_students}</div>
                                    <div className="text-indigo-200 text-xs mt-1">in this exam</div>
                                </div>
                                <div className="bg-emerald-500 text-white p-4 rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none">
                                    <div className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Passed</div>
                                    <div className="text-3xl font-bold mt-1">
                                        {analytics.sections ? Object.values(analytics.sections).reduce((acc, sec) => acc + sec.passed, 0) : '-'}
                                    </div>
                                    <div className="text-emerald-100 text-xs mt-1">students</div>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}

export default Dashboard;
