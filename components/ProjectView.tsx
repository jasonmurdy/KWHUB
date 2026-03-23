
import React, { useState, useMemo } from 'react';
import KanbanBoard from './KanbanBoard';
import GanttView from './GanttView';
import ProjectSettingsView from './ProjectSettingsView';
import TableView from './TableView';
import ProjectDocsView from './ProjectDocsView';
import { 
    PlusIcon, SettingsIcon, FilterIcon, 
    ListTodoIcon, LayoutDashboardIcon, 
    FileTextIcon, TableIcon, ShareIcon, 
    SearchIcon, ActivityIcon,
    CheckCircle2
} from './icons';
import { useAppContext } from '../contexts/AppContext';
import { TaskPriority, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { isTaskCompleted } from '../utils';

type ViewMode = 'kanban' | 'list' | 'gantt' | 'table' | 'settings' | 'docs';

const ViewSwitcher: React.FC<{ viewMode: ViewMode; setViewMode: (mode: ViewMode) => void; }> = ({ viewMode, setViewMode }) => {
    const views: { id: ViewMode; label: string | null; icon: React.ReactNode }[] = [
        { id: 'kanban', label: 'Board', icon: <LayoutDashboardIcon className="h-4 w-4" /> },
        { id: 'list', label: 'List', icon: <ListTodoIcon className="h-4 w-4" /> },
        { id: 'gantt', label: 'Gantt', icon: <ActivityIcon className="h-4 w-4" /> },
        { id: 'table', label: 'Table', icon: <TableIcon className="h-4 w-4" /> },
        { id: 'docs', label: 'Docs', icon: <FileTextIcon className="h-4 w-4" /> },
        { id: 'settings', label: null, icon: <SettingsIcon className="h-4 w-4" /> },
    ];

    return (
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-surface-variant/30 border border-outline/10 max-w-full overflow-x-auto no-scrollbar shadow-inner">
            {views.map((view) => {
                const isActive = viewMode === view.id;
                return (
                    <button
                        key={view.id}
                        onClick={() => setViewMode(view.id)}
                        className={`group relative flex items-center gap-2 px-3 sm:px-4 py-2 text-sm font-bold rounded-xl transition-all duration-300 flex-shrink-0
                            ${isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                        {isActive && <motion.div layoutId="view-highlight" className="absolute inset-0 bg-surface shadow-sm ring-1 ring-primary/20 rounded-xl" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />}
                        <span className="relative z-10">{view.icon}</span>
                        {view.label && <span className={`relative z-10 whitespace-nowrap ${!isActive ? 'hidden md:inline' : 'inline'}`}>{view.label}</span>}
                    </button>
                );
            })}
        </div>
    );
};

const ProjectView: React.FC = () => {
  const { selectedProject, tasks, editTask, projectSubView, setProjectSubView, allUsers } = useAppContext();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [hideCompleted, setHideCompleted] = useState(false);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             task.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        const matchesAssignee = assigneeFilter === 'all' || task.assigneeIds?.includes(assigneeFilter);
        const isHidden = hideCompleted && isTaskCompleted(task, selectedProject);
        
        return matchesSearch && matchesPriority && matchesAssignee && !isHidden;
    });
  }, [tasks, searchQuery, priorityFilter, assigneeFilter, hideCompleted, selectedProject]);

  const projectMembers = useMemo(() => {
    if (!selectedProject) return [];
    return (selectedProject.memberIds || [])
      .map(id => allUsers.find(u => u.id === id))
      .filter((u): u is User => !!u);
  }, [selectedProject, allUsers]);

  if (!selectedProject) return null;

  const activeFiltersCount = (searchQuery ? 1 : 0) + (priorityFilter !== 'all' ? 1 : 0) + (assigneeFilter !== 'all' ? 1 : 0) + (hideCompleted ? 1 : 0);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 px-1">
        <div>
            <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedProject.color }} />
                <h1 className="text-3xl font-black text-on-surface tracking-tighter uppercase">{selectedProject.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2">
                {selectedProject.complianceLink && (
                    <a href={selectedProject.complianceLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all">
                        <ShareIcon className="w-3.5 h-3.5" /> Go to Contracts
                    </a>
                )}
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border
                        ${showFilters || activeFiltersCount > 0 ? 'bg-primary/10 text-primary border-primary/30' : 'bg-surface-variant/30 text-on-surface-variant border-outline/10 hover:bg-surface-variant/50'}
                    `}
                >
                    <FilterIcon className="w-3.5 h-3.5" />
                    {activeFiltersCount > 0 ? `Filters (${activeFiltersCount})` : 'Filter Options'}
                </button>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <ViewSwitcher viewMode={projectSubView as ViewMode} setViewMode={setProjectSubView} />
            <button onClick={() => editTask('new')} className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-2xl font-black text-xs uppercase tracking-widest shadow-m3-md hover:bg-primary/90 transition-all">
                <PlusIcon className="w-4 h-4" /> New Item
            </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
            <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
            >
                <div className="bg-surface p-6 rounded-[2rem] border border-outline/10 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-6 mb-2">
                    <div className="relative">
                        <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block px-1">Search Keywords</label>
                        <div className="relative">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-40" />
                            <input 
                                type="text"
                                placeholder="Filter title..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-surface-variant/30 border border-outline/10 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block px-1">Priority Strategy</label>
                        <select 
                            value={priorityFilter} 
                            onChange={e => setPriorityFilter(e.target.value)}
                            className="w-full bg-surface-variant/30 border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-primary/20 outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">All Priorities</option>
                            <option value={TaskPriority.HIGH}>High Priority</option>
                            <option value={TaskPriority.MEDIUM}>Medium Priority</option>
                            <option value={TaskPriority.LOW}>Low Priority</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block px-1">Assigned Agent</label>
                        <select 
                            value={assigneeFilter} 
                            onChange={e => setAssigneeFilter(e.target.value)}
                            className="w-full bg-surface-variant/30 border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-primary/20 outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">Everyone</option>
                            {projectMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col justify-center">
                        <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block px-1">Visibility</label>
                        <button 
                            onClick={() => setHideCompleted(!hideCompleted)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-sm font-bold
                                ${hideCompleted ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface-variant/30 border-outline/10 text-on-surface-variant'}
                            `}
                        >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${hideCompleted ? 'bg-primary border-primary text-white' : 'border-outline/50'}`}>
                                {hideCompleted && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                            Hide Completed
                        </button>
                    </div>
                    <div className="md:col-span-4 flex justify-end gap-2 border-t border-outline/5 pt-4">
                        <button 
                            onClick={() => { setSearchQuery(''); setPriorityFilter('all'); setAssigneeFilter('all'); setHideCompleted(false); }}
                            className="px-4 py-2 text-[10px] font-black text-on-surface-variant uppercase tracking-widest hover:text-danger transition-colors"
                        >
                            Clear All Filters
                        </button>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-hidden sm:bg-surface/50 sm:rounded-[3rem] sm:border border-outline/10 sm:p-2">
        {projectSubView === 'kanban' && <KanbanBoard tasks={filteredTasks} mode="kanban" />}
        {projectSubView === 'list' && <KanbanBoard tasks={filteredTasks} mode="list" />}
        {projectSubView === 'gantt' && <GanttView tasks={filteredTasks} />}
        {projectSubView === 'table' && <TableView tasks={filteredTasks} project={selectedProject} />}
        {projectSubView === 'settings' && <ProjectSettingsView />}
        {projectSubView === 'docs' && <ProjectDocsView />}
      </div>
    </div>
  );
};

export default ProjectView;
