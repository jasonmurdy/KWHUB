
import React, { useMemo } from 'react';
import { Task, TaskPriority, User } from '../types';
import { CheckCircle2, CalendarDaysIcon, ClockIcon, PlusIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { isTaskCompleted, isTaskOverdue, isTaskDueToday, safeDate } from '../utils';

interface TaskRowProps {
  task: Task;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

const priorityConfig: Record<TaskPriority, { bg: string, text: string, dot: string }> = {
  [TaskPriority.HIGH]: { bg: 'bg-danger/5', text: 'text-danger', dot: 'bg-danger' },
  [TaskPriority.MEDIUM]: { bg: 'bg-warning/5', text: 'text-warning', dot: 'bg-warning' },
  [TaskPriority.LOW]: { bg: 'bg-success/5', text: 'text-success', dot: 'bg-success' },
};

const TaskRow: React.FC<TaskRowProps> = ({ task, isSelected, onClick }) => {
    const { projects, allUsers, updateTask } = useAppContext();
    const { addToast } = useToast();

    const project = useMemo(() => projects.find(p => p.id === task.projectId), [projects, task.projectId]);
    
    const assignees = useMemo(() => {
        const ids = task.assigneeIds || [];
        return ids
            .map(id => allUsers.find(u => u.id === id))
            .filter((u): u is User => !!u);
    }, [task.assigneeIds, allUsers]);

    const activeCustomFields = useMemo(() => {
        if (!project?.customFields || !task.customFieldValues) return [];
        return project.customFields.filter(f => {
            const val = task.customFieldValues?.[f.id];
            return val !== undefined && val !== null && val !== '';
        });
    }, [project, task.customFieldValues]);

    const doneStatus = useMemo(() => {
        const workflow = project?.workflow || [];
        return workflow.find(s => ['done', 'complete', 'closed', 'archived', 'sold', 'launched'].includes(s.name.toLowerCase()) || s.id === 'done') || (workflow.length > 0 ? workflow[workflow.length - 1] : undefined);
    }, [project]);
    
    const isCompleted = isTaskCompleted(task, project);
    const dueDate = safeDate(task.dueDate);
    const isOverdue = isTaskOverdue(task, project);
    const isDueToday = isTaskDueToday(task, project);

    const handleToggleComplete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!project || !doneStatus) return;
        const workflow = project.workflow || [];
        if (isCompleted) {
            updateTask(task.id, { status: workflow[0].id });
        } else {
            updateTask(task.id, { status: doneStatus.id });
            addToast({ type: 'success', title: 'Task Completed' });
        }
    };

    const pStyle = priorityConfig[task.priority] || priorityConfig[TaskPriority.MEDIUM];

    return (
        <div 
            onClick={onClick}
            className={`grid grid-cols-[1fr_auto_120px_140px_120px] items-center gap-4 px-4 py-2.5 bg-surface hover:bg-on-surface/[0.03] cursor-pointer transition-all border-b border-outline/5 group
                ${isSelected ? 'bg-primary/[0.04] ring-1 ring-inset ring-primary/10' : ''}
                ${isCompleted ? 'opacity-60 grayscale-[0.2]' : ''}
            `}
        >
            <div className="flex items-center gap-3.5 min-w-0 ml-1 group-hover:translate-x-0.5 transition-transform duration-200">
                <button 
                    onClick={handleToggleComplete}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 relative overflow-hidden
                        ${isCompleted ? 'bg-success border-success text-on-primary' : 'border-outline/40 hover:border-primary bg-surface shadow-sm'}
                    `}
                >
                    {isCompleted ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircle2 className="w-3 h-3" /></motion.div>
                    ) : (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary scale-0 group-hover:scale-100 transition-transform" />
                    )}
                </button>
                
                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className={`text-sm font-bold tracking-tight ${isCompleted ? 'line-through text-on-surface-variant/50 font-medium' : 'text-on-surface'}`}>
                            {task.title}
                        </span>
                        {task.subtasks?.length > 0 && (
                            <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.1em] text-on-surface-variant/40 px-2 py-0.5 rounded-full bg-surface-variant/20 border border-outline/5 flex-shrink-0">
                                <span className={task.subtasks.filter(s => s.isCompleted).length === task.subtasks.length ? 'text-success' : ''}>
                                    {task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length}
                                </span>
                            </div>
                        )}
                    </div>
                    {/* Inline Custom Fields for List View */}
                    {activeCustomFields.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                            {activeCustomFields.map(field => (
                                <div key={field.id} className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-on-surface-variant/60">
                                    <span className="opacity-40">{field.name}:</span>
                                    <span>{String(task.customFieldValues?.[field.id])}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Apply Template button removed from here */}
            </div>

            <div className="flex items-center px-2 border-l border-outline/5 h-full min-w-0">
                <div className="flex -space-x-1.5 overflow-hidden">
                    {assignees.slice(0, 3).map(u => (
                        <img key={u.id} src={u.avatarUrl} alt={u.name} title={u.name} className="w-7 h-7 rounded-full border-2 border-surface shadow-sm object-cover bg-surface-variant" />
                    ))}
                    {assignees.length > 3 && (
                        <div className="w-7 h-7 rounded-full bg-surface-variant border-2 border-surface flex items-center justify-center text-[8px] font-black text-on-surface-variant shadow-sm">
                            +{assignees.length - 3}
                        </div>
                    )}
                    {assignees.length === 0 && (
                        <div className="w-7 h-7 rounded-full border border-dashed border-outline/30 flex items-center justify-center text-on-surface-variant/20 group-hover:border-primary group-hover:text-primary transition-colors">
                             <PlusIcon className="w-3 h-3" />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center px-2 border-l border-outline/5 h-full">
                <div className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-wider ${isOverdue ? 'text-danger' : isDueToday ? 'text-primary' : 'text-on-surface-variant/60'}`}>
                    {isOverdue ? <ClockIcon className="w-3.5 h-3.5" /> : <CalendarDaysIcon className="w-3.5 h-3.5 opacity-30" />}
                    {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
            </div>

            <div className="flex items-center px-2 border-l border-outline/5 h-full">
                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] border border-transparent shadow-sm flex items-center gap-1.5 ${pStyle.bg} ${pStyle.text}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${pStyle.dot}`} />
                    {task.priority}
                </span>
            </div>
        </div>
    );
};

const MemoizedTaskRow = React.memo(TaskRow);
MemoizedTaskRow.displayName = 'TaskRow';

export default MemoizedTaskRow;
