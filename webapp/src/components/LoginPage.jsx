
import React, { useState } from 'react';
import { GraduationCap, ArrowRight, Lock } from 'lucide-react';
import { fetchExams, loginUser } from '../api';

const LoginPage = ({ onLogin }) => {
    const [roll, setRoll] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await loginUser(roll);
            onLogin(roll); // Set global user state
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
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[120px]"></div>
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
                {/* Top decorative line */}
                <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>

                <div className="p-8">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 shadow-inner mb-4">
                            <GraduationCap className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Student Portal</h1>
                        <p className="text-gray-400 text-sm mt-2">Enter your credentials to access results</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1">Roll Number</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={roll}
                                    onChange={(e) => setRoll(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium"
                                    placeholder="e.g. 1202425010..."
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-900/20 border border-red-800/30 text-red-400 text-sm flex items-center justify-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 transition-all shadow-lg shadow-indigo-500/20 overflow-hidden"
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
                <div className="px-8 py-4 bg-gray-900/30 border-t border-gray-700/50 text-center">
                    <p className="text-xs text-gray-500">Dhaka College Result Management System &copy; 2026</p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
