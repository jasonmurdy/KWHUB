import React, { useState, useRef, useEffect } from 'react';
import { 
  MenuIcon, BellIcon, SearchIcon, ChevronDownIcon,
  MessageSquareIcon, EditIcon, TargetIcon, ListTodoIcon,
  ClockIcon, UsersIcon, FormInputIcon, TrashIcon,
  XIcon, RocketIcon
} from './icons';
import { useAppContext } from '../contexts/AppContext';
import { Notification } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar } from './Avatar';

const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
    switch(type) {
        case 'deadline': return <ClockIcon className="w-4 h-4 text-danger" />;
        case 'mention': return <div className="p-1 bg-primary text-white rounded-lg"><UsersIcon className="w-3 h-3" /></div>;
        case 'assignment': return <ListTodoIcon className="w-4 h-4 text-warning" />;
        case 'goal': return <div className="p-1 bg-success text-white rounded-lg"><RocketIcon className="w-3 h-3" /></div>;
        case 'form': return <FormInputIcon className="w-4 h-4 text-secondary" />;
        default: return <BellIcon className="w-4 h-4 text-on-surface-variant" />;
    }
};

const NotificationPanel: React.FC<{ notifications: Notification[]; onClose: () => void }> = ({ notifications, onClose }) => {
    const { selectProject, viewTask, fetchTaskById, setActiveView, selectTeam, clearAllNotifications } = useAppContext();

    const handleNotificationClick = async (notif: Notification) => {
        if (notif.link) {
            const params = new URLSearchParams(notif.link);
            const view = params.get('view');
            const id = params.get('id');
            const taskId = params.get('taskId');

            if (view === 'project' && id) {
                selectProject(id);
                if (taskId) {
                    const task = await fetchTaskById(taskId);
                    if (task) viewTask(task);
                }
            } else if (view === 'teams' && id) {
                selectTeam(id);
            } else if (view === 'forms') {
                setActiveView('forms');
            } else if (view) {
                setActiveView(view);
            }
        } 
        else if (notif.projectId) {
            selectProject(notif.projectId, false);
            if (notif.taskId) {
                const task = await fetchTaskById(notif.taskId);
                if (task) viewTask(task);
            }
        }
        
        onClose();
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full right-0 mt-4 w-80 sm:w-96 max-w-[90vw] sm:max-w-md bg-surface rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-outline/30 z-[130] overflow-hidden" 
            role="region" aria-live="polite"
        >
            <div className="p-6 border-b border-outline/30 flex justify-between items-center bg-surface-variant/5">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-on-surface">Intelligence Hub</h3>
                    <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Incoming transmissions</p>
                </div>
                <div className="flex items-center gap-3">
                    {notifications.length > 0 && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); clearAllNotifications(); }} 
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-danger hover:bg-danger/5 rounded-lg transition-all"
                        >
                            <TrashIcon className="w-3 h-3" /> Purge
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 bg-surface-variant/30 hover:bg-on-surface/5 rounded-xl transition-colors">
                        <XIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar bg-surface-variant/5">
                {notifications.length === 0 ? (
                    <div className="py-20 text-center opacity-30">
                        <BellIcon className="w-16 h-16 text-primary/40 mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Operational Silence</p>
                        <p className="text-xs font-bold mt-1">No new transmissions</p>
                    </div>
                ) : (
                    notifications.map(notif => (
                        <div key={notif.id} onClick={() => handleNotificationClick(notif)} className={`flex items-start gap-4 p-5 border-b border-outline/10 last:border-b-0 hover:bg-primary/[0.03] cursor-pointer transition-all ${!notif.read ? 'bg-primary/[0.05] border-l-4 border-l-primary' : ''}`}>
                            <div className="relative shrink-0">
                                <Avatar src={notif.actorAvatarUrl} alt={notif.actorName} className="h-10 w-10 rounded-[1rem] ring-2 ring-surface" />
                                <div className="absolute -bottom-1 -right-1 bg-surface rounded-lg p-0.5 border border-outline/10 shadow-sm">
                                    <NotificationIcon type={notif.type} />
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-on-surface-variant leading-relaxed">
                                    <span className="font-black text-on-surface uppercase text-xs tracking-tight">{notif.actorName}</span>
                                    <br />
                                    {notif.message}
                                </p>
                                <p className="text-[8px] text-on-surface-variant/30 font-black uppercase tracking-widest mt-2">
                                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </p>
                            </div>
                            {!notif.read && <div className="w-2 h-2 bg-primary rounded-full mt-2 shrink-0 animate-pulse" />}
                        </div>
                    ))
                )}
            </div>
            <div className="p-4 bg-surface text-center border-t border-outline/10">
                 <button onClick={onClose} className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 hover:text-primary transition-colors">Dismiss Intelligence</button>
            </div>
        </motion.div>
    );
};

interface HeaderProps {
  onMenuClick: () => void;
  activeAuxTab: string | null;
  onAuxTabChange: (tab: string | null) => void;
}

const ToolButton: React.FC<{ icon: React.ElementType, label: string, isActive: boolean, onClick: () => void }> = ({ icon: Icon, label, isActive, onClick }) => (
    <button 
        onClick={onClick}
        title={label}
        className={`p-2.5 rounded-xl transition-all relative group ${isActive ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:bg-on-surface/5'}`}
    >
        <Icon className="h-5 w-5" />
        {isActive && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />}
    </button>
);

