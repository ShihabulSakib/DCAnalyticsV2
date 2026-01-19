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
import { fetchResult, fetchExams } from '../api';

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

    // Exam Selection State
    const [selectedExam, setSelectedExam] = useState(null);
    const [exams, setExams] = useState([]);

    // 1. Load Exams on Mount
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const examsRes = await fetchExams();
                setExams(examsRes.data);

                // Default to latest exam
                let initialExamId = null;
                if (examsRes.data.length > 0) {
                    initialExamId = examsRes.data[examsRes.data.length - 1].id;
                    setSelectedExam(initialExamId);
                }

                // If we have a user and an exam, load their result immediately
                if (user?.roll && initialExamId) {
                    const res = await fetchResult(user.roll, initialExamId);
                    setStudentA(processData(res.data));
                } else if (!user?.roll) {
                    // If no user roll (admin view maybe?), just stop loading
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                setError('Could not load initial data.');
            } finally {
                if (!user?.roll) setLoading(false);
            }
        };
        loadInitialData();
    }, [user]);

    // 2. Reload Student A (My Result) when selected exam changes
    useEffect(() => {
        const updateStudentA = async () => {
            if (!user?.roll || !selectedExam) {
                setLoading(false);
                return;
            }

            // Don't show global loading for switch, maybe just chart opacity?
            // But let's keep it simple for now or use a local loading state if needed.
            try {
                const res = await fetchResult(user.roll, selectedExam);
                setStudentA(processData(res.data));
            } catch (err) {
                console.error("Failed to update my result", err);
                setStudentA(null);
                // Don't set global error here to avoid blocking UI, just show empty A
            } finally {
                setLoading(false);
            }
        };

        // Only run this if we've passed initial loading
        updateStudentA();
    }, [selectedExam, user]);

    const processData = (data) => {
        return {
            name: data.student.name || data.student.roll,
            roll: data.student.roll,
            subjects: data.subjects.map(s => s.subject_name),
            marks: data.subjects.map(s => s.total || 0),
            fullData: data.subjects
        };
    };

    const handleSearch = async () => {
        if (!searchQuery || !selectedExam) return;
        setSearchLoading(true);
        setError('');
        try {
            const res = await fetchResult(searchQuery, selectedExam, user?.roll);
            setStudentB(processData(res.data));
        } catch (err) {
            console.error(err);
            setError('Student not found or no result for this exam.');
            setStudentB(null);
        } finally {
            setSearchLoading(false);
        }
    };

    const labels = studentA?.subjects || [];

    // Map Student B to Student A's labels
    const studentBmarks = studentB ? labels.map(label => {
        const subject = studentB.fullData.find(s => s.subject_name === label);
        return subject ? subject.total : 0;
    }) : [];

    // Dynamic Scale Calculation
    const allMarks = [
        ...(studentA?.marks || []),
        ...(studentB ? studentBmarks : [])
    ];
    const maxMark = Math.max(...allMarks, 0);
    // If maxMark is low (e.g. 15), scale to 20. If 80, scale to 100.
    const chartMax = maxMark > 0 ? Math.ceil(maxMark * 1.1) : 100;

    const data = {
        labels: labels,
        datasets: [
            studentA && {
                label: studentA.name,
                data: studentA.marks,
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: '#6366f1',
                borderWidth: 2,
                pointBackgroundColor: '#6366f1',
            },
            studentB && {
                label: studentB.name,
                data: studentBmarks,
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                borderColor: '#ef4444',
                borderWidth: 2,
                pointBackgroundColor: '#ef4444',
            }
        ].filter(Boolean),
    };

    const chartOptions = {
        maintainAspectRatio: false,
        scales: {
            r: {
                min: 0,
                max: chartMax,
                ticks: { display: false },
                pointLabels: {
                    font: { size: 12, weight: 'bold' },
                    color: '#6b7280' // zinc-500
                },
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                angleLines: { color: 'rgba(0, 0, 0, 0.05)' }
            }
        },
        plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
        }
    };

    if (loading && !exams.length) {
        return <div className="p-8 text-center text-zinc-500 animate-pulse">Loading comparison...</div>;
    }

    if (!studentA && !loading && user?.roll) {
        // Show specific message if student has no result for selected exam
        return (
            <div className="p-4 md:p-8 h-full flex flex-col items-center justify-center gap-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg flex items-center gap-2">
                    <AlertCircle size={20} />
                    <p>No result found for you in this exam.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Select Exam:</span>
                    <select
                        value={selectedExam || ''}
                        onChange={(e) => setSelectedExam(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                    >
                        {exams.map(exam => (
                            <option key={exam.id} value={exam.id}>{exam.name}</option>
                        ))}
                    </select>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 h-full flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold font-display text-zinc-900 dark:text-zinc-100">Versus Mode</h2>

                <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
                    {/* Exam Dropdown */}
                    <select
                        value={selectedExam || ''}
                        onChange={(e) => {
                            setSelectedExam(e.target.value);
                            setStudentB(null);
                        }}
                        className="w-full md:w-48 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm shadow-sm"
                    >
                        {exams.map(exam => (
                            <option key={exam.id} value={exam.id}>{exam.name}</option>
                        ))}
                    </select>

                    <div className="flex items-center gap-2 w-full md:w-auto relative">
                        <input
                            type="text"
                            placeholder="Compare with Roll..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            className="flex-1 md:w-48 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm pl-9"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                        <button
                            onClick={handleSearch}
                            disabled={searchLoading || !selectedExam}
                            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            {searchLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 px-4 py-2 rounded-lg text-sm flex items-center gap-2 w-fit">
                    <AlertCircle size={14} /> {error}
                </div>
            )}

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                {/* Radar Chart - Scaled Up */}
                <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="w-full aspect-square md:h-full md:max-h-[500px]">
                        <Radar data={data} options={chartOptions} />
                    </div>
                </div>

                {/* Diff Table */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider m-4 pl-2">Score Differential</h3>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 font-medium border-b border-zinc-100 dark:border-zinc-800">
                                <tr>
                                    <th className="px-6 py-3">Subject</th>
                                    <th className="px-6 py-3">{studentA?.name?.split(' ')[0] || 'You'}</th>
                                    <th className="px-6 py-3">{studentB ? studentB.name.split(' ')[0] : 'Opponent'}</th>
                                    <th className="px-6 py-3 text-right">Diff</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {labels.map((subj, idx) => {
                                    const markA = studentA?.marks[idx] || 0;
                                    const markB = studentBmarks[idx] || 0;
                                    const diff = markA - markB;
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
