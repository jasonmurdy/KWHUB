import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Form } from '../types';
import { FormInputIcon, PlusIcon, TrashIcon, ShareIcon, CodeIcon, XIcon, ShieldCheckIcon, ListTodoIcon, FolderKanbanIcon, BriefcaseIcon, SearchIcon } from './icons';
import FormBuilder from './FormBuilder';
import FormResponsesModal from './FormResponsesModal';
import { useToast } from '../contexts/ToastContext';
import { motion } from 'framer-motion';

const QRModal: React.FC<{ url: string; title: string; onClose: () => void }> = ({ url, title, onClose }) => {
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(url)}&size=300&margin=2&ecLevel=H&centerImageUrl=https://cdn-icons-png.flaticon.com/512/3063/3063822.png`;

    const downloadQR = () => {
        const link = document.createElement('a');
        link.href = qrUrl;
        link.download = `${title.replace(/\s+/g, '_')}_QR.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-surface p-12 rounded-[4rem] shadow-2xl border border-outline/30 w-full max-w-sm text-center relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-8 right-8 p-3 hover:bg-surface-variant rounded-2xl transition-colors"><XIcon className="h-6 w-6" /></button>
                <h3 className="text-2xl font-black uppercase tracking-tight mb-8">Open House QR</h3>
                <div className="bg-white p-6 rounded-[2.5rem] shadow-inner mb-10 border border-outline/10 mx-auto w-fit">
                    <img src={qrUrl} alt="QR Code" className="w-56 h-56" />
                </div>
                <div className="space-y-4">
                    <button onClick={downloadQR} className="w-full py-5 bg-primary text-on-primary rounded-3xl font-black text-xs uppercase tracking-[0.25em] shadow-m3-md hover:bg-primary/90 transition-all active:scale-95">Download Code</button>
                    <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest px-4 leading-relaxed">Scan to access the intake engine immediately</p>
                </div>
            </motion.div>
        </div>
    );
};

const FormRow: React.FC<{ form: Form, onEdit: () => void, onDelete: () => void, onViewResponses: () => void }> = ({ form, onEdit, onDelete, onViewResponses }) => {
    const { addToast } = useToast();
    const { teams } = useAppContext();
    const [showQR, setShowQR] = useState(false);
    const publicUrl = `${window.location.origin}/#/forms/${form.id}`;

    const sharedTeam = form.teamId ? teams.find(t => t.id === form.teamId) : null;

    const handleShare = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(publicUrl);
        addToast({ type: 'success', title: 'Link Synchronized', message: 'Engine endpoint copied to clipboard.' });
    };

    return (
        <div className="group grid grid-cols-12 items-center gap-4 px-6 py-4 bg-surface border-b border-outline/10 hover:bg-primary/5 transition-all cursor-default" onClick={onEdit}>
            {/* Form Info */}
            <div className="col-span-5 flex items-center gap-4 min-w-0">
                <div className="p-3 bg-surface-variant rounded-xl text-primary border border-outline/10 shadow-sm shrink-0">
                    <FormInputIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <h3 className="font-black text-on-surface truncate text-sm tracking-tight uppercase group-hover:text-primary transition-colors">
                        {form.title}
                    </h3>
                    <p className="text-[11px] text-on-surface-variant line-clamp-1 opacity-50 font-medium">
                        {form.description || 'Intake engine ready for deployment.'}
                    </p>
                </div>
            </div>

            {/* Category Tags */}
            <div className="col-span-2 flex flex-wrap gap-1.5">
                {sharedTeam ? (
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-secondary/10 text-secondary text-[8px] font-black uppercase tracking-widest border border-secondary/20">
                        <ShieldCheckIcon className="w-2.5 h-2.5" /> {sharedTeam.name}
                    </span>
                ) : (
                    <span className="bg-surface-variant/50 text-on-surface-variant px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border border-outline/20">
                        Personal
                    </span>
                )}
            </div>

            {/* Composition Stats */}
            <div className="col-span-2 flex items-center gap-4 text-[10px] font-black text-on-surface-variant/60 uppercase tracking-wider">
                <span className="flex items-center gap-1.5" title="Logic Nodes">
                    <ListTodoIcon className="h-3.5 w-3.5 opacity-40"/> {form.fields.length}
                </span>
                <span className="flex items-center gap-1.5" title="Version">
                    <FolderKanbanIcon className="h-3.5 w-3.5 opacity-40"/> v{form.version}.0
                </span>
            </div>

            {/* Origin/Responses */}
            <div className="col-span-1 text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest truncate">
                {form.responseCount} Syncs
            </div>

            {/* Commands */}
            <div className="col-span-2 flex items-center justify-end gap-2">
                <button 
                    onClick={(e) => { e.stopPropagation(); onViewResponses(); }}
                    className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-on-primary bg-primary rounded-lg hover:bg-primary/90 transition-all shadow-sm active:scale-95"
                >
                    Responses
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setShowQR(true); }} className="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Generate Signage QR">
                        <CodeIcon className="h-4 w-4" />
                    </button>
                    <button onClick={handleShare} className="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Copy Endpoint Link">
                        <ShareIcon className="h-4 w-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-on-surface-variant hover:text-danger transition-colors" title="Decommission Engine">
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {showQR && <QRModal url={publicUrl} title={form.title} onClose={() => setShowQR(false)} />}
        </div>
    );
};

