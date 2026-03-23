import React, { useState, useEffect, useRef } from 'react';
import { Form, FormField, FormFieldType, FormStyle } from '../types';
import { XIcon, PlusIcon, TypeIcon, CalendarDaysIcon, CheckCircle2, ListTodoIcon, TrashIcon, ChevronDownIcon, GripVerticalIcon, PaletteIcon, CodeIcon, SettingsIcon, FolderKanbanIcon, HierarchyIcon, UsersIcon, SparklesIcon, UploadCloudIcon, MailIcon, ActivityIcon, ShieldCheckIcon } from './icons';
import { motion, Reorder, AnimatePresence, useDragControls } from 'framer-motion';
import { Modal } from './Modal';
import { useAppContext } from '../contexts/AppContext';

interface FormBuilderProps {
    initialForm?: Form;
    onSave: (form: Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'responseCount'>) => Promise<void>;
    onUpdate: (id: string, updates: Partial<Form>) => Promise<void>;
    onClose: () => void;
    creatorId: string;
}

const FIELD_TYPES: { type: FormFieldType; label: string; icon: React.ReactNode }[] = [
    { type: 'text', label: 'Short Text', icon: <TypeIcon className="h-4 w-4" /> },
    { type: 'textarea', label: 'Long Text', icon: <ListTodoIcon className="h-4 w-4" /> },
    { type: 'number', label: 'Number', icon: <span className="font-bold font-mono text-xs">123</span> },
    { type: 'email', label: 'Email', icon: <span className="font-bold text-xs">@</span> },
    { type: 'date', label: 'Date', icon: <CalendarDaysIcon className="h-4 w-4" /> },
    { type: 'select', label: 'Dropdown', icon: <ChevronDownIcon className="h-4 w-4" /> },
    { type: 'checkbox', label: 'Checkbox', icon: <CheckCircle2 className="h-4 w-4" /> },
    { type: 'file', label: 'File Upload', icon: <UploadCloudIcon className="h-4 w-4" /> },
];

const DEFAULT_STYLE: FormStyle = {
    primaryColor: '#8b5cf6',
    backgroundColor: '#ffffff',
    textColor: '#1c2024',
    fontFamily: 'Inter',
    borderRadius: '16px'
};

interface SortableFieldProps {
    field: FormField;
    isActive: boolean;
    onActivate: () => void;
    onUpdate: (id: string, updates: Partial<FormField>) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
}

