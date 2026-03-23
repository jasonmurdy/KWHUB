import React, { useState, useMemo, useRef, useEffect } from 'react';
import MentionInput from './MentionInput';
import { 
  PaperclipIcon, XIcon, CheckCircle2, MessageSquareIcon, 
  LinkIcon, PlusIcon, EyeIcon,
  ListTodoIcon, CalendarDaysIcon, TrashIcon, 
  HistoryIcon, SparklesIcon, ClipboardCheckIcon, 
  FolderKanbanIcon, UsersIcon, 
  DollarSignIcon, UploadCloudIcon,
  FileTextIcon, PhoneIcon, MailIcon,
  TrendingUpIcon, CalendarClockIcon, 
  UserPlusIcon, ClipboardListIcon, RefreshCwIcon,
  HierarchyIcon, ChevronDownIcon, ChevronUpIcon
} from './icons'; 
import { useAppContext } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { User, Task, TaskPriority, Subtask, SubtaskStep, JobContact, CustomFieldDefinition, Attachment } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedCheckbox } from './AnimatedCheckbox';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db } from '../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const toInputDateString = (date: Date | { seconds: number; nanoseconds?: number } | string | number | null | undefined) => {
    if (!date) return '';
    try {
        let d: Date;
        if (typeof date === 'object' && date !== null && 'seconds' in date) {
             d = new Date(date.seconds * 1000 + (date.nanoseconds || 0) / 1000000);
        } else {
            d = new Date(date as string | number | Date);
        }
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    } catch { return ''; }
};

const safeDate = (date: Date | { seconds: number; nanoseconds?: number } | string | number | null | undefined): Date => {
    if (!date) return new Date();
    try {
        if (typeof date === 'object' && date !== null && 'seconds' in date) {
            return new Date(date.seconds * 1000 + (date.nanoseconds || 0) / 1000000);
        }
        const d = new Date(date as string | number | Date);
        return isNaN(d.getTime()) ? new Date() : d;
    } catch { return new Date(); }
};

const EditableTextField: React.FC<{ taskId: string; field: 'title' | 'description' | 'location'; initialValue: string; Tag: 'h2' | 'p' | 'div', className?: string, placeholder?: string }> = ({ taskId, field, initialValue, Tag, className, placeholder }) => {
    const { updateTask } = useAppContext();
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    useEffect(() => { if (isEditing) inputRef.current?.focus(); }, [isEditing]);
    const handleSave = () => { if (value.trim() !== initialValue) updateTask(taskId, { [field]: value.trim() }); setIsEditing(false); };
    if (isEditing) {
        if (Tag === 'h2' || (Tag === 'div' && field !== 'description')) return <input ref={inputRef as React.RefObject<HTMLInputElement>} type="text" value={value} onChange={e => setValue(e.target.value)} onBlur={handleSave} onKeyDown={e => e.key === 'Enter' && handleSave()} className={`w-full bg-surface border-2 border-primary rounded-xl p-2 outline-none ${className}`} />;
        return <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} value={value} onChange={e => setValue(e.target.value)} onBlur={handleSave} className={`w-full bg-surface border-2 border-primary rounded-xl p-3 outline-none ${className}`} rows={4} />;
    }
    return <Tag onClick={() => setIsEditing(true)} className={`group hover:bg-primary/5 p-2 -ml-2 rounded-xl cursor-pointer transition-all w-full min-h-[1.5rem] ${className}`}>{value || <span className="text-on-surface-variant/40 italic">{placeholder || `Add ${field}...`}</span>}</Tag>;
};

