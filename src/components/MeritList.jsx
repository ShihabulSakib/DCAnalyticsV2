import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { User } from 'lucide-react';

const MeritList = ({ students, onStudentClick }) => {
    // Row Component for Virtualized List
    const Row = ({ index, style }) => {
        const student = students[index];
        // Alternate row colors for readability
        const isEven = index % 2 === 0;

        return (
            <div
                style={style}
                className={`flex items-center px-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 cursor-pointer transition-colors border-b border-zinc-100 dark:border-zinc-800 ${isEven ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50/50 dark:bg-zinc-900/50'}`}
                onClick={() => onStudentClick(student)}
            >
                {/* Roll */}
                <div className="w-20 font-mono text-zinc-900 dark:text-zinc-100 font-medium">
                    {student.roll}
                </div>

                {/* Photo & Name */}
                <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden shrink-0">
                        {student.photo_url ? (
                            <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                <User size={14} />
                            </div>
                        )}
                    </div>
                    <div className="truncate font-medium text-zinc-700 dark:text-zinc-300">
                        {student.name}
                    </div>
                </div>

                {/* GPA */}
                <div className="w-16 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {student.gpa || '-'}
                </div>
            </div>
        );
    };

    return (
        <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center px-4 py-3 bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <div className="w-20">Roll</div>
                <div className="flex-1">Student</div>
                <div className="w-16 text-right">GPA</div>
            </div>

            {/* Virtualized List */}
            <div className="flex-1">
                {/* 
                   Height is arbitrary here. In a real app, use AutoSizer or calc(). 
                   Assuming parent container constrains height. 
                   For now, fixed height fallback or passed via props would be better.
                   I will use a fixed height for simplicity, or 600px default.
                */}
                <List
                    height={600}
                    itemCount={students.length}
                    itemSize={60}
                    width="100%"
                >
                    {Row}
                </List>
            </div>
        </div>
    );
};

export default MeritList;
