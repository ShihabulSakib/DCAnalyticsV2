import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import MeritList from './MeritList';
import ResultModal from './ResultModal';
import AnalyticsView from './AnalyticsView';
import Skeleton from './Skeleton';
import { fetchExams, fetchMeritList } from '../api';
import { useAuth } from '../context/AuthContext';

const ResultsView = () => {
    const [viewMode, setViewMode] = useState('results');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [students, setStudents] = useState([]);
    const [exams, setExams] = useState([]);
    const [selectedExam, setSelectedExam] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        loadExams();
    }, []);

    const loadExams = async () => {
        try {
            const response = await fetchExams();
            const examsList = response.data;
            setExams(examsList);
            if (examsList.length > 0) {
                // Auto-select the latest exam
                const latest = examsList[examsList.length - 1];
                setSelectedExam(latest.id);
                loadMeritList(latest.id);
            } else {
                setLoading(false);
            }
        } catch (err) {
            console.error('Failed to load exams:', err);
            setError('Failed to load exams. Please check backend connection.');
            setLoading(false);
        }
    };

    const loadMeritList = async (examId) => {
        setLoading(true);
        try {
            const response = await fetchMeritList('gpa', 'All', examId);
            setStudents(response.data);
            setError('');
        } catch (err) {
            console.error('Failed to load merit list:', err);
            setError('Failed to load results. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(s.roll).includes(searchQuery)
    );

    if (loading) {
        return (
            <div className="h-[calc(100vh-6rem)] flex flex-col gap-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-[calc(100vh-12rem)] w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[calc(100vh-6rem)] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <button
                        onClick={loadExams}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-4">
            {/* Controls Header */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                {/* Tabs */}
                <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <button
                        onClick={() => setViewMode('results')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'results' ? 'bg-white dark:bg-zinc-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                    >
                        Results
                    </button>
                    {/* Analytics disabled on mobile for now. Remove 'hidden md:inline-block' to enable on all devices. */}
                    <button
                        onClick={() => setViewMode('analytics')}
                        className={`hidden md:inline-block px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'analytics' ? 'bg-white dark:bg-zinc-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                    >
                        Analytics
                    </button>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search Roll or Name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800/50 shadow-sm overflow-hidden">
                {viewMode === 'results' ? (
                    filteredStudents.length > 0 ? (
                        <MeritList
                            students={filteredStudents}
                            onStudentClick={setSelectedStudent}
                        />
                    ) : (
                        <div className="p-8 text-center text-zinc-500">
                            No results found. Try adjusting your search.
                        </div>
                    )
                ) : (
                    <AnalyticsView examId={selectedExam} />
                )}
            </div>

            {/* Modal */}
            <ResultModal
                student={selectedStudent}
                isOpen={!!selectedStudent}
                onClose={() => setSelectedStudent(null)}
            />
        </div>
    );
};

export default ResultsView;
