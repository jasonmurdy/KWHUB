import React, { useState } from 'react';
import { 
    LayoutDashboardIcon, 
    ListTodoIcon, 
    FolderKanbanIcon, 
    PlusIcon, 
    CommandIcon 
} from './icons';
import { useAppContext } from '../contexts/AppContext';
import { parseTaskInput } from '../services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';

const MicrophoneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
);

interface BottomNavBarProps {
    activeAuxTab: string | null;
    onAuxTabChange: (tab: string | null) => void;
}

interface SpeechRecognitionEvent {
    results: {
        [key: number]: {
            [key: number]: {
                transcript: string;
            };
        };
    };
}

interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: () => void;
    onend: () => void;
    onresult: (event: SpeechRecognitionEvent) => void;
    start: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeAuxTab, onAuxTabChange }) => {
    const { activeView, setActiveView, projects, selectedProject, teams, selectedTeam, selectProject, selectTeam, editTask, projectSubView, setProjectSubView, openGlobalSearch } = useAppContext();
    const [isListening, setIsListening] = useState(false);

    const handleNavClick = (view: string, subView?: 'kanban' | 'list') => {
        onAuxTabChange(null); // Close tools when navigating
        setActiveView(view);
        if (subView) {
            setProjectSubView(subView);
        }
        if (view === 'project' && projects.length > 0 && !selectedProject) {
            selectProject(projects[0].id, false);
        }
        if (view === 'teams' && teams.length > 0 && !selectedTeam) {
            selectTeam(teams[0].id, false);
        }
    };

    const handleVoiceCommand = (e: React.MouseEvent) => {
        e.stopPropagation();
        const win = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
        const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            editTask('new'); 
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = async (event: SpeechRecognitionEvent) => {
            const transcript = event.results[0][0].transcript;
            if (transcript) {
                try {
                    const parsedData = await parseTaskInput(transcript) as { title?: string; description?: string; dueDate?: string };
                    editTask('new', {
                        title: parsedData.title,
                        description: parsedData.description,
                        dueDate: parsedData.dueDate ? new Date(parsedData.dueDate) : undefined
                    });
                } catch {
                    editTask('new', { title: transcript });
                }
            }
        };

        recognition.start();
    };

    const isProjectViewActive = activeView === 'project';
    const isToolsActive = activeAuxTab !== null;

    return (
        <div className="fixed inset-x-0 bottom-0 z-[100] lg:hidden">
            <div className="absolute inset-0 bg-surface/80 backdrop-blur-xl border-t border-outline/20 shadow-[0_-8px_30px_rgb(0,0,0,0.08)]" />
            
            <nav className="relative flex justify-around items-end h-20 px-2 safe-area-bottom pb-3">
                
                <button
                    onClick={() => handleNavClick('dashboard')}
                    className={`flex flex-col items-center justify-center gap-1.5 w-16 h-full transition-all duration-300
                        ${activeView === 'dashboard' && !isToolsActive ? 'text-primary scale-110' : 'text-on-surface-variant/50'}`}
                >
                    <LayoutDashboardIcon className="h-6 w-6" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Home</span>
                </button>

                <button
                    onClick={() => handleNavClick('project', 'kanban')}
                    className={`flex flex-col items-center justify-center gap-1.5 w-16 h-full transition-all duration-300
                        ${isProjectViewActive && projectSubView === 'kanban' && !isToolsActive ? 'text-primary scale-110' : 'text-on-surface-variant/50'}`}
                >
                    <FolderKanbanIcon className="h-6 w-6" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Board</span>
                </button>

                <div className="relative h-full flex flex-col items-center">
                    <motion.button 
                        onClick={handleVoiceCommand}
                        onContextMenu={(e) => { e.preventDefault(); openGlobalSearch(); }}
                        whileTap={{ scale: 0.9 }}
                        className={`relative -top-8 w-16 h-16 rounded-3xl shadow-m3-lg flex items-center justify-center transition-all z-10
                            ${isListening ? 'bg-danger animate-pulse' : 'bg-gradient-to-br from-primary via-primary to-secondary text-on-primary'}`}
                    >
                        <AnimatePresence mode="wait">
                            {isListening ? (
                                <motion.div key="mic" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                    <MicrophoneIcon className="h-8 w-8" />
                                </motion.div>
                            ) : (
                                <motion.div key="plus" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                    <PlusIcon className="h-8 w-8" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <div className="absolute inset-0 bg-primary/30 blur-2xl -z-10 rounded-full" />
                    </motion.button>
                </div>

                <button
                    onClick={() => handleNavClick('project', 'list')}
                    className={`flex flex-col items-center justify-center gap-1.5 w-16 h-full transition-all duration-300
                        ${isProjectViewActive && projectSubView === 'list' && !isToolsActive ? 'text-primary scale-110' : 'text-on-surface-variant/50'}`}
                >
                    <ListTodoIcon className="h-6 w-6" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Tasks</span>
                </button>

                <button
                    onClick={() => onAuxTabChange(activeAuxTab === 'chat' ? null : 'chat')}
                    className={`flex flex-col items-center justify-center gap-1.5 w-16 h-full transition-all duration-300
                        ${isToolsActive ? 'text-primary scale-110' : 'text-on-surface-variant/50'}`}
                >
                    <CommandIcon className="h-6 w-6" />
                    <span className="text-[10px] font-black uppercase tracking-tighter">Tools</span>
                </button>

            </nav>
        </div>
    );
};

export default BottomNavBar;