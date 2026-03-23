
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ChevronLeftIcon, ChevronRightIcon, CalendarClockIcon } from './icons';
import { AvailabilityBlock, User } from '../types';
import { Avatar } from './Avatar';

const BLOCK_TYPE_COLORS: Record<AvailabilityBlock['type'], string> = {
    'OOO': 'bg-orange-500/70',
    'Focus Time': 'bg-purple-500/70',
    'Meeting': 'bg-blue-500/70',
};

const TeamAvailabilityView: React.FC = () => {
    const { selectedTeam, availabilityBlocks, openSetAvailabilityModal, allUsers } = useAppContext();
    const [currentDate, setCurrentDate] = useState(new Date());

    const { weekDates, startOfWeek, endOfWeek } = useMemo(() => {
        const start = new Date(currentDate);
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
        
        const dates = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
        const end = new Date(dates[6]);
        end.setHours(23, 59, 59, 999);
        return { weekDates: dates, startOfWeek: start, endOfWeek: end };
    }, [currentDate]);

    const changeWeek = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setDate(prev.getDate() + offset * 7);
            return newDate;
        });
    };

    const timeToPercentage = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes;
        return (totalMinutes / (24 * 60)) * 100;
    };
    
    const dateTimeToPercentage = (date: Date) => {
        const totalMinutes = date.getHours() * 60 + date.getMinutes();
        return (totalMinutes / (24 * 60)) * 100;
    };

    const teamMembers = useMemo(() => {
        if (!selectedTeam || !allUsers) return [];
        return (selectedTeam.memberIds || []).map(id => allUsers.find(u => u.id === id)).filter((u): u is User => !!u);
    }, [selectedTeam, allUsers]);

    if (!selectedTeam) return null;

    return (
        <div className="bg-surface p-6 rounded-2xl shadow-md border border-outline/40 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <button onClick={() => changeWeek(-1)} className="p-2 rounded-full hover:bg-on-surface/10" aria-label="Previous week"><ChevronLeftIcon className="h-5 w-5"/></button>
                    <h2 className="text-xl font-bold text-on-surface">{startOfWeek.toLocaleDateString([], {month: 'long', day: 'numeric'})} - {endOfWeek.toLocaleDateString([], {month: 'long', day: 'numeric'})}</h2>
                    <button onClick={() => changeWeek(1)} className="p-2 rounded-full hover:bg-on-surface/10" aria-label="Next week"><ChevronRightIcon className="h-5 w-5"/></button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 rounded-full border border-primary/30 hover:bg-primary/20">Today</button>
                </div>
                <button onClick={openSetAvailabilityModal} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-on-primary bg-primary rounded-full hover:bg-primary/90 shadow-sm">
                    <CalendarClockIcon className="h-4 w-4"/> Set My Availability
                </button>
            </div>
            <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-[150px_repeat(7,1fr)] min-w-[1200px]">
                    {/* Header Row */}
                    <div className="sticky top-0 bg-surface z-10 p-2 border-b border-outline/40"></div>
                    {weekDates.map(date => {
                        const isToday = date.toDateString() === new Date().toDateString();
                        return (
                            <div key={date.toISOString()} className={`sticky top-0 bg-surface z-10 text-center p-2 border-b border-l border-outline/40 ${isToday ? 'bg-primary/10' : ''}`}>
                                <p className="text-xs font-semibold uppercase text-on-surface-variant">{date.toLocaleDateString([], { weekday: 'short' })}</p>
                                <p className={`text-2xl font-bold ${isToday ? 'text-primary' : 'text-on-surface'}`}>{date.getDate()}</p>
                            </div>
                        );
                    })}
                    
                    {/* Member Rows */}
                    {teamMembers.map((member, index) => {
                        const memberBlocks = availabilityBlocks.filter(b => b.userId === member.id);

                        return (
                            <React.Fragment key={member.id}>
                                <div className={`p-2 border-l-4 flex items-center gap-2 sticky left-0 bg-surface ${index < teamMembers.length - 1 ? 'border-b border-outline/40' : ''}`} style={{ borderColor: 'rgb(var(--color-primary))' }}>
                                    <Avatar src={member.avatarUrl} alt={member.name} className="w-8 h-8 rounded-full" />
                                    <span className="font-semibold text-sm truncate">{member.name}</span>
                                </div>
                                {weekDates.map(date => {
                                    const dayOfWeek = date.getDay();
                                    // Use optional chaining for days array access
                                    const isWorkingDay = member.workingHours?.days?.includes(dayOfWeek);

                                    const blocksForDay = memberBlocks.filter(b => {
                                        const blockStart = new Date(b.startTime);
                                        blockStart.setHours(0,0,0,0);
                                        const blockEnd = new Date(b.endTime);
                                        blockEnd.setHours(23,59,59,999);
                                        return date >= blockStart && date <= blockEnd;
                                    });

                                    return (
                                        <div key={date.toISOString()} className={`relative h-20 p-1 border-l border-outline/40 ${index < teamMembers.length - 1 ? 'border-b border-outline/40' : ''}`}>
                                            {isWorkingDay && member.workingHours && (
                                                <div 
                                                  className="absolute h-full bg-surface-variant/50 rounded"
                                                  style={{ 
                                                      left: `${timeToPercentage(member.workingHours.start)}%`,
                                                      right: `${100 - timeToPercentage(member.workingHours.end)}%`
                                                  }}
                                                />
                                            )}
                                            {blocksForDay.map(block => {
                                                const start = new Date(block.startTime);
                                                const end = new Date(block.endTime);
                                                
                                                const startPercent = start.toDateString() === date.toDateString() ? dateTimeToPercentage(start) : 0;
                                                const endPercent = end.toDateString() === date.toDateString() ? dateTimeToPercentage(end) : 100;

                                                return (
                                                    <div 
                                                        key={block.id} 
                                                        title={`${block.title} (${start.toLocaleTimeString()} - ${end.toLocaleTimeString()})`}
                                                        className={`absolute h-full ${BLOCK_TYPE_COLORS[block.type]} rounded opacity-80`}
                                                        style={{ left: `${startPercent}%`, right: `${100 - endPercent}%` }}
                                                    >
                                                        <span className="text-white text-[10px] font-bold absolute top-1 left-1 truncate pr-1">{block.title}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TeamAvailabilityView;
