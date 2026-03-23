import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Task, TaskPriority, WorkflowStatus } from '../types';
import TaskCard from './TaskCard';
import { useAppContext } from '../contexts/AppContext';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import { PlusIcon, ChevronDownIcon } from './icons';

interface KanbanBoardProps {
  tasks: Task[];
  mode: 'kanban' | 'list';
}

type SortField = 'manual' | 'dueDate' | 'priority' | 'title';
type SortDirection = 'asc' | 'desc';

interface ColumnSortConfig {
    field: SortField;
    direction: SortDirection;
}

const taskVariants: Variants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 400, damping: 30 },
  },
  exit: {
    opacity: 0,
    x: -10,
    transition: { duration: 0.15 },
  }
};

const priorityOrder: Record<TaskPriority, number> = {
    [TaskPriority.HIGH]: 0,
    [TaskPriority.MEDIUM]: 1,
    [TaskPriority.LOW]: 2,
};

const QuickAddInput: React.FC<{ onAdd: (title: string) => void, onCancel: () => void }> = React.memo(({ onAdd, onCancel }) => {
    const [title, setTitle] = useState('');
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && title.trim()) {
            onAdd(title.trim());
            setTitle('');
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div className="p-3 bg-surface rounded-xl shadow-m3-sm border border-primary/50 animate-scale-in">
            <input
                autoFocus
                type="text"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={onCancel}
                placeholder="Type a title and press Enter..."
                className="w-full bg-transparent text-sm font-medium text-on-surface placeholder-on-surface-variant/50 focus:outline-none"
            />
            <div className="flex justify-end gap-2 mt-2">
                 <button onMouseDown={(e: React.MouseEvent) => e.preventDefault()} onClick={onCancel} className="text-xs font-semibold text-on-surface-variant hover:text-on-surface px-2 py-1">Cancel</button>
                 <button onMouseDown={(e: React.MouseEvent) => e.preventDefault()} onClick={() => title.trim() && onAdd(title.trim())} className="text-xs font-semibold text-on-primary bg-primary px-2 py-1 rounded">Add</button>
            </div>
        </div>
    );
});
QuickAddInput.displayName = 'QuickAddInput';

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, mode }) => {
  const { updateTask, viewTask, selectedProject, addTask, toggleTaskSelection, selectedTaskIds, reorderTasksInColumn } = useAppContext();
  const [draggedTask, setDraggedTask] = useState<Task | null>(null); 
  const [draggedOverColumnId, setDraggedOverColumnId] = useState<string | null>(null); 
  const [draggedOverTaskId, setDraggedOverTaskId] = useState<string | null>(null); 
  const [quickAddStatus, setQuickAddStatus] = useState<string | null>(null);
  const [columnSorts] = useState<Record<string, ColumnSortConfig>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);

  const workflow = useMemo(() => selectedProject?.workflow || [], [selectedProject]);
  
  useEffect(() => {
    if (workflow.length > 0) {
      setExpandedSections(new Set(workflow.map(s => s.id)));
    }
  }, [workflow]);

  // Mobile column tracking for jumping
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, clientWidth } = scrollContainerRef.current;
    const index = Math.round(scrollLeft / clientWidth);
    if (index !== activeColumnIndex) {
        setActiveColumnIndex(index);
    }
  };

  const scrollToColumn = (index: number) => {
    if (!scrollContainerRef.current) return;
    const { clientWidth } = scrollContainerRef.current;
    scrollContainerRef.current.scrollTo({
      left: index * (clientWidth * 0.88), // Match the mobile width
      behavior: 'smooth'
    });
  };

  const tasksByStatus = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    (workflow || []).forEach((status: WorkflowStatus) => grouped.set(status.id, []));
    
    const firstStatusId = workflow.length > 0 ? workflow[0].id : null;

    tasks.forEach(task => {
        if (grouped.has(task.status)) {
            grouped.get(task.status)!.push(task);
        } else if (firstStatusId) {
            grouped.get(firstStatusId)!.push(task);
        }
    });

    grouped.forEach((taskList, statusId) => {
        const sortConfig = columnSorts[statusId] || { field: 'manual', direction: 'asc' };
        
        const sorted = [...taskList].sort((a, b) => {
            let result = 0;
            switch (sortConfig.field) {
                case 'dueDate': {
                    const timeA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
                    const timeB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
                    result = timeA - timeB;
                    break;
                }
                case 'priority':
                    result = priorityOrder[a.priority] - priorityOrder[b.priority];
                    break;
                case 'title':
                    result = (a.title || "").localeCompare(b.title || "");
                    break;
                case 'manual':
                default:
                    result = (a.order || 0) - (b.order || 0);
                    break;
            }
            return sortConfig.direction === 'asc' ? result : -result;
        });
        grouped.set(statusId, sorted);
    });
    return grouped;
  }, [tasks, workflow, columnSorts]);

  const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, statusId: string, taskId?: string) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    // Performance: Only update state if values actually changed to prevent render thrashing
    if (draggedOverColumnId !== statusId) {
        setDraggedOverColumnId(statusId);
    }
    if (draggedOverTaskId !== (taskId || null)) {
        setDraggedOverTaskId(taskId || null);
    }
  }, [draggedOverColumnId, draggedOverTaskId]);

  const handleDrop = useCallback(async (e: React.DragEvent, newStatusId: string) => {
    e.preventDefault();
    const droppedTaskId = e.dataTransfer.getData('text/plain');
    
    // Optimistic UI updates
    setDraggedOverColumnId(null);
    setDraggedOverTaskId(null);
    setDraggedTask(null);

    // Find task in local props first
    const task = tasks.find(t => t.id === droppedTaskId);
    if (!task) return;

    if (task.status !== newStatusId) {
        await updateTask(task.id, { status: newStatusId, order: Date.now() });
    } else {
        const currentTasksInColumn = tasksByStatus.get(newStatusId) || [];
        const newOrderedTaskIds = currentTasksInColumn.map(t => t.id);
        const oldIndex = newOrderedTaskIds.indexOf(task.id);
        if (oldIndex > -1) newOrderedTaskIds.splice(oldIndex, 1);
        
        if (draggedOverTaskId && draggedOverTaskId !== task.id) {
             const targetIndex = newOrderedTaskIds.indexOf(draggedOverTaskId);
             if (targetIndex > -1) newOrderedTaskIds.splice(targetIndex, 0, task.id);
             else newOrderedTaskIds.push(task.id);
        } else {
            newOrderedTaskIds.push(task.id);
        }
        await reorderTasksInColumn(newStatusId, newOrderedTaskIds);
    }
  }, [tasks, tasksByStatus, draggedOverTaskId, updateTask, reorderTasksInColumn]);

  const toggleSection = (id: string) => {
      setExpandedSections(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const handleQuickAdd = useCallback((title: string, statusId: string) => {
      if (!selectedProject) return;
      addTask({
          title,
          status: statusId,
          projectId: selectedProject.id, 
          description: '',
          priority: TaskPriority.MEDIUM,
          assigneeIds: [], 
          startDate: new Date(),
          dueDate: new Date(),
          order: Date.now()
      });
  }, [selectedProject, addTask]);

  const handleTaskClick = useCallback((e: React.MouseEvent, task: Task) => {
      if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          toggleTaskSelection(task.id);
      } else {
          viewTask(task);
      }
  }, [toggleTaskSelection, viewTask]);

  if (mode === 'list') {
      return (
        <div className="h-full overflow-y-auto bg-surface sm:rounded-2xl sm:border border-outline/10 flex flex-col custom-scrollbar">
            <div className="flex-1 space-y-4 sm:space-y-6 p-3 sm:p-4">
                {workflow.map(status => {
                    const isExpanded = expandedSections.has(status.id);
                    const columnTasks = tasksByStatus.get(status.id) || [];
                    
                    return (
                        <div key={status.id} className="flex flex-col gap-1 sm:gap-2">
                            <div className="flex items-center gap-2 px-2 group/header">
                                <button 
                                    onClick={() => toggleSection(status.id)}
                                    className={`p-2 rounded-xl hover:bg-on-surface/5 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                                >
                                    <ChevronDownIcon className="w-5 h-5 text-on-surface-variant" />
                                </button>
                                <div className="flex items-center gap-2 flex-1">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                                    <h3 className="text-sm font-black uppercase tracking-widest text-on-surface">{status.name}</h3>
                                    <span className="text-[10px] font-bold text-on-surface-variant/40">{columnTasks.length}</span>
                                </div>
                                <button 
                                    onClick={() => setQuickAddStatus(status.id)}
                                    className="p-2 rounded-xl text-on-surface-variant/40 hover:text-primary hover:bg-primary/10 sm:opacity-0 group-hover/header:opacity-100 transition-all"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <AnimatePresence initial={false}>
                                {isExpanded && (
                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                        <div className="flex flex-col gap-2.5 sm:gap-3 px-1 sm:px-2">
                                            {columnTasks.map(task => (
                                                <motion.div 
                                                    key={task.id} 
                                                    variants={taskVariants} 
                                                    initial="hidden" animate="visible" exit="exit"
                                                    draggable onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, task)}
                                                    onDragOver={(e) => handleDragOver(e as unknown as React.DragEvent, status.id, task.id)}
                                                    onDrop={(e) => handleDrop(e as unknown as React.DragEvent, status.id)}
                                                    className={`relative ${draggedTask?.id === task.id ? 'opacity-40' : ''}`}
                                                >
                                                    <TaskCard 
                                                        task={task} 
                                                        isSelected={selectedTaskIds.has(task.id)} 
                                                        onClick={(e) => handleTaskClick(e, task)} 
                                                    />
                                                </motion.div>
                                            ))}
                                            
                                            {quickAddStatus === status.id && (
                                                <QuickAddInput 
                                                    onAdd={(t) => { handleQuickAdd(t, status.id); setQuickAddStatus(null); }} 
                                                    onCancel={() => setQuickAddStatus(null)} 
                                                />
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
      );
  }

  return (
    <div className="h-full flex flex-col">
        {/* Mobile Status Navigator - Lower Z-Index (20) to ensure Header dropdowns (130) overlap correctly */}
        <div className="flex sm:hidden overflow-x-auto no-scrollbar gap-2 px-4 py-2 border-b border-outline/10 bg-surface/50 backdrop-blur-md sticky top-0 z-[20]">
            {workflow.map((status, idx) => (
                <button
                    key={status.id}
                    onClick={() => scrollToColumn(idx)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all
                        ${activeColumnIndex === idx ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-variant/30 text-on-surface-variant'}`}
                >
                    {status.name}
                </button>
            ))}
        </div>

        <div 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 flex gap-4 sm:gap-6 overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory sm:snap-none"
        >
            <div className="w-1 sm:hidden flex-shrink-0" /> {/* Padding start */}
            {workflow.map((status) => {
            const columnTasks = tasksByStatus.get(status.id) || [];
            return (
                <div
                key={status.id}
                className={`flex-shrink-0 w-[88vw] sm:w-80 flex flex-col bg-surface-variant/30 rounded-3xl border transition-all duration-200 snap-center sm:snap-align-none ${draggedOverColumnId === status.id ? 'border-primary ring-2 ring-primary/50' : 'border-outline/40'}`}
                onDragOver={(e) => handleDragOver(e, status.id)}
                onDrop={(e) => handleDrop(e, status.id)}
                >
                <div className="p-4 sm:p-5 flex items-center justify-between border-b border-outline/10 bg-surface-variant/50 rounded-t-3xl backdrop-blur-sm group/header relative z-10">
                    <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full ring-2 ring-offset-1 ring-offset-surface-variant" style={{ backgroundColor: status.color, '--tw-ring-color': status.color } as React.CSSProperties}></span>
                        <h3 className="font-black text-sm uppercase tracking-widest text-on-surface">{status.name}</h3>
                        <span className="bg-surface text-on-surface-variant text-[10px] font-bold px-2 py-0.5 rounded-full border border-outline/10">{columnTasks.length}</span>
                    </div>
                    <button onClick={() => setQuickAddStatus(status.id)} className="p-2 rounded-xl text-on-surface-variant hover:bg-on-surface/5 transition-colors sm:opacity-0 group-hover/header:opacity-100"><PlusIcon className="h-4 w-4" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar [scrollbar-gutter:stable]">
                    <AnimatePresence>
                    {columnTasks.map((task) => (
                        <motion.div 
                            key={task.id} 
                            layout="position"
                            variants={taskVariants} 
                            initial="hidden" 
                            animate="visible" 
                            exit="exit"
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, task)}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDragOver(e as unknown as React.DragEvent, status.id, task.id);
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDrop(e as unknown as React.DragEvent, status.id);
                            }}
                            className={`relative transition-opacity ${draggedTask?.id === task.id ? 'opacity-40 grayscale' : ''}`}
                        >
                            {draggedOverTaskId === task.id && draggedTask?.id !== task.id && (
                                <div className="absolute -top-2 left-0 right-0 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--color-primary))] z-20 pointer-events-none" />
                            )}
                            <TaskCard task={task} isSelected={selectedTaskIds.has(task.id)} onClick={(e) => handleTaskClick(e, task)} />
                        </motion.div>
                    ))}
                    </AnimatePresence>
                    {quickAddStatus === status.id && <QuickAddInput onAdd={(title) => { handleQuickAdd(title, status.id); setQuickAddStatus(null); }} onCancel={() => setQuickAddStatus(null)} />}
                </div>
                </div>
            );
            })}
            <div className="w-1 sm:hidden flex-shrink-0" /> {/* Padding end */}
            <div className="w-4 hidden sm:block flex-shrink-0" />
        </div>
    </div>
  );
};

export default KanbanBoard;