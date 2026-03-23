
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { TaskPriority, User } from '../types';
import { XIcon, PlusIcon, PhoneIcon, MailIcon, BriefcaseIcon, UsersIcon, FolderKanbanIcon, TagIcon } from './icons';
import { motion, Variants } from 'framer-motion';

const backdropVariants: Variants = {
  visible: { opacity: 1, pointerEvents: "auto" },
  hidden: { opacity: 0, pointerEvents: "none" },
};

const modalVariants: Variants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: "0%",
    opacity: 1,
    transition: { type: "spring", stiffness: 350, damping: 35 },
  },
  exit: { y: "100%", opacity: 0, transition: { duration: 0.2 }, pointerEvents: "none" },
};

const SOURCES = ['Zillow', 'Realtor.com', 'Referral', 'Google', 'Facebook', 'Open House', 'Cold Call', 'Other'];

const LeadCreateModal: React.FC = () => {
  const { closeCreateLeadModal, addTask, projects, allUsers, currentUser } = useAppContext();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState(SOURCES[0]);
  const [leadType, setLeadType] = useState<'Listing' | 'Consult'>('Listing');
  const [targetProjectId, setTargetProjectId] = useState(projects[0]?.id || '');
  const [jobValue, setJobValue] = useState('');
  const [assigneeId, setAssigneeId] = useState(currentUser?.id || '');
  const [isLoading, setIsLoading] = useState(false);

  const targetProject = useMemo(() => projects.find(p => p.id === targetProjectId), [projects, targetProjectId]);
  
  const projectMembers = useMemo(() => {
    if (!targetProject) return [];
    return (targetProject.memberIds || []).map(id => allUsers.find(u => u.id === id)).filter((u): u is User => !!u);
  }, [targetProject, allUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !targetProjectId) return;

    setIsLoading(true);
    try {
        const fullName = `${firstName} ${lastName}`.trim();
        const contact = {
            id: Math.random().toString(36).substr(2, 9),
            name: fullName,
            role: leadType === 'Listing' ? 'Seller' : 'Buyer',
            email: email.trim(),
            phone: phone.trim()
        };

        await addTask({
            title: `${fullName} (${source})`,
            description: `Intake Source: ${source}\nType: ${leadType}\nLead created via Command Intake Protocol.`,
            projectId: targetProjectId,
            taskType: leadType,
            tags: ['Lead', source],
            status: 'backlog', // Critical: Forces lead into "Inbound" stage of the pipeline
            priority: TaskPriority.HIGH,
            assigneeIds: assigneeId ? [assigneeId] : [],
            contacts: [contact],
            jobValue: jobValue ? parseFloat(jobValue) : 0,
            dueDate: new Date(), 
            order: Date.now()
        });
        closeCreateLeadModal();
    } catch (err) {
        console.error(err);
        alert("Failed to intake lead. Check connection.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={closeCreateLeadModal}
      variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
    >
      <motion.div
        className="bg-surface border border-outline/30 rounded-t-[3rem] sm:rounded-[3rem] w-full h-[95vh] sm:h-auto max-w-4xl flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        variants={modalVariants}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-8 border-b border-outline/10 flex justify-between items-center bg-surface/80 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-primary text-on-primary shadow-m3-md">
                    <UsersIcon className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-on-surface uppercase tracking-tight leading-none">Lead Command Intake</h2>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Zero Latency Pipeline
                    </p>
                </div>
            </div>
            <button type="button" onClick={closeCreateLeadModal} className="p-4 bg-surface-variant/30 hover:bg-danger/10 hover:text-danger rounded-3xl transition-all border border-outline/10">
              <XIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10 pb-24">
            
            {/* Contact Information */}
            <section>
                <h4 className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4" /> Personal Identity
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="text-[10px] font-black text-on-surface uppercase tracking-widest mb-2 block">First Name</label>
                        <input autoFocus type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="John" className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-on-surface uppercase tracking-widest mb-2 block">Last Name</label>
                        <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-on-surface uppercase tracking-widest mb-2 block">Email Address</label>
                        <div className="relative">
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all" />
                            <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-40" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-on-surface uppercase tracking-widest mb-2 block">Phone Number</label>
                        <div className="relative">
                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all" />
                            <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-40" />
                        </div>
                    </div>
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Qualification Details */}
                <section className="space-y-8">
                    <h4 className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                        <TagIcon className="w-4 h-4" /> Qualification
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <button type="button" onClick={() => setLeadType('Listing')} className={`p-4 rounded-2xl border-2 transition-all text-left ${leadType === 'Listing' ? 'border-primary bg-primary/5 shadow-m3-sm' : 'border-outline/10 grayscale opacity-60'}`}>
                            <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Type</p>
                            <p className="font-bold text-on-surface">Seller / Listing</p>
                        </button>
                        <button type="button" onClick={() => setLeadType('Consult')} className={`p-4 rounded-2xl border-2 transition-all text-left ${leadType === 'Consult' ? 'border-primary bg-primary/5 shadow-m3-sm' : 'border-outline/10 grayscale opacity-60'}`}>
                            <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">Type</p>
                            <p className="font-bold text-on-surface">Buyer / Consult</p>
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black text-on-surface uppercase tracking-widest mb-2 block">Lead Source</label>
                            <select value={source} onChange={e => setSource(e.target.value)} className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none cursor-pointer">
                                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-on-surface uppercase tracking-widest mb-2 block">Projected GCI</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-success">$</span>
                                <input type="number" value={jobValue} onChange={e => setJobValue(e.target.value)} placeholder="0.00" className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl pl-8 pr-5 py-3 text-sm font-bold focus:ring-2 ring-primary/20 outline-none transition-all" />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Logistics */}
                <section className="space-y-8 bg-surface-variant/10 p-6 rounded-[2.5rem] border border-outline/10 shadow-inner">
                    <h4 className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                        <BriefcaseIcon className="w-4 h-4" /> Logistics
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-on-surface uppercase tracking-widest mb-2 block">Destination Pipeline</label>
                            <div className="relative">
                                <select value={targetProjectId} onChange={e => setTargetProjectId(e.target.value)} className="w-full bg-surface border border-outline/10 rounded-xl px-10 py-3 text-xs font-black uppercase tracking-widest outline-none appearance-none cursor-pointer">
                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <FolderKanbanIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-60" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-on-surface uppercase tracking-widest mb-2 block">Assigned Agent</label>
                            <div className="relative">
                                <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className="w-full bg-surface border border-outline/10 rounded-xl px-10 py-3 text-xs font-black uppercase tracking-widest outline-none appearance-none cursor-pointer">
                                    <option value="">Unassigned</option>
                                    {projectMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                                <BriefcaseIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary opacity-60" />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
          </div>

          <div className="p-6 border-t border-outline/10 bg-surface flex justify-end items-center gap-4 shrink-0">
            <button type="button" onClick={closeCreateLeadModal} className="px-8 py-3 text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant hover:bg-surface-variant/50 rounded-[1.25rem] transition-all">
                Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !firstName.trim() || !targetProjectId}
              className="px-10 py-4 text-xs font-black uppercase tracking-[0.25em] bg-primary text-on-primary rounded-[1.5rem] transition-all shadow-m3-lg active:scale-95 disabled:opacity-50 hover:bg-primary/90 flex items-center gap-3"
            >
              {isLoading ? 'Processing Intake...' : <><PlusIcon className="w-4 h-4" /> Finalize Lead</>}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default LeadCreateModal;
