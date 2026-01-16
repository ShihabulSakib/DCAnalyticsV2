
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Lock, RefreshCw, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

const AdminPanel = () => {
    const [token, setToken] = useState(sessionStorage.getItem('adminToken'));
    const [password, setPassword] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (token) {
            fetchLogs();
            const interval = setInterval(fetchLogs, 10000); // 10s auto refresh
            return () => clearInterval(interval);
        }
    }, [token]);

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            // Simplified login for this demo
            // In real app, hit /admin/login endpoint
            if (password === 'AdminSecretPass2026') {
                const fakeToken = 'admin-session';
                sessionStorage.setItem('adminToken', fakeToken);
                setToken(fakeToken);
                setError('');
            } else {
                setError('Invalid Password');
            }
        } catch (err) {
            setError('Login Failed');
        }
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/logs');
            setLogs(res.data);
        } catch (err) {
            console.error("Failed to fetch logs");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('adminToken');
        setToken(null);
    };

    if (!token) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-gray-800 rounded-xl border border-gray-700 p-8 shadow-2xl">
                    <div className="flex justify-center mb-6">
                        <div className="p-3 bg-red-900/30 rounded-full text-red-400">
                            <ShieldAlert className="w-8 h-8" />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-white text-center mb-6">Admin Access</h2>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            placeholder="Admin Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                        />
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors">
                            Authenticate
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-mono">
            <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-red-400 font-bold text-lg">
                        <ShieldAlert className="w-5 h-5" /> Admin<span className="text-white">Panel</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={fetchLogs} className="p-2 hover:bg-gray-800 rounded-lg transition-colors" title="Refresh">
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={handleLogout} className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded border border-gray-700">
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
                        <h3 className="font-semibold text-gray-200">System Access Logs</h3>
                        <span className="text-xs text-gray-500">{logs.length} entries</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-900 text-gray-400 uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Timestamp</th>
                                    <th className="px-6 py-3 font-medium">Accessed By</th>
                                    <th className="px-6 py-3 font-medium">Target Roll</th>
                                    <th className="px-6 py-3 font-medium">Action</th>
                                    <th className="px-6 py-3 font-medium">IP Address</th>
                                    <th className="px-6 py-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-750 transition-colors">
                                        <td className="px-6 py-4 text-gray-400 whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-indigo-300">
                                            {log.accessor_roll || <span className="text-gray-600">Guest</span>}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-indigo-300">
                                            {log.roll || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-300">
                                            {log.action}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                            {log.ip_address}
                                        </td>
                                        <td className="px-6 py-4">
                                            {log.status.includes('Success') ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-900/50">
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Success
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-900/50">
                                                    <XCircle className="w-3 h-3 mr-1" /> {log.status}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">
                                            No logs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminPanel;
