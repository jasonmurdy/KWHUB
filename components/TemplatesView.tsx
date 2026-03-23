
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { 
    PlusIcon, 
    ClipboardListIcon, 
    EditIcon, 
    TrashIcon, 
    LinkIcon, 
    ListTodoIcon, 
    FolderKanbanIcon, 
    SearchIcon,
    BriefcaseIcon,
    DocumentIcon
} from './icons';
import type { Template } from '../types';
import { DocumentImportModal } from './DocumentImportModal';

const TemplateRow: React.FC<{ template: Template }> = ({ template }) => {
    const { currentUser, deleteTemplate, openTemplateModal, openApplyTemplateModal, teams } = useAppContext();
    
    const isCreator = currentUser?.id === template.creatorId;
    const team = template.teamId ? teams.find(t => t.id === template.teamId) : null;
    const isTeamMember = !!team;
    
    // Permission: Creator or any member of the team it belongs to can edit
    const canEdit = isCreator || isTeamMember;

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Are you sure you want to delete the template "${template.name}"? This cannot be undone.`)) {
            deleteTemplate(template.id);
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        openTemplateModal(template);
    };
    
    const handleApply = (e: React.MouseEvent) => {
        e.stopPropagation();
        openApplyTemplateModal(template);
    };

    return (
        <div className="group grid grid-cols-12 items-center gap-4 px-6 py-4 bg-surface border-b border-outline/10 hover:bg-primary/5 transition-all cursor-default">
            {/* Strategy Info */}
            <div className="col-span-5 flex items-center gap-4 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${template.teamId ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                    {template.teamId ? <FolderKanbanIcon className="w-5 h-5" /> : <ClipboardListIcon className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                    <h3 className="font-black text-on-surface truncate text-sm tracking-tight uppercase group-hover:text-primary transition-colors">
                        {template.name || 'Untitled Strategy'}
                    </h3>
                    <p className="text-[11px] text-on-surface-variant line-clamp-1 opacity-50 font-medium">
                        {template.description || "No strategy overview provided."}
                    </p>
                </div>
            </div>

            {/* Category Tags */}
            <div className="col-span-2 flex flex-wrap gap-1.5">
                {template.isShared && (
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border border-primary/20">
                        Public
                    </span>
                )}
                {template.teamId ? (
                    <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border border-secondary/20">
                        Team
                    </span>
                ) : (
                    <span className="bg-surface-variant/50 text-on-surface-variant px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border border-outline/20">
                        Personal
                    </span>
                )}
            </div>

            {/* Composition Stats */}
            <div className="col-span-2 flex items-center gap-4 text-[10px] font-black text-on-surface-variant/60 uppercase tracking-wider">
                <span className="flex items-center gap-1.5" title="Checkpoints">
                    <ListTodoIcon className="h-3.5 w-3.5 opacity-40"/> {(template.tasks || []).length}
                </span>
                <span className="flex items-center gap-1.5" title="Resources">
                    <LinkIcon className="h-3.5 w-3.5 opacity-40"/> {(template.links || []).length}
                </span>
            </div>

            {/* Origin */}
            <div className="col-span-1 text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest truncate">
                {isCreator ? 'You' : template.creatorName || 'Member'}
            </div>

            {/* Commands */}
            <div className="col-span-2 flex items-center justify-end gap-2">
                <button 
                    onClick={handleApply}
                    className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-on-primary bg-primary rounded-lg hover:bg-primary/90 transition-all shadow-sm active:scale-95"
                >
                    Apply
                </button>
                {canEdit && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={handleEdit} className="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Edit">
                            <EditIcon className="h-4 w-4" />
                        </button>
                        <button onClick={handleDelete} className="p-2 text-on-surface-variant hover:text-danger transition-colors" title="Delete">
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const TemplatesView: React.FC = () => {
    const { templates, openTemplateModal, saveTemplate } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'team' | 'personal'>('all');
    const [showImportModal, setShowImportModal] = useState(false);

    const filteredTemplates = useMemo(() => {
        return (templates || []).filter(t => {
            const nameMatch = (t.name || "").toLowerCase().includes(searchQuery.toLowerCase());
            const descMatch = (t.description || "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSearch = nameMatch || descMatch;
            const matchesFilter = filter === 'all' ? true : 
                                 filter === 'team' ? !!t.teamId : !t.teamId;
            return matchesSearch && matchesFilter;
        });
    }, [templates, searchQuery, filter]);

    return (
        <div className="h-full flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-on-surface tracking-tighter uppercase">Strategy Vault</h1>
                    <p className="text-sm font-bold text-on-surface-variant uppercase tracking-[0.25em] opacity-40 mt-1">Architecture for Real Estate Excellence</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-[0.15em] text-on-surface-variant bg-surface-variant/30 border border-outline/10 rounded-2xl hover:bg-surface-variant/50 transition-all active:scale-95"
                    >
                        <DocumentIcon className="h-5 w-5" />
                        Import
                    </button>
                    <button 
                        onClick={() => openTemplateModal('new')}
                        className="flex items-center gap-3 px-8 py-4 text-xs font-black uppercase tracking-[0.2em] text-on-primary bg-primary rounded-2xl hover:bg-primary/90 transition-all shadow-m3-md shadow-primary/20 active:scale-95"
                    >
                        <PlusIcon className="h-5 w-5" />
                        Create Strategy
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant opacity-30" />
                    <input 
                        type="text" 
                        placeholder="Search strategies, scripts, or checklists..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-surface border border-outline/30 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:opacity-40"
                    />
                </div>
                <div className="flex items-center gap-1 p-1.5 bg-surface-variant/30 rounded-2xl border border-outline/20">
                    <button 
                        onClick={() => setFilter('all')}
                        className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filter === 'all' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant opacity-60 hover:opacity-100'}`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setFilter('team')}
                        className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filter === 'team' ? 'bg-surface text-secondary shadow-sm' : 'text-on-surface-variant opacity-60 hover:opacity-100'}`}
                    >
                        <FolderKanbanIcon className="w-3 h-3" /> Team
                    </button>
                    <button 
                        onClick={() => setFilter('personal')}
                        className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${filter === 'personal' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant opacity-60 hover:opacity-100'}`}
                    >
                        <BriefcaseIcon className="w-3 h-3" /> Personal
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col bg-surface border border-outline/20 rounded-[2rem] shadow-m3-sm">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-outline/20 bg-surface-variant/10">
                    <div className="col-span-5 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-50">Strategy</div>
                    <div className="col-span-2 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-50">Category</div>
                    <div className="col-span-2 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-50">Composition</div>
                    <div className="col-span-1 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-50">Origin</div>
                    <div className="col-span-2 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-50 text-right">Command</div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredTemplates.length > 0 ? (
                        <div className="divide-y divide-outline/5">
                            {filteredTemplates.map(template => (
                                <TemplateRow key={template.id} template={template} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-20">
                            <div className="w-20 h-20 bg-surface-variant/30 rounded-[2rem] flex items-center justify-center mb-6">
                                <ClipboardListIcon className="h-10 w-10 text-primary opacity-20" />
                            </div>
                            <h2 className="text-xl font-black text-on-surface uppercase tracking-tight mb-2">
                                {searchQuery ? 'No results found' : 'Vault Empty'}
                            </h2>
                            <p className="text-xs text-on-surface-variant font-medium opacity-60 max-w-xs mx-auto mb-8">
                                {searchQuery ? `We couldn't find any strategies matching "${searchQuery}".` : 'Create standardized checklists for listings, buyer intake, or agent onboarding.'}
                            </p>
                            {!searchQuery && (
                                <button onClick={() => openTemplateModal('new')} className="text-primary font-black uppercase tracking-[0.3em] text-[10px] hover:underline decoration-2 underline-offset-8">
                                    Publish First Strategy
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showImportModal && (
                <DocumentImportModal
                    onClose={() => setShowImportModal(false)}
                    onSave={(template) => {
                        saveTemplate(template);
                    }}
                />
            )}
        </div>
    );
};

export default TemplatesView;