const SortableField: React.FC<SortableFieldProps> = ({ field, isActive, onActivate, onUpdate, onDelete }) => {
    const dragControls = useDragControls();

    return (
        <motion.div
            layout
            onClick={onActivate}
            className={`bg-surface rounded-[2rem] border p-8 shadow-sm cursor-pointer transition-all relative group
                ${isActive ? 'border-primary ring-4 ring-primary/10 shadow-m3-md' : 'border-outline/20 hover:border-outline/40 hover:shadow-md'}
            `}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-start gap-6">
                <div 
                    className="mt-1 cursor-grab active:cursor-grabbing text-on-surface-variant/20 group-hover:text-primary transition-colors touch-none"
                    onPointerDown={(e) => dragControls.start(e)}
                >
                    <GripVerticalIcon className="h-6 w-6" />
                </div>

                <div className="flex-1 space-y-4">
                    {isActive ? (
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={field.label}
                                onChange={e => onUpdate(field.id, { label: e.target.value })}
                                className="w-full text-lg font-bold text-on-surface bg-surface-variant/30 border-b-2 border-primary focus:outline-none px-4 py-2 rounded-t-xl"
                                autoFocus
                                placeholder="Enter question here"
                            />
                            
                            {field.type === 'select' && (
                                <div className="bg-surface-variant/20 p-4 rounded-2xl border border-outline/10 space-y-2">
                                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Options</p>
                                    {(field.options || []).map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-outline/50" />
                                            <input 
                                                type="text" 
                                                value={opt} 
                                                onChange={e => {
                                                    const newOpts = [...(field.options || [])];
                                                    newOpts[i] = e.target.value;
                                                    onUpdate(field.id, { options: newOpts });
                                                }}
                                                className="flex-1 bg-transparent text-sm font-bold text-on-surface border-b border-outline/30 focus:border-primary outline-none"
                                            />
                                            <button onClick={() => onUpdate(field.id, { options: (field.options || []).filter((_, idx) => idx !== i) })} className="text-danger opacity-50 hover:opacity-100"><XIcon className="h-3 w-3"/></button>
                                        </div>
                                    ))}
                                    <button 
                                        onClick={() => onUpdate(field.id, { options: [...(field.options || []), `Option ${(field.options?.length || 0) + 1}`] })}
                                        className="text-xs font-bold text-primary flex items-center gap-1 mt-2 hover:underline"
                                    >
                                        <PlusIcon className="h-3 w-3" /> Add Option
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <label className="block text-lg font-bold text-on-surface">
                            {field.label} {field.required && <span className="text-danger">*</span>}
                        </label>
                    )}

                    <div className="pointer-events-none opacity-60">
                        {field.type === 'text' && <div className="w-full border-b-2 border-outline/20 py-2 text-sm text-on-surface-variant/50 font-medium">Short answer text</div>}
                        {field.type === 'textarea' && <div className="w-full border-b-2 border-outline/20 py-8 text-sm text-on-surface-variant/50 font-medium">Long answer text</div>}
                        {field.type === 'number' && <div className="w-24 border-b-2 border-outline/20 py-2 text-sm text-on-surface-variant/50 font-medium">0.00</div>}
                        {field.type === 'email' && <div className="w-full border-b-2 border-outline/20 py-2 text-sm text-on-surface-variant/50 font-medium">email@example.com</div>}
                        {field.type === 'date' && <div className="flex items-center gap-3 text-on-surface-variant/50 border-b-2 border-outline/20 py-2 w-fit"><CalendarDaysIcon className="h-5 w-5" /> <span className="text-sm font-medium">Month, day, year</span></div>}
                        {field.type === 'file' && <div className="flex items-center gap-3 text-on-surface-variant/50 border-2 border-dashed border-outline/20 rounded-xl p-6 w-full"><UploadCloudIcon className="h-5 w-5" /> <span className="text-sm font-medium">ID, Document, or Photo Upload</span></div>}
                        {field.type === 'select' && (
                            <div className="flex items-center justify-between w-full border-2 border-outline/10 rounded-xl px-4 py-3 bg-surface-variant/10">
                                <span className="text-sm font-bold">Select option...</span>
                                <ChevronDownIcon className="h-5 w-5" />
                            </div>
                        )}
                        {field.type === 'checkbox' && <div className="flex items-center gap-3"><div className="w-6 h-6 rounded-lg border-2 border-outline/30" /><span className="text-sm font-bold">Check here</span></div>}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isActive && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-8 pt-6 border-t border-outline/10 flex items-center justify-between overflow-hidden"
                    >
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-3 text-xs font-black text-on-surface-variant uppercase tracking-widest cursor-pointer group">
                                <div className={`w-10 h-6 rounded-full transition-colors relative ${field.required ? 'bg-primary' : 'bg-outline/20'}`}>
                                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${field.required ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={field.required} 
                                    onChange={e => onUpdate(field.id, { required: e.target.checked })}
                                    className="sr-only"
                                />
                                Required Field
                            </label>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={(e) => onDelete(e, field.id)}
                                className="flex items-center gap-2 px-4 py-2 text-xs font-black text-danger uppercase tracking-widest hover:bg-danger/10 rounded-xl transition-all"
                            >
                                <TrashIcon className="h-4 w-4" /> Remove
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const FormBuilder: React.FC<FormBuilderProps> = ({ initialForm, onSave, onUpdate, onClose, creatorId }) => {
    const { projects, templates, allUsers, teams } = useAppContext();
    const [title, setTitle] = useState(initialForm?.title || 'Untitled Form');
    const [description, setDescription] = useState(initialForm?.description || '');
    const [fields, setFields] = useState<FormField[]>(initialForm?.fields || []);
    const [style, setStyle] = useState<FormStyle>(initialForm?.style || DEFAULT_STYLE);
    const [projectId, setProjectId] = useState<string>(initialForm?.projectId || '');
    const [formTeamId, setFormTeamId] = useState<string>(initialForm?.teamId || '');
    const [isTeamShared, setIsTeamShared] = useState(!!initialForm?.teamId);
    
    const [targetStatus, setTargetStatus] = useState<string>(initialForm?.taskDefaults?.status || '');
    const [autoAssigneeId, setAutoAssigneeId] = useState<string>(initialForm?.taskDefaults?.autoAssigneeId || '');
    const [autoApplyTemplateId, setAutoApplyTemplateId] = useState<string>(initialForm?.taskDefaults?.autoApplyTemplateId || '');
    const [isLeadForm, setIsLeadForm] = useState(initialForm?.isLeadForm || false);
    const [isConversational, setIsConversational] = useState(initialForm?.isConversational || false);
    const [leadType, setLeadType] = useState<'Listing' | 'Consult'>(initialForm?.leadType || 'Listing');
    const [webhookUrl, setWebhookUrl] = useState(initialForm?.webhookUrl || '');
    
    const [isAutomationEnabled, setIsAutomationEnabled] = useState(initialForm?.automation?.enabled || false);
    const [leadMagnetUrl, setLeadMagnetUrl] = useState(initialForm?.automation?.leadMagnetUrl || '');
    const [successMessage, setSuccessMessage] = useState(initialForm?.automation?.successMessage || '');

    const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'build' | 'design' | 'settings'>('build');
    const [showEmbedModal, setShowEmbedModal] = useState(false);

    const initialLoadRef = useRef(false);
    useEffect(() => {
        if (!initialLoadRef.current && initialForm) {
            setTitle(initialForm.title);
            setDescription(initialForm.description);
            setFields(initialForm.fields || []);
            setStyle(initialForm.style || DEFAULT_STYLE);
            setProjectId(initialForm.projectId || '');
            setFormTeamId(initialForm.teamId || '');
            setIsTeamShared(!!initialForm.teamId);
            setTargetStatus(initialForm.taskDefaults?.status || '');
            setAutoAssigneeId(initialForm.taskDefaults?.autoAssigneeId || '');
            setAutoApplyTemplateId(initialForm.taskDefaults?.autoApplyTemplateId || '');
            setIsLeadForm(!!initialForm.isLeadForm);
            setIsConversational(!!initialForm.isConversational);
            setLeadType(initialForm.leadType || 'Listing');
            setWebhookUrl(initialForm.webhookUrl || '');
            setIsAutomationEnabled(!!initialForm.automation?.enabled);
            setLeadMagnetUrl(initialForm.automation?.leadMagnetUrl || '');
            setSuccessMessage(initialForm.automation?.successMessage || '');
            initialLoadRef.current = true;
        }
    }, [initialForm]);

    const selectedProject = projects.find(p => p.id === projectId);

    const handleAddField = (type: FormFieldType) => {
        const newField: FormField = {
            id: `field-${Date.now()}`,
            type,
            label: `Question ${fields.length + 1}`,
            required: false,
            options: type === 'select' ? ['Option 1', 'Option 2'] : undefined
        };
        setFields([...fields, newField]);
        setActiveFieldId(newField.id);
    };

    const updateField = (id: string, updates: Partial<FormField>) => {
        setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const deleteField = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setFields(fields.filter(f => f.id !== id));
        if (activeFieldId === id) setActiveFieldId(null);
    };

    const handleSave = async () => {
        if (!title.trim()) return alert("Form title is required");
        setIsSaving(true);
        try {
            let taskDefaults = undefined;
            if (projectId && selectedProject) {
                const finalStatus = isLeadForm ? 'backlog' : (targetStatus || selectedProject.workflow[0]?.id || 'backlog');
                taskDefaults = {
                    status: finalStatus,
                    priority: isLeadForm ? 'High' : 'Medium',
                    memberIds: selectedProject.memberIds || [],
                    autoAssigneeId: autoAssigneeId || undefined,
                    autoApplyTemplateId: autoApplyTemplateId || undefined
                };
            }

            // Sync Team Members for collaboration
            let memberIds: string[] = [];
            if (isTeamShared && formTeamId) {
                const team = teams.find(t => t.id === formTeamId);
                if (team) memberIds = team.memberIds;
            }

            const formData: Partial<Form> = { 
                title, 
                description, 
                fields, 
                style, 
                creatorId, 
                projectId: projectId || undefined,
                teamId: isTeamShared ? (formTeamId || undefined) : undefined,
                memberIds: memberIds.length > 0 ? memberIds : undefined,
                taskDefaults, 
                isLeadForm, 
                isConversational,
                webhookUrl,
                version: (initialForm?.version || 0) + 1,
                leadType: isLeadForm ? leadType : undefined,
                automation: {
                    enabled: isAutomationEnabled,
                    leadMagnetUrl,
                    successMessage
                }
            };

            if (initialForm) {
                await onUpdate(initialForm.id, formData);
            } else {
                await onSave(formData as Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'responseCount'>);
            }
            onClose();
        } catch (error) {
            console.error(error);
            alert("Failed to save form");
        } finally {
            setIsSaving(false);
        }
    };

    const embedCode = initialForm ? `<iframe src="${window.location.origin}/#/forms/${initialForm.id}" width="100%" height="800" frameborder="0" style="border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);"></iframe>` : "Save form to generate embed code.";

    return (
        <div className="fixed inset-0 bg-main z-[200] flex flex-col overflow-hidden">
            <div className="h-16 border-b border-outline/20 bg-surface flex items-center justify-between px-6 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-surface-variant rounded-full text-on-surface-variant transition-colors">
                        <XIcon className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-on-surface uppercase tracking-tight">{initialForm ? 'Edit Transaction Engine' : 'New Intake Engine'}</h1>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest -mt-1">Operational Architecture</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {initialForm && (
                        <button 
                            onClick={() => setShowEmbedModal(true)}
                            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-xl transition-all"
                            title="Embed Form"
                        >
                            <CodeIcon className="h-5 w-5" />
                        </button>
                    )}
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-primary text-on-primary rounded-full text-sm font-black shadow-m3-md hover:bg-primary/90 transition-all disabled:opacity-50 active:scale-95"
                    >
                        {isSaving ? 'Syncing...' : 'Publish Form'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className="w-96 bg-surface border-r border-outline/20 flex flex-col overflow-hidden flex-shrink-0">
                    <div className="flex border-b border-outline/20">
                        <button onClick={() => setActiveTab('build')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'build' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-on-surface-variant hover:text-on-surface'}`}>Questions</button>
                        <button onClick={() => setActiveTab('design')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'design' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-on-surface-variant hover:text-on-surface'}`}>Branding</button>
                        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'text-primary border-b-2 border-primary bg-primary/5' : 'text-on-surface-variant hover:text-on-surface'}`}>Automation</button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        {activeTab === 'build' ? (
                            <>
                                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Field Library</h3>
                                <div className="space-y-2">
                                    {FIELD_TYPES.map(ft => (
                                        <button
                                            key={ft.type}
                                            onClick={() => handleAddField(ft.type)}
                                            className="w-full flex items-center gap-4 p-4 rounded-2xl border border-outline/20 bg-surface-variant/10 hover:bg-surface-variant/30 hover:border-primary/30 transition-all text-left group"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors shadow-sm">{ft.icon}</div>
                                            <span className="text-sm font-bold text-on-surface flex-1">{ft.label}</span>
                                            <PlusIcon className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100" />
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : activeTab === 'design' ? (
                            <div className="space-y-8">
                                <section>
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><PaletteIcon className="w-3.5 h-3.5" /> Core Theme</h4>
                                    <div className="space-y-4">
                                        <div><label className="text-xs font-bold text-on-surface-variant block mb-1.5">Primary Branding Color</label><div className="flex items-center gap-2"><input type="color" value={style.primaryColor} onChange={e => setStyle({ ...style, primaryColor: e.target.value })} className="w-8 h-8 rounded-lg border-0 p-0 cursor-pointer shadow-sm"/><input type="text" value={style.primaryColor} onChange={e => setStyle({ ...style, primaryColor: e.target.value })} className="flex-1 bg-surface-variant/30 border border-outline/20 rounded-lg px-3 py-1.5 text-xs font-mono uppercase"/></div></div>
                                        <div><label className="text-xs font-bold text-on-surface-variant block mb-1.5">Background Fill</label><div className="flex items-center gap-2"><input type="color" value={style.backgroundColor} onChange={e => setStyle({ ...style, backgroundColor: e.target.value })} className="w-8 h-8 rounded-lg border-0 p-0 cursor-pointer shadow-sm"/><input type="text" value={style.backgroundColor} onChange={e => setStyle({ ...style, backgroundColor: e.target.value })} className="flex-1 bg-surface-variant/30 border border-outline/20 rounded-lg px-3 py-1.5 text-xs font-mono uppercase"/></div></div>
                                    </div>
                                </section>
                                <section>
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><SparklesIcon className="w-3.5 h-3.5" /> Visual Assets</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-on-surface-variant block mb-1.5">Brokerage Logo URL</label>
                                            <input type="text" value={style.logoUrl || ''} onChange={e => setStyle({ ...style, logoUrl: e.target.value })} placeholder="https://..." className="w-full bg-surface-variant/30 border border-outline/10 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 ring-primary/30" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-on-surface-variant block mb-1.5">Hero Header Image URL</label>
                                            <input type="text" value={style.headerImage || ''} onChange={e => setStyle({ ...style, headerImage: e.target.value })} placeholder="https://..." className="w-full bg-surface-variant/30 border border-outline/10 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 ring-primary/30" />
                                        </div>
                                    </div>
                                </section>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {/* Team Collaboration Section */}
                                <section className="p-5 bg-secondary/5 rounded-[2rem] border border-secondary/10">
                                    <h4 className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mb-6 flex items-center gap-2"><ShieldCheckIcon className="w-4 h-4" /> Team Collaboration</h4>
                                    <div className="space-y-6">
                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <div className="min-w-0 pr-4">
                                                <p className="text-xs font-black text-on-surface uppercase tracking-tight">Enable Team Access</p>
                                                <p className="text-[9px] text-on-surface-variant font-medium leading-tight">Allow members of a selected team to edit nodes and view data</p>
                                            </div>
                                            <div className="relative">
                                                <input type="checkbox" checked={isTeamShared} onChange={e => setIsTeamShared(e.target.checked)} className="sr-only" />
                                                <div className={`w-10 h-6 rounded-full transition-colors ${isTeamShared ? 'bg-secondary' : 'bg-outline/20'}`} />
                                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isTeamShared ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                        </label>

                                        {isTeamShared && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-2">
                                                <div>
                                                    <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 block">Shared Workspace</label>
                                                    <select 
                                                        value={formTeamId} 
                                                        onChange={e => setFormTeamId(e.target.value)} 
                                                        className="w-full bg-surface border border-outline/20 rounded-xl px-4 py-3 text-sm font-bold text-on-surface outline-none"
                                                    >
                                                        <option value="">-- Select Team --</option>
                                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                    </select>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                </section>

                                <section className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><SparklesIcon className="w-3.5 h-3.5" /> UX Architecture</h4>
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <div className="min-w-0 pr-4">
                                            <p className="text-xs font-black text-on-surface uppercase tracking-tight">Conversational Mode</p>
                                            <p className="text-[9px] text-on-surface-variant font-medium leading-tight">One question per screen for higher completion</p>
                                        </div>
                                        <div className="relative">
                                            <input type="checkbox" checked={isConversational} onChange={e => setIsConversational(e.target.checked)} className="sr-only" />
                                            <div className={`w-10 h-6 rounded-full transition-colors ${isConversational ? 'bg-primary' : 'bg-outline/20'}`} />
                                            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isConversational ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </div>
                                    </label>
                                </section>

                                <section>
                                    <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><SettingsIcon className="w-3.5 h-3.5" /> Pipeline Connections</h4>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-xs font-bold text-on-surface-variant block mb-1.5 flex items-center gap-1.5"><FolderKanbanIcon className="w-3 h-3"/> Destination Pipeline</label>
                                            <select value={projectId} onChange={e => setProjectId(e.target.value)} className="w-full bg-surface-variant/30 border border-outline/20 rounded-xl px-4 py-3 text-sm font-bold text-on-surface outline-none">
                                                <option value="">No Project Link</option>
                                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>

                                        {projectId && selectedProject && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-6">
                                                <div>
                                                    <label className="text-xs font-bold text-on-surface-variant block mb-1.5 flex items-center gap-1.5"><ActivityIcon className="w-3 h-3"/> Initial Pipeline Stage</label>
                                                    <select value={targetStatus} onChange={e => setTargetStatus(e.target.value)} className="w-full bg-surface-variant/30 border border-outline/20 rounded-xl px-4 py-3 text-sm font-bold text-on-surface outline-none">
                                                        <option value="">Default (First Stage)</option>
                                                        {selectedProject.workflow.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="text-xs font-bold text-on-surface-variant block mb-1.5 flex items-center gap-1.5"><HierarchyIcon className="w-3 h-3"/> Auto-Applied Template</label>
                                                    <select value={autoApplyTemplateId} onChange={e => setAutoApplyTemplateId(e.target.value)} className="w-full bg-surface-variant/30 border border-outline/20 rounded-xl px-4 py-3 text-sm font-bold text-on-surface outline-none">
                                                        <option value="">No Template Trigger</option>
                                                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                    </select>
                                                </div>
                                            </motion.div>
                                        )}

                                        <div>
                                            <label className="text-xs font-bold text-on-surface-variant block mb-1.5 flex items-center gap-1.5"><UsersIcon className="w-3 h-3"/> Default Assignee</label>
                                            <select value={autoAssigneeId} onChange={e => setAutoAssigneeId(e.target.value)} className="w-full bg-surface-variant/30 border border-outline/20 rounded-xl px-4 py-3 text-sm font-bold text-on-surface outline-none">
                                                <option value="">Form Creator</option>
                                                {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </section>

                                <section className="p-4 bg-secondary/5 rounded-2xl border border-secondary/10">
                                    <h4 className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><MailIcon className="w-3.5 h-3.5" /> Success Page Delivery</h4>
                                    <div className="space-y-4">
                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <div className="min-w-0 pr-4">
                                                <p className="text-xs font-black text-on-surface uppercase tracking-tight">Show Resource Link</p>
                                                <p className="text-[9px] text-on-surface-variant font-medium leading-tight">Display QR and link after submission</p>
                                            </div>
                                            <div className="relative">
                                                <input type="checkbox" checked={isAutomationEnabled} onChange={e => setIsAutomationEnabled(e.target.checked)} className="sr-only" />
                                                <div className={`w-10 h-6 rounded-full transition-colors ${isAutomationEnabled ? 'bg-secondary' : 'bg-outline/20'}`} />
                                                <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isAutomationEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                        </label>

                                        {isAutomationEnabled && (
                                            <div className="space-y-4 pt-2">
                                                <div>
                                                    <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 block">Resource/Lead Magnet URL</label>
                                                    <input type="text" value={leadMagnetUrl} onChange={e => setLeadMagnetUrl(e.target.value)} placeholder="https://..." className="w-full bg-surface-variant/30 border border-outline/20 rounded-xl px-4 py-2 text-xs font-bold outline-none" />
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 block">Success Message</label>
                                                    <textarea value={successMessage} onChange={e => setSuccessMessage(e.target.value)} placeholder="Thank you!" className="w-full bg-surface-variant/30 border border-outline/20 rounded-xl px-4 py-2 text-xs font-bold outline-none resize-none" rows={2} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        )}
                    </div>
                </div>

                <div 
                    className="flex-1 overflow-y-auto p-12 custom-scrollbar relative"
                    style={{ backgroundColor: style.backgroundColor, fontFamily: style.fontFamily, color: style.textColor }}
                >
                    <div className="max-w-4xl mx-auto space-y-8 pb-32">
                        {style.headerImage && (
                            <div className="w-full h-48 rounded-[2.5rem] overflow-hidden shadow-m3-md mb-8 border border-outline/10">
                                <img src={style.headerImage} alt="Header" className="w-full h-full object-cover" />
                            </div>
                        )}
                        
                        <div 
                            className="bg-surface rounded-[3rem] border-t-[16px] border-x border-b shadow-m3-lg p-12 relative overflow-hidden transition-all"
                            style={{ borderColor: `${style.primaryColor}20`, borderTopColor: style.primaryColor }}
                        >
                            {style.logoUrl && <img src={style.logoUrl} alt="Logo" className="h-12 w-auto mb-8" />}
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Engine Title"
                                className="w-full text-5xl font-black bg-transparent border-none focus:ring-0 mb-4 pb-2 placeholder:opacity-10 tracking-tighter"
                            />
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Strategic briefing for respondents..."
                                rows={2}
                                className="w-full text-lg bg-transparent border-none focus:ring-0 focus:outline-none opacity-60 resize-none"
                            />
                        </div>

                        <Reorder.Group axis="y" values={fields} onReorder={setFields} className="space-y-6">
                            {fields.map((field) => (
                                <SortableField key={field.id} field={field} isActive={activeFieldId === field.id} onActivate={() => setActiveFieldId(field.id)} onUpdate={updateField} onDelete={deleteField} />
                            ))}
                        </Reorder.Group>
                        
                        {fields.length === 0 && (
                            <div className="py-24 text-center border-4 border-dashed border-outline/10 rounded-[4rem] opacity-20">
                                <PlusIcon className="w-16 h-16 mx-auto mb-4" />
                                <p className="text-xl font-black uppercase tracking-widest">Workspace is Empty</p>
                                <p className="font-bold mt-2">Add or drop fields from the left sidebar to build your engine</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showEmbedModal && (
                <Modal onClose={() => setShowEmbedModal(false)} containerClassName="z-[250] flex items-center justify-center">
                    <div className="p-8">
                        <h2 className="text-2xl font-black text-on-surface uppercase tracking-tight mb-4">Direct Connection</h2>
                        <p className="text-sm text-on-surface-variant mb-6 font-medium">Use this endpoint to embed the intake engine on your personal website or MLS listing page.</p>
                        <div className="bg-surface-variant/30 p-6 rounded-2xl border border-outline/10 font-mono text-xs text-on-surface break-all relative group">
                            {embedCode}
                            <button onClick={() => { navigator.clipboard.writeText(embedCode); alert("Copied!"); }} className="absolute top-4 right-4 p-2 bg-surface text-primary rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-outline/10">Copy</button>
                        </div>
                        <div className="flex justify-end mt-8">
                            <button onClick={() => setShowEmbedModal(false)} className="px-10 py-3 bg-primary text-on-primary rounded-2xl text-xs font-black uppercase tracking-widest">Done</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default FormBuilder;