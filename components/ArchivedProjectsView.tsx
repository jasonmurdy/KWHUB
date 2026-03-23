
import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { ArchiveIcon, ArchiveRestoreIcon, TrashIcon } from './icons';
import type { Project } from '../types';

const ArchivedProjectCard: React.FC<{ project: Project }> = ({ project }) => {
    const { restoreProject, deleteProject } = useAppContext();

    const handleRestore = () => {
        if (window.confirm(`Are you sure you want to restore the project "${project.name}"?`)) {
            restoreProject(project.id);
        }
    };

    const handleDelete = () => {
        if (window.prompt(`This action is permanent and cannot be undone. To confirm, type the project name: "${project.name}"`) === project.name) {
            deleteProject(project.id);
        } else {
            alert("The project name did not match. Deletion cancelled.");
        }
    };

    return (
        <div className="bg-surface p-4 rounded-2xl shadow-m3-sm border border-outline/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-surface-variant border border-outline/20">
                    <ArchiveIcon className="w-5 h-5 text-on-surface-variant" />
                </div>
                <div>
                    <h3 className="font-bold text-on-surface">{project.name}</h3>
                    <p className="text-sm text-on-surface-variant truncate max-w-md mt-1">{project.description}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                <button onClick={handleRestore} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-success bg-success/10 rounded-full hover:bg-success/20 border border-success/20">
                    <ArchiveRestoreIcon className="h-4 w-4" /> Restore
                </button>
                <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-danger bg-danger/10 rounded-full hover:bg-danger/20 border border-danger/20">
                    <TrashIcon className="h-4 w-4" /> Delete
                </button>
            </div>
        </div>
    );
};

const ArchivedProjectsView: React.FC = () => {
    const { archivedProjects } = useAppContext();

    return (
        <div className="h-full flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold text-on-surface">Archived Projects</h1>
                <p className="text-on-surface-variant mt-1">These projects are hidden from your main views but can be restored or permanently deleted.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {archivedProjects.length > 0 ? (
                    <div className="space-y-4">
                        {archivedProjects.map(project => (
                            <ArchivedProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center text-center p-8 border-2 border-dashed border-outline/50 rounded-2xl">
                        <div>
                            <ArchiveIcon className="h-20 w-20 text-primary/30 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-on-surface">No Archived Projects</h2>
                            <p className="text-on-surface-variant mt-2 max-w-md">You can archive projects from their settings page to clean up your workspace.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArchivedProjectsView;
