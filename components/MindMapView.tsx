
import React, { useMemo, useState } from 'react';
import { Task, Project, User, Subtask } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { PlusIcon, XIcon } from './icons';

interface MindMapViewProps {
  tasks: Task[];
  project: Project | null;
}

interface MindMapNode {
    id: string;
    title: string;
    item: Task | Subtask;
    children: MindMapNode[];
    isExpanded: boolean;
}

const MindMapTaskNode: React.FC<{ node: MindMapNode; level: number; viewTask: (task: Task) => void; toggleExpand: (taskId: string) => void; }> = ({ node, level, viewTask, toggleExpand }) => {
    const { id, title, item, children, isExpanded } = node;
    const paddingLeft = `${level * 1.5}rem`; 
    const isSubtask = 'isCompleted' in item;
    const assignees = !isSubtask ? (item as Task).assignees || [] : [];

    return (
        <div style={{ paddingLeft }} className="relative py-1 border-l-2 border-primary/20">
            <div className="absolute left-0 top-1/2 -translate-x-1/2 w-3 h-0.5 bg-primary/20" /> {/* Horizontal connector */}
            <div 
                onClick={() => !isSubtask && viewTask(item as Task)}
                className={`relative bg-surface p-3 rounded-lg shadow-m3-sm border border-outline/30 flex items-center justify-between gap-3 ${!isSubtask ? 'hover:shadow-m3-md hover:-translate-y-px transition-all cursor-pointer' : ''}`}
            >
                <div className="flex items-center gap-2">
                    {children.length > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); toggleExpand(id); }} className="p-1 -ml-1 text-on-surface-variant hover:text-primary rounded-full hover:bg-primary/10">
                            {isExpanded ? <XIcon className="h-4 w-4 rotate-45" /> : <PlusIcon className="h-4 w-4" />}
                        </button>
                    )}
                    <span className="font-semibold text-on-surface text-sm flex-1">{title}</span>
                </div>
                {!isSubtask && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {assignees.slice(0, 2).map(user => (
                            <img key={user.id} src={user.avatarUrl} alt={user.name} title={user.name} className="h-6 w-6 rounded-full border border-surface"/>
                        ))}
                        {assignees.length > 2 && (
                            <span className="text-xs text-on-surface-variant bg-surface-variant rounded-full px-2 py-1 border border-outline/30">+{assignees.length - 2}</span>
                        )}
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: (item as Task & { projectWorkflowStatus?: { color: string } }).projectWorkflowStatus?.color || '#94a3b8' }}></span>
                    </div>
                )}
            </div>

            {isExpanded && (
                <div className="mt-2 space-y-2">
                    {children.map(childNode => (
                        <MindMapTaskNode 
                            key={childNode.id} 
                            node={childNode} 
                            level={level + 1} 
                            viewTask={viewTask} 
                            toggleExpand={toggleExpand} 
                        />
                    ))}
                </div>
            )}
        </div>
    );
};


const MindMapView: React.FC<MindMapViewProps> = ({ tasks, project }) => {
  const { viewTask, projects, allUsers } = useAppContext();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

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

  const mindMapTree = useMemo(() => {
    if (!project) return [];
    
    // Add workflow status color to tasks for display
    const enrichedTasks = tasks.map(task => {
      const projectForTask = projects.find(p => p.id === task.projectId);
      const status = projectForTask?.workflow.find(s => s.id === task.status);
      const assignees = task.assignees || (task.assigneeIds || []).map(id => allUsers.find(u => u.id === id)).filter((u): u is User => !!u);
      return { ...task, assignees, projectWorkflowStatus: status };
    });

    const nodes = new Map<string, MindMapNode>();

    enrichedTasks.forEach(task => {
        const subtaskChildren = (task.subtasks || []).map(st => ({
            id: st.id,
            title: st.title,
            item: st,
            children: [],
            isExpanded: false
        }));

        nodes.set(task.id, {
            id: task.id,
            title: task.title,
            item: task,
            children: subtaskChildren,
            isExpanded: expandedNodes.has(task.id)
        });
    });
    
    // For MindMap, we don't use parent-child task relationships, just task -> subtask
    return Array.from(nodes.values()).sort((a, b) => a.title.localeCompare(b.title));

  }, [tasks, project, projects, expandedNodes, allUsers]);

  if (!project) {
    return (
        <div className="flex h-full items-center justify-center text-center p-8">
            <p className="text-on-surface-variant">Please select a project to view its Mind Map.</p>
        </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center p-8">
        <div className="flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold text-on-surface">No Tasks for Mind Map</h3>
          <p className="text-on-surface-variant">Add some tasks to your project to start visualizing your ideas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-surface p-6 rounded-2xl shadow-m3-sm border border-outline/30 overflow-y-auto">
        <h2 className="text-2xl font-bold text-on-surface mb-6">Mind Map: {project.name}</h2>
        <div className="space-y-4">
            {mindMapTree.map(node => (
                <MindMapTaskNode 
                    key={node.id} 
                    node={node} 
                    level={0} 
                    viewTask={viewTask} 
                    toggleExpand={toggleExpand} 
                />
            ))}
        </div>
    </div>
  );
};

export default MindMapView;
