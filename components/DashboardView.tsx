
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { 
    CheckCircle2, 
    ClockIcon, 
    PlusIcon, 
    CalendarDaysIcon,
    AlertCircleIcon,
    ActivityIcon,
    MLSIcon,
    GlobeIcon,
    RocketIcon,
    ChevronRightIcon,
    SettingsIcon,
    CanvaIcon,
    XIcon,
    FlameIcon,
    TargetIcon,
    FormInputIcon
} from './icons';
import WelcomeEmptyState from './WelcomeEmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { isTaskCompleted, isTaskOverdue, isTaskDueToday, safeDate } from '../utils';

// DTD2 Logic Helper
const DTD2_WEEKLY_LETTERS = [
    ['A', 'W'], ['B', 'E'], ['D', 'O'], ['H', 'V'], ['C', 'K'], 
    ['F', 'G'], ['J', 'Q', 'S'], ['L', 'N'], ['M', 'R'], ['I', 'U'], 
    ['P', 'T'], ['X', 'Y', 'Z'], ['V', 'W']
];

const getDTD2Letters = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const week = Math.floor(Math.floor(diff / (1000 * 60 * 60 * 24)) / 7);
    return DTD2_WEEKLY_LETTERS[week % 13];
};

const UtilityBelt: React.FC = () => {
    const { currentUser, updateUserProfile } = useAppContext();
    const [isManaging, setIsManaging] = useState(false);
    
    const links = useMemo(() => currentUser?.quickLinks || [
        { id: '1', label: 'MLS', url: 'https://matrix.mls.com', iconType: 'mls' as const },
        { id: '2', label: 'GeoWarehouse', url: 'https://www.geowarehouse.ca', iconType: 'geo' as const },
        { id: '3', label: 'ShowingTime', url: 'https://www.showingtime.com', iconType: 'showing' as const },
        { id: '4', label: 'Canva', url: 'https://canva.com', iconType: 'canva' as const },
    ], [currentUser?.quickLinks]);

    const getIcon = (type: string) => {
        switch(type) {
            case 'mls': return <MLSIcon className="w-4 h-4" />;
            case 'geo': return <GlobeIcon className="w-4 h-4" />;
            case 'showing': return <ClockIcon className="w-4 h-4" />;
            case 'canva': return <CanvaIcon className="w-4 h-4" />;
            default: return <RocketIcon className="w-4 h-4" />;
        }
    };

    const addLink = () => {
        const label = prompt("Link Name:");
        if (!label) return;
        const url = prompt("URL (https://...):");
        if (!url) return;
        const type = prompt("Icon Type (mls, geo, showing, canva, custom):", "custom") as 'mls' | 'geo' | 'showing' | 'canva' | 'custom';
        
        const newLinks = [...links, { id: Date.now().toString(), label, url, iconType: type }];
        updateUserProfile({ quickLinks: newLinks });
    };

    const removeLink = (id: string) => {
        if (confirm("Remove this shortcut?")) {
            const newLinks = links.filter(l => l.id !== id);
            updateUserProfile({ quickLinks: newLinks });
        }
    };

    return (
        <div className="flex items-center gap-2 bg-surface/40 backdrop-blur-sm border border-outline/10 p-1.5 rounded-2xl h-12">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[400px]">
                {links.map(link => (
                    <div key={link.id} className="relative group/link flex-shrink-0">
                        <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className={`flex items-center gap-2 px-3 py-1.5 hover:bg-surface rounded-xl transition-all whitespace-nowrap
                                ${isManaging ? 'pr-8 bg-surface border border-outline/10' : ''}
                            `}
                        >
                            <div className="text-primary">{getIcon(link.iconType)}</div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant group-hover/link:text-primary">{link.label}</span>
                        </a>
                        <AnimatePresence>
                            {isManaging && (
                                <motion.button 
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0 }}
                                    onClick={() => removeLink(link.id)}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 bg-danger text-white rounded-lg p-1 shadow-m3-sm hover:scale-110 active:scale-95 transition-all z-10"
                                >
                                    <XIcon className="w-2.5 h-2.5" />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
            <div className="h-4 w-px bg-outline/20 mx-1 flex-shrink-0" />
            <div className="flex items-center gap-1 shrink-0">
                <button 
                    onClick={() => setIsManaging(!isManaging)}
                    className={`p-2 rounded-xl transition-all ${isManaging ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant/40 hover:bg-surface'}`}
                    title="Manage Shortcuts"
                >
                    <SettingsIcon className="w-4 h-4" />
                </button>
                <AnimatePresence>
                    {isManaging && (
                        <motion.button 
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            onClick={addLink} 
                            className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all overflow-hidden whitespace-nowrap flex items-center gap-1"
                        >
                            <PlusIcon className="w-4 h-4" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
UtilityBelt.displayName = 'UtilityBelt';

const StatPill = ({ label, count, icon: Icon, color, isActive = false, onClick }: { label: string; count: number; icon: React.ElementType; color: string; isActive?: boolean; onClick: () => void }) => (
    <button 
        onClick={onClick}
        className={`bg-surface border rounded-[1.8rem] p-4 pr-10 flex items-center gap-4 shadow-sm transition-all hover:scale-105 active:scale-95
        ${isActive ? 'border-primary ring-1 ring-primary/20 shadow-m3-md' : 'border-outline/10 grayscale-[0.3] opacity-80 hover:grayscale-0 hover:opacity-100 hover:border-outline/30'}`}
    >
        <div className={`p-2.5 rounded-xl transition-colors ${isActive ? 'bg-primary/15 text-primary' : ''}`} style={!isActive ? { backgroundColor: `${color}15`, color } : {}}>
            <Icon className="w-5 h-5" />
        </div>
        <div className="text-left">
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.15em] opacity-60 leading-none mb-1">{label}</p>
            <p className="text-xl font-black text-on-surface leading-none">{count}</p>
        </div>
    </button>
);
StatPill.displayName = 'StatPill';

const DashboardView: React.FC = () => {
    const { currentUser, projects, allTasks, habits, habitLogs, viewTask, viewLead, editTask, setActiveView, logHabit, isLoading } = useAppContext();
    const dtd2 = useMemo(() => getDTD2Letters(), []);
    const todayStr = new Date().toISOString().split('T')[0];
    const [activeFilter, setActiveFilter] = useState<'action' | 'today' | 'scheduled' | 'events'>('events'); // Default to 'events'

    const metrics = useMemo(() => {
        const myTasks = allTasks.filter(t => t.assigneeIds?.includes(currentUser?.id || ''));
        
        const actionNeeded = myTasks.filter(t => {
            if (!t.dueDate) return false;
            return isTaskOverdue(t, projects.find(p => p.id === t.projectId));
        });

        const todayTasks = myTasks.filter(t => {
            if (!t.dueDate) return false;
            return isTaskDueToday(t, projects.find(p => p.id === t.projectId));
        });

        const scheduledTasks = myTasks.filter(t => {
            if (!t.dueDate || isTaskCompleted(t, projects.find(p => p.id === t.projectId))) return false;
            const due = new Date(t.dueDate);
            const today = new Date();
            today.setHours(0,0,0,0);
            return due > today && !isTaskDueToday(t, projects.find(p => p.id === t.projectId));
        });
        
        const eventsToday = myTasks.filter(t => {
            if (!t.eventDate) return false;
            const eventDate = safeDate(t.eventDate);
            const eventDateStr = eventDate.toISOString().split('T')[0];
            const todayStr = new Date().toISOString().split('T')[0];
            const isToday = eventDateStr === todayStr;
            console.log('Task:', t.title, 'eventDate:', t.eventDate, 'eventDateStr:', eventDateStr, 'todayStr:', todayStr, 'Is today:', isToday);
            return isToday;
        });
        
        return {
            actionCount: actionNeeded.length,
            todayCount: todayTasks.length,
            scheduledCount: scheduledTasks.length,
            eventCount: eventsToday.length,
            actionNeeded,
            todayTasks,
            scheduledTasks,
            eventsToday,
            leads: allTasks.filter(t => 
                (t.taskType === 'Listing' || t.taskType === 'Consult' || t.tags?.includes('Lead')) && 
                !isTaskCompleted(t, projects.find(p => p.id === t.projectId)) && 
                !t.isUrgentDismissed
            ).slice(0, 5)
        };
    }, [allTasks, currentUser, projects]);

    const queueTasks = useMemo(() => {
        switch(activeFilter) {
            case 'action': return metrics.actionNeeded;
            case 'scheduled': return metrics.scheduledTasks;
            case 'events': return metrics.eventsToday;
            case 'today':
            default: return metrics.todayTasks;
        }
    }, [activeFilter, metrics]);

    if (!currentUser) return null;
    if (projects.length === 0 && !isLoading) return <WelcomeEmptyState />;

    return (
        <div className="h-full flex flex-col gap-8 max-w-[1800px] mx-auto animate-fade-in pb-12">
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-8">
                    <div>
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Good Morning, {currentUser.name.split(' ')[0]}</p>
                        <h1 className="text-4xl font-black text-on-surface tracking-tighter leading-none">Hub Overview</h1>
                    </div>
                    <UtilityBelt />
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => editTask('new')} className="flex flex-col items-center gap-1 group">
                        <div className="w-11 h-11 bg-primary/10 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-all shadow-sm">
                            <PlusIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 group-hover:opacity-100">New Task</span>
                    </button>
                    <button onClick={() => setActiveView('habits')} className="flex flex-col items-center gap-1 group">
                        <div className="w-11 h-11 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center group-hover:bg-secondary group-hover:text-on-primary transition-all shadow-sm">
                            <TargetIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 group-hover:opacity-100">Growth</span>
                    </button>
                    <button onClick={() => setActiveView('forms')} className="flex flex-col items-center gap-1 group">
                        <div className="w-11 h-11 bg-success/10 text-success rounded-2xl flex items-center justify-center group-hover:bg-success group-hover:text-on-primary transition-all shadow-sm">
                            <FormInputIcon className="w-5 h-5" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant opacity-60 group-hover:opacity-100">Engines</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <div className="xl:col-span-8 space-y-8">
                    <div className="flex gap-4">
                        <StatPill label="Action Needed" count={metrics.actionCount} icon={AlertCircleIcon} color="#EF4444" isActive={activeFilter === 'action'} onClick={() => setActiveFilter('action')}/>
                        <StatPill label="Today's Work" count={metrics.todayCount} icon={ClockIcon} color="#8b5cf6" isActive={activeFilter === 'today'} onClick={() => setActiveFilter('today')}/>
                        <StatPill label="Scheduled" count={metrics.scheduledCount} icon={CalendarDaysIcon} color="#ec4899" isActive={activeFilter === 'scheduled'} onClick={() => setActiveFilter('scheduled')}/>
                        <StatPill label="Events Today" count={metrics.eventCount} icon={CalendarDaysIcon} color="#10b981" isActive={activeFilter === 'events'} onClick={() => setActiveFilter('events')}/>
                    </div>

                    <div className="bg-surface rounded-[2.5rem] border border-outline/20 shadow-md flex flex-col min-h-[500px] overflow-hidden">
                        <div className="px-8 py-6 border-b border-outline/5 flex items-center justify-between bg-surface/30 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${activeFilter === 'action' ? 'bg-danger animate-pulse' : 'bg-primary'}`} />
                                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-on-surface">
                                    Priority: {activeFilter === 'action' ? 'Action Needed' : activeFilter === 'scheduled' ? 'Upcoming Schedule' : activeFilter === 'events' ? 'Events Today' : 'Today\'s Focus'}
                                </h3>
                            </div>
                            <span className="text-[9px] font-black text-primary uppercase tracking-[0.15em] bg-primary/5 px-4 py-1.5 rounded-full border border-primary/10">
                                DTD2 Rotation: {dtd2.join(' & ')}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                            <AnimatePresence mode="popLayout">
                                {queueTasks.map(task => (
                                    <motion.div 
                                        key={task.id} 
                                        layout
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        onClick={() => (task.taskType === 'Listing' || task.taskType === 'Consult') ? viewLead(task) : viewTask(task)}
                                        className="group flex items-center gap-5 p-4 hover:bg-surface-variant/30 rounded-[1.8rem] transition-all cursor-pointer border border-transparent hover:border-outline/10"
                                    >
                                        <div className="w-7 h-7 rounded-full border-2 border-outline/30 flex items-center justify-center group-hover:border-primary transition-all">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-100 transition-all" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[15px] font-bold text-on-surface truncate tracking-tight uppercase">{task.title}</h4>
                                            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-40 mt-1">
                                                {projects.find(p => p.id === (task as { projectId?: string }).projectId)?.name} • {new Date(activeFilter === 'events' ? task.eventDate! : task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                        <ChevronRightIcon className="w-4 h-4 text-outline/30 opacity-0 group-hover:opacity-100 transition-all" />
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {queueTasks.length === 0 && (
                                <div className="py-32 text-center opacity-30 flex flex-col items-center gap-4">
                                    <CheckCircle2 className="w-16 h-16" />
                                    <p className="text-sm font-black uppercase tracking-widest">Inbox Zero Achieved</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-4 space-y-8">
                    {/* Live Lead Feed Widget */}
                    <section className="bg-surface rounded-[2.5rem] border border-outline/10 shadow-sm overflow-hidden flex flex-col">
                         <div className="px-8 py-6 border-b border-outline/5 flex items-center justify-between bg-danger/[0.02]">
                            <div className="flex items-center gap-3">
                                <ActivityIcon className="w-5 h-5 text-danger animate-pulse" />
                                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-on-surface">Live Lead Feed</h3>
                            </div>
                            <button onClick={() => setActiveView('leads')} className="text-[9px] font-black text-danger uppercase tracking-widest hover:underline">Pipeline</button>
                        </div>
                        <div className="p-4 space-y-3">
                            <AnimatePresence mode="popLayout">
                                {metrics.leads.length > 0 ? (
                                    metrics.leads.map(lead => (
                                        <motion.div key={lead.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => viewLead(lead)}>
                                            <div className="p-4 bg-danger/[0.02] border border-danger/10 rounded-2xl group cursor-pointer hover:bg-danger/[0.05] transition-all relative">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-xs font-black text-on-surface uppercase truncate pr-4">{lead.title.split('(')[0]}</h4>
                                                    <span className="text-[8px] font-black text-danger bg-danger/5 px-2 py-0.5 rounded-lg border border-danger/10">{lead.tags?.[1] || 'Web'}</span>
                                                </div>
                                                <p className="text-[9px] font-bold text-on-surface-variant opacity-40 mt-1 uppercase tracking-widest">Captured {new Date(lead.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <p className="py-8 text-center text-[10px] font-black text-on-surface-variant/30 uppercase tracking-widest">Feed Silent</p>
                                )}
                            </AnimatePresence>
                        </div>
                    </section>

                    <section className="bg-surface rounded-[2.5rem] border border-outline/10 shadow-sm overflow-hidden flex flex-col">
                         <div className="px-8 py-6 border-b border-outline/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FlameIcon className="w-5 h-5 text-secondary" />
                                <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-on-surface">Growth Tracks</h3>
                            </div>
                            <button onClick={() => setActiveView('habits')} className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">View All</button>
                        </div>
                        <div className="p-6 space-y-4">
                            {habits.slice(0, 3).map(habit => {
                                const log = habitLogs.find(l => l.habitId === habit.id && l.date === todayStr);
                                const count = log?.count || 0;
                                const progress = Math.min((count / habit.targetCount) * 100, 100);
                                return (
                                    <div key={habit.id} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-black text-on-surface uppercase tracking-tight">{habit.title}</span>
                                            <span className="text-[10px] font-bold text-on-surface-variant/60">{count}/{habit.targetCount}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-surface-variant/30 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }} 
                                                    animate={{ width: `${progress}%` }} 
                                                    className="h-full bg-primary" 
                                                    style={{ backgroundColor: habit.color }}
                                                />
                                            </div>
                                            <button 
                                                onClick={() => logHabit(habit.id, count + 1)}
                                                className="p-1 bg-surface-variant/50 hover:bg-primary/10 text-on-surface-variant hover:text-primary rounded-lg transition-all"
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                            {habits.length === 0 && (
                                <p className="py-4 text-center text-[10px] font-black text-on-surface-variant/30 uppercase tracking-widest">No habits tracked yet</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
