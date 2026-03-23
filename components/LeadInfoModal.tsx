
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { 
    XIcon, PhoneIcon, MailIcon, MessageSquareIcon, 
    ChevronRightIcon, DollarSignIcon, TagIcon, 
    UsersIcon,
    HistoryIcon, ListTodoIcon, PlusIcon, TrashIcon,
    SparklesIcon, EditIcon
} from './icons';
import { motion, Variants, AnimatePresence } from 'framer-motion';
import { Comment } from '../types';
import { AnimatedCheckbox } from './AnimatedCheckbox';

const backdropVariants: Variants = {
  visible: { opacity: 1, pointerEvents: "auto" },
  hidden: { opacity: 0, pointerEvents: "none" },
};

const modalVariants: Variants = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: "0%",
    opacity: 1,
    transition: { type: "spring", stiffness: 350, damping: 35 },
  },
  exit: { x: "100%", opacity: 0, transition: { duration: 0.2 }, pointerEvents: "none" },
};

const EditableNote: React.FC<{ 
    comment: Comment; 
    onUpdate: (id: string, text: string) => void;
    onDelete: (id: string) => void;
}> = ({ comment, onUpdate, onDelete }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(comment.text);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing) inputRef.current?.focus();
    }, [isEditing]);

    const handleSave = () => {
        if (text.trim() && text.trim() !== comment.text) {
            onUpdate(comment.id, text.trim());
        }
        setIsEditing(false);
    };

    return (
        <div className="flex gap-4 group">
            <img src={comment.user.avatarUrl} className="w-10 h-10 rounded-2xl object-cover shadow-sm border border-outline/10 flex-shrink-0" />
            <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-on-surface uppercase tracking-wide">{comment.user.name.split(' ')[0]}</span>
                        <span className="text-[8px] font-bold text-on-surface-variant/30 uppercase tracking-wider">{new Date(comment.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setIsEditing(true)} className="p-1 text-on-surface-variant/40 hover:text-primary"><EditIcon className="w-3 h-3" /></button>
                        <button onClick={() => onDelete(comment.id)} className="p-1 text-on-surface-variant/40 hover:text-danger"><TrashIcon className="w-3 h-3" /></button>
                    </div>
                </div>
                {isEditing ? (
                    <div className="mt-2">
                        <textarea 
                            ref={inputRef}
                            value={text}
                            onChange={e => setText(e.target.value)}
                            onBlur={handleSave}
                            className="w-full bg-surface border-2 border-primary/20 rounded-2xl p-4 text-sm font-medium outline-none shadow-inner"
                            rows={3}
                        />
                    </div>
                ) : (
                    <div className="p-4 bg-surface-variant/30 rounded-[1.5rem] rounded-tl-none border border-outline/5">
                        <p className="text-sm font-medium text-on-surface leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const LeadInfoModal: React.FC = () => {
  const { viewingLead: lead, closeLeadInfo, projects, updateTask, addComment, addSubtask, deleteSubtask, updateSubtask, openAiSubtaskGenerator } = useAppContext();
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'tasks'>('overview');
  const [noteText, setNoteText] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  
  // Lead Identity Edit State
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState('');

  const project = useMemo(() => lead ? projects.find(p => p.id === lead.projectId) : null, [lead, projects]);
  const contact = lead?.contacts?.[0];

  // Initialize edit form when opening lead or switching to edit mode
  useEffect(() => {
    if (lead && contact) {
        setEditName(contact.name || lead.title.split('(')[0].trim());
        setEditEmail(contact.email || '');
        setEditPhone(contact.phone || '');
        setEditRole(contact.role || (lead.taskType === 'Listing' ? 'Seller' : 'Buyer'));
    }
  }, [lead, contact, isEditingIdentity]);

  if (!lead) return null;

  const handleStatusChange = async (newStatus: string) => {
      await updateTask(lead.id, { status: newStatus });
  };

  const handleSaveIdentity = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editName.trim()) return;

      const sourceTag = lead.tags?.[1] || 'Web API';
      const newTitle = `${editName.trim()} (${sourceTag})`;
      
      const updatedContact = {
          ...(contact || { id: Math.random().toString(36).substr(2, 9) }),
          name: editName.trim(),
          email: editEmail.trim(),
          phone: editPhone.trim(),
          role: editRole.trim()
      };

      await updateTask(lead.id, {
          title: newTitle,
          contacts: [updatedContact]
      });

      setIsEditingIdentity(false);
  };

  const handleAddNote = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!noteText.trim()) return;
      await addComment(lead.id, noteText.trim());
      setNoteText('');
  };

  const handleQuickLog = async (action: string) => {
      await addComment(lead.id, `[Action Logged] ${action}`);
  };

  const handleUpdateComment = async (commentId: string, newText: string) => {
      const updatedComments = (lead.comments || []).map(c => 
          c.id === commentId ? { ...c, text: newText } : c
      );
      await updateTask(lead.id, { comments: updatedComments });
  };

  const handleDeleteComment = async (commentId: string) => {
      if (!confirm('Delete this record?')) return;
      const updatedComments = (lead.comments || []).filter(c => c.id !== commentId);
      await updateTask(lead.id, { comments: updatedComments });
  };

  const handleAddTask = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!taskTitle.trim()) return;
      await addSubtask(lead.id, taskTitle.trim());
      setTaskTitle('');
  };

  const STAGES = [
      { id: 'backlog', label: 'Inbound' },
      { id: 'todo', label: 'Attempting' },
      { id: 'inprogress', label: 'Engaged' },
      { id: 'inreview', label: 'Appointment' },
      { id: 'done', label: 'Active' }
  ];

  const subtasks = lead.subtasks || [];
  const completedCount = subtasks.filter(s => s.isCompleted).length;

  return (
    <motion.div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-stretch justify-end"
      onClick={closeLeadInfo}
      variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
    >
      <motion.div
        className="bg-surface border-l border-outline/20 w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden h-full"
        onClick={(e) => e.stopPropagation()}
        variants={modalVariants}
      >
        {/* Header Section */}
        <div className="p-8 border-b border-outline/10 bg-surface/80 backdrop-blur-md sticky top-0 z-30 shrink-0">
           <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-5 min-w-0">
                    <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center text-primary border-2 border-primary/20 shadow-sm shrink-0">
                        <span className="text-2xl font-black uppercase">{lead.title.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-3xl font-black text-on-surface tracking-tighter uppercase leading-none mb-2 truncate">{lead.title.split('(')[0].trim()}</h2>
                        <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 rounded-lg bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest">{contact?.role || (lead.taskType === 'Listing' ? 'Seller' : 'Buyer')}</span>
                            <span className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-widest">Captured {new Date(lead.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <button onClick={closeLeadInfo} className="p-4 bg-surface-variant/30 hover:bg-danger/10 hover:text-danger rounded-3xl transition-all border border-outline/10">
                    <XIcon className="h-6 w-6" />
                </button>
           </div>

           {/* Tab Switcher */}
           <div className="flex items-center gap-2 p-1 bg-surface-variant/40 rounded-2xl border border-outline/10">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                    <UsersIcon className="w-4 h-4" /> Identity
                </button>
                <button 
                    onClick={() => setActiveTab('activity')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'activity' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                    <HistoryIcon className="w-4 h-4" /> Timeline
                </button>
                <button 
                    onClick={() => setActiveTab('tasks')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'tasks' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                    <ListTodoIcon className="w-4 h-4" /> Checklist
                </button>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-12">
            
            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div key="overview" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-12">
                        
                        {/* Identity Toggle Section */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em] flex items-center gap-2">
                                    <TagIcon className="w-4 h-4 text-primary" /> Contact Record
                                </h3>
                                <button 
                                    onClick={() => setIsEditingIdentity(!isEditingIdentity)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                                        ${isEditingIdentity ? 'bg-danger/10 text-danger border border-danger/20' : 'bg-primary/10 text-primary border border-primary/20'}
                                    `}
                                >
                                    {isEditingIdentity ? <XIcon className="w-3 h-3" /> : <EditIcon className="w-3 h-3" />}
                                    {isEditingIdentity ? 'Cancel' : 'Edit Identity'}
                                </button>
                            </div>

                            {isEditingIdentity ? (
                                <form onSubmit={handleSaveIdentity} className="p-6 bg-surface-variant/10 rounded-[2.5rem] border border-outline/10 space-y-6 animate-scale-in">
                                    <div>
                                        <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 block px-1">Full Name</label>
                                        <input 
                                            type="text" 
                                            value={editName} 
                                            onChange={e => setEditName(e.target.value)} 
                                            className="w-full bg-surface border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-primary/20 outline-none"
                                            required
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 block px-1">Email</label>
                                            <input 
                                                type="email" 
                                                value={editEmail} 
                                                onChange={e => setEditEmail(e.target.value)} 
                                                className="w-full bg-surface border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-primary/20 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 block px-1">Phone</label>
                                            <input 
                                                type="tel" 
                                                value={editPhone} 
                                                onChange={e => setEditPhone(e.target.value)} 
                                                className="w-full bg-surface border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-primary/20 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 block px-1">Role</label>
                                        <input 
                                            type="text" 
                                            value={editRole} 
                                            onChange={e => setEditRole(e.target.value)} 
                                            placeholder="Seller, Buyer, etc."
                                            className="w-full bg-surface border border-outline/10 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 ring-primary/20 outline-none"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 pt-2">
                                        <button 
                                            type="submit"
                                            className="px-8 py-3 bg-primary text-on-primary rounded-xl text-[10px] font-black uppercase tracking-widest shadow-m3-sm hover:bg-primary/90 transition-all"
                                        >
                                            Sync Record
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="grid grid-cols-3 gap-4">
                                    <a href={`tel:${contact?.phone || ''}`} className="flex flex-col items-center justify-center p-6 bg-success/5 border-2 border-success/10 rounded-[2.5rem] hover:bg-success/10 hover:border-success/30 transition-all group">
                                        <div className="p-3 bg-success text-white rounded-2xl shadow-m3-sm mb-3 group-hover:scale-110 transition-transform">
                                            <PhoneIcon className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-black text-success uppercase tracking-widest">Call</span>
                                    </a>
                                    <button onClick={() => handleQuickLog('SMS Sent')} className="flex flex-col items-center justify-center p-6 bg-primary/5 border-2 border-primary/10 rounded-[2.5rem] hover:bg-primary/10 hover:border-primary/30 transition-all group">
                                        <div className="p-3 bg-primary text-white rounded-2xl shadow-m3-sm mb-3 group-hover:scale-110 transition-transform">
                                            <MessageSquareIcon className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">SMS</span>
                                    </button>
                                    <a href={`mailto:${contact?.email || ''}`} className="flex flex-col items-center justify-center p-6 bg-secondary/5 border-2 border-secondary/10 rounded-[2.5rem] hover:bg-secondary/10 hover:border-secondary/30 transition-all group">
                                        <div className="p-3 bg-secondary text-white rounded-2xl shadow-m3-sm mb-3 group-hover:scale-110 transition-transform">
                                            <MailIcon className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Email</span>
                                    </a>
                                </div>
                            )}
                        </section>

                        {/* Pipeline Stage Control */}
                        <section>
                            <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                <ChevronRightIcon className="w-4 h-4" /> Pipeline Trajectory
                            </h3>
                            <div className="grid grid-cols-5 gap-1.5 p-1.5 bg-surface-variant/20 rounded-[2rem] border border-outline/10">
                                {STAGES.map((s) => {
                                    const isActive = lead.status === s.id;
                                    return (
                                        <button 
                                            key={s.id}
                                            onClick={() => handleStatusChange(s.id)}
                                            className={`py-3 px-1 rounded-[1.5rem] text-[9px] font-black uppercase tracking-tighter transition-all
                                                ${isActive ? 'bg-primary text-on-primary shadow-m3-sm scale-105 z-10' : 'text-on-surface-variant/40 hover:bg-surface hover:text-primary'}
                                            `}
                                        >
                                            {s.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Financials & Source */}
                        <section className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="p-6 bg-surface-variant/10 rounded-[2.5rem] border border-outline/10">
                                <p className="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <TagIcon className="w-3 h-3" /> Lead Context
                                </p>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest mb-1">Source Agent</p>
                                        <p className="text-sm font-black text-on-surface uppercase">{lead.tags?.[1] || 'Web API Intake'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest mb-1">Destination Portfolio</p>
                                        <p className="text-sm font-black text-primary uppercase truncate">{project?.name || 'Knowledge Hub'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-surface-variant/10 rounded-[2.5rem] border border-outline/10">
                                <p className="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <DollarSignIcon className="w-3 h-3" /> Growth Target
                                </p>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest mb-1">Projected GCI</p>
                                        <p className="text-2xl font-black text-success tracking-tighter">${(lead.jobValue || 0).toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest mb-1">Initial Priority</p>
                                        <p className="text-sm font-black text-on-surface uppercase">{lead.priority}</p>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </motion.div>
                )}

                {activeTab === 'activity' && (
                    <motion.div key="activity" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8 h-full flex flex-col">
                        <section className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em] flex items-center gap-2">
                                    <HistoryIcon className="w-4 h-4 text-primary" /> Relationship Timeline
                                </h3>
                                <div className="flex gap-2">
                                    <button onClick={() => handleQuickLog('Called - No Answer')} className="px-3 py-1 bg-surface border border-outline/20 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all">Quick Log: Call</button>
                                    <button onClick={() => handleQuickLog('Meeting Completed')} className="px-3 py-1 bg-surface border border-outline/20 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all">Quick Log: Met</button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
                                {(lead.comments || []).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((comment) => (
                                    <EditableNote 
                                        key={comment.id} 
                                        comment={comment} 
                                        onUpdate={handleUpdateComment} 
                                        onDelete={handleDeleteComment} 
                                    />
                                ))}
                                {(lead.comments || []).length === 0 && (
                                    <div className="py-20 text-center opacity-20">
                                        <MessageSquareIcon className="w-16 h-16 mx-auto mb-4" />
                                        <p className="text-sm font-black uppercase tracking-widest">No history recorded yet</p>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleAddNote} className="mt-8 relative group">
                                <textarea 
                                    value={noteText}
                                    onChange={e => setNoteText(e.target.value)}
                                    placeholder="Type a note or follow-up summary..."
                                    className="w-full bg-surface-variant/20 border border-outline/10 rounded-[2rem] p-6 text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all resize-none shadow-inner"
                                    rows={3}
                                />
                                <button 
                                    type="submit"
                                    disabled={!noteText.trim()}
                                    className="absolute bottom-4 right-4 p-3 bg-primary text-on-primary rounded-2xl shadow-m3-md hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </form>
                        </section>
                    </motion.div>
                )}

                {activeTab === 'tasks' && (
                    <motion.div key="tasks" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8 h-full flex flex-col">
                        <section className="flex-1 flex flex-col min-h-0">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em] flex items-center gap-2">
                                        <ListTodoIcon className="w-4 h-4 text-primary" /> Follow-up Checklist
                                    </h3>
                                    <p className="text-[10px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-widest">
                                        {completedCount} of {subtasks.length} actions complete
                                    </p>
                                </div>
                                <button 
                                    onClick={() => openAiSubtaskGenerator(lead)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary rounded-xl text-[9px] font-black uppercase tracking-widest border border-primary/20 hover:bg-primary/20 transition-all"
                                >
                                    <SparklesIcon className="w-3.5 h-3.5" /> Magic Plan
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                                {subtasks.map((st) => (
                                    <div key={st.id} className="group flex items-center gap-4 p-4 bg-surface border border-outline/10 rounded-2xl shadow-sm hover:border-primary/30 transition-all">
                                        <AnimatedCheckbox 
                                            checked={st.isCompleted} 
                                            onChange={() => updateSubtask(lead.id, st.id, { isCompleted: !st.isCompleted })} 
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold truncate ${st.isCompleted ? 'line-through text-on-surface-variant/40' : 'text-on-surface'}`}>
                                                {st.title}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => deleteSubtask(lead.id, st.id)}
                                            className="p-2 text-on-surface-variant/20 hover:text-danger rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {subtasks.length === 0 && (
                                    <div className="py-24 text-center opacity-10 grayscale">
                                        <ListTodoIcon className="w-20 h-20 mx-auto mb-4" />
                                        <p className="text-sm font-black uppercase tracking-widest">No follow-up planned</p>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleAddTask} className="mt-8 flex gap-3">
                                <input 
                                    type="text" 
                                    value={taskTitle}
                                    onChange={e => setTaskTitle(e.target.value)}
                                    placeholder="Add next follow-up action..."
                                    className="flex-1 bg-surface-variant/30 border border-outline/10 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                />
                                <button 
                                    type="submit"
                                    disabled={!taskTitle.trim()}
                                    className="p-4 bg-primary text-on-primary rounded-2xl shadow-m3-md hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                                >
                                    <PlusIcon className="w-6 h-6" />
                                </button>
                            </form>
                        </section>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>

        {/* Global Action Footer */}
        <div className="p-8 border-t border-outline/10 bg-surface flex items-center gap-4 shrink-0">
            <button className="flex-1 px-6 py-4 text-xs font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-variant/30 rounded-2xl transition-all border border-outline/10">
                Archive lead
            </button>
            <button className="flex-[2] flex items-center justify-center gap-3 px-10 py-5 bg-primary text-on-primary rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-m3-lg hover:scale-105 active:scale-95 transition-all">
                Convert to client <ChevronRightIcon className="w-5 h-5" />
            </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LeadInfoModal;
