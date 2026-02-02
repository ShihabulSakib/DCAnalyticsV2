import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Lock } from 'lucide-react';
import { loginUser } from '../api';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
    const [roll, setRoll] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await loginUser(roll);
            const userData = response.data.student;

            // Set user in auth context
            login({ ...userData, roll, role: 'student' });

            // Navigate to home
            navigate('/', { replace: true });
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 404) {
                setError('Student not found. Please check your Roll Number.');
            } else {
                setError('Login failed. Please try again or check connection.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-zinc-950 md:bg-indigo-600 md:dark:bg-zinc-900">
            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 md:bg-white md:dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl md:shadow-2xl overflow-hidden transition-colors">
                {/* Top decorative line */}
                <div className="h-1 w-full bg-indigo-500"></div>

                <div className="p-8">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-zinc-700 border border-indigo-100 dark:border-zinc-600 shadow-inner mb-4 text-indigo-600 dark:text-indigo-400">
                            <img src="/file.svg" alt="DCAnalytics Logo" className="h-[60px] w-[60px]" />
                        </div>
                        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Student Portal</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 font-medium">Enter your credentials to access results</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-4">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 ml-1">Roll Number</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-zinc-400 dark:text-zinc-500 group-focus-within:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={roll}
                                    onChange={(e) => setRoll(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium"
                                    placeholder="e.g. 1202425010..."
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm flex items-center justify-center font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-white dark:focus:ring-offset-zinc-800 transition-all shadow-lg shadow-indigo-500/30 overflow-hidden"
                        >
                            {loading ? (
                                <span className="animate-pulse">Verifying...</span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    Access Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400">
                    <p>DCResult &copy; 2026</p>
                    <Link to="/admin/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 font-medium">
                        <Lock className="w-3 h-3" /> Admin
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
