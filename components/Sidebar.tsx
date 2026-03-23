
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { 
  LayoutDashboardIcon, 
  PlusIcon, 
  SettingsIcon, 
  XIcon, 
  ClipboardListIcon, 
  ChartPieIcon, 
  KWHubMark,
  CalendarDaysIcon, 
  ChevronDownIcon, 
  UsersIcon, 
  ClockIcon, 
  FormInputIcon,
  BriefcaseIcon,
  ActivityIcon,
  TargetIcon,
  TagIcon,
  CheckCircle2
} from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { Project } from '../types';
import { Avatar } from './Avatar';

export const Sidebar: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { 
    setActiveView, 
    activeView, 
    projects, 
    selectProject, 
    selectedProject, 
    teams, 
    selectTeam, 
    selectedTeam,
    openCreateProjectModal,
    openCreateTeamModal,
    currentUser,
  } = useAppContext();

  // State to track expanded sections
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['overview', 'productivity', 'tools']));
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set(['personal']));

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  };

  const toggleTeam = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const personalProjects = (projects || []).filter(p => !p.teamId && !p.isArchived);
  
  const teamProjectsGrouped = useMemo(() => {
    const grouped: { [teamId: string]: Project[] } = {};
    (teams || []).forEach(team => {
      grouped[team.id] = (projects || []).filter(p => p.teamId === team.id && !p.isArchived);
    });
    return grouped;
  }, [projects, teams]);

  const categories = [
    {
      id: 'overview',
      label: 'Overview',
      items: [
        { icon: <LayoutDashboardIcon className="h-5 w-5" />, label: 'Dashboard', view: 'dashboard' },
        { icon: <ActivityIcon className="h-5 w-5" />, label: 'Activity', view: 'activity' },
        { icon: <ChartPieIcon className="h-5 w-5" />, label: 'Reports', view: 'reports' },
      ]
    },
    {
      id: 'productivity',
      label: 'Productivity',
      items: [
        { icon: <TargetIcon className="h-5 w-5" />, label: 'Focus Mode', view: 'focus' },
        { icon: <ClockIcon className="h-5 w-5" />, label: 'Ideal Week', view: 'ideal-week' },
        { icon: <CheckCircle2 className="h-5 w-5" />, label: 'Habits', view: 'habits' },
        { icon: <CalendarDaysIcon className="h-5 w-5" />, label: 'Calendar', view: 'calendar' },
      ]
    },
    {
      id: 'tools',
      label: 'Tools & CRM',
      items: [
        { icon: <TagIcon className="h-5 w-5" />, label: 'Leads', view: 'leads' },
        { icon: <FormInputIcon className="h-5 w-5" />, label: 'Forms', view: 'forms' },
        { icon: <ClipboardListIcon className="h-5 w-5" />, label: 'Templates', view: 'templates' },
      ]
    }
  ];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? '0%' : '-100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="fixed inset-y-0 left-0 w-72 bg-surface border-r border-outline/10 z-[100] flex flex-col lg:static lg:!translate-x-0 overflow-hidden shadow-2xl lg:shadow-none"
      >
        {/* Branding Header */}
        <div className="p-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
             <div className="relative group">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/40 transition-all duration-500" />
                <KWHubMark className="h-10 w-10 relative z-10 drop-shadow-m3-md" />
             </div>
             <div className="flex flex-col">
               <span className="font-black text-xl tracking-tighter text-on-surface leading-none">KW<span className="text-primary">Hub</span></span>
               <span className="text-[8px] font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-40 mt-1">Inspire Productivity</span>
             </div>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 text-on-surface-variant hover:bg-danger/10 hover:text-danger rounded-xl transition-all">
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-4">
          {/* Navigation Categories */}
          {categories.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            return (
              <section key={category.id} className="space-y-1">
                <button 
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center justify-between w-full px-3 py-2 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-60 hover:opacity-100 transition-all group"
                >
                  <span>{category.label}</span>
                  <ChevronDownIcon className={`h-3 w-3 transition-transform duration-300 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                </button>
                
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.nav 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="space-y-0.5 overflow-hidden"
                    >
                      {category.items.map((item) => {
                        const isActive = activeView === item.view;
                        return (
                          <button
                            key={item.label}
                            onClick={() => {
                              setActiveView(item.view);
                              onClose();
                            }}
                            className={`flex items-center gap-3 w-full px-4 py-2.5 rounded-2xl transition-all duration-200 relative group
                              ${isActive 
                                ? 'bg-primary/10 text-primary shadow-sm' 
                                : 'text-on-surface-variant hover:bg-on-surface/5 hover:text-on-surface'}`}
                          >
                            {isActive && <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-5 bg-primary rounded-full" />}
                            <span className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`}>{item.icon}</span>
                            <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                          </button>
                        );
                      })}
                    </motion.nav>
                  )}
                </AnimatePresence>
              </section>
            );
          })}

          {/* Workspace Section */}
          <div className="space-y-2 pb-10">
            <div className="flex items-center justify-between px-3 mb-4">
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-40">Workspace</p>
              <div className="flex gap-1">
                 <button onClick={() => { openCreateTeamModal(); onClose(); }} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-all"><UsersIcon className="h-4 w-4" /></button>
                 <button onClick={() => { openCreateProjectModal(); onClose(); }} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-all"><PlusIcon className="h-4 w-4" /></button>
              </div>
            </div>

            {/* Personal Projects */}
            <div className="bg-surface-variant/10 rounded-[2rem] border border-outline/5 overflow-hidden">
                <button onClick={() => toggleTeam('personal')} className="flex items-center w-full gap-3 px-4 py-3 text-sm font-black uppercase tracking-widest text-on-surface hover:bg-on-surface/5 transition-colors">
                  <ChevronDownIcon className={`h-4 w-4 text-on-surface-variant transition-transform duration-300 ${expandedTeams.has('personal') ? 'rotate-0' : '-rotate-90'}`} />
                  <BriefcaseIcon className="h-5 w-5 text-primary" />
                  <span className="flex-1 text-left">Personal</span>
                </button>
                <AnimatePresence>
                  {expandedTeams.has('personal') && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-surface/30">
                      {personalProjects.map(project => (
                        <button key={project.id} onClick={() => { selectProject(project.id); onClose(); }} className={`flex items-center w-full gap-3 px-10 py-2.5 text-xs font-bold transition-all relative ${selectedProject?.id === project.id ? 'text-primary bg-primary/5' : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'}`}>
                          {selectedProject?.id === project.id && <div className="absolute left-6 w-1.5 h-1.5 rounded-full bg-primary" />}
                          <span className="truncate">{project.name}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
            </div>

            {/* Team Projects */}
            {teams.map(team => {
              const teamProjects = teamProjectsGrouped[team.id] || [];
              const isExpanded = expandedTeams.has(team.id);
              return (
                <div key={team.id} className="bg-surface-variant/10 rounded-[2rem] border border-outline/5 overflow-hidden">
                    <div className={`flex items-center w-full gap-1`}>
                      <button onClick={() => toggleTeam(team.id)} className="p-4 pr-1 text-on-surface-variant hover:text-on-surface"><ChevronDownIcon className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} /></button>
                      <button onClick={() => { selectTeam(team.id); onClose(); }} className="flex-1 flex items-center gap-2 py-3 text-left min-w-0">
                        <UsersIcon className={`h-5 w-5 ${selectedTeam?.id === team.id ? 'text-primary' : 'text-on-surface-variant'}`} />
                        <span className={`text-sm font-black uppercase tracking-widest truncate ${selectedTeam?.id === team.id ? 'text-primary' : 'text-on-surface'}`}>{team.name}</span>
                      </button>
                    </div>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-surface/30">
                          {teamProjects.map(project => (
                            <button key={project.id} onClick={() => { selectProject(project.id); onClose(); }} className={`flex items-center w-full gap-3 px-10 py-2.5 text-xs font-bold transition-all relative ${selectedProject?.id === project.id ? 'text-primary bg-primary/5' : 'text-on-surface-variant hover:text-on-surface hover:bg-on-surface/5'}`}>
                              {selectedProject?.id === project.id && <div className="absolute left-6 w-1.5 h-1.5 rounded-full bg-primary" />}
                              <span className="truncate">{project.name}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="p-6 border-t border-outline/10 bg-surface/80 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Hub Live</span>
                </div>
            </div>
            {currentUser && (
              <div className="p-3 bg-surface-variant/20 rounded-[1.8rem] border border-outline/5 flex items-center gap-3 group transition-all">
                <Avatar src={currentUser.avatarUrl} alt={currentUser.name} className="h-10 w-10 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <p className="font-black text-xs text-on-surface uppercase tracking-wider truncate">{currentUser.name}</p>
                  <button 
                    onClick={() => { setActiveView('settings'); onClose(); }}
                    className="text-[9px] font-bold text-primary hover:text-primary/80 uppercase tracking-widest mt-1 flex items-center gap-1 transition-colors"
                  >
                    <SettingsIcon className="h-3 w-3" />
                    Settings
                  </button>
                </div>
              </div>
            )}
        </div>
      </motion.div>
    </>
  );
};
