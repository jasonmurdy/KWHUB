
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface MentionInputProps {
    value: string;
    onChange: (value: string) => void;
    onSend?: () => void;
    placeholder?: string;
    suggestions: User[];
    className?: string;
    isTextArea?: boolean;
    rows?: number;
    disabled?: boolean;
}

const MentionInput: React.FC<MentionInputProps> = ({
    value,
    onChange,
    onSend,
    placeholder,
    suggestions,
    className,
    isTextArea = false,
    rows = 1,
    disabled = false
}) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<User[]>([]);
    const [mentionIndex, setMentionIndex] = useState(-1);
    const [cursorPosition, setCursorPosition] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

    useEffect(() => {
        const lastChar = value.slice(0, cursorPosition).lastIndexOf('@');
        if (lastChar !== -1) {
            // Check if there's a space before @ or if it's the start of the string
            const charBefore = lastChar > 0 ? value[lastChar - 1] : '';
            if (charBefore === '' || charBefore === ' ' || charBefore === '\n') {
                const query = value.slice(lastChar + 1, cursorPosition);
                if (!query.includes(' ')) {
                    const filtered = suggestions.filter(u => 
                        u.name.toLowerCase().includes(query.toLowerCase()) ||
                        u.email.toLowerCase().includes(query.toLowerCase())
                    );
                    setFilteredSuggestions(filtered);
                    setShowSuggestions(filtered.length > 0);
                    setMentionIndex(lastChar);
                    setSelectedIndex(0);
                } else {
                    setShowSuggestions(false);
                }
            } else {
                setShowSuggestions(false);
            }
        } else {
            setShowSuggestions(false);
        }
    }, [value, cursorPosition, suggestions]);

    const handleSelect = (user: User) => {
        const before = value.slice(0, mentionIndex);
        const after = value.slice(cursorPosition);
        const newValue = `${before}@${user.name} ${after}`;
        onChange(newValue);
        setShowSuggestions(false);
        // Set cursor position after the inserted mention
        setTimeout(() => {
            if (inputRef.current) {
                const newPos = before.length + user.name.length + 2;
                inputRef.current.setSelectionRange(newPos, newPos);
                inputRef.current.focus();
            }
        }, 0);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (showSuggestions) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredSuggestions.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleSelect(filteredSuggestions[selectedIndex]);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setShowSuggestions(false);
            }
        } else if (e.key === 'Enter' && !e.shiftKey && onSend) {
            e.preventDefault();
            onSend();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        onChange(e.target.value);
        setCursorPosition(e.target.selectionStart || 0);
    };

    const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setCursorPosition(e.currentTarget.selectionStart || 0);
    };

    const handleClick = (e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setCursorPosition(e.currentTarget.selectionStart || 0);
    };

    const InputComponent = isTextArea ? 'textarea' : 'input';

    return (
        <div className="relative w-full">
            <InputComponent
                ref={inputRef as React.RefObject<HTMLTextAreaElement & HTMLInputElement>}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                onClick={handleClick}
                placeholder={placeholder}
                className={className}
                rows={isTextArea ? rows : undefined}
                disabled={disabled}
            />
            <AnimatePresence>
                {showSuggestions && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 mb-3 w-72 bg-surface border border-outline rounded-[1.5rem] shadow-m3-lg overflow-hidden z-[200] backdrop-blur-md bg-surface/90"
                    >
                        <div className="p-2 max-h-60 overflow-y-auto custom-scrollbar">
                            <div className="px-3 py-2 border-b border-outline/5 mb-1">
                                <p className="text-[9px] font-black text-primary uppercase tracking-widest">Mention Team Member</p>
                            </div>
                            {filteredSuggestions.map((user, index) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => handleSelect(user)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left ${index === selectedIndex ? 'bg-primary text-on-primary shadow-m3-sm' : 'hover:bg-primary/5 text-on-surface'}`}
                                >
                                    <img src={user.avatarUrl} className={`w-9 h-9 rounded-xl border ${index === selectedIndex ? 'border-white/20' : 'border-outline/10'}`} />
                                    <div className="min-w-0">
                                        <p className={`text-sm font-black truncate ${index === selectedIndex ? 'text-on-primary' : 'text-on-surface'}`}>{user.name}</p>
                                        <p className={`text-[10px] font-bold truncate uppercase tracking-tight ${index === selectedIndex ? 'text-on-primary/70' : 'text-on-surface-variant/50'}`}>{user.email}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MentionInput;
