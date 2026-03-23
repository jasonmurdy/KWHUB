
import React, { useMemo } from 'react';
import { Task, Project, TaskPriority } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import DonutChart from './DonutChart';
import BarChart from './BarChart';

interface OverviewChartsProps {
  tasks: Task[];
  project: Project | null; // null if "All Projects" is selected
}

const OverviewCharts: React.FC<OverviewChartsProps> = ({ tasks, project }) => {
    const { allUsers, projects } = useAppContext();

    const tasksByStatusData = useMemo(() => {
        const workflow = project ? (project.workflow || []) : [...new Map(projects.flatMap(p => p.workflow || []).map(item => [item.id, item])).values()];
        const statusCounts = workflow.map(status => ({
            name: status.name,
            value: tasks.filter(t => t.status === status.id).length,
            color: status.color,
        })).filter(d => d.value > 0);

        return statusCounts;
    }, [tasks, project, projects]);

    const tasksByPriorityData = useMemo(() => {
        const priorities = Object.values(TaskPriority);
        const priorityColors: Record<TaskPriority, string> = {
            [TaskPriority.HIGH]: '#EF4444',
            [TaskPriority.MEDIUM]: '#F59E0B',
            [TaskPriority.LOW]: '#10B981',
        };
        const priorityCounts = priorities.map(priority => ({
            name: priority,
            value: tasks.filter(t => t.priority === priority).length,
            color: priorityColors[priority],
        })).filter(d => d.value > 0);

        return priorityCounts;
    }, [tasks]);

    const tasksByAssigneeData = useMemo(() => {
        const assigneeCounts: { [key: string]: number } = {};
        tasks.forEach(task => {
            task.assigneeIds?.forEach(id => {
                assigneeCounts[id] = (assigneeCounts[id] || 0) + 1;
            });
        });

        const chartData = Object.entries(assigneeCounts).map(([userId, count]) => {
            const user = allUsers.find(u => u.id === userId);
            return {
                label: user ? user.name : 'Unknown',
                value: count,
            };
        }).sort((a, b) => b.value - a.value);

        return chartData;
    }, [tasks, allUsers]);

    if (tasks.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-center p-8">
                <div className="flex flex-col items-center gap-4">
                    <h3 className="text-xl font-semibold text-on-surface">No Task Data Available</h3>
                    <p className="text-on-surface-variant">There are no tasks for the selected project to display in the charts.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-surface p-6 rounded-2xl shadow-m3-sm border border-outline/30">
                <h3 className="text-lg font-bold text-on-surface mb-4">Workload by Assignee</h3>
                <BarChart data={tasksByAssigneeData} />
            </div>
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                 <div className="bg-surface p-6 rounded-2xl shadow-m3-sm border border-outline/30">
                    <h3 className="text-lg font-bold text-on-surface mb-4">Tasks by Status</h3>
                    <DonutChart data={tasksByStatusData} />
                </div>
                 <div className="bg-surface p-6 rounded-2xl shadow-m3-sm border border-outline/30">
                    <h3 className="text-lg font-bold text-on-surface mb-4">Tasks by Priority</h3>
                    <DonutChart data={tasksByPriorityData} />
                </div>
            </div>
        </div>
    );
};

export default OverviewCharts;
