
import React, { useState, useEffect, useRef } from 'react';
import { EditIcon, XIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

const CaptureBar: React.FC = () => {
    const { editTask } = useAppContext();
    const [isOpen, setIsOpen] = useState(false);
    const [content, setContent] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const savedContent = localStorage.getItem('kwhub-capturebar-content');
        if (savedContent) {
            setContent(savedContent);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            textareaRef.current?.focus();
        }
    }, [isOpen]);

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setContent(newContent);
        localStorage.setItem('kwhub-capturebar-content', newContent);
    };

    const handleCreateTask = () => {
        const textarea = textareaRef.current;
        if (!textarea || content.trim() === '') return;

        const { selectionStart, selectionEnd } = textarea;
        const isTextSelected = selectionStart !== selectionEnd;
        let textForTask = '';
        
        if (isTextSelected) {
            textForTask = content.substring(selectionStart, selectionEnd).trim();
        } else {
            textForTask = content.trim();
        }

        if (!textForTask) return;

        const lines = textForTask.split('\n');
        const title = lines[0];
        const description = textForTask;

        // Open the task modal
        editTask('new', { title, description });

        // Update the content in the capture bar
        if (isTextSelected) {
            // Remove the selected text and update
            const newContent = content.substring(0, selectionStart) + content.substring(selectionEnd);
            setContent(newContent);
            localStorage.setItem('kwhub-capturebar-content', newContent);
            textarea.focus(); // Keep focus for next task
        } else {
            // Clear everything and close
            setContent('');
            localStorage.removeItem('kwhub-capturebar-content');
            setIsOpen(false);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            handleCreateTask();
        }
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                )}
            </AnimatePresence>

            <div className="fixed bottom-20 right-6 lg:bottom-8 lg:right-8 z-50">
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="w-[90vw] max-w-lg bg-surface rounded-2xl shadow-m3-lg border border-outline/30 flex flex-col mb-4"
                        >
                            <div className="p-4">
                                <textarea
                                    ref={textareaRef}
                                    value={content}
                                    onChange={handleContentChange}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type or paste a list... then select text to create a task."
                                    className="w-full h-28 bg-transparent text-on-surface placeholder-on-surface-variant/70 focus:outline-none resize-none"
                                />
                            </div>
                            <div className="flex justify-between items-center p-3 border-t border-outline/30 bg-surface-variant/30 rounded-b-2xl">
                                <p className="text-xs text-on-surface-variant">
                                    Select text or use the whole note.
                                </p>
                                <button
                                    onClick={handleCreateTask}
                                    disabled={!content.trim()}
                                    className="px-4 py-2 text-sm font-semibold text-on-primary bg-primary rounded-full hover:bg-primary/90 transition-colors disabled:bg-on-surface-variant/50 disabled:cursor-not-allowed"
                                >
                                    Create Task
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.button
                    onClick={() => setIsOpen(!isOpen)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-16 h-16 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 text-white rounded-2xl flex items-center justify-center shadow-m3-lg ml-auto"
                    aria-label={isOpen ? "Close Capture" : "Open Capture"}
                >
                    <AnimatePresence initial={false} mode="wait">
                        <motion.div
                            key={isOpen ? 'close' : 'edit'}
                            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                            animate={{ rotate: 0, opacity: 1, scale: 1 }}
                            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.2 }}
                        >
                            {isOpen ? <XIcon className="w-8 h-8" /> : <EditIcon className="w-8 h-8" />}
                        </motion.div>
                    </AnimatePresence>
                </motion.button>
            </div>
        </>
    );
};

export default CaptureBar;