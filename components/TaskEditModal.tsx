
import React, { useState, useEffect, useMemo } from 'react';
import { TaskPriority } from '../types';
import type { Task, CustomFieldDefinition, User } from '../types';
import { XIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';
import { Modal } from './Modal';

interface TaskFormData {
  title: string;
  description: string;
  status: string;
  priority: TaskPriority;
  startDate: Date;
  dueDate: Date;
  targetDate?: Date;
  eventDate?: Date;
  recurrence: 'daily' | 'weekly' | 'monthly' | 'none';
}

const toInputDateString = (date: Date | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
};

const CustomFieldInput: React.FC<{ field: CustomFieldDefinition; value: string | number | boolean | undefined; onChange: (value: string | number | boolean | undefined) => void; }> = ({ field, value, onChange }) => {
    switch (field.type) {
        case 'text':
            return <input type="text" value={(value as string | number) || ''} onChange={e => onChange(e.target.value)} className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary"/>
        case 'number':
            return <input type="number" value={(value as string | number) || ''} onChange={e => onChange(e.target.valueAsNumber)} className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary"/>
        case 'date':
            return <input type="date" value={value && (typeof value === 'string' || typeof value === 'number') ? toInputDateString(new Date(value as string | number)) : ''} onChange={e => onChange(e.target.valueAsDate?.getTime() || undefined)} className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary"/>
        case 'boolean':
            return <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} className="h-5 w-5 rounded text-primary focus:ring-primary border-outline/50"/>
        case 'select':
            return (
                <select value={(value as string | number) || ''} onChange={e => onChange(e.target.value)} className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary">
                    <option value="">-- Select --</option>
                    {(field.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            );
        default: return null;
    }
}

const TaskEditModal: React.FC = () => {
  const { closeModals, addTask, selectedProject, allTasks, newTaskData, teams, projects, allUsers } = useAppContext();
  
  // State for targeting specific team/project
  const [targetTeamId, setTargetTeamId] = useState(selectedProject?.teamId || '');
  const [targetProjectId, setTargetProjectId] = useState(selectedProject?.id || '');

  // Derived target project object
  const targetProject = useMemo(() => projects.find(p => p.id === targetProjectId), [projects, targetProjectId]);

  // Hydrate project members
  const projectMembers = useMemo(() => {
      if (!targetProject || !allUsers) return [];
      return (Array.isArray(targetProject.memberIds) ? targetProject.memberIds : []).map(id => allUsers.find(u => u.id === id)).filter((u): u is User => !!u);
  }, [targetProject, allUsers]);

  const getInitialState = (initialData?: Partial<Task>): TaskFormData => ({
    title: initialData?.title || '',
    description: initialData?.description || '',
    status: initialData?.status || (targetProject?.workflow || [])[0]?.id || '',
    priority: initialData?.priority || TaskPriority.MEDIUM,
    startDate: initialData?.startDate || new Date(),
    dueDate: initialData?.dueDate || new Date(),
    targetDate: initialData?.targetDate || undefined,
    eventDate: initialData?.eventDate || undefined,
    recurrence: initialData?.recurrence || 'none',
  });
  
  const [formData, setFormData] = useState<TaskFormData>(() => getInitialState(newTaskData || undefined));
  const [selectedAssignees, setSelectedAssignees] = useState<Set<string>>(new Set());
  const [selectedDependencies, setSelectedDependencies] = useState<Set<string>>(new Set());
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | number | boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Initialize selection when component mounts or context changes
  useEffect(() => {
      if (selectedProject) {
          setTargetTeamId(selectedProject.teamId || '');
          setTargetProjectId(selectedProject.id);
      } else if (projects.length > 0 && !targetProjectId) {
          // Fallback: Select first available project if none selected
          setTargetProjectId(projects[0].id);
          setTargetTeamId(projects[0].teamId || '');
      }
  }, [selectedProject, projects, targetProjectId]);

  // CRITICAL FIX: Update status when target project changes to ensure ID validity
  useEffect(() => {
      if (targetProject) {
          const projectWorkflow = targetProject.workflow || [];
          const firstStatusId = projectWorkflow.length > 0 ? projectWorkflow[0].id : '';
          
          setFormData(prev => {
              // Reset status if it doesn't belong to the new target project's workflow
              const statusIsInvalid = !projectWorkflow.some(s => s.id === prev.status);
              if (!prev.status || statusIsInvalid) {
                  return { ...prev, status: firstStatusId };
              }
              return prev;
          });
      }
  }, [targetProject]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value) {
        const [year, month, day] = value.split('-').map(Number);
        const utcDate = new Date(Date.UTC(year, month - 1, day));
        setFormData(prev => ({ ...prev, [name]: utcDate }));
    } else {
        setFormData(prev => ({ ...prev, [name]: undefined }));
    }
  }

  const handleAssigneeToggle = (userId: string) => {
    const newSelection = new Set(selectedAssignees);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedAssignees(newSelection);
  };
  
  const handleDependencyToggle = (taskId: string) => {
    const newSelection = new Set(selectedDependencies);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedDependencies(newSelection);
  };

  const handleCustomFieldChange = (fieldId: string, value: string | number | boolean | undefined) => {
    setCustomFieldValues(prev => {
        if (value === undefined) {
            const rest = { ...prev };
            delete rest[fieldId];
            return rest;
        }
        return { ...prev, [fieldId]: value };
    });
  };

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newTeamId = e.target.value;
      setTargetTeamId(newTeamId);
      // Auto-select first project in new team
      const teamProjects = projects.filter(p => p.teamId === newTeamId || (!newTeamId && !p.teamId));
      if (teamProjects.length > 0) {
          setTargetProjectId(teamProjects[0].id);
      } else {
          setTargetProjectId('');
      }
  };

  const filteredProjects = useMemo(() => {
      if (!targetTeamId) {
          // Show personal projects (no teamId)
          return projects.filter(p => !p.teamId);
      }
      return projects.filter(p => p.teamId === targetTeamId);
  }, [projects, targetTeamId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProjectId) {
        alert("Please select a project.");
        return;
    }

    if (!formData.title.trim()) {
      alert('Task title cannot be empty.');
      return;
    }

    setIsLoading(true);
    const assignees = projectMembers.filter(u => selectedAssignees.has(u.id)) || [];
    const dependsOn = Array.from(selectedDependencies);

    try {
      await addTask({
          title: formData.title || 'Untitled Task',
          description: formData.description || '',
          status: formData.status,
          priority: formData.priority || TaskPriority.MEDIUM,
          assignees: assignees,
          startDate: formData.startDate || new Date(),
          dueDate: formData.dueDate || new Date(),
          targetDate: formData.targetDate,
          eventDate: formData.eventDate,
          recurrence: formData.recurrence,
          dependsOn: dependsOn as string[],
          customFieldValues,
          projectId: targetProjectId, // Explicitly pass target project ID
      });
      closeModals();
    } catch (error) {
      console.error("Failed to create task:", error);
      alert("There was an error creating your task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Only show dependencies from the TARGET project
  const availableDependencies = useMemo(() => {
      return allTasks.filter(t => t.projectId === targetProjectId);
  }, [allTasks, targetProjectId]);

  return (
    <Modal 
        onClose={closeModals} 
        containerClassName="z-[130] flex items-center justify-center"
        panelClassName="w-full h-full max-w-full lg:max-w-4xl max-h-[95vh] bg-surface border border-outline/30 rounded-3xl shadow-m3-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="p-6 border-b border-outline/30 flex justify-between items-center">
          <h2 className="text-xl font-bold text-on-surface">Create New Task</h2>
          <button type="button" onClick={closeModals} className="text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-on-surface/5">
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Project / Team Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-surface-variant/30 rounded-xl border border-outline/30">
              <div>
                  <label htmlFor="teamSelect" className="block text-sm font-medium text-on-surface-variant mb-1">Team</label>
                  <select 
                      id="teamSelect" 
                      value={targetTeamId} 
                      onChange={handleTeamChange} 
                      className="w-full bg-surface border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary text-sm"
                  >
                      <option value="">Personal (No Team)</option>
                      {teams.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                  </select>
              </div>
              <div>
                  <label htmlFor="projectSelect" className="block text-sm font-medium text-on-surface-variant mb-1">Project Board</label>
                  <select 
                      id="projectSelect" 
                      value={targetProjectId} 
                      onChange={(e) => setTargetProjectId(e.target.value)} 
                      className="w-full bg-surface border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary text-sm"
                      disabled={filteredProjects.length === 0}
                  >
                      {filteredProjects.length === 0 ? <option value="">No projects available</option> : null}
                      {filteredProjects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </select>
              </div>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-on-surface-variant mb-1">Title</label>
            <input type="text" id="title" name="title" value={formData.title || ''} onChange={handleChange} required className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary" />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-on-surface-variant mb-1">Description</label>
            <textarea id="description" name="description" value={formData.description || ''} onChange={handleChange} rows={3} className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary"></textarea>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-on-surface-variant mb-1">Status</label>
              <select id="status" name="status" value={formData.status} onChange={handleChange} className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary">
                {(Array.isArray(targetProject?.workflow) ? targetProject.workflow : []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-on-surface-variant mb-1">Priority</label>
              <select id="priority" name="priority" value={formData.priority} onChange={handleChange} className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary">
                {Object.values(TaskPriority).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-on-surface-variant mb-1">Start Date</label>
              <input type="date" id="startDate" name="startDate" value={toInputDateString(formData.startDate)} onChange={handleDateChange} className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-on-surface-variant mb-1">Due Date</label>
              <input type="date" id="dueDate" name="dueDate" value={toInputDateString(formData.dueDate)} onChange={handleDateChange} className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label htmlFor="targetDate" className="block text-sm font-medium text-on-surface-variant mb-1">Target Date (Optional)</label>
              <input type="date" id="targetDate" name="targetDate" value={toInputDateString(formData.targetDate)} onChange={handleDateChange} className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label htmlFor="eventDate" className="block text-sm font-medium text-on-surface-variant mb-1">Date of Event (Optional)</label>
              <input type="date" id="eventDate" name="eventDate" value={toInputDateString(formData.eventDate)} onChange={handleDateChange} className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label htmlFor="recurrence" className="block text-sm font-medium text-on-surface-variant mb-1">Repeating</label>
              <select id="recurrence" name="recurrence" value={formData.recurrence} onChange={handleChange} className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary">
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Custom Fields */}
          {targetProject?.customFields && targetProject.customFields.length > 0 && (
               <div className="space-y-4 pt-4 border-t border-outline/30">
                   <h3 className="text-sm font-medium text-on-surface-variant">Custom Fields</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {targetProject.customFields.map(field => (
                           <div key={field.id}>
                              <label htmlFor={`cf-${field.id}`} className="block text-sm font-medium text-on-surface-variant mb-1">{field.name}</label>
                              <CustomFieldInput field={field} value={customFieldValues[field.id]} onChange={value => handleCustomFieldChange(field.id, value)} />
                          </div>
                      ))}
                   </div>
               </div>
          )}

          {/* Dependencies */}
          <div>
            <label htmlFor="dependsOn" className="block text-sm font-medium text-on-surface-variant mb-1">Dependencies</label>
            <div className="space-y-2 max-h-32 overflow-y-auto bg-surface-variant/70 p-2 rounded-md border border-outline/50">
              {availableDependencies.length > 0 ? availableDependencies.map(depTask => (
                <button
                  key={depTask.id}
                  type="button"
                  onClick={() => handleDependencyToggle(depTask.id)}
                  className={`w-full text-left p-2 rounded-md text-sm transition-colors border ${selectedDependencies.has(depTask.id) ? 'bg-primary/10 border-primary text-primary font-medium' : 'bg-surface border-outline/30 text-on-surface-variant hover:bg-on-surface/5'}`}
                >
                  {depTask.title}
                </button>
              )) : <p className="text-xs text-on-surface-variant p-4 text-center">No other tasks available for dependency.</p>}
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label htmlFor="assignees" className="block text-sm font-medium text-on-surface-variant mb-1">Assignees</label>
            <div className="flex flex-wrap gap-2">
              {projectMembers.map(user => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleAssigneeToggle(user.id)}
                  className={`flex items-center gap-2 p-1 pr-3 rounded-full text-sm transition-colors border ${selectedAssignees.has(user.id) ? 'bg-primary/10 border-primary text-primary font-medium' : 'bg-surface-variant border-outline/50 text-on-surface-variant hover:bg-on-surface/5'}`}
                >
                  <img src={user.avatarUrl} alt={user.name} className="h-6 w-6 rounded-full" />
                  {user.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-outline/30 bg-surface/50 rounded-b-3xl flex justify-end items-center">
          <button
            type="submit"
            disabled={isLoading || !formData.title.trim() || !targetProjectId}
            className="px-6 py-2.5 text-sm font-semibold text-on-primary bg-primary rounded-full hover:bg-primary/90 transition-colors shadow-m3-md shadow-primary/20 disabled:bg-on-surface-variant/50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskEditModal;
