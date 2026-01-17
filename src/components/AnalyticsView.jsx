import React from 'react';
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

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const AnalyticsView = () => {
    // Dummy Data
    const barData = {
        labels: ['Science', 'Arts', 'Commerce'],
        datasets: [
            {
                label: 'Average GPA',
                data: [4.5, 3.8, 4.1],
                backgroundColor: 'rgba(99, 102, 241, 0.5)', // Indigo-500
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1,
            },
        ],
    };

    const pieData = {
        labels: ['A+', 'A', 'A-', 'B', 'C', 'F'],
        datasets: [
            {
                data: [120, 150, 80, 40, 20, 10],
                backgroundColor: [
                    '#4ade80', // Green
                    '#a3e635', // Lime
                    '#facc15', // Yellow
                    '#fb923c', // Orange
                    '#f87171', // Red-400
                    '#ef4444', // Red-500
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

            {/* Additional Placeholder Stats */}
            <div className="md:col-span-2 bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-200">Insight</h4>
                <p className="text-indigo-700 dark:text-indigo-300 mt-2">
                    Science group has improved by 0.5 GPA compared to last semester.
                </p>
            </div>
        </div>
    );
};

export default AnalyticsView;
