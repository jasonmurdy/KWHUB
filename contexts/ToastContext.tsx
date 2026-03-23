import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'notification';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  action?: ToastAction;
  persistent?: boolean;
}

export interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ToastIcon: React.FC<{ type: ToastType }> = ({ type }) => {
    switch (type) {
        case 'success':
            return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-success"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
        case 'error':
            return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-danger"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
        case 'warning':
            return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-warning"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
        case 'info':
            return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-primary"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>;
        case 'notification':
            return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-secondary"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;
    }
};

const ToastMessage = React.forwardRef<HTMLDivElement, { toast: Toast; onRemove: (id: number) => void }>(({ toast, onRemove }, ref) => {
    React.useEffect(() => {
        if (!toast.persistent) {
            const timer = setTimeout(() => onRemove(toast.id), 6000);
            return () => clearTimeout(timer);
        }
    }, [toast.id, toast.persistent, onRemove]);

    return (
        <motion.div
            ref={ref}
            layout
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            className="w-full max-w-sm bg-surface rounded-2xl shadow-m3-lg border border-outline/30 p-4 mb-2 overflow-hidden"
        >
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-0.5">
                    <ToastIcon type={toast.type} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-on-surface text-sm">{toast.title}</p>
                    {toast.message && <p className="mt-1 text-xs text-on-surface-variant leading-relaxed">{toast.message}</p>}
                    
                    {toast.action && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                toast.action?.onClick();
                                onRemove(toast.id);
                            }}
                            className="mt-3 px-4 py-1.5 bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:bg-primary/90 transition-all"
                        >
                            {toast.action.label}
                        </button>
                    )}
                </div>
                <button onClick={() => onRemove(toast.id)} className="p-1 -mr-1 text-on-surface-variant/30 hover:text-on-surface-variant transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
            </div>
        </motion.div>
    );
});
ToastMessage.displayName = 'ToastMessage';

export const ToastContainer: React.FC = () => {
    const { toasts, removeToast } = useToastInternal();
    return (
        <div className="fixed top-4 right-4 z-[200] flex flex-col items-end">
            <AnimatePresence mode="popLayout">
                {toasts.map(toast => (
                    <ToastMessage key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </AnimatePresence>
        </div>
    );
};

interface ToastProviderProps {
  children: ReactNode;
}

const ToastProviderInternalContext = createContext<{
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: number) => void;
} | undefined>(undefined);

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        setToasts(prev => [...prev, { ...toast, id: Date.now() }]);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const value = { toasts, addToast, removeToast };

    return (
        <ToastProviderInternalContext.Provider value={value}>
            <ToastContext.Provider value={{ addToast }}>
                {children}
            </ToastContext.Provider>
        </ToastProviderInternalContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const useToastInternal = () => {
  const context = useContext(ToastProviderInternalContext);
  if (!context) {
    throw new Error('useToastInternal must be used within a ToastProvider');
  }
  return context;
};