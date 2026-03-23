
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { PlusIcon, CheckCircle2, TargetIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Habit, HabitLog } from '../types';

const HabitCard: React.FC<{ habit: Habit, log: HabitLog | undefined, onLog: (count: number) => void }> = ({ habit, log, onLog }) => {
    const currentCount = log?.count || 0;
    const progress = Math.min((currentCount / habit.targetCount) * 100, 100);
    const isComplete = currentCount >= habit.targetCount;

    const handleIncrement = () => {
        if (!isComplete && currentCount + 1 === habit.targetCount) {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }
        onLog(currentCount + 1);
    };

    return (
        <motion.div 
            layout
            className={`p-6 rounded-[2.5rem] border bg-surface transition-all relative overflow-hidden group
                ${isComplete ? 'border-success/30 shadow-lg' : 'border-outline/10 hover:border-primary/30'}
            `}
        >
            <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl transition-colors ${isComplete ? 'bg-success text-on-primary shadow-m3-md' : 'bg-surface-variant/30 text-on-surface-variant'}`} style={!isComplete ? { color: habit.color } : {}}>
                    <TargetIcon className="w-6 h-6" />
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-40 mb-1">Status</p>
                    {isComplete ? (
                        <span className="text-[10px] font-black text-success uppercase tracking-widest flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Fully Synced
                        </span>
                    ) : (
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">Active Focus</span>
                    )}
                </div>
            </div>

            <h3 className="text-xl font-black text-on-surface uppercase tracking-tight mb-2 leading-none">{habit.title}</h3>
            <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mb-6">Target: {habit.targetCount} {habit.unit}</p>

            <div className="relative h-20 flex items-center justify-center mb-6">
                <svg className="w-20 h-20 transform -rotate-90">
                    <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-outline/10" />
                    <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="6" fill="transparent" 
                        strokeDasharray={226} strokeDashoffset={226 - (226 * progress) / 100}
                        className={`transition-all duration-700 ${isComplete ? 'text-success' : 'text-primary'}`}
                        style={!isComplete ? { color: habit.color } : {}}
                    />
                </svg>
                <span className="absolute text-sm font-black text-on-surface">{currentCount}</span>
            </div>

            <button 
                onClick={handleIncrement}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-m3-sm active:scale-95
                    ${isComplete ? 'bg-success/10 text-success' : 'bg-primary text-on-primary hover:bg-primary/90'}
                `}
                style={!isComplete ? { backgroundColor: habit.color } : {}}
            >
                {isComplete ? 'Daily Goal Met' : `Log ${habit.unit}`}
            </button>
        </motion.div>
    );
};

const HabitsView: React.FC = () => {
    const { habits, habitLogs, logHabit, createHabit } = useAppContext();
    const today = new Date().toISOString().split('T')[0];
    
    const [isCreating, setIsCreating] = useState(false);
    const [newHabit, setNewHabit] = useState({ title: '', targetCount: 10, unit: 'Calls', color: '#8b5cf6' });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        await createHabit({ ...newHabit, frequency: 'daily' });
        setIsCreating(false);
        setNewHabit({ title: '', targetCount: 10, unit: 'Calls', color: '#8b5cf6' });
    };

    return (
        <div className="h-full flex flex-col gap-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1 shrink-0">
                <div>
                    <h1 className="text-5xl font-black text-on-surface tracking-tighter uppercase mb-1">Growth Streaks</h1>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
                            <p className="text-[10px] font-black text-secondary uppercase tracking-[0.3em]">Performance Architecture</p>
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-3 px-8 py-4 bg-primary text-on-primary rounded-[1.8rem] font-black text-sm uppercase tracking-widest shadow-m3-lg hover:scale-105 active:scale-95 transition-all"
                >
                    <PlusIcon className="w-5 h-5" /> New Daily Target
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-32">
                {habits.map(habit => (
                    <HabitCard 
                        key={habit.id} 
                        habit={habit} 
                        log={habitLogs.find(l => l.habitId === habit.id && l.date === today)}
                        onLog={(count) => logHabit(habit.id, count)}
                    />
                ))}
                
                {habits.length === 0 && (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center bg-surface-variant/10 border-2 border-dashed border-outline/10 rounded-[4rem] text-on-surface-variant/20">
                         <TargetIcon className="w-20 h-20 mb-4 opacity-10" />
                         <p className="font-black uppercase tracking-[0.3em] text-sm">No growth tracks defined</p>
                         <p className="text-[10px] font-bold mt-2 max-w-xs text-center leading-relaxed">Systematize your lead generation. Add habits for DTD2 database calls, handwritten notes, or social touches.</p>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isCreating && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <motion.form 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                            onSubmit={handleCreate}
                            className="bg-surface p-10 rounded-[3rem] shadow-2xl border border-outline/30 w-full max-w-md space-y-8"
                        >
                            <h2 className="text-2xl font-black text-on-surface uppercase tracking-tight">New Target Track</h2>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block">Action Title</label>
                                    <input autoFocus value={newHabit.title} onChange={e => setNewHabit({...newHabit, title: e.target.value})} placeholder="e.g. Database DTD2 Calls" className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block">Daily Goal</label>
                                        <input type="number" value={newHabit.targetCount} onChange={e => setNewHabit({...newHabit, targetCount: Number(e.target.value)})} className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl px-5 py-4 text-sm font-bold outline-none" required />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block">Unit</label>
                                        <input value={newHabit.unit} onChange={e => setNewHabit({...newHabit, unit: e.target.value})} placeholder="Calls" className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl px-5 py-4 text-sm font-bold outline-none" required />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-4 text-xs font-black uppercase text-on-surface-variant bg-surface-variant/30 rounded-2xl">Cancel</button>
                                <button type="submit" className="flex-1 py-4 text-xs font-black uppercase text-on-primary bg-primary rounded-2xl shadow-m3-md">Activate Track</button>
                            </div>
                        </motion.form>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default HabitsView;
