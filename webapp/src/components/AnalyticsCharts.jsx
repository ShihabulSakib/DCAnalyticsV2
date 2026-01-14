
import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

// Set Global Font
ChartJS.defaults.font.family = "'Inter', sans-serif";
ChartJS.defaults.color = "#94a3b8"; // slate-400

const AnalyticsCharts = ({ analytics, examName }) => {
    if (!analytics) return null;

    const subjectLabels = Object.keys(analytics.subjects);
    const passCounts = subjectLabels.map(sub => analytics.subjects[sub].passed);
    const failCounts = subjectLabels.map(sub => analytics.subjects[sub].failed);

    const subjectData = {
        labels: subjectLabels,
        datasets: [
            {
                label: "Passed",
                data: passCounts,
                backgroundColor: "rgba(16, 185, 129, 0.8)", // Emerald-500
                borderColor: "rgba(16, 185, 129, 1)",
                borderWidth: 1,
                borderRadius: 6,
                datalabels: {
                    color: 'white',
                    anchor: 'end',
                    align: 'top',
                    offset: -20,
                    font: { weight: 'bold' }
                }
            },
            {
                label: "Failed",
                data: failCounts,
                backgroundColor: "rgba(239, 68, 68, 0.8)", // Red-500
                borderColor: "rgba(239, 68, 68, 1)",
                borderWidth: 1,
                borderRadius: 6,
                datalabels: {
                    color: 'white',
                    anchor: 'end',
                    align: 'top',
                    offset: -20,
                    font: { weight: 'bold' }
                }
            }
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "top",
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: { size: 12 }
                }
            },
            title: {
                display: false,
            },
            datalabels: {
                display: (context) => {
                    return context.dataset.data[context.dataIndex] > 0; // Only show if > 0
                },
                formatter: (value) => value, // Show the number
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(226, 232, 240, 0.1)', // slate-200/10
                    borderDash: [5, 5]
                },
                border: { display: false }
            },
            x: {
                grid: { display: false },
                border: { display: false }
            }
        }
    };

    // Section Wise Data Prep
    let sectionChart = null;
    if (analytics.sections) {
        const secLabels = Object.keys(analytics.sections).sort();
        const secPass = secLabels.map(s => analytics.sections[s].passed);
        const secFail = secLabels.map(s => analytics.sections[s].failed);

        const sectionData = {
            labels: secLabels.map(s => `Section ${s}`),
            datasets: [
                {
                    label: 'Passed',
                    data: secPass,
                    backgroundColor: 'rgba(99, 102, 241, 0.8)', // Indigo-500
                    borderRadius: 6,
                    datalabels: { color: 'white', anchor: 'center' }
                },
                {
                    label: 'Failed',
                    data: secFail,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderRadius: 6,
                    datalabels: { color: 'white', anchor: 'center' }
                }
            ]
        };

        sectionChart = (
            <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-96">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 font-display">Section Performance (Science)</h3>
                <div className="h-80">
                    <Bar data={sectionData} options={options} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white font-display">Analytics Overview</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{examName || 'Exam Result Analysis'}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-96">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 font-display">Subject-wise Pass/Fail</h3>
                <div className="h-80">
                    <Bar data={subjectData} options={options} />
                </div>
            </div>

            {sectionChart}
        </div>
    );
};

export default AnalyticsCharts;