const FormsView: React.FC = () => {
    const { forms, currentUser, createForm, updateForm, deleteForm } = useAppContext();
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [editingForm, setEditingForm] = useState<Form | undefined>(undefined);
    const [viewingResponsesFor, setViewingResponsesFor] = useState<Form | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'team' | 'personal'>('all');

    const filteredForms = React.useMemo(() => {
        return (forms || []).filter(f => {
            const nameMatch = (f.title || "").toLowerCase().includes(searchQuery.toLowerCase());
            const descMatch = (f.description || "").toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSearch = nameMatch || descMatch;
            const matchesFilter = filter === 'all' ? true : 
                                 filter === 'team' ? !!f.teamId : !f.teamId;
            return matchesSearch && matchesFilter;
        });
    }, [forms, searchQuery, filter]);

    const handleCreate = () => {
        setEditingForm(undefined);
        setIsBuilderOpen(true);
    };

    const handleEdit = (form: Form) => {
        setEditingForm(form);
        setIsBuilderOpen(true);
    };

    if (!currentUser) return null;

    return (
        <div className="h-full flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-on-surface tracking-tighter uppercase">Intake Engines</h1>
                    <p className="text-sm font-bold text-on-surface-variant uppercase tracking-[0.25em] opacity-40 mt-1">Automated Data Orchestration & Collaboration</p>
                </div>
                <button 
                    onClick={handleCreate}
                    className="flex items-center gap-3 px-8 py-4 bg-primary text-on-primary rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-m3-lg hover:scale-105 active:scale-95 transition-all"
                >
                    <PlusIcon className="h-5 w-5" /> Initialize New Engine
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant opacity-30" />
                    <input 
                        type="text" 
                        placeholder="Search engines..." 
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
                    <div className="col-span-5 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-50">Engine</div>
                    <div className="col-span-2 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-50">Category</div>
                    <div className="col-span-2 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-50">Composition</div>
                    <div className="col-span-1 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-50">Syncs</div>
                    <div className="col-span-2 text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-50 text-right">Command</div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredForms.length > 0 ? (
                        <div className="divide-y divide-outline/5">
                            {filteredForms.map(form => (
                                <FormRow 
                                    key={form.id} 
                                    form={form} 
                                    onEdit={() => handleEdit(form)} 
                                    onDelete={() => deleteForm(form.id)}
                                    onViewResponses={() => setViewingResponsesFor(form)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-20">
                            <div className="w-20 h-20 bg-surface-variant/30 rounded-[2rem] flex items-center justify-center mb-6">
                                <FormInputIcon className="h-10 w-10 text-primary opacity-20" />
                            </div>
                            <h2 className="text-xl font-black text-on-surface uppercase tracking-tight mb-2">
                                {searchQuery ? 'No results found' : 'No Active Engines'}
                            </h2>
                            <p className="text-xs text-on-surface-variant font-medium opacity-60 max-w-xs mx-auto mb-8">
                                {searchQuery ? `We couldn't find any engines matching "${searchQuery}".` : 'Build automated sign-in sheets, buyer intake forms, or showing feedback loops to scale your operations.'}
                            </p>
                            {!searchQuery && (
                                <button onClick={handleCreate} className="text-primary font-black uppercase tracking-[0.3em] text-[10px] hover:underline decoration-2 underline-offset-8">
                                    Launch Your First Engine
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {isBuilderOpen && (
                <FormBuilder 
                    initialForm={editingForm}
                    creatorId={currentUser.id}
                    onSave={createForm}
                    onUpdate={updateForm}
                    onClose={() => setIsBuilderOpen(false)}
                />
            )}

            {viewingResponsesFor && (
                <FormResponsesModal 
                    form={viewingResponsesFor} 
                    onClose={() => setViewingResponsesFor(null)} 
                />
            )}
        </div>
    );
};

export default FormsView;