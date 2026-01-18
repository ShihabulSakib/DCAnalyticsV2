import React, { useState, useEffect } from 'react';
import { Users, FileText, Trash2, Edit2, Download, AlertCircle } from 'lucide-react';
import { getAdminDashboard, fetchAllStudents, deleteStudent, updateStudent } from '../api';

const AdminDashboard = () => {
    const [stats, setStats] = useState({ total_students: 0, total_exams: 0 });
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingStudent, setEditingStudent] = useState(null);
    const [error, setError] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const [dashboardRes, studentsRes] = await Promise.all([
                getAdminDashboard(),
                fetchAllStudents()
            ]);
            setStats(dashboardRes.data.stats);
            setStudents(studentsRes.data);
        } catch (err) {
            console.error(err);
            setError('Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (roll) => {
        if (confirm(`Are you sure you want to delete student with Roll ${roll}?`)) {
            try {
                await deleteStudent(roll);
                setStudents(students.filter(s => s.roll !== roll));
                setStats(prev => ({ ...prev, total_students: prev.total_students - 1 }));
            } catch (err) {
                console.error(err);
                alert('Failed to delete student.');
            }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await updateStudent(editingStudent.roll, editingStudent);
            setStudents(students.map(s => s.roll === editingStudent.roll ? editingStudent : s));
            setEditingStudent(null);
        } catch (err) {
            console.error(err);
            alert('Failed to update student.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-zinc-500">
                <div className="animate-pulse">Loading Dashboard...</div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-8">
            <h1 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-100">Admin Dashboard</h1>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-zinc-500">Total Students</p>
                            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total_students}</h3>
                        </div>
                    </div>
                </div>
                 <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <FileText size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-zinc-500">Total Exams</p>
                            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.total_exams}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Student Management Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Student Management</h2>
                    <span className="text-sm text-zinc-500">Showing {students.length} students</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Roll</th>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Group</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {students.map((student) => (
                                <tr key={student.roll} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                    <td className="px-6 py-4 font-mono">{student.roll}</td>
                                    <td className="px-6 py-4">{student.name || 'N/A'}</td>
                                    <td className="px-6 py-4">{student.group_name || 'N/A'}</td>
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <button
                                            onClick={() => setEditingStudent(student)}
                                            className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 rounded-md"
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(student.roll)}
                                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 rounded-md"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {students.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-zinc-500">
                                        No students found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingStudent && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Edit Student ({editingStudent.roll})</h3>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
                            <input
                                type="text"
                                value={editingStudent.name || ''}
                                onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Group</label>
                            <input
                                type="text"
                                value={editingStudent.group_name || ''}
                                onChange={e => setEditingStudent({ ...editingStudent, group_name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Session</label>
                            <input
                                type="text"
                                value={editingStudent.session || ''}
                                onChange={e => setEditingStudent({ ...editingStudent, session: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>

                        <div className="flex gap-3 justify-end mt-6">
                            <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save Changes</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;