
import { Task, Project } from './types';

export const isTaskCompleted = (task: Task, project?: Project | null): boolean => {
    if (task.isCompleted) return true;
    
    const doneNames = ['done', 'complete', 'closed', 'archived', 'sold', 'launched'];
    
    // Check if status name itself matches common "done" names
    if (task.status && doneNames.includes(task.status.toLowerCase())) return true;

    if (!project) {
        return false;
    }

    const workflow = project.workflow || [];
    const doneStatusIds = workflow
        .filter(s => doneNames.includes(s.name.toLowerCase()) || s.id === 'done')
        .map(s => s.id);
        
    return doneStatusIds.includes(task.status);
};

type FirestoreTimestamp = { seconds: number; nanoseconds?: number };

export const safeDate = (date: Date | FirestoreTimestamp | string | number | null | undefined): Date => {
    if (!date) return new Date();
    if (typeof date === 'object' && date !== null && 'seconds' in date && typeof (date as FirestoreTimestamp).seconds === 'number') {
        const ts = date as FirestoreTimestamp;
        return new Date(ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000);
    }
    if (date instanceof Date) {
        return isNaN(date.getTime()) ? new Date() : date;
    }
    const d = new Date(date as string | number);
    return isNaN(d.getTime()) ? new Date() : d;
};

export const isTaskOverdue = (task: Task, project?: Project | null): boolean => {
    if (isTaskCompleted(task, project)) return false;
    const dueDate = safeDate(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
};

export const isTaskDueToday = (task: Task, project?: Project | null): boolean => {
    if (isTaskCompleted(task, project)) return false;
    const dueDate = safeDate(task.dueDate);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString();
};
