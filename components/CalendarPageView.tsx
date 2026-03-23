import React, { useState, useMemo, useEffect } from 'react';
import { Task, TaskPriority, IdealBlock } from '../types';
import { useAppContext } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { RefreshCwIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon, ShieldCheckIcon, SparklesIcon } from './icons';

type CalendarViewMode = 'month' | 'week' | 'day';

type CalendarItem = {
    id: string;
    title: string;
    date: Date;
    type: 'task' | 'subtask' | 'ideal';
    original?: Task;
    idealBlock?: IdealBlock;
    isEventDate?: boolean;
    subtaskTitle?: string;
};

const CalendarTaskItem: React.FC<{ item: CalendarItem; onClick: () => void }> = React.memo(({ item, onClick }) => {
    const { projects, currentUser } = useAppContext();
    
    if (item.type === 'ideal') {
        const categories = currentUser?.idealCategories || [];
        const cat = categories.find(c => c.id === item.idealBlock?.category);
        const color = cat?.color || '#8b5cf6';
        return (
            <div 
                className="w-full text-[9px] p-1 rounded-md border border-dashed transition-all hover:opacity-100 hover:scale-[1.02] flex items-center gap-1 cursor-default select-none" 
                style={{ 
                    backgroundColor: `${color}15`, 
                    borderColor: `${color}40`, 
                    color: color,
                    opacity: 0.5 
                }}
            >
                <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40 shrink-0" />
                <span className="font-black uppercase truncate block flex-1">{item.title}</span>
            </div>
        );
    }

    const task = item.original!;
    const project = projects.find(p => p.id === (task as { projectId?: string }).projectId);
    const isEventDate = item.isEventDate;
    const isSubtask = item.type === 'subtask';
    const displayTitle = isSubtask ? `↳ ${item.subtaskTitle}` : task.title;
    const tooltipText = isSubtask 
        ? `Step: ${item.subtaskTitle}\nPart of: ${task.title}\nProject: ${project?.name || 'N/A'}\nDue: ${item.date.toLocaleDateString()}`
        : `Job: ${task.title}\nProject: ${project?.name || 'N/A'}\n${isEventDate ? 'Event' : 'Due'}: ${item.date.toLocaleDateString()}`;

    // Styles
    let backgroundColor = 'bg-primary/10';
    let hoverColor = 'hover:bg-primary/20';
    let borderColor = 'border-primary/20';
    let textColor = 'text-on-surface';

    if (isEventDate) {
        backgroundColor = 'bg-tertiary/20';
        hoverColor = 'hover:bg-tertiary/30';
        borderColor = 'border-tertiary/30';
        textColor = 'text-on-tertiary';
    } else if (isSubtask) {
        backgroundColor = 'bg-secondary/5';
        hoverColor = 'hover:bg-secondary/10';
        borderColor = 'border-secondary/10';
        textColor = 'text-on-surface-variant';
    }

    return (
        <button onClick={onClick} title={tooltipText} className={`w-full text-left text-[10px] sm:text-xs p-1 rounded-md flex items-center gap-1 ${backgroundColor} ${hoverColor} transition-colors border ${borderColor}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isEventDate ? 'bg-tertiary/90' : isSubtask ? 'bg-secondary/60' : task.priority === TaskPriority.HIGH ? 'bg-danger' : task.priority === TaskPriority.MEDIUM ? 'bg-warning' : 'bg-success'} flex-shrink-0`} />
            <span className={`flex-1 truncate ${isSubtask ? 'italic' : 'font-medium'} ${textColor}`}>{displayTitle}</span>
        </button>
    );
});
CalendarTaskItem.displayName = 'CalendarTaskItem';

