import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import MeritList from './MeritList';
import ResultModal from './ResultModal';
import AnalyticsView from './AnalyticsView';

const ResultsView = () => {
    const [viewMode, setViewMode] = useState('results'); // 'results' | 'analytics'
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Dummy Data for now
    const dummyStudents = Array.from({ length: 1000 }, (_, i) => ({
        roll: 1000 + i,
        name: `Student Name ${i + 1}`,
        gpa: (Math.random() * 2 + 3).toFixed(2),
        photo_url: null,
        results: { original_pdf_url: "#" }
    }));

    // Filter Logic
    const filteredStudents = dummyStudents.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(s.roll).includes(searchQuery)
    );

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
                    <button
                        onClick={() => setViewMode('analytics')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'analytics' ? 'bg-white dark:bg-zinc-800 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
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
                    <MeritList
                        students={filteredStudents}
                        onStudentClick={setSelectedStudent}
                    />
                ) : (
                    <AnalyticsView />
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
