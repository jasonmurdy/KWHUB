
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { 
    AlertCircleIcon, FileTextIcon, 
    ClockIcon, BriefcaseIcon, ChevronRightIcon, MenuIcon,
    StopIcon
} from './icons';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import DocumentEditor from './DocumentEditor';

type WindowState = 'normal' | 'maximized' | 'minimized';

const windowVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.9, 
    x: '100vw', // Move completely off-screen to right
    y: 0,
    width: '48vw', 
    height: '82vh',
    borderRadius: '1.5rem',
    position: 'absolute',
    top: '9%',
    right: '2rem',
    transition: { type: "spring", stiffness: 300, damping: 30 },
    transitionEnd: { display: "none" } // Critical Fix: Remove from layout after animation
  },
  normal: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    x: 0,
    width: '48vw', 
    height: '82vh', 
    borderRadius: '1.5rem',
    position: 'absolute',
    top: '9%',
    right: '2rem',
    left: 'auto',
    bottom: 'auto',
    display: 'flex',
    transition: { type: "spring", stiffness: 400, damping: 35 } 
  },
  maximized: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    x: 0,
    width: '100%', 
    height: '100%', 
    borderRadius: '0px',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    transition: { type: "spring", stiffness: 350, damping: 30 } 
  },
  minimized: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    x: 0,
    width: '340px', 
    height: '64px', 
    borderRadius: '16px 16px 0 0',
    position: 'absolute',
    top: 'auto',
    left: 'auto',
    bottom: 0,
    right: '4rem',
    display: 'flex',
    transition: { type: "spring", stiffness: 400, damping: 35 } 
  }
};

const ExternalLinkIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
);

const openCenteredPopup = (url: string, title: string, w = 1200, h = 800) => {
    const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
    const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;
    const width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    const height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
    const systemZoom = width / window.screen.availWidth;
    const left = (width - w) / 2 / systemZoom + dualScreenLeft;
    const top = (height - h) / 2 / systemZoom + dualScreenTop;
    
    const newWindow = window.open(url, title, `scrollbars=yes, width=${w / systemZoom}, height=${h / systemZoom}, top=${top}, left=${left}`);
    if (newWindow) newWindow.focus();
};

