
import React, { useState, useEffect, useRef } from 'react';
import { 
    ChatBubbleLeftRightIcon, 
    XMarkIcon,
    PaperAirplaneIcon,
    FaceSmileIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../contexts/AppContext';
import MentionInput from './MentionInput';

const GoogleChatWidget: React.FC = () => {
  const { selectedTeam, teamChatMessages, sendTeamChatMessage, currentUser, allUsers } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageCount = useRef(teamChatMessages.length);

  useEffect(() => {
    if (!isOpen && teamChatMessages.length > lastMessageCount.current) {
        setHasNewMessages(true);
    }
    lastMessageCount.current = teamChatMessages.length;
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [teamChatMessages, isOpen]);

  const handleOpen = () => {
      setIsOpen(true);
      setHasNewMessages(false);
  };

  const handleSend = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!messageText.trim() || !selectedTeam) return;
      const text = messageText;
      setMessageText('');
      await sendTeamChatMessage(text);
  };

  return (
    <div className="fixed bottom-20 right-28 lg:bottom-8 lg:right-32 z-[100] flex flex-col items-end pointer-events-none">
      
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20, pointerEvents: 'none' }}
            className="bg-surface border border-outline shadow-m3-lg rounded-3xl mb-4 w-[320px] sm:w-[380px] h-[500px] pointer-events-auto overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-outline/30 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <ChatBubbleLeftRightIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-sm text-on-surface truncate">
                            {selectedTeam ? `${selectedTeam.name} Chat` : 'Team Chat'}
                        </p>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                            <span className="text-[10px] font-bold text-success uppercase tracking-wider">Live</span>
                        </div>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-on-surface/5 rounded-full transition-colors">
                    <XMarkIcon className="w-5 h-5 text-on-surface-variant" />
                </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-surface-variant/5" ref={scrollRef}>
                {!selectedTeam ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 opacity-50">
                        <ChatBubbleLeftRightIcon className="w-12 h-12" />
                        <p className="text-xs font-bold uppercase tracking-widest">Select a team to start chatting</p>
                    </div>
                ) : teamChatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 opacity-40">
                        <p className="text-xs italic font-medium">No messages yet. Say hello to the team!</p>
                    </div>
                ) : (
                    teamChatMessages.map((msg) => {
                        const isMe = msg.senderId === currentUser?.id;
                        return (
                            <div key={msg.id} className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                <img src={msg.senderAvatar} className="w-7 h-7 rounded-full flex-shrink-0 mt-1 border border-outline/10" />
                                <div className={`max-w-[80%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    {!isMe && <p className="text-[10px] font-bold text-on-surface-variant/70 mb-1 ml-1">{msg.senderName}</p>}
                                    <div className={`p-3 rounded-2xl text-sm shadow-sm ${isMe ? 'bg-primary text-on-primary rounded-tr-none' : 'bg-surface border border-outline/20 rounded-tl-none text-on-surface'}`}>
                                        {msg.text}
                                    </div>
                                    <p className="text-[8px] text-on-surface-variant/50 mt-1 uppercase font-bold tracking-tighter">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            
            {/* Input Area */}
            <form onSubmit={handleSend} className="p-3 border-t border-outline/20 bg-surface flex items-center gap-2">
                <div className="relative flex-1">
                    <MentionInput 
                        value={messageText}
                        onChange={setMessageText}
                        onSend={handleSend}
                        placeholder="Message team..." 
                        disabled={!selectedTeam}
                        suggestions={allUsers}
                        className="w-full bg-surface-variant/40 border border-outline/30 rounded-2xl pl-4 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-primary transition-colors">
                        <FaceSmileIcon className="w-5 h-5" />
                    </button>
                </div>
                <button 
                    type="submit"
                    disabled={!messageText.trim() || !selectedTeam}
                    className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-m3-md hover:bg-primary/90 transition-all disabled:opacity-50 active:scale-95"
                >
                    <PaperAirplaneIcon className="w-5 h-5" />
                </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <motion.button 
        onClick={handleOpen}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="group relative h-16 w-16 rounded-2xl bg-surface border border-outline/50 shadow-m3-lg flex items-center justify-center transition-all pointer-events-auto overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-secondary/5" />
        
        <div className="relative">
            <ChatBubbleLeftRightIcon className={`w-8 h-8 transition-colors duration-300 ${isOpen ? 'text-primary' : 'text-on-surface-variant'}`} />
            {hasNewMessages && !isOpen && (
              <div className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-40"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-danger border-2 border-surface"></span>
              </div>
            )}
        </div>

        <div className="absolute top-0 left-0 right-0 h-1 flex">
            <div className="flex-1 bg-primary opacity-40" />
            <div className="flex-1 bg-secondary opacity-40" />
        </div>
      </motion.button>
    </div>
  );
};

export default GoogleChatWidget;
