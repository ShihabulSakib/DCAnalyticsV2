import React, { useState } from 'react';
import { Users, FileText, Trash2, Edit2, Download } from 'lucide-react';

const AdminDashboard = () => {
    // Dummy Data
    const [students, setStudents] = useState(
        Array.from({ length: 20 }, (_, i) => ({
            id: i,
            roll: 2000 + i,
            name: `Student ${i + 1}`,
            group: 'Science',
            session: '2024-2025',
            original_pdf_url: '#'
        }))
    );

    const [editingStudent, setEditingStudent] = useState(null);

    const handleDelete = (id) => {
        if (confirm('Are you sure you want to delete this student data?')) {
            setStudents(students.filter(s => s.id !== id));
        }
    };

    const handleSave = (e) => {
        e.preventDefault();
        setStudents(students.map(s => s.id === editingStudent.id ? editingStudent : s));
        setEditingStudent(null);
    };

    return (
        <div className="p-4 md:p-8 space-y-8">
            <h1 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-100">Admin Dashboard</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-zinc-500">Total Students</p>
                            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">1,245</h3>
                        </div>
                    </div>
                </div>
                {/* More cards... */}
            </div>

            {/* Student Management Table */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Student Management</h2>
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
                                <tr key={student.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                    <td className="px-6 py-4 font-mono">{student.roll}</td>
                                    <td className="px-6 py-4">{student.name}</td>
                                    <td className="px-6 py-4">{student.group}</td>
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <button
                                            onClick={() => setEditingStudent(student)}
                                            className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 rounded-md"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(student.id)}
                                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 rounded-md"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <a href={student.original_pdf_url} target="_blank" className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 rounded-md">
                                            <Download size={16} />
                                        </a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingStudent && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                    <form onSubmit={handleSave} className="bg-white dark:bg-zinc-900 rounded-xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4">
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Edit Student</h3>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
                            <input
                                type="text"
                                value={editingStudent.name}
                                onChange={e => setEditingStudent({ ...editingStudent, name: e.target.value })}
                                className="w-full px-3 py-2 border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                            />
                        </div>
                        {/* Add other fields (Roll, Group, Session, PhotoURL) similarly */}

                        <div className="flex gap-3 justify-end mt-6">
                            <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 text-zinc-600">Cancel</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Save Changes</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
