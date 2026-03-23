
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import type { WorkflowStatus, CustomFieldDefinition, Project } from '../types';
import { 
    GripVerticalIcon, PlusIcon, TrashIcon, 
    ArchiveIcon, SettingsIcon, RefreshCwIcon, 
    WebhookIcon, AlertCircleIcon, TypeIcon,
    LayoutDashboardIcon
} from './icons';
import { PROJECT_COLORS } from '../constants';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';

const COLORS = ['#94a3b8', '#60a5fa', '#facc15', '#c084fc', '#4ade80', '#f87171', '#fb923c'];

interface SortableStatusRowProps {
    status: WorkflowStatus;
    index: number;
    onUpdate: (index: number, field: keyof WorkflowStatus, value: string) => void;
    onDelete: (id: string) => void;
}

const SortableStatusRow: React.FC<SortableStatusRowProps> = ({ status, index, onUpdate, onDelete }) => {
    const dragControls = useDragControls();

    return (
        <Reorder.Item
            value={status}
            id={status.id}
            dragListener={false}
            dragControls={dragControls}
            className="flex items-center gap-4 p-4 rounded-2xl border border-outline/10 bg-surface-variant/10 group relative"
        >
            <div 
                className="cursor-grab active:cursor-grabbing touch-none text-on-surface-variant/20 hover:text-primary transition-colors"
                onPointerDown={(e) => dragControls.start(e)}
            >
                <GripVerticalIcon className="h-5 w-5" />
            </div>
            
            <input 
                type="color" 
                value={status.color} 
                onChange={(e) => onUpdate(index, 'color', e.target.value)} 
                className="w-10 h-10 rounded-xl border-0 p-0 cursor-pointer bg-transparent" 
            />
            <input 
                type="text" 
                value={status.name} 
                onChange={(e) => onUpdate(index, 'name', e.target.value)} 
                className="flex-1 bg-transparent font-black uppercase tracking-tight text-sm focus:outline-none border-b border-transparent focus:border-primary/30 py-1"
                placeholder="PHASE NAME"
            />
            <button 
                onClick={() => onDelete(status.id)} 
                className="p-2 text-on-surface-variant/20 hover:text-danger hover:bg-danger/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
            >
                <TrashIcon className="h-4 w-4" />
            </button>
        </Reorder.Item>
    );
};

