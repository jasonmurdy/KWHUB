
import React, { useMemo } from 'react';
import { Task, TaskPriority, User } from '../types';
import { CheckCircle2, CalendarDaysIcon, ClockIcon, PlayIcon, PauseIcon, TagIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';
import { isTaskCompleted, isTaskOverdue, isTaskDueToday, safeDate } from '../utils';

interface TaskCardProps {
  task: Task;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

const priorityConfig: Record<TaskPriority, { border: string, bg: string, text: string }> = {
  [TaskPriority.HIGH]: { border: 'bg-danger', bg: 'bg-danger/5', text: 'text-danger' },
  [TaskPriority.MEDIUM]: { border: 'bg-warning', bg: 'bg-warning/5', text: 'text-warning' },
  [TaskPriority.LOW]: { border: 'bg-success', bg: 'bg-success/5', text: 'text-success' },
};

const TaskCardComponent: React.FC<TaskCardProps> = ({ task, isSelected, onClick }) => {
    const { projects, allUsers, updateTask, startFocusSession, focusState, pauseFocusSession, cardVisibilityConfig } = useAppContext();
    const { addToast } = useToast();

    const project = useMemo(() => projects.find(p => p.id === task.projectId), [projects, task.projectId]);
    
    const assignees = useMemo(() => {
        const ids = task.assigneeIds || [];
        if (task.assignees && Array.isArray(task.assignees) && task.assignees.length > 0) return task.assignees;
        return ids
            .map(id => allUsers.find(u => u.id === id))
            .filter((u): u is User => !!u);
    }, [task.assignees, task.assigneeIds, allUsers]);

    const activeCustomFields = useMemo(() => {
        if (!project?.customFields || !task.customFieldValues) return [];
        return project.customFields.filter(f => {
            const val = task.customFieldValues?.[f.id];
            return val !== undefined && val !== null && val !== '';
        });
    }, [project, task.customFieldValues]);

    const subtasks = task.subtasks || [];
    const completedSubtasks = subtasks.filter(s => s.isCompleted).length;
    
    const doneStatus = useMemo(() => {
        const workflow = project?.workflow || [];
        return workflow.find(s => ['done', 'complete', 'closed', 'archived', 'sold', 'launched'].includes(s.name.toLowerCase()) || s.id === 'done') || (workflow.length > 0 ? workflow[workflow.length - 1] : undefined);
    }, [project]);
    
    const isCompleted = isTaskCompleted(task, project);
    const dueDate = safeDate(task.dueDate);
    const isOverdue = isTaskOverdue(task, project);
    const isDueToday = isTaskDueToday(task, project);
    const isFocused = focusState.taskId === task.id && focusState.isActive;
    const config = priorityConfig[task.priority] || priorityConfig[TaskPriority.MEDIUM];

    const handleToggleComplete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!project) return;
        const workflow = project.workflow || [];
        if (isCompleted && workflow.length > 0) {
            updateTask(task.id, { status: workflow[0].id });
        } else if (doneStatus) {
            updateTask(task.id, { status: doneStatus.id });
            addToast({ type: 'success', title: 'Task Completed!', message: `"${task.title}" marked as done.` });
        }
    };

    const handleToggleFocus = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isFocused) pauseFocusSession();
        else startFocusSession(task);
    };

  return (
    <motion.div
      layout="position"
      onClick={onClick}
      className={`group relative bg-surface rounded-2xl shadow-md border transition-all duration-200 cursor-pointer
        ${isSelected ? 'ring-2 ring-primary border-primary z-10' : 'border-outline/40 hover:border-primary/40 hover:shadow-lg'}
        ${isFocused ? 'ring-2 ring-primary/50 ' + config.bg : ''}
        ${isCompleted ? 'opacity-60 grayscale-[0.5]' : ''}
      `}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${config.border} ${isCompleted ? 'opacity-30' : ''}`} />
      <div className="pl-4 pr-3 py-3 sm:pl-5 sm:pr-4 sm:py-4 flex flex-col gap-2 sm:gap-3">
        {project && (
            <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: project.color }} />
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-70 truncate">{project.name}</span>
            </div>
        )}
        <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
                <h4 className={`font-bold text-sm sm:text-base leading-tight text-on-surface line-clamp-2 ${isCompleted ? 'line-through text-on-surface-variant' : ''}`}>{task.title}</h4>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                 {!isCompleted && (
                    <button onClick={handleToggleFocus} className={`p-1.5 sm:p-2 rounded-xl transition-all ${isFocused ? 'text-primary bg-primary/10' : 'text-on-surface-variant/40 hover:text-primary hover:bg-primary/5'}`}>
                        {isFocused && !focusState.isPaused ? <PauseIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" /> : <PlayIcon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />}
                    </button>
                )}
                <button onClick={handleToggleComplete} className={`p-1.5 sm:p-2 rounded-xl transition-all ${isCompleted ? 'text-success bg-success/5' : 'text-on-surface-variant/20 hover:text-success hover:bg-success/10'}`}>
                    <CheckCircle2 className={`w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 ${isCompleted ? 'fill-success/10' : ''}`} />
                </button>
            </div>
        </div>

        {/* Custom Fields Row */}
        {activeCustomFields.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-0.5">
                {activeCustomFields.map(field => (
                    <div key={field.id} className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface-variant/40 border border-outline/10 text-[8px] font-black uppercase tracking-tight text-on-surface-variant">
                        <TagIcon className="w-2.5 h-2.5 opacity-40" />
                        <span className="opacity-60">{field.name}:</span>
                        <span className="text-on-surface truncate max-w-[80px]">
                            {field.type === 'boolean' ? (task.customFieldValues?.[field.id] ? 'YES' : 'NO') : String(task.customFieldValues?.[field.id])}
                        </span>
                    </div>
                ))}
            </div>
        )}

        <div className="flex items-center justify-between mt-0.5">
            <div className="flex items-center gap-2 sm:gap-3">
                {cardVisibilityConfig.showDueDate && (
                    <div className="flex flex-wrap gap-1.5">
                        {task.startDate && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-variant/30 text-[9px] font-bold uppercase tracking-tight text-on-surface-variant/70">
                                <span className="opacity-50">S:</span>
                                <span>{safeDate(task.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            </div>
                        )}
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-tight ${isOverdue ? 'bg-danger/10 text-danger' : isDueToday ? 'bg-primary/10 text-primary' : 'bg-surface-variant/50 text-on-surface-variant'}`}>
                            {isOverdue ? <ClockIcon className="h-3.5 w-3.5" /> : <CalendarDaysIcon className="h-3.5 w-3.5" />}
                            <span>{dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        </div>
                        {task.eventDate && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/5 text-[9px] font-bold uppercase tracking-tight text-primary/70 border border-primary/10">
                                <span className="opacity-50">E:</span>
                                <span>{safeDate(task.eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            </div>
                        )}
                    </div>
                )}
                {cardVisibilityConfig.showSubtasks && subtasks.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-variant/30 text-[10px] sm:text-[11px] font-bold text-on-surface-variant/70">
                         <span className={completedSubtasks === subtasks.length ? 'text-success' : ''}>{completedSubtasks}/{subtasks.length}</span>
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                {/* Subtask Assignees */}
                {cardVisibilityConfig.showSubtasks && subtasks.length > 0 && (
                    <div className="flex -space-x-1">
                        {Array.from(new Set(subtasks.flatMap(st => st.assigneeIds || [])))
                            .slice(0, 3)
                            .map(uid => {
                                const u = allUsers.find(user => user.id === uid);
                                if (!u) return null;
                                return <img key={uid} src={u.avatarUrl} className="h-6 w-6 rounded-full border-2 border-surface bg-surface-variant shadow-sm" title={`Assigned to subtask: ${u.name}`} alt={u.name} />
                            })}
                    </div>
                )}

                {/* Task Assignees */}
                {cardVisibilityConfig.showAssignees && assignees.length > 0 && (
                    <div className="flex -space-x-2">
                        {assignees.slice(0, 3).map(user => <img key={user.id} src={user.avatarUrl} alt={user.name} className="h-7 w-7 rounded-full border-2 border-surface bg-surface-variant shadow-sm" />)}
                        {assignees.length > 3 && <div className="h-7 w-7 rounded-full bg-surface-variant text-on-surface-variant text-[9px] sm:text-[10px] font-black flex items-center justify-center border-2 border-surface shadow-sm">+{assignees.length - 3}</div>}
                    </div>
                )}
            </div>
        </div>
      </div>
    </motion.div>
  );
};

const TaskCard = React.memo(TaskCardComponent, (p, n) => {
    const pDate = safeDate(p.task.updatedAt).getTime();
    const nDate = safeDate(n.task.updatedAt).getTime();
    return p.task.id === n.task.id && p.task.status === n.task.status && pDate === nDate && p.isSelected === n.isSelected;
});

TaskCard.displayName = 'TaskCard';

export default TaskCard;
