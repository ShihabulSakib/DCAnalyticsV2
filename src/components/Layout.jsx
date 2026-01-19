import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon, BarChart2, Shield, ArrowRightLeft, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import usePreferences from '../hooks/usePreferences';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const { theme, toggleTheme } = usePreferences();
    const { user, logout, isAdmin } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const navLinks = [
        { path: '/', label: 'Results', icon: BarChart2 },
        { path: '/compare', label: 'Compare', icon: ArrowRightLeft },
        ...(isAdmin() ? [{ path: '/admin', label: 'Admin', icon: Shield }] : []),
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans transition-colors duration-200">
            {/* Sticky Smart Navbar (Minimal Glass) */}
            <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-sm flex items-center justify-between px-4 md:px-8">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">
                        <Menu size={24} />
                    </button>
                    <Link to="/" className="text-xl font-display font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
                        DCAnalytics
                    </Link>
                </div>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-6">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${location.pathname === link.path
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-indigo-500'
                                }`}
                        >
                            <link.icon size={18} />
                            {link.label}
                        </Link>
                    ))}
                    <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
                        <LogOut size={16} />
                        Logout
                    </button>
                </div>
            </nav>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="fixed inset-0 z-50 bg-black/50 md:hidden"
                        />

                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 left-0 bottom-0 z-50 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shadow-xl p-4 flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <span className="text-xl font-display font-bold text-indigo-600 dark:text-indigo-400">Menu</span>
                                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex flex-col gap-4 flex-1">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${location.pathname === link.path
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                            }`}
                                    >
                                        <link.icon size={20} />
                                        {link.label}
                                    </Link>
                                ))}
                            </div>

                            <button onClick={toggleTheme} className="mb-2 flex items-center justify-center gap-2 p-3 rounded-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                                {theme === 'dark' ? <><Sun size={20} /> Light Mode</> : <><Moon size={20} /> Dark Mode</>}
                            </button>

                            <button onClick={handleLogout} className="flex items-center justify-center gap-2 p-3 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                                <LogOut size={20} />
                                Logout
                            </button>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="pt-20 px-4 md:px-8 max-w-7xl mx-auto">
                <Outlet context={{ theme }} />
            </main>
        </div>
    );
};

export default Layout;
