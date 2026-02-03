import React from 'react';

const TranscriptTable = ({ subjects }) => {
    return (
        <div className="bg-surface-a0 dark:bg-dark-card rounded-2xl shadow-lg border border-surface-a10 dark:border-surface-a20 overflow-hidden mt-6">
            <div className="px-6 py-5 border-b border-surface-a10 bg-surface-a10/30 flex items-center justify-between">
                <h3 className="text-lg font-bold text-primary-a50 font-display tracking-tight">Academic Transcript</h3>
                <span className="px-3 py-1 rounded-full bg-surface-tonal-a0 text-[10px] uppercase font-bold text-primary-a10 tracking-widest">{subjects.length} Subjects</span>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-surface-a10">
                    <thead className="bg-surface-a10/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-primary-a40 uppercase tracking-widest">Subject</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-primary-a40 uppercase tracking-widest">Total</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-primary-a40 uppercase tracking-widest">Grade</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-primary-a40 uppercase tracking-widest">GP</th>
                        </tr>
                    </thead>
                    <tbody className="bg-surface-a0 divide-y divide-surface-a10">
                        {subjects.map((sub, index) => (
                            <tr key={index} className="hover:bg-surface-tonal-a0 transition-colors duration-150">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary-a50">{sub.subject_name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-primary-a40 font-medium">{sub.total || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm border ${sub.grade === 'F'
                                            ? 'bg-danger-a20/10 text-danger-a10 border-danger-a20/30'
                                            : sub.grade === 'A+'
                                                ? 'bg-success-a20/10 text-success-a10 border-success-a20/30'
                                                : 'bg-surface-a10 text-primary-a40 border-surface-a20'
                                        }`}>
                                        {sub.grade}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-primary-a10">{sub.gp !== 0 ? sub.gp.toFixed(2) : '0.00'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TranscriptTable;