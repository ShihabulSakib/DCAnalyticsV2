import React from 'react';
import LinePersonFilled from '../assets/LinePersonFilled.svg';
import { Award, BookOpen } from 'lucide-react';

const ResultCard = ({ result, student }) => {
    return (
        <div className="w-full">
            {/* Soft UI Card */}
            <div className="bg-surface-a0 dark:bg-dark-card rounded-2xl shadow-xl overflow-hidden border border-surface-a10 dark:border-surface-a20 transition-all duration-300">
                {/* Header with Gradient */}
                <div className="bg-gradient-to-r from-primary-a10 to-primary-a30 dark:from-primary-a0 dark:to-primary-a20 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>

                    <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                        <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm p-1 shadow-lg ring-4 ring-white/10 flex items-center justify-center overflow-hidden relative">
                            <img
                                src={student.roll ? `/api/student-image/${student.roll}` : LinePersonFilled}
                                onError={(e) => { e.target.onerror = null; e.target.src = LinePersonFilled; e.target.className = "w-16 h-16 opacity-90 invert p-2"; }}
                                alt={student.name}
                                className={student.roll ? "w-full h-full object-cover rounded-full" : "w-16 h-16 opacity-90 invert p-2"}
                            />
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-3xl font-display font-bold tracking-tight">{student.name}</h2>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2 text-primary-a50 mix-blend-screen">
                                <div className="flex items-center text-sm font-medium bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                                    <span className="font-bold mr-1">Roll:</span> {student.roll}
                                </div>
                                <div className="flex items-center text-sm font-medium bg-white/10 px-3 py-1 rounded-full backdrop-blur-md">
                                    <span className="font-bold mr-1">Session:</span> {student.session}
                                </div>
                            </div>
                        </div>

                        <div className="text-center bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/10 min-w-[120px]">
                            <div className="text-xs font-semibold uppercase tracking-wider text-primary-a50 mix-blend-screen">GPA</div>
                            <div className="text-4xl font-bold">{result.gpa !== undefined && result.gpa !== null ? result.gpa.toFixed(2) : '-'}</div>
                            <div className={`mt-1 inline-block px-3 py-0.5 rounded-full text-xs font-bold uppercase ${result.status === 'Failed' ? 'bg-danger-a10/80' : 'bg-success-a10/80'} text-white shadow-sm`}>
                                {result.status}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transcript Table (Sleek) */}
                <div className="p-0">
                    <div className="flex justify-between items-center p-6 bg-surface-a10 dark:bg-surface-a20/50 border-b border-surface-a10 dark:border-surface-a20">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-surface-tonal-a0 dark:bg-primary-a50/30 rounded-lg text-primary-a10 dark:text-primary-a30">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-primary-a40">Group</p>
                                <p className="font-semibold text-primary-a50">{student.student_group}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-success-a20/20 dark:bg-success-a20/30 rounded-lg text-success-a10 dark:text-success-a20">
                                <Award className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm text-primary-a40">Total Marks</p>
                                <p className="font-semibold text-primary-a50">
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