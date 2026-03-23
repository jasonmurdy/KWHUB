
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Task } from '../types';
import { 
    UsersIcon, 
    MessageSquareIcon, 
    PlusIcon, 
    PhoneIcon,
    SearchIcon,
    BriefcaseIcon,
    DollarSignIcon,
    TagIcon,
    ClockIcon,
    ShareIcon
} from './icons';
import { motion, AnimatePresence } from 'framer-motion';

// Define the logical stages of a Lead Pipeline
const LEAD_STAGES = [
    { id: 'backlog', name: 'Inbound', color: '#EF4444', description: 'Immediate response required' },
    { id: 'todo', name: 'Attempting', color: '#F59E0B', description: 'Active follow-up' },
    { id: 'inprogress', name: 'Engaged', color: '#3B82F6', description: 'Qualified and talking' },
    { id: 'inreview', name: 'Appointment', color: '#8B5CF6', description: 'Met or Scheduled' },
    { id: 'done', name: 'Active', color: '#10B981', description: 'Converted to Client' }
];

const LeadCard: React.FC<{ lead: Task; onClick: () => void }> = ({ lead, onClick }) => {
    const ageInMinutes = Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / 60000);
    const ageInHours = ageInMinutes / 60;
    
    // Velocity Logic: Fresh < 1h, Warning < 24h, Stale > 24h
    const velocityColor = ageInHours < 1 ? 'text-success' : ageInHours < 24 ? 'text-warning' : 'text-danger';
    const isUrgent = ageInHours < 1 && (lead.status === 'backlog');
    
    const contact = lead.contacts?.[0];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
            onClick={onClick}
            className={`p-5 rounded-[2rem] border bg-surface transition-all cursor-pointer relative overflow-hidden group
                ${isUrgent ? 'border-danger/30 ring-2 ring-danger/10' : 'border-outline/10 hover:border-primary/30'}
            `}
        >
            <div className={`absolute top-0 left-0 w-1 h-full ${ageInHours < 1 ? 'bg-success' : ageInHours < 24 ? 'bg-warning' : 'bg-danger'}`} />

            <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded-lg bg-primary/5 text-primary text-[8px] font-black uppercase tracking-widest border border-primary/10">
                    {lead.tags?.[1] || 'Web Lead'}
                </span>
                {lead.jobValue ? (
                    <span className="text-[9px] font-black text-success uppercase tracking-widest ml-auto flex items-center gap-0.5">
                        <DollarSignIcon className="w-2.5 h-2.5" />
                        {lead.jobValue.toLocaleString()}
                    </span>
                ) : null}
            </div>

            <h4 className="font-black text-on-surface uppercase tracking-tight text-sm mb-1 truncate group-hover:text-primary transition-colors">
                {lead.title.split('(')[0].trim()}
            </h4>
            
            <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-medium text-on-surface-variant/60 truncate">
                    {contact?.role || (lead.taskType === 'Listing' ? 'Seller' : 'Buyer')}
                </p>
                <div className={`flex items-center gap-1 text-[8px] font-black uppercase ${velocityColor}`}>
                    <ClockIcon className="w-2.5 h-2.5" />
                    {ageInHours < 1 ? `${ageInMinutes}m ago` : `${Math.floor(ageInHours)}h ago`}
                </div>
            </div>

            <div className="flex items-center justify-between border-t border-outline/5 pt-4">
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); window.location.href = `tel:${contact?.phone || ''}`; }} className="p-2 bg-surface-variant/30 text-on-surface-variant hover:bg-success hover:text-white rounded-xl transition-all">
                        <PhoneIcon className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onClick(); }} className="p-2 bg-surface-variant/30 text-on-surface-variant hover:bg-primary hover:text-white rounded-xl transition-all">
                        <MessageSquareIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
                <div className="flex -space-x-1.5">
                    {(lead.assigneeIds || []).map(id => (
                        <div key={id} className="w-6 h-6 rounded-full border-2 border-surface bg-surface-variant overflow-hidden shadow-sm">
                            <UsersIcon className="w-full h-full p-1 opacity-20" />
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

const LeadPipelineView: React.FC = () => {
    const { allTasks, openCreateLeadModal, viewLead, projects, updateTask } = useAppContext();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'personal' | 'team'>('all');
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

    const filteredLeads = useMemo(() => {
        return allTasks.filter(t => {
            const isLead = t.taskType === 'Listing' || t.taskType === 'Consult' || t.tags?.includes('Lead');
            if (!isLead) return false;
            
            if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            
            const project = projects.find(p => p.id === t.projectId);
            if (ownershipFilter === 'personal' && project?.teamId) return false;
            if (ownershipFilter === 'team' && !project?.teamId) return false;
            
            return true;
        });
    }, [allTasks, searchQuery, ownershipFilter, projects]);

    const leadsByStage = useMemo(() => {
        const grouped: Record<string, Task[]> = {};
        LEAD_STAGES.forEach(stage => grouped[stage.id] = []);
        
        filteredLeads.forEach(lead => {
            const stage = LEAD_STAGES.find(s => s.id === lead.status) ? lead.status : 'backlog';
            grouped[stage].push(lead);
        });

        // Sort by creation date
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        });

        return grouped;
    }, [filteredLeads]);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedLeadId(id);
        e.dataTransfer.setData('text/plain', id);
    };

    const handleDrop = async (e: React.DragEvent, statusId: string) => {
        e.preventDefault();
        const id = draggedLeadId || e.dataTransfer.getData('text/plain');
        if (id) {
            await updateTask(id, { status: statusId });
        }
        setDraggedLeadId(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleExportLeads = () => {
        if (filteredLeads.length === 0) return;

        const headers = ['Name', 'Stage', 'Type', 'Projected GCI', 'Source', 'Email', 'Phone', 'Created At'];
        const rows = filteredLeads.map(lead => {
            const contact = lead.contacts?.[0];
            const stage = LEAD_STAGES.find(s => s.id === lead.status)?.name || 'Inbound';
            const source = lead.tags?.find(t => t !== 'Lead') || 'N/A';
            
            return [
                `"${lead.title.split('(')[0].trim().replace(/"/g, '""')}"`,
                `"${stage}"`,
                `"${lead.taskType || 'General'}"`,
                `"${lead.jobValue || 0}"`,
                `"${source}"`,
                `"${contact?.email || ''}"`,
                `"${contact?.phone || ''}"`,
                `"${new Date(lead.createdAt).toLocaleDateString()}"`
            ].join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="h-full flex flex-col gap-8 overflow-hidden">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1 shrink-0">
                <div>
                    <h1 className="text-5xl font-black text-on-surface tracking-tighter uppercase mb-1">Lead Command</h1>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Operational Pipeline</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative group flex-1 sm:min-w-[300px]">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-30" />
                        <input 
                            type="text" 
                            placeholder="Search names or sources..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-surface border border-outline/10 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all placeholder:opacity-40"
                        />
                    </div>
                    <div className="hidden sm:flex items-center gap-1 p-1 bg-surface-variant/30 rounded-2xl border border-outline/10">
                        <button onClick={() => setOwnershipFilter('all')} className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${ownershipFilter === 'all' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant opacity-60'}`}>All</button>
                        <button onClick={() => setOwnershipFilter('personal')} className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${ownershipFilter === 'personal' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant opacity-60'}`}><BriefcaseIcon className="w-3 h-3" /> Personal</button>
                        <button onClick={() => setOwnershipFilter('team')} className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${ownershipFilter === 'team' ? 'bg-surface text-secondary shadow-sm' : 'text-on-surface-variant opacity-60'}`}><UsersIcon className="w-3 h-3" /> Team</button>
                    </div>
                    
                    <button 
                        onClick={handleExportLeads}
                        className="p-3.5 bg-surface border border-outline/10 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-2xl transition-all shadow-sm"
                        title="Export Leads to CSV"
                    >
                        <ShareIcon className="w-5 h-5" />
                    </button>

                    <button 
                        onClick={openCreateLeadModal}
                        className="flex items-center gap-3 px-8 py-4 bg-primary text-on-primary rounded-[1.8rem] font-black text-sm uppercase tracking-widest shadow-m3-lg hover:scale-105 active:scale-95 transition-all"
                    >
                        <PlusIcon className="w-5 h-5" /> New Lead
                    </button>
                </div>
            </div>

            {/* Pipeline Board */}
            <div className="flex-1 flex gap-6 overflow-x-auto pb-10 custom-scrollbar px-1 min-h-0">
                {LEAD_STAGES.map((stage) => {
                    const stageLeads = leadsByStage[stage.id] || [];
                    const totalValue = stageLeads.reduce((sum, lead) => sum + (lead.jobValue || 0), 0);

                    return (
                        <div 
                            key={stage.id}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, stage.id)}
                            className="flex-shrink-0 w-80 flex flex-col"
                        >
                            {/* Column Header */}
                            <div className="mb-6 px-2">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                                        <h3 className="font-black text-sm uppercase tracking-[0.2em] text-on-surface">{stage.name}</h3>
                                    </div>
                                    <span className="text-[10px] font-black text-on-surface-variant/40 bg-surface-variant/20 px-2 py-0.5 rounded-lg border border-outline/5">
                                        {stageLeads.length}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">{stage.description}</p>
                                    {totalValue > 0 && (
                                        <p className="text-[10px] font-black text-success uppercase tracking-widest">${(totalValue / 1000).toFixed(1)}k Pipe GCI</p>
                                    )}
                                </div>
                            </div>

                            {/* Drop Zone / Leads List */}
                            <div className={`flex-1 bg-surface-variant/10 rounded-[2.5rem] border-2 border-dashed transition-all p-3 space-y-4 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable]
                                ${draggedLeadId ? 'border-primary/20 bg-primary/[0.02]' : 'border-transparent'}
                            `}>
                                <AnimatePresence mode="popLayout">
                                    {stageLeads.map(lead => (
                                        <div 
                                            key={lead.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead.id)}
                                            className={draggedLeadId === lead.id ? 'opacity-20' : ''}
                                        >
                                            <LeadCard lead={lead} onClick={() => viewLead(lead)} />
                                        </div>
                                    ))}
                                </AnimatePresence>

                                {stageLeads.length === 0 && !draggedLeadId && (
                                    <div className="py-20 flex flex-col items-center justify-center text-center opacity-10 grayscale">
                                        <TagIcon className="w-10 h-10 mb-2" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Empty Stage</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LeadPipelineView;
