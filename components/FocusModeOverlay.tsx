
import React from 'react';
import { motion } from 'framer-motion';
import { XIcon, TargetIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';

interface FocusModeOverlayProps {
  isActive: boolean;
  onClose: () => void;
}

const FocusModeOverlay: React.FC<FocusModeOverlayProps> = ({ isActive, onClose }) => {
  const { focusState, allTasks } = useAppContext();
  const activeTask = allTasks.find(t => t.id === focusState.taskId);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, pointerEvents: 'none' }}
      className="fixed inset-0 z-[200] bg-on-background/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-background"
    >
      <div className="absolute top-8 right-8">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-6 py-3 bg-background/10 hover:bg-background/20 rounded-2xl text-background font-black text-xs uppercase tracking-widest transition-all border border-background/20"
        >
          <XIcon className="h-5 w-5" /> Exit Focus
        </button>
      </div>

      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="flex flex-col items-center max-w-2xl w-full text-center"
      >
        <div className="w-20 h-20 rounded-[2.5rem] bg-primary shadow-[0_0_40px_rgba(var(--color-primary),0.3)] flex items-center justify-center mb-12">
          <TargetIcon className="h-10 w-10 text-on-primary" />
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 text-background">
          {formatTime(focusState.timeLeft)}
        </h1>

        <div className="bg-background/5 p-10 rounded-[3rem] w-full border border-background/10 backdrop-blur-md">
          <p className="text-[10px] font-black text-background/40 uppercase tracking-[0.3em] mb-4">Current Objective</p>
          <h2 className="text-2xl md:text-3xl font-black text-background tracking-tight mb-4">
            {activeTask?.title || 'Personal Growth Session'}
          </h2>
          {activeTask?.description && (
            <p className="text-background/60 text-lg leading-relaxed max-w-lg mx-auto">
              {activeTask.description}
            </p>
          )}
        </div>

        <div className="mt-12 flex items-center gap-8 opacity-40">
           <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-widest mb-1">Status</span>
              <span className="text-sm font-bold">{focusState.isPaused ? 'Paused' : 'Flowing'}</span>
           </div>
           <div className="w-px h-8 bg-background/20" />
           <div className="flex flex-col items-center">
              <span className="text-[10px] font-black uppercase tracking-widest mb-1">Mode</span>
              <span className="text-sm font-bold">Deep Work</span>
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FocusModeOverlay;
