import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { FolderKanbanIcon, PlusIcon } from './icons';

const WelcomeEmptyState: React.FC = () => {
  const { openCreateProjectModal } = useAppContext();

  return (
    <div className="flex h-full items-center justify-center text-center p-8">
      <div className="flex flex-col items-center gap-6 max-w-lg">
        <FolderKanbanIcon className="h-24 w-24 text-primary/40" />
        <h2 className="text-3xl font-bold text-on-surface">Welcome to KW Inspire Hub!</h2>
        <p className="text-lg text-on-surface-variant">
          Your new hub for seamless project management and collaboration. It looks like you haven&apos;t created any projects yet.
        </p>
        <button
          onClick={() => openCreateProjectModal()}
          className="flex items-center gap-2 px-6 py-3 text-base font-semibold text-on-primary bg-primary rounded-full hover:bg-primary/90 transition-colors shadow-m3-md shadow-primary/30"
        >
          <PlusIcon className="h-5 w-5" />
          Create Your First Project
        </button>
      </div>
    </div>
  );
};

export default WelcomeEmptyState;