import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, ArrowRight, Lock } from 'lucide-react';
import { loginUser } from '../api';
import { useAuth } from '../context/AuthContext';
import bgImage from '../assets/wmremove-transformed.jpeg';

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
        <div
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-cover sm:bg-cover bg-[40%_center]"
            style={{ backgroundImage: `url(${bgImage})` }}
        >
            {/* Dark Overlay - Reduced opacity and blur as requested */}
            <div className="absolute inset-0 bg-gray-900/30 backdrop-blur-[1px] z-0"></div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md bg-white/10 dark:bg-black/30 backdrop-blur-[64px] border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
                {/* Top decorative line */}
                <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>

                <div className="p-8">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/10 shadow-inner mb-4 backdrop-blur-sm">
                            <GraduationCap className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">Student Portal</h1>
                        <p className="text-white/80 text-sm mt-2 font-medium">Enter your credentials to access results</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-4">
                            <label className="text-sm font-medium text-white/90 ml-1">Roll Number</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-white/60 group-focus-within:text-white transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={roll}
                                    onChange={(e) => setRoll(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium backdrop-blur-sm"
                                    placeholder="e.g. 1202425010..."
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm flex items-center justify-center font-medium backdrop-blur-md">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-900 transition-all shadow-lg shadow-indigo-500/30 overflow-hidden"
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
                <div className="px-8 py-4 bg-black/20 border-t border-white/10 flex justify-between items-center text-xs text-white/60">
                    <p>Dhaka College Result Management System &copy; 2026</p>
                    <Link to="/admin/login" className="hover:text-white transition-colors flex items-center gap-1 font-medium">
                        <Lock className="w-3 h-3" /> Admin
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