const PropertyRow: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode; isStacked?: boolean }> = ({ label, icon, children, isStacked = false }) => {
    if (isStacked) {
        return (
            <div className="flex flex-col gap-1.5 py-3 px-4 rounded-2xl bg-surface-variant/10 border border-outline/5 hover:border-outline/20 transition-all group">
                <div className="flex items-center gap-2 text-on-surface-variant/60 font-black text-[9px] uppercase tracking-widest">
                    <div className="text-primary opacity-70 group-hover:opacity-100 transition-opacity shrink-0">{icon}</div>
                    <span className="truncate">{label}</span>
                </div>
                <div className="text-xs font-bold text-on-surface w-full">{children}</div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-between py-3 px-4 rounded-2xl hover:bg-on-surface/5 transition-colors group">
            <div className="flex items-center gap-3 text-on-surface-variant/70 font-bold text-[11px] uppercase tracking-[0.1em] min-w-0 flex-1">
                <div className="text-primary opacity-60 group-hover:opacity-100 transition-opacity shrink-0">{icon}</div>
                <span className="truncate">{label}</span>
            </div>
            <div className="text-sm font-bold text-on-surface flex justify-end shrink-0 ml-4">{children}</div>
        </div>
    );
};

const CustomFieldInput: React.FC<{ field: CustomFieldDefinition; value: string | number | boolean | Date | null | undefined; onChange: (value: string | number | boolean | Date | null) => void; isInline?: boolean }> = ({ field, value, onChange, isInline }) => {
    const inlineClass = "bg-transparent border-none text-left md:text-right font-black text-[11px] uppercase tracking-widest focus:ring-0 p-0 text-on-surface w-full truncate";
    const defaultClass = "w-full bg-surface border border-outline/20 rounded-xl px-4 py-3 text-sm font-bold text-on-surface outline-none focus:ring-4 ring-primary/10 transition-all";
    const className = isInline ? inlineClass : defaultClass;

    switch (field.type) {
        case 'text':
            return <input type="text" value={(value as string) || ''} onChange={e => onChange(e.target.value)} placeholder="..." className={className} />;
        case 'number':
            return <input type="number" value={(value as number) || ''} onChange={e => onChange(e.target.valueAsNumber)} placeholder="0" className={className} />;
        case 'date':
            return <input type="date" value={value ? toInputDateString(new Date(value as string | number | Date)) : ''} onChange={e => onChange(e.target.valueAsDate)} className={className} />;
        case 'boolean':
            return (
                <button 
                    onClick={() => onChange(!value)}
                    className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${value ? 'text-primary' : 'text-on-surface-variant/40'}`}
                >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${value ? 'bg-primary border-primary' : 'border-outline/30'}`}>
                        {value && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    {value ? 'YES' : 'NO'}
                </button>
            );
        case 'select':
            return (
                <select value={(value as string) || ''} onChange={e => onChange(e.target.value)} className={className}>
                    <option value="">--</option>
                    {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            );
        default: return null;
    }
};

const SubStepRow: React.FC<{ 
    step: SubtaskStep; 
    onToggle: () => void; 
    onDelete: () => void; 
    onUpdate: (updates: Partial<SubtaskStep>) => void; 
}> = ({ step, onToggle, onDelete, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(step.title);
    const [link, setLink] = useState(step.link || '');
    const [showLinkInput, setShowLinkInput] = useState(false);

    const handleSave = () => { 
        if (title.trim() !== step.title || link.trim() !== (step.link || '')) {
            onUpdate({ title: title.trim(), link: link.trim() || undefined });
        }
        setIsEditing(false); 
        setShowLinkInput(false);
    };

    return (
        <div className="flex flex-col py-1 group/step">
            <div className="flex items-center gap-3">
                <AnimatedCheckbox checked={step.isCompleted} onChange={onToggle} className="w-3.5 h-3.5" />
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onBlur={handleSave} onKeyDown={e => e.key === 'Enter' && handleSave()} className="w-full bg-transparent border-none p-0 text-xs focus:ring-0 font-medium text-on-surface" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <span onClick={() => setIsEditing(true)} className={`text-xs font-medium cursor-text block truncate ${step.isCompleted ? 'line-through text-on-surface-variant/40' : 'text-on-surface-variant'}`}>{step.title}</span>
                            {step.link && (
                                <a href={step.link} target="_blank" rel="noreferrer" className="text-primary hover:text-primary/80 transition-colors shrink-0">
                                    <LinkIcon className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover/step:opacity-100 transition-opacity">
                    <button onClick={() => { setShowLinkInput(!showLinkInput); setIsEditing(true); }} className="p-1 text-on-surface-variant/20 hover:text-primary" title="Add Link"><LinkIcon className="h-3 w-3" /></button>
                    <button onClick={onDelete} className="p-1 text-on-surface-variant/20 hover:text-danger" title="Delete Step"><TrashIcon className="h-3 w-3" /></button>
                </div>
            </div>
            {showLinkInput && (
                <div className="ml-6 mt-1">
                    <input 
                        autoFocus
                        value={link} 
                        onChange={e => setLink(e.target.value)} 
                        onBlur={handleSave}
                        onKeyDown={e => e.key === 'Enter' && handleSave()}
                        placeholder="Paste URL (https://...)" 
                        className="w-full bg-surface-variant/20 border border-outline/10 rounded-lg px-2 py-1 text-[10px] outline-none focus:ring-1 ring-primary/30"
                    />
                </div>
            )}
        </div>
    );
};

const SubtaskRow: React.FC<{ taskId: string; subtask: Subtask; onToggle: () => void; onDelete: () => void; onUpdate: (updates: Partial<Subtask>) => void; projectMembers: User[]; }> = ({ subtask, onToggle, onDelete, onUpdate, projectMembers }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [title, setTitle] = useState(subtask.title);
    const [activePop, setActivePop] = useState<'assign' | 'date' | 'steps' | 'notes' | 'attachments' | null>(null);
    const [newStepTitle, setNewStepTitle] = useState('');
    const [notes, setNotes] = useState(subtask.notes || '');
    const subtaskVaultRef = useRef<HTMLInputElement>(null);
    
    const handleSave = () => { if (title.trim() !== subtask.title) onUpdate({ title: title.trim() }); setIsEditing(false); };
    const handleNotesBlur = () => { if (notes.trim() !== (subtask.notes || '')) onUpdate({ notes: notes.trim() }); };

    const handleSubtaskFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const path = `subtask_attachments/${subtask.id}/${Date.now()}_${file.name}`;
            const fileRef = ref(storage, path);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            const newAttachment: Attachment = { id: Date.now().toString(), name: file.name, url, fileType: 'upload' };
            onUpdate({ attachments: [...(subtask.attachments || []), newAttachment] });
        } catch {
            // Error handled silently for now
        } finally {
            if (subtaskVaultRef.current) subtaskVaultRef.current.value = '';
        }
    };
    const handleAddStep = (e: React.FormEvent) => { e.preventDefault(); if (!newStepTitle.trim()) return; const newStep = { id: Math.random().toString(36).substr(2, 9), title: newStepTitle.trim(), isCompleted: false }; onUpdate({ steps: [...(subtask.steps || []), newStep] }); setNewStepTitle(''); };
    const stepsCount = subtask.steps?.length || 0;
    const completedSteps = subtask.steps?.filter(s => s.isCompleted).length || 0;
    
    return (
        <div className={`group flex flex-col rounded-2xl transition-all border ${subtask.isCompleted ? 'bg-surface-variant/5 border-outline/5' : 'bg-surface border-outline/10 hover:border-primary/20 hover:shadow-sm'}`}>
            <div className="flex items-center gap-3 py-2 px-3">
                <AnimatedCheckbox checked={subtask.isCompleted} onChange={onToggle} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onBlur={handleSave} onKeyDown={e => e.key === 'Enter' && handleSave()} className="w-full bg-transparent border-none p-0 text-sm focus:ring-0 font-bold text-on-surface" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <span onClick={() => setIsEditing(true)} className="text-sm font-bold cursor-text text-on-surface relative break-words">
                                <motion.span
                                    initial={false}
                                    animate={{ color: subtask.isCompleted ? 'rgba(var(--on-surface-variant), 0.4)' : 'rgba(var(--on-surface), 1)' }}
                                >
                                    {subtask.title}
                                </motion.span>
                                {subtask.isCompleted && (
                                    <motion.div
                                        className="absolute left-0 top-1/2 h-0.5 bg-on-surface-variant/40"
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 0.2 }}
                                    />
                                )}
                            </span>
                            <div className="flex -space-x-1.5 overflow-hidden shrink-0">
                                {(subtask.assigneeIds || []).map(id => {
                                    const user = projectMembers.find(u => u.id === id);
                                    if (!user) return null;
                                    return <img key={id} src={user.avatarUrl} className="w-4 h-4 rounded-full border border-surface shadow-sm" title={user.name} />;
                                })}
                            </div>
                            {subtask.dueDate && <span className="text-[8px] font-black text-primary/40 uppercase whitespace-nowrap">{safeDate(subtask.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => setActivePop(activePop === 'assign' ? null : 'assign')} className={`p-1.5 rounded-lg ${activePop === 'assign' ? 'bg-primary text-on-primary' : 'text-on-surface-variant/30 hover:text-primary hover:bg-primary/5'}`} title="Assign Member"><UsersIcon className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setActivePop(activePop === 'date' ? null : 'date')} className={`p-1.5 rounded-lg ${activePop === 'date' ? 'bg-primary text-on-primary' : 'text-on-surface-variant/30 hover:text-primary hover:bg-primary/5'}`} title="Deadline"><CalendarDaysIcon className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setActivePop(activePop === 'steps' ? null : 'steps')} className={`p-1.5 rounded-lg relative ${activePop === 'steps' ? 'bg-primary text-on-primary' : 'text-on-surface-variant/30 hover:text-primary hover:bg-primary/5'}`} title="Steps">
                        <ListTodoIcon className="h-3.5 w-3.5" />
                        {stepsCount > 0 && <span className="absolute -top-1 -right-1 bg-secondary text-white text-[7px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full border border-surface">{stepsCount}</span>}
                    </button>
                    <button onClick={() => setActivePop(activePop === 'notes' ? null : 'notes')} className={`p-1.5 rounded-lg ${activePop === 'notes' ? 'bg-primary text-on-primary' : 'text-on-surface-variant/30 hover:text-primary hover:bg-primary/5'}`} title="Notes"><MessageSquareIcon className="h-3.5 w-3.5" /></button>
                    <button onClick={() => setActivePop(activePop === 'attachments' ? null : 'attachments')} className={`p-1.5 rounded-lg ${activePop === 'attachments' ? 'bg-primary text-on-primary' : 'text-on-surface-variant/30 hover:text-primary hover:bg-primary/5'}`} title="Attachments"><PaperclipIcon className="h-3.5 w-3.5" /></button>
                    <button onClick={onDelete} className="p-1.5 text-on-surface-variant/20 hover:text-danger hover:bg-danger/5 rounded-lg transition-all"><TrashIcon className="h-3.5 w-3.5" /></button>
                </div>
            </div>
            <AnimatePresence>
                {activePop && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-3 pb-3 overflow-hidden border-t border-outline/5">
                        <div className="p-3 mt-2 bg-surface-variant/10 rounded-xl border border-outline/5">
                            {activePop === 'assign' && (
                                <div className="space-y-2">
                                    <p className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">Assign Member</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(projectMembers || []).map(m => (
                                            <button key={m.id} onClick={() => { const cur = subtask.assigneeIds || []; onUpdate({ assigneeIds: cur.includes(m.id) ? cur.filter(id => id !== m.id) : [...cur, m.id] }); }} className={`flex items-center gap-1.5 p-1 pr-2.5 rounded-full border transition-all ${subtask.assigneeIds?.includes(m.id) ? 'bg-primary border-primary text-on-primary shadow-sm' : 'bg-surface border-outline/10 text-on-surface-variant hover:border-primary/20'}`}>
                                                <img src={m.avatarUrl} className="w-4 h-4 rounded-full" />
                                                <span className="text-[9px] font-bold">{m.name.split(' ')[0]}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {activePop === 'date' && (
                                <div>
                                    <p className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest mb-1.5">Target Date</p>
                                    <input type="date" value={toInputDateString(subtask.dueDate)} onChange={e => onUpdate({ dueDate: e.target.value ? new Date(e.target.value) : undefined })} className="w-full bg-surface border border-outline/10 rounded-lg px-3 py-1.5 text-[10px] font-bold text-on-surface" />
                                </div>
                            )}
                            {activePop === 'steps' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between"><p className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">Checklist ({completedSteps}/{stepsCount})</p></div>
                                    <div className="space-y-0.5">
                                        {(subtask.steps || []).map(s => <SubStepRow key={s.id} step={s} onToggle={() => onUpdate({ steps: subtask.steps?.map(x => x.id === s.id ? { ...x, isCompleted: !x.isCompleted } : x) })} onDelete={() => onUpdate({ steps: subtask.steps?.filter(x => x.id !== s.id) })} onUpdate={(u) => onUpdate({ steps: subtask.steps?.map(x => x.id === s.id ? { ...x, ...u } : x) })} />)}
                                    </div>
                                    <form onSubmit={handleAddStep} className="flex gap-2 mt-2">
                                        <input type="text" value={newStepTitle} onChange={e => setNewStepTitle(e.target.value)} placeholder="Add step..." className="flex-1 bg-surface border border-outline/10 rounded-lg px-3 py-1.5 text-[10px] font-medium outline-none" />
                                        <button type="submit" disabled={!newStepTitle.trim()} className="p-1.5 bg-primary text-on-primary rounded-lg shadow-sm active:scale-95 transition-all"><PlusIcon className="h-3 w-3" /></button>
                                    </form>
                                </div>
                            )}
                            {activePop === 'notes' && (
                                <div className="space-y-2">
                                    <p className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">Subtask Notes</p>
                                    <textarea 
                                        value={notes} 
                                        onChange={e => setNotes(e.target.value)} 
                                        onBlur={handleNotesBlur}
                                        placeholder="Add specific instructions or context for this subtask..." 
                                        className="w-full bg-surface border border-outline/10 rounded-xl p-3 text-xs font-medium outline-none focus:ring-2 ring-primary/10 transition-all min-h-[80px]"
                                    />
                                </div>
                            )}
                            {activePop === 'attachments' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-widest">Subtask Assets</p>
                                        <button onClick={() => subtaskVaultRef.current?.click()} className="text-[8px] font-black text-primary uppercase tracking-widest hover:underline">Upload Asset</button>
                                        <input type="file" ref={subtaskVaultRef} className="hidden" onChange={handleSubtaskFileUpload} />
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {(subtask.attachments || []).map(att => (
                                            <div key={att.id} className="flex items-center justify-between p-2 bg-surface border border-outline/5 rounded-lg group/att">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <FileTextIcon className="w-3 h-3 text-primary" />
                                                    <span className="text-[10px] font-bold text-on-surface truncate">{att.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => window.open(att.url, '_blank')} className="p-1 text-on-surface-variant/20 hover:text-primary opacity-0 group-hover/att:opacity-100 transition-opacity"><EyeIcon className="h-3 w-3" /></button>
                                                    <button onClick={() => onUpdate({ attachments: subtask.attachments?.filter(a => a.id !== att.id) })} className="p-1 text-on-surface-variant/20 hover:text-danger opacity-0 group-hover/att:opacity-100 transition-opacity"><TrashIcon className="h-3 w-3" /></button>
                                                </div>
                                            </div>
                                        ))}
                                        {(subtask.attachments || []).length === 0 && (
                                            <p className="text-[9px] font-medium text-on-surface-variant/30 italic text-center py-2">No assets attached to this subtask.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const SectionContainer: React.FC<{ 
    title: string; 
    icon: React.ReactNode; 
    children: React.ReactNode; 
    isCollapsed: boolean; 
    onToggle: () => void;
    badge?: string | number;
    actions?: React.ReactNode;
}> = ({ title, icon, children, isCollapsed, onToggle, badge, actions }) => {
    return (
        <section className="space-y-4">
            <div 
                onClick={onToggle}
                className="flex items-center justify-between px-2 py-1 group cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl transition-colors ${isCollapsed ? 'bg-surface-variant/30 text-on-surface-variant' : 'bg-primary/10 text-primary'}`}>
                        {icon}
                    </div>
                    <div className="flex items-center gap-3">
                        <h3 className="text-[11px] font-black text-on-surface uppercase tracking-[0.3em]">{title}</h3>
                        {badge !== undefined && (
                            <span className="px-2 py-0.5 rounded-full bg-surface-variant/40 border border-outline/10 text-[9px] font-black text-on-surface-variant/40">{badge}</span>
                        )}
                    </div>
                    {isCollapsed ? <ChevronDownIcon className="w-3.5 h-3.5 text-on-surface-variant/30 group-hover:text-primary transition-all" /> : <ChevronUpIcon className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-all" />}
                </div>
                {!isCollapsed && actions && (
                    <div onClick={e => e.stopPropagation()} className="flex items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>
            <AnimatePresence initial={false}>
                {!isCollapsed && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="overflow-hidden"
                    >
                        <div className="pb-2">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

const TaskDetailModal: React.FC = () => {
    const { viewingTask, closeTaskDetail, updateTask, addSubtask, deleteSubtask, updateSubtask, addComment, projects, allUsers, addAttachment, viewFile, openAiSubtaskGenerator, teams, addExpenseToTask, deleteExpenseFromTask, openApplyTemplateToTaskModal, requestReview, recurTask, triggerDailySummary } = useAppContext();
    const { addToast } = useToast();
    
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [newComment, setNewComment] = useState('');
    const [activeTab, setActiveTab] = useState<'content' | 'activity' | 'files' | 'financials' | 'contacts'>('content');
    const [isAssignPickerOpen, setIsAssignPickerOpen] = useState(false);
    const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('');
    
    // File Vault State
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const vaultInputRef = useRef<HTMLInputElement>(null);

    // Finance State
    const [expenseDesc, setExpenseDesc] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');

    // People Tab State
    const [isAddingManual, setIsAddingManual] = useState(false);
    const [isEnlistingTeam, setIsEnlistingTeam] = useState(false);
    const [newContact, setNewContact] = useState<Partial<JobContact>>({ name: '', role: '', email: '', phone: '' });
    const [expandedContactId, setExpandedContactId] = useState<string | null>(null);

    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        overview: false,
        specs: false,
        logic: false,
    });

    useEffect(() => {
        if (viewingTask?.isPubliclyShareable && viewingTask?.shareToken) {
            setDoc(doc(db, 'public_checklists', viewingTask.shareToken), {
                assigneeIdFilter: selectedAssigneeId || null,
                subtasks: viewingTask.subtasks || [],
                title: viewingTask.title
            }, { merge: true }).catch(console.error);
        }
    }, [selectedAssigneeId, viewingTask?.isPubliclyShareable, viewingTask?.shareToken, viewingTask?.subtasks, viewingTask?.title]);

    const taskProject = useMemo(() => viewingTask ? projects.find(p => p.id === viewingTask.projectId) || null : null, [projects, viewingTask]);
    const projectTeam = useMemo(() => taskProject?.teamId ? teams.find(t => t.id === taskProject.teamId) : null, [teams, taskProject]);
    const projectMembers = useMemo(() => taskProject ? (taskProject.memberIds || []).map(id => allUsers.find(u => u.id === id)).filter((u): u is User => !!u) : [], [allUsers, taskProject]);
    const teamMembers = useMemo(() => projectTeam ? (projectTeam.memberIds || []).map(id => allUsers.find(u => u.id === id)).filter((u): u is User => !!u) : projectMembers, [allUsers, projectTeam, projectMembers]);
    const taskAssignees = useMemo(() => viewingTask ? (viewingTask.assigneeIds || []).map(id => allUsers.find(u => u.id === id)).filter((u): u is User => !!u) : [], [viewingTask, allUsers]);
    const totalExpenses = useMemo(() => (viewingTask?.expenses || []).reduce((sum, e) => sum + e.amount, 0), [viewingTask]);
    const netValue = useMemo(() => (viewingTask?.jobValue || 0) - totalExpenses, [viewingTask, totalExpenses]);

    // Team Stakeholders filter (exclude already added ones)
    const availableTeamStakeholders = useMemo(() => {
        if (!projectTeam) return [];
        return (projectTeam.stakeholders || []).filter(s => !viewingTask?.contacts?.some(c => c.id === s.id));
    }, [projectTeam, viewingTask?.contacts]);

    if (!viewingTask) return null;

    const currentStatus = taskProject?.workflow.find(s => s.id === viewingTask.status);

    const handleShare = async () => {
        if (!viewingTask) return;
        
        let { isPubliclyShareable, shareToken } = viewingTask;
        
        if (!isPubliclyShareable || !shareToken) {
            shareToken = Math.random().toString(36).substr(2, 9);
            
            try {
                // Create public_checklists document first
                console.log('DEBUG: Sharing task:', viewingTask.id, 'Subtasks:', viewingTask.subtasks);
                await setDoc(doc(db, 'public_checklists', shareToken), {
                    taskId: viewingTask.id,
                    title: viewingTask.title,
                    subtasks: viewingTask.subtasks || [],
                    shareToken: shareToken,
                    createdAt: serverTimestamp(),
                    assigneeIdFilter: selectedAssigneeId || null
                });
                
                // Then update the task
                await updateTask(viewingTask.id, { isPubliclyShareable: true, shareToken });
                isPubliclyShareable = true;
            } catch (error) {
                console.error("Failed to share checklist:", error);
                addToast({ type: 'error', title: 'Share Failed', message: 'Could not create public checklist.' });
                return;
            }
        }
        
        // Always update the public_checklists document to reflect the current filter and subtasks
        try {
            await setDoc(doc(db, 'public_checklists', shareToken), {
                assigneeIdFilter: selectedAssigneeId || null,
                subtasks: viewingTask.subtasks || [],
                title: viewingTask.title
            }, { merge: true });
        } catch (error) {
            console.error("Failed to update public checklist filter:", error);
        }
        
        const shareUrl = `${window.location.origin}/public/task/${viewingTask.id}?token=${shareToken}`;
        navigator.clipboard.writeText(shareUrl);
        addToast({ type: 'success', title: 'Link Copied', message: 'Public checklist link copied to clipboard.' });
    };

    const toggleCollapse = (section: string) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleVaultUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !viewingTask) return;
        setIsUploadingFile(true);
        try {
            const path = `task_attachments/${viewingTask.id}/${Date.now()}_${file.name}`;
            const fileRef = ref(storage, path);
            await uploadBytes(fileRef, file);
            const url = await getDownloadURL(fileRef);
            await addAttachment(viewingTask.id, { 
                id: Date.now().toString(), 
                name: file.name, 
                url, 
                fileType: 'upload' 
            });
            addToast({ type: 'success', title: 'Asset Deposited', message: 'File synced to vault.' });
        } catch {
            addToast({ type: 'error', title: 'Upload Failed' });
        } finally {
            setIsUploadingFile(false);
            if (vaultInputRef.current) vaultInputRef.current.value = '';
        }
    };

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(expenseAmount);
        if (!expenseDesc.trim() || isNaN(amount)) return;
        await addExpenseToTask(viewingTask.id, { description: expenseDesc.trim(), amount, date: new Date() });
        setExpenseDesc('');
        setExpenseAmount('');
        addToast({ type: 'success', title: 'Expense Logged' });
    };

    const handleAddManualContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContact.name || !newContact.role) return;
        const contact: JobContact = { id: Math.random().toString(36).substr(2, 9), name: newContact.name, role: newContact.role, email: newContact.email, phone: newContact.phone };
        const updated = [...(viewingTask.contacts || []), contact];
        await updateTask(viewingTask.id, { contacts: updated });
        setNewContact({ name: '', role: '', email: '', phone: '' });
        setIsAddingManual(false);
    };

    const handleEnlistStakeholder = async (stakeholder: JobContact) => {
        const updated = [...(viewingTask.contacts || []), stakeholder];
        await updateTask(viewingTask.id, { contacts: updated });
    };

    const toggleContactExpand = (id: string) => {
        setExpandedContactId(expandedContactId === id ? null : id);
    };

    return (
        <div className="fixed inset-0 z-[150] flex justify-start pointer-events-none">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto" onClick={closeTaskDetail} />
            <motion.div
                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 35, stiffness: 350 }}
                className="relative w-full max-w-6xl h-full bg-main shadow-2xl rounded-r-[3rem] border-r border-outline/20 flex flex-col overflow-hidden pointer-events-auto"
            >
                {/* Unified Header */}
                <div className="p-8 pb-6 bg-surface border-b border-outline/20 shadow-sm shrink-0">
                    <div className="flex items-start justify-between mb-8 px-2">
                        <div className="flex items-start gap-6 min-w-0">
                            <div className="w-16 h-16 rounded-3xl bg-primary shadow-md flex items-center justify-center text-on-primary flex-shrink-0">
                                <FolderKanbanIcon className="h-8 w-8" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/30">{taskProject?.name || 'Knowledge Hub'}</div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-variant border border-outline/20 text-[10px] font-black uppercase tracking-widest text-on-surface">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentStatus?.color || '#ccc' }} />
                                        {currentStatus?.name}
                                    </div>
                                </div>
                                <EditableTextField taskId={viewingTask.id} field="title" initialValue={viewingTask.title} Tag="h2" className="text-3xl font-black text-on-surface tracking-tight uppercase leading-none" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <select 
                                className="bg-surface-variant/50 text-on-surface-variant rounded-[1.5rem] p-4 text-xs font-black uppercase tracking-widest border border-outline/20 focus:ring-2 ring-primary/20"
                                onChange={(e) => setSelectedAssigneeId(e.target.value)}
                                value={selectedAssigneeId}
                            >
                                <option value="">All Assignees</option>
                                {teamMembers.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                            <button onClick={handleShare} className="p-4 bg-surface-variant/50 hover:bg-primary/10 text-on-surface-variant hover:text-primary rounded-[1.5rem] transition-all border border-outline/20 shadow-sm">
                                <LinkIcon className="h-6 w-6" />
                            </button>
                            <button onClick={closeTaskDetail} className="p-4 bg-surface-variant/50 hover:bg-danger/10 text-on-surface-variant hover:text-danger rounded-[1.5rem] transition-all border border-outline/20 shadow-sm">
                                <XIcon className="h-6 w-6" />
                            </button>
                        </div>
                    </div>

                    {/* Elite Tabs */}
                    <div className="flex gap-1 overflow-x-auto no-scrollbar px-2">
                        {[
                            { id: 'content', label: 'Brief', icon: <ClipboardCheckIcon className="w-4 h-4" /> },
                            { id: 'activity', label: 'Timeline', icon: <HistoryIcon className="w-4 h-4" /> },
                            { id: 'files', label: 'Vault', icon: <PaperclipIcon className="w-4 h-4" /> },
                            { id: 'financials', label: 'Finance', icon: <DollarSignIcon className="w-4 h-4" /> },
                            { id: 'contacts', label: 'People', icon: <UsersIcon className="w-4 h-4" /> },
                        ].map(tab => (
                            <button 
                                key={tab.id} 
                                onClick={() => setActiveTab(tab.id as 'content' | 'activity' | 'files' | 'financials' | 'contacts')} 
                                className={`px-8 py-4 flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest rounded-t-2xl transition-all border-b-4 whitespace-nowrap
                                    ${activeTab === tab.id ? 'bg-surface text-primary border-primary shadow-sm' : 'border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface/50'}`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-12 bg-surface/20">
                        <AnimatePresence mode="wait">
                            {activeTab === 'content' && (
                                <motion.div key="content" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-12 max-w-4xl mx-auto">
                                    <SectionContainer 
                                        title="Strategic Overview" 
                                        icon={<FileTextIcon className="w-4 h-4" />}
                                        isCollapsed={collapsedSections.overview}
                                        onToggle={() => toggleCollapse('overview')}
                                    >
                                        <div className="bg-surface p-8 rounded-[2.5rem] border border-outline/20 shadow-md">
                                            <EditableTextField taskId={viewingTask.id} field="description" initialValue={viewingTask.description} Tag="p" className="text-base font-medium leading-relaxed text-on-surface" placeholder="Define the primary mission..." />
                                        </div>
                                    </SectionContainer>
                                    {taskProject?.customFields && taskProject.customFields.length > 0 && (
                                        <SectionContainer title="Execution Specifications" icon={<HierarchyIcon className="w-4 h-4" />} isCollapsed={collapsedSections.specs} onToggle={() => toggleCollapse('specs')} badge={taskProject.customFields.length}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {taskProject.customFields.map(field => (
                                                    <div key={field.id} className="p-4 bg-surface rounded-[1.8rem] border border-outline/20 shadow-sm space-y-1 hover:border-primary/40 transition-all">
                                                        <label className="text-[8px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5"><HierarchyIcon className="w-3 h-3 opacity-60" /> {field.name}</label>
                                                        <CustomFieldInput isInline field={field} value={viewingTask.customFieldValues?.[field.id] as string | number | boolean | Date | null | undefined} onChange={(val) => updateTask(viewingTask.id, { customFieldValues: { ...(viewingTask.customFieldValues || {}), [field.id]: val } })} />
                                                    </div>
                                                ))}
                                            </div>
                                        </SectionContainer>
                                    )}
                                    {(() => {
                                        const completedSubtasks = (viewingTask.subtasks || []).filter(st => st.isCompleted).length;
                                        const totalSubtasks = (viewingTask.subtasks || []).length;
                                        const progress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
                                        return (
                                            <SectionContainer title="Board Logic" icon={<ListTodoIcon className="w-4 h-4" />} isCollapsed={collapsedSections.logic} onToggle={() => toggleCollapse('logic')} badge={`${progress}%`} actions={<><button onClick={() => openApplyTemplateToTaskModal(viewingTask)} className="p-2 text-on-surface-variant/30 hover:text-primary transition-all" title="Import Standard SOP"><ClipboardListIcon className="w-4 h-4"/></button><button onClick={() => openAiSubtaskGenerator(viewingTask)} className="p-2 text-on-surface-variant/30 hover:text-primary transition-all" title="AI Workflow Generation"><SparklesIcon className="w-4 h-4"/></button></>}>
                                                <div className="mb-4">
                                                    <div className="flex justify-between text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">
                                                        <span>Progress</span>
                                                        <span>{progress}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-surface-variant rounded-full overflow-hidden">
                                                        <motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5 mb-6">
                                                    {(Array.isArray(viewingTask.subtasks) ? viewingTask.subtasks : []).sort((a, b) => (a.isCompleted === b.isCompleted ? 0 : a.isCompleted ? 1 : -1)).map(st => (
                                                        <motion.div key={st.id} layout transition={{ duration: 0.3 }}>
                                                            <SubtaskRow taskId={viewingTask.id} subtask={st} onToggle={() => {
                                                                if (!st.isCompleted) {
                                                                    // Simple beep sound
                                                                    const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAAABmYWN0BAAAAAAAAABkYXRhAAAAAA==');
                                                                    audio.play().catch(() => {});
                                                                }
                                                                updateSubtask(viewingTask.id, st.id, { isCompleted: !st.isCompleted });
                                                            }} onDelete={() => deleteSubtask(viewingTask.id, st.id)} onUpdate={(u) => updateSubtask(viewingTask.id, st.id, u)} projectMembers={projectMembers} />
                                                        </motion.div>
                                                    ))}
                                                </div>
                                                {progress === 100 && totalSubtasks > 0 && (
                                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4 text-primary font-bold text-sm">
                                                        All tasks completed! Great work!
                                                    </motion.div>
                                                )}
                                                <form onSubmit={(e) => { e.preventDefault(); if(newSubtaskTitle.trim()){ addSubtask(viewingTask.id, newSubtaskTitle.trim()); setNewSubtaskTitle(''); } }} className="flex gap-2"><input value={newSubtaskTitle} onChange={e => setNewSubtaskTitle(e.target.value)} placeholder="Append next operation..." className="flex-1 bg-surface-variant/40 border-outline/20 border rounded-xl px-5 py-3 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all shadow-inner" /><button type="submit" disabled={!newSubtaskTitle.trim()} className="p-3 bg-primary text-on-primary rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-30"><PlusIcon className="w-5 h-5"/></button></form>
                                            </SectionContainer>
                                        );
                                    })()}
                                </motion.div>
                            )}

                            {activeTab === 'activity' && (
                                <motion.div key="activity" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-10 h-full flex flex-col max-w-4xl mx-auto">
                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-3">
                                        {/* Handoff & Audit History */}
                                        {(Array.isArray(viewingTask.auditTrail) ? viewingTask.auditTrail : []).sort((a,b) => safeDate(b.timestamp).getTime() - safeDate(a.timestamp).getTime()).map(log => {
                                            const isHandoff = log.action.includes('Handoff') || log.action.includes('Review');
                                            return (
                                                <div key={log.id} className="flex gap-5 group items-start">
                                                    <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 transition-all ${isHandoff ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-surface-variant/10 border-outline/10 text-on-surface-variant/40'}`}>
                                                        {log.action.includes('Status') ? <RefreshCwIcon className="w-5 h-5" /> : 
                                                         log.action.includes('Assignment') ? <UserPlusIcon className="w-5 h-5" /> :
                                                         log.action.includes('Review') ? <ClipboardCheckIcon className="w-5 h-5" /> :
                                                         <HistoryIcon className="w-5 h-5" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0 pt-1">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isHandoff ? 'text-primary' : 'text-on-surface-variant/40'}`}>{log.action}</span>
                                                            <span className="text-[9px] font-bold text-on-surface-variant/30 uppercase">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                        <p className="text-xs font-bold text-on-surface/60">{log.details}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <img src={log.user.avatarUrl} className="w-4 h-4 rounded-full" />
                                                            <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">Initiated by {log.user.name}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Comments */}
                                        {(Array.isArray(viewingTask.comments) ? viewingTask.comments : []).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(c => (
                                            <div key={c.id} className="flex gap-5 group">
                                                <img src={c.user.avatarUrl} className="h-11 w-11 rounded-2xl object-cover shadow-sm border border-outline/10 shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-3 mb-2 px-1"><span className="text-[10px] font-black text-on-surface uppercase tracking-widest">{c.user.name.split(' ')[0]}</span><span className="text-[9px] font-bold text-on-surface-variant/30 uppercase">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                                                    <div className="p-6 bg-surface rounded-3xl rounded-tl-none border border-outline/20 shadow-md group-hover:border-primary/40 transition-all"><p className="text-sm font-medium text-on-surface leading-relaxed whitespace-pre-wrap">{c.text}</p></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <form onSubmit={(e) => { e.preventDefault(); if(newComment.trim()){ addComment(viewingTask.id, newComment.trim()); setNewComment(''); } }} className="relative shrink-0 pt-4 px-2">
                                        <MentionInput 
                                            value={newComment} 
                                            onChange={setNewComment} 
                                            onSend={() => { if(newComment.trim()){ addComment(viewingTask.id, newComment.trim()); setNewComment(''); } }}
                                            placeholder="Broadcast internal update..." 
                                            suggestions={teamMembers}
                                            isTextArea={true}
                                            rows={3}
                                            className="w-full bg-surface border border-outline/10 rounded-[2rem] p-8 text-base font-medium focus:ring-4 ring-primary/5 outline-none transition-all resize-none shadow-m3-sm"
                                        />
                                        <button type="submit" disabled={!newComment.trim()} className="absolute bottom-10 right-10 p-4 bg-primary text-on-primary rounded-2xl shadow-m3-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-30"><PlusIcon className="w-6 h-6"/></button>
                                    </form>
                                </motion.div>
                            )}

                            {activeTab === 'files' && (
                                <motion.div key="files" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-10 max-w-4xl mx-auto">
                                    <div className="flex items-center justify-between mb-8">
                                        <div>
                                            <h3 className="text-[11px] font-black text-on-surface uppercase tracking-[0.3em]">Asset Repository</h3>
                                            <p className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest">Permanent storage for this transaction</p>
                                        </div>
                                        <button 
                                            onClick={() => vaultInputRef.current?.click()}
                                            disabled={isUploadingFile}
                                            className="px-6 py-3 flex items-center gap-2 bg-primary text-on-primary rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-m3-md hover:scale-105 transition-all disabled:opacity-50"
                                        >
                                            <UploadCloudIcon className="w-4 h-4" /> {isUploadingFile ? 'Syncing...' : 'Deposit Asset'}
                                        </button>
                                        <input type="file" ref={vaultInputRef} className="hidden" onChange={handleVaultUpload} />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(Array.isArray(viewingTask.attachments) ? viewingTask.attachments : []).map(att => (
                                        <div key={att.id} onClick={() => viewFile(att)} className="p-6 bg-surface rounded-[2.2rem] border border-outline/20 shadow-md hover:border-primary/40 transition-all group cursor-pointer relative overflow-hidden">
                                            <div className="flex items-center gap-5 min-w-0">
                                                <div className="p-4 bg-primary/10 rounded-2xl text-primary shadow-inner">
                                                    <FileTextIcon className="w-6 h-6" />
                                                </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-black text-on-surface truncate uppercase tracking-tight">{att.name}</p>
                                                        <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest mt-1.5">{att.fileType} protocol</p>
                                                    </div>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); if(confirm('Detach asset?')) updateTask(viewingTask.id, { attachments: viewingTask.attachments.filter(a => a.id !== att.id) }); }} className="absolute top-4 right-4 p-2 text-on-surface-variant/30 hover:text-danger hover:bg-danger/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {(viewingTask.attachments || []).length === 0 && (
                                        <div className="py-24 flex flex-col items-center justify-center border-4 border-dashed border-outline/5 rounded-[3rem] text-on-surface-variant/20">
                                            <UploadCloudIcon className="w-16 h-16 mb-4 opacity-10" />
                                            <p className="font-black uppercase tracking-[0.2em] text-sm">Vault Initialized</p>
                                            <p className="text-xs font-bold mt-2 opacity-60 text-center">No assets found for this portfolio job.</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'financials' && (
                                <motion.div key="financials" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-12 max-w-4xl mx-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <section className="bg-surface p-10 rounded-[3rem] border border-outline/20 shadow-md relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-700"><TrendingUpIcon className="w-32 h-32 text-success" /></div>
                                            <p className="text-[11px] font-black text-on-surface-variant uppercase tracking-[0.4em] mb-4 opacity-40">Gross GCI</p>
                                            <div className="flex items-baseline gap-4 relative z-10">
                                                <span className="text-3xl font-black text-on-surface tracking-tighter opacity-10">$</span>
                                                <input type="number" value={viewingTask.jobValue || ''} onChange={e => updateTask(viewingTask.id, { jobValue: parseFloat(e.target.value) })} placeholder="0.00" className="bg-transparent border-none text-5xl font-black text-on-surface tracking-tighter focus:ring-0 w-full placeholder:opacity-5" />
                                            </div>
                                        </section>

                                        <section className="p-10 bg-surface rounded-[3rem] border border-outline/20 flex flex-col justify-center shadow-md border-l-[12px] border-l-success">
                                            <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em] opacity-40">Net Project Yield</span>
                                            <span className={`text-4xl font-black tracking-tighter mt-2 ${netValue >= 0 ? 'text-success' : 'text-danger'}`}>
                                                {netValue < 0 && '-'}${Math.abs(netValue).toLocaleString()}
                                            </span>
                                            <p className="text-[9px] font-bold text-on-surface-variant/40 mt-3 uppercase tracking-tight leading-tight">Total revenue minus logged operational expenses</p>
                                        </section>
                                    </div>

                                    {/* Expense Tracking Section */}
                                    <section className="bg-surface rounded-[2.5rem] border border-outline/10 shadow-sm overflow-hidden">
                                        <div className="p-8 border-b border-outline/5 bg-surface-variant/5">
                                            <h3 className="text-[11px] font-black text-on-surface uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                                <DollarSignIcon className="w-4 h-4 text-danger" /> Operational Ledger
                                            </h3>
                                            <form onSubmit={handleAddExpense} className="flex flex-col sm:flex-row gap-3">
                                                <input 
                                                    value={expenseDesc}
                                                    onChange={e => setExpenseDesc(e.target.value)}
                                                    placeholder="Staging, Photography, etc..."
                                                    className="flex-1 bg-surface border border-outline/10 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-2 ring-danger/10 transition-all"
                                                />
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-danger font-black">$</span>
                                                    <input 
                                                        type="number"
                                                        value={expenseAmount}
                                                        onChange={e => setExpenseAmount(e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full sm:w-32 bg-surface border border-outline/10 rounded-2xl pl-8 pr-4 py-3 text-sm font-bold outline-none focus:ring-2 ring-danger/10 transition-all"
                                                    />
                                                </div>
                                                <button type="submit" className="bg-danger text-on-primary px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-m3-sm hover:bg-danger/90 active:scale-95 transition-all">
                                                    Log Entry
                                                </button>
                                            </form>
                                        </div>

                                        <div className="p-4 space-y-2">
                                            {(Array.isArray(viewingTask.expenses) ? viewingTask.expenses : []).map((exp) => (
                                                <div key={exp.id} className="flex items-center justify-between p-4 bg-surface-variant/10 rounded-2xl border border-outline/5 group">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-on-surface uppercase tracking-tight truncate">{exp.description}</p>
                                                        <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">{new Date(exp.date).toLocaleDateString()}</p>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <span className="text-sm font-black text-danger">-${exp.amount.toLocaleString()}</span>
                                                        <button onClick={() => deleteExpenseFromTask(viewingTask.id, exp.id)} className="p-2 text-on-surface-variant/20 hover:text-danger opacity-0 group-hover:opacity-100 transition-all">
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {(viewingTask.expenses || []).length === 0 && (
                                                <div className="py-12 text-center text-on-surface-variant/30 text-[10px] font-black uppercase tracking-widest">
                                                    No expenses recorded.
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </motion.div>
                            )}

                            {activeTab === 'contacts' && (
                                <motion.div key="contacts" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-12 max-w-4xl mx-auto">
                                    <section>
                                        <div className="flex items-center justify-between mb-8 px-2">
                                            <div>
                                                <h3 className="text-[11px] font-black text-on-surface uppercase tracking-[0.3em] mb-1">Team Operatives</h3>
                                                <p className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest">Internal agents assigned to this mission</p>
                                            </div>
                                            <button onClick={() => setIsAssignPickerOpen(!isAssignPickerOpen)} className={`px-4 py-2 flex items-center gap-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${isAssignPickerOpen ? 'bg-primary text-on-primary border-primary shadow-m3-sm' : 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10'}`}>
                                                <UserPlusIcon className="w-3.5 h-3.5" /> Manage Team
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {taskAssignees.map(user => (
                                                <div key={user.id} className="flex items-center gap-4 p-4 bg-surface border border-outline/10 rounded-3xl shadow-sm transition-all hover:border-primary/20 group">
                                                    <img src={user.avatarUrl} className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-outline/5" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-black text-on-surface truncate uppercase tracking-tight leading-none mb-1">{user.name}</p>
                                                        <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest truncate">{user.role || 'Primary Agent'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {taskAssignees.length === 0 && (
                                                <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-outline/5 rounded-3xl text-on-surface-variant/20">
                                                    <p className="text-[10px] font-black uppercase tracking-widest">No agents assigned</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>

                                    <section>
                                        <div className="flex items-center justify-between mb-8 px-2">
                                            <div>
                                                <h3 className="text-[11px] font-black text-on-surface uppercase tracking-[0.3em] mb-1">Network Directory</h3>
                                                <p className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest">Enlist internal team members or external stakeholders</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {projectTeam && (
                                                    <button onClick={() => { setIsEnlistingTeam(!isEnlistingTeam); setIsAddingManual(false); }} className={`px-4 py-2 flex items-center gap-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${isEnlistingTeam ? 'bg-secondary text-on-primary border-secondary shadow-m3-sm' : 'bg-secondary/5 text-secondary border-secondary/20 hover:bg-secondary/10'}`}>
                                                        <SparklesIcon className="w-3.5 h-3.5" /> Enlist Team Member
                                                    </button>
                                                )}
                                                <button onClick={() => { setIsAddingManual(!isAddingManual); setIsEnlistingTeam(false); }} className={`px-4 py-2 flex items-center gap-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${isAddingManual ? 'bg-primary text-on-primary border-primary shadow-m3-sm' : 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10'}`}>
                                                    <PlusIcon className="w-3.5 h-3.5" /> Initialize Node
                                                </button>
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isEnlistingTeam && projectTeam && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-10 overflow-hidden">
                                                    <div className="p-8 bg-secondary/[0.03] border border-secondary/10 rounded-[2.5rem] space-y-6">
                                                        <h4 className="text-[10px] font-black text-secondary uppercase tracking-[0.4em]">Available Team Stakeholders</h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {availableTeamStakeholders.map(s => (
                                                                <button 
                                                                    key={s.id} 
                                                                    onClick={() => handleEnlistStakeholder(s)}
                                                                    className="p-4 rounded-2xl bg-surface border border-secondary/20 hover:border-secondary hover:shadow-m3-sm transition-all flex items-center gap-4 text-left group"
                                                                >
                                                                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-black text-xs group-hover:scale-110 transition-transform">
                                                                        {s.name.charAt(0)}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-[11px] font-black text-on-surface truncate uppercase">{s.name}</p>
                                                                        <p className="text-[9px] font-bold text-on-surface-variant/40 truncate uppercase tracking-widest">{s.role}</p>
                                                                    </div>
                                                                    <PlusIcon className="w-4 h-4 text-secondary opacity-30 group-hover:opacity-100" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {isAddingManual && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-10 overflow-hidden">
                                                    <form onSubmit={handleAddManualContact} className="p-8 bg-surface rounded-[2.5rem] border border-primary/20 shadow-m3-md animate-scale-in">
                                                        <div className="flex justify-between items-center mb-6">
                                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Node Initialization</h4>
                                                            <button type="button" onClick={() => setIsAddingManual(false)} className="text-on-surface-variant/30 hover:text-danger"><XIcon className="h-4 w-4" /></button>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                                            <input required value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} placeholder="Identity Name" className="w-full bg-surface-variant/30 border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                                                            <input required value={newContact.role} onChange={e => setNewContact({...newContact, role: e.target.value})} placeholder="Operational Role" className="w-full bg-surface-variant/30 border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                                                            <input value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} placeholder="Email Uplink" className="w-full bg-surface-variant/30 border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                                                            <input value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} placeholder="Phone Uplink" className="w-full bg-surface-variant/30 border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold outline-none" />
                                                        </div>
                                                        <div className="flex justify-end gap-3">
                                                            <button type="button" onClick={() => setIsAddingManual(false)} className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-variant/50 rounded-xl">Discard</button>
                                                            <button type="submit" className="px-8 py-3 bg-primary text-on-primary rounded-xl text-[10px] font-black uppercase tracking-widest shadow-m3-sm hover:bg-primary/90">Initialize Node</button>
                                                        </div>
                                                    </form>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Contacts Semi-List (Condensed) */}
                                        <div className="flex flex-col gap-2">
                                            <AnimatePresence initial={false} mode="popLayout">
                                                {(Array.isArray(viewingTask.contacts) ? viewingTask.contacts : []).map(c => {
                                                    const isExpanded = expandedContactId === c.id;
                                                    return (
                                                        <motion.div 
                                                            key={c.id} 
                                                            layout
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.95 }}
                                                            className={`bg-surface border transition-all overflow-hidden ${isExpanded ? 'rounded-[1.8rem] border-primary/20 shadow-m3-md' : 'rounded-2xl border-outline/10 hover:border-outline/20 hover:bg-surface-variant/5 shadow-sm'}`}
                                                        >
                                                            <div 
                                                                onClick={() => toggleContactExpand(c.id)}
                                                                className="flex items-center gap-4 p-3 cursor-pointer select-none"
                                                            >
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] border shrink-0 transition-colors ${isExpanded ? 'bg-primary text-on-primary border-primary' : 'bg-surface-variant text-on-surface-variant border-outline/10'}`}>
                                                                    {c.name.charAt(0)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[12px] font-black text-on-surface uppercase truncate leading-none mb-0.5">{c.name}</p>
                                                                    <p className="text-[9px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest truncate">{c.role}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {isExpanded ? <ChevronUpIcon className="w-4 h-4 text-primary" /> : <ChevronDownIcon className="w-4 h-4 text-on-surface-variant/20" />}
                                                                </div>
                                                            </div>

                                                            <AnimatePresence>
                                                                {isExpanded && (
                                                                    <motion.div 
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        className="border-t border-outline/5 bg-surface-variant/[0.02] p-4"
                                                                    >
                                                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                                                            <a 
                                                                                href={`tel:${c.phone}`} 
                                                                                className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl transition-all border ${c.phone ? 'bg-success/5 text-success border-success/10 hover:bg-success hover:text-white' : 'bg-surface-variant/10 text-on-surface-variant/20 border-transparent pointer-events-none'}`}
                                                                            >
                                                                                <PhoneIcon className="w-4 h-4" />
                                                                                <span className="text-[9px] font-black uppercase tracking-widest">{c.phone || 'No Phone'}</span>
                                                                            </a>
                                                                            <a 
                                                                                href={`mailto:${c.email}`} 
                                                                                className={`flex flex-col items-center justify-center gap-1.5 py-4 rounded-2xl transition-all border ${c.email ? 'bg-primary/5 text-primary border-primary/10 hover:bg-primary hover:text-white' : 'bg-surface-variant/10 text-on-surface-variant/20 border-transparent pointer-events-none'}`}
                                                                            >
                                                                                <MailIcon className="w-4 h-4" />
                                                                                <span className="text-[9px] font-black uppercase tracking-widest truncate max-w-full px-2">{c.email || 'No Email'}</span>
                                                                            </a>
                                                                        </div>
                                                                        <div className="flex justify-end">
                                                                            <button 
                                                                                onClick={() => updateTask(viewingTask.id, { contacts: (viewingTask.contacts || []).filter(x => x.id !== c.id) })}
                                                                                className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-danger hover:bg-danger/5 rounded-xl transition-colors"
                                                                            >
                                                                                <TrashIcon className="w-3.5 h-3.5" /> Remove Node
                                                                            </button>
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </motion.div>
                                                    );
                                                })}
                                            </AnimatePresence>

                                            {(viewingTask.contacts || []).length === 0 && !isAddingManual && !isEnlistingTeam && (
                                                <div className="col-span-full py-20 flex flex-col items-center justify-center border-4 border-dashed border-outline/5 rounded-[3rem] text-on-surface-variant/20">
                                                    <UsersIcon className="w-16 h-16 mb-4 opacity-10" />
                                                    <p className="font-black uppercase tracking-[0.2em] text-sm text-center">Graph Silent</p>
                                                    <p className="text-xs font-bold mt-2 opacity-60 text-center">Map internal and external nodes to this transaction</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Premium Sidebar */}
                    <div className="hidden lg:flex w-[360px] border-l border-outline/20 bg-surface flex-col overflow-y-auto custom-scrollbar shrink-0">
                        <div className="p-10 space-y-16">
                            <section className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.3em]">Pipeline State</h4>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => requestReview(viewingTask.id)}
                                            className="p-2.5 bg-primary text-on-primary rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
                                            title="Request Review"
                                        >
                                            <ClipboardCheckIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-surface-variant/30 rounded-2xl border border-outline/20 p-1">
                                    <select value={viewingTask.status} onChange={e => updateTask(viewingTask.id, { status: e.target.value })} className="w-full bg-transparent border-none text-xs font-black text-primary uppercase tracking-widest focus:ring-0 cursor-pointer p-4">
                                        {(taskProject?.workflow || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                {/* Suggested Reviewers */}
                                {projectMembers.some(m => m.role?.toLowerCase().includes('lead') || m.role?.toLowerCase().includes('manager')) && (
                                    <div className="mt-4 pt-4 border-t border-outline/5">
                                        <p className="text-[8px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mb-3">Suggested Reviewers</p>
                                        <div className="flex flex-wrap gap-2">
                                            {projectMembers
                                                .filter(m => m.role?.toLowerCase().includes('lead') || m.role?.toLowerCase().includes('manager'))
                                                .map(m => (
                                                    <button 
                                                        key={m.id} 
                                                        onClick={() => requestReview(viewingTask.id, m.id)}
                                                        className="flex items-center gap-2 p-1.5 pr-3 rounded-full bg-surface border border-outline/10 hover:border-primary/40 transition-all group"
                                                        title={`Request review from ${m.name}`}
                                                    >
                                                        <img src={m.avatarUrl} className="w-5 h-5 rounded-full" />
                                                        <span className="text-[9px] font-black uppercase tracking-tight text-on-surface-variant group-hover:text-primary">{m.name.split(' ')[0]}</span>
                                                    </button>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )}
                            </section>

                            <section className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.3em]">Command Center</h4>
                                    <button onClick={() => setIsAssignPickerOpen(!isAssignPickerOpen)} className={`p-2 rounded-xl transition-all border ${isAssignPickerOpen ? 'bg-primary text-on-primary border-primary' : 'text-primary bg-primary/10 border-primary/20 hover:bg-primary/20'}`}><PlusIcon className="w-4 h-4" /></button>
                                </div>
                                <AnimatePresence>
                                    {isAssignPickerOpen && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-surface p-6 rounded-[2.5rem] border border-outline/10 mb-8 overflow-hidden shadow-inner space-y-3">
                                            <p className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest px-1">Enlist Operatives</p>
                                            <div className="flex flex-wrap gap-2.5">
                                                {projectMembers.map(m => (
                                                    <button key={m.id} onClick={() => { const cur = viewingTask.assigneeIds || []; updateTask(viewingTask.id, { assigneeIds: cur.includes(m.id) ? cur.filter(id => id !== m.id) : [...cur, m.id] }); }} className={`flex items-center gap-2 p-1.5 pr-4 rounded-full border transition-all ${viewingTask.assigneeIds?.includes(m.id) ? 'bg-primary border-primary text-on-primary shadow-sm' : 'bg-surface border-outline/20 text-on-surface hover:border-primary/40'}`}><img src={m.avatarUrl} className="w-6 h-6 rounded-full" /><span className="text-[10px] font-black uppercase tracking-tight">{m.name.split(' ')[0]}</span></button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                                <div className="space-y-4">
                                    {taskAssignees.map(user => (
                                        <div key={user.id} className="flex items-center gap-4 p-4 bg-surface border border-outline/10 rounded-3xl shadow-sm transition-all hover:border-primary/20">
                                            <img src={user.avatarUrl} className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-outline/5" />
                                            <div className="min-w-0 flex-1"><p className="text-xs font-black text-on-surface truncate uppercase tracking-tight leading-none mb-1">{user.name}</p><p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest truncate">{user.role || 'Primary Agent'}</p></div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section>
                                <h4 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mb-8">Critical Metrics</h4>
                                <div className="space-y-3">
                                    <PropertyRow label="Priority" icon={<TrendingUpIcon className="w-4 h-4" />} isStacked>
                                        <select value={viewingTask.priority} onChange={e => updateTask(viewingTask.id, { priority: e.target.value as TaskPriority })} className="w-full bg-transparent p-0 text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer">{Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}</select>
                                    </PropertyRow>
                                    <PropertyRow label="Start Date" icon={<CalendarClockIcon className="w-4 h-4" />} isStacked>
                                        <input type="date" value={toInputDateString(viewingTask.startDate)} onChange={e => updateTask(viewingTask.id, { startDate: e.target.value ? new Date(e.target.value) : undefined })} className="w-full bg-transparent p-0 text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer" />
                                    </PropertyRow>
                                    <PropertyRow label="Due Date" icon={<CalendarClockIcon className="w-4 h-4" />} isStacked>
                                        <input type="date" value={toInputDateString(viewingTask.dueDate)} onChange={e => updateTask(viewingTask.id, { dueDate: e.target.value ? new Date(e.target.value) : undefined })} className="w-full bg-transparent p-0 text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer" />
                                    </PropertyRow>
                                    <PropertyRow label="Target Date" icon={<CalendarClockIcon className="w-4 h-4" />} isStacked>
                                        <input type="date" value={toInputDateString(viewingTask.targetDate)} onChange={e => updateTask(viewingTask.id, { targetDate: e.target.value ? new Date(e.target.value) : undefined })} className="w-full bg-transparent p-0 text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer" />
                                    </PropertyRow>
                                    <PropertyRow label="Event Date" icon={<CalendarClockIcon className="w-4 h-4" />} isStacked>
                                        <input type="date" value={toInputDateString(viewingTask.eventDate)} onChange={e => updateTask(viewingTask.id, { eventDate: e.target.value ? new Date(e.target.value) : undefined })} className="w-full bg-transparent p-0 text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer" />
                                    </PropertyRow>
                                    <PropertyRow label="Repeating" icon={<RefreshCwIcon className="w-4 h-4" />} isStacked>
                                        <div className="space-y-2">
                                            <select 
                                                value={viewingTask.recurrence || 'none'} 
                                                onChange={e => updateTask(viewingTask.id, { recurrence: e.target.value as Task['recurrence'] })} 
                                                className="w-full bg-transparent p-0 text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer"
                                            >
                                                <option value="none">None</option>
                                                <option value="daily">Daily</option>
                                                <option value="weekly">Weekly</option>
                                                <option value="monthly">Monthly</option>
                                            </select>
                                            {viewingTask.recurrence && viewingTask.recurrence !== 'none' && (
                                                <div className="flex flex-col gap-2">
                                                    <div className="text-[9px] text-primary/70 font-bold italic">
                                                        Next: {(() => {
                                                            const date = safeDate(viewingTask.dueDate || viewingTask.startDate || new Date());
                                                            if (viewingTask.recurrence === 'daily') date.setDate(date.getDate() + 1);
                                                            else if (viewingTask.recurrence === 'weekly') date.setDate(date.getDate() + 7);
                                                            else if (viewingTask.recurrence === 'monthly') date.setMonth(date.getMonth() + 1);
                                                            return date.toLocaleDateString();
                                                        })()}
                                                    </div>
                                                    <button 
                                                        onClick={async () => {
                                                            await recurTask(viewingTask.id);
                                                        }}
                                                        className="text-[8px] bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 rounded-md transition-colors font-black uppercase tracking-widest w-fit"
                                                    >
                                                        Recur Now
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </PropertyRow>
                                    <div className="pt-4 border-t border-outline/10">
                                        <button 
                                            onClick={async () => {
                                                const project = projects.find(p => p.id === viewingTask.projectId);
                                                if (project?.teamId) {
                                                    await triggerDailySummary(project.teamId);
                                                } else {
                                                    alert('No team associated with this project.');
                                                }
                                            }}
                                            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-surface-variant/20 hover:bg-surface-variant/40 text-on-surface-variant text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            <RefreshCwIcon className="w-3 h-3" />
                                            Trigger Daily Summary
                                        </button>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default TaskDetailModal;