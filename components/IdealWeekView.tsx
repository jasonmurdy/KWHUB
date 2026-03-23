import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { IdealBlock, IdealCategory } from '../types';
import { TrashIcon, PlusIcon, XIcon, SettingsIcon, CalendarDaysIcon, BriefcaseIcon, TargetIcon, UsersIcon, SunIcon, SparklesIcon, RefreshCwIcon, ShieldCheckIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import { generateIdealWeekStrategy } from '../services/geminiService';
import { useToast } from '../contexts/ToastContext';

const DEFAULT_CATEGORIES: IdealCategory[] = [
    { id: 'focus', label: 'Deep Work', color: '#8b5cf6', icon: 'target' },
    { id: 'admin', label: 'Admin / Shallow', color: '#f59e0b', icon: 'briefcase' },
    { id: 'meeting', label: 'Meetings', color: '#3b82f6', icon: 'users' },
    { id: 'personal', label: 'Personal / Health', color: '#10b981', icon: 'sun' }
];

const ICON_MAP: Record<string, React.ReactNode> = {
    target: <TargetIcon className="w-3.5 h-3.5" />,
    briefcase: <BriefcaseIcon className="w-3.5 h-3.5" />,
    users: <UsersIcon className="w-3.5 h-3.5" />,
    sun: <SunIcon className="w-3.5 h-3.5" />,
    star: <SparklesIcon className="w-3.5 h-3.5" />,
    shield: <ShieldCheckIcon className="w-3.5 h-3.5" />
};

const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Compact constant for precision scaling
const HOUR_HEIGHT = 80; 

const formatTimeLabel = (decimalHour: number) => {
    const h = Math.floor(decimalHour);
    const m = Math.round((decimalHour - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
};

interface BlockItemProps {
    block: IdealBlock; 
    startHour: number; 
    onClick: (e: React.MouseEvent, b: IdealBlock) => void; 
    onDelete: (id: string) => void;
    onMirror: (b: IdealBlock) => void;
    isDimmed: boolean;
    categories: IdealCategory[];
}

const BlockItemBase = React.forwardRef<HTMLDivElement, BlockItemProps>(({ 
    block, startHour, onClick, onDelete, onMirror, isDimmed, categories 
}, ref) => {
    const top = (block.startHour - startHour) * HOUR_HEIGHT;
    const height = block.duration * HOUR_HEIGHT;
    const category = categories.find(c => c.id === block.category) || DEFAULT_CATEGORIES[0];
    const icon = ICON_MAP[category.icon] || ICON_MAP.target;

    return (
        <div
            ref={ref}
            onClick={(e) => onClick(e, block)}
            className="absolute inset-x-1.5 rounded-[1.25rem] p-3 shadow-m3-sm border-2 group/block cursor-pointer z-10 overflow-hidden transition-all duration-300 hover:shadow-m3-md hover:-translate-y-0.5 hover:ring-4 hover:ring-primary/10 hover:z-20"
            style={{ 
                top: `${top + 4}px`, 
                height: `${height - 8}px`, 
                backgroundColor: `${category.color}15`, 
                borderColor: `${category.color}30`,
                color: category.color,
                opacity: isDimmed ? 0.2 : 1,
                filter: isDimmed ? 'grayscale(1)' : 'grayscale(0)'
            }}
        >
            <div className="flex items-start justify-between gap-2 mb-0.5">
                <div className="flex items-center gap-1 bg-white/40 dark:bg-black/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border border-current/10 whitespace-nowrap">
                    {icon}
                    {formatTimeLabel(block.startHour)}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover/block:opacity-100 transition-opacity">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMirror(block); }}
                        className="p-1 rounded-lg hover:bg-primary/10 hover:text-primary"
                        title="Mirror across days"
                    >
                        <RefreshCwIcon className="w-3 h-3" />
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(block.id); }}
                        className="p-1 rounded-lg hover:bg-danger/10 hover:text-danger"
                    >
                        <TrashIcon className="w-3 h-3" />
                    </button>
                </div>
            </div>
            <div className="font-black text-xs tracking-tight leading-tight line-clamp-2 uppercase">
                {block.title}
            </div>
            <div className="absolute -bottom-1 -right-1 opacity-[0.03] scale-[2] pointer-events-none group-hover/block:opacity-10 transition-opacity">
                {icon}
            </div>
        </div>
    );
});
BlockItemBase.displayName = 'BlockItemBase';

const MotionBlockItem = motion(BlockItemBase);
const BlockItem = React.memo(MotionBlockItem);

const BlockModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    day: number; 
    hour: number;
    editingBlock?: IdealBlock;
    categories: IdealCategory[];
    onSave: (block: Omit<IdealBlock, 'id'>) => void;
    onUpdate: (id: string, updates: Partial<IdealBlock>) => void;
}> = ({ isOpen, onClose, day, hour, editingBlock, categories, onSave, onUpdate }) => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [duration, setDuration] = useState(1);
    const [startH, setStartH] = useState(9);
    const [startM, setStartM] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setTitle(editingBlock?.title || '');
            setCategory(editingBlock?.category || categories[0]?.id || 'focus');
            setDuration(editingBlock?.duration || 1);
            const initialHour = editingBlock ? Math.floor(editingBlock.startHour) : hour;
            const initialMin = editingBlock ? Math.round((editingBlock.startHour - initialHour) * 60) : 0;
            setStartH(initialHour);
            setStartM(initialMin);
        }
    }, [editingBlock, isOpen, categories, hour]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const catObj = categories.find(c => c.id === category) || categories[0];
        const finalStartHour = startH + (startM / 60);
        const data = { 
            dayOfWeek: day, 
            startHour: finalStartHour, 
            duration: Number(duration), 
            title: title || catObj.label, 
            category, 
            color: catObj.color, 
            userId: '' 
        };
        if (editingBlock) onUpdate(editingBlock.id, data); else onSave(data);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-surface p-8 sm:p-10 rounded-[3rem] shadow-2xl w-full max-w-sm border border-outline/30" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-on-surface tracking-tighter uppercase">{editingBlock ? 'Refine Phase' : 'Initialize Phase'}</h3>
                        <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40">Precision Chronometry</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-surface-variant rounded-2xl transition-colors"><XIcon className="h-6 w-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 block px-1">Objective Label</label>
                        <input autoFocus type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Lead Gen, Deep Work..." className="w-full p-4 bg-surface-variant/30 rounded-2xl border border-outline/10 text-sm font-bold focus:ring-4 ring-primary/10 focus:border-primary outline-none transition-all" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 block px-1">Start Time</label>
                            <div className="flex items-center gap-2">
                                <select value={startH} onChange={e => setStartH(Number(e.target.value))} className="flex-1 p-3 bg-surface-variant/30 rounded-xl border border-outline/10 text-sm font-bold outline-none">
                                    {Array.from({length: 24}).map((_, i) => (
                                        <option key={i} value={i}>{i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i-12} PM`}</option>
                                    ))}
                                </select>
                                <select value={startM} onChange={e => setStartM(Number(e.target.value))} className="flex-1 p-3 bg-surface-variant/30 rounded-xl border border-outline/10 text-sm font-bold outline-none">
                                    <option value={0}>00</option>
                                    <option value={15}>15</option>
                                    <option value={30}>30</option>
                                    <option value={45}>45</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 block px-1">Duration</label>
                            <select value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full p-3 bg-surface-variant/30 rounded-xl border border-outline/10 text-sm font-bold outline-none">
                                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5].map(h => (
                                    <option key={h} value={h}>{h < 1 ? `${h * 60}m` : `${h}h`}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2 block px-1">Protocol Category</label>
                        <div className="grid grid-cols-2 gap-2">
                            {categories.map((cat) => (
                                <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} className={`flex items-center gap-2 text-[10px] p-3 rounded-xl border-2 transition-all font-black uppercase tracking-widest ${category === cat.id ? `border-primary bg-primary/5 text-primary` : 'border-transparent bg-surface-variant/30 text-on-surface-variant hover:bg-surface-variant/50'}`}>{ICON_MAP[cat.icon] || ICON_MAP.target}{cat.label.split(' ')[0]}</button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 p-4 text-xs font-black uppercase tracking-widest text-on-surface-variant bg-surface-variant/50 hover:bg-surface-variant rounded-2xl transition-all">Cancel</button>
                        <button type="submit" className="flex-1 p-4 text-xs bg-primary text-on-primary rounded-2xl font-black uppercase tracking-[0.2em] shadow-m3-md hover:scale-[1.02] active:scale-0.98 transition-all">Commit</button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const AiStrategyWizard: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void;
    categories: IdealCategory[];
    onApply: (blocks: Partial<IdealBlock>[]) => void;
}> = ({ isOpen, onClose, categories, onApply }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        try {
            const blocks = await generateIdealWeekStrategy(prompt, categories);
            onApply(blocks);
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4" onClick={onClose}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="bg-surface p-12 rounded-[4rem] shadow-2xl w-full max-w-lg border border-outline/30 text-center" onClick={e => e.stopPropagation()}>
                <div className="w-20 h-20 bg-primary/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                    <SparklesIcon className="w-10 h-10 text-primary animate-pulse" />
                </div>
                <h3 className="text-3xl font-black text-on-surface uppercase tracking-tight mb-4 leading-none">Strategy Architect</h3>
                <p className="text-sm text-on-surface-variant font-medium mb-10 opacity-70">Define your primary objective for this season, and the Hub AI will engineer an optimized weekly flow.</p>
                
                <div className="space-y-6">
                    <textarea 
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="e.g. Focus on aggressive lead generation for luxury listings..."
                        className="w-full p-8 bg-surface-variant/20 rounded-[2.5rem] border border-outline/20 text-lg font-bold outline-none focus:ring-4 ring-primary/10 transition-all resize-none shadow-inner"
                        rows={4}
                    />
                    <div className="flex gap-4">
                        <button onClick={onClose} className="flex-1 py-5 text-xs font-black uppercase tracking-widest text-on-surface-variant bg-surface-variant/50 rounded-3xl">Dismiss</button>
                        <button 
                            onClick={handleGenerate}
                            disabled={isLoading || !prompt.trim()}
                            className="flex-1 py-5 bg-primary text-on-primary rounded-3xl font-black text-xs uppercase tracking-widest shadow-m3-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {isLoading ? <RefreshCwIcon className="w-5 h-5 mx-auto animate-spin" /> : 'Engineer Flow'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const IdealWeekView: React.FC = () => {
    const { idealBlocks, addIdealBlock, updateIdealBlock, deleteIdealBlock, idealWeekSettings, updateIdealWeekSettings, currentUser, updateUserProfile } = useAppContext();
    const { addToast } = useToast();
    
    const [modalConfig, setModalConfig] = useState<{ isOpen: boolean, day: number, hour: number, editingBlock?: IdealBlock }>({ isOpen: false, day: 0, hour: 9 });
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAiWizardOpen, setIsAiWizardOpen] = useState(false);
    const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
    const [activeDayIndex, setActiveDayIndex] = useState<number>(1);
    const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

    const categories = useMemo(() => currentUser?.idealCategories || DEFAULT_CATEGORIES, [currentUser]);

    const startHour = idealWeekSettings.startHour ?? 7;
    const endHour = idealWeekSettings.endHour ?? 20;
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => i + startHour);

    const displayedDays = useMemo(() => {
        let indices = idealWeekSettings.weekStartMonday ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
        if (!idealWeekSettings.showWeekends) indices = indices.filter(i => i !== 0 && i !== 6);
        return indices;
    }, [idealWeekSettings]);

    // Ensure active day remains valid if viewed days change (e.g. toggle weekends)
    useEffect(() => {
        if (!displayedDays.includes(activeDayIndex)) {
            setActiveDayIndex(displayedDays[0]);
        }
    }, [displayedDays, activeDayIndex]);

    const handleCellClick = (dayIndex: number, hour: number) => setModalConfig({ isOpen: true, day: dayIndex, hour });
    const handleBlockClick = (e: React.MouseEvent, block: IdealBlock) => { e.stopPropagation(); setModalConfig({ isOpen: true, day: block.dayOfWeek, hour: block.startHour, editingBlock: block }); };

    const handleMirrorBlock = async (block: IdealBlock) => {
        const targetDays = [1, 2, 3, 4, 5].filter(d => d !== block.dayOfWeek);
        for (const day of targetDays) {
            const exists = idealBlocks.some(b => b.dayOfWeek === day && b.startHour === block.startHour);
            if (!exists) {
                await addIdealBlock({ ...block, dayOfWeek: day, userId: currentUser?.id || '' });
            }
        }
        addToast({ type: 'success', title: 'Architecture Mirrored', message: 'Block replicated across workdays.' });
    };

    const handleApplyAiStrategy = async (blocks: Partial<IdealBlock>[]) => {
        for (const b of blocks) {
            await addIdealBlock(b as Omit<IdealBlock, 'id'>);
        }
        addToast({ type: 'success', title: 'Strategy Deployed', message: 'AI-generated flow injected into your schedule.' });
    };

    const handleAddCategory = () => {
        const label = prompt("Category Name:");
        if (!label) return;
        const newCat: IdealCategory = { id: `cat-${Date.now()}`, label, color: '#8b5cf6', icon: 'star' };
        updateUserProfile({ idealCategories: [...categories, newCat] });
    };

    const calculateDailyMix = (dayIndex: number) => {
        const blocks = idealBlocks.filter(b => b.dayOfWeek === dayIndex);
        const totals: Record<string, number> = {};
        categories.forEach(c => totals[c.id] = 0);
        blocks.forEach(b => { if(totals[b.category] !== undefined) totals[b.category] += b.duration; });
        return totals;
    };

    const gridColsClass = viewMode === 'day' 
        ? 'grid-cols-[50px_1fr] sm:grid-cols-[80px_1fr]' 
        : 'grid-cols-[50px_1fr] sm:grid-cols-[80px_repeat(auto-fit,minmax(120px,1fr))]';

    return (
        <div className="flex flex-col h-[calc(100dvh-120px)] sm:h-full gap-2 sm:gap-6 animate-fade-in">
            <div className="flex flex-row justify-between items-center gap-2 px-1 shrink-0">
                <div>
                    <h1 className="text-xl sm:text-4xl lg:text-5xl font-black text-on-surface tracking-tighter flex items-center gap-2 sm:gap-4 uppercase">
                        Ideal Flow
                    </h1>
                    <p className="text-[9px] sm:text-sm font-bold text-on-surface-variant uppercase tracking-[0.3em] opacity-40 mt-0.5 sm:mt-1 hidden sm:block">
                        Strategic producer architecture
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex bg-surface-variant/30 rounded-xl p-1 border border-outline/10">
                        <button onClick={() => setViewMode('day')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'day' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Day</button>
                        <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'week' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Week</button>
                    </div>

                    <button 
                        onClick={() => setIsAiWizardOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 sm:px-8 sm:py-4 bg-primary text-on-primary rounded-xl sm:rounded-[1.5rem] font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] shadow-m3-lg hover:scale-105 active:scale-95 transition-all"
                    >
                        <SparklesIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5" /> 
                        <span className="hidden sm:inline">AI Strategist</span>
                        <span className="sm:hidden">AI</span>
                    </button>
                    <button 
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)} 
                        className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all ${isSettingsOpen ? 'bg-on-surface text-surface border-on-surface' : 'bg-surface border-outline/30 text-on-surface-variant hover:bg-surface-variant'}`}
                    >
                        <SettingsIcon className="w-4 h-4 sm:w-6 sm:h-6" />
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3 px-1 overflow-x-auto no-scrollbar py-0.5 shrink-0">
                <div className="flex items-center gap-1 sm:gap-2 p-1 bg-surface-variant/30 rounded-xl sm:rounded-[1.5rem] border border-outline/10">
                    {categories.map((cat) => (
                        <button 
                            key={cat.id} 
                            onMouseEnter={() => setHighlightedCategory(cat.id)} 
                            onMouseLeave={() => setHighlightedCategory(null)} 
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap
                                ${highlightedCategory === cat.id ? 'bg-surface shadow-sm ring-2 ring-primary/10 scale-105' : 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0'}
                            `}
                        >
                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-[9px] font-black text-on-surface uppercase tracking-widest">{cat.label}</span>
                        </button>
                    ))}
                    <button onClick={handleAddCategory} className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"><PlusIcon className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            <div className="flex-1 bg-surface rounded-2xl sm:rounded-[3rem] lg:rounded-[4rem] border border-outline/20 shadow-m3-lg overflow-hidden flex flex-col relative min-h-0">
                {/* Day Navigator - Shows on mobile OR if Desktop Day View */}
                <div className={`flex overflow-x-auto no-scrollbar gap-1 px-4 py-2 border-b border-outline/10 bg-surface/50 backdrop-blur-md sticky top-0 z-[25] ${viewMode === 'week' ? 'sm:hidden' : ''}`}>
                    {displayedDays.map((dayIndex) => (
                        <button
                            key={dayIndex}
                            onClick={() => setActiveDayIndex(dayIndex)}
                            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                ${activeDayIndex === dayIndex ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-variant/50 text-on-surface-variant border border-outline/10'}`}
                        >
                            {DAYS_SHORT[dayIndex]}
                        </button>
                    ))}
                </div>

                <AnimatePresence>
                    {isSettingsOpen && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-surface-variant/10 border-b border-outline/10 overflow-hidden shrink-0">
                            <div className="p-6 sm:p-10 flex flex-wrap gap-8 sm:gap-12 items-start justify-center">
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Temporal Scope</p>
                                    <div className="flex items-center gap-4 bg-surface border border-outline/10 p-3 rounded-2xl shadow-inner">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[8px] font-bold text-on-surface-variant uppercase mb-1">Start</span>
                                            <input type="number" min="0" max="23" value={idealWeekSettings.startHour} onChange={e => updateIdealWeekSettings({ startHour: Number(e.target.value) })} className="w-10 bg-transparent text-center font-black text-lg outline-none" />
                                        </div>
                                        <div className="w-4 h-px bg-outline/20" />
                                        <div className="flex flex-col items-center">
                                            <span className="text-[8px] font-bold text-on-surface-variant uppercase mb-1">End</span>
                                            <input type="number" min="1" max="24" value={idealWeekSettings.endHour} onChange={e => updateIdealWeekSettings({ endHour: Number(e.target.value) })} className="w-10 bg-transparent text-center font-black text-lg outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Grid Logic</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => updateIdealWeekSettings({ showWeekends: !idealWeekSettings.showWeekends })} className={`px-5 py-2.5 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest transition-all ${idealWeekSettings.showWeekends ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-outline/20 text-on-surface-variant opacity-60'}`}>Weekends</button>
                                        <button onClick={() => updateIdealWeekSettings({ weekStartMonday: !idealWeekSettings.weekStartMonday })} className={`px-5 py-2.5 rounded-xl border-2 font-black text-[9px] uppercase tracking-widest transition-all ${idealWeekSettings.weekStartMonday ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-outline/20 text-on-surface-variant opacity-60'}`}>Monday Start</button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Grid Header */}
                <div className={`grid ${gridColsClass} border-b border-outline/10 bg-surface-variant/10 sticky top-0 z-30 backdrop-blur-md shrink-0 ${viewMode === 'day' ? '' : 'hidden sm:grid'}`}>
                    <div className="p-4 border-r border-outline/10 flex items-center justify-center"><CalendarDaysIcon className="w-4 h-4 text-on-surface-variant opacity-20" /></div>
                    {displayedDays.map((dayIndex) => {
                        const mix = calculateDailyMix(dayIndex);
                        const totalHours = Object.values(mix).reduce((a, b) => a + b, 0);
                        const isVisible = dayIndex === activeDayIndex ? 'flex' : (viewMode === 'week' ? 'hidden sm:flex' : 'hidden');
                        
                        return (
                            <div key={dayIndex} className={`p-3 sm:p-5 lg:p-6 border-r border-outline/10 last:border-r-0 text-center flex-col items-center ${isVisible}`}>
                                <span className="text-[8px] sm:text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.4em] mb-1 block">{DAYS_SHORT[dayIndex]}</span>
                                <span className="text-lg sm:text-xl lg:text-2xl font-black text-on-surface tracking-tighter uppercase leading-none">{DAYS_FULL[dayIndex].substring(0, 3)}</span>
                                {totalHours > 0 && (
                                    <div className="flex h-1.5 w-full bg-outline/5 rounded-full overflow-hidden mt-3 sm:mt-4 gap-0.5 shadow-inner">
                                        {Object.entries(mix).map(([key, hours]) => (
                                            hours > 0 && <div key={key} style={{ width: `${(hours/totalHours)*100}%`, backgroundColor: categories.find(c => c.id === key)?.color }} className="transition-all duration-700" />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar relative min-h-0">
                    <div className={`grid ${gridColsClass} min-h-full`}>
                        <div className="bg-surface-variant/5 border-r border-outline/10 flex flex-col">
                            {hours.map(hour => (
                                <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }} className="border-b border-outline/5 relative px-1 sm:px-4 py-2 flex flex-col items-end shrink-0">
                                    <span className="text-[9px] sm:text-[11px] font-black text-on-surface-variant/30 tracking-tighter uppercase whitespace-nowrap transform -translate-y-1/2 top-0 absolute pt-1">
                                        {hour > 12 ? `${hour-12}PM` : hour === 12 ? '12PM' : `${hour}AM`}
                                    </span>
                                </div>
                            ))}
                        </div>
                        {displayedDays.map((dayIndex) => {
                            const isVisible = dayIndex === activeDayIndex ? 'block' : (viewMode === 'week' ? 'hidden sm:block' : 'hidden');
                            
                            return (
                                <div key={dayIndex} className={`relative border-r border-outline/10 last:border-r-0 bg-transparent group/col min-w-[100px] ${isVisible}`}>
                                    {hours.map(hour => (
                                        <div 
                                            key={hour} 
                                            onClick={() => handleCellClick(dayIndex, hour)} 
                                            style={{ height: `${HOUR_HEIGHT}px` }}
                                            className="border-b border-outline/5 hover:bg-primary/[0.03] transition-colors cursor-pointer group/cell relative shrink-0"
                                        >
                                            {/* Half-hour guide line */}
                                            <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-outline/5 pointer-events-none" />
                                            
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 pointer-events-none transition-all scale-75 group-hover/cell:scale-100">
                                                <PlusIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary/10" />
                                            </div>
                                        </div>
                                    ))}
                                    <AnimatePresence mode="popLayout">
                                        {idealBlocks
                                            .filter(b => b.dayOfWeek === dayIndex && b.startHour >= startHour && b.startHour <= endHour)
                                            .map(block => (
                                                <BlockItem 
                                                    key={block.id}
                                                    block={block}
                                                    startHour={startHour}
                                                    categories={categories}
                                                    isDimmed={!!(highlightedCategory && highlightedCategory !== block.category)}
                                                    onClick={handleBlockClick}
                                                    onDelete={deleteIdealBlock}
                                                    onMirror={handleMirrorBlock}
                                                    layout
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ 
                                                        opacity: (highlightedCategory && highlightedCategory !== block.category) ? 0.2 : 1, 
                                                        scale: 1,
                                                        filter: (highlightedCategory && highlightedCategory !== block.category) ? 'grayscale(1)' : 'grayscale(0)'
                                                    }}
                                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                />
                                            ))
                                        }
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <BlockModal 
                isOpen={modalConfig.isOpen} 
                day={modalConfig.day} 
                hour={modalConfig.hour} 
                editingBlock={modalConfig.editingBlock} 
                categories={categories}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false, editingBlock: undefined }))} 
                onSave={addIdealBlock} 
                onUpdate={updateIdealBlock} 
            />

            <AiStrategyWizard 
                isOpen={isAiWizardOpen}
                onClose={() => setIsAiWizardOpen(false)}
                categories={categories}
                onApply={handleApplyAiStrategy}
            />

            <div className="flex-wrap justify-center gap-4 sm:gap-10 py-3 sm:py-8 bg-surface-variant/5 rounded-2xl sm:rounded-[3rem] border border-outline/10 shadow-inner shrink-0 sm:flex hidden">
                {categories.map((cat) => { 
                    const weeklyHours = idealBlocks.filter(b => b.category === cat.id).reduce((acc, b) => acc + b.duration, 0); 
                    return (
                        <div key={cat.id} className="flex flex-col items-center text-center group">
                            <span className="text-[9px] sm:text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em] mb-1 group-hover:text-primary transition-colors">{cat.label}</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl sm:text-3xl font-black text-on-surface tracking-tighter" style={{ color: cat.color }}>{weeklyHours}</span>
                                <span className="text-[8px] sm:text-[10px] font-black text-on-surface-variant opacity-30 uppercase">hrs/wk</span>
                            </div>
                        </div>
                    ); 
                })}
            </div>
        </div>
    );
};

export default IdealWeekView;