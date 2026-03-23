
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { PROJECT_TEMPLATES, PROJECT_COLORS } from '../constants';
import { XIcon, CheckCircle2 } from './icons';
import { Modal } from './Modal';

const CreateProjectModal: React.FC = () => {
  const { closeCreateProjectModal, createProject, teams, creatingProjectForTeamId } = useAppContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(PROJECT_TEMPLATES[0].id);
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [selectedTeamId, setSelectedTeamId] = useState(creatingProjectForTeamId || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    try {
      await createProject(name, description, selectedTemplate, color, selectedTeamId || undefined);
      closeCreateProjectModal();
      // Reset form for next time
      setName('');
      setDescription('');
      setSelectedTemplate(PROJECT_TEMPLATES[0].id);
      setColor(PROJECT_COLORS[0]);
      setSelectedTeamId('');
    } catch (error) {
      console.error("Failed to create project:", error);
      alert("There was an error creating your project. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal onClose={closeCreateProjectModal}>
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="p-6 border-b border-outline/30 flex justify-between items-center">
          <h2 className="text-xl font-bold text-on-surface">Create New Project</h2>
          <button type="button" onClick={closeCreateProjectModal} className="text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-on-surface/5">
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-on-surface-variant mb-1">Project Name</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary" />
          </div>
          
          {/* Team Selection */}
          <div>
            <label htmlFor="team" className="block text-sm font-medium text-on-surface-variant mb-1">Assign to Team</label>
            <select 
              id="team" 
              value={selectedTeamId} 
              onChange={(e) => setSelectedTeamId(e.target.value)} 
              className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary"
              disabled={!!creatingProjectForTeamId} // Disable if team was pre-selected via context action
            >
              <option value="">Personal Project (No Team)</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
            {creatingProjectForTeamId && <p className="text-xs text-on-surface-variant mt-1">Creating project directly for {teams.find(t => t.id === creatingProjectForTeamId)?.name}</p>}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-on-surface-variant mb-1">Description (Optional)</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2 text-on-surface focus:ring-primary focus:border-primary"></textarea>
          </div>
            <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">Project Color</label>
            <div className="flex flex-wrap gap-3">
              {PROJECT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-2">Choose a Template</label>
            <div className="flex overflow-x-auto space-x-4 py-2">
              {PROJECT_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`relative flex flex-col text-left p-4 rounded-xl border-2 transition-all w-64 flex-shrink-0 ${selectedTemplate === template.id ? 'border-primary bg-primary/5 shadow-md' : 'border-outline/50 bg-surface-variant hover:border-outline'}`}
                >
                  <div>
                    {selectedTemplate === template.id && (
                      <CheckCircle2 className="absolute top-2 right-2 h-5 w-5 text-primary" />
                    )}
                    <h4 className="font-semibold text-on-surface">{template.name}</h4>
                    <p className="text-xs text-on-surface-variant mt-1">{template.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {template.workflow.slice(0, 4).map(status => (
                      <span key={status.id} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${status.color}33`, color: status.color }}>{status.name}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-outline/30 bg-surface/50 rounded-b-3xl flex justify-end items-center">
          <button
            type="submit"
            disabled={isLoading || !name.trim()}
            className="px-6 py-2.5 text-sm font-semibold text-on-primary bg-primary rounded-full hover:bg-primary/90 transition-colors shadow-m3-md shadow-primary/20 disabled:bg-on-surface-variant/50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateProjectModal;
