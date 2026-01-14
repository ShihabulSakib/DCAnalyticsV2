
import React from 'react';
import LinePersonFilled from '../assets/LinePersonFilled.svg';
import { GraduationCap, Award, BookOpen } from 'lucide-react';

const ResultCard = ({ result, student }) => {
    return (
        <div className="w-full">
            {/* Soft UI Card */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-all duration-300">
                {/* Header with Gradient */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-900 dark:to-purple-900 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>

                    <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                        <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm p-1 shadow-lg ring-4 ring-white/10 flex items-center justify-center overflow-hidden relative">
                            <img
                                src={`http://localhost:8000/static/images/${student.roll}.jpg`}
                                onError={(e) => { e.target.onerror = null; e.target.src = LinePersonFilled; e.target.className = "w-16 h-16 opacity-90 invert p-2"; }}
                                alt={student.name}
                                className="w-full h-full object-cover rounded-full"
                            />
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-3xl font-display font-bold tracking-tight">{student.name}</h2>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2 text-indigo-100">
                                <div className="flex items-center text-sm font-medium bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                                    <span className="font-bold mr-1">Roll:</span> {student.roll}
                                </div>
                                <div className="flex items-center text-sm font-medium bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                                    <span className="font-bold mr-1">Session:</span> {student.session}
                                </div>
                            </div>
                        </div>

                        <div className="text-center bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/10 min-w-[120px]">
                            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-200">GPA</div>
                            <div className="text-4xl font-bold">{result.gpa !== undefined && result.gpa !== null ? result.gpa.toFixed(2) : '-'}</div>
                            <div className={`mt-1 inline-block px-3 py-0.5 rounded-full text-xs font-bold uppercase ${result.status === 'Failed' ? 'bg-red-500/80' : 'bg-green-500/80'} text-white shadow-sm`}>
                                {result.status}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transcript Table (Sleek) */}
                <div className="p-0">
                    {/* Note: TranscriptTable component is separate, we can stylize it or inline it. 
                   Let's assume App.jsx renders TranscriptTable separately or we redesign it here.
                   The prompt said "Redesign Result Card & Transcript Table".
                   I'll rely on TranscriptTable being passed or rendered below this, BUT
                   based on the prompt "ResultCard: Implement 'Soft UI'", I will make the table integrated or clearly separate.
                   Current App.jsx structure passes `result` and `student` to ResultCard and `subjects` to TranscriptTable.
                   I will modify ResultCard to strictly show the Summary Card. 
               */}
                    <div className="flex justify-between items-center p-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Group</p>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{student.student_group}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                                <Award className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Marks</p>
                                <p className="font-semibold text-gray-800 dark:text-gray-100">
                                    {result.total_marks !== undefined && result.total_marks !== null ? result.total_marks.toFixed(0) : '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultCard;