const Header: React.FC<HeaderProps> = ({ onMenuClick, activeAuxTab, onAuxTabChange }) => {
  const { projects, selectedProject, selectedTeam, activeView, notifications, markNotificationsAsRead, openGlobalSearch, currentUser, selectProject } = useAppContext();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
            setIsSwitcherOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [switcherRef]);

  const handleBellClick = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    if (!isNotificationsOpen && unreadCount > 0) {
        markNotificationsAsRead();
    }
  };
  
  const handleProjectSelect = (projectId: string) => {
    selectProject(projectId);
    setIsSwitcherOpen(false);
  };

  const renderActiveViewTitle = () => {
    if (activeView === 'project' && selectedProject) {
      return (
        <div className="relative" ref={switcherRef}>
          <button onClick={() => setIsSwitcherOpen(!isSwitcherOpen)} className="flex items-center gap-2 text-left p-2 -ml-2 rounded-lg hover:bg-on-surface/5 transition-colors">
            <div>
                <p className="text-[10px] text-primary font-black uppercase tracking-widest leading-none mb-1">Portfolio Board</p>
                <h2 className="text-lg font-black text-on-surface truncate max-w-[150px] sm:max-w-md tracking-tighter">{selectedProject.name}</h2>
            </div>
            <ChevronDownIcon className={`h-4 w-4 text-on-surface-variant transition-transform ${isSwitcherOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
          {isSwitcherOpen && (
            <motion.div 
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute top-full mt-2 w-72 bg-surface border border-outline rounded-[1.5rem] shadow-m3-lg z-[130] p-2 overflow-hidden"
            >
              <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mb-2 px-3 py-2 border-b border-outline/5">Switch Portfolio</p>
              <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {projects.filter(p => p.id !== selectedProject.id).map(project => (
                    <button 
                        key={project.id}
                        onClick={() => handleProjectSelect(project.id)}
                        className="w-full text-left px-4 py-3 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary/5 hover:text-primary transition-all text-on-surface"
                    >
                        {project.name}
                    </button>
                ))}
                {projects.length <= 1 && <p className="text-xs text-on-surface-variant px-3 py-4 text-center opacity-40">No other portfolios active.</p>}
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      );
    }
    if (activeView === 'teams' && selectedTeam) {
      return (
        <div>
          <p className="text-[10px] text-primary font-black uppercase tracking-widest leading-none mb-1">Team</p>
          <h2 className="text-lg font-black text-on-surface truncate max-w-[150px] sm:max-w-md tracking-tighter">{selectedTeam.name}</h2>
        </div>
      );
    }
    return (
      <div>
        <h2 className="text-lg font-black text-on-surface capitalize tracking-tighter">{activeView}</h2>
      </div>
    );
  };

  return (
    <header className="flex-shrink-0 bg-surface/60 backdrop-blur-2xl border-b border-outline/10 sticky top-0 z-[110]">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16">
        <div className="flex items-center gap-4">
          <button onClick={onMenuClick} className="lg:hidden text-on-surface-variant hover:text-primary">
            <MenuIcon className="h-6 w-6" />
          </button>
          {renderActiveViewTitle()}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden lg:flex items-center gap-1 mr-4 pr-4 border-r border-outline/10">
                <ToolButton 
                    icon={MessageSquareIcon} 
                    label="Team Chat" 
                    isActive={activeAuxTab === 'chat'} 
                    onClick={() => onAuxTabChange(activeAuxTab === 'chat' ? null : 'chat')} 
                />
                <ToolButton 
                    icon={EditIcon} 
                    label="Quick Capture" 
                    isActive={activeAuxTab === 'brain'} 
                    onClick={() => onAuxTabChange(activeAuxTab === 'brain' ? null : 'brain')} 
                />
                <ToolButton 
                    icon={TargetIcon} 
                    label="Focus Deeply" 
                    isActive={activeAuxTab === 'focus'} 
                    onClick={() => onAuxTabChange(activeAuxTab === 'focus' ? null : 'focus')} 
                />
                <ToolButton 
                    icon={ListTodoIcon} 
                    label="Google Sync" 
                    isActive={activeAuxTab === 'tasks'} 
                    onClick={() => onAuxTabChange(activeAuxTab === 'tasks' ? null : 'tasks')} 
                />
            </div>

            <button 
                onClick={openGlobalSearch}
                className="text-on-surface-variant hover:text-primary relative p-2 rounded-full hover:bg-on-surface/5"
                aria-label="Global Search"
            >
                <SearchIcon className="h-6 w-6" />
            </button>
            
            <div className="relative">
                <button 
                    onClick={handleBellClick} 
                    className={`text-on-surface-variant hover:text-primary relative p-2 rounded-full hover:bg-on-surface/5 transition-all ${unreadCount > 0 ? 'text-primary scale-110' : ''}`}
                    aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                >
                    <BellIcon className="h-6 w-6" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-danger text-[10px] font-black text-white border-2 border-surface animate-bounce shadow-sm">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
                <AnimatePresence>
                    {isNotificationsOpen && <NotificationPanel notifications={notifications} onClose={() => setIsNotificationsOpen(false)} />}
                </AnimatePresence>
            </div>

            {currentUser && (
                <div className="hidden sm:block ml-2 pl-4 border-l border-outline/10">
                    <Avatar
                        className="h-8 w-8 rounded-xl ring-2 ring-surface"
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                    />
                </div>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;