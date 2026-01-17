import React, { useState } from 'react';
import { Radar } from 'react-chartjs-2';
import { Search, ArrowRightLeft } from 'lucide-react';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

const CompareView = () => {
    const [studentA, setStudentA] = useState({ name: 'Me (Shanto)', gpa: 4.8, marks: [80, 85, 90, 75, 88] });
    const [studentB, setStudentB] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Dummy search
    const handleSearch = () => {
        if (!searchQuery) return;
        setStudentB({ name: 'Student B', gpa: 4.5, marks: [70, 82, 85, 80, 78] });
    };

    const data = {
        labels: ['Bangla', 'English', 'Physics', 'Chemistry', 'Biology'],
        datasets: [
            {
                label: studentA.name,
                data: studentA.marks,
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: '#6366f1',
                borderWidth: 2,
            },
            studentB && {
                label: studentB.name,
                data: studentB.marks,
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                borderColor: '#ef4444',
                borderWidth: 2,
            }
        ].filter(Boolean),
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col gap-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold font-display text-zinc-900 dark:text-zinc-100">Versus Mode</h2>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <input
                        type="text"
                        placeholder="Compare with Roll..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 md:w-64 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                    />
                    <button onClick={handleSearch} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                        <Search size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 min-h-0">
                {/* Radar Chart */}
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center">
                    <div className="w-full h-full max-h-[500px]">
                        <Radar data={data} options={{ maintainAspectRatio: false, scales: { r: { min: 0, max: 100 } } }} />
                    </div>
                </div>

                {/* Diff Table */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
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
                            {['Bangla', 'English', 'Physics', 'Chemistry', 'Biology'].map((subj, idx) => {
                                const markA = studentA.marks[idx];
                                const markB = studentB ? studentB.marks[idx] : 0;
                                const diff = markA - markB;
                                return (
                                    <tr key={subj} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                        <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{subj}</td>
                                        <td className="px-6 py-4 text-indigo-600 font-mono">{markA}</td>
                                        <td className="px-6 py-4 text-red-600 font-mono">{studentB ? markB : '-'}</td>
                                        <td className={`px-6 py-4 text-right font-mono font-bold ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                                            {studentB ? (diff > 0 ? `+${diff}` : diff) : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CompareView;
