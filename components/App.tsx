
import React, { useMemo, useState, useEffect } from 'react';
import { AppProvider, useAppContext } from '../contexts/AppContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ToastProvider, ToastContainer } from '../contexts/ToastContext';
import Layout from './Layout';
import TaskDetailModal from './TaskDetailModal';
import TaskEditModal from './TaskEditModal';
import LeadCreateModal from './LeadCreateModal';
import LeadInfoModal from './LeadInfoModal';
import Auth from './Auth';
import CreateProjectModal from './CreateProjectModal';
import CreateTeamModal from './CreateTeamModal';
import ManageTeamMembersModal from './ManageTeamMembersModal';
import TemplateModal from './TemplateModal';
import ApplyTemplateModal from './ApplyTemplateModal';
import GlobalSearchModal from './GlobalSearchModal';
import ApplyTemplateToTaskModal from './ApplyTemplateToTaskModal';
import FileViewerModal from './FileViewerModal';
import AiSubtaskGeneratorModal from './AiAssistant';
import SetAvailabilityModal from './SetAvailabilityModal';
import PublicFormView from './PublicFormView';
import PublicTaskChecklist from './PublicTaskChecklist';
import { NotificationListener } from './NotificationListener';
import { AnimatePresence } from 'framer-motion';

const FullScreenSpinner: React.FC<{ message?: string }> = ({ message = "Loading..."}) => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4 z-10">
       <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p className="text-on-surface-variant">{message}</p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const { 
    viewingTask, 
    viewingLead,
    editingTask, 
    isLoading, 
    isCreatingProject, 
    isCreatingTeam, 
    isCreatingLead,
    isManagingTeamMembers,
    isSettingAvailability,
    editingTemplate, 
    templateToApply,
    templateToApplyToTask,
    isGlobalSearchOpen, 
    generatingSubtasksForTask,
    closeGlobalSearch, 
    allTasks, 
    projects, 
    allUsers, 
  } = useAppContext();
  
  if (isLoading) {
    return <FullScreenSpinner message="Loading Projects..." />;
  }

  return (
    <>
      <ToastContainer />
      <Layout>
        <div id="main-content" />
      </Layout>
      <AnimatePresence>
        {viewingTask && <TaskDetailModal key="task-detail" />}
        {viewingLead && <LeadInfoModal key="lead-info" />}
        {editingTask === 'new' && <TaskEditModal key="task-edit" />}
        {isCreatingLead && <LeadCreateModal key="lead-create" />}
        {isCreatingProject && <CreateProjectModal key="create-project" />}
        {isCreatingTeam && <CreateTeamModal key="create-team" />}
        {isManagingTeamMembers && <ManageTeamMembersModal key="manage-team" />}
        {isSettingAvailability && <SetAvailabilityModal key="set-availability" />}
        {editingTemplate && <TemplateModal key="template-edit" />}
        {templateToApply && <ApplyTemplateModal key="apply-template" />}
        {templateToApplyToTask && <ApplyTemplateToTaskModal key="apply-template-to-task" />}
        {isGlobalSearchOpen && <GlobalSearchModal 
          key="global-search"
          onClose={closeGlobalSearch} 
          allTasks={allTasks} 
          projects={projects} 
          allUsers={allUsers}
        />}
        {generatingSubtasksForTask && <AiSubtaskGeneratorModal key="ai-subtasks" />}
      </AnimatePresence>
      <FileViewerModal />
    </>
  );
};


const AuthGate: React.FC = () => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <FullScreenSpinner message="Authenticating..." />;
  }

  if (!currentUser) {
    return <Auth />;
  }

  return (
    <AppProvider>
      <AuthGateInternal />
    </AppProvider>
  );
};

const AuthGateInternal: React.FC = () => {
    const { currentUser } = useAuth();
    return (
        <>
            <NotificationListener currentUserId={currentUser?.uid || ''} />
            <AppContent />
        </>
    );
}

const App: React.FC = () => {
  const [currentHash, setCurrentHash] = useState(window.location.hash);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash);
    const handlePopState = () => setCurrentPath(window.location.pathname);
    
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const formId = useMemo(() => {
      if (currentHash.startsWith('#/forms/')) {
          return currentHash.split('#/forms/')[1];
      }
      if (currentPath.startsWith('/forms/')) {
          return currentPath.split('/forms/')[1];
      }
      return null;
  }, [currentHash, currentPath]);

  const taskId = useMemo(() => {
      if (currentHash.startsWith('#/public/task/')) {
          return currentHash.split('#/public/task/')[1];
      }
      if (currentPath.startsWith('/public/task/')) {
          return currentPath.split('/public/task/')[1];
      }
      return null;
  }, [currentHash, currentPath]);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          {formId ? (
             <PublicFormView formId={formId} />
          ) : taskId ? (
             <PublicTaskChecklist taskId={taskId} />
          ) : (
             <AuthGate />
          )}
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
