import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Subtask } from '../types';
import { AnimatedCheckbox } from './AnimatedCheckbox';

interface PublicChecklist {
    id: string;
    taskId: string;
    title: string;
    subtasks: Subtask[];
    shareToken: string;
    createdAt: unknown;
    assigneeIdFilter?: string;
}

interface PublicTaskChecklistProps {
    taskId?: string;
}

const PublicTaskChecklist: React.FC<PublicTaskChecklistProps> = () => {
    const [checklist, setChecklist] = useState<PublicChecklist | null>(null);
    const [localSubtasks, setLocalSubtasks] = useState<Subtask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const token = searchParams.get('token');
        if (!token) {
            setError('Missing share token.');
            setIsLoading(false);
            return;
        }

        const path = `public_checklists/${token}`;
        const unsubscribe = onSnapshot(doc(db, 'public_checklists', token), (doc) => {
            if (doc.exists()) {
                const data = doc.data() as PublicChecklist;
                setChecklist({ id: doc.id, ...data });
            } else {
                setError('Checklist not found.');
            }
            setIsLoading(false);
        }, (err) => {
            console.error('Error fetching checklist:', err instanceof Error ? err.message : 'An unknown error occurred');
            handleFirestoreError(err, OperationType.GET, path);
            setError('Failed to load checklist.');
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (checklist) {
            setLocalSubtasks(checklist.subtasks || []);
        }
    }, [checklist]);

    const toggleSubtask = (subtaskId: string) => {
        setLocalSubtasks(prev => prev.map(st => 
            st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
        ));
    };

    const handleSubmit = async () => {
        if (!checklist) return;
        const searchParams = new URLSearchParams(window.location.search);
        const token = searchParams.get('token');
        if (!token) return;

        setIsSubmitting(true);
        try {
            // 1. Update the checklist document
            const checklistRef = doc(db, 'public_checklists', token);
            await updateDoc(checklistRef, { subtasks: localSubtasks });

            // 2. Update the main task document
            const taskRef = doc(db, 'tasks', checklist.taskId);
            await updateDoc(taskRef, { subtasks: localSubtasks });

            setIsSubmitted(true);
        } catch (err: unknown) {
            console.error('Sync error:', err instanceof Error ? err.message : 'An unknown error occurred');
            setError(err instanceof Error ? err.message : 'Failed to submit updates.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-danger">{error}</div>;
    if (!checklist) return <div className="min-h-screen flex items-center justify-center">Checklist not found.</div>;

    if (isSubmitted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Updates Submitted!</h1>
                <p className="text-on-surface-variant max-w-xs">Your changes have been sent and will be synced with the main task card shortly.</p>
                <button 
                    onClick={() => setIsSubmitted(false)}
                    className="mt-8 px-6 py-3 bg-surface-variant hover:bg-surface-variant/80 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all"
                >
                    Edit Again
                </button>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <div className="mb-12">
                <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">{checklist.title}</h1>
                <p className="text-on-surface-variant font-medium opacity-60">Public Checklist</p>
            </div>

            <div className="space-y-3 mb-12">
                {localSubtasks.map(subtask => {
                    const isLocked = checklist.assigneeIdFilter && !subtask.assigneeIds?.includes(checklist.assigneeIdFilter);
                    return (
                        <div 
                            key={subtask.id} 
                            className={`flex items-center gap-4 p-5 rounded-3xl border transition-all
                                ${subtask.isCompleted 
                                    ? 'bg-success/5 border-success/20' 
                                    : 'bg-surface border-outline/10 shadow-sm'}
                                ${isLocked ? 'opacity-50' : ''}
                            `}
                        >
                            <AnimatedCheckbox 
                                checked={subtask.isCompleted} 
                                onChange={() => toggleSubtask(subtask.id)} 
                                disabled={!!isLocked}
                            />
                            <div 
                                className={`flex-1 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                onClick={() => !isLocked && toggleSubtask(subtask.id)}
                            >
                                <span className={`text-lg font-bold tracking-tight ${subtask.isCompleted ? 'line-through opacity-40 text-on-surface-variant' : 'text-on-surface'}`}>
                                    {subtask.title}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`w-full py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-sm transition-all shadow-lg
                    ${isSubmitting 
                        ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed' 
                        : 'bg-primary text-white hover:scale-[1.02] active:scale-[0.98] shadow-primary/20'}
                `}
            >
                {isSubmitting ? 'Submitting...' : 'Submit Updates'}
            </button>
            
            <p className="text-center mt-6 text-[10px] uppercase font-black tracking-widest text-on-surface-variant opacity-40">
                Changes will be synced to the project team
            </p>
        </div>
    );
};

export default PublicTaskChecklist;