const FileViewerModal: React.FC = () => {
  const { projects, viewingFile: file, isFileViewerOpen, closeFileViewer } = useAppContext();
  const [windowState, setWindowState] = useState<WindowState>('normal');
  const [showSidebar, setShowSidebar] = useState(false);
  const [isContainerActive, setIsContainerActive] = useState(false);
  
  const handleClose = useCallback(() => {
      closeFileViewer();
  }, [closeFileViewer]);

  useEffect(() => {
    if (isFileViewerOpen) {
        setIsContainerActive(true);
        if (windowState === 'maximized') {
            document.body.style.overflow = 'hidden';
        } else {
            // BUG FIX: Reset overflow if not maximized, even if open
            document.body.style.overflow = '';
        }
    } else {
        document.body.style.overflow = '';
        // Wait for exit animation to finish before collapsing container
        const timer = setTimeout(() => setIsContainerActive(false), 600);
        return () => clearTimeout(timer);
    }
  }, [isFileViewerOpen, windowState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFileViewerOpen) handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isFileViewerOpen]);

  // Determine active state for Framer Motion. 
  const activeVariant = !isFileViewerOpen ? 'hidden' : windowState;

  // Render nothing only if a file has NEVER been selected.
  // Once selected, we stay mounted to preserve state.
  if (!file) return null;

  const project = projects.find(p => p.id === file.projectId);
  const isInternalDoc = file.fileType === 'hub_doc';
  
  const originalUrl = file.url || '#';
  let fileUrl = file.embedUrl || originalUrl;
  
  const isGoogleDoc = fileUrl.includes('docs.google.com') || fileUrl.includes('drive.google.com');
  if (isGoogleDoc) {
      if (fileUrl.includes('/view')) fileUrl = fileUrl.replace(/\/view.*$/, '/edit');
      if (!fileUrl.includes('embedded=true')) {
          const separator = fileUrl.includes('?') ? '&' : '?';
          fileUrl = `${fileUrl}${separator}embedded=true`;
      }
  }

  const isBlockedFromFraming = 
    fileUrl.includes('contacts.google.com') || 
    fileUrl.includes('mail.google.com') || 
    fileUrl.includes('accounts.google.com');

  const toggleMaximize = () => setWindowState(curr => curr === 'maximized' ? 'normal' : 'maximized');
  const toggleMinimize = () => setWindowState(curr => curr === 'minimized' ? 'normal' : 'minimized');

  return (
    // Outer container: Controlled visibility to prevent blocking clicks when "closed"
    <div 
        className={`fixed z-[250] pointer-events-none flex flex-col justify-end items-end overflow-hidden transition-all duration-0
            ${isContainerActive ? 'inset-0' : 'bottom-0 right-0 w-0 h-0 invisible'}
        `}
    >
      
      {/* Immersive backdrop only when focused in full screen */}
      <AnimatePresence>
        {isFileViewerOpen && windowState === 'maximized' && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0, pointerEvents: 'none' }} // BUG FIX: Add pointerEvents: 'none'
                className="absolute inset-0 bg-black/70 backdrop-blur-md pointer-events-auto"
                onClick={() => setWindowState('normal')}
            />
        )}
      </AnimatePresence>

      <motion.div
        className={`bg-surface shadow-2xl border border-outline/40 overflow-hidden flex flex-col relative
            ${activeVariant === 'normal' ? 'mr-6 mb-6' : ''}
            ${isFileViewerOpen ? 'pointer-events-auto' : 'pointer-events-none'}
        `}
        variants={windowVariants}
        initial="hidden"
        animate={activeVariant}
        drag={activeVariant === 'normal'}
        dragMomentum={false}
      >
        {/* Simplified Header for better UX */}
        <div 
            className="flex items-center justify-between px-5 py-4 bg-surface-variant/90 backdrop-blur-2xl border-b border-outline/10 cursor-grab active:cursor-grabbing shrink-0"
            onDoubleClick={toggleMaximize}
        >
            <div className="flex items-center gap-4 min-w-0">
                <div className="flex gap-2 group mr-1">
                    <button onClick={handleClose} className="w-3.5 h-3.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-sm" title="Close Viewer" />
                    <button onClick={toggleMinimize} className="w-3.5 h-3.5 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors shadow-sm" title="Minimize Viewer" />
                    <button onClick={toggleMaximize} className="w-3.5 h-3.5 rounded-full bg-green-500 hover:bg-green-600 transition-colors shadow-sm" title="Fullscreen" />
                </div>
                
                <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                        <FileTextIcon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-black text-on-surface truncate tracking-tight uppercase leading-none mb-1">{file.name}</span>
                        <span className="text-[8px] font-bold text-on-surface-variant/60 uppercase tracking-widest leading-none">
                            {windowState === 'minimized' ? 'Minimized' : project?.name || 'Knowledge Resource'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {windowState !== 'minimized' && (
                    <>
                        {!isInternalDoc && (
                            <button 
                                onClick={(e) => { e.preventDefault(); openCenteredPopup(originalUrl, `Edit_${file.id}`); }} 
                                className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-primary hover:text-on-primary rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border border-outline/20 shadow-sm"
                            >
                                <ExternalLinkIcon className="h-3 w-3" />
                                <span className="hidden sm:inline">Launch Full Editor</span>
                            </button>
                        )}
                        <button 
                            onClick={() => setShowSidebar(!showSidebar)}
                            className={`p-1.5 rounded-xl transition-all ${showSidebar ? 'bg-primary/20 text-primary' : 'text-on-surface-variant hover:bg-on-surface/5'}`}
                            title="Information"
                        >
                            <MenuIcon className="h-5 w-5" />
                        </button>
                    </>
                )}
                <div className="w-px h-6 bg-outline/10 mx-1" />
                <button 
                    onClick={handleClose} 
                    className="flex items-center gap-2 px-3 py-1.5 bg-danger/10 hover:bg-danger text-danger hover:text-on-primary rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all border border-danger/20"
                >
                    <StopIcon className="h-3 w-3" /> Close
                </button>
            </div>
        </div>
        
        {/* Workspace Content */}
        <div className={`flex-1 flex overflow-hidden relative bg-[#f8f9fa] dark:bg-black/40 ${windowState === 'minimized' ? 'hidden' : 'flex'}`}>
            <div className="flex-1 relative flex flex-col w-full h-full">
                {isInternalDoc ? (
                    <div className="flex-1 overflow-hidden h-full bg-surface">
                        <DocumentEditor docId={file.docId || 'new'} onClose={handleClose} isEmbedded={true} />
                    </div>
                ) : isBlockedFromFraming ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-surface">
                        <div className="w-20 h-20 bg-warning/10 text-warning rounded-3xl flex items-center justify-center mb-6 border border-warning/20">
                            <AlertCircleIcon className="w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-black text-on-surface tracking-tight mb-3">Frame Restricted</h3>
                        <p className="text-on-surface-variant max-w-sm mb-8 text-sm leading-relaxed font-medium">
                            Security policies prevent this document from being viewed in an overlay.
                        </p>
                        <button 
                            onClick={(e) => { e.preventDefault(); openCenteredPopup(originalUrl, `Edit_${file.id}`); }}
                            className="px-8 py-3 bg-primary text-on-primary rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-m3-md hover:scale-105 transition-all flex items-center gap-3"
                        >
                            Open in New Window <ChevronRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <iframe 
                        src={fileUrl} 
                        className="flex-1 w-full h-full border-0 bg-white" 
                        title={file.name}
                        allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-read; clipboard-write; camera; microphone"
                    />
                )}
            </div>

            {/* Context Panel */}
            <AnimatePresence>
                {showSidebar && (
                    <motion.div 
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 280, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="bg-surface border-l border-outline/10 flex flex-col overflow-hidden shadow-2xl z-20 shrink-0"
                    >
                        <div className="p-7 space-y-10 min-w-[280px]">
                            <section>
                                <h4 className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em] mb-6">Asset Intelligence</h4>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2.5 bg-primary/5 rounded-xl"><BriefcaseIcon className="w-4 h-4 text-primary" /></div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-0.5">Parent Project</p>
                                            <p className="text-xs font-bold text-on-surface truncate">{project?.name || 'Standalone Asset'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="p-2.5 bg-secondary/5 rounded-xl"><ClockIcon className="w-4 h-4 text-secondary" /></div>
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-black text-on-surface-variant/50 uppercase tracking-widest mb-0.5">Source Provider</p>
                                            <p className="text-xs font-bold text-on-surface capitalize tracking-tight">{file.fileType} Protocol</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <div className="p-5 bg-primary/5 rounded-[2rem] border border-primary/10">
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.15em] mb-2">Editor Controls</p>
                                <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed opacity-70">
                                    While open, you can still interact with your tasks and project board on the left side of the screen.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default FileViewerModal;
