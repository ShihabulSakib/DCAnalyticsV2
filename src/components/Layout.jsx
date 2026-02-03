import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon, BarChart2, Shield, ArrowRightLeft, LogOut, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import usePreferences from '../hooks/usePreferences';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
    const { theme, toggleTheme } = usePreferences();
    const { user, logout, isAdmin } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showMenuHint, setShowMenuHint] = useState(false);
    const [menuHintDismissed, setMenuHintDismissed] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const seen = localStorage.getItem('menuHintSeen');
        if (!seen) {
            const timer = setTimeout(() => setShowMenuHint(true), 1000);
            return () => clearTimeout(timer);
        } else {
            setMenuHintDismissed(true);
        }
    }, []);

    const handleDismissMenuHint = () => {
        setShowMenuHint(false);
        localStorage.setItem('menuHintSeen', 'true');
        setMenuHintDismissed(true);
    };

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
        <div className="min-h-screen bg-surface-a0 text-primary-a50 font-sans transition-colors duration-200">
            {/* Sticky Smart Navbar (Minimal Glass) */}
            <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-surface-a20 bg-surface-a0/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 hover:bg-surface-a10 rounded-md text-primary-a40">
                        <Menu size={24} />
                    </button>
                    <Link to="/" className="flex items-center gap-2 text-xl font-display font-bold tracking-tight text-primary-a10">
                        <img src="/file.svg" alt="DCAnalytics Logo" className="h-[50px] w-[50px]" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-a10 to-primary-a30">DCAnalytics</span>
                    </Link>
                </div>

                {/* Menu Hint Popup */}
                <AnimatePresence>
                    {showMenuHint && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, x: -10 }}
                            animate={{ opacity: 1, y: 0, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="md:hidden absolute top-16 left-4 z-50 w-[260px]"
                        >
                            <div className="relative bg-primary-a10 text-white text-xs p-3 rounded-lg shadow-xl border border-primary-a20/30">
                                <button onClick={handleDismissMenuHint} className="absolute top-1 right-1 text-primary-a50 opacity-60 hover:opacity-100"><X size={12} /></button>
                                <div className="flex gap-2">
                                    <Sparkles className="w-4 h-4 text-warning-a10 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold mb-1">Navigation & Compare</p>
                                        <p className="leading-relaxed opacity-90">Tap here to access Comparison Mode, Admin Panel, and Settings.</p>
                                    </div>
                                </div>
                                <div className="absolute -top-1.5 left-4 w-3 h-3 bg-primary-a10 rotate-45"></div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-6">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${location.pathname === link.path
                                ? 'text-primary-a10'
                                : 'text-primary-a40 hover:text-primary-a20'
                                }`}
                        >
                            <link.icon size={18} />
                            {link.label}
                        </Link>
                    ))}
                    <div className="w-px h-6 bg-surface-a20 mx-2" />
                    <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-surface-a10 transition-colors text-primary-a40">
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-sm text-danger-a10 hover:bg-danger-a20/10 rounded-md transition-colors font-semibold">
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
                            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm md:hidden"
                        />

                        <motion.aside
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 left-0 bottom-0 z-[70] w-72 bg-surface-a0 border-r border-surface-a20 shadow-2xl p-6 flex flex-col"
                        >
                            <div className="flex items-center justify-between mb-10">
                                <span className="text-2xl font-display font-bold text-primary-a10">Menu</span>
                                <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-surface-a10 rounded-full text-primary-a40">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex flex-col gap-3 flex-1">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${location.pathname === link.path
                                            ? 'bg-surface-tonal-a0 text-primary-a10 font-bold shadow-sm'
                                            : 'text-primary-a40 hover:bg-surface-a10'
                                            }`}
                                    >
                                        <link.icon size={20} />
                                        {link.label}
                                    </Link>
                                ))}
                            </div>

                            <div className="mt-auto space-y-3">
                                <button onClick={toggleTheme} className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border border-surface-a20 hover:bg-surface-a10 transition-colors text-primary-a50 font-medium">
                                    {theme === 'dark' ? <><Sun size={20} /> Light Mode</> : <><Moon size={20} /> Dark Mode</>}
                                </button>

                                <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-danger-a20/10 text-danger-a10 hover:bg-danger-a20/20 transition-colors font-bold">
                                    <LogOut size={20} />
                                    Logout
                                </button>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="pt-20 px-4 md:px-8 max-w-7xl mx-auto pb-10">
                <Outlet context={{ theme, menuHintDismissed }} />
            </main>
        </div>
    );
};

export default Layout;