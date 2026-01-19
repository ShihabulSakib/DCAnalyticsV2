import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowRight, Lock } from 'lucide-react';
import { adminLogin } from '../api';
import { useAuth } from '../context/AuthContext';

const AdminLoginPage = () => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await adminLogin(password);
            const { access_token } = response.data;

            // Set admin user in auth context
            login({ role: 'admin', name: 'Administrator' }, access_token);

            // Navigate to admin dashboard
            navigate('/admin', { replace: true });
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 401) {
                setError('Invalid admin password. Please try again.');
            } else {
                setError('Login failed. Please check connection.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 dark:bg-zinc-950 md:bg-gradient-to-br md:from-slate-900 md:via-purple-900 md:to-slate-900">
            {/* Background Effects (Desktop Only) */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 hidden md:block">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[150px]"></div>
            </div>

            {/* Admin Login Card */}
            <div className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 md:bg-slate-800/40 md:backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 md:border-slate-700/50 rounded-2xl md:rounded-3xl shadow-xl md:shadow-2xl overflow-hidden transition-colors">
                {/* Top decorative line */}
                <div className="h-1 w-full bg-gradient-to-r from-red-500 via-fuchsia-500 to-red-500"></div>

                <div className="p-8">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-50 dark:bg-zinc-800 md:bg-gradient-to-br md:from-purple-600 md:to-fuchsia-600 border border-red-100 dark:border-zinc-700 md:border-purple-500/30 shadow-inner md:shadow-lg md:shadow-purple-500/20 mb-4 text-red-600 dark:text-red-400 md:text-white">
                            <Shield className="w-10 h-10" />
                        </div>
                        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 md:text-white tracking-tight">Admin Portal</h1>
                        <p className="text-zinc-500 dark:text-zinc-400 md:text-slate-400 text-sm mt-2">Authorized access only</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 md:text-slate-300 ml-1">Admin Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-zinc-400 dark:text-zinc-500 md:text-slate-500 group-focus-within:text-red-500 md:group-focus-within:text-purple-400 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-11 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-800 md:bg-slate-900/50 border border-zinc-200 dark:border-zinc-700 md:border-slate-700 rounded-xl text-zinc-900 dark:text-zinc-100 md:text-slate-200 placeholder-zinc-400 dark:placeholder-zinc-500 md:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 md:focus:ring-purple-500/50 focus:border-red-500 md:focus:border-purple-500 transition-all font-medium"
                                    placeholder="Enter admin password"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 md:bg-red-900/30 border border-red-200 dark:border-red-800 md:border-red-700/30 text-red-600 dark:text-red-400 md:text-red-300 text-sm flex items-center justify-center">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-600 to-fuchsia-600 hover:from-red-500 hover:to-fuchsia-500 md:from-purple-600 md:to-fuchsia-600 md:hover:from-purple-500 md:hover:to-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 md:focus:ring-purple-500 focus:ring-offset-white dark:focus:ring-offset-zinc-900 md:focus:ring-offset-slate-900 transition-all shadow-lg shadow-red-500/30 md:shadow-purple-500/30 overflow-hidden disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="animate-pulse">Authenticating...</span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    Access Admin Panel <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 bg-zinc-50 dark:bg-zinc-800/50 md:bg-slate-900/50 border-t border-zinc-100 dark:border-zinc-800 md:border-slate-700/50 text-center">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 md:text-slate-500">Secure administrative access • DCAnalytics</p>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginPage;
