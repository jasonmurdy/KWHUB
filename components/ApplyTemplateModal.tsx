
import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { XIcon, LinkIcon, ListTodoIcon } from './icons';
// Fix: Import Variants type from framer-motion to fix type error.
import { motion, Variants } from 'framer-motion';

// Animation variants
const backdropVariants: Variants = {
  visible: { opacity: 1, pointerEvents: "auto" },
  hidden: { opacity: 0, pointerEvents: "none" },
};

const modalVariants: Variants = {
  hidden: { y: "50px", opacity: 0, scale: 0.95 },
  visible: {
    y: "0px",
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
  exit: { y: "50px", opacity: 0, scale: 0.95, transition: { duration: 0.2 }, pointerEvents: "none" },
};

const ApplyTemplateModal: React.FC = () => {
  const { templateToApply, closeApplyTemplateModal, projects, applyTemplate } = useAppContext();
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [importTasks, setImportTasks] = useState(true);
  const [importLinks, setImportLinks] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateToApply || !selectedProjectId) return;
    setIsLoading(true);
    try {
      await applyTemplate(templateToApply.id, selectedProjectId, { importTasks, importLinks });
      closeApplyTemplateModal();
    } catch (error) {
      console.error("Failed to apply template:", error);
      alert("Error applying template.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!templateToApply) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={closeApplyTemplateModal}
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="hidden"
    >
      <motion.div
        className="bg-surface border border-outline/30 rounded-3xl w-full h-full max-w-full lg:max-w-lg shadow-m3-lg"
        onClick={(e) => e.stopPropagation()}
        variants={modalVariants}
      >
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 border-b border-outline/30 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold text-on-surface">Apply Template</h2>
                <p className="text-sm text-on-surface-variant">&quot;{templateToApply.name}&quot;</p>
            </div>
            <button type="button" onClick={closeApplyTemplateModal} className="text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-on-surface/5">
              <XIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label htmlFor="project" className="block text-sm font-medium text-on-surface-variant mb-1">Select Project</label>
              <select 
                id="project" 
                value={selectedProjectId} 
                onChange={(e) => setSelectedProjectId(e.target.value)}
                required
                className="w-full bg-surface-variant/70 border border-outline/50 rounded-lg p-2.5 text-on-surface focus:ring-primary focus:border-primary"
              >
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-2">Import Options</label>
                <div className="space-y-3">
                    <label htmlFor="importTasks" className="flex items-center gap-3 p-3 bg-surface-variant/40 rounded-lg border border-outline/30 cursor-pointer">
                        <input
                            id="importTasks"
                            type="checkbox"
                            checked={importTasks}
                            onChange={(e) => setImportTasks(e.target.checked)}
                            className="h-4 w-4 rounded text-primary focus:ring-primary border-outline/50"
                        />
                        <ListTodoIcon className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-medium text-on-surface text-sm">Import Checklist as Tasks</p>
                            <p className="text-xs text-on-surface-variant">{templateToApply.tasks.length} tasks will be created.</p>
                        </div>
                    </label>
                     <label htmlFor="importLinks" className="flex items-center gap-3 p-3 bg-surface-variant/40 rounded-lg border border-outline/30 cursor-pointer">
                        <input
                            id="importLinks"
                            type="checkbox"
                            checked={importLinks}
                            onChange={(e) => setImportLinks(e.target.checked)}
                            className="h-4 w-4 rounded text-primary focus:ring-primary border-outline/50"
                        />
                        <LinkIcon className="h-5 w-5 text-primary" />
                        <div>
                            <p className="font-medium text-on-surface text-sm">Import Links</p>
                            <p className="text-xs text-on-surface-variant">{templateToApply.links.length} links will be attached to a new summary task.</p>
                        </div>
                    </label>
                </div>
            </div>
          </div>

          <div className="p-4 border-t border-outline/30 bg-surface/50 rounded-b-3xl flex justify-end items-center">
            <button
              type="submit"
              disabled={isLoading || !selectedProjectId || (!importLinks && !importTasks)}
              className="px-6 py-2.5 text-sm font-semibold text-on-primary bg-primary rounded-full hover:bg-primary/90 transition-colors shadow-m3-md shadow-primary/20 disabled:bg-on-surface-variant/50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Applying...' : 'Apply Template'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default ApplyTemplateModal;