const MonthView: React.FC<{ items: CalendarItem[]; currentDate: Date; onDayClick: (date: Date) => void; onTaskClick: (task: Task) => void }> = React.memo(({ items, currentDate, onDayClick, onTaskClick }) => {
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDay = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();
    const itemsByDate = useMemo(() => {
        const grouped: { [key: string]: CalendarItem[] } = {};
        items.forEach(item => { const dateKey = item.date.toDateString(); (grouped[dateKey] = grouped[dateKey] || []).push(item); });
        return grouped;
    }, [items]);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MAX_ITEMS_VISIBLE = 4;

    return (
        <div className="grid grid-cols-7 flex-1 border-t border-l border-outline/30">
            {weekDays.map(day => <div key={day} className="text-center font-semibold text-xs text-on-surface-variant p-2 border-b border-r border-outline/30 bg-surface-variant/40">{day}</div>)}
            {Array.from({ length: startDay }).map((_, i) => <div key={`empty-start-${i}`} className="border-b border-r border-outline/30 bg-surface-variant/40" />)}
            {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
                const day = dayIndex + 1;
                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const dateKey = date.toDateString();
                const dayItems = (itemsByDate[dateKey] || []);
                const isToday = new Date().toDateString() === dateKey;
                return (
                    <div key={day} className="border-b border-r border-outline/30 p-1 flex flex-col min-h-[120px]">
                        <button onClick={() => onDayClick(date)} className={`font-semibold text-sm mb-1 self-start w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-primary/20 ${isToday ? 'text-on-primary bg-primary' : 'text-on-surface-variant'}`}>{day}</button>
                        <div className="space-y-1 overflow-hidden flex-1">
                            {dayItems.slice(0, MAX_ITEMS_VISIBLE).map(item => <CalendarTaskItem key={item.id} item={item} onClick={() => item.original && onTaskClick(item.original)} />)}
                            {dayItems.length > MAX_ITEMS_VISIBLE && (
                                <button onClick={() => onDayClick(date)} className="w-full text-center text-xs font-medium text-primary hover:underline p-1">+ {dayItems.length - MAX_ITEMS_VISIBLE} more</button>
                            )}
                        </div>
                    </div>
                );
            })}
             {Array.from({ length: (7 - (startDay + daysInMonth) % 7) % 7 }).map((_, i) => <div key={`empty-end-${i}`} className="border-b border-r border-outline/30 bg-surface-variant/40" />)}
        </div>
    );
});
MonthView.displayName = 'MonthView';

