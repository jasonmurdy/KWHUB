import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { FileTextIcon, PlusIcon, TrashIcon } from './icons';
import { Document } from '../types';

const ProjectDocsView: React.FC = () => {
    const { projectDocuments, deleteDocument, selectedProject, viewFile, currentUser } = useAppContext();

    const handleOpenInViewer = (doc: Document) => {
        viewFile({
            id: doc.id,
            name: doc.title,
            url: '#',
            fileType: 'hub_doc',
            docId: doc.id,
            projectId: doc.projectId
        });
    };
    
    if (!selectedProject) {
        return (
            <div className="flex h-full items-center justify-center text-center p-8">
                <p className="text-on-surface-variant">Please select a project to view its documents.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-on-surface">Knowledge Vault</h1>
                    <p className="text-on-surface-variant mt-1">Project strategies and documentation for {selectedProject.name}.</p>
                </div>
                <button 
                    onClick={() => {
                        // Create a dummy doc to open the viewer with
                        const tempId = 'new';
                        handleOpenInViewer({ 
                            id: tempId, 
                            title: 'Untitled Document', 
                            content: '', 
                            projectId: selectedProject.id, 
                            authorId: currentUser?.id || '',
                            createdAt: new Date(), 
                            updatedAt: new Date() 
                        });
                    }}
                    className="flex items-center gap-2 px-6 py-3 text-sm font-black uppercase tracking-widest text-on-primary bg-primary rounded-2xl hover:bg-primary/90 transition-all shadow-m3-md"
                >
                    <PlusIcon className="h-5 w-5" />
                    Create Strategy
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
                {projectDocuments.map((doc) => (
                    <div 
                        key={doc.id} 
                        onClick={() => handleOpenInViewer(doc)}
                        className="group bg-surface p-6 rounded-[2.5rem] shadow-m3-sm border border-outline/30 hover:border-primary/50 hover:shadow-m3-lg transition-all cursor-pointer flex flex-col h-64 relative overflow-hidden"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-primary/5 rounded-2xl text-primary shadow-sm">
                                <FileTextIcon className="w-6 h-6" />
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); if(confirm('Delete this document permanently?')) deleteDocument(doc.id); }}
                                className="p-2 text-on-surface-variant hover:text-danger hover:bg-danger/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                        <h3 className="font-black text-xl text-on-surface mb-2 line-clamp-2 tracking-tight">{doc.title}</h3>
                        <p className="text-sm text-on-surface-variant line-clamp-4 flex-1 opacity-60 leading-relaxed">
                            {doc.content.replace(/<[^>]*>?/gm, '') || 'Begin your strategy session...'}
                        </p>
                        
                        <div className="mt-4 pt-4 border-t border-outline/10 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40">
                            <span>Synced {new Date(doc.updatedAt).toLocaleDateString()}</span>
                            <span className="text-primary opacity-0 group-hover:opacity-100 transition-all">Click to Edit</span>
                        </div>
                    </div>
                ))}
                
                {projectDocuments.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-32 bg-surface-variant/10 border-2 border-dashed border-outline/10 rounded-[3rem] text-on-surface-variant/30">
                        <FileTextIcon className="h-20 w-20 opacity-10 mb-6" />
                        <p className="font-black uppercase tracking-[0.2em] text-sm">Vault Empty</p>
                        <p className="text-xs font-bold mt-2">Create strategies, scripts, or project wikis.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectDocsView;