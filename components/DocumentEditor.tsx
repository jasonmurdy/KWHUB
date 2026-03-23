
import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useAppContext } from '../contexts/AppContext';
import { 
    BoldIcon, ItalicIcon, ListIcon, H1Icon, H2Icon, 
    XIcon, CheckCircle2, FileTextIcon, UsersIcon
} from './icons';
import { motion, AnimatePresence } from 'framer-motion';

interface DocumentEditorProps {
    docId: string | 'new';
    onClose: () => void;
    isEmbedded?: boolean;
}

const MenuBar: React.FC<{ editor: Editor | null }> = ({ editor }) => {
    if (!editor) return null;

    const btnClass = (active: boolean) => `
        p-2.5 rounded-xl transition-all duration-200
        ${active ? 'bg-primary text-on-primary shadow-m3-sm scale-110' : 'text-on-surface-variant hover:bg-surface-variant hover:text-on-surface'}
    `;

    return (
        <div className="flex items-center gap-1.5 p-1.5 bg-surface/90 backdrop-blur-md rounded-2xl border border-outline/20 shadow-m3-lg sticky top-6 z-20 mx-auto w-fit">
            <button onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))} title="Bold">
                <BoldIcon className="h-4 w-4" />
            </button>
            <button onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))} title="Italic">
                <ItalicIcon className="h-4 w-4" />
            </button>
            
            <div className="w-px h-6 bg-outline/20 mx-1" />
            
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btnClass(editor.isActive('heading', { level: 1 }))} title="Heading 1">
                <H1Icon className="h-4 w-4" />
            </button>
            <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btnClass(editor.isActive('heading', { level: 2 }))} title="Heading 2">
                <H2Icon className="h-4 w-4" />
            </button>
            
            <div className="w-px h-6 bg-outline/20 mx-1" />
            
            <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))} title="Bullet List">
                <ListIcon className="h-4 w-4" />
            </button>
            <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))} title="Ordered List">
                <span className="font-black text-xs px-0.5">1.</span>
            </button>
        </div>
    );
};

const DocumentEditor: React.FC<DocumentEditorProps> = ({ docId, onClose, isEmbedded = false }) => {
    const { projectDocuments, createDocument, updateDocument } = useAppContext();
    const existingDoc = projectDocuments.find(d => d.id === docId);
    
    const [title, setTitle] = useState(existingDoc?.title || '');
    const [status, setStatus] = useState<'saving' | 'saved' | 'idle'>('idle');

    const saveRef = useRef<(content: string) => Promise<void> | undefined>(undefined);

    useEffect(() => {
        saveRef.current = async (content: string) => {
            if (docId === 'new') return;
            try {
                await updateDocument(docId, { title, content });
                setStatus('saved');
                window.setTimeout(() => setStatus('idle'), 2000);
            } catch (error) {
                console.error("Save failed", error);
                setStatus('idle');
            }
        };
    }, [docId, title, updateDocument]);

    const debouncedSave = React.useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let timeout: any;
        return (content: string) => {
            if (timeout) window.clearTimeout(timeout);
            timeout = window.setTimeout(() => {
                if (saveRef.current) {
                    saveRef.current(content);
                }
            }, 1000);
        };
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Write your story, strategy, or plan...',
            }),
        ],
        content: existingDoc?.content || '',
        onUpdate: ({ editor }) => {
            setStatus('saving');
            debouncedSave(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: `prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-[700px] px-8 sm:px-16 py-16 ${isEmbedded ? 'prose-headings:font-heading' : ''}`,
            },
        },
    });

    const handleCreate = async () => {
        if (!title.trim()) return;
        try {
            await createDocument(title, editor?.getHTML() || '');
            onClose();
        } catch (error) {
            console.error("Create failed", error);
        }
    };

    const containerClasses = isEmbedded 
        ? "w-full h-full bg-transparent flex flex-col" 
        : "fixed inset-0 z-[200] bg-surface flex flex-col overflow-hidden";

    return (
        <motion.div 
            initial={isEmbedded ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            className={containerClasses}
        >
            {/* Header Area - Hidden if embedded because ViewerModal provides its own header */}
            {!isEmbedded && (
                <header className="h-20 border-b border-outline/10 bg-surface flex items-center justify-between px-8 flex-shrink-0 z-30 shadow-sm">
                    <div className="flex items-center gap-6 flex-1">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                            <FileTextIcon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 max-w-xl">
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Untitled Document"
                                className="text-2xl font-black bg-transparent border-none focus:outline-none w-full placeholder-on-surface-variant/20 text-on-surface tracking-tight"
                            />
                            <div className="flex items-center gap-4 mt-1">
                                <div className="flex items-center gap-1.5">
                                    <AnimatePresence mode="wait">
                                        {status === 'saved' ? (
                                            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex items-center gap-1 text-[10px] font-black text-success uppercase tracking-widest">
                                                <CheckCircle2 className="h-3 w-3" /> All changes saved
                                            </motion.div>
                                        ) : status === 'saving' ? (
                                            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex items-center gap-1 text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-40">
                                                <div className="h-2 w-2 rounded-full border-2 border-primary border-t-transparent animate-spin" /> Syncing...
                                            </motion.div>
                                        ) : (
                                            <div className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-40">Draft</div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-outline/20" />
                                <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
                                    {existingDoc ? `Last edited ${new Date(existingDoc.updatedAt).toLocaleTimeString()}` : 'New document'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {docId === 'new' && (
                            <button 
                                onClick={handleCreate}
                                disabled={!title.trim()}
                                className="px-8 py-3 bg-primary text-on-primary text-sm font-black uppercase tracking-widest rounded-2xl shadow-m3-md hover:bg-primary/90 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                            >
                                Publish Doc
                            </button>
                        )}
                        <button 
                            onClick={onClose} 
                            className="p-3 bg-surface-variant/30 hover:bg-danger/10 text-on-surface-variant hover:text-danger rounded-2xl transition-all border border-outline/10"
                        >
                            <XIcon className="h-6 w-6" />
                        </button>
                    </div>
                </header>
            )}

            {/* Scrollable Editor Container */}
            <div className={`flex-1 overflow-y-auto relative custom-scrollbar pb-32 ${isEmbedded ? 'bg-transparent' : 'bg-surface-variant/30'}`}>
                <div className={`max-w-[1000px] mx-auto pt-8 flex flex-col items-center`}>
                    
                    {/* Floating Toolbar */}
                    <MenuBar editor={editor} />

                    {/* Page Container */}
                    <div 
                        className={`mt-12 w-full max-w-[850px] bg-surface shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-outline/10 cursor-text transition-all ${isEmbedded ? 'rounded-[2rem] min-h-[90vh]' : 'rounded-[0.5rem] min-h-[1100px]'}`}
                        onClick={() => editor?.chain().focus().run()}
                    >
                        <EditorContent editor={editor} />
                    </div>
                    
                    {/* Collaborative Footer Mock */}
                    <div className="mt-8 flex items-center gap-3 opacity-30">
                        <UsersIcon className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Active Editing Session</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default DocumentEditor;
