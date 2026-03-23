
import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { CheckCircle2, TrashIcon, XIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';

const BatchActionBar: React.FC = () => {
    const { selectedTaskIds, clearTaskSelection, bulkDeleteTasks, bulkUpdateTasks, selectedProject } = useAppContext();
    
    const handleMarkDone = async () => {
        if (!selectedProject) return;
        const doneStatus = selectedProject.workflow.find(s => s.name.toLowerCase() === 'done');
        if (doneStatus) {
            await bulkUpdateTasks({ status: doneStatus.id });
        } else {
            // Fallback if 'done' status isn't explicitly named 'done'
            const lastStatus = selectedProject.workflow[selectedProject.workflow.length - 1];
            await bulkUpdateTasks({ status: lastStatus.id });
        }
    };

    return (
        <AnimatePresence>
            {selectedTaskIds.size > 0 && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-surface-variant text-on-surface border border-outline/30 shadow-m3-lg rounded-2xl p-2 z-50 flex items-center gap-2 backdrop-blur-xl"
                >
                    <div className="flex items-center gap-2 px-3 border-r border-outline/30">
                        <div className="bg-primary text-on-primary font-bold text-xs rounded-full w-6 h-6 flex items-center justify-center">
                            {selectedTaskIds.size}
                        </div>
                        <span className="text-sm font-medium">Selected</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                         <button onClick={handleMarkDone} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface text-sm font-medium transition-colors text-success hover:text-success/80" title="Mark as Done">
                            <CheckCircle2 className="h-4 w-4" /> Done
                        </button>
                        
                        <div className="h-4 w-px bg-outline/30 mx-1"></div>

                        <button onClick={bulkDeleteTasks} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-surface text-sm font-medium transition-colors text-danger hover:text-danger/80" title="Delete Tasks">
                            <TrashIcon className="h-4 w-4" /> Delete
                        </button>
                        
                         <div className="h-4 w-px bg-outline/30 mx-1"></div>
                         
                         <button onClick={clearTaskSelection} className="p-2 rounded-lg hover:bg-surface text-on-surface-variant transition-colors" title="Clear Selection">
                            <XIcon className="h-4 w-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default BatchActionBar;
