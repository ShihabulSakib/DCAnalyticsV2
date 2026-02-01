import React, { useState, useEffect, useCallback } from 'react';
import { Edit2, Check, X, Save, Loader2 } from 'lucide-react';
import { fetchSessions, fetchExams, updateExam } from '../../api';
import { motion } from 'framer-motion';

/**
 * Exam Manager component with cascading filters and inline editing
 */
const ExamManager = () => {
    // Filter states
    const [sessions, setSessions] = useState([]);
    const [selectedSession, setSelectedSession] = useState('');
    const [selectedGroup, setSelectedGroup] = useState('Science');

    // Exam states
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);

    // Edit states
    const [editingExamId, setEditingExamId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);

    // Groups
    const groups = [
        { value: 'Science', label: 'Science' },
        { value: 'Business Studies', label: 'Business Studies' },
        { value: 'Humanities', label: 'Humanities' }
    ];

    // Load sessions on mount
    useEffect(() => {
        loadSessions();
    }, []);

    // Load exams when session or group changes
    useEffect(() => {
        if (selectedSession && selectedGroup) {
            loadExams();
        }
    }, [selectedSession, selectedGroup]);

    const loadSessions = async () => {
        try {
            const response = await fetchSessions();
            const sessionList = response.data || [];
            setSessions(sessionList);
            if (sessionList.length > 0) {
                // Default to most recent session
                const sorted = [...sessionList].sort().reverse();
                setSelectedSession(sorted[0]);
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    };

    const loadExams = async () => {
        setLoading(true);
        try {
            const response = await fetchExams(selectedSession, selectedGroup);
            setExams(response.data || []);
        } catch (error) {
            console.error('Failed to load exams:', error);
            setExams([]);
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (exam) => {
        setEditingExamId(exam.id);
        setEditValue(exam.name);
    };

    const cancelEdit = () => {
        setEditingExamId(null);
        setEditValue('');
    };

    const saveEdit = async (examId) => {
        if (!editValue.trim()) {
            cancelEdit();
            return;
        }

        setSaving(true);
        try {
            await updateExam(examId, editValue.trim());
            // Update local state
            setExams(exams.map(e =>
                e.id === examId ? { ...e, name: editValue.trim() } : e
            ));
            setEditingExamId(null);
            setEditValue('');
        } catch (error) {
            console.error('Failed to update exam:', error);
            alert('Failed to update exam name. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e, examId) => {
        if (e.key === 'Enter') {
            saveEdit(examId);
        } else if (e.key === 'Escape') {
            cancelEdit();
        }
    };

    return (
        <div className="space-y-6">
            {/* Filter Controls */}
            <div className="flex flex-wrap gap-4 p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Session
                    </label>
                    <select
                        value={selectedSession}
                        onChange={e => setSelectedSession(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    >
                        {sessions.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                        Group
                    </label>
                    <select
                        value={selectedGroup}
                        onChange={e => setSelectedGroup(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                    >
                        {groups.map(g => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Exam List */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                        Exams ({exams.length})
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">
                        Click the edit button to rename an exam
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-zinc-500 w-40">Exam ID</th>
                                <th className="px-4 py-3 text-left font-medium text-zinc-500">Exam Name</th>
                                <th className="px-4 py-3 text-right font-medium text-zinc-500 w-28">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {loading ? (
                                [...Array(3)].map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-3"><div className="h-5 w-24 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"></div></td>
                                        <td className="px-4 py-3"><div className="h-5 w-48 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"></div></td>
                                        <td className="px-4 py-3"><div className="h-5 w-16 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : exams.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-4 py-8 text-center text-zinc-500">
                                        No exams found for this session and group
                                    </td>
                                </tr>
                            ) : (
                                exams.map(exam => (
                                    <motion.tr
                                        key={exam.id}
                                        layout
                                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                                    >
                                        <td className="px-4 py-3 font-mono text-zinc-600 dark:text-zinc-400">
                                            {exam.exam_id_text}
                                        </td>
                                        <td className="px-4 py-3">
                                            {editingExamId === exam.id ? (
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onKeyDown={e => handleKeyDown(e, exam.id)}
                                                    className="w-full px-3 py-1.5 border border-indigo-300 dark:border-indigo-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500/30 outline-none"
                                                    autoFocus
                                                    disabled={saving}
                                                />
                                            ) : (
                                                <span className="text-zinc-900 dark:text-zinc-100">
                                                    {exam.name}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {editingExamId === exam.id ? (
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => saveEdit(exam.id)}
                                                        disabled={saving}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-md disabled:opacity-50"
                                                        title="Save"
                                                    >
                                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={cancelEdit}
                                                        disabled={saving}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md disabled:opacity-50"
                                                        title="Cancel"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startEdit(exam)}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExamManager;
