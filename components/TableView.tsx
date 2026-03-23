
import React, { useState, useMemo, useCallback } from 'react';
import { Task, Project, TaskPriority, User } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { ChevronDownIcon, ChevronUpIcon, CheckCircle2, TrashIcon, EyeIcon, FileTextIcon, PlusIcon, CalendarDaysIcon, ClockIcon, ShareIcon } from './icons';
import { isTaskCompleted, isTaskOverdue } from '../utils';

interface TableViewProps {
  tasks: Task[];
  project: Project | null;
}

interface HydratedTaskForTable extends Task {
    commentsCount: number;
    attachmentsCount: number;
    subtasksProgress: number;
    subtasksTotal: number;
    subtasksCompleted: number;
    // Pre-calculated values for sorting
    assigneeNames: string;
    sortableDueDate: number;
    sortableStartDate: number;
}

type SortColumn = string;
type SortDirection = 'asc' | 'desc';

const priorityOrder: Record<TaskPriority, number> = {
    [TaskPriority.HIGH]: 0,
    [TaskPriority.MEDIUM]: 1,
    [TaskPriority.LOW]: 2,
};

const MobileTaskCard: React.FC<{ task: HydratedTaskForTable; project: Project | null; onClick: () => void; onToggle: (e: React.MouseEvent) => void }> = React.memo(({ task, project, onClick, onToggle }) => {
    const isDone = isTaskCompleted(task, project);
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = isTaskOverdue(task, project);

    const pStyle: Record<TaskPriority, string> = {
        [TaskPriority.HIGH]: 'bg-danger/10 text-danger border-danger/20',
        [TaskPriority.MEDIUM]: 'bg-warning/10 text-warning border-warning/20',
        [TaskPriority.LOW]: 'bg-success/10 text-success border-success/20',
    };

    return (
        <div onClick={onClick} className="p-4 bg-surface rounded-[1.5rem] border border-outline/10 shadow-sm active:scale-[0.98] transition-all">
            <div className="flex items-start gap-4">
                <button 
                    onClick={onToggle}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                        ${isDone ? 'bg-success border-success text-on-primary' : 'border-outline/40'}`}
                >
                    {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
                <div className="flex-1 min-w-0">
                    <h4 className={`text-base font-black tracking-tight leading-tight mb-2 ${isDone ? 'line-through text-on-surface-variant/50' : 'text-on-surface'}`}>
                        {task.title}
                    </h4>
                    
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${pStyle[task.priority]}`}>
                            {task.priority}
                        </span>
                        
                        {dueDate && (
                            <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${isOverdue ? 'text-danger' : 'text-on-surface-variant/50'}`}>
                                {isOverdue ? <ClockIcon className="w-3 h-3" /> : <CalendarDaysIcon className="w-3 h-3 opacity-30" />}
                                {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                        )}
                        
                        <div className="flex -space-x-1.5 ml-auto">
                            {(task.assignees || []).slice(0, 3).map(u => (
                                <img key={u.id} src={u.avatarUrl} className="w-6 h-6 rounded-full border-2 border-surface object-cover shadow-sm" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
MobileTaskCard.displayName = 'MobileTaskCard';

const TableView: React.FC<TableViewProps> = ({ tasks, project }) => {
  const { viewTask, projects, allUsers, tableViewConfig, updateTask, deleteTask } = useAppContext();
  const [sortColumn, setSortColumn] = useState<SortColumn>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (columnId: SortColumn) => {
    if (sortColumn === columnId) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnId);
      setSortDirection('asc');
    }
  };

  const handleToggleComplete = useCallback((e: React.MouseEvent, task: Task) => {
      e.stopPropagation();
      const taskProject = projects.find(p => p.id === task.projectId);
      if (!taskProject) return;
      
      const workflow = taskProject.workflow || [];
      const doneStatus = workflow.find(s => ['done', 'complete', 'closed', 'archived', 'sold', 'launched'].includes(s.name.toLowerCase()) || s.id === 'done') || (workflow.length > 0 ? workflow[workflow.length - 1] : undefined);
      
      const isCurrentlyDone = task.status === doneStatus?.id;
      if (isCurrentlyDone) {
          updateTask(task.id, { status: workflow[0].id });
      } else if (doneStatus) {
          updateTask(task.id, { status: doneStatus.id });
      }
  }, [projects, updateTask]);

  const cyclePriority = useCallback((e: React.MouseEvent, task: Task) => {
      e.stopPropagation();
      const priorities = Object.values(TaskPriority);
      const currentIndex = priorities.indexOf(task.priority);
      const nextPriority = priorities[(currentIndex + 1) % priorities.length];
      updateTask(task.id, { priority: nextPriority });
  }, [updateTask]);

  // Memoize hydration separately to avoid re-running it just because sort changed
  const hydratedTasks = useMemo(() => {
    return tasks.map(task => {
        const currentAssignees = task.assignees && Array.isArray(task.assignees) && task.assignees.length > 0
            ? task.assignees
            : (task.assigneeIds || [])
                .map(id => allUsers.find(u => u.id === id))
                .filter((u): u is User => !!u);

        const commentsCount = task.comments?.length || 0;
        const attachmentsCount = task.attachments?.length || 0;
        const subtasksCompleted = task.subtasks?.filter(s => s.isCompleted).length || 0;
        const subtasksTotal = task.subtasks?.length || 0;
        const subtasksProgress = subtasksTotal > 0 ? (subtasksCompleted / subtasksTotal) * 100 : 0;
        
        // Pre-calculate expensive sort fields
        const assigneeNames = currentAssignees.map(u => u.name).join(', ');
        const sortableDueDate = task.dueDate ? new Date(task.dueDate).getTime() : -Infinity;
        const sortableStartDate = task.startDate ? new Date(task.startDate).getTime() : -Infinity;

        return {
            ...task,
            assignees: currentAssignees,
            assigneeNames,
            sortableDueDate,
            sortableStartDate,
            commentsCount,
            attachmentsCount,
            subtasksProgress,
            subtasksTotal,
            subtasksCompleted,
        };
    });
  }, [tasks, allUsers]);

  const sortedTasks = useMemo(() => {
    return [...hydratedTasks].sort((a, b) => {
      let comparison = 0;
      const columnConfig = tableViewConfig.find(c => c.id === sortColumn);

      // Fast-path for known columns
      switch (sortColumn) {
          case 'dueDate': comparison = a.sortableDueDate - b.sortableDueDate; break;
          case 'startDate': comparison = a.sortableStartDate - b.sortableStartDate; break;
          case 'priority': comparison = priorityOrder[a.priority] - priorityOrder[b.priority]; break;
          case 'assignees': comparison = a.assigneeNames.localeCompare(b.assigneeNames); break;
          case 'title': comparison = (a.title || '').localeCompare(b.title || ''); break;
          case 'commentsCount': comparison = a.commentsCount - b.commentsCount; break;
          case 'jobValue': comparison = (a.jobValue || 0) - (b.jobValue || 0); break;
          default: {
              const getPropertyValue = (taskItem: HydratedTaskForTable, colId: string, colType: 'taskProperty' | 'customField' | undefined): unknown => {
                if (colType === 'customField') return taskItem.customFieldValues?.[colId];
                switch (colId) {
                    case 'subtasksProgress': return taskItem.subtasksProgress;
                    case 'project': return projects.find(p => p.id === taskItem.projectId)?.name || '';
                    case 'status': {
                        const taskProject = projects.find(p => p.id === taskItem.projectId);
                        return (taskProject?.workflow || []).findIndex(s => s.id === taskItem.status) || -1;
                    }
                    default: return (taskItem[colId as keyof HydratedTaskForTable] as unknown) || '';
                }
              };

              const valA = getPropertyValue(a, sortColumn, columnConfig?.type);
              const valB = getPropertyValue(b, sortColumn, columnConfig?.type);

              if (typeof valA === 'number' && typeof valB === 'number') comparison = valA - valB;
              else if (valA instanceof Date && valB instanceof Date) comparison = valA.getTime() - valB.getTime();
              else if (typeof valA === 'string' && typeof valB === 'string') comparison = valA.localeCompare(valB);
              else comparison = String(valA).localeCompare(String(valB));
          }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [hydratedTasks, sortColumn, sortDirection, projects, tableViewConfig]);

  const visibleColumns = useMemo(() => {
    return tableViewConfig.filter(col => col.id !== 'project' || !project).filter(col => col.isVisible);
  }, [tableViewConfig, project]);

  const renderTaskPropertyValue = useCallback((task: HydratedTaskForTable, col: typeof visibleColumns[0]) => {
    const taskProject = projects.find(p => p.id === task.projectId);
    
    if (col.type === 'customField') {
      const value = task.customFieldValues?.[col.id] as string | number | boolean | Date | null | undefined;
      if (value === undefined || value === null || value === '') return <span className="text-on-surface-variant/40 italic">-</span>;
      switch (col.customFieldType) {
          case 'date': try { return new Date(value as string | number | Date).toLocaleDateString(); } catch { return String(value); }
          case 'boolean': return value ? 'Yes' : 'No';
          default: return String(value);
      }
    }

    switch (col.id) {
        case 'title': {
            const isDone = taskProject?.workflow.find(s => ['done', 'complete', 'sold'].includes(s.name.toLowerCase()))?.id === task.status;
            return (
                <div className="flex items-center gap-3">
                    <button 
                        onClick={(e) => handleToggleComplete(e, task)}
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isDone ? 'bg-success border-success text-on-primary' : 'border-outline/40 hover:border-primary'}`}
                    >
                        {isDone && <CheckCircle2 className="w-2.5 h-2.5" />}
                    </button>
                    <span className={`font-bold text-sm truncate tracking-tight transition-all ${isDone ? 'line-through text-on-surface-variant/50' : 'text-on-surface'}`}>{task.title}</span>
                </div>
            );
        }
        case 'status': {
            const workflow = taskProject?.workflow || [];
            const currentStatus = workflow.find(s => s.id === task.status);
            return (
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-variant/40 border border-outline/10 text-[10px] font-black uppercase tracking-widest text-on-surface cursor-pointer hover:bg-surface-variant transition-colors">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentStatus?.color || '#94a3b8' }}></span>
                    <span>{currentStatus?.name || task.status}</span>
                </div>
            );
        }
        case 'priority': {
            const priorityClasses: Record<TaskPriority, { text: string, bg: string }> = {
              [TaskPriority.HIGH]: { text: 'text-danger', bg: 'bg-danger/10' },
              [TaskPriority.MEDIUM]: { text: 'text-warning', bg: 'bg-warning/10' },
              [TaskPriority.LOW]: { text: 'text-success', bg: 'bg-success/10' },
            };
            const style = priorityClasses[task.priority];
            return (
                <button onClick={(e) => cyclePriority(e, task)} className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-transparent hover:border-current transition-all ${style.bg} ${style.text}`}>
                    {task.priority}
                </button>
            );
        }
        case 'dueDate': {
            const isOverdue = isTaskOverdue(task, taskProject);
            return <span className={`text-[11px] font-black uppercase tracking-widest ${isOverdue ? 'text-danger' : 'text-on-surface-variant/60'}`}>{task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '-'}</span>;
        }
        case 'assignees':
            return (
                <div className="flex -space-x-1.5 overflow-hidden">
                    {task.assignees.slice(0, 3).map(user => <img key={user.id} src={user.avatarUrl} alt={user.name} className="h-6 w-6 rounded-full border-2 border-surface object-cover bg-surface-variant shadow-sm" />)}
                    {task.assignees.length > 3 && <div className="h-6 w-6 rounded-full bg-surface-variant text-on-surface-variant text-[8px] font-black flex items-center justify-center border-2 border-surface shadow-sm">+{task.assignees.length - 3}</div>}
                    {task.assignees.length === 0 && <div className="h-6 w-6 rounded-full border border-dashed border-outline/30 flex items-center justify-center text-[10px] text-on-surface-variant/20">+</div>}
                </div>
            );
        case 'jobValue':
            return <span className="text-success font-black text-xs">{task.jobValue !== undefined ? `$${task.jobValue.toLocaleString()}` : '-'}</span>;
        case 'project':
            return <span className="px-2 py-0.5 rounded-md bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/10 truncate max-w-[100px] inline-block">{taskProject?.name || 'N/A'}</span>;
        default: return <span className="text-on-surface-variant text-xs">{String(task[col.id as keyof HydratedTaskForTable] || '')}</span>;
    }
  }, [projects, handleToggleComplete, cyclePriority]);

  const handleExportCSV = () => {
    if (sortedTasks.length === 0) return;

    // Define headers based on visible columns
    const headers = visibleColumns.map(col => `"${col.name}"`).join(',');

    // Map rows
    const rows = sortedTasks.map(task => {
        return visibleColumns.map(col => {
            let val = '';
            // Logic to get value similar to renderTaskPropertyValue but returning string
            if (col.type === 'customField') {
                const customVal = task.customFieldValues?.[col.id] as string | number | boolean | Date | null | undefined;
                if (col.customFieldType === 'date' && customVal) val = new Date(customVal as string | number | Date).toLocaleDateString();
                else if (col.customFieldType === 'boolean') val = customVal ? 'Yes' : 'No';
                else val = String(customVal || '');
            } else {
                switch (col.id) {
                    case 'title': val = task.title; break;
                    case 'status': {
                         const taskProject = projects.find(p => p.id === task.projectId);
                         val = taskProject?.workflow.find(s => s.id === task.status)?.name || task.status;
                         break;
                    }
                    case 'assignees': val = task.assigneeNames; break;
                    case 'priority': val = task.priority; break;
                    case 'dueDate': val = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : ''; break;
                    case 'startDate': val = task.startDate ? new Date(task.startDate).toLocaleDateString() : ''; break;
                    case 'jobValue': val = task.jobValue?.toString() || ''; break;
                    case 'project': val = projects.find(p => p.id === task.projectId)?.name || ''; break;
                    default: val = String(task[col.id as keyof HydratedTaskForTable] || '');
                }
            }
            // Escape quotes
            if (val === null || val === undefined) val = '';
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
        }).join(',');
    }).join('\n');

    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${project?.name || 'tasks'}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-full bg-surface sm:rounded-3xl sm:border border-outline/10 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto custom-scrollbar relative">
        {/* Mobile-Optimized List View */}
        <div className="flex flex-col gap-3 p-3 sm:hidden">
            {sortedTasks.map(task => (
                <MobileTaskCard 
                    key={task.id} 
                    task={task} 
                    project={project || projects.find(p => p.id === task.projectId) || null}
                    onClick={() => viewTask(task)} 
                    onToggle={(e) => handleToggleComplete(e, task)}
                />
            ))}
        </div>

        {/* Desktop Data Grid */}
        <table className="hidden sm:table w-full text-left table-auto border-separate border-spacing-0 min-w-[800px]">
          <thead className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md">
            <tr className="bg-surface-variant/20">
              <th className="p-4 border-b border-outline/10 w-10"></th> {/* Checkbox placeholder */}
              {visibleColumns.map((col, idx) => (
                <th 
                    key={col.id} 
                    className={`p-4 border-b border-outline/10 cursor-pointer group hover:bg-surface-variant/30 transition-colors ${idx === 0 ? 'sticky left-0 bg-surface z-50 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)]' : ''}`} 
                    onClick={() => handleSort(col.id)}
                >
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">
                        {col.name}
                        <span className="transition-opacity opacity-0 group-hover:opacity-100">
                            {sortColumn === col.id ? (sortDirection === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />) : <ChevronDownIcon className="h-3 w-3 opacity-20" />}
                        </span>
                    </div>
                </th>
              ))}
              <th className="p-4 border-b border-outline/10 w-24">
                  <div className="flex justify-end">
                      <button onClick={handleExportCSV} className="p-1 text-on-surface-variant hover:text-primary transition-colors" title="Export CSV">
                          <ShareIcon className="h-4 w-4" />
                      </button>
                  </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface">
            {sortedTasks.map((task) => (
              <tr 
                key={task.id} 
                className="group hover:bg-on-surface/[0.02] transition-colors border-b border-outline/5 relative"
              >
                <td className="p-4 border-b border-outline/5 text-center">
                    <div className="w-4 h-4 rounded border-2 border-outline/30 group-hover:border-primary transition-colors mx-auto cursor-pointer" onClick={(e) => handleToggleComplete(e, task)} />
                </td>
                {visibleColumns.map((col, idx) => (
                    <td 
                        key={col.id} 
                        className={`p-4 border-b border-outline/5 whitespace-nowrap overflow-hidden transition-all ${idx === 0 ? 'sticky left-0 bg-surface group-hover:bg-inherit z-30 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] font-bold' : ''}`}
                        onClick={() => viewTask(task)}
                    >
                        {renderTaskPropertyValue(task, col)}
                    </td>
                ))}
                <td className="p-4 border-b border-outline/5 sticky right-0 bg-surface group-hover:bg-inherit shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.05)] z-30">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                        <button onClick={(e) => { e.stopPropagation(); viewTask(task); }} className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-all"><EyeIcon className="h-4 w-4"/></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="p-2 text-on-surface-variant hover:text-danger hover:bg-danger/10 rounded-xl transition-all"><TrashIcon className="h-4 w-4"/></button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-on-surface-variant/30">
                <FileTextIcon className="h-20 w-20 mb-4 opacity-10" />
                <p className="font-black uppercase tracking-[0.2em] text-sm">No items in the vault</p>
            </div>
        )}
      </div>
      
      {/* Quick Add Row in Table (Optional Refinement) */}
      <div className="p-4 bg-surface-variant/10 border-t border-outline/10 flex items-center gap-4 group cursor-pointer hover:bg-primary/[0.02] transition-colors">
         <PlusIcon className="w-5 h-5 ml-1 text-primary opacity-40 group-hover:opacity-100" />
         <span className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 group-hover:text-primary transition-colors">Add new entry to board...</span>
      </div>
    </div>
  );
};

export default TableView;
