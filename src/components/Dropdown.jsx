import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const Dropdown = ({ label, options, value, onChange, className }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {/* Mobile Native Select - Wrapper handles visibility */}
            <div className="md:hidden w-full relative">
                {label && <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">{label}</label>}
                <select
                    value={value}
                    onChange={onChange}
                    className="w-full appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-lg pl-3 pr-8 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none"
                >
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400" size={16} />
            </div>

            {/* Desktop Custom Dropdown */}
            <div className="hidden md:block min-w-[140px]">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors focus:ring-2 focus:ring-indigo-500/20 outline-none"
                >
                    <span className="truncate mr-2 text-left flex-1">{selectedOption?.label || value}</span>
                    <ChevronDown size={14} className={`text-zinc-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.1 }}
                            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto"
                        >
                            {options.map(opt => (
                                <div
                                    key={opt.value}
                                    onClick={() => {
                                        onChange({ target: { value: opt.value } });
                                        setIsOpen(false);
                                    }}
                                    className={`px-3 py-2 text-sm cursor-pointer transition-colors text-left ${
                                        value === opt.value
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium'
                                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                    }`}
                                >
                                    {opt.label}
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Dropdown;
