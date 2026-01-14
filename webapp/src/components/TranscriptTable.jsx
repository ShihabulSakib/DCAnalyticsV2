
import React from 'react';

const TranscriptTable = ({ subjects }) => {
    return (
        <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white font-display">Academic Transcript</h3>
                <span className="text-xs uppercase font-semibold text-gray-400 tracking-wider dark:text-gray-500">{subjects.length} Subjects</span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Grade</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">GP</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-50 dark:divide-gray-800">
                        {subjects.map((sub, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-200">{sub.subject_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-600 dark:text-gray-400 font-medium">{sub.total || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm ${sub.grade === 'F'
                                            ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30'
                                            : sub.grade === 'A+'
                                                ? 'bg-green-50 text-green-600 border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30'
                                                : 'bg-gray-50 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                                        }`}>
                                        {sub.grade}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-700 dark:text-gray-300">{sub.gp !== 0 ? sub.gp.toFixed(2) : '0.00'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TranscriptTable;
