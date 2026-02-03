import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = ({ toggleTheme, isDark, exams = [], selectedExam, onExamChange }) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef(null);

  const selected = exams.find(e => e.id === selectedExam) || null;

  useEffect(() => {
    function onOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  function toggleOpen() {
    if (!open) setHighlight(0);
    setOpen(o => !o);
  }

  function onKeyDown(e) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight(0);
        setOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, exams.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = exams[highlight];
      if (opt) {
        onExamChange && onExamChange(opt.id);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function selectOption(opt) {
    onExamChange && onExamChange(opt.id);
    setOpen(false);
  }

  return (
    <nav className="bg-surface-a0 border-b border-surface-a20 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-6">
            <div className="flex items-center">
              <img src="/file.svg" alt="DCAnalytics Logo" className="h-[60px] w-[60px] mr-2" />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-a10 to-primary-a30 font-display hidden md:block">
                DCAnalytics
              </span>
            </div>

            {/* Animated Exam Selector (searchless) */}
            <div className="relative" ref={containerRef}>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={toggleOpen}
                onKeyDown={onKeyDown}
                className={
                  "appearance-none bg-surface-a10 border border-surface-a20 text-primary-a50 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-a20 focus:border-transparent text-sm font-medium transition-all cursor-pointer min-w-[200px] flex items-center justify-between " +
                  (open ? 'ring-2 ring-primary-a20' : '')
                }
              >
                <span className="truncate">{selected ? selected.name : 'Select exam'}</span>
                <svg
                  className={`h-4 w-4 transform transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <AnimatePresence>
                {open && (
                  <motion.ul
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                    role="listbox"
                    aria-activedescendant={exams[highlight] ? `exam-${exams[highlight].id}` : undefined}
                    tabIndex={-1}
                    className={
                      "absolute mt-2 w-full z-50 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-auto divide-y divide-surface-a10 " +
                      (isDark
                        ? 'bg-surface-tonal-a10 border border-surface-a20'
                        : 'bg-surface-a0')
                    }
                  >
                    {exams.length === 0 ? (
                      <li className="p-3 text-sm text-primary-a40">No exams</li>
                    ) : (
                      exams.map((opt, idx) => (
                        <motion.li
                          key={opt.id}
                          id={`exam-${opt.id}`}
                          role="option"
                          aria-selected={selected && selected.id === opt.id}
                          onMouseEnter={() => setHighlight(idx)}
                          onClick={() => selectOption(opt)}
                          initial={false}
                          whileHover={{ scale: 1.01 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          className={
                            `cursor-pointer select-none px-4 py-2 text-sm transition-colors duration-120 ` +
                            (selected && selected.id === opt.id
                              ? 'bg-surface-tonal-a0 text-primary-a50 font-semibold'
                              : (idx === highlight
                                ? 'bg-surface-tonal-a0 text-primary-a50'
                                : 'text-primary-a50 hover:bg-surface-a10')
                            )
                          }
                        >
                          {opt.name}
                        </motion.li>
                      ))
                    )}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-primary-a40 hover:bg-surface-a10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-a20 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div className="hidden md:flex items-center space-x-2">
              <span className="text-sm text-primary-a40">v1.0</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
