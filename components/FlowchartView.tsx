
import React, { useMemo } from 'react';
import { Task, Project, WorkflowStatus } from '../types';

interface FlowchartViewProps {
  tasks: Task[];
  project: Project | null;
}

/* Fix: Internal local icon definition to ensure cross-platform compatibility without heavy external dependencies */
const ArrowRightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
  </svg>
);

const FlowchartNode: React.FC<{ status: WorkflowStatus; taskCount: number; isLast: boolean }> = ({ status, taskCount, isLast }) => (
    <div className="flex flex-col items-center">
        <div className="bg-surface p-4 rounded-xl shadow-m3-md border border-outline/30 text-center w-48 flex-shrink-0">
            <span className="w-3 h-3 rounded-full inline-block mr-2" style={{ backgroundColor: status.color }}></span>
            <h3 className="font-semibold text-on-surface text-base mb-1">{status.name}</h3>
            <p className="text-sm text-on-surface-variant">{taskCount} Task{taskCount !== 1 ? 's' : ''}</p>
        </div>
        {!isLast && (
            <div className="my-4">
                <ArrowRightIcon className="h-8 w-8 text-on-surface-variant" />
            </div>
        )}
    </div>
);

const FlowchartView: React.FC<FlowchartViewProps> = ({ tasks, project }) => {
    const workflowData = useMemo(() => {
        if (!project) return [];

        const statusTaskCounts = new Map<string, number>();
        (project.workflow || []).forEach(status => statusTaskCounts.set(status.id, 0)); // Fix: Add || [] for safety

        tasks.forEach(task => {
            if (statusTaskCounts.has(task.status)) {
                statusTaskCounts.set(task.status, statusTaskCounts.get(task.status)! + 1);
            }
        });

        return (project.workflow || []).map(status => ({ // Fix: Add || [] for safety
            status,
            taskCount: statusTaskCounts.get(status.id) || 0,
        }));
    }, [tasks, project]);

    if (!project) {
        return (
            <div className="flex h-full items-center justify-center text-center p-8">
                <p className="text-on-surface-variant">Please select a project to view its Flowchart.</p>
            </div>
        );
    }

    if (workflowData.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-center p-8">
                <div className="flex flex-col items-center gap-4">
                    <h3 className="text-xl font-semibold text-on-surface">No Workflow Defined</h3>
                    <p className="text-on-surface-variant">The selected project has no workflow statuses configured.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-surface p-6 rounded-2xl shadow-m3-sm border border-outline/30 overflow-x-auto">
            <h2 className="text-2xl font-bold text-on-surface mb-6">Workflow Flowchart: {project.name}</h2>
            <div className="flex flex-col sm:flex-row sm:justify-center items-center gap-y-4 sm:gap-x-8 flex-wrap">
                {workflowData.map((data, index) => (
                    <FlowchartNode 
                        key={data.status.id} 
                        status={data.status} 
                        taskCount={data.taskCount} 
                        isLast={index === workflowData.length - 1} 
                    />
                ))}
            </div>
        </div>
    );
};

export default FlowchartView;