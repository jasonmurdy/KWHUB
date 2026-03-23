
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Template, TemplateTask, TemplateLink } from '../types';
// Added ListTodoIcon and LinkIcon to fix "Cannot find name" errors
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableTaskItem } from './SortableTaskItem';
import { XIcon, PlusIcon, TrashIcon, FolderKanbanIcon, ShieldCheckIcon, ListTodoIcon, LinkIcon, RefreshCwIcon } from './icons';
import { motion, Variants, AnimatePresence } from 'framer-motion';

// Animation variants
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
  exit: { y: "100%", opacity: 0, transition: { duration: 0.25 }, pointerEvents: "none" },
};

const TemplateModal: React.FC = () => {
  const { editingTemplate, closeTemplateModal, saveTemplate, teams } = useAppContext();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [tasks, setTasks] = useState<TemplateTask[]>([]);
  const [links, setLinks] = useState<TemplateLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex(t => t.id === active.id);
        const newIndex = items.findIndex(t => t.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      markDirty();
    }
  };

  const lastTemplateId = useRef<string | null>(null);

  const isNew = editingTemplate === 'new';
  const templateToEdit = isNew ? null : editingTemplate as Template;

  // ID-Lock for Template Synchronization
  useEffect(() => {
    const currentId = templateToEdit?.id || 'new';
    if (editingTemplate && currentId !== lastTemplateId.current) {
      lastTemplateId.current = currentId;
      if (templateToEdit) {
        setName(templateToEdit.name || '');
        setDescription(templateToEdit.description || '');
        setIsShared(templateToEdit.isShared || false);
        setSelectedTeamId(templateToEdit.teamId || '');
        setTasks(templateToEdit.tasks?.map(t => ({...t})) || []);
        setLinks(templateToEdit.links?.map(l => ({...l})) || []);
      } else {
        setName('');
        setDescription('');
        setIsShared(false);
        setSelectedTeamId('');
        setTasks([]);
        setLinks([]);
      }
      setHasChanges(false);
    }
  }, [editingTemplate, templateToEdit]);

  // Aggregate all unique role names from selected team or all teams
  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    const team = teams.find(t => t.id === selectedTeamId);
    if (team) {
      team.roles?.forEach(role => roles.add(role.name));
    } else {
      teams.forEach(t => t.roles?.forEach(r => roles.add(r.name)));
    }
    return Array.from(roles).sort();
  }, [teams, selectedTeamId]);

  const markDirty = () => setHasChanges(true);

  const handleTaskChange = (index: number, field: 'title' | 'description' | 'assigneeRole' | 'section', value: string) => {
    const newTasks = [...tasks];
    newTasks[index][field] = value;
    setTasks(newTasks);
    markDirty();
  };
  const handleLinkChange = (index: number, field: 'name' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
    markDirty();
  };
  
  const addTask = () => {
      const lastSection = tasks.length > 0 ? tasks[tasks.length - 1].section : '';
      setTasks([...tasks, { id: `task-${Date.now()}`, title: '', description: '', assigneeRole: '', section: lastSection }]);
      markDirty();
  };
  
  const addLink = () => {
      setLinks([...links, { id: `link-${Date.now()}`, name: '', url: '' }]);
      markDirty();
  };
  
  const removeTask = (index: number) => {
      setTasks(tasks.filter((_, i) => i !== index));
      markDirty();
  };
  
  const removeLink = (index: number) => {
      setLinks(links.filter((_, i) => i !== index));
      markDirty();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      await saveTemplate({ 
          name: name.trim(), 
          description: description.trim(), 
          tasks, 
          links, 
          isShared, 
          teamId: selectedTeamId || undefined 
      }, templateToEdit?.id);
      setHasChanges(false);
      closeTemplateModal();
    } catch (error) {
      console.error("Failed to save template:", error);
      alert("Error saving template.");
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!editingTemplate) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={closeTemplateModal}
      variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
    >
      <motion.div
        className="bg-surface border border-outline/30 rounded-t-[3rem] sm:rounded-[3.5rem] w-full h-[95vh] sm:h-[90vh] max-w-6xl flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        variants={modalVariants}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-8 border-b border-outline/10 flex justify-between items-center bg-surface/80 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${isNew ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                    {isNew ? <PlusIcon className="w-6 h-6" /> : <ShieldCheckIcon className="w-6 h-6" />}
                </div>
                <div>
                    <h2 className="text-2xl font-black text-on-surface uppercase tracking-tight leading-none">{isNew ? 'New Strategy Architecture' : 'Architect Strategy'}</h2>
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-40 mt-2">Design workflows that scale</p>
                </div>
            </div>
            <button type="button" onClick={closeTemplateModal} className="p-4 bg-surface-variant/30 hover:bg-danger/10 hover:text-danger rounded-3xl transition-all border border-outline/10">
              <XIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-12 pb-24 bg-surface/30">
            
            <AnimatePresence>
                {hasChanges && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-primary/5 border border-primary/20 p-4 rounded-3xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <RefreshCwIcon className="w-4 h-4 text-primary animate-spin-slow" />
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Unsaved Architecture Changes</span>
                        </div>
                        <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest italic">Changes stored locally until vault sync</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                 <div className="lg:col-span-2 space-y-8">
                    <section>
                        <div className="flex justify-between items-end mb-4">
                            <label className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Strategy Title</label>
                            <span className="text-[9px] font-bold text-on-surface-variant/40">{name.length}/100</span>
                        </div>
                        <input 
                            autoFocus
                            type="text" 
                            maxLength={100}
                            value={name} 
                            onChange={(e) => { setName(e.target.value); markDirty(); }} 
                            placeholder="e.g. Platinum Listing Launchpad" 
                            required 
                            className="w-full bg-surface-variant/30 border border-outline/20 rounded-[1.5rem] px-6 py-4 text-xl font-black text-on-surface focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:opacity-20" 
                        />
                    </section>
                    <section>
                        <div className="flex justify-between items-end mb-4">
                            <label className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Strategic Overview</label>
                            <span className="text-[9px] font-bold text-on-surface-variant/40">{description.length}/500</span>
                        </div>
                        <textarea 
                            value={description} 
                            maxLength={500}
                            onChange={(e) => { setDescription(e.target.value); markDirty(); }} 
                            rows={2} 
                            placeholder="Define the objective and expected outcome for this strategy..."
                            className="w-full bg-surface-variant/30 border border-outline/20 rounded-[1.5rem] px-6 py-4 text-base font-medium text-on-surface-variant focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all resize-none placeholder:opacity-20"
                        />
                    </section>
                </div>

                <div className="space-y-6">
                    <section className="p-6 bg-surface border border-outline/10 rounded-[2.5rem] shadow-sm">
                        <h4 className="text-[10px] font-black text-on-surface uppercase tracking-[0.25em] mb-6 flex items-center gap-2">
                            <FolderKanbanIcon className="w-3.5 h-3.5" /> Repository Placement
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1.5 block">Target Team</label>
                                <select 
                                    value={selectedTeamId} 
                                    onChange={(e) => { setSelectedTeamId(e.target.value); markDirty(); }}
                                    className="w-full bg-surface-variant/30 border border-outline/20 rounded-xl px-4 py-3 text-sm font-bold text-on-surface outline-none appearance-none cursor-pointer"
                                >
                                    <option value="">Personal Vault</option>
                                    {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                                </select>
                            </div>
                            <label className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10 cursor-pointer group hover:bg-primary/10 transition-all">
                                <input
                                    type="checkbox"
                                    checked={isShared}
                                    onChange={(e) => { setIsShared(e.target.checked); markDirty(); }}
                                    className="h-5 w-5 rounded-lg text-primary focus:ring-primary border-outline/30"
                                />
                                <div className="flex-1">
                                    <p className="font-black text-primary text-[10px] uppercase tracking-widest">Publish Publicly</p>
                                    <p className="text-[10px] text-on-surface-variant opacity-60 font-bold uppercase tracking-tighter">Visible to all Hub users</p>
                                </div>
                            </label>
                        </div>
                    </section>
                </div>
            </div>

            <section>
                <div className="flex justify-between items-end mb-6 px-1">
                    <div>
                        <h4 className="text-[11px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                            <ListTodoIcon className="w-4 h-4" /> Checklist Nodes
                        </h4>
                        <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-1">Design sequential steps for this workflow</p>
                    </div>
                    <button type="button" onClick={addTask} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl text-[10px] font-black uppercase tracking-widest shadow-m3-sm hover:scale-105 transition-all">
                        <PlusIcon className="h-4 w-4" /> Add Checkpoint
                    </button>
                </div>

                <div className="space-y-3">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                            {tasks.map((task, i) => (
                                <SortableTaskItem 
                                    key={task.id} 
                                    task={task} 
                                    index={i} 
                                    availableRoles={availableRoles} 
                                    handleTaskChange={handleTaskChange} 
                                    removeTask={removeTask} 
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                    {tasks.length === 0 && (
                        <div className="text-center py-16 border-2 border-dashed border-outline/10 rounded-[3rem] text-on-surface-variant/20 flex flex-col items-center justify-center">
                            <ListTodoIcon className="h-12 w-12 mb-4 opacity-10" />
                            <p className="font-black uppercase tracking-[0.2em] text-xs">Architecture is Empty</p>
                        </div>
                    )}
                </div>
            </section>

            <section>
                 <div className="flex justify-between items-center mb-6 px-1">
                    <div>
                        <h4 className="text-[11px] font-black text-secondary uppercase tracking-[0.3em] flex items-center gap-2">
                            <LinkIcon className="w-4 h-4" /> Global Resources
                        </h4>
                        <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-1">Append scripts, documents, or tools</p>
                    </div>
                    <button type="button" onClick={addLink} className="flex items-center gap-2 px-5 py-2.5 bg-secondary text-on-secondary rounded-xl text-[10px] font-black uppercase tracking-widest shadow-m3-sm hover:scale-105 transition-all">
                        <PlusIcon className="h-4 w-4" /> Add Asset
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {links.map((link, i) => (
                        <div key={link.id} className="flex items-center gap-3 bg-surface p-4 rounded-[1.5rem] border border-outline/10 shadow-sm relative group/link">
                            <div className="p-2 bg-secondary/5 text-secondary rounded-xl"><LinkIcon className="w-4 h-4" /></div>
                            <div className="flex-1 space-y-1">
                                <input value={link.name} onChange={e => handleLinkChange(i, 'name', e.target.value)} placeholder="Link Name (e.g. Script)" className="w-full text-xs font-black uppercase tracking-tight bg-transparent outline-none focus:text-secondary" />
                                <input value={link.url} onChange={e => handleLinkChange(i, 'url', e.target.value)} placeholder="URL (https://...)" type="url" className="w-full text-[10px] font-bold text-on-surface-variant opacity-40 bg-transparent outline-none focus:opacity-100" />
                            </div>
                            <button type="button" onClick={() => removeLink(i)} className="text-on-surface-variant/30 hover:text-danger p-2 opacity-0 group-hover/link:opacity-100 transition-all"><TrashIcon className="h-4 w-4"/></button>
                        </div>
                    ))}
                </div>
            </section>
          </div>

          <div className="p-6 border-t border-outline/10 bg-surface flex justify-end items-center gap-4 shrink-0">
            <button type="button" onClick={closeTemplateModal} className="px-8 py-3 text-xs font-black uppercase tracking-[0.2em] text-on-surface-variant hover:bg-surface-variant/50 rounded-[1.25rem] transition-all">
                Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className={`px-10 py-4 text-xs font-black uppercase tracking-[0.25em] rounded-[1.5rem] transition-all shadow-m3-lg active:scale-95 disabled:opacity-50
                ${hasChanges ? 'bg-primary text-on-primary hover:bg-primary/90' : 'bg-surface-variant/50 text-on-surface-variant/40 border border-outline/10 cursor-not-allowed'}
              `}
            >
              {isLoading ? 'Saving Architecture...' : 'Save To Vault'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default TemplateModal;