const WeekView: React.FC<{ items: CalendarItem[]; currentDate: Date; onTaskClick: (task: Task) => void }> = React.memo(({ items, currentDate, onTaskClick }) => {
    const weekDays = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        return Array.from({ length: 7 }).map((_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            return date;
        });
    }, [currentDate]);

    const allDayItemsByDay = useMemo(() => {
        const allDay: Record<string, CalendarItem[]> = {};
        weekDays.forEach(day => { allDay[day.toDateString()] = []; });
        items.forEach(item => { const key = item.date.toDateString(); if (allDay[key]) { allDay[key].push(item); } });
        return allDay;
    }, [items, weekDays]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden border-t border-l border-outline/30">
            <div className="grid grid-cols-7 flex-shrink-0">
                {weekDays.map(day => {
                    const isToday = day.toDateString() === new Date().toDateString();
                    return (
                        <div key={day.toISOString()} className="text-center p-2 border-b border-r border-outline/30">
                            <span className="text-xs text-on-surface-variant uppercase">{day.toLocaleDateString([], { weekday: 'short' })}</span>
                            <p className={`text-2xl font-semibold mt-1 w-10 h-10 flex items-center justify-center rounded-full mx-auto ${isToday ? 'bg-primary text-on-primary' : 'text-on-surface'}`}>
                                {day.getDate()}
                            </p>
                        </div>
                    );
                })}
            </div>
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-7">
                    {weekDays.map(day => (
                        <div key={day.toISOString()} className="p-1 space-y-1 border-r border-outline/30 min-h-[10rem]">
                           {allDayItemsByDay[day.toDateString()].map(item => 
                                <CalendarTaskItem key={item.id} item={item} onClick={() => item.original && onTaskClick(item.original)} />
                           )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});
WeekView.displayName = 'WeekView';

const DayView: React.FC<{ items: CalendarItem[]; currentDate: Date; onTaskClick: (task: Task) => void }> = React.memo(({ items, currentDate, onTaskClick }) => {
    const { currentUser } = useAppContext();
    const dayKey = currentDate.toDateString();
    const dayItems = useMemo(() => items.filter(item => item.date.toDateString() === dayKey), [items, dayKey]);

    return (
        <div className="flex-1 overflow-y-auto bg-surface rounded-lg border border-outline/30 p-4">
            <h3 className="font-semibold text-on-surface mb-2">Schedule for {currentDate.toLocaleDateString([], { month: 'long', day: 'numeric' })}</h3>
            <div className="space-y-2">
                {dayItems.length > 0 ? (
                    dayItems.map(item => {
                        const categories = currentUser?.idealCategories || [];
                        const cat = categories.find(c => c.id === item.idealBlock?.category);
                        const ghostColor = cat?.color || '#8b5cf6';

                        return (
                            <button 
                                key={item.id} 
                                onClick={() => item.original && onTaskClick(item.original)} 
                                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-all border ${
                                    item.isEventDate ? 'bg-tertiary/20 hover:bg-tertiary/30 border-tertiary/20' : 
                                    item.type === 'subtask' ? 'bg-secondary/5 hover:bg-secondary/10 border-secondary/10' : 
                                    item.type === 'ideal' ? 'border-dashed cursor-default' : 'bg-primary/10 hover:bg-primary/20 border-primary/10'
                                }`}
                                style={item.type === 'ideal' ? { backgroundColor: `${ghostColor}10`, borderColor: `${ghostColor}40` } : {}}
                            >
                                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                    item.isEventDate ? 'bg-tertiary/90' : 
                                    item.type === 'subtask' ? 'bg-secondary' : 
                                    item.type === 'ideal' ? '' : 'bg-primary'
                                }`} 
                                style={item.type === 'ideal' ? { backgroundColor: ghostColor } : {}}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`font-black text-sm block truncate uppercase tracking-tight ${item.isEventDate ? 'text-on-tertiary' : 'text-on-surface'}`}
                                              style={item.type === 'ideal' ? { color: ghostColor } : {}}
                                        >
                                            {item.type === 'subtask' ? item.subtaskTitle : item.title}
                                        </span>
                                        {item.type === 'ideal' && (
                                            <span className="flex items-center gap-1 text-[8px] font-black uppercase bg-surface/50 px-1.5 py-0.5 rounded border border-current opacity-60">
                                                <SparklesIcon className="w-2 h-2" /> Node
                                            </span>
                                        )}
                                    </div>
                                    {item.type === 'subtask' && <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block">Part of: {item.original?.title}</span>}
                                    {item.type === 'ideal' && <span className="text-[10px] text-on-surface-variant/60 uppercase tracking-widest block mt-0.5">Strategic Objective: {cat?.label}</span>}
                                </div>
                            </button>
                        );
                    })
                ) : <p className="text-sm text-on-surface-variant">No items scheduled for this day.</p>}
            </div>
        </div>
    );
});
DayView.displayName = 'DayView';

const CalendarPageView: React.FC = () => {
    const { allTasks, currentUser, syncWithGoogleCalendar, editTask, viewTask, selectProject, setActiveView, idealBlocks, updateUserProfile } = useAppContext();
    const { userProfile } = useAuth();
    const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
    const [activeTab, setActiveTab] = useState<'internal' | 'embedded'>('internal');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<string | null>(null);

    const showOverlay = !!userProfile?.showStrategicOverlay;

    useEffect(() => { const stored = localStorage.getItem('googleCalendarLastSync'); if(stored) setLastSync(new Date(parseInt(stored)).toLocaleString()); }, []);
    
    // Get user tasks: either assigned directly or containing subtasks assigned to the user
    const userTasks = useMemo(() => {
        if (!currentUser) return [];
        return allTasks.filter(task => {
            const isAssignedToTask = task.assigneeIds?.includes(currentUser.id);
            const hasAssignedSubtasks = task.subtasks?.some(st => st.assigneeIds?.includes(currentUser.id));
            return isAssignedToTask || hasAssignedSubtasks;
        });
    }, [allTasks, currentUser]);

    const calendarItems: CalendarItem[] = useMemo(() => {
        const items: CalendarItem[] = [];
        if (!currentUser) return items;

        userTasks.forEach(t => {
            // 1. Task Due Date
            if (t.dueDate && t.assigneeIds?.includes(currentUser.id)) {
                const d = new Date(t.dueDate);
                items.push({ 
                    id: t.id + '-due', 
                    title: t.title, 
                    date: new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), 
                    type: 'task', 
                    original: t, 
                    isEventDate: false 
                });
            }
            
            // 2. Task Event Date
            if (t.eventDate && t.assigneeIds?.includes(currentUser.id)) {
                const d = new Date(t.eventDate);
                items.push({ 
                    id: t.id + '-event', 
                    title: t.title, 
                    date: new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), 
                    type: 'task', 
                    original: t, 
                    isEventDate: true 
                });
            }

            // 3. Subtask Due Dates
            if (t.subtasks) {
                t.subtasks.forEach(st => {
                    if (st.dueDate && st.assigneeIds?.includes(currentUser.id)) {
                        const d = new Date(st.dueDate);
                        items.push({
                            id: st.id + '-sub-due',
                            title: st.title,
                            subtaskTitle: st.title,
                            date: new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
                            type: 'subtask',
                            original: t,
                            isEventDate: false
                        });
                    }
                });
            }
        });

        // 4. Ideal Week "Ghost" Overlay
        if (showOverlay) {
            const startOfView = new Date(currentDate);
            if (viewMode === 'month') {
                startOfView.setDate(1);
            } else if (viewMode === 'week') {
                startOfView.setDate(startOfView.getDate() - startOfView.getDay());
            }
            
            const daysToDraw = viewMode === 'month' ? 42 : 7;
            for (let i = 0; i < daysToDraw; i++) {
                const drawDate = new Date(startOfView);
                drawDate.setDate(drawDate.getDate() + i);
                const dayOfWeek = drawDate.getDay();
                
                idealBlocks.filter(b => b.dayOfWeek === dayOfWeek).forEach(block => {
                    items.push({
                        id: `ideal-${block.id}-${drawDate.getTime()}`,
                        title: block.title,
                        date: new Date(drawDate),
                        type: 'ideal',
                        idealBlock: block
                    });
                });
            }
        }

        return items;
    }, [userTasks, currentUser, idealBlocks, showOverlay, currentDate, viewMode]);

    const changeDate = (offset: number) => {
        const newDate = new Date(currentDate);
        if (viewMode === 'month') newDate.setMonth(currentDate.getMonth() + offset);
        else if (viewMode === 'week') newDate.setDate(currentDate.getDate() + (offset * 7));
        else if (viewMode === 'day') newDate.setDate(currentDate.getDate() + offset);
        setCurrentDate(newDate);
    };

    const handleRefresh = async () => {
        setIsSyncing(true);
        try {
            await syncWithGoogleCalendar();
            const newSyncTime = Date.now();
            localStorage.setItem('googleCalendarLastSync', newSyncTime.toString());
            setLastSync(new Date(newSyncTime).toLocaleString());
        } finally { setIsSyncing(false); }
    };
    
    const handleTaskClick = (task: Task) => {
        const projectId = (task as { projectId?: string }).projectId;
        if (projectId) selectProject(projectId, false);
        viewTask(task);
    };

    const headerText = useMemo(() => {
        if (viewMode === 'month') return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (viewMode === 'day') return currentDate.toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric' });
        
        const start = new Date(currentDate); 
        start.setDate(currentDate.getDate() - currentDate.getDay());
        const end = new Date(start); 
        end.setDate(start.getDate() + 6);
        const startMonth = start.toLocaleString('default', { month: 'short' });
        const endMonth = end.toLocaleString('default', { month: 'short' });

        if (startMonth === endMonth) {
            return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${end.getFullYear()}`;
        } else if (start.getFullYear() === end.getFullYear()) {
            return `${start.toLocaleString('default', { month: 'short', day: 'numeric' })} - ${end.toLocaleString('default', { month: 'short', day: 'numeric' })}, ${end.getFullYear()}`;
        } else {
            return `${start.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })} - ${end.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
    }, [currentDate, viewMode]);


    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-on-surface">Calendar</h1>
                    <p className="text-on-surface-variant mt-1">View your assigned tasks and individual job steps.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => updateUserProfile({ showStrategicOverlay: !showOverlay })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border
                            ${showOverlay ? 'bg-secondary text-on-secondary border-secondary' : 'bg-surface-variant/30 text-on-surface-variant border-outline/10 hover:bg-surface-variant/50'}
                        `}
                    >
                        <ShieldCheckIcon className="w-4 h-4" /> Strategic Ghost
                    </button>
                    <button onClick={() => editTask('new', { dueDate: currentDate })} className="flex items-center gap-2 px-6 py-2 text-xs font-black uppercase tracking-widest text-on-primary bg-primary rounded-full hover:bg-primary/90 shadow-m3-md shadow-primary/20 transition-all"><PlusIcon className="h-4 w-4" />New Job</button>
                </div>
            </div>
            <div className="bg-surface p-4 rounded-2xl shadow-m3-sm border border-outline/30 flex flex-col flex-1">
                <div className="flex flex-col sm:flex-row justify-between items-center p-2 mb-4 gap-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => changeDate(-1)} className="p-2 rounded-full hover:bg-on-surface/5" aria-label="Previous period"><ChevronLeftIcon className="h-5 w-5"/></button>
                        <h2 className="text-xl font-bold text-on-surface text-center w-60 sm:w-auto">{headerText}</h2>
                        <button onClick={() => changeDate(1)} className="p-2 rounded-full hover:bg-on-surface/5" aria-label="Next period"><ChevronRightIcon className="h-5 w-5"/></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-full border border-primary/20 hover:bg-primary/20">Today</button>
                    </div>
                     <div className="flex items-center gap-1 p-1 rounded-full bg-surface-variant border border-outline/50">
                        <button onClick={() => setActiveTab('internal')} className={`px-4 py-1.5 text-sm font-medium rounded-full ${activeTab === 'internal' ? 'bg-secondary/80 text-on-secondary shadow-sm' : 'hover:bg-on-surface/5'}`}>Internal</button>
                        <button onClick={() => setActiveTab('embedded')} className={`px-4 py-1.5 text-sm font-medium rounded-full ${activeTab === 'embedded' ? 'bg-secondary/80 text-on-secondary shadow-sm' : 'hover:bg-on-surface/5'}`}>External</button>
                    </div>
                </div>

                {activeTab === 'internal' && (
                    <>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-2 pb-2">
                             <div className="flex items-center gap-1 p-1 rounded-full bg-surface-variant border border-outline/50">
                                <button onClick={() => setViewMode('month')} className={`px-4 py-1.5 text-sm font-medium rounded-full ${viewMode === 'month' ? 'bg-primary/20 text-primary shadow-sm' : 'hover:bg-on-surface/5'}`}>Month</button>
                                <button onClick={() => setViewMode('week')} className={`px-4 py-1.5 text-sm font-medium rounded-full ${viewMode === 'week' ? 'bg-primary/20 text-primary shadow-sm' : 'hover:bg-on-surface/5'}`}>Week</button>
                                <button onClick={() => setViewMode('day')} className={`px-4 py-1.5 text-sm font-medium rounded-full ${viewMode === 'day' ? 'bg-primary/20 text-primary shadow-sm' : 'hover:bg-on-surface/5'}`}>Day</button>
                            </div>
                            <div className="flex items-center gap-2">
                                {lastSync && <p className="text-xs text-on-surface-variant">Last push to GCal: {lastSync}</p>}
                                <button onClick={handleRefresh} disabled={isSyncing} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-full border border-primary/20 hover:bg-primary/20 disabled:opacity-60"><RefreshCwIcon className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />{isSyncing ? 'Pushing...' : 'Push to GCal'}</button>
                            </div>
                        </div>
                        {viewMode === 'month' && <MonthView items={calendarItems} currentDate={currentDate} onDayClick={(date) => { setCurrentDate(date); setViewMode('day'); }} onTaskClick={handleTaskClick} />}
                        {viewMode === 'week' && <WeekView items={calendarItems} currentDate={currentDate} onTaskClick={handleTaskClick} />}
                        {viewMode === 'day' && <DayView items={calendarItems} currentDate={currentDate} onTaskClick={handleTaskClick} />}
                    </>
                )}
                {activeTab === 'embedded' && (
                    <div className="flex-1 overflow-hidden">
                        {userProfile?.calendarEmbedUrl ? (
                            <iframe src={userProfile.calendarEmbedUrl} className="w-full h-full border-0 rounded-lg" title="Embedded Calendar"></iframe>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <CalendarDaysIcon className="h-16 w-16 text-primary/30 mb-4" />
                                <h3 className="text-xl font-semibold text-on-surface">No External Calendar Configured</h3>
                                <p className="text-on-surface-variant mt-2 max-w-md">To view your Google or Outlook calendar here, please add the embeddable URL in the settings.</p>
                                <button onClick={() => setActiveView('integrations')} className="mt-4 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 rounded-full hover:bg-primary/20 border border-primary/20">Go to Integrations</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CalendarPageView;