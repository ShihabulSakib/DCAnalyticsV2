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
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-surface-a10">
            {/* Background elements for depth */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-a10/10 blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary-a20/10 blur-[100px]"></div>
            </div>

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md bg-surface-a0 border border-surface-a20 rounded-2xl shadow-2xl overflow-hidden transition-colors">
                {/* Top decorative line */}
                <div className="h-1.5 w-full bg-gradient-to-r from-primary-a10 to-primary-a30"></div>

                <div className="p-8">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-surface-tonal-a0 border border-surface-a20 shadow-sm mb-6">
                            <img src="/file.svg" alt="DCAnalytics Logo" className="h-[60px] w-[60px]" />
                        </div>
                        <h1 className="text-3xl font-display font-bold text-primary-a50 tracking-tight">Student Portal</h1>
                        <p className="text-primary-a40 text-sm mt-2 font-medium">Enter your credentials to access results</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-primary-a40 ml-1 uppercase tracking-wider">Roll Number</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-primary-a30 group-focus-within:text-primary-a10 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={roll}
                                    onChange={(e) => setRoll(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-surface-a10 border border-surface-a20 rounded-xl text-primary-a50 placeholder-primary-a30 focus:outline-none focus:ring-2 focus:ring-primary-a10/20 focus:border-primary-a10 transition-all font-medium"
                                    placeholder="e.g. 1202425010..."
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-danger-a20/20 border border-danger-a10/30 text-danger-a10 text-sm flex items-center justify-center font-medium">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-4 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-primary-a10 hover:bg-primary-a0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-a10 transition-all shadow-lg shadow-primary-a10/30 overflow-hidden active:scale-[0.98]"
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
                <div className="px-8 py-5 bg-surface-tonal-a0 border-t border-surface-a20 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-primary-a40 font-medium">
                    <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                        <p>DCResult &copy; 2026</p>
                        <span className="hidden sm:inline opacity-30">•</span>
                        <p className="opacity-80">Built by 471 (DC-26)</p>
                    </div>
                    <Link to="/admin/login" className="hover:text-primary-a10 transition-colors flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Admin Portal
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;