
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { SearchIcon, FileTextIcon, ListTodoIcon, CommandIcon, SunIcon, MoonIcon, PlusIcon, TargetIcon, SparklesIcon } from './icons';
import { Project, Task, User, TaskPriority } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useTheme, ThemeType } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
// Fix: Import Variants type from framer-motion to fix type error.
import { motion, Variants } from 'framer-motion';
import { parseTaskInput } from '../services/geminiService';

interface GlobalSearchModalProps {
  onClose: () => void;
  allTasks: Task[];
  projects: Project[];
  allUsers: User[];
}

// Animation variants
const backdropVariants: Variants = {
  visible: { opacity: 1, pointerEvents: "auto" },
  hidden: { opacity: 0, pointerEvents: "none" },
};

const modalVariants: Variants = {
  hidden: { y: "-50px", opacity: 0, scale: 0.95 },
  visible: {
    y: "0px",
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
  exit: { y: "-50px", opacity: 0, scale: 0.95, transition: { duration: 0.2 }, pointerEvents: "none" },
};

type CommandGroup = {
    title: string;
    items: CommandItem[];
}

type CommandItem = {
    id: string;
    title: string;
    icon: React.ReactNode;
    action: () => void;
    description?: string;
}

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ onClose, allTasks, projects, allUsers }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { selectProject, viewTask, fetchTaskById, setActiveView, openCreateProjectModal, openCreateTeamModal, editTask } = useAppContext();
  const { theme, setTheme } = useTheme();
  const { logOut } = useAuth();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset selected index when query changes
  useEffect(() => {
      setSelectedIndex(0);
  }, [query]);

  const handleSmartAdd = useCallback(async () => {
      const input = query.substring(1).trim(); // Remove '+'
      if (!input) return;
      
      setIsParsing(true);
      try {
          const parsedData = await parseTaskInput(input);
          
          let priority = TaskPriority.MEDIUM;
          if (parsedData.priority) {
              const p = parsedData.priority.toLowerCase();
              if (p.includes('high')) priority = TaskPriority.HIGH;
              else if (p.includes('low')) priority = TaskPriority.LOW;
          }

          let dueDate = new Date();
          if (parsedData.dueDate) {
              dueDate = new Date(parsedData.dueDate);
          }

          // Simple assignee matching logic
          const assignees: User[] = [];
          if (parsedData.assigneeName) {
              const matchedUser = allUsers.find(u => u.name.toLowerCase().includes(parsedData.assigneeName.toLowerCase()));
              if (matchedUser) assignees.push(matchedUser);
          }

          editTask('new', {
              title: parsedData.title,
              description: parsedData.description || '',
              dueDate: dueDate,
              priority: priority,
              assignees: assignees
          });
          onClose();
      } catch (error) {
          console.error("Smart Add failed", error);
          alert("Could not understand the task details. Please try again.");
      } finally {
          setIsParsing(false);
      }
  }, [query, allUsers, editTask, onClose]);

  const commands: CommandGroup[] = useMemo(() => {
      const nextThemeMap: Record<ThemeType, ThemeType> = {
          'default': 'elite',
          'elite': 'dynamic',
          'dynamic': 'nature',
          'nature': 'ocean',
          'ocean': 'sunset',
          'sunset': 'cyberpunk',
          'cyberpunk': 'nordic',
          'nordic': 'dashboard',
          'dashboard': 'default'
      };

      return [
          {
              title: "Actions",
              items: [
                  { id: 'create-task', title: 'Create New Task', icon: <PlusIcon className="h-4 w-4" />, action: () => { editTask('new'); onClose(); } },
                  { id: 'create-project', title: 'Create New Project', icon: <FileTextIcon className="h-4 w-4" />, action: () => { openCreateProjectModal(); onClose(); } },
                  { id: 'create-team', title: 'Create New Team', icon: <PlusIcon className="h-4 w-4" />, action: () => { openCreateTeamModal(); onClose(); } },
                  { id: 'toggle-theme', title: `Cycle Theme (${theme})`, icon: theme === 'default' ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />, action: () => { setTheme(nextThemeMap[theme]); onClose(); } },
              ]
          },
          {
              title: "Navigation",
              items: [
                  { id: 'nav-dashboard', title: 'Go to Dashboard', icon: <CommandIcon className="h-4 w-4" />, action: () => { setActiveView('dashboard'); onClose(); } },
                  { id: 'nav-focus', title: 'Go to Focus Mode', icon: <TargetIcon className="h-4 w-4" />, action: () => { setActiveView('focus'); onClose(); } },
                  { id: 'nav-calendar', title: 'Go to Calendar', icon: <CommandIcon className="h-4 w-4" />, action: () => { setActiveView('calendar'); onClose(); } },
                  { id: 'nav-settings', title: 'Go to Settings', icon: <CommandIcon className="h-4 w-4" />, action: () => { setActiveView('settings'); onClose(); } },
                  { id: 'nav-logout', title: 'Log Out', icon: <CommandIcon className="h-4 w-4 text-danger" />, action: () => { logOut(); onClose(); } },
              ]
          }
      ];
  }, [theme, editTask, openCreateProjectModal, openCreateTeamModal, setActiveView, setTheme, logOut, onClose]);

  const filteredResults = useMemo(() => {
    // If Smart Add Mode
    if (query.startsWith('+')) {
        return [{
            title: "Smart Actions",
            items: [{
                id: 'smart-add',
                title: `Create task: "${query.substring(1).trim()}"`,
                description: "AI will parse details like date and priority",
                icon: <SparklesIcon className="h-4 w-4 text-primary" />,
                action: handleSmartAdd
            }]
        }];
    }

    const lowerCaseQuery = query.toLowerCase();
    const groups: CommandGroup[] = [];

    // Filter Commands
    const filteredCommands = commands.map(group => ({
        ...group,
        items: group.items.filter(item => item.title.toLowerCase().includes(lowerCaseQuery))
    })).filter(group => group.items.length > 0);
    
    if (filteredCommands.length > 0) {
        groups.push(...filteredCommands);
    }

    if (query.trim()) {
        // Filter Projects
        const filteredProjects = projects.filter(project => 
            project.name.toLowerCase().includes(lowerCaseQuery) || 
            project.description.toLowerCase().includes(lowerCaseQuery)
        );
        if (filteredProjects.length > 0) {
            groups.push({
                title: "Projects",
                items: filteredProjects.map(p => ({
                    id: p.id,
                    title: p.name,
                    description: p.description,
                    icon: <FileTextIcon className="h-4 w-4" />,
                    action: () => { selectProject(p.id); onClose(); }
                }))
            });
        }

        // Filter Tasks
        const filteredTasks = allTasks.filter(task => 
            task.title.toLowerCase().includes(lowerCaseQuery) || 
            task.description.toLowerCase().includes(lowerCaseQuery)
        );
        if (filteredTasks.length > 0) {
             groups.push({
                title: "Tasks",
                items: filteredTasks.map(t => ({
                    id: t.id,
                    title: t.title,
                    description: `In: ${projects.find(p => p.id === t.projectId)?.name || 'Unknown Project'}`,
                    icon: <ListTodoIcon className="h-4 w-4" />,
                    action: async () => { 
                        const task = await fetchTaskById(t.id);
                        if (task) {
                            selectProject(task.projectId || '', false);
                            viewTask(task);
                        }
                        onClose();
                    }
                }))
            });
        }
    }

    return groups;
  }, [query, commands, projects, allTasks, selectProject, viewTask, fetchTaskById, onClose, handleSmartAdd]);

  const flatItems = useMemo(() => filteredResults.flatMap(g => g.items), [filteredResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % flatItems.length);
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + flatItems.length) % flatItems.length);
      } else if (e.key === 'Enter') {
          e.preventDefault();
          if (flatItems[selectedIndex]) {
              flatItems[selectedIndex].action();
          }
      }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[150] flex items-start justify-center p-4 sm:p-16"
      onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="command-palette-title"
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      <motion.div
        className="bg-surface border border-outline/30 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
        variants={modalVariants}
      >
        <div className="flex items-center p-4 border-b border-outline/30 relative">
          {isParsing ? (
              <svg className="animate-spin h-5 w-5 text-primary mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
              <SearchIcon className="h-5 w-5 text-on-surface-variant mr-3" />
          )}
          <input
            id="command-palette-title"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type '+' to smart add, or search..."
            className="flex-1 w-full min-w-0 bg-transparent text-lg text-on-surface placeholder-on-surface-variant/50 focus:outline-none"
            autoComplete="off"
            disabled={isParsing}
          />
          <div className="flex items-center gap-1 text-xs text-on-surface-variant bg-surface-variant/50 px-1.5 py-0.5 rounded border border-outline/30">
             <span>ESC</span>
          </div>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto p-2">
            {filteredResults.map((group, groupIndex) => (
                <div key={group.title} className="mb-2">
                    <h3 className="px-2 py-1 text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{group.title}</h3>
                    {group.items.map((item, itemIndex) => {
                        // Calculate global index
                        let globalIndex = 0;
                        for (let i = 0; i < groupIndex; i++) {
                            globalIndex += filteredResults[i].items.length;
                        }
                        globalIndex += itemIndex;
                        const isSelected = globalIndex === selectedIndex;

                        return (
                            <button
                                key={item.id}
                                onClick={item.action}
                                onMouseEnter={() => setSelectedIndex(globalIndex)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${isSelected ? 'bg-primary/10 text-primary' : 'text-on-surface hover:bg-surface-variant/50'}`}
                            >
                                <div className={`p-1.5 rounded-md ${isSelected ? 'bg-primary/20' : 'bg-surface-variant text-on-surface-variant'}`}>
                                    {item.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-on-surface'}`}>{item.title}</p>
                                    {item.description && <p className={`text-xs truncate ${isSelected ? 'text-primary/70' : 'text-on-surface-variant'}`}>{item.description}</p>}
                                </div>
                                {isSelected && <CommandIcon className="h-4 w-4 opacity-50" />}
                            </button>
                        );
                    })}
                </div>
            ))}
            {flatItems.length === 0 && (
                <div className="text-center py-8 text-on-surface-variant">
                    <p>No results found.</p>
                </div>
            )}
        </div>
        
        <div className="bg-surface-variant/30 p-2 text-xs text-on-surface-variant flex justify-between items-center border-t border-outline/30">
            <div className="flex gap-3">
                <span><kbd className="bg-surface border border-outline/50 rounded px-1 font-sans">↑</kbd> <kbd className="bg-surface border border-outline/50 rounded px-1 font-sans">↓</kbd> to navigate</span>
                <span><kbd className="bg-surface border border-outline/50 rounded px-1 font-sans">↵</kbd> to select</span>
            </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GlobalSearchModal;
