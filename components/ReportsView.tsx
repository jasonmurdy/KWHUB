import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import OverviewCharts from './charts/OverviewCharts';
import MindMapView from './MindMapView';
import FlowchartView from './FlowchartView';
import WBSView from './WBSView';
import BurndownChartView from './BurndownChartView';
import { Task } from '../types';
import { BrainCircuitIcon, ClipboardCheckIcon, FlowchartIcon, HierarchyIcon } from './icons';

type ViewMode = 'overview' | 'mindmap' | 'flowchart' | 'wbs' | 'burndown';

const ReportsView: React.FC = () => {
  const { projects, allTasks, allUsers } = useAppContext();
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  const filteredTasks: Task[] = useMemo(() => {
    return allTasks.filter(task => {
        const projectMatch = selectedProjectId === 'all' || task.projectId === selectedProjectId;
        const userMatch = selectedUserId === 'all' || task.assigneeIds?.includes(selectedUserId);
        return projectMatch && userMatch;
    });
  }, [allTasks, selectedProjectId, selectedUserId]);
  
  const selectedProject = useMemo(() => {
    if (selectedProjectId === 'all') return null;
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold text-on-surface">Reports & Analytics</h1>
            <p className="text-on-surface-variant mt-1">Visualize project progress and team workload.</p>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-surface-variant/40 rounded-2xl border border-outline/30">
        <div className="flex items-center gap-1 p-1 rounded-full bg-surface-variant border border-outline/50">
          <button
            onClick={() => setViewMode('overview')}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${viewMode === 'overview' ? 'bg-secondary/80 text-on-secondary shadow-sm' : 'text-on-surface-variant hover:bg-on-surface/5'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setViewMode('mindmap')}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${viewMode === 'mindmap' ? 'bg-secondary/80 text-on-secondary shadow-sm' : 'text-on-surface-variant hover:bg-on-surface/5'}`}
            title="Mind Map"
          >
            <BrainCircuitIcon className="h-4 w-4" /> Mind Map
          </button>
          <button
            onClick={() => setViewMode('flowchart')}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${viewMode === 'flowchart' ? 'bg-secondary/80 text-on-secondary shadow-sm' : 'text-on-surface-variant hover:bg-on-surface/5'}`}
            title="Flowchart"
          >
            <FlowchartIcon className="h-4 w-4" /> Flowchart
          </button>
          <button
            onClick={() => setViewMode('wbs')}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${viewMode === 'wbs' ? 'bg-secondary/80 text-on-secondary shadow-sm' : 'text-on-surface-variant hover:bg-on-surface/5'}`}
            title="Work Breakdown Structure"
          >
            <HierarchyIcon className="h-4 w-4" /> WBS
          </button>
          <button
            onClick={() => setViewMode('burndown')}
            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${viewMode === 'burndown' ? 'bg-secondary/80 text-on-secondary shadow-sm' : 'text-on-surface-variant hover:bg-on-surface/5'}`}
            title="Burndown Chart"
          >
            <ClipboardCheckIcon className="h-4 w-4" /> Burndown
          </button>
        </div>

        <div className="flex items-center gap-2">
            <select 
                id="project-filter-reports"
                value={selectedProjectId} 
                onChange={e => setSelectedProjectId(e.target.value)} 
                className="w-full sm:w-auto bg-surface border border-outline/50 rounded-full p-2 text-sm text-on-surface focus:ring-primary focus:border-primary"
            >
                <option value="all">All Projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select 
                id="user-filter-reports"
                value={selectedUserId} 
                onChange={e => setSelectedUserId(e.target.value)} 
                className="w-full sm:w-auto bg-surface border border-outline/50 rounded-full p-2 text-sm text-on-surface focus:ring-primary focus:border-primary"
            >
                <option value="all">All Users</option>
                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {viewMode === 'overview' && <OverviewCharts tasks={filteredTasks} project={selectedProject} />}
        {viewMode === 'mindmap' && <MindMapView tasks={filteredTasks} project={selectedProject} />}
        {viewMode === 'flowchart' && <FlowchartView tasks={filteredTasks} project={selectedProject} />}
        {viewMode === 'wbs' && <WBSView tasks={filteredTasks} project={selectedProject} />}
        {viewMode === 'burndown' && <BurndownChartView tasks={filteredTasks} project={selectedProject} />}
      </div>
    </div>
  );
};

export default ReportsView;