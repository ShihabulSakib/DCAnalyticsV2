
import React, { useState, useEffect } from 'react';
import { Moon, Sun, Search, GraduationCap } from 'lucide-react';

const Navbar = ({ toggleTheme, isDark, exams = [], selectedExam, onExamChange, onLogout }) => {
    return (
        <nav className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center">
                            <GraduationCap className="h-8 w-8 text-indigo-600 dark:text-indigo-400 mr-2" />
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 font-display hidden md:block">
                                DCAnalytics
                            </span>
                        </div>

                        {/* Exam Selector */}
                        <div className="relative group">
                            <select
                                value={selectedExam || ''}
                                onChange={(e) => onExamChange && onExamChange(e.target.value)}
                                className="appearance-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-medium transition-all cursor-pointer min-w-[200px]"
                            >
                                {exams.map(exam => (
                                    <option key={exam.id} value={exam.id}>{exam.name}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                            aria-label="Toggle Dark Mode"
                        >
                            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </button>
                        <div className="hidden md:flex items-center space-x-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">v1.0</span>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
