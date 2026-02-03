import React, { useState, useEffect } from 'react';
import { Radar } from 'react-chartjs-2';
import { Search, AlertCircle, ChevronDown } from 'lucide-react';
import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import usePreferences from '../hooks/usePreferences';
import { fetchResult, fetchExams, logActivity } from '../api';
import dataLoader, { USE_JSON_DATA } from '../services/dataLoader';

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

const parseStudentRoll = (roll) => {
    const rollStr = String(roll);
    if (!roll || rollStr.length < 10) return { session: 'All', group: 'All' };

    const sessionPart = rollStr.substring(1, 7);
    const groupPart = rollStr.substring(7, 10);

    const session = `${sessionPart.substring(0, 4)}-20${sessionPart.substring(4, 6)}`;

    let group = 'All';
    if (groupPart === '010') group = 'Science';
    else if (groupPart === '020') group = 'Business Studies';
    else if (groupPart === '030') group = 'Humanities';

    return { session, group };
};

const CompareView = () => {
    const { user, isAdmin } = useAuth();
    const { theme } = usePreferences();
    const [studentA, setStudentA] = useState(null);
    const [studentB, setStudentB] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState('');

    const [studentAQuery, setStudentAQuery] = useState('');
    const [studentALoading, setStudentALoading] = useState(false);

    const [selectedExam, setSelectedExam] = useState(null);
    const [exams, setExams] = useState([]);

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                let session = null;
                let group = null;

                if (user?.roll) {
                    const info = parseStudentRoll(user.roll);
                    session = info.session;
                    group = info.group;
                }

                const examsRes = await fetchExams(session, group);
                const examsList = examsRes.data;
                setExams(examsList);

                if (examsList.length > 0) {
                    const initialExamId = examsList[0].exam_id_text;
                    setSelectedExam(initialExamId);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.error(err);
                setError('Could not load initial data.');
                setLoading(false);
            }
        };
        loadInitialData();
    }, [user]);

    const filterSubjects = (subjects) => {
        if (!subjects) return [];
        return subjects.filter(s => {
            // Check for marks/total and gp/grade point
            const mark = s.total !== undefined ? s.total : s.marks;
            const gp = s.gp !== undefined ? s.gp : s.grade_point;
            
            // Exclude if total is 0 AND gp is strictly null/undefined
            // (Note: gp can be 0.0 for failed subjects, which we want to keep. 
            // We only want to remove if it looks like a missing subject entry)
            if (mark === 0 && (gp === null || gp === undefined)) {
                return false;
            }
            return true;
        });
    };

    const processData = (data) => {
        const validSubjects = filterSubjects(data.subjects);
        return {
            name: data.student.name || data.student.roll,
            roll: data.student.roll,
            subjects: validSubjects.map(s => s.subject_name),
            marks: validSubjects.map(s => s.total || 0),
            fullData: validSubjects
        };
    };

    const processJsonData = (studentMarks, roll) => {
        // studentMarks is array of { subject: "Name", total: 80, gp: 5.0 ... }
        // We need to apply the filter logic here too
        const validMarks = studentMarks.filter(s => !(s.total === 0 && (s.gp === null || s.gp === undefined)));
        
        return {
            name: `Roll ${roll}`, // JSON loader might not have names if simple array
            roll: roll,
            subjects: validMarks.map(s => s.subject),
            marks: validMarks.map(s => s.total),
            fullData: validMarks.map(s => ({ subject_name: s.subject, total: s.total, gp: s.gp }))
        };
    };

    useEffect(() => {
        const updateStudentA = async () => {
            if (isAdmin() && studentAQuery) return;

            if (!user?.roll || !selectedExam) {
                if (selectedExam && !user?.roll) setLoading(false);
                return;
            }

            setLoading(true);

            try {
                if (USE_JSON_DATA) {
                    const marksData = await dataLoader.loadMarks(selectedExam);
                    const studentMarks = dataLoader.getStudentMarks(marksData, user.roll);

                    if (studentMarks) {
                        const processed = processJsonData(studentMarks, user.roll);
                        // Try to attach name if user object has it
                        if (user.name) processed.name = user.name;
                        setStudentA(processed);
                    } else {
                        const res = await fetchResult(user.roll, selectedExam);
                        setStudentA(processData(res.data));
                    }
                } else {
                    const res = await fetchResult(user.roll, selectedExam);
                    setStudentA(processData(res.data));
                }
            } catch (err) {
                console.error("Failed to update my result", err);
                try {
                    const res = await fetchResult(user.roll, selectedExam);
                    setStudentA(processData(res.data));
                } catch (apiErr) {
                    setStudentA(null);
                }
            } finally {
                setLoading(false);
            }
        };

        updateStudentA();
    }, [selectedExam, user]);

    const handleSearchStudentA = async () => {
        if (!studentAQuery || !selectedExam || !isAdmin()) return;
        setStudentALoading(true);
        setError('');

        try {
            if (USE_JSON_DATA) {
                const marksData = await dataLoader.loadMarks(selectedExam);
                const studentMarks = dataLoader.getStudentMarks(marksData, studentAQuery);

                if (studentMarks) {
                    setStudentA(processJsonData(studentMarks, studentAQuery));
                } else {
                    const res = await fetchResult(studentAQuery, selectedExam);
                    setStudentA(processData(res.data));
                }
            } else {
                const res = await fetchResult(studentAQuery, selectedExam);
                setStudentA(processData(res.data));
            }
        } catch (err) {
            setError('Student A not found.');
            setStudentA(null);
        } finally {
            setStudentALoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery || !selectedExam) return;
        setSearchLoading(true);
        setError('');

        let studentBData = null;

        try {
            if (USE_JSON_DATA) {
                try {
                    const marksData = await dataLoader.loadMarks(selectedExam);
                    const studentMarks = dataLoader.getStudentMarks(marksData, searchQuery);

                    if (studentMarks) {
                        studentBData = processJsonData(studentMarks, searchQuery);
                    }
                } catch (jsonErr) {}
            }

            if (!studentBData) {
                const res = await fetchResult(searchQuery, selectedExam, user?.roll);
                studentBData = processData(res.data);
            }

            setStudentB(studentBData);
            logActivity('COMPARE_RESULT', studentBData.roll, { exam: selectedExam, opponent: studentBData.name }, isAdmin() ? 'ADMIN' : user?.roll).catch(e => {});

        } catch (err) {
            if (err.response?.status === 404) {
                setError('Student not found for this exam.');
            } else {
                setError('Student not found or no result.');
            }
            setStudentB(null);
        } finally {
            setSearchLoading(false);
        }
    };

    const labels = studentA?.subjects || studentB?.subjects || [];
    const studentBmarks = studentB ? labels.map(label => {
        const subject = studentB.fullData.find(s => s.subject_name === label || s.subject === label);
        return subject ? subject.total : 0;
    }) : [];

    const studentAmarks = studentA ? labels.map(label => {
        const subject = studentA.fullData.find(s => s.subject_name === label || s.subject === label);
        return subject ? subject.total : 0;
    }) : [];

    const allMarks = [...studentAmarks, ...studentBmarks];
    const maxMark = Math.max(...allMarks, 0);
    const chartMax = maxMark > 0 ? Math.ceil(maxMark * 1.1) : 100;

    // Theme-based Colors
    const isDark = theme === 'dark';
    const colorA = isDark ? '#38bdf8' : '#1664a2'; // Sky-400 vs Primary-700
    const bgA = isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(22, 100, 162, 0.2)';
    
    const colorB = isDark ? '#fb7185' : '#9c2121'; // Rose-400 vs Red-800
    const bgB = isDark ? 'rgba(251, 113, 133, 0.2)' : 'rgba(156, 33, 33, 0.2)';
    
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#e2e8f0' : '#1f2360';

    const data = {
        labels: labels,
        datasets: [
            studentA && {
                label: studentA.name,
                data: studentAmarks,
                backgroundColor: bgA,
                borderColor: colorA,
                borderWidth: 2,
                pointBackgroundColor: colorA,
            },
            studentB && {
                label: studentB.name,
                data: studentBmarks,
                backgroundColor: bgB,
                borderColor: colorB,
                borderWidth: 2,
                pointBackgroundColor: colorB,
            }
        ].filter(Boolean),
    };

        const chartOptions = {

            maintainAspectRatio: false,

            scales: {

                r: {

                    min: 0,

                    max: chartMax,

                    ticks: { display: false },

                    pointLabels: {

                        font: { 

                            size: window.innerWidth < 768 ? 10 : 12, 

                            weight: 'bold', 

                            family: "'Inter', sans-serif" 

                        },

                        color: textColor

                    },

                    grid: { color: gridColor },

                    angleLines: { color: gridColor }

                }

            },

            plugins: {

                legend: { 

                    position: 'bottom', 

                    labels: { 

                        usePointStyle: true, 

                        padding: 20, 

                        font: { size: window.innerWidth < 768 ? 11 : 12, weight: 'bold' },

                        color: textColor 

                    } 

                }

            }

        };

    

        if (loading && !exams.length) {

            return <div className="p-8 text-center text-primary-a30 animate-pulse font-medium">Preparing comparison engine...</div>;

        }

    

        if (!studentA && !loading && user?.roll && !studentB) {

            return (

                <div className="p-4 md:p-8 h-full flex flex-col items-center justify-center gap-6">

                    <div className="bg-warning-a20/20 text-warning-a0 p-6 rounded-2xl border border-warning-a10/30 flex items-center gap-3 shadow-sm max-w-md text-center flex-col">

                        <AlertCircle size={32} />

                        <p className="font-semibold text-sm md:text-base">No result found for your roll in this exam. Try searching another student to begin comparison.</p>

                    </div>

                    <div className="flex flex-col gap-4 items-center w-full max-w-sm">

                        <select

                            value={selectedExam || ''}

                            onChange={(e) => setSelectedExam(e.target.value)}

                            className="w-full px-4 py-3 rounded-xl border border-surface-a20 bg-surface-a0 text-primary-a50 focus:ring-2 focus:ring-primary-a10/20 outline-none shadow-sm font-medium text-sm md:text-base"

                        >

                            {exams.map(exam => (

                                <option key={exam.id} value={exam.exam_id_text}>{exam.name}</option>

                            ))}

                        </select>

                        <div className="flex flex-row items-center gap-2 w-full">

                            <div className="relative flex-1">

                                <input

                                    type="text"

                                    placeholder="Search Roll..."

                                    value={searchQuery}

                                    onChange={(e) => setSearchQuery(e.target.value)}

                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}

                                    className="w-full px-4 py-3 rounded-xl border border-surface-a20 bg-surface-a0 focus:ring-2 focus:ring-primary-a10/20 outline-none pl-11 text-primary-a50 shadow-sm text-sm md:text-base"

                                />

                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-a30" size={18} />

                            </div>

                            <button

                                onClick={handleSearch}

                                disabled={searchLoading || !selectedExam}

                                className="p-3 bg-primary-a10 text-white rounded-xl hover:bg-primary-a0 disabled:opacity-50 transition-all shadow-lg shadow-primary-a10/20 active:scale-95"

                            >

                                {searchLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={24} />}

                            </button>

                        </div>

                    </div>

                </div>

            );

        }

    

        return (

            <div className="p-4 md:p-8 h-full flex flex-col gap-6 md:gap-8">

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">

                    <h2 className="text-2xl md:text-3xl font-display font-bold text-primary-a50 tracking-tight">Performance Comparison</h2>

    

                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full lg:w-auto">

                        <select

                            value={selectedExam || ''}

                            onChange={(e) => {

                                setSelectedExam(e.target.value);

                                setStudentB(null);

                            }}

                            className="w-full sm:w-auto sm:min-w-[200px] px-4 py-2.5 rounded-xl border border-surface-a20 bg-surface-a0 text-primary-a50 focus:ring-2 focus:ring-primary-a10/20 outline-none transition-all text-sm font-semibold shadow-sm cursor-pointer"

                        >

                            {exams.map(exam => (

                                <option key={exam.id} value={exam.exam_id_text}>{exam.name}</option>

                            ))}

                        </select>

    

                        {isAdmin() && (

                            <div className="flex items-center gap-2 w-full sm:w-auto">

                                <div className="relative flex-1 sm:w-36">

                                    <input

                                        type="text"

                                        placeholder="Roll A..."

                                        value={studentAQuery}

                                        onChange={(e) => setStudentAQuery(e.target.value)}

                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchStudentA()}

                                        className="w-full px-4 py-2.5 rounded-xl border border-surface-a20 bg-surface-a0 text-primary-a50 focus:ring-2 focus:ring-primary-a10/20 outline-none transition-all shadow-sm pl-10 text-sm font-medium"

                                    />

                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-a30" size={14} />

                                </div>

                                <button onClick={handleSearchStudentA} disabled={studentALoading} className="p-2.5 bg-surface-tonal-a10 text-primary-a10 rounded-xl hover:bg-surface-tonal-a0 transition-all shadow-sm active:scale-95 border border-primary-a10/10 shrink-0">

                                    {studentALoading ? <div className="w-4 h-4 border-2 border-primary-a10/30 border-t-primary-a10 rounded-full animate-spin" /> : <ChevronDown size={18} />}

                                </button>

                            </div>

                        )}

    

                        <div className="flex items-center gap-2 w-full sm:w-auto">

                            <div className="relative flex-1 sm:w-44">

                                <input

                                    type="text"

                                    placeholder="Roll B..."

                                    value={searchQuery}

                                    onChange={(e) => setSearchQuery(e.target.value)}

                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}

                                    className="w-full px-4 py-2.5 rounded-xl border border-surface-a20 bg-surface-a0 text-primary-a50 focus:ring-2 focus:ring-primary-a10/20 outline-none transition-all shadow-sm pl-10 text-sm font-medium"

                                />

                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-a30" size={16} />

                            </div>

                            <button onClick={handleSearch} disabled={searchLoading} className="p-2.5 bg-primary-a10 text-white rounded-xl hover:bg-primary-a0 transition-all shadow-lg shadow-primary-a10/20 active:scale-95 shrink-0">

                                {searchLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search size={20} />}

                            </button>

                        </div>

                    </div>

                </div>

    

                {error && (

                    <div className="bg-danger-a20/10 text-danger-a10 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 border border-danger-a10/20 w-fit animate-shake">

                        <AlertCircle size={18} /> {error}

                    </div>

                )}

    

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">

                    <div className="bg-surface-a0 p-6 rounded-3xl border border-surface-a20 shadow-xl flex flex-col items-center justify-center relative overflow-hidden group">

                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-a10 to-danger-a10 opacity-50"></div>

                        <div className="w-full aspect-square max-h-[500px] transition-transform duration-500 group-hover:scale-[1.02]">

                            <Radar data={data} options={chartOptions} />

                        </div>

                    </div>

    

                    <div className="bg-surface-a0 rounded-3xl border border-surface-a20 shadow-xl overflow-hidden flex flex-col">

                        <div className="p-4 md:p-6 bg-surface-a10/30 border-b border-surface-a10 flex items-center justify-between">

                            <h3 className="text-xs md:text-sm font-bold text-primary-a40 uppercase tracking-widest">Score Differential</h3>

                            <div className="flex gap-2">

                                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary-a10"></span><span className="text-[10px] md:text-[10px] font-bold text-primary-a40 uppercase">A</span></div>

                                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger-a10"></span><span className="text-[10px] md:text-[10px] font-bold text-primary-a40 uppercase">B</span></div>

                            </div>

                        </div>

                        <div className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-surface-a20">

                            <table className="w-full text-sm text-left border-collapse">

                                <thead className="bg-surface-a10/50 text-primary-a40 font-bold border-b border-surface-a10 uppercase text-[10px] tracking-wider">

                                    <tr>

                                        <th className="px-4 md:px-6 py-4">Subject</th>

                                        <th className="px-4 md:px-6 py-4 text-center">Scores</th>

                                        <th className="px-4 md:px-6 py-4 text-right">Delta</th>

                                    </tr>

                                </thead>

                                <tbody className="divide-y divide-surface-a10">

                                    {labels.map((subj, idx) => {

                                        const markA = studentAmarks[idx] || 0;

                                        const markB = studentBmarks[idx] || 0;

                                        const diff = markA - markB;

                                        const showDiff = !!studentB;

    

                                        return (

                                            <tr key={subj} className="hover:bg-surface-tonal-a0 transition-colors">

                                                <td className="px-4 md:px-6 py-3 md:py-4 font-bold text-primary-a50 text-xs md:text-sm">{subj}</td>

                                                <td className="px-4 md:px-6 py-3 md:py-4">

                                                    <div className="flex flex-col md:flex-row items-center justify-center gap-1 md:gap-3">

                                                        <span className="w-9 md:w-10 text-center font-mono font-bold text-primary-a10 bg-primary-a20/10 rounded-md py-0.5 text-xs md:text-sm">{markA}</span>

                                                        <span className="text-[9px] md:text-xs text-primary-a30 opacity-40 font-bold uppercase">vs</span>

                                                        <span className="w-9 md:w-10 text-center font-mono font-bold text-danger-a10 bg-danger-a20/10 rounded-md py-0.5 text-xs md:text-sm">{showDiff ? markB : '-'}</span>

                                                    </div>

                                                </td>

                                                <td className={`px-4 md:px-6 py-3 md:py-4 text-right font-mono font-black text-xs md:text-sm ${diff > 0 ? 'text-success-a10' : diff < 0 ? 'text-danger-a10' : 'text-primary-a30'}`}>

                                                    {showDiff ? (diff > 0 ? `+${diff}` : diff) : '-'}

                                                </td>

                                            </tr>

                                        );

                                    })}

                                </tbody>

                            </table>

                        </div>

                    </div>

                </div>

            </div>

        );

    };
export default CompareView;