
import React, { useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Task, TaskPriority, User } from '../types';
import WelcomeEmptyState from './WelcomeEmptyState';

const getQuarter = (date: Date): string => {
    const d = new Date(date);
    const month = d.getMonth();
    const year = d.getFullYear();
    const quarter = Math.floor(month / 3) + 1;
    return `Q${quarter} ${year}`;
};

const priorityClasses: Record<TaskPriority, { border: string; }> = {
  [TaskPriority.HIGH]: { border: 'border-danger/80' },
  [TaskPriority.MEDIUM]: { border: 'border-warning/80' },
  [TaskPriority.LOW]: { border: 'border-success/80' },
};

const RoadmapTaskCard: React.FC<{ task: Task, onClick: () => void }> = ({ task, onClick }) => {
    const priorityStyle = priorityClasses[task.priority] || priorityClasses[TaskPriority.MEDIUM];
    const assignees = task.assignees || [];
    return (
        <div 
            onClick={onClick}
            className={`bg-surface p-2.5 rounded-lg border-l-4 ${priorityStyle.border} shadow-m3-sm hover:shadow-m3-md hover:-translate-y-px transition-all cursor-pointer`}
        >
            <p className="text-sm font-semibold text-on-surface truncate">{task.title}</p>
            <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-on-surface-variant">
                    Due: {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <div className="flex -space-x-1">
                    {assignees.slice(0, 2).map(user => (
                        <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="h-5 w-5 rounded-full border border-surface"/>
                    ))}
                    {assignees.length > 2 && (
                        <div className="h-5 w-5 rounded-full bg-outline text-on-surface-variant text-[10px] flex items-center justify-center border border-surface">
                            +{assignees.length - 2}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const RoadmapView: React.FC = () => {
    const { projects, allTasks, viewTask, isLoading, allUsers } = useAppContext();

    const hydratedTasks = useMemo(() => {
        return allTasks.map(task => {
            if (task.assignees && Array.isArray(task.assignees)) return task;
            return {
                ...task,
                assignees: (task.assigneeIds || []).map(id => allUsers.find(u => u.id === id)).filter((u): u is User => !!u)
            };
        });
    }, [allTasks, allUsers]);

    const { tasksByProjectAndQuarter, allQuarters } = useMemo(() => {
        const grouped: Record<string, Record<string, Task[]>> = {};
        const quarters = new Set<string>();

        hydratedTasks.forEach(task => {
            const projectId = task.projectId;
            const quarter = getQuarter(task.dueDate);
            quarters.add(quarter);

            if (!grouped[projectId]) {
                grouped[projectId] = {};
            }
            if (!grouped[projectId][quarter]) {
                grouped[projectId][quarter] = [];
            }
            grouped[projectId][quarter].push(task);
        });
        
        // Sort tasks within each cell by due date
        for (const projectId in grouped) {
            for (const quarter in grouped[projectId]) {
                grouped[projectId][quarter].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
            }
        }

        const sortedQuarters = Array.from(quarters).sort((a, b) => {
            const [aQ, aY] = a.split(' ');
            const [bQ, bY] = b.split(' ');
            if (aY !== bY) return Number(aY) - Number(bY);
            return Number(aQ.substring(1)) - Number(bQ.substring(1));
        });

        return { tasksByProjectAndQuarter: grouped, allQuarters: sortedQuarters };
    }, [hydratedTasks]);

    if (projects.length === 0 && !isLoading) {
        return <WelcomeEmptyState />;
    }

    return (
        <div className="h-full flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold text-on-surface">Feature Roadmap</h1>
                <p className="text-on-surface-variant mt-1">A high-level overview of features planned across all projects.</p>
            </div>
            
            <div className="flex-1 overflow-auto border border-outline/30 rounded-2xl bg-surface shadow-m3-sm">
                <div className="min-w-fit">
                    {/* Header */}
                    <div className="grid sticky top-0 bg-surface-variant/40 backdrop-blur-sm z-10" style={{ gridTemplateColumns: `250px repeat(${allQuarters.length}, minmax(280px, 1fr))` }}>
                        <div className="p-4 font-semibold text-on-surface border-b border-r border-outline/30">Projects</div>
                        {allQuarters.map(q => (
                            <div key={q} className="p-4 font-semibold text-on-surface border-b border-r border-outline/30 text-center">
                                {q}
                            </div>
                        ))}
                    </div>

                    {/* Body */}
                    {projects.map((project, index) => (
                        <div 
                            key={project.id} 
                            className="grid"
                            style={{ gridTemplateColumns: `250px repeat(${allQuarters.length}, minmax(280px, 1fr))` }}
                        >
                            <div className={`p-4 font-semibold text-on-surface border-r border-outline/30 ${index < projects.length - 1 ? 'border-b' : ''}`}>
                                {project.name}
                            </div>
                            {allQuarters.map(quarter => (
                                <div key={quarter} className={`p-3 border-r border-outline/30 space-y-3 ${index < projects.length - 1 ? 'border-b' : ''}`}>
                                    {(tasksByProjectAndQuarter[project.id]?.[quarter] || []).map(task => (
                                        <RoadmapTaskCard key={task.id} task={task} onClick={() => viewTask(task)} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    ))}
                     {projects.length === 0 && (
                        <div className="text-center p-12 text-on-surface-variant">
                            <p>No projects found. Create a project to start planning your roadmap.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RoadmapView;
