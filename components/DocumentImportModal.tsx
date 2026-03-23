
import React, { useState } from 'react';
import { generateTemplateFromFile } from '../services/geminiService';
import { Modal } from './Modal';
import { XIcon, TrashIcon, PlusIcon, FileTextIcon, SparklesIcon, UploadCloudIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';

interface DraftTask {
  title: string;
  description: string;
}

interface DraftTemplate {
  name: string;
  description: string;
  tasks: DraftTask[];
}

export const DocumentImportModal = ({ onClose, onSave }: { onClose: () => void, onSave: (template: unknown) => void }) => {
  const [step, setStep] = useState<'upload' | 'processing' | 'verify'>('upload');
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('');
  const [draftData, setDraftData] = useState<DraftTemplate | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    // 1. Create Preview
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = (reader.result as string).split(',')[1];
      setFilePreview(reader.result as string);
      setFileType(file.type);
      setStep('processing');

      try {
        // 2. Call Gemini
        const result = await generateTemplateFromFile(base64String, file.type) as DraftTemplate;
        setDraftData(result);
        setStep('verify');
      } catch (err: unknown) {
        console.error(err);
        setError((err as Error).message || 'Failed to process document');
        setStep('upload');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTaskChange = (index: number, field: keyof DraftTask, value: string) => {
    if (!draftData) return;
    const newTasks = [...draftData.tasks];
    newTasks[index] = { ...newTasks[index], [field]: value };
    setDraftData({ ...draftData, tasks: newTasks });
  };

  const handleDeleteTask = (index: number) => {
    if (!draftData) return;
    const newTasks = draftData.tasks.filter((_, i: number) => i !== index);
    setDraftData({ ...draftData, tasks: newTasks });
  };

  const handleAddTask = () => {
    if (!draftData) return;
    setDraftData({
      ...draftData,
      tasks: [...draftData.tasks, { title: '', description: '' }]
    });
  };

  const handleCreate = () => {
    if (!draftData) return;
    // 3. Format for App (add IDs)
    const finalTemplate = {
      id: crypto.randomUUID(),
      name: draftData.name,
      description: draftData.description,
      tasks: draftData.tasks.map((t: DraftTask) => ({
        id: crypto.randomUUID(),
        title: t.title,
        description: t.description,
        section: 'To Do'
      })),
      links: [],
      isShared: false,
      creatorId: '', // Set by context in TemplatesView or AppContext logic
      createdAt: new Date()
    };
    onSave(finalTemplate);
    onClose();
  };

  const renderPreview = () => {
      if (!filePreview) return null;
      if (fileType === 'application/pdf') {
          return (
              <embed src={filePreview} type="application/pdf" className="w-full h-full rounded-xl object-contain border border-outline/10" />
          );
      }
      return (
          <img src={filePreview} alt="Document Preview" className="w-full h-full rounded-xl object-contain border border-outline/10 bg-surface-variant/10" />
      );
  };

  return (
    <Modal onClose={onClose} containerClassName="z-[200] flex items-center justify-center" panelClassName="w-full max-w-6xl h-[90vh] bg-surface border border-outline/30 rounded-3xl shadow-m3-lg flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="p-6 border-b border-outline/10 flex justify-between items-center bg-surface/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <SparklesIcon className="w-6 h-6" />
            </div>
            <div>
                <h2 className="text-xl font-black text-on-surface uppercase tracking-tight leading-none">Import Strategy</h2>
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] opacity-60 mt-1">AI Document Digitizer</p>
            </div>
        </div>
        <button onClick={onClose} className="p-3 bg-surface-variant/30 hover:bg-danger/10 hover:text-danger rounded-2xl transition-all border border-outline/10">
            <XIcon className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
            {step === 'upload' && (
                <motion.div 
                    key="upload"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                >
                    <div className="max-w-md w-full border-2 border-dashed border-outline/30 rounded-[3rem] p-12 bg-surface-variant/5 hover:bg-surface-variant/10 transition-colors group relative cursor-pointer">
                        <input 
                            type="file" 
                            accept="image/*,application/pdf"
                            onChange={handleFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <UploadCloudIcon className="w-20 h-20 text-primary/30 mx-auto mb-6 group-hover:scale-110 transition-transform duration-300" />
                        <h3 className="text-xl font-bold text-on-surface mb-2">Drop your SOP or Checklist</h3>
                        <p className="text-sm text-on-surface-variant/70 mb-6">Supports Images (PNG, JPG) and PDF</p>
                        <button className="px-6 py-2 bg-surface border border-outline/20 rounded-full text-sm font-bold shadow-sm pointer-events-none group-hover:border-primary/50 transition-colors">
                            Select File
                        </button>
                    </div>
                    {error && (
                        <div className="mt-6 p-4 bg-danger/10 text-danger rounded-2xl text-sm font-medium border border-danger/20 max-w-md">
                            {error}
                        </div>
                    )}
                </motion.div>
            )}

            {step === 'processing' && (
                <motion.div 
                    key="processing"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                >
                    <div className="relative mb-8">
                        <div className="w-24 h-24 rounded-full border-4 border-primary/20 animate-spin border-t-primary" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <SparklesIcon className="w-8 h-8 text-primary animate-pulse" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black text-on-surface tracking-tight mb-2">Analyzing Structure</h3>
                    <p className="text-on-surface-variant/60 font-medium">Extracting tasks and descriptions from your document...</p>
                </motion.div>
            )}

            {step === 'verify' && draftData && (
                <motion.div 
                    key="verify"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col lg:flex-row"
                >
                    {/* Left: Preview */}
                    <div className="w-full lg:w-1/3 bg-surface-variant/20 border-b lg:border-b-0 lg:border-r border-outline/10 p-6 flex flex-col">
                        <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-4 flex items-center gap-2">
                            <FileTextIcon className="w-4 h-4" /> Original Source
                        </h4>
                        <div className="flex-1 rounded-2xl overflow-hidden bg-surface shadow-inner border border-outline/10 relative">
                            {renderPreview()}
                        </div>
                    </div>

                    {/* Right: Editor */}
                    <div className="flex-1 flex flex-col overflow-hidden bg-surface">
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                            
                            {/* Meta Data */}
                            <div className="space-y-6 p-6 bg-surface-variant/10 rounded-[2rem] border border-outline/10">
                                <div>
                                    <label className="text-[10px] font-black text-primary uppercase tracking-widest mb-2 block">Template Name</label>
                                    <input 
                                        type="text" 
                                        value={draftData.name} 
                                        onChange={(e) => setDraftData({...draftData, name: e.target.value})}
                                        className="w-full bg-surface border border-outline/10 rounded-xl px-4 py-3 text-lg font-bold outline-none focus:ring-2 ring-primary/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2 block">Description</label>
                                    <textarea 
                                        value={draftData.description} 
                                        onChange={(e) => setDraftData({...draftData, description: e.target.value})}
                                        rows={2}
                                        className="w-full bg-surface border border-outline/10 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 ring-primary/20 resize-none"
                                    />
                                </div>
                            </div>

                            {/* Task List */}
                            <div>
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h4 className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Extracted Tasks ({draftData.tasks.length})</h4>
                                    <button onClick={handleAddTask} className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors">
                                        <PlusIcon className="w-3.5 h-3.5" /> Add Task
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {draftData.tasks.map((task: DraftTask, index: number) => (
                                        <div key={index} className="group bg-surface p-4 rounded-2xl border border-outline/20 hover:border-primary/30 transition-all shadow-sm">
                                            <div className="flex gap-4 items-start">
                                                <div className="flex-1 space-y-2">
                                                    <input 
                                                        type="text" 
                                                        value={task.title}
                                                        onChange={(e) => handleTaskChange(index, 'title', e.target.value)}
                                                        placeholder="Task Title"
                                                        className="w-full bg-transparent font-bold text-sm text-on-surface border-b border-transparent focus:border-primary/20 outline-none pb-1"
                                                    />
                                                    <textarea 
                                                        value={task.description}
                                                        onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
                                                        placeholder="Task details..."
                                                        rows={1}
                                                        className="w-full bg-transparent text-xs text-on-surface-variant font-medium resize-none outline-none focus:bg-surface-variant/20 rounded p-1 -ml-1 transition-colors"
                                                    />
                                                </div>
                                                <button onClick={() => handleDeleteTask(index)} className="p-2 text-on-surface-variant/30 hover:text-danger hover:bg-danger/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-outline/10 bg-surface/50 flex justify-end gap-4">
                            <button onClick={() => setStep('upload')} className="px-6 py-3 text-xs font-black text-on-surface-variant uppercase tracking-widest hover:bg-surface-variant/50 rounded-2xl transition-all">
                                Back to Upload
                            </button>
                            <button onClick={handleCreate} className="px-8 py-3 bg-primary text-on-primary rounded-2xl text-xs font-black uppercase tracking-widest shadow-m3-md hover:bg-primary/90 transition-all active:scale-95">
                                Create Template
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </div>
    </Modal>
  );
};
