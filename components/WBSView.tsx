import React, { useMemo, useState } from 'react';
import { Task, Project, Subtask } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { ListTodoIcon, PlusIcon, XIcon, FolderKanbanIcon, ClipboardListIcon } from './icons';

interface WBSViewProps {
  tasks: Task[];
  project: Project | null;
}

interface WBSNode {
    id: string;
    title: string;
    item: Project | Task | Subtask;
    children: WBSNode[];
    isExpanded: boolean;
    level: number;
}

const WBSItem: React.FC<{ node: WBSNode; toggleExpand: (id: string) => void; viewTask: (task: Task) => void; }> = ({ node, toggleExpand, viewTask }) => {
    const { id, title, item, children, isExpanded, level } = node;
    const isProject = 'workflow' in item;
    const isSubtask = 'isCompleted' in item;

    const handleView = () => {
        if (!isProject && !isSubtask) {
            viewTask(item as Task);
        }
    };
    
    const Icon = isProject ? FolderKanbanIcon : isSubtask ? ClipboardListIcon : ListTodoIcon;

    return (
        <div className="flex flex-col border-l-2 border-outline/30" style={{ marginLeft: `${level * 1.5}rem`}}>
            <div className={`flex items-center gap-2 p-2 rounded-lg transition-colors`}>
                <div className="flex items-center gap-2 flex-1">
                    {children.length > 0 ? (
                        <button onClick={() => toggleExpand(id)} className="p-1 text-on-surface-variant hover:text-primary rounded-full hover:bg-primary/10">
                            {isExpanded ? <XIcon className="h-4 w-4 rotate-45" /> : <PlusIcon className="h-4 w-4" />}
                        </button>
                    ) : <div className="w-6 h-6" /> }
                    <Icon className={`h-5 w-5 ${isProject ? 'text-primary' : isSubtask ? 'text-tertiary' : 'text-secondary'}`} />
                    <span className={`font-semibold ${isProject ? 'text-on-surface text-lg' : isSubtask ? 'text-on-surface-variant' : 'text-on-surface'}`}>{title}</span>
                </div>
                {!isProject && !isSubtask && (
                    <button onClick={handleView} className="ml-auto px-3 py-1 text-xs font-semibold text-primary bg-primary/10 rounded-full hover:bg-primary/20 transition-colors">
                        View Details
                    </button>
                )}
            </div>
            {isExpanded && children.length > 0 && (
                <div className="mt-1 space-y-1">
                    {children.map(childNode => (
                        <WBSItem key={childNode.id} node={childNode} toggleExpand={toggleExpand} viewTask={viewTask} />
                    ))}
                </div>
            )}
        </div>
    );
};


const WBSView: React.FC<WBSViewProps> = ({ tasks, project }) => {
    const { viewTask } = useAppContext();
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([project?.id || '']));

    const toggleExpand = (id: string) => {
        setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const wbsTree: WBSNode | null = useMemo(() => {
        if (!project) return null;

        const taskNodes: WBSNode[] = tasks.map(task => {
            const subtaskChildren = (task.subtasks || []).map(st => ({
                id: st.id,
                title: st.title,
                item: st,
                children: [],
                isExpanded: false,
                level: 2
            }));
            
            return {
                id: task.id,
                title: task.title,
                item: task,
                children: subtaskChildren.sort((a,b) => a.title.localeCompare(b.title)),
                isExpanded: expandedNodes.has(task.id),
                level: 1,
            };
        });

        // Create the root project node
        const projectNode: WBSNode = {
            id: project.id,
            title: project.name,
            item: project,
            children: taskNodes.sort((a,b) => a.title.localeCompare(b.title)),
            isExpanded: expandedNodes.has(project.id),
            level: 0,
        };

        return projectNode;
    }, [tasks, project, expandedNodes]);

    if (!project) {
        return (
            <div className="flex h-full items-center justify-center text-center p-8">
                <p className="text-on-surface-variant">Please select a project to view its Work Breakdown Structure.</p>
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-center p-8">
                <div className="flex flex-col items-center gap-4">
                    <h3 className="text-xl font-semibold text-on-surface">No Tasks for WBS</h3>
                    <p className="text-on-surface-variant">Add tasks to your project to see them in the Work Breakdown Structure.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-surface p-6 rounded-2xl shadow-m3-sm border border-outline/30 overflow-y-auto">
            <h2 className="text-2xl font-bold text-on-surface mb-6">Work Breakdown Structure: {project.name}</h2>
            <div className="space-y-2">
                {wbsTree && <WBSItem node={wbsTree} toggleExpand={toggleExpand} viewTask={viewTask} />}
            </div>
        </div>
    );
};

export default WBSView;