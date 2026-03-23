

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Task } from '../types';
import { isTaskOverdue } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ClockIcon } from './icons';
import confetti from 'canvas-confetti';

interface FocusTaskCardProps {
    task: Task;
    onComplete: (task: Task) => void;
    onStart: (task: Task) => void;
    isActive: boolean;
}

const FocusTaskCard = React.forwardRef<HTMLDivElement, FocusTaskCardProps>((props, ref) => {
    const { task, onComplete, onStart, isActive } = props;
    const { projects } = useAppContext();
    const project = projects.find(p => p.id === task.projectId);
    
    const isOverdue = isTaskOverdue(task, project);

    const handleCheck = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Trigger confetti
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: rect.top / window.innerHeight, x: rect.left / window.innerWidth }
        });
        onComplete(task);
    };

    return (
        <div
            ref={ref}
            onClick={() => onStart(task)}
            className={`bg-surface border rounded-2xl p-6 shadow-m3-sm hover:shadow-m3-md transition-all flex items-center gap-6 group cursor-pointer ${isActive ? 'ring-2 ring-primary bg-primary/5' : ''}`}
            style={{
                borderColor: isActive ? 'rgb(var(--color-primary))' : 'rgb(var(--color-outline) / 0.3)'
            }}
        >
            <button 
                onClick={handleCheck}
                className="w-8 h-8 rounded-full border-2 border-outline hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-all group-hover:scale-110 flex-shrink-0"
            >
                <div className="w-0 h-0 bg-primary rounded-full transition-all group-hover:w-4 group-hover:h-4" />
            </button>
            
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-on-surface-variant bg-surface-variant px-2 py-0.5 rounded-full">{project?.name}</span>
                    {isOverdue && <span className="text-xs font-semibold text-danger bg-danger/10 px-2 py-0.5 rounded-full flex items-center gap-1"><ClockIcon className="h-3 w-3" /> Overdue</span>}
                </div>
                <h3 className="text-xl font-semibold text-on-surface">{task.title}</h3>
                {task.description && <p className="text-sm text-on-surface-variant mt-1 line-clamp-1">{task.description}</p>}
            </div>
            
            <div className="text-right text-sm text-on-surface-variant flex-shrink-0">
               {new Date(task.dueDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </div>
        </div>
    );
});

FocusTaskCard.displayName = 'FocusTaskCard';

const MotionFocusTaskCard = motion(FocusTaskCard);

const FocusModeView: React.FC = () => {
    const { allTasks, currentUser, projects, updateTask } = useAppContext();
    const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
    const [isTimerActive, setIsTimerActive] = useState(false);

    const focusTasks = useMemo(() => {
        if (!currentUser) return [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        return allTasks.filter(task => {
            if (completedTasks.has(task.id) || task.isCompleted) return false;
            // Filter by assignee
            if (!task.assigneeIds?.includes(currentUser.id)) return false;
            // Filter by status (not done)
            const project = projects.find(p => p.id === task.projectId);
            const isDone = task.isCompleted || project?.workflow.find(s => s.id === task.status)?.name.toLowerCase() === 'done';
            if (isDone) return false;

            // Filter by date (due today or overdue)
            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0,0,0,0);
            return dueDate <= today;
        }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [allTasks, currentUser, projects, completedTasks]);

    const handleComplete = useCallback(async (task: Task) => {
        setCompletedTasks(prev => new Set(prev).add(task.id));
        if (activeTaskId === task.id) {
            setActiveTaskId(null);
            setIsTimerActive(false);
            setTimeLeft(25 * 60);
        }
        // Actual update logic
        const project = projects.find(p => p.id === task.projectId);
        const doneStatus = project?.workflow.find(s => s.name.toLowerCase() === 'done');
        if (doneStatus) {
             // Delay actual update slightly to allow exit animation
             setTimeout(() => {
                 updateTask(task.id, { status: doneStatus.id });
             }, 500);
        }
    }, [activeTaskId, projects, updateTask]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (isTimerActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft((prevTime) => prevTime - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            // Timer finished
            setIsTimerActive(false);
            const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
            audio.play();
            if (activeTaskId) {
                // Auto-complete or just notify? Let's just notify for now to avoid blocking window.confirm
                const task = focusTasks.find(t => t.id === activeTaskId);
                if (task) {
                    // We could show a custom toast or modal here
                }
            }
            setTimeLeft(25 * 60);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTimerActive, timeLeft, activeTaskId, allTasks, handleComplete, focusTasks]);

    const handleStartTask = (task: Task) => {
        if (activeTaskId === task.id) {
            setIsTimerActive(!isTimerActive);
        } else {
            setActiveTaskId(task.id);
            setTimeLeft(25 * 60);
            setIsTimerActive(true);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!currentUser) return null;

    return (
        <div className="h-full flex flex-col items-center max-w-3xl mx-auto py-8">
            <div className="text-center mb-10 sticky top-0 bg-background/90 backdrop-blur-md z-10 w-full py-4 border-b border-outline/10">
                <div className="flex flex-col items-center justify-center">
                    <div className="text-6xl font-bold text-primary font-mono tracking-widest mb-2">
                        {formatTime(timeLeft)}
                    </div>
                    <p className="text-sm font-medium text-on-surface-variant uppercase tracking-widest">
                        {isTimerActive ? 'Focusing...' : 'Ready to Focus'}
                    </p>
                    <div className="mt-4 flex gap-4">
                        <button 
                            onClick={() => setIsTimerActive(!isTimerActive)}
                            className={`px-6 py-2 rounded-full font-bold transition-all ${isTimerActive ? 'bg-danger/10 text-danger hover:bg-danger/20' : 'bg-primary text-on-primary hover:bg-primary/90'}`}
                        >
                            {isTimerActive ? 'Pause' : 'Start Timer'}
                        </button>
                        <button 
                            onClick={() => { setIsTimerActive(false); setTimeLeft(25 * 60); }}
                            className="px-6 py-2 rounded-full font-bold text-on-surface-variant bg-surface-variant hover:bg-surface-variant/80 transition-all"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            <div className="w-full space-y-4 px-4 pb-20">
                <h2 className="text-xl font-bold text-on-surface mb-4">My Day</h2>
                <AnimatePresence mode='popLayout'>
                    {focusTasks.length > 0 ? (
                        focusTasks.map(task => (
                            <MotionFocusTaskCard 
                                key={task.id} 
                                task={task} 
                                onComplete={handleComplete} 
                                onStart={handleStartTask}
                                isActive={activeTaskId === task.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ 
                                    opacity: 1, 
                                    y: 0, 
                                    scale: activeTaskId === task.id ? 1.05 : 1
                                }}
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            />
                        ))
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-20"
                        >
                            <CheckCircle2 className="h-24 w-24 text-success/20 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-on-surface">All Caught Up!</h2>
                            <p className="text-on-surface-variant mt-2">You&apos;ve cleared your plate for today. Enjoy the peace.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default FocusModeView;