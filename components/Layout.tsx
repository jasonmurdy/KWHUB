import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import Header from './Header';
import DashboardView from './DashboardView';
import ProjectView from './ProjectView';
import TeamsView from './TeamsView';
import CalendarPageView from './CalendarPageView';
import IdealWeekView from './IdealWeekView'; 
import FormsView from './FormsView';
import TemplatesView from './TemplatesView';
import RoadmapView from './RoadmapView';
import ReportsView from './ReportsView';
import ActivityLogView from './ActivityLogView';
import SettingsView from './SettingsView';
import FocusModeView from './FocusModeView';
import ArchivedProjectsView from './ArchivedProjectsView';
import PrivacyPolicyView from './PrivacyPolicyView';
import TermsOfServiceView from './TermsOfServiceView';
import LeadPipelineView from './LeadPipelineView'; 
import HabitsView from './HabitsView';
import { useAppContext } from '../contexts/AppContext';
import BatchActionBar from './BatchActionBar';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRightIcon, MessageSquareIcon, ListTodoIcon, PlusIcon, TrashIcon, RocketIcon } from './icons';
import { AnimatedCheckbox } from './AnimatedCheckbox';

// Core UI Components
import ResponsiveDrawer from './ResponsiveDrawer';
import FocusModeOverlay from './FocusModeOverlay';
import BottomNavBar from './BottomNavBar';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    activeView, 
    teamChatMessages, 
    currentUser, 
    sendTeamChatMessage, 
    editTask, 
    checklist,
    addChecklistItem, 
    toggleChecklistItem, 
    removeChecklistItem, 
    clearCompletedChecklistItems 
  } = useAppContext();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Utility State (Header and Bottom-Nav triggered)
  const [activeAuxTab, setActiveAuxTab] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [brainDump, setBrainDump] = useState('');
  const [checkInput, setCheckInput] = useState('');
  
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [teamChatMessages, activeAuxTab]);

  const handleSendChat = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim()) return;
      const val = chatInput;
      setChatInput('');
      await sendTeamChatMessage(val);
  };

  const handleAddCheckItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInput.trim()) return;
    await addChecklistItem(checkInput.trim());
    setCheckInput('');
  };

  const handlePromoteToCheckItem = (text: string) => {
    editTask('new', { title: text });
    setActiveAuxTab(null);
  };

  const handleConvertToTask = () => {
    if (!brainDump.trim()) return;
    const lines = brainDump.trim().split('\n');
    const title = lines[0];
    editTask('new', { title, description: brainDump });
    setBrainDump('');
    setActiveAuxTab(null);
  };

  const renderView = () => {
    try {
      switch (activeView) {
        case 'dashboard': return <DashboardView />;
        case 'project': return <ProjectView />;
        case 'teams': return <TeamsView />;
        case 'calendar': return <CalendarPageView />;
        case 'ideal-week': return <IdealWeekView />;
        case 'forms': return <FormsView />;
        case 'templates': return <TemplatesView />;
        case 'roadmap': return <RoadmapView />;
        case 'reports': return <ReportsView />;
        case 'activity': return <ActivityLogView />;
        case 'settings': return <SettingsView />;
        case 'focus': return <FocusModeView />;
        case 'leads': return <LeadPipelineView />; 
        case 'habits': return <HabitsView />;
        case 'archived': return <ArchivedProjectsView />;
        case 'privacy': return <PrivacyPolicyView />;
        case 'terms': return <TermsOfServiceView />;
        default: return <DashboardView />;
      }
    } catch (e) {
      console.error("View Render Error:", e);
      return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Header 
          onMenuClick={() => setIsSidebarOpen(true)} 
          activeAuxTab={activeAuxTab}
          onAuxTabChange={setActiveAuxTab}
        />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative custom-scrollbar pb-[100px] lg:pb-8">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 }, pointerEvents: 'none' }} 
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="h-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
          {children}
        </main>
        
        <BatchActionBar />
        <BottomNavBar 
          activeAuxTab={activeAuxTab}
          onAuxTabChange={setActiveAuxTab}
        />

        <ResponsiveDrawer
          isOpen={activeAuxTab !== null && activeAuxTab !== 'focus'}
          onClose={() => setActiveAuxTab(null)}
          title={
            activeAuxTab === 'tasks' ? 'Checklist' :
            activeAuxTab === 'chat' ? 'Team Chat' : 'Quick Capture'
          }
        >
          <div className="flex flex-col h-full min-h-0">
              <div className="px-6 py-4 flex-shrink-0">
                <div className="flex items-center gap-1 p-1 bg-surface-variant/40 rounded-full border border-outline/10">
                    <button 
                        onClick={() => setActiveAuxTab('chat')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${activeAuxTab === 'chat' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant opacity-60'}`}
                    >
                        Chat
                    </button>
                    <button 
                        onClick={() => setActiveAuxTab('brain')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${activeAuxTab === 'brain' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant opacity-60'}`}
                    >
                        Capture
                    </button>
                    <button 
                        onClick={() => setActiveAuxTab('tasks')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${activeAuxTab === 'tasks' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant opacity-60'}`}
                    >
                        Checklist
                    </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-hidden">
                  <AnimatePresence mode="wait">
                      {activeAuxTab === 'chat' && (
                        <motion.div 
                            key="chat-tab"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-full flex flex-col"
                        >
                            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 space-y-4 pb-4" ref={chatScrollRef}>
                                {teamChatMessages.map((msg) => (
                                    <div key={msg.id} className={`flex flex-col ${msg.senderId === currentUser?.id ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-3 rounded-2xl text-sm max-w-[85%] ${msg.senderId === currentUser?.id ? 'bg-primary text-on-primary rounded-tr-none' : 'bg-surface-variant/30 text-on-surface rounded-tl-none border border-outline/10'}`}>
                                            {msg.text}
                                        </div>
                                        <span className="text-[8px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-tighter">
                                            {msg.senderName.split(' ')[0]} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ))}
                                {teamChatMessages.length === 0 && (
                                    <div className="py-20 text-center opacity-30">
                                        <MessageSquareIcon className="w-12 h-12 mx-auto mb-2" />
                                        <p className="text-xs font-black uppercase tracking-widest">No recent messages</p>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSendChat} className="p-4 border-t border-outline/10 bg-surface shrink-0">
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        placeholder="Send to team..."
                                        className="w-full bg-surface-variant/20 border border-outline/20 rounded-2xl pl-4 pr-12 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!chatInput.trim()}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-on-primary rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                                    >
                                        <ChevronRightIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                      )}

                      {activeAuxTab === 'brain' && (
                        <motion.div 
                            key="brain-tab"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-full flex flex-col p-6 space-y-6"
                        >
                            <textarea 
                                value={brainDump}
                                onChange={e => setBrainDump(e.target.value)}
                                placeholder="Capture a quick thought or client detail..."
                                className="w-full flex-1 bg-surface-variant/20 border border-outline/20 rounded-[2rem] p-6 text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
                            />
                            <button 
                                onClick={handleConvertToTask}
                                disabled={!brainDump.trim()}
                                className="w-full p-4 bg-primary text-on-primary rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-m3-md hover:scale-[1.02] transition-transform disabled:opacity-30"
                            >
                                Convert to Action Item
                            </button>
                        </motion.div>
                      )}

                      {activeAuxTab === 'tasks' && (
                        <motion.div 
                            key="checklist-tab"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="h-full flex flex-col px-6 pb-6 overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-6 shrink-0">
                                <div>
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Hub Scratchpad</p>
                                    <p className="text-xs font-bold text-on-surface-variant opacity-40 uppercase tracking-widest">Transient Objectives</p>
                                </div>
                                <button 
                                    onClick={clearCompletedChecklistItems}
                                    className="p-2 text-on-surface-variant/40 hover:text-danger hover:bg-danger/5 rounded-xl transition-all"
                                    title="Purge Completed"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleAddCheckItem} className="mb-6 shrink-0">
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        value={checkInput}
                                        onChange={e => setCheckInput(e.target.value)}
                                        placeholder="Add to scratchpad..."
                                        className="w-full bg-surface-variant/20 border border-outline/20 rounded-2xl pl-4 pr-12 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                    <button 
                                        type="submit"
                                        disabled={!checkInput.trim()}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-on-primary rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                                    >
                                        <PlusIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            </form>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                                <AnimatePresence mode="popLayout">
                                    {(checklist || []).map(item => (
                                        <motion.div 
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className={`group p-4 bg-surface-variant/20 border border-outline/5 rounded-2xl flex items-center gap-4 hover:border-primary/20 transition-all ${item.isCompleted ? 'opacity-40' : ''}`}
                                        >
                                            <AnimatedCheckbox 
                                                checked={item.isCompleted} 
                                                onChange={() => toggleChecklistItem(item.id)} 
                                                className="shrink-0"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-bold truncate tracking-tight transition-all ${item.isCompleted ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                                                    {item.text}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {!item.isCompleted && (
                                                    <button 
                                                        onClick={() => handlePromoteToCheckItem(item.text)}
                                                        className="p-2 text-primary hover:bg-primary/10 rounded-xl"
                                                        title="Promote to Portfolio Job"
                                                    >
                                                        <RocketIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => removeChecklistItem(item.id)}
                                                    className="p-2 text-on-surface-variant/40 hover:text-danger rounded-xl"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                                {(checklist || []).length === 0 && (
                                    <div className="py-24 flex flex-col items-center justify-center text-center opacity-20 grayscale">
                                        <ListTodoIcon className="w-16 h-16 mb-4" />
                                        <p className="text-sm font-black uppercase tracking-widest">Scratchpad Blank</p>
                                        <p className="text-[10px] font-bold mt-2 uppercase">Input transient objectives above</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                      )}
                  </AnimatePresence>
              </div>
          </div>
        </ResponsiveDrawer>

        <AnimatePresence>
          {activeAuxTab === 'focus' && (
            <FocusModeOverlay 
              isActive={true} 
              onClose={() => setActiveAuxTab(null)} 
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Layout;