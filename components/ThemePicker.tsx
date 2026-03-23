import React from 'react';
import { ThemeType } from '../contexts/ThemeContext';

interface ThemeOption {
    id: ThemeType;
    name: string;
    colors: string;
    text: string;
}

const themes: ThemeOption[] = [
    { id: 'default', name: 'Modern KW', colors: 'bg-white border-gray-200', text: 'text-gray-800' },
    { id: 'elite', name: 'Elite Executive', colors: 'bg-[#050505] border-red-900', text: 'text-white' },
    { id: 'dynamic', name: 'Dynamic Growth', colors: 'bg-[#020617] border-cyan-500', text: 'text-white' },
    { id: 'nature', name: 'Nature Refresh', colors: 'bg-[#f2f8f5] border-green-300', text: 'text-green-900' },
    { id: 'ocean', name: 'Ocean Professional', colors: 'bg-[#f0f9ff] border-sky-300', text: 'text-sky-900' },
    { id: 'sunset', name: 'Sunset Drive', colors: 'bg-[#fff7ed] border-orange-400', text: 'text-orange-900' },
    { id: 'cyberpunk', name: 'Cyberpunk', colors: 'bg-[#09090b] border-teal-500', text: 'text-teal-400' },
    { id: 'nordic', name: 'Nordic Lux', colors: 'bg-[#f8fafc] border-slate-300', text: 'text-slate-800' },
    { id: 'dashboard', name: 'Dashboard', colors: 'bg-[#f1f5f9] border-indigo-300', text: 'text-indigo-900' },
];

interface ThemePickerProps {
    currentTheme: ThemeType;
    onSelect: (themeId: ThemeType) => void;
}

export const ThemePicker: React.FC<ThemePickerProps> = ({ currentTheme, onSelect }) => {
    return (
        <div className="flex flex-wrap gap-4 p-4">
            {themes.map((t) => (
                <button
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className={`group relative flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-300
                    ${currentTheme === t.id ? 'border-primary ring-2 ring-primary/20 scale-105' : 'border-transparent hover:border-outline'}`}
                >
                    <div className={`h-12 w-24 rounded-md mb-2 shadow-sm ${t.colors} border flex items-center justify-center`}>
                        <div className={`h-1 w-8 rounded-full ${t.id === 'dynamic' ? 'bg-cyan-400' : t.id === 'elite' ? 'bg-red-600' : t.id === 'nature' ? 'bg-green-700' : t.id === 'ocean' ? 'bg-sky-600' : t.id === 'sunset' ? 'bg-orange-500' : t.id === 'cyberpunk' ? 'bg-teal-400' : t.id === 'nordic' ? 'bg-slate-500' : t.id === 'dashboard' ? 'bg-indigo-500' : 'bg-violet-500'}`} />
                    </div>
                    <span className={`text-[10px] font-bold tracking-tight uppercase ${currentTheme === t.id ? 'text-primary' : 'text-text-muted'}`}>
                        {t.name}
                    </span>
                </button>
            ))}
        </div>
    );
};