
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon, ChevronUpIcon, PlayIcon, PauseIcon, StopIcon, TargetIcon, CheckCircle2 } from './icons';
import confetti from 'canvas-confetti';

const FocusTimerWidget: React.FC = () => {
    const { focusState, updateFocusTime, pauseFocusSession, stopFocusSession, updateTask, allTasks, setActiveView } = useAppContext();
    const [isExpanded, setIsExpanded] = useState(false);

    const activeTask = focusState.taskId ? allTasks.find(t => t.id === focusState.taskId) : null;

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (focusState.isActive && !focusState.isPaused && focusState.timeLeft > 0) {
            interval = setInterval(() => {
                updateFocusTime(focusState.timeLeft - 1);
            }, 1000);
        } else if (focusState.timeLeft === 0 && focusState.isActive) {
            // Timer finished
            const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
            audio.play();
            stopFocusSession();
            alert("Focus session complete!");
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [focusState.isActive, focusState.isPaused, focusState.timeLeft, updateFocusTime, stopFocusSession]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleCompleteTask = () => {
        if (!activeTask) return;
        stopFocusSession();
        // Confetti from bottom right
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { x: 0.9, y: 0.9 }
        });
        
        updateTask(activeTask.id, { status: 'done' });
    };

    // If inactive, show a "Start Focus" button
    if (!focusState.isActive || !activeTask) {
        return (
            <div className="fixed bottom-40 right-6 lg:bottom-28 lg:right-8 z-[40]">
                <motion.button
                    onClick={() => setActiveView('focus')}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex items-center justify-center w-14 h-14 bg-surface border-2 border-primary text-primary shadow-m3-lg rounded-full hover:bg-primary hover:text-on-primary transition-all group"
                    title="Enter Focus Mode"
                >
                    <TargetIcon className="w-6 h-6" />
                </motion.button>
            </div>
        );
    }

    return (
        <div className="fixed bottom-40 right-6 lg:bottom-28 lg:right-8 z-[40] flex flex-col items-end">
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20, pointerEvents: 'none' }}
                        className="bg-surface border border-outline/50 shadow-m3-lg rounded-2xl mb-3 p-4 w-72 backdrop-blur-xl"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Focusing On</p>
                                <h4 className="font-semibold text-sm text-on-surface line-clamp-1">{activeTask?.title || 'Unknown Task'}</h4>
                            </div>
                            <button onClick={() => setIsExpanded(false)} className="text-on-surface-variant hover:text-on-surface">
                                <ChevronDownIcon className="h-4 w-4" />
                            </button>
                        </div>
                        
                        <div className="flex items-center justify-center py-4">
                            <span className="text-4xl font-mono font-bold text-on-surface tabular-nums">
                                {formatTime(focusState.timeLeft)}
                            </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                            <button 
                                onClick={focusState.isPaused ? () => pauseFocusSession() : () => pauseFocusSession()} 
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${focusState.isPaused ? 'bg-success/10 text-success' : 'bg-surface-variant text-on-surface-variant'}`}
                            >
                                {focusState.isPaused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
                                {focusState.isPaused ? 'Resume' : 'Pause'}
                            </button>
                            <button onClick={stopFocusSession} className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition-colors" title="Stop Timer">
                                <StopIcon className="h-4 w-4" />
                            </button>
                            <button onClick={handleCompleteTask} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors text-xs font-semibold">
                                <CheckCircle2 className="h-4 w-4" /> Complete
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isExpanded && (
                <motion.button
                    layoutId="focus-pill"
                    onClick={() => setIsExpanded(true)}
                    className="flex items-center gap-3 bg-surface border border-primary/20 shadow-m3-lg rounded-full pl-1 pr-4 py-1 hover:bg-surface-variant transition-all group"
                >
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full -rotate-90 text-primary" viewBox="0 0 36 36">
                            <path
                                className="text-surface-variant"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                            <path
                                className={`${focusState.isPaused ? 'text-warning' : 'text-primary'} transition-colors duration-500`}
                                strokeDasharray={`${(focusState.timeLeft / (25 * 60)) * 100}, 100`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                            />
                        </svg>
                        {focusState.isPaused ? <PauseIcon className="w-4 h-4 text-warning" /> : <PlayIcon className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-bold text-on-surface font-mono tabular-nums">{formatTime(focusState.timeLeft)}</p>
                        <p className="text-[9px] text-on-surface-variant font-medium uppercase tracking-wider line-clamp-1 max-w-[80px]">
                            {activeTask?.title || 'Focus'}
                        </p>
                    </div>
                    <ChevronUpIcon className="w-3 h-3 text-on-surface-variant" />
                </motion.button>
            )}
        </div>
    );
};

export default FocusTimerWidget;
