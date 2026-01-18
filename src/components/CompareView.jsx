import React, { useState, useEffect } from 'react';
import { Radar } from 'react-chartjs-2';
import { Search, AlertCircle } from 'lucide-react';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import { fetchResult } from '../api';

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

const CompareView = () => {
    const { user } = useAuth();
    const [studentA, setStudentA] = useState(null);
    const [studentB, setStudentB] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadMyResult = async () => {
            if (!user?.roll) return;
            try {
                const res = await fetchResult(user.roll);
                setStudentA(processData(res.data));
            } catch (err) {
                console.error(err);
                setError('Could not load your result.');
            } finally {
                setLoading(false);
            }
        };
        loadMyResult();
    }, [user]);

    const processData = (data) => {
        return {
            name: data.student.name || data.student.roll,
            roll: data.student.roll,
            subjects: data.subjects.map(s => s.subject_name),
            marks: data.subjects.map(s => s.total || 0), // Assuming total is the mark
            fullData: data.subjects
        };
    };

    const handleSearch = async () => {
        if (!searchQuery) return;
        setSearchLoading(true);
        setError('');
        try {
            // Pass current user's roll as accessor for logging purposes
            const res = await fetchResult(searchQuery, null, user?.roll);
            setStudentB(processData(res.data));
        } catch (err) {
            console.error(err);
            setError('Student not found or no result available.');
            setStudentB(null);
        } finally {
            setSearchLoading(false);
        }
    };

    // Prepare Chart Data
    // We use Student A's subjects as the base labels. 
    // If Student B has different subjects (unlikely in same exam), it might look weird, but acceptable for now.
    const labels = studentA?.subjects || [];
    
    // Map Student B's marks to Student A's subject order to ensure correct alignment
    const studentBmarks = studentB ? labels.map(label => {
        const subject = studentB.fullData.find(s => s.subject_name === label);
        return subject ? subject.total : 0;
    }) : [];

    const data = {
        labels: labels,
        datasets: [
            studentA && {
                label: studentA.name,
                data: studentA.marks,
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: '#6366f1',
                borderWidth: 2,
            },
            studentB && {
                label: studentB.name,
                data: studentBmarks,
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                borderColor: '#ef4444',
                borderWidth: 2,
            }
        ].filter(Boolean),
    };

    if (loading) {
        return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading comparison...</div>;
    }

    if (!studentA) {
        return <div className="p-8 text-center text-zinc-500">No result data found for you.</div>;
    }

    return (
        <div className="p-4 md:p-8 h-full flex flex-col gap-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold font-display text-zinc-900 dark:text-zinc-100">Versus Mode</h2>
                
                <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <input
                            type="text"
                            placeholder="Compare with Roll..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="flex-1 md:w-64 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                        <button 
                            onClick={handleSearch} 
                            disabled={searchLoading}
                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            {searchLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Search size={20} />}
                        </button>
                    </div>
                    {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/> {error}</p>}
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 min-h-0">
                {/* Radar Chart */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center">
                    <div className="w-full h-full max-h-[500px]">
                        <Radar data={data} options={{ maintainAspectRatio: false, scales: { r: { min: 0, max: 100, ticks: { display: false } } }, plugins: { legend: { position: 'bottom' } } }} />
                    </div>
                </div>

                {/* Diff Table */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Subject</th>
                                    <th className="px-6 py-3">{studentA.name}</th>
                                    <th className="px-6 py-3">{studentB ? studentB.name : 'Compare'}</th>
                                    <th className="px-6 py-3 text-right">Diff</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {labels.map((subj, idx) => {
                                    const markA = studentA.marks[idx];
                                    const markB = studentBmarks[idx] || 0;
                                    const diff = markA - markB;
                                    
                                    // Don't show diff if student B isn't loaded
                                    const showDiff = !!studentB;

                                    return (
                                        <tr key={subj} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{subj}</td>
                                            <td className="px-6 py-4 text-indigo-600 font-mono font-bold">{markA}</td>
                                            <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 font-mono">{showDiff ? markB : '-'}</td>
                                            <td className={`px-6 py-4 text-right font-mono font-bold ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                                                {showDiff ? (diff > 0 ? `+${diff}` : diff) : '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompareView;