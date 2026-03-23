
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { AuditLog } from '../types';

interface EnrichedAuditLog extends AuditLog {
  taskTitle: string;
  taskId: string;
  projectId: string;
  projectName: string;
}

// Helper to safely get a Date object from various formats (Date, string, number, Firestore Timestamp)
const toDate = (value: unknown): Date => {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    if (typeof (value as { toDate?: () => Date }).toDate === 'function') return (value as { toDate: () => Date }).toDate(); // Firestore Timestamp
    return new Date(value as string | number | Date);
};

// A simple time formatting utility
const formatRelativeTime = (date: unknown): string => {
    const d = toDate(date);
    const now = new Date();
    const seconds = Math.round((now.getTime() - d.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
};


const ActivityLogView: React.FC = () => {
    const { allTasks, projects, allUsers, viewTask, fetchTaskById } = useAppContext();
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<string>('all');

    const allLogs = useMemo<EnrichedAuditLog[]>(() => {
        const logs: EnrichedAuditLog[] = [];
        allTasks.forEach(task => {
            const project = projects.find(p => p.id === (task as { projectId: string }).projectId);
            if (Array.isArray(task.auditTrail)) {
                task.auditTrail.forEach(log => {
                    logs.push({
                        ...log,
                        taskTitle: task.title,
                        taskId: task.id,
                        projectId: (task as { projectId: string }).projectId,
                        projectName: project ? project.name : 'Unknown Project'
                    });
                });
            }
        });
        return logs.sort((a, b) => toDate(b.timestamp).getTime() - toDate(a.timestamp).getTime());
    }, [allTasks, projects]);

    const filteredLogs = useMemo(() => {
        return allLogs.filter(log => {
            const projectMatch = selectedProject === 'all' || log.projectId === selectedProject;
            const userMatch = selectedUser === 'all' || log.user.id === selectedUser;
            return projectMatch && userMatch;
        });
    }, [allLogs, selectedProject, selectedUser]);
    
    const handleTaskClick = async (taskId: string) => {
        const task = await fetchTaskById(taskId);
        if (task) {
            viewTask(task);
        }
    };

    return (
        <div className="h-full flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold text-on-surface">Activity Log</h1>
                <p className="text-on-surface-variant mt-1">A complete history of actions across all your projects.</p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <label htmlFor="project-filter" className="block text-sm font-medium text-on-surface-variant mb-1">Filter by Project</label>
                    <select id="project-filter" value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary">
                        <option value="all">All Projects</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="flex-1">
                     <label htmlFor="user-filter" className="block text-sm font-medium text-on-surface-variant mb-1">Filter by User</label>
                    <select id="user-filter" value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary">
                        <option value="all">All Users</option>
                        {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Log List */}
            <div className="bg-surface p-4 rounded-2xl shadow-m3-sm border border-outline/30 flex-1 overflow-y-auto">
                <div className="space-y-4">
                    {filteredLogs.length > 0 ? filteredLogs.map(log => (
                        <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-surface-variant transition-colors">
                            <img src={log.user.avatarUrl} alt={log.user.name} className="w-10 h-10 rounded-full mt-1" />
                            <div className="flex-1">
                                <p className="text-sm text-on-surface-variant">
                                    <span className="font-semibold text-on-surface">{log.user.name}</span>
                                    {' '}{log.action.toLowerCase()} on task{' '}
                                    <button onClick={() => handleTaskClick(log.taskId)} className="font-semibold text-primary hover:underline">&quot;{log.taskTitle}&quot;</button>
                                    {' '}in project{' '}
                                    <span className="font-medium text-on-surface-variant">{log.projectName}</span>.
                                </p>
                                <p className="text-xs text-on-surface-variant/70 mt-1">{formatRelativeTime(log.timestamp)}</p>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center h-full flex items-center justify-center text-on-surface-variant p-8">
                            <p>No activity found for the selected filters.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityLogView;
