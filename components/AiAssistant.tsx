
import React, { useState, useCallback, useEffect } from 'react';
import { generateSubtaskPlan } from '../services/geminiService';
import { XIcon, PlusIcon, SparklesIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { AnimatedCheckbox } from './AnimatedCheckbox';
import { Modal } from './Modal';

const listVariants: Variants = {
  visible: { transition: { staggerChildren: 0.05 } },
  hidden: {},
};

const itemVariants: Variants = {
  visible: { opacity: 1, y: 0, transition: { type: 'spring' } },
  hidden: { opacity: 0, y: 20 },
};

const AiSubtaskGeneratorModal: React.FC = () => {
  const { generatingSubtasksForTask, closeAiSubtaskGenerator, addBatchSubtasks } = useAppContext();
  
  const [goal, setGoal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedSubtasks, setSuggestedSubtasks] = useState<string[]>([]);
  const [selectedSubtasks, setSelectedSubtasks] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (generatingSubtasksForTask) {
      setGoal('');
      setIsLoading(false);
      setSuggestedSubtasks([]);
      setSelectedSubtasks(new Set());
      setError('');
      setIsCreating(false);
    }
  }, [generatingSubtasksForTask]);
  
  const handleGeneratePlan = useCallback(async (prompt?: string) => {
    const objective = prompt || goal;
    if (!objective.trim() || !generatingSubtasksForTask) return;
    setIsLoading(true);
    setError('');
    setSuggestedSubtasks([]);
    try {
        const planItems = await generateSubtaskPlan(objective, generatingSubtasksForTask);
        setSuggestedSubtasks(planItems);
        setSelectedSubtasks(new Set(planItems)); // Select all by default
    } catch (err: unknown) {
        setError((err as Error).message || 'Failed to generate subtasks.');
    } finally {
        setIsLoading(false);
    }
  }, [goal, generatingSubtasksForTask]);
  
  const handleToggleSelect = (subtaskTitle: string) => {
    setSelectedSubtasks(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(subtaskTitle)) newSelection.delete(subtaskTitle);
      else newSelection.add(subtaskTitle);
      return newSelection;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedSubtasks.size === suggestedSubtasks.length && suggestedSubtasks.length > 0) {
      setSelectedSubtasks(new Set());
    } else {
      setSelectedSubtasks(new Set(suggestedSubtasks));
    }
  };

  const handleAddSubtasks = async () => {
    if (!generatingSubtasksForTask || selectedSubtasks.size === 0) return;
    setIsCreating(true);
    try {
        await addBatchSubtasks(generatingSubtasksForTask.id, Array.from(selectedSubtasks));
        closeAiSubtaskGenerator();
    } catch (err) {
        console.error(err);
        setError("Failed to add subtasks.");
    } finally {
        setIsCreating(false);
    }
  };

  const examplePrompts = [
    "Create a pre-launch marketing checklist.",
    "Break down the user testing phase.",
    "Outline steps for client onboarding.",
    "Generate a QA testing plan.",
  ];

  const handleExampleClick = (prompt: string) => {
    setGoal(prompt);
    handleGeneratePlan(prompt);
  };

  if (!generatingSubtasksForTask) return null;

  return (
    <Modal 
      onClose={closeAiSubtaskGenerator} 
      containerClassName="z-[150] flex items-center justify-center"
      panelClassName="bg-surface border border-outline/30 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-m3-lg"
    >
        <div className="p-4 border-b border-outline/30 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <SparklesIcon className="h-6 w-6 text-primary" />
            <div>
                <h2 className="text-xl font-bold text-on-surface">Generate Subtasks</h2>
                <p className="text-sm text-on-surface-variant truncate">For task: &quot;{generatingSubtasksForTask.title}&quot;</p>
            </div>
          </div>
          <button onClick={closeAiSubtaskGenerator} className="text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-on-surface/5">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            <div className="w-full md:w-2/5 p-6 border-b md:border-b-0 md:border-r border-outline/30 flex flex-col gap-4 bg-surface-variant/40">
                <h3 className="font-semibold text-on-surface">1. Describe your goal</h3>
                <textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    placeholder="E.g., 'Draft and finalize the client proposal' or 'Set up the new ad campaign'."
                    className="w-full h-24 bg-surface border border-outline/50 rounded-lg p-3 text-sm focus:ring-primary focus:border-primary"
                />
                <button
                    onClick={() => handleGeneratePlan()}
                    disabled={isLoading || !goal.trim()}
                    className="w-full px-4 py-2.5 font-semibold text-on-primary bg-primary rounded-full hover:bg-primary/90 transition-colors disabled:bg-on-surface-variant/50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-m3-md shadow-primary/20"
                >
                    {isLoading ? 'Generating...' : 'Generate Subtasks'}
                </button>

                <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-outline/50" /></div>
                    <div className="relative flex justify-center text-xs"><span className="px-2 bg-surface-variant/40 text-on-surface-variant">Or try an example</span></div>
                </div>
                <div className="space-y-2">
                    {examplePrompts.map(p => (
                        <button key={p} onClick={() => handleExampleClick(p)} className="w-full text-left text-sm text-primary hover:underline p-1">
                            {p}
                        </button>
                    ))}
                </div>
                 {error && <p className="text-danger text-sm mt-auto">{error}</p>}
            </div>
            <div className="flex-1 p-6 overflow-y-auto flex flex-col">
                <AnimatePresence mode="wait">
                {isLoading ? (
                     <motion.div key="loader" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="flex-1 flex flex-col items-center justify-center text-on-surface-variant">
                        <SparklesIcon className="h-12 w-12 animate-pulse text-primary/50" />
                        <p className="mt-4 font-medium">AI is crafting your checklist...</p>
                        <p className="text-sm">This might take a few moments.</p>
                    </motion.div>
                ) : suggestedSubtasks.length > 0 ? (
                    <motion.div key="results" className="flex flex-col h-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-on-surface">2. Select subtasks to add</h3>
                             <button 
                                onClick={handleAddSubtasks}
                                disabled={isCreating || selectedSubtasks.size === 0}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-on-secondary bg-secondary rounded-full hover:bg-secondary/90 transition-colors shadow-m3-md shadow-secondary/20 disabled:bg-on-surface-variant/50 disabled:cursor-not-allowed"
                            >
                                <PlusIcon className="h-4 w-4" />
                                {isCreating ? 'Adding...' : `Add ${selectedSubtasks.size} Subtasks`}
                            </button>
                        </div>
                        <div className="border-b border-outline/30 pb-2 mb-2">
                           <label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-on-surface/5">
                                <AnimatedCheckbox checked={suggestedSubtasks.length > 0 && selectedSubtasks.size === suggestedSubtasks.length} onChange={handleToggleSelectAll} />
                                <span className="text-sm font-semibold text-on-surface">Select All ({selectedSubtasks.size} / {suggestedSubtasks.length})</span>
                            </label>
                        </div>
                        <motion.div variants={listVariants} initial="hidden" animate="visible" className="space-y-2 overflow-y-auto flex-1 pr-1 -mr-2">
                            {suggestedSubtasks.map((title, i) => (
                                <motion.label key={i} variants={itemVariants} className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-outline/30 hover:bg-surface-variant/50 cursor-pointer">
                                    <AnimatedCheckbox checked={selectedSubtasks.has(title)} onChange={() => handleToggleSelect(title)} />
                                    <span className="text-sm font-medium text-on-surface">{title}</span>
                                </motion.label>
                            ))}
                        </motion.div>
                    </motion.div>
                ) : (
                    <motion.div key="placeholder" className="flex-1 flex flex-col items-center justify-center text-on-surface-variant text-center">
                        <p>Your suggested subtasks will appear here.</p>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
        </div>
    </Modal>
  );
};
// This renames the component to be imported correctly in App.tsx
const AiSubtaskGeneratorModalExport = AiSubtaskGeneratorModal;
export default AiSubtaskGeneratorModalExport;
