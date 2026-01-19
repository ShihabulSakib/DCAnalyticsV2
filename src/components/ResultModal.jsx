import React, { useEffect, useState } from 'react';
import { X, Download, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchResult } from '../api';

const ResultModal = ({ student, isOpen, onClose }) => {
    const [detailedData, setDetailedData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && student?.roll) {
            const loadDetails = async () => {
                setLoading(true);
                try {
                    const response = await fetchResult(student.roll);
                    setDetailedData(response.data);
                } catch (error) {
                    console.error("Failed to load details", error);
                } finally {
                    setLoading(false);
                }
            };
            loadDetails();
        } else {
            setDetailedData(null);
        }
    }, [isOpen, student]);

    if (!isOpen || !student) return null;

    const { name, roll, photo_url } = student;
    const marks = detailedData?.subjects || [];
    const resultInfo = detailedData?.result || {};

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Minimal Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center p-4"
                    >
                        {/* Modal Card */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden max-h-[90vh] flex flex-col"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                                <h3 className="text-lg font-display font-bold text-zinc-900 dark:text-zinc-100">Result Details</h3>
                                <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-500">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto">
                                <div className="flex flex-col items-center mb-6">
                                    <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-indigo-100 dark:border-indigo-900 overflow-hidden mb-3">
                                        {roll ? (
                                            <img 
                                                src={`/api/student-image/${roll}`} 
                                                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                                alt={name} 
                                                className="w-full h-full object-cover" 
                                            />
                                        ) : null}
                                        <div className="w-full h-full flex items-center justify-center text-zinc-400" style={{ display: roll ? 'none' : 'flex' }}>
                                            <User size={32} />
                                        </div>
                                    </div>
                                    <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 text-center">{name || "Student Name"}</h2>
                                    <p className="text-sm font-mono text-zinc-500 dark:text-zinc-400">Roll: {roll}</p>
                                </div>

                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="animate-spin text-indigo-500" size={32} />
                                    </div>
                                ) : (
                                    <>
                                        {/* Marks Table */}
                                        <div className="mb-6 border rounded-lg border-zinc-200 dark:border-zinc-800 overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-medium border-b border-zinc-200 dark:border-zinc-800">
                                                    <tr>
                                                        <th className="px-4 py-2">Subject</th>
                                                        <th className="px-4 py-2 text-right">Grade</th>
                                                        <th className="px-4 py-2 text-right">GPA</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                                    {marks.length > 0 ? (
                                                        marks.map((mark, idx) => (
                                                            <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                                                <td className="px-4 py-2 text-zinc-800 dark:text-zinc-200">{mark.subject_name}</td>
                                                                <td className="px-4 py-2 text-right font-mono text-zinc-600 dark:text-zinc-300">{mark.grade}</td>
                                                                <td className="px-4 py-2 text-right font-mono text-zinc-600 dark:text-zinc-300">{mark.gp}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="3" className="px-4 py-4 text-center text-zinc-400">No detailed marks available</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Actions */}
                                        {resultInfo.original_pdf_url && (
                                            <a
                                                href={resultInfo.original_pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                                            >
                                                <Download size={18} />
                                                Download Original Transcript
                                            </a>
                                        )}
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ResultModal;