const ProjectSettingsView: React.FC = () => {
  const { selectedProject, updateProject, tasks, deleteProject, archiveProject, teams, setActiveView } = useAppContext();
  const { addToast } = useToast();
  
  // Local Form State
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [workflow, setWorkflow] = useState<WorkflowStatus[]>([]);
  const [googleChatWebhook, setGoogleChatWebhook] = useState('');
  const [teamId, setTeamId] = useState('');
  const [projectColor, setProjectColor] = useState('');
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [isVendorMgmtEnabled, setIsVendorMgmtEnabled] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Track last loaded project ID to prevent useEffect from stomping on user input
  const lastLoadedId = useRef<string | null>(null);

  useEffect(() => {
    if (selectedProject && selectedProject.id !== lastLoadedId.current) {
      lastLoadedId.current = selectedProject.id;
      setProjectName(selectedProject.name);
      setProjectDescription(selectedProject.description);
      setWorkflow(selectedProject.workflow.map(s => ({ ...s })));
      setGoogleChatWebhook(selectedProject.integrations?.googleChatWebhook || '');
      setTeamId(selectedProject.teamId || '');
      setProjectColor(selectedProject.color || PROJECT_COLORS[0]);
      setCustomFields(selectedProject.customFields?.map(f => ({ ...f, options: f.options ? [...f.options] : undefined })) || []);
      setIsVendorMgmtEnabled(!!selectedProject.settings?.enableVendorManagement);
      setHasChanges(false);
    }
  }, [selectedProject]);

  const handleFieldChange = <T,>(setter: (val: T) => void, value: T) => {
      setter(value);
      setHasChanges(true);
  };

  const handleWorkflowReorder = (newWorkflow: WorkflowStatus[]) => {
      setWorkflow(newWorkflow);
      setHasChanges(true);
  };

  const handleStatusUpdate = (index: number, field: keyof WorkflowStatus, value: string) => {
      const next = [...workflow];
      next[index] = { ...next[index], [field]: value };
      setWorkflow(next);
      setHasChanges(true);
  };

  const handleAddStatus = () => {
    const newStatus: WorkflowStatus = {
        id: `status-${Date.now()}`,
        name: 'New Phase',
        color: COLORS[workflow.length % COLORS.length]
    };
    setWorkflow([...workflow, newStatus]);
    setHasChanges(true);
  };
  
  const handleDeleteStatus = (id: string) => {
    const tasksInStatus = tasks.filter(t => t.status === id).length;
    if (tasksInStatus > 0) {
      addToast({ type: 'error', title: 'Cannot Delete Status', message: `This phase contains ${tasksInStatus} tasks. Move them first.` });
      return;
    }
    setWorkflow(workflow.filter(s => s.id !== id));
    setHasChanges(true);
  };

  const handleAddCustomField = () => {
      const newField: CustomFieldDefinition = {
          id: `cf-${Date.now()}`,
          name: 'New Property',
          type: 'text'
      };
      setCustomFields([...customFields, newField]);
      setHasChanges(true);
  };

  const updateCustomField = (id: string, updates: Partial<CustomFieldDefinition>) => {
      setCustomFields(customFields.map(f => f.id === id ? { ...f, ...updates } : f));
      setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const updates: Partial<Project> = {
          name: projectName,
          description: projectDescription,
          workflow,
          teamId: teamId || null,
          color: projectColor,
          customFields,
          settings: { enableVendorManagement: isVendorMgmtEnabled },
          integrations: {
              ...selectedProject.integrations,
              googleChatWebhook: googleChatWebhook.trim(),
          }
       };
       
       if (teamId) {
           const team = teams.find(t => t.id === teamId);
           if (team) updates.memberIds = team.memberIds;
       }

      await updateProject(selectedProject.id, updates);
      setHasChanges(false);
    } catch {
      addToast({ type: 'error', title: 'Save Failed' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
      if (!selectedProject) return;
      if (confirm('Archive this project? It will be hidden from your main board but accessible in Archived Projects.')) {
          await archiveProject(selectedProject.id);
          setActiveView('dashboard');
      }
  };

  const handleDelete = async () => {
      if (!selectedProject) return;
      const verify = prompt(`Type "${selectedProject.name}" to permanently delete this project and all its tasks:`);
      if (verify === selectedProject.name) {
          await deleteProject(selectedProject.id);
          setActiveView('dashboard');
      } else if (verify !== null) {
          addToast({ type: 'warning', title: 'Delete cancelled', message: 'Project name did not match.' });
      }
  };

  if (!selectedProject) return null;
  const webhookUrl = `https://us-central1-projectflow-c5584.cloudfunctions.net/handleGenericWebhook?projectId=${selectedProject.id}`;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-8 p-6 pb-40">
        
        {/* Unsaved Changes Banner */}
        <AnimatePresence>
            {hasChanges && (
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-primary/10 border border-primary/20 p-4 rounded-2xl flex items-center justify-between shadow-sm"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg text-primary">
                            <RefreshCwIcon className="w-4 h-4 animate-spin-slow" />
                        </div>
                        <p className="text-sm font-black text-primary uppercase tracking-widest">You have unsaved modifications</p>
                    </div>
                    <button 
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className="px-6 py-2 bg-primary text-on-primary rounded-xl text-[10px] font-black uppercase tracking-widest shadow-m3-sm hover:scale-105 transition-all"
                    >
                        {isSaving ? 'Syncing...' : 'Save Now'}
                    </button>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* General Info */}
                <section className="bg-surface p-8 rounded-[2.5rem] shadow-m3-sm border border-outline/30">
                    <h2 className="text-xl font-black text-on-surface uppercase tracking-tight mb-8 flex items-center gap-3">
                        <LayoutDashboardIcon className="w-5 h-5 text-primary" /> General Identity
                    </h2>
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block">Project Name</label>
                            <input 
                                type="text" 
                                value={projectName} 
                                onChange={(e) => handleFieldChange(setProjectName, e.target.value)} 
                                className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl px-5 py-4 text-lg font-bold focus:ring-2 ring-primary/20 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block">Strategic Description</label>
                            <textarea 
                                value={projectDescription} 
                                onChange={(e) => handleFieldChange(setProjectDescription, e.target.value)} 
                                rows={3} 
                                className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl px-5 py-4 text-sm font-medium leading-relaxed focus:ring-2 ring-primary/20 outline-none transition-all resize-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3 block">Branding Color</label>
                            <div className="flex flex-wrap gap-3">
                                {PROJECT_COLORS.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => handleFieldChange(setProjectColor, c)}
                                        className={`w-10 h-10 rounded-2xl transition-all shadow-sm ${projectColor === c ? 'ring-4 ring-primary/20 scale-110' : 'hover:scale-105 opacity-60 hover:opacity-100'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Workflow Editor */}
                <section className="bg-surface p-8 rounded-[2.5rem] shadow-m3-sm border border-outline/30">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-black text-on-surface uppercase tracking-tight flex items-center gap-3">
                            <SettingsIcon className="w-5 h-5 text-secondary" /> Pipeline Phases
                        </h2>
                        <button 
                            onClick={handleAddStatus} 
                            className="flex items-center gap-2 px-4 py-2 bg-surface-variant/50 hover:bg-primary/10 text-primary border border-outline/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            <PlusIcon className="h-4 w-4" /> Add Phase
                        </button>
                    </div>
                    
                    <Reorder.Group axis="y" values={workflow} onReorder={handleWorkflowReorder} className="space-y-3">
                        {workflow.map((status, index) => (
                            <SortableStatusRow 
                                key={status.id} 
                                status={status} 
                                index={index} 
                                onUpdate={handleStatusUpdate} 
                                onDelete={handleDeleteStatus} 
                            />
                        ))}
                    </Reorder.Group>
                </section>

                {/* Custom Fields Editor */}
                <section className="bg-surface p-8 rounded-[2.5rem] shadow-m3-sm border border-outline/30">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl font-black text-on-surface uppercase tracking-tight flex items-center gap-3">
                            <TypeIcon className="w-5 h-5 text-tertiary" /> Custom Data Schema
                        </h2>
                        <button 
                            onClick={handleAddCustomField} 
                            className="flex items-center gap-2 px-4 py-2 bg-surface-variant/50 hover:bg-primary/10 text-primary border border-outline/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            <PlusIcon className="h-4 w-4" /> Add Field
                        </button>
                    </div>
                    <div className="space-y-4">
                        {customFields.map((field) => (
                            <div key={field.id} className="p-5 rounded-2xl border border-outline/10 bg-surface shadow-sm space-y-4 group">
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="text" 
                                        value={field.name} 
                                        placeholder="Field Name (e.g. Listing Price)"
                                        onChange={e => updateCustomField(field.id, { name: e.target.value })}
                                        className="flex-1 text-sm font-black uppercase tracking-tight bg-transparent focus:outline-none border-b border-outline/20 focus:border-primary py-1"
                                    />
                                    <select 
                                        value={field.type}
                                        onChange={e => updateCustomField(field.id, { type: e.target.value as CustomFieldDefinition['type'] })}
                                        className="bg-surface-variant/30 text-[10px] font-black uppercase tracking-widest border border-outline/10 rounded-xl px-3 py-2 outline-none"
                                    >
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="date">Date</option>
                                        <option value="boolean">Checkbox</option>
                                        <option value="select">Dropdown</option>
                                    </select>
                                    <button 
                                        onClick={() => handleFieldChange(setCustomFields, customFields.filter(f => f.id !== field.id))}
                                        className="p-2 text-on-surface-variant/30 hover:text-danger rounded-xl"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                {field.type === 'select' && (
                                    <div className="pl-6 space-y-2 border-l-2 border-primary/20">
                                        <p className="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-widest">Options</p>
                                        {(field.options || []).map((opt, i) => (
                                            <div key={i} className="flex gap-2">
                                                <input 
                                                    value={opt} 
                                                    onChange={e => {
                                                        const next = [...(field.options || [])];
                                                        next[i] = e.target.value;
                                                        updateCustomField(field.id, { options: next });
                                                    }}
                                                    className="flex-1 text-xs font-bold bg-surface-variant/20 rounded-lg px-3 py-1.5"
                                                />
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => updateCustomField(field.id, { options: [...(field.options || []), 'New Option'] })}
                                            className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                                        >
                                            + Add Option
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {customFields.length === 0 && (
                            <p className="text-center py-8 text-on-surface-variant/30 text-[10px] font-black uppercase tracking-widest">No custom data defined</p>
                        )}
                    </div>
                </section>
            </div>

            <div className="space-y-8">
                {/* Integration Tools */}
                <section className="bg-surface p-8 rounded-[2.5rem] shadow-m3-sm border border-outline/30 overflow-hidden relative group">
                    <WebhookIcon className="absolute -right-4 -top-4 w-24 h-24 text-primary opacity-[0.03] group-hover:scale-110 transition-transform duration-700" />
                    <h2 className="text-lg font-black text-on-surface uppercase tracking-tight mb-6">Automation</h2>
                    <div className="space-y-6">
                        <div>
                            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block">Team Ownership</label>
                            <select 
                                value={teamId} 
                                onChange={(e) => handleFieldChange(setTeamId, e.target.value)} 
                                className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                            >
                                <option value="">Personal Project</option>
                                {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 flex items-center justify-between">
                                <span className="flex items-center gap-2">Google Chat Webhook (Outbound Alerts)</span>
                                {googleChatWebhook && (
                                    <button 
                                        onClick={async () => {
                                            try {
                                                await fetch(googleChatWebhook, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ text: `🔔 *Test Notification*\n\nThis is a test message to verify your project webhook configuration for **${projectName}** in ProjectFlow.` }),
                                                    mode: 'no-cors'
                                                });
                                                addToast({ type: 'success', title: 'Test Message Sent' });
                                            } catch {
                                                addToast({ type: 'error', title: 'Test Failed', message: 'Could not send test message.' });
                                            }
                                        }}
                                        className="text-[10px] text-primary hover:underline"
                                    >
                                        Test Webhook
                                    </button>
                                )}
                            </label>
                            <input 
                                type="url" 
                                value={googleChatWebhook} 
                                onChange={(e) => handleFieldChange(setGoogleChatWebhook, e.target.value)} 
                                placeholder="https://chat.googleapis.com/v1/spaces/..."
                                className="w-full bg-surface-variant/30 border border-outline/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block">System Webhook (Inbound Tasks)</label>
                            <div className="bg-surface-variant/50 p-4 rounded-xl border border-outline/10 font-mono text-[10px] break-all leading-relaxed text-on-surface-variant/70">
                                {webhookUrl}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature Toggles */}
                <section className="bg-surface p-8 rounded-[2.5rem] shadow-m3-sm border border-outline/30">
                    <h2 className="text-lg font-black text-on-surface uppercase tracking-tight mb-6">Features</h2>
                    <label className="flex items-center justify-between p-4 bg-surface-variant/10 rounded-2xl border border-outline/10 cursor-pointer group">
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-on-surface">Vendor Portal</p>
                            <p className="text-[10px] text-on-surface-variant/60 font-medium">Allow contractors to view tasks</p>
                        </div>
                        <input 
                            type="checkbox" 
                            checked={isVendorMgmtEnabled} 
                            onChange={e => handleFieldChange(setIsVendorMgmtEnabled, e.target.checked)}
                            className="h-5 w-5 rounded-lg text-primary focus:ring-primary border-outline/30"
                        />
                    </label>
                </section>

                {/* Danger Zone */}
                <section className="p-8 rounded-[2.5rem] border-2 border-danger/10 bg-danger/[0.02]">
                    <h2 className="text-lg font-black text-danger uppercase tracking-tight mb-6 flex items-center gap-2">
                        <AlertCircleIcon className="w-5 h-5" /> Danger Zone
                    </h2>
                    <div className="space-y-3">
                        <button 
                            onClick={handleArchive}
                            className="w-full flex items-center justify-between p-4 bg-surface rounded-2xl border border-danger/20 hover:bg-danger/5 transition-all group"
                        >
                            <div className="text-left">
                                <p className="text-sm font-black text-danger uppercase tracking-widest">Archive Project</p>
                                <p className="text-[10px] text-on-surface-variant font-medium">Remove from view but keep data</p>
                            </div>
                            <ArchiveIcon className="w-5 h-5 text-danger opacity-40 group-hover:opacity-100" />
                        </button>
                        <button 
                            onClick={handleDelete}
                            className="w-full flex items-center justify-between p-4 bg-danger text-on-primary rounded-2xl shadow-m3-md hover:bg-danger/90 transition-all group"
                        >
                            <div className="text-left">
                                <p className="text-sm font-black uppercase tracking-widest">Erase Permanently</p>
                                <p className="text-[10px] text-on-primary/70 font-medium uppercase tracking-tighter">This cannot be undone</p>
                            </div>
                            <TrashIcon className="w-5 h-5 opacity-40 group-hover:opacity-100" />
                        </button>
                    </div>
                </section>
            </div>
        </div>

        {/* Global Action Bar */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
            <button 
                onClick={handleSaveChanges}
                disabled={isSaving || !hasChanges}
                className={`flex items-center gap-3 px-12 py-4 rounded-[2rem] font-black text-xs uppercase tracking-[0.25em] transition-all shadow-m3-lg
                    ${hasChanges 
                        ? 'bg-primary text-on-primary hover:scale-105 active:scale-95' 
                        : 'bg-surface border border-outline/20 text-on-surface-variant opacity-50 cursor-not-allowed'}
                `}
            >
                {isSaving ? (
                    <><RefreshCwIcon className="w-4 h-4 animate-spin" /> Committing Changes...</>
                ) : (
                    <>Sync Strategy Updates</>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};
export default ProjectSettingsView;
