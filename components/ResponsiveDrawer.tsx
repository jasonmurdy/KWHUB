
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon } from './icons';

interface ResponsiveDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const ResponsiveDrawer: React.FC<ResponsiveDrawerProps> = ({ isOpen, onClose, title, children }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Subtle backdrop to focus attention */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[110]"
            onClick={onClose}
          />
          
          <motion.div
            initial={isMobile ? { y: '100%', x: 0 } : { x: '100%', y: 0 }}
            animate={{ x: 0, y: 0 }}
            exit={isMobile ? { y: '100%', x: 0, pointerEvents: 'none' } : { x: '100%', y: 0, pointerEvents: 'none' }}
            transition={{ type: 'spring', damping: 35, stiffness: 400, mass: 1 }}
            className={`
              fixed z-[120] bg-surface shadow-[0_0_80px_rgba(0,0,0,0.15)] flex flex-col border-outline/10
              /* DESKTOP STYLES: Elegant Right Overlay */
              md:top-0 md:right-0 md:h-screen md:w-[400px] md:border-l md:border-outline/20 md:backdrop-blur-xl md:bg-surface/95
              /* MOBILE STYLES: Bottom Sheet */
              bottom-0 left-0 right-0 h-[80vh] w-full rounded-t-[3rem] border-t pb-[72px]
            `}
          >
            {/* Drag Handle for Mobile */}
            <div className="md:hidden absolute top-4 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-outline/20 rounded-full" />
            
            {/* Header */}
            <div className="flex items-center justify-between p-7 pt-10 md:pt-7 border-b border-outline/5 shrink-0">
                <div className="min-w-0">
                    <h2 className="text-2xl font-black text-on-surface tracking-tighter uppercase truncate leading-none mb-1">{title}</h2>
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">Hub Utilities</p>
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-3 bg-surface-variant/30 hover:bg-danger/10 hover:text-danger rounded-2xl transition-all border border-outline/10 shadow-sm"
                >
                    <XIcon className="h-5 w-5" />
                </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {children}
            </div>

            {/* Decorative Footer Element for Desktop */}
            <div className="hidden md:block p-6 border-t border-outline/5 bg-surface-variant/10">
                <div className="flex items-center justify-between text-[9px] font-black text-on-surface-variant/30 uppercase tracking-[0.3em]">
                    <span>Secure Hub Interface</span>
                    <span>Ready</span>
                </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ResponsiveDrawer;
