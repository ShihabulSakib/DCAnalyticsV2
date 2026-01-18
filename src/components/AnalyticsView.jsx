import React, { useState, useEffect } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { fetchAnalytics } from '../api';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const AnalyticsView = ({ examId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (!examId) return;
            try {
                setLoading(true);
                const response = await fetchAnalytics(examId);
                setData(response.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [examId]);

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center h-full text-zinc-500 animate-pulse">
                Loading analytics...
            </div>
        );
    }

    // Process Data for Charts
    const groupLabels = Object.keys(data.gpa_by_group || {});
    const groupData = Object.values(data.gpa_by_group || {});

    const barData = {
        labels: groupLabels.length ? groupLabels : ['No Data'],
        datasets: [
            {
                label: 'Average GPA',
                data: groupData.length ? groupData : [0],
                backgroundColor: 'rgba(99, 102, 241, 0.5)', // Indigo-500
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
            },
        ],
    };

    const gradeOrder = ['A+', 'A', 'A-', 'B', 'C', 'D', 'F'];
    const gradeLabels = Object.keys(data.grade_distribution || {}).sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b));
    const gradeCounts = gradeLabels.map(g => data.grade_distribution[g]);

    const pieData = {
        labels: gradeLabels.length ? gradeLabels : ['No Data'],
        datasets: [
            {
                data: gradeCounts.length ? gradeCounts : [1],
                backgroundColor: [
                    '#4ade80', // Green (A+)
                    '#a3e635', // Lime (A)
                    '#facc15', // Yellow (A-)
                    '#fb923c', // Orange (B)
                    '#f87171', // Red-400 (C)
                    '#ef4444', // Red-500 (D/F)
                    '#9ca3af', // Gray (Unknown)
                ],
                borderWidth: 0,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: false },
        },
        maintainAspectRatio: false,
    };

    return (
        <div className="p-4 md:p-8 overflow-y-auto h-full grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* GPA Distribution Chart */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col h-80">
                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-4">AVG GPA by Group</h3>
                <div className="flex-1 min-h-0">
                    <Bar data={barData} options={options} />
                </div>
            </div>

            {/* Grade Distribution */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col h-80">
                <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100 mb-4">Grade Distribution</h3>
                <div className="flex-1 min-h-0 relative">
                    <Pie data={pieData} options={{ ...options, maintainAspectRatio: false }} />
                </div>
            </div>

            {/* Stats Summary */}
            <div className="md:col-span-2 bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-200">Exam Summary: {data.exam_name}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-center">
                     <div>
                        <p className="text-xs text-indigo-500 uppercase font-bold">Total Students</p>
                        <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{data.total_students}</p>
                     </div>
                     {/* Add more summary stats if needed */}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsView;