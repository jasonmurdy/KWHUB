
import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Task, User } from '../types';
import { useAppContext } from '../contexts/AppContext';

interface GanttViewProps {
  tasks: Task[];
}

interface DependencyLine {
  id: string;
  path: string;
}

const ROW_HEIGHT = 40; // px
const BAR_HEIGHT = 24; // px
const BAR_MARGIN_TOP = (ROW_HEIGHT - BAR_HEIGHT) / 2;

const GanttView: React.FC<GanttViewProps> = ({ tasks }) => {
  const { allUsers } = useAppContext();
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const taskBarRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const [dependencyLines, setDependencyLines] = useState<DependencyLine[]>([]);

  // Use a user map for O(1) lookups during hydration
  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    allUsers.forEach(u => map.set(u.id, u));
    return map;
  }, [allUsers]);

  const hydratedTasks = useMemo(() => {
    if (!tasks || !Array.isArray(tasks)) return [];
    return tasks.map(task => {
        const assignees = (task.assigneeIds || [])
            .map(id => userMap.get(id))
            .filter((u): u is User => !!u);
        return { ...task, assignees };
    });
  }, [tasks, userMap]);

  const sortedTasks = useMemo(() => {
    return [...hydratedTasks].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime() || a.title.localeCompare(b.title));
  }, [hydratedTasks]);

  const { chartStartDate, chartEndDate, totalDays } = useMemo(() => {
    if (sortedTasks.length === 0) {
      const today = new Date();
      return { chartStartDate: new Date(today.getFullYear(), today.getMonth(), 1), chartEndDate: new Date(today.getFullYear(), today.getMonth() + 1, 0), totalDays: 30 };
    }
    const startDates = sortedTasks.map(t => new Date(t.startDate).getTime());
    const endDates = sortedTasks.map(t => new Date(t.dueDate).getTime());
    const minTime = Math.min(...startDates);
    const maxTime = Math.max(...endDates);
    const start = new Date(minTime); start.setDate(start.getDate() - 5);
    const end = new Date(maxTime); end.setDate(end.getDate() + 5);
    const days = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    return { chartStartDate: start, chartEndDate: end, totalDays: days };
  }, [sortedTasks]);

  const getTaskPosition = (task: Task) => {
    const offset = (new Date(task.startDate).getTime() - chartStartDate.getTime()) / (1000 * 3600 * 24);
    const duration = Math.max(1, (new Date(task.dueDate).getTime() - new Date(task.startDate).getTime()) / (1000 * 3600 * 24));
    return { left: `${(offset / totalDays) * 100}%`, width: `${(duration / totalDays) * 100}%` };
  };

  const monthHeaders = useMemo(() => {
    const headers: { name: string, date: Date }[] = [];
    const currentDate = new Date(chartStartDate);
    currentDate.setDate(1);

    while (currentDate <= chartEndDate) {
      const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!headers.find(h => h.name === monthName)) headers.push({ name: monthName, date: new Date(currentDate) });
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return headers.map((header, index) => {
      const start = new Date(Math.max(header.date.getTime(), chartStartDate.getTime()));
      const end = (index + 1 < headers.length) ? new Date(Math.min(headers[index + 1].date.getTime(), chartEndDate.getTime())) : chartEndDate;
      const duration = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
      return { name: header.name, width: `${(duration / totalDays) * 100}%` };
    });
  }, [chartStartDate, chartEndDate, totalDays]);

  const todayPosition = ((new Date().getTime() - chartStartDate.getTime()) / (1000 * 3600 * 24) / totalDays) * 100;
  const isTodayInView = todayPosition >= 0 && todayPosition <= 100;

  useEffect(() => {
    const calculateLines = () => {
      if (!timelineContainerRef.current) return;
      const newLines: DependencyLine[] = [];
      const containerRect = timelineContainerRef.current.getBoundingClientRect();

      sortedTasks.forEach(task => {
        if (!task.dependsOn) return;
        const dependentEl = taskBarRefs.current.get(task.id);
        if (!dependentEl) return;
        const dependentRect = dependentEl.getBoundingClientRect();

        task.dependsOn.forEach(prereqId => {
          const prereqEl = taskBarRefs.current.get(prereqId);
          if (!prereqEl) return;
          const prereqRect = prereqEl.getBoundingClientRect();
          const x1 = prereqRect.right - containerRect.left;
          const y1 = prereqRect.top + prereqRect.height / 2 - containerRect.top;
          const x2 = dependentRect.left - containerRect.left;
          const y2 = dependentRect.top + dependentRect.height / 2 - containerRect.top;
          newLines.push({ id: `${prereqId}-${task.id}`, path: `M ${x1} ${y1} L ${x1 + 15} ${y1} L ${x1 + 15} ${y2} L ${x2} ${y2}` });
        });
      });
      setDependencyLines(newLines);
    };

    const timer = setTimeout(calculateLines, 100);
    window.addEventListener('resize', calculateLines);
    return () => { clearTimeout(timer); window.removeEventListener('resize', calculateLines); };
  }, [sortedTasks, totalDays]);

  return (
    <div className="bg-surface rounded-xl p-4 overflow-x-auto text-sm border border-outline/30 shadow-m3-sm">
      <div className="grid" style={{ gridTemplateColumns: '250px 1fr', minWidth: '900px' }}>
        <div className="font-semibold text-on-surface-variant border-b border-r border-outline/30 p-2 sticky top-0 bg-surface z-10">Task Name</div>
        <div className="border-b border-outline/30 sticky top-0 bg-surface z-10"><div className="flex h-full">{monthHeaders.map((header, i) => (<div key={i} style={{ width: header.width }} className="font-semibold text-sm text-center text-on-surface-variant p-2 border-l border-outline/30">{header.name}</div>))}</div></div>
        <div className="col-start-1 row-start-2">{sortedTasks.map((task, index) => (<div key={task.id} style={{ height: `${ROW_HEIGHT}px` }} className={`p-2 border-r border-outline/30 truncate flex items-center ${index < sortedTasks.length - 1 ? 'border-b border-outline/30' : ''}`}>{task.title}</div>))}</div>
        <div ref={timelineContainerRef} className="col-start-2 row-start-2 relative">
          {isTodayInView && (<div className="absolute top-0 bottom-0 w-px bg-secondary/70 z-10" style={{ left: `${todayPosition}%` }} title={`Today: ${new Date().toLocaleDateString()}`}><div className="absolute -top-1.5 -translate-x-1/2 left-1/2 w-3 h-3 bg-secondary rounded-full border-2 border-surface"></div></div>)}
          {sortedTasks.map((task, index) => {
            const { left, width } = getTaskPosition(task);
            return (<div key={task.id} ref={el => { taskBarRefs.current.set(task.id, el); }} style={{ position: 'absolute', top: `${index * ROW_HEIGHT + BAR_MARGIN_TOP}px`, height: `${BAR_HEIGHT}px`, left, width }} className="bg-primary rounded flex items-center justify-between px-2 overflow-hidden group" title={`${task.title} (${new Date(task.startDate).toLocaleDateString()} - ${new Date(task.dueDate).toLocaleDateString()})`}><span className="text-xs font-medium text-on-primary truncate whitespace-nowrap">{task.title}</span><div className="flex -space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">{(task.assignees || []).map(u => <img key={u.id} src={u.avatarUrl} alt={u.name} className="w-4 h-4 rounded-full border border-primary/50" />)}</div></div>);
          })}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ height: `${sortedTasks.length * ROW_HEIGHT}px` }} overflow="visible"><defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,7 L10,3.5 z" fill="#888" /></marker></defs>{dependencyLines.map(line => (<path key={line.id} d={line.path} stroke="#888" strokeWidth="1.5" fill="none" markerEnd="url(#arrowhead)" />))}</svg>
        </div>
      </div>
    </div>
  );
};

export default GanttView;
