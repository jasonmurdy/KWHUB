import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  collection, query, where, onSnapshot, addDoc, updateDoc, 
  getDoc, getDocs,
  deleteDoc, doc, serverTimestamp, orderBy, limit, or,
  writeBatch, arrayUnion, setDoc
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, app } from '../services/firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { notificationService } from '../services/notificationService';
import { 
  Project, Task, User, Team, Notification, Template, 
  AvailabilityBlock, IdealBlock, Document, Form, FormResponse,
  Attachment, TaskPriority, TableViewColumnConfig, Subtask, Expense, ChatMessage, IdealWeekSettings, Habit, HabitLog, ChecklistItem, AuditLog, NotificationPreferences
} from '../types';
import { DEFAULT_WORKFLOW } from '../constants';

/**
 * Robustly cleans objects for storage in Firestore/State.
 * Prevents "Converting circular structure to JSON" errors.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const scrubAndConvert = (val: unknown, seen = new WeakSet<object>()): any => {
    // 1. Basic type handling
    if (val === null || val === undefined) return val;
    if (typeof val === 'function') return undefined; // Strip functions
    if (typeof val !== 'object') return val; // Leaf nodes (number, string, etc)

    const obj = val as Record<string, unknown>;

    // 2. Specialized Data Objects (Allowed)
    if (obj instanceof Date) return obj;
    if (typeof obj.toDate === 'function') return (obj as { toDate: () => Date }).toDate(); // Firestore Timestamp conversion
    if (obj.seconds !== undefined && typeof obj.seconds === 'number' && obj.nanoseconds !== undefined) {
        return new Date(obj.seconds * 1000 + (obj.nanoseconds as number) / 1000000);
    }

    // 3. Circularity Protection
    if (seen.has(obj)) return undefined;
    seen.add(obj);

    // 4. Array Handling
    if (Array.isArray(obj)) {
        return obj.map(item => scrubAndConvert(item, seen)).filter(i => i !== undefined);
    }

    // 5. Detect and block internal SDK objects or DOM elements
    const cname = obj.constructor?.name;
    if (cname && !['Object', 'Array'].includes(cname)) {
        // Block minified objects like 'Y'/'Ka' (GSI) and standard browser objects
        if (['Y', 'Ka', 'Y2', 'Ka2', 'Z', 'Z2', 'TokenClient', 'TokenResponse', 'TokenResponseImpl', 'HTMLScriptElement', 'Window', 'Document', 'Location'].includes(cname) || 
            cname.includes('Google') || 
            cname.includes('Firebase') ||
            cname.includes('Auth') ||
            typeof (obj as unknown as { nodeType: number }).nodeType === 'number') {
            return undefined;
        }
    }

    // 6. Generic Object Handling (Iterative Cleaning)
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // Skip internal keys and problematic common references
            if (key.startsWith('_') || ['tokenClient', 'auth', 'requestGoogleAccess', 'window', 'document', 'google', 'gapi', 'firebase'].includes(key)) {
                continue;
            }
            
            const scrubbed = scrubAndConvert(obj[key], seen);
            if (scrubbed !== undefined) {
                result[key] = scrubbed;
            }
        }
    }
    return result;
};

const DEFAULT_TABLE_CONFIG: TableViewColumnConfig[] = [
    { id: 'title', name: 'Task Name', isVisible: true },
    { id: 'status', name: 'Status', isVisible: true },
    { id: 'assignees', name: 'Assignees', isVisible: true },
    { id: 'dueDate', name: 'Due Date', isVisible: true },
    { id: 'priority', name: 'Priority', isVisible: true },
    { id: 'project', name: 'Project', isVisible: true },
];

const DEFAULT_IDEAL_WEEK_SETTINGS: IdealWeekSettings = {
  startHour: 7,
  endHour: 20,
  showWeekends: true,
  weekStartMonday: true
};

interface AppContextType {
  currentUser: User | null;
  allUsers: User[];
  projects: Project[];
  selectedProject: Project | null;
  teams: Team[];
  selectedTeam: Team | null;
  tasks: Task[];
  allTasks: Task[]; 
  dashboardTasks: Task[];
  googleTasks: unknown[];
  teamChatMessages: ChatMessage[];
  notifications: Notification[];
  templates: Template[];
  availabilityBlocks: AvailabilityBlock[];
  idealBlocks: IdealBlock[];
  habits: Habit[];
  habitLogs: HabitLog[];
  checklist: ChecklistItem[];
  idealWeekSettings: IdealWeekSettings;
  projectDocuments: Document[];
  forms: Form[];
  activeView: string;
  projectSubView: string;
  isLoading: boolean;
  isGlobalSearchOpen: boolean;
  viewingTask: Task | null;
  viewingLead: Task | null;
  editingTask: string | null;
  isCreatingProject: boolean;
  isCreatingTeam: boolean;
  isCreatingLead: boolean;
  isManagingTeamMembers: boolean;
  isSettingAvailability: boolean;
  editingTemplate: Template | 'new' | null;
  templateToApply: Template | null;
  templateToApplyToTask: Task | null;
  generatingSubtasksForTask: Task | null;
  newTaskData: Partial<Task> | null;
  creatingProjectForTeamId: string | null;
  focusState: { isActive: boolean; taskId: string | null; timeLeft: number; isPaused: boolean };
  selectedTaskIds: Set<string>;
  tableViewConfig: TableViewColumnConfig[];
  cardVisibilityConfig: { showSubtasks: boolean; showPriority: boolean; showDueDate: boolean; showAssignees: boolean };
  viewingFile: Attachment | null;
  isFileViewerOpen: boolean;
  setActiveView: (view: string) => void;
  setProjectSubView: (view: string) => void;
  selectProject: (id: string, navigate?: boolean) => void;
  selectTeam: (id: string, navigate?: boolean) => void;
  createProject: (name: string, description: string, templateId: string, color: string, teamId?: string) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  archiveProject: (id: string) => Promise<void>;
  restoreProject: (id: string) => Promise<void>;
  createTeam: (name: string, description: string, inviteeIds: string[]) => Promise<void>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<void>;
  sendTeamChatMessage: (text: string) => Promise<void>;
  createForm: (form: Omit<Form, 'id' | 'createdAt' | 'updatedAt' | 'responseCount'>) => Promise<void>;
  updateForm: (id: string, updates: Partial<Form>) => Promise<void>;
  deleteForm: (id: string) => Promise<void>;
  fetchFormResponses: (formId: string) => Promise<FormResponse[]>;
  createDocument: (title: string, content: string) => Promise<void>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  addTask: (task: Partial<Task>) => Promise<void>;
  recurTask: (taskId: string) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  bulkUpdateTasks: (updates: Partial<Task>) => Promise<void>;
  bulkDeleteTasks: () => Promise<void>;
  toggleTaskSelection: (id: string) => void;
  clearTaskSelection: () => void;
  addComment: (taskId: string, text: string) => Promise<void>;
  addAttachment: (taskId: string, attachment: unknown) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  addBatchSubtasks: (taskId: string, titles: string[]) => Promise<void>;
  openAiSubtaskGenerator: (task: Task) => void;
  closeAiSubtaskGenerator: () => void;
  editTask: (taskId: string | 'new', initialData?: Partial<Task>) => void;
  openCreateLeadModal: () => void;
  closeCreateLeadModal: () => void;
  viewTask: (task: Task) => void;
  viewLead: (task: Task) => void;
  closeTaskDetail: () => void;
  closeLeadInfo: () => void;
  closeModals: () => void;
  fetchTaskById: (id: string) => Promise<Task | null>;
  markNotificationsAsRead: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  openGlobalSearch: () => void;
  closeGlobalSearch: () => void;
  openCreateProjectModal: (teamId?: string) => void;
  closeCreateProjectModal: () => void;
  openCreateTeamModal: (teamId?: string) => void;
  closeCreateTeamModal: () => void;
  openManageTeamMembersModal: () => void;
  closeManageTeamMembersModal: () => void;
  openSetAvailabilityModal: () => void;
  closeSetAvailabilityModal: () => void;
  addAvailabilityBlock: (block: Omit<AvailabilityBlock, 'id'>) => Promise<void>;
  deleteAvailabilityBlock: (id: string) => Promise<void>;
  addIdealBlock: (block: Omit<IdealBlock, 'id'>) => Promise<void>;
  updateIdealBlock: (id: string, updates: Partial<IdealBlock>) => Promise<void>;
  deleteIdealBlock: (id: string) => Promise<void>;
  updateIdealWeekSettings: (settings: Partial<IdealWeekSettings>) => Promise<void>;
  openTemplateModal: (template: Template | 'new') => void;
  closeTemplateModal: () => void;
  saveTemplate: (template: Partial<Template>, id?: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  openApplyTemplateModal: (template: Template) => void;
  closeApplyTemplateModal: () => void;
  applyTemplate: (templateId: string, projectId: string, options: { importTasks: boolean; importLinks: boolean }) => Promise<void>;
  openApplyTemplateToTaskModal: (task: Task) => void;
  closeApplyTemplateToTaskModal: () => void;
  applyTemplateToTask: (templateId: string, taskId: string, options: { importTasks: boolean; importLinks: boolean }) => Promise<void>;
  syncWithGoogleCalendar: () => Promise<void>;
  fetchGoogleTasks: () => Promise<void>;
  generateMissingShareTokens: () => Promise<void>;
  startFocusSession: (task: Task) => void;
  updateFocusTime: (timeLeft: number) => void;
  pauseFocusSession: () => void;
  stopFocusSession: () => void;
  setDashboardLayout: (layout: string[]) => void;
  backupTeamToDrive: (teamId: string) => Promise<void>;
  reorderTasksInColumn: (statusId: string, taskIds: string[]) => Promise<void>;
  setTableViewConfig: (config: TableViewColumnConfig[]) => void;
  setCardVisibilityConfig: (config: { showSubtasks: boolean; showPriority: boolean; showDueDate: boolean; showAssignees: boolean }) => void;
  defaultTableViewConfig: TableViewColumnConfig[];
  archivedProjects: Project[];
  viewFile: (file: Attachment) => void;
  closeFileViewer: () => void;
  addTeamFile: (teamId: string, file: unknown) => Promise<void>;
  deleteTeamFile: (teamId: string, fileId: string) => Promise<void>;
  addExpenseToTask: (taskId: string, expense: Omit<Expense, 'id'>) => Promise<void>;
  deleteExpenseFromTask: (taskId: string, expenseId: string) => Promise<void>;
  toggleClaimOnSlot: (taskId: string, roleId: string) => Promise<void>;
  copyTaskDateToGoogleCalendar: (taskId: string, field: 'dueDate' | 'eventDate') => Promise<void>;
  updateUserProfile: (updates: Partial<User> & { avatarFile?: File }) => Promise<void>;
  logHabit: (habitId: string, count: number, date?: string) => Promise<void>;
  createHabit: (habit: Omit<Habit, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  addChecklistItem: (text: string) => Promise<void>;
  toggleChecklistItem: (id: string) => Promise<void>;
  removeChecklistItem: (id: string) => Promise<void>;
  clearCompletedChecklistItems: () => Promise<void>;
  requestReview: (taskId: string, reviewerId?: string) => Promise<void>;
  sendWeeklySummary: (teamId: string) => Promise<void>;
  sendDailyStandup: (teamId: string) => Promise<void>;
  triggerDailySummary: (teamId: string) => Promise<void>;
  triggerTeamAlert: (teamId: string | undefined, message: string, threadKey?: string, projectId?: string) => Promise<void>;
  notifyUserExternally: (userId: string, message: string, type?: keyof NotificationPreferences) => Promise<void>;
  createNotification: (targetUserId: string, type: Notification['type'], message: string, metadata: { taskId?: string; projectId?: string; taskTitle?: string; link?: string }) => Promise<void>;
  sendGoogleChatNotification: (webhookUrl: string, message: string, threadKey?: string) => Promise<void>;
  addToast: (toast: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string; action?: { label: string; onClick: () => void }; persistent?: boolean }) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile: authUser, getValidGoogleToken, updateUserProfile } = useAuth();
  const { addToast } = useToast();

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [dashboardTasks, setDashboardTasks] = useState<Task[]>([]);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [googleTasks, setGoogleTasks] = useState<unknown[]>([]);
  const [teamChatMessages, setTeamChatMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
  const [idealBlocks, setIdealBlocks] = useState<IdealBlock[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [idealWeekSettings, setIdealWeekSettings] = useState<IdealWeekSettings>(DEFAULT_IDEAL_WEEK_SETTINGS);
  const [projectDocuments, setProjectDocuments] = useState<Document[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [activeView, setActiveViewState] = useState('dashboard');
  const [projectSubView, setProjectSubViewState] = useState('kanban');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const [viewingLeadId, setViewingLeadId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [newTaskData, setNewTaskData] = useState<Partial<Task> | null>(null);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [creatingProjectForTeamId, setCreatingProjectForTeamId] = useState<string | null>(null);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [isManagingTeamMembers, setIsManagingTeamMembers] = useState(false);
  const [isSettingAvailability, setIsSettingAvailability] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | 'new' | null>(null);
  const [templateToApply, setTemplateToApply] = useState<Template | null>(null);
  const [templateToApplyToTask, setTemplateToApplyToTask] = useState<Task | null>(null);
  const [generatingSubtasksForTask, setGeneratingSubtasksForTask] = useState<Task | null>(null);
  const [focusState, setFocusState] = useState({ isActive: false, taskId: null as string | null, timeLeft: 25 * 60, isPaused: false });
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [tableViewConfig, setTableViewConfig] = useState<TableViewColumnConfig[]>(DEFAULT_TABLE_CONFIG);
  const [cardVisibilityConfig, setCardVisibilityConfig] = useState({ showSubtasks: true, showPriority: true, showDueDate: true, showAssignees: true });
  const [viewingFile, setViewingFile] = useState<Attachment | null>(null);
  const [isFileViewerOpen, setIsFileViewerOpen] = useState(false);
  
  const lastNotificationId = useRef<string | null>(null);
  const allTasksRef = useRef<Task[]>([]);
  useEffect(() => { allTasksRef.current = allTasks; }, [allTasks]);

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedProjectId) || null, [projects, selectedProjectId]);
  const selectedTeam = useMemo(() => teams.find(t => t.id === selectedTeamId) || null, [teams, selectedTeamId]);
  const activeTaskList = useMemo(() => (activeView === 'dashboard' || activeView === 'calendar' || activeView === 'reports' || activeView === 'activity') ? allTasks : projectTasks, [activeView, allTasks, projectTasks]);
  const viewingTask = useMemo(() => activeTaskList.find(t => t.id === viewingTaskId) || null, [activeTaskList, viewingTaskId]);
  const viewingLead = useMemo(() => allTasks.find(t => t.id === viewingLeadId) || null, [allTasks, viewingLeadId]);
  const archivedProjects = useMemo(() => projects.filter(p => p.isArchived), [projects]);

  const sendGoogleChatNotification = useCallback(async (webhookUrl: string, message: string, threadKey?: string) => {
    try {
      const payload: Record<string, unknown> = { text: message };
      if (threadKey) {
        payload.thread = { threadKey };
      }
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error("Failed to send Google Chat notification:", error);
    }
  }, []);

  const notifyUserExternally = useCallback(async (userId: string, message: string, type?: keyof NotificationPreferences) => {
    const user = allUsers.find(u => u.id === userId);
    if (user?.googleChatWebhook) {
      // Check granular toggles
      if (user.notificationPreferences) {
          if (type && user.notificationPreferences[type] === false) {
              console.log(`External notification suppressed by user preference: ${type}`);
              return;
          }
          if (user.notificationPreferences.teamAlerts === false) {
              console.log(`External notifications disabled for user.`);
              return;
          }
      }
      sendGoogleChatNotification(user.googleChatWebhook, message);
    }
  }, [allUsers, sendGoogleChatNotification]);

  const createNotification = useCallback(async (
      targetUserId: string, 
      type: Notification['type'], 
      message: string, 
      metadata: { taskId?: string; projectId?: string; teamId?: string; taskTitle?: string; link?: string }
  ) => {
      console.log('DEBUG: createNotification called', { targetUserId, type, message, metadata });
      if (!targetUserId || targetUserId === authUser?.id) {
          console.log('DEBUG: createNotification skipped (self or no target)', { targetUserId, authUserId: authUser?.id });
          return;
      }
      const targetUser = allUsers.find(u => u.id === targetUserId);
      await notificationService.create(
          targetUserId,
          type,
          message,
          { name: authUser?.name || 'System', avatarUrl: authUser?.avatarUrl || '' },
          metadata,
          targetUser?.notificationPreferences
      );
  }, [allUsers, authUser]);

  const triggerTeamAlert = useCallback(async (teamId: string | undefined, message: string, threadKey?: string, projectId?: string) => {
    // 1. Project Webhook
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project?.integrations?.googleChatWebhook) {
        sendGoogleChatNotification(project.integrations.googleChatWebhook, message, threadKey);
      }
    }

    // 2. Team Webhook
    if (teamId) {
      const team = teams.find(t => t.id === teamId);
      if (team?.dailySummaryWebhook) {
        sendGoogleChatNotification(team.dailySummaryWebhook, message, threadKey);
      }
    }
  }, [projects, teams, sendGoogleChatNotification]);

  useEffect(() => {
    if (!authUser || allTasks.length === 0) return;

    const checkDeadlines = async () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(23, 59, 59, 999);

        const upcomingTasks = allTasks.filter(t => {
            if (!t.dueDate) return false;
            const due = new Date(t.dueDate);
            const isDueSoon = due > now && due <= tomorrow;
            const status = t.status || '';
            const isDone = ['done', 'complete', 'closed', 'archived', 'sold', 'launched'].some(s => status.toLowerCase().includes(s));
            const isAssigned = (t.assigneeIds || []).includes(authUser.id);
            return isDueSoon && !isDone && isAssigned;
        });

        for (const task of upcomingTasks) {
            const alreadyNotified = await notificationService.hasNotifiedToday(authUser.id, task.id, 'deadline');
            if (!alreadyNotified) {
                await createNotification(
                    authUser.id,
                    'deadline',
                    `Task "${task.title}" is due soon.`,
                    { taskId: task.id, projectId: task.projectId, taskTitle: task.title, link: `view=project&id=${task.projectId}&taskId=${task.id}` }
                );
            }
        }
    };

    const timer = setTimeout(checkDeadlines, 5000);
    return () => clearTimeout(timer);
  }, [allTasks, authUser, createNotification]);

  const fetchGoogleTasks = useCallback(async () => {
      if (!authUser?.googleTasksEnabled) { setGoogleTasks([]); return; }
      try {
          const token = await getValidGoogleToken();
          if (!token) return;
          const listId = authUser.selectedTasksListId || '@default';
          const response = await fetch(`https://www.googleapis.com/tasks/v1/lists/${listId}/tasks?showCompleted=false`, { headers: { Authorization: `Bearer ${token}` } });
          if (response.ok) { const data = await response.json(); setGoogleTasks(data.items || []); }
      } catch (error) { console.error("Google Tasks Fetch Failed:", error); }
  }, [authUser, getValidGoogleToken]);

  useEffect(() => {
    if (!authUser) return;
    const unsubUsers = onSnapshot(collection(db, 'users'), 
        snapshot => setAllUsers(snapshot.docs.map(d => scrubAndConvert({ id: d.id, ...d.data() }) as User)),
        (error) => console.error("Users snapshot error:", error)
    );
    const unsubProjects = onSnapshot(query(collection(db, 'projects'), where('memberIds', 'array-contains', authUser.id)), 
        snapshot => setProjects(snapshot.docs.map(d => scrubAndConvert({ id: d.id, ...d.data() }) as Project)),
        (error) => console.error("Projects snapshot error:", error)
    );
    const unsubTeams = onSnapshot(query(collection(db, 'teams'), where('memberIds', 'array-contains', authUser.id)), 
        snapshot => setTeams(snapshot.docs.map(d => scrubAndConvert({ id: d.id, ...d.data() }) as Team)),
        (error) => console.error("Teams snapshot error:", error)
    );
    const unsubNotifications = onSnapshot(query(collection(db, 'notifications'), where('userId', '==', authUser.id), orderBy('createdAt', 'desc'), limit(50)), 
        snapshot => setNotifications(snapshot.docs.map(d => scrubAndConvert({ id: d.id, ...d.data() }) as Notification)),
        (error) => console.error("Notifications snapshot error:", error)
    );
    const unsubTemplates = onSnapshot(query(collection(db, 'templates'), or(where('isShared', '==', true), where('creatorId', '==', authUser.id))), 
        snapshot => setTemplates(snapshot.docs.map(d => scrubAndConvert({ id: d.id, ...d.data() }) as Template)),
        (error) => console.error("Templates snapshot error:", error)
    );
    const unsubForms = onSnapshot(query(collection(db, 'forms'), or(where('creatorId', '==', authUser.id), where('memberIds', 'array-contains', authUser.id))), 
        snapshot => setForms(snapshot.docs.map(d => scrubAndConvert({ id: d.id, ...d.data() }) as Form)),
        (error) => console.error("Forms snapshot error:", error)
    );
    const unsubIdeal = onSnapshot(query(collection(db, 'ideal_weeks'), where('userId', '==', authUser.id)), 
        snapshot => setIdealBlocks(snapshot.docs.map(d => scrubAndConvert({ id: d.id, ...d.data() }) as IdealBlock)),
        (error) => console.error("Ideal weeks snapshot error:", error)
    );
    const unsubMyAvail = onSnapshot(query(collection(db, 'availabilityBlocks'), where('userId', '==', authUser.id), orderBy('startTime', 'asc')), 
        snapshot => setAvailabilityBlocks(snapshot.docs.map(d => scrubAndConvert({ id: d.id, ...d.data() }) as AvailabilityBlock)),
        (error) => console.error("Availability blocks snapshot error:", error)
    );
    const unsubHabits = onSnapshot(query(collection(db, 'habits'), where('userId', '==', authUser.id)), 
        snapshot => setHabits(snapshot.docs.map(d => scrubAndConvert({ id: d.id, ...d.data() }) as Habit)),
        (error) => console.error("Habits snapshot error:", error)
    );
    const unsubHabitLogs = onSnapshot(query(collection(db, 'habitLogs'), where('userId', '==', authUser.id)), 
        snapshot => setHabitLogs(snapshot.docs.map(d => scrubAndConvert({ id: d.id, ...d.data() }) as HabitLog)),
        (error) => console.error("Habit logs snapshot error:", error)
    );
    const unsubChecklist = onSnapshot(query(collection(db, 'checklists'), where('userId', '==', authUser.id), orderBy('createdAt', 'desc')), 
        snapshot => {
            setChecklist(snapshot.docs.map(d => scrubAndConvert({ id: d.id, ...d.data() }) as ChecklistItem));
        },
        (error) => console.error("Checklist snapshot error:", error)
    );

    const unsubGlobalTasks = onSnapshot(query(collection(db, 'tasks'), where('memberIds', 'array-contains', authUser.id)), 
        snapshot => {
            const tasks = snapshot.docs.map(d => scrubAndConvert({ id: d.id, ...d.data() }) as Task);
            setAllTasks(tasks);
            setDashboardTasks([...tasks].sort((a, b) => (a.dueDate ? new Date(a.dueDate).getTime() : 0) - (b.dueDate ? new Date(b.dueDate).getTime() : 0)).slice(0, 50));
            setIsLoading(false);
        },
        (error) => console.error("Global tasks snapshot error:", error)
    );

    return () => { unsubUsers(); unsubProjects(); unsubTeams(); unsubNotifications(); unsubTemplates(); unsubForms(); unsubIdeal(); unsubMyAvail(); unsubGlobalTasks(); unsubHabits(); unsubHabitLogs(); unsubChecklist(); };
  }, [authUser]);

  useEffect(() => {
    if (!authUser || !selectedTeamId) { setTeamChatMessages([]); return; }
    return onSnapshot(query(collection(db, 'team_chats'), where('teamId', '==', selectedTeamId), orderBy('timestamp', 'desc'), limit(100)), snapshot => setTeamChatMessages(snapshot.docs.map(d => scrubAndConvert({ id: d.id, ...d.data() }) as ChatMessage).reverse()));
  }, [authUser, selectedTeamId]);

  useEffect(() => {
    if (!authUser || !selectedProjectId) { setProjectTasks([]); setProjectDocuments([]); return; }
    const unsubTasks = onSnapshot(query(collection(db, 'tasks'), where('memberIds', 'array-contains', authUser.id), where('projectId', '==', selectedProjectId), orderBy('order', 'asc')), snapshot => setProjectTasks(snapshot.docs.map(d => scrubAndConvert({ id: d.id, ...d.data() }) as Task)));
    const unsubDocs = onSnapshot(query(collection(db, 'documents'), where('memberIds', 'array-contains', authUser.id), where('projectId', '==', selectedProjectId)), snapshot => setProjectDocuments(snapshot.docs.map(d => scrubAndConvert({ id: d.id, ...d.data() }) as Document)));
    return () => { unsubTasks(); unsubDocs(); };
  }, [authUser, selectedProjectId]);

  const setActiveView = useCallback((view: string) => setActiveViewState(view), []);
  const setProjectSubView = useCallback((view: string) => setProjectSubViewState(view), []);
  const selectProject = useCallback((id: string, nav = true) => { setSelectedProjectId(id); if (nav) setActiveViewState('project'); }, []);
  const selectTeam = useCallback((id: string, nav = true) => { setSelectedTeamId(id); if (nav) setActiveViewState('teams'); }, []);
  
  const logHabit = useCallback(async (habitId: string, count: number, date?: string) => {
    if (!authUser) return;
    const logDate = date || new Date().toISOString().split('T')[0];
    const logId = `${habitId}_${logDate}`;
    await setDoc(doc(db, 'habitLogs', logId), {
        habitId,
        userId: authUser.id,
        date: logDate,
        count
    }, { merge: true });
  }, [authUser]);

  const createHabit = useCallback(async (habit: Omit<Habit, 'id' | 'userId' | 'createdAt'>) => {
    if (!authUser) return;
    await addDoc(collection(db, 'habits'), scrubAndConvert({
        ...habit,
        userId: authUser.id,
        createdAt: serverTimestamp()
    }));
    addToast({ type: 'success', title: 'Habit Created' });
  }, [authUser, addToast]);

  const updateProject = useCallback(async (id: string, data: Partial<Project>) => { 
      const oldProject = projects.find(p => p.id === id);
      await updateDoc(doc(db, 'projects', id), scrubAndConvert(data)); 
      addToast({ type: 'success', title: 'Project Updated' }); 

      // Check for completion/archival in update
      if (data.isArchived && !oldProject?.isArchived && (oldProject?.teamId || oldProject?.integrations?.googleChatWebhook)) {
          const message = `🏁 **Project Completed: ${oldProject.name}**\n\nThe mission has been successfully archived by **${authUser?.name || 'a team member'}**. All objectives secured.`;
          triggerTeamAlert(oldProject.teamId, message, undefined, oldProject.id);
      }
  }, [addToast, projects, authUser, triggerTeamAlert]);

  const createProject = useCallback(async (name: string, description: string, templateId: string, color: string, teamId?: string) => { 
      if (!authUser) return; 
      const team = teamId ? teams.find(t => t.id === teamId) : null; 
      await addDoc(collection(db, 'projects'), { name, description, color, workflow: DEFAULT_WORKFLOW, memberIds: team ? team.memberIds : [authUser.id], teamId: teamId || null, ownerId: authUser.id, createdAt: serverTimestamp(), isArchived: false }); 
      addToast({ type: 'success', title: 'Project Created' }); 

      // Notify on creation if webhook exists
      if (team?.dailySummaryWebhook) {
          const message = `🏗️ **New Project Initiated: ${name}**\n\nA new mission has been logged by **${authUser.name}**. Ready for deployment.\n\n*Thread Identity: team_${team.id}*`;
          sendGoogleChatNotification(team.dailySummaryWebhook, message, `team_${team.id}`);
      }
  }, [authUser, teams, addToast, sendGoogleChatNotification]);

  const deleteProject = useCallback(async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this project and all associated tasks?")) return;
    const project = projects.find(p => p.id === id);
    await deleteDoc(doc(db, 'projects', id));
    if (selectedProjectId === id) setSelectedProjectId(null);
    addToast({ type: 'info', title: 'Project Deleted' });

    if (project?.teamId) {
        const team = teams.find(t => t.id === project.teamId);
        if (team?.dailySummaryWebhook) {
            const message = `🗑️ **Project Terminated: ${project.name}**\n\nThe mission has been purged from the system by **${authUser?.name || 'a team member'}**.\n\n*Thread Identity: team_${team.id}*`;
            sendGoogleChatNotification(team.dailySummaryWebhook, message, `team_${team.id}`);
        }
    }
  }, [selectedProjectId, addToast, projects, teams, authUser, sendGoogleChatNotification]);

  const archiveProject = useCallback(async (id: string) => {
    const project = projects.find(p => p.id === id);
    await updateDoc(doc(db, 'projects', id), { isArchived: true });
    addToast({ type: 'info', title: 'Project Archived' });

    if (project?.teamId) {
        const team = teams.find(t => t.id === project.teamId);
        if (team?.dailySummaryWebhook) {
            const message = `🏁 **Project Completed: ${project.name}**\n\nThe mission has been successfully archived by **${authUser?.name || 'a team member'}**. All objectives secured.\n\n*Thread Identity: team_${team.id}*`;
            sendGoogleChatNotification(team.dailySummaryWebhook, message, `team_${team.id}`);
        }
    }
  }, [addToast, projects, teams, authUser, sendGoogleChatNotification]);

  const restoreProject = useCallback(async (id: string) => {
    await updateDoc(doc(db, 'projects', id), { isArchived: false });
    addToast({ type: 'success', title: 'Project Restored' });
  }, [addToast]);
  
  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => { 
      const oldTask = allTasksRef.current.find(t => t.id === id);
      if (!oldTask) return;

      const auditEntries: AuditLog[] = [];
      const now = new Date();

      // Handoff Logic: Status Change
      if (updates.status && updates.status !== oldTask.status && authUser) {
          const project = projects.find(p => p.id === oldTask.projectId);
          const oldStatusName = project?.workflow.find(s => s.id === oldTask.status)?.name || oldTask.status;
          const newStatusName = project?.workflow.find(s => s.id === updates.status)?.name || updates.status;
          
          // Auto-set isCompleted if status matches common "done" names or is the last status
          if (project && project.workflow.length > 0) {
              const doneNames = ['done', 'complete', 'closed', 'archived', 'sold', 'launched'];
              const currentStatus = project.workflow.find(s => s.id === updates.status);
              const lastStatus = project.workflow[project.workflow.length - 1];
              
              const isDone = (currentStatus && doneNames.includes(currentStatus.name.toLowerCase())) || 
                             updates.status === lastStatus.id ||
                             updates.status === 'done';
              
              updates.isCompleted = isDone;
          }

          auditEntries.push({
              id: Math.random().toString(36).substr(2, 9),
              user: authUser,
              action: 'Status Handoff',
              details: `Moved from ${oldStatusName} to ${newStatusName}`,
              timestamp: now
          });

          // Notify assignees about status change
          (oldTask.assigneeIds || []).forEach(uid => {
              if (uid !== authUser.id) {
                  createNotification(uid, 'handoff', `Task "${oldTask.title}" moved to ${newStatusName}`, { taskId: id, projectId: oldTask.projectId, taskTitle: oldTask.title, link: `view=project&id=${oldTask.projectId}&taskId=${id}` });
                  
                  // External Notification
                  notifyUserExternally(uid, `🔄 **Task Update: ${oldTask.title}**\n\nStatus changed to **${newStatusName}** by ${authUser.name}.\n\n*Project: ${project?.name || 'Unknown'}*`, 'handoffs');
              }
          });

          // Milestone Alert
          if (updates.isCompleted && !oldTask.isCompleted && (project?.teamId || project?.integrations?.googleChatWebhook)) {
              triggerTeamAlert(project?.teamId, `🏆 **Milestone Achieved: ${oldTask.title}**\n\nA key objective in **${project?.name}** has been secured by ${authUser.name}. Velocity increasing.`, undefined, project?.id);
          }
      }

      // Priority Escalation Alert
      if (updates.priority === TaskPriority.HIGH && oldTask.priority !== TaskPriority.HIGH) {
          const project = projects.find(p => p.id === oldTask.projectId);
          if (project?.teamId || project?.integrations?.googleChatWebhook) {
              triggerTeamAlert(project?.teamId, `🚨 **Priority Escalation: ${oldTask.title}**\n\nTask priority has been elevated to **HIGH** in **${project?.name}**. Adjusting focus.`, undefined, project?.id);
          }
      }

      // Handoff Logic: Assignee Change
      if (updates.assigneeIds && authUser) {
          const newAssignees = updates.assigneeIds.filter(uid => !(oldTask.assigneeIds || []).includes(uid));

          if (newAssignees.length > 0) {
              const names = newAssignees.map(uid => allUsers.find(u => u.id === uid)?.name).filter(Boolean).join(', ');
              auditEntries.push({
                  id: Math.random().toString(36).substr(2, 9),
                  user: authUser,
                  action: 'Assignment Handoff',
                  details: `Assigned to ${names}`,
                  timestamp: now
              });

              for (const uid of newAssignees) {
                  if (uid !== authUser.id) {
                      createNotification(uid, 'assignment', `Assigned you to: ${oldTask.title}`, { taskId: id, projectId: oldTask.projectId, taskTitle: oldTask.title, link: `view=project&id=${oldTask.projectId}&taskId=${id}` });
                      
                      // External Notification
                      notifyUserExternally(uid, `🎯 **New Assignment: ${oldTask.title}**\n\nYou have been assigned to this task by ${authUser.name}.\n\n*Project: ${projects.find(p => p.id === oldTask.projectId)?.name || 'Unknown'}*`, 'assignments');
                  }
              }
          }
      }

      const finalUpdates = scrubAndConvert({ 
          ...updates, 
          updatedAt: serverTimestamp(),
          auditTrail: auditEntries.length > 0 ? arrayUnion(...auditEntries) : undefined
      });

      // Remove undefined keys so they don't overwrite in Firestore if not intended
      if (finalUpdates.auditTrail === undefined) delete finalUpdates.auditTrail;

      await updateDoc(doc(db, 'tasks', id), finalUpdates); 
  }, [authUser, projects, allUsers, notifyUserExternally, triggerTeamAlert, createNotification]);

  const requestReview = useCallback(async (taskId: string, reviewerId?: string) => {
    if (!authUser) return;
    const task = allTasksRef.current.find(t => t.id === taskId);
    if (!task) return;

    const project = projects.find(p => p.id === task.projectId);
    if (!project) return;

    // Find a "Review" or "Quality Control" status in the workflow
    const reviewStatus = project.workflow.find(s => 
        s.name.toLowerCase().includes('review') || 
        s.name.toLowerCase().includes('qc') || 
        s.name.toLowerCase().includes('approval')
    ) || project.workflow[project.workflow.length - 1]; // Fallback to last status

    const updates: Partial<Task> = { status: reviewStatus.id };
    if (reviewerId) {
        updates.assigneeIds = [reviewerId];
    }

    await updateTask(taskId, updates);

    // Notify the reviewer specifically if provided, otherwise notify project owner/leads
    const targetId = reviewerId || project.ownerId;
    if (targetId && targetId !== authUser.id) {
        createNotification(
            targetId,
            'handoff',
            `Review Requested: ${task.title}`,
            { taskId, projectId: project.id, taskTitle: task.title, link: `view=project&id=${project.id}&taskId=${taskId}` }
        );
    }

    addToast({ type: 'success', title: 'Review Requested', message: reviewerId ? 'The reviewer has been notified.' : 'The project lead has been notified.' });
  }, [authUser, projects, updateTask, addToast, createNotification]);

  const bulkUpdateTasks = useCallback(async (updates: Partial<Task>) => {
    const batch = writeBatch(db);
    selectedTaskIds.forEach(id => {
        batch.update(doc(db, 'tasks', id), scrubAndConvert({ ...updates, updatedAt: serverTimestamp() }));
    });
    await batch.commit();
    addToast({ type: 'success', title: 'Tasks Updated', message: `${selectedTaskIds.size} tasks updated.` });
    setSelectedTaskIds(new Set());
  }, [selectedTaskIds, addToast]);

  const bulkDeleteTasks = useCallback(async () => {
    if (!window.confirm(`Delete ${selectedTaskIds.size} tasks permanently?`)) return;
    const batch = writeBatch(db);
    selectedTaskIds.forEach(id => {
        batch.delete(doc(db, 'tasks', id));
    });
    await batch.commit();
    addToast({ type: 'info', title: 'Tasks Deleted', message: `${selectedTaskIds.size} tasks removed.` });
    setSelectedTaskIds(new Set());
  }, [selectedTaskIds, addToast]);

  const closeTaskDetail = useCallback(() => setViewingTaskId(null), []);
  const closeLeadInfo = useCallback(() => setViewingLeadId(null), []);

  const editTask = useCallback((taskId: string | 'new', initialData?: Partial<Task>) => {
    setEditingTask(taskId);
    if (taskId === 'new' && initialData) setNewTaskData(initialData);
  }, []);

  const openCreateLeadModal = useCallback(() => setIsCreatingLead(true), []);
  const closeCreateLeadModal = useCallback(() => setIsCreatingLead(false), []);

  const viewTask = useCallback((task: Task) => setViewingTaskId(task.id), []);
  const viewLead = useCallback((task: Task) => setViewingLeadId(task.id), []);

  const viewFile = useCallback((file: Attachment) => {
    setViewingFile(file);
    setIsFileViewerOpen(true);
  }, []);

  const closeFileViewer = useCallback(() => setIsFileViewerOpen(false), []);

  const addExpenseToTask = useCallback(async (taskId: string, expense: Omit<Expense, 'id'>) => {
      await updateDoc(doc(db, 'tasks', taskId), {
          expenses: arrayUnion(scrubAndConvert({
              ...expense,
              id: Math.random().toString(36).substr(2, 9),
          }))
      });
  }, []);

  const deleteExpenseFromTask = useCallback(async (taskId: string, expenseId: string) => {
      const task = allTasksRef.current.find(t => t.id === taskId);
      if (task) {
          await updateDoc(doc(db, 'tasks', taskId), {
              expenses: (task.expenses || []).filter(e => e.id !== expenseId)
          });
      }
  }, []);

  const closeModals = useCallback(() => { 
    setViewingTaskId(null); 
    setViewingLeadId(null);
    setEditingTask(null); 
    setIsCreatingProject(false); 
    setIsCreatingTeam(false); 
    setIsCreatingLead(false);
    setIsManagingTeamMembers(false); 
    setIsSettingAvailability(false); 
    setEditingTemplate(null); 
    setTemplateToApply(null); 
    setTemplateToApplyToTask(null); 
    setIsGlobalSearchOpen(false); 
    setGeneratingSubtasksForTask(null); 
  }, []);
  
  const addTask = useCallback(async (data: Partial<Task>) => { 
      if (!authUser) return; 
      const project = projects.find(p => p.id === data.projectId); 
      if (!project) throw new Error("Project not found."); 
      
      const status = data.status || (project.workflow && project.workflow.length > 0 ? project.workflow[0].id : 'backlog');
      const isCompleted = project.workflow && project.workflow.length > 0 ? status === project.workflow[project.workflow.length - 1].id : false;

      await addDoc(collection(db, 'tasks'), scrubAndConvert({ ...data, status: status, isCompleted, memberIds: project.memberIds || [authUser.id], createdAt: serverTimestamp(), startDate: data.startDate || new Date(), dueDate: data.dueDate || new Date(), eventDate: data.eventDate || null, assigneeIds: data.assigneeIds || [], comments: [], attachments: [], subtasks: [], auditTrail: [], order: data.order || Date.now(), priority: data.priority || TaskPriority.MEDIUM })); 
      addToast({ type: 'success', title: 'Task Created' }); 

      // Trigger Team/Project Alerts
      if (project.teamId || project.integrations?.googleChatWebhook) {
          if (data.priority === TaskPriority.HIGH) {
              triggerTeamAlert(project.teamId, `⚠️ **High Priority Alert: ${data.title}**\n\nA critical task has been added to **${project.name}** by ${authUser.name}. Immediate attention requested.`, undefined, project.id);
          }
          if (data.taskType === 'Consult' || data.taskType === 'Listing') { // Assuming these are "Leads"
              triggerTeamAlert(project.teamId, `🔥 **Hot Lead Alert: ${data.title}**\n\nA new potential opportunity has been identified in **${project.name}**. Velocity is key.`, undefined, project.id);
          }
          // General Task Creation Alert (Optional, but user said "all action-based")
          if (data.priority !== TaskPriority.HIGH && data.taskType !== 'Consult' && data.taskType !== 'Listing') {
              triggerTeamAlert(project.teamId, `🆕 **Task Created: ${data.title}**\n\nA new task has been added to **${project.name}** by ${authUser.name}.`, undefined, project.id);
          }
      }

      // Notify assignees on creation
      if (data.assigneeIds && data.assigneeIds.length > 0) {
          data.assigneeIds.forEach(uid => {
              if (uid !== authUser.id) {
                  notifyUserExternally(uid, `🆕 **New Task Assigned: ${data.title}**\n\nA new task has been created and assigned to you by ${authUser.name}.\n\n*Project: ${project.name}*`, 'assignments');
              }
          });
      }
  }, [authUser, projects, addToast, notifyUserExternally, triggerTeamAlert]);
  
  const recurTask = useCallback(async (taskId: string) => {
    const task = allTasks.find(t => t.id === taskId);
    if (!task || !task.recurrence || task.recurrence === 'none') return;

    const nextTask = { ...task };
    delete (nextTask as Partial<Task>).id;
    nextTask.status = (projects.find(p => p.id === task.projectId)?.workflow || [])[0]?.id || 'todo';
    nextTask.auditTrail = [{
        id: `recur_${Date.now()}`,
        user: { id: authUser?.id || 'system', name: authUser?.name || 'System', avatarUrl: authUser?.avatarUrl || '', email: authUser?.email || '' },
        action: 'Recurrence Triggered',
        details: `Manually recurred from task ${task.title}`,
        timestamp: new Date()
    }];
    nextTask.createdAt = new Date();
    nextTask.updatedAt = new Date();

    const calculateNextDate = (date: Date | undefined, recurrence: string) => {
        if (!date) return undefined;
        const d = new Date(date);
        if (recurrence === 'daily') d.setDate(d.getDate() + 1);
        else if (recurrence === 'weekly') d.setDate(d.getDate() + 7);
        else if (recurrence === 'monthly') d.setMonth(d.getMonth() + 1);
        return d;
    };

    nextTask.startDate = calculateNextDate(task.startDate, task.recurrence) || new Date();
    nextTask.dueDate = calculateNextDate(task.dueDate, task.recurrence) || new Date();
    if (task.targetDate) nextTask.targetDate = calculateNextDate(task.targetDate, task.recurrence);
    if (task.eventDate) nextTask.eventDate = calculateNextDate(task.eventDate, task.recurrence);

    await addTask(nextTask);
    addToast({ type: 'success', title: 'Recurrence Triggered', message: 'Next occurrence created!' });
  }, [allTasks, projects, authUser, addTask, addToast]);

  const createTeam = useCallback(async (name: string, description: string, inviteeIds: string[]) => { 
      if (!authUser) return; 
      await addDoc(collection(db, 'teams'), { name, description, memberIds: [authUser.id, ...inviteeIds], ownerId: authUser.id, createdAt: serverTimestamp() }); 
      addToast({ type: 'success', title: 'Team Created' }); 
  }, [authUser, addToast]);

  const updateTeam = useCallback(async (id: string, updates: Partial<Team>) => { 
      const oldTeam = teams.find(t => t.id === id);
      await updateDoc(doc(db, 'teams', id), scrubAndConvert(updates));
      if (authUser && updates.goals && oldTeam) {
          updates.goals.forEach(newGoal => {
              const oldGoal = oldTeam.goals?.find(g => g.id === newGoal.id);
              if (oldGoal && newGoal.progress === 100 && oldGoal.progress < 100 && newGoal.ownerId) {
                  if (newGoal.ownerId !== authUser.id) {
                      createNotification(newGoal.ownerId, 'goal', `Goal "${newGoal.title}" has been completed! 🎉`, { link: `view=teams&id=${id}` });
                  }
              }
          });
      }
  }, [teams, authUser, createNotification]);

  const sendTeamChatMessage = useCallback(async (text: string) => { 
      if (!authUser || !selectedTeamId) return; 
      await addDoc(collection(db, 'team_chats'), { teamId: selectedTeamId, senderId: authUser.id, senderName: authUser.name, senderAvatar: authUser.avatarUrl, text, timestamp: serverTimestamp() }); 

      const mentionRegex = /@([^ \n]+)/g;
      const matches = text.match(mentionRegex);
      if (matches) {
          matches.forEach(match => {
              const namePart = match.substring(1).toLowerCase().replace(/\s+/g, '');
              const mentionedUser = allUsers.find(u => {
                  const sanitizedName = (u.name || '').toLowerCase().replace(/\s+/g, '');
                  return sanitizedName.includes(namePart);
              });
              
              if (mentionedUser && mentionedUser.id !== authUser.id) {
                  createNotification(
                      mentionedUser.id, 
                      'mention', 
                      `Mentioned you in team chat`, 
                      { teamId: selectedTeamId, link: `view=teams&id=${selectedTeamId}` }
                  );

                  // External Notification for mention
                  notifyUserExternally(mentionedUser.id, `💬 **You were mentioned in Team Chat**\n\n${authUser.name} mentioned you: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`, 'mentions');
              }
          });
      }
  }, [authUser, selectedTeamId, allUsers, createNotification, notifyUserExternally]);

  const createForm = useCallback(async (f: Omit<Form, 'id'>) => { await addDoc(collection(db, 'forms'), scrubAndConvert(f)); }, []);
  const updateForm = useCallback(async (id: string, u: Partial<Form>) => { await updateDoc(doc(db, 'forms', id), scrubAndConvert(u)); }, []);
  const deleteForm = useCallback(async (id: string) => { await deleteDoc(doc(db, 'forms', id)); }, []);
  
  const fetchFormResponses = useCallback(async (formId: string) => {
    const q = query(collection(db, 'form_responses'), where('formId', '==', formId), orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => scrubAndConvert({ id: d.id, ...d.data() }) as FormResponse);
  }, []);

  const createDocument = useCallback(async (t: string, c: string) => { 
      if (!selectedProject || !authUser) throw new Error("No project selected"); 
      await addDoc(collection(db, 'documents'), { title: t, content: c, projectId: selectedProject.id, memberIds: selectedProject.memberIds, authorId: authUser.id, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); 
  }, [selectedProject, authUser]);

  const updateDocument = useCallback((id: string, u: Partial<Document>) => updateDoc(doc(db, 'documents', id), scrubAndConvert(u)), []);
  const deleteDocument = useCallback((id: string) => deleteDoc(doc(db, 'documents', id)), []);
  const deleteTask = useCallback((id: string) => deleteDoc(doc(db, 'tasks', id)), []);

  const addComment = useCallback(async (taskId: string, text: string) => { 
      if (!authUser) return Promise.reject("Not authenticated"); 
      const task = allTasksRef.current.find(t => t.id === taskId);
      await updateDoc(doc(db, 'tasks', taskId), { comments: arrayUnion(scrubAndConvert({ id: Date.now().toString(), user: authUser, text, timestamp: new Date() })) }); 
      
      const mentionRegex = /@([^ \n]+)/g;
      const matches = text.match(mentionRegex);
      if (matches) {
          matches.forEach(match => {
              const namePart = match.substring(1).toLowerCase().replace(/\s+/g, '');
              const mentionedUser = allUsers.find(u => {
                  const sanitizedName = (u.name || '').toLowerCase().replace(/\s+/g, '');
                  return sanitizedName.includes(namePart);
              });
              
              if (mentionedUser && mentionedUser.id !== authUser.id) {
                  createNotification(
                      mentionedUser.id, 
                      'mention', 
                      `Mentioned you in "${task?.title || 'a task'}"`, 
                      { taskId, projectId: task?.projectId, taskTitle: task?.title, link: `view=project&id=${task?.projectId}&taskId=${taskId}` }
                  );

                  // External Notification for mention
                  notifyUserExternally(mentionedUser.id, `💬 **You were mentioned: ${task?.title || 'Task'}**\n\n${authUser.name} mentioned you in a comment: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"\n\n*Project: ${projects.find(p => p.id === task?.projectId)?.name || 'Unknown'}*`, 'mentions');
              }
          });
      }

      // Alert project/team about new comment
      if (task && task.projectId) {
          const project = projects.find(p => p.id === task.projectId);
          if (project?.teamId || project?.integrations?.googleChatWebhook) {
              triggerTeamAlert(project?.teamId, `💬 **New Comment: ${task.title}**\n\n${authUser.name} added a comment: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`, undefined, project?.id);
          }
      }
  }, [authUser, allUsers, projects, notifyUserExternally, triggerTeamAlert, createNotification]);

  const addBatchSubtasks = useCallback(async (taskId: string, titles: string[]) => { 
      const newSubtasks = titles.map(t => scrubAndConvert({ id: Math.random().toString(36).substr(2, 9), title: t, isCompleted: false })); 
      await updateDoc(doc(db, 'tasks', taskId), { subtasks: arrayUnion(...newSubtasks) }); 
  }, []);

  const toggleTaskSelection = useCallback((id: string) => {
    setSelectedTaskIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });
  }, []);

  const clearTaskSelection = useCallback(() => setSelectedTaskIds(new Set()), []);

  const fetchTaskById = useCallback(async (id: string) => {
    const d = await getDoc(doc(db, 'tasks', id));
    return d.exists() ? scrubAndConvert({ id: d.id, ...d.data() }) as Task : null;
  }, []);

  const markNotificationsAsRead = useCallback(async () => {
    const batch = writeBatch(db);
    notifications.filter(n => !n.read).forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    await batch.commit();
  }, [notifications]);

  const clearAllNotifications = useCallback(async () => {
    const batch = writeBatch(db);
    notifications.forEach(n => {
        batch.delete(doc(db, 'notifications', n.id));
    });
    await batch.commit();
  }, [notifications]);

  const openGlobalSearch = useCallback(() => setIsGlobalSearchOpen(true), []);
  const closeGlobalSearch = useCallback(() => setIsGlobalSearchOpen(false), []);

  const openCreateProjectModal = useCallback((teamId?: string) => {
    setCreatingProjectForTeamId(teamId || null);
    setIsCreatingProject(true);
  }, []);
  const closeCreateProjectModal = useCallback(() => setIsCreatingProject(false), []);

  const openCreateTeamModal = useCallback(() => setIsCreatingTeam(true), []);
  const closeCreateTeamModal = useCallback(() => setIsCreatingTeam(false), []);

  const openManageTeamMembersModal = useCallback(() => setIsManagingTeamMembers(true), []);
  const closeManageTeamMembersModal = useCallback(() => setIsManagingTeamMembers(false), []);

  const openSetAvailabilityModal = useCallback(() => setIsSettingAvailability(true), []);
  const closeSetAvailabilityModal = useCallback(() => setIsSettingAvailability(false), []);

  const applyTemplate = useCallback(async (templateId: string, projectId: string, options: { importTasks: boolean; importLinks: boolean }) => {
    const template = templates.find(t => t.id === templateId);
    if (!template || !authUser) return;

    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const resolveVariables = (text: string) => {
        return text.replace(/{{project_name}}/g, project.name)
                   .replace(/{{due_date}}/g, new Date().toLocaleDateString());
    };

    if (options.importTasks) {
      const batch = writeBatch(db);
      template.tasks.forEach((t, index) => {
        const newTaskRef = doc(collection(db, 'tasks'));
        
        let assigneeIds: string[] = [];
        if (t.assigneeRole && project.teamId) {
            const team = teams.find(team => team.id === project.teamId);
            const role = team?.roles?.find(r => r.name === t.assigneeRole);
            if (role) {
                assigneeIds = role.memberIds;
            }
        }

        batch.set(newTaskRef, scrubAndConvert({
          projectId,
          title: resolveVariables(t.title),
          description: resolveVariables(t.description),
          status: project.workflow[0]?.id || 'backlog',
          priority: TaskPriority.MEDIUM,
          memberIds: [...new Set([...project.memberIds, ...assigneeIds])],
          assigneeIds: assigneeIds,
          createdAt: serverTimestamp(),
          dueDate: new Date(),
          startDate: new Date(),
          order: Date.now() + index,
          subtasks: [],
          attachments: [],
          comments: [],
          auditTrail: []
        }));
      });
      await batch.commit();
    }

    if (options.importLinks && template.links.length > 0) {
      await addDoc(collection(db, 'tasks'), scrubAndConvert({
        projectId,
        title: `${template.name} Resources`,
        description: 'Template links and resources.',
        status: project.workflow[0]?.id || 'backlog',
        priority: TaskPriority.LOW,
        memberIds: project.memberIds,
        assigneeIds: [],
        createdAt: serverTimestamp(),
        dueDate: new Date(),
        startDate: new Date(),
        order: Date.now() + 999,
        subtasks: [],
        attachments: template.links.map(l => ({
          id: Math.random().toString(36).substr(2, 9),
          name: l.name,
          url: l.url,
          fileType: 'link'
        })),
        comments: [],
        auditTrail: []
      }));
    }
    
    addToast({ type: 'success', title: 'Template Applied', message: `Added components from ${template.name} to project.` });
  }, [templates, projects, authUser, addToast, teams]);

  const applyTemplateToTask = useCallback(async (templateId: string, taskId: string, options: { importTasks: boolean; importLinks: boolean }) => {
    const template = templates.find(t => t.id === templateId);
    const task = allTasks.find(t => t.id === taskId);
    if (!template || !task) return;

    const updates: Partial<Task> = {};

    if (options.importTasks) {
      const newSubtasks: Subtask[] = template.tasks.map(t => {
        let assigneeIds: string[] = [];
        if (t.assigneeRole && task.projectId) {
            const project = projects.find(p => p.id === task.projectId);
            if (project && project.teamId) {
                const team = teams.find(team => team.id === project.teamId);
                const role = team?.roles?.find(r => r.name === t.assigneeRole);
                if (role) {
                    assigneeIds = role.memberIds;
                }
            }
        }
        return {
          id: Math.random().toString(36).substr(2, 9),
          title: t.title,
          isCompleted: false,
          section: t.section || 'Imported',
          assigneeIds: assigneeIds
        };
      });
      updates.subtasks = [...(task.subtasks || []), ...newSubtasks];
    }

    if (options.importLinks) {
      const newAttachments: Attachment[] = template.links.map(l => ({
        id: Math.random().toString(36).substr(2, 9),
        name: l.name,
        url: l.url,
        fileType: 'link'
      }));
      updates.attachments = [...(task.attachments || []), ...newAttachments];
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, 'tasks', taskId), scrubAndConvert(updates));
      addToast({ type: 'success', title: 'Workflow Injected', message: `Template components added to task.` });

      if (options.importLinks && (task.projectId)) {
          const project = projects.find(p => p.id === task.projectId);
          if (project?.teamId || project?.integrations?.googleChatWebhook) {
              triggerTeamAlert(project?.teamId, `📁 **Template Assets Injected: ${task.title}**\n\nNew reference links and assets have been added to this task via template **${template.name}**.`, undefined, project?.id);
          }
      }
    }
  }, [templates, allTasks, projects, teams, addToast, triggerTeamAlert]);

  useEffect(() => {
      if (notifications.length > 0) {
          const latest = notifications[0];
          if (!latest.read && latest.id !== lastNotificationId.current) {
              lastNotificationId.current = latest.id;
              addToast({
                  type: 'info',
                  title: 'New Protocol Transmission',
                  message: latest.message,
                  action: {
                      label: 'View',
                      onClick: () => {
                        if (latest.projectId) {
                            selectProject(latest.projectId, false);
                            if (latest.taskId) {
                                fetchTaskById(latest.taskId).then(t => t && viewTask(t));
                            }
                        } else if (latest.link) {
                            const params = new URLSearchParams(latest.link);
                            const v = params.get('view');
                            if (v) setActiveView(v);
                        }
                      }
                  }
              });
          }
      }
  }, [notifications, addToast, selectProject, viewTask, fetchTaskById, setActiveView]);

  const addChecklistItem = useCallback(async (text: string) => {
    if (!authUser) return;
    await addDoc(collection(db, 'checklists'), scrubAndConvert({
      userId: authUser.id,
      text,
      isCompleted: false,
      createdAt: serverTimestamp()
    }));
  }, [authUser]);

  const toggleChecklistItem = useCallback(async (id: string) => {
    if (!authUser) return;
    const item = checklist.find(i => i.id === id);
    if (item) {
        await updateDoc(doc(db, 'checklists', id), { isCompleted: !item.isCompleted });
    }
  }, [authUser, checklist]);

  const removeChecklistItem = useCallback(async (id: string) => {
    if (!authUser) return;
    await deleteDoc(doc(db, 'checklists', id));
  }, [authUser]);

  const clearCompletedChecklistItems = useCallback(async () => {
    if (!authUser) return;
    const batch = writeBatch(db);
    checklist.filter(i => i.isCompleted).forEach(item => {
        batch.delete(doc(db, 'checklists', item.id));
    });
    await batch.commit();
  }, [authUser, checklist]);

  const saveTemplate = useCallback(async (template: Partial<Template>, id?: string) => {
    if (!authUser) return;
    const data = scrubAndConvert({
      ...template,
      creatorId: authUser.id,
      creatorName: authUser.name,
      updatedAt: serverTimestamp()
    });
    if (id) {
      await updateDoc(doc(db, 'templates', id), data);
      addToast({ type: 'success', title: 'Template Updated' });
    } else {
      await addDoc(collection(db, 'templates'), { ...data, createdAt: serverTimestamp() });
      addToast({ type: 'success', title: 'Template Created' });
    }
  }, [authUser, addToast]);

  const deleteTemplate = useCallback(async (id: string) => {
    await deleteDoc(doc(db, 'templates', id));
    addToast({ type: 'info', title: 'Template Removed' });
  }, [addToast]);

  const sendDailyStandup = useCallback(async (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !team.dailySummaryWebhook) {
        addToast({ type: 'error', title: 'Stand-up Failed', message: 'Daily webhook not configured.' });
        return;
    }

    const statusReport = (team.statuses || []).map(s => {
        const user = allUsers.find(u => u.id === s.userId);
        const name = user?.name || user?.email || 'Unknown Agent';
        const emoji = s.type === 'working' ? '🚀' : s.type === 'ooo' ? '🏖️' : '🎉';
        return `• ${name}: ${emoji} ${s.status}`;
    }).join('\n');

    const message = `🌅 **Daily Team Pulse: ${team.name}**\n\n` +
        `Current status report for the unit:\n\n${statusReport || 'No member data available.'}\n\n` +
        `*Sync complete. Back to the mission.*`;

    await sendGoogleChatNotification(team.dailySummaryWebhook, message, `team_${team.id}_standup`);
    addToast({ type: 'success', title: 'Stand-up Broadcasted' });
  }, [teams, allUsers, addToast, sendGoogleChatNotification]);

  const triggerDailySummary = useCallback(async (teamId: string) => {
    try {
      console.log(`[DAILY_SUMMARY] Triggering manual summary for team: ${teamId}`);
      const functions = getFunctions(app);
      const triggerFn = httpsCallable(functions, 'triggerDailySummaryManually');
      const result = await triggerFn({ teamId });
      
      console.log("[DAILY_SUMMARY] Trigger result:", result.data);
      
      const data = result.data as { success: boolean; message?: string; results?: { status: string; teamId: string; error?: string }[] };
      if (data.success) {
          const errorResults = (data.results || []).filter(r => r.status === 'error');
          if (errorResults.length > 0) {
              addToast({ 
                  type: 'warning', 
                  title: 'Summary Partially Failed', 
                  message: `Transmission initiated, but ${errorResults.length} errors occurred. Check logs.` 
              });
          } else {
              addToast({ 
                  type: 'success', 
                  title: 'Daily Summary Triggered', 
                  message: data.message || 'The transmission has been initiated.' 
              });
          }
      } else {
          addToast({ 
              type: 'error', 
              title: 'Trigger Failed', 
              message: data.message || 'The backend reported a failure.' 
          });
      }
    } catch (error: unknown) {
      console.error("[DAILY_SUMMARY] Error triggering daily summary:", error);
      
      // Firebase HttpsError has code, message, and details
      const err = error as { code?: string; message?: string; details?: unknown };
      const code = err.code || 'unknown';
      const message = err.message || 'Check console for details.';
      const details = err.details ? ` Details: ${typeof err.details === 'string' ? err.details : JSON.stringify(err.details)}` : '';
      
      addToast({ 
          type: 'error', 
          title: `Trigger Failed (${code})`, 
          message: `${message}${details}` 
      });
    }
  }, [addToast]);

  const sendWeeklySummary = useCallback(async (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !team.weeklySummaryWebhook) {
        addToast({ type: 'error', title: 'Summary Failed', message: 'Weekly webhook not configured for this team.' });
        return;
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // 1. Completed Tasks
    const completedTasks = allTasks.filter(t => {
        if (!t.isCompleted || !t.updatedAt) return false;
        const updatedAt = t.updatedAt instanceof Date ? t.updatedAt : 
                         (typeof (t.updatedAt as { toDate?: () => Date }).toDate === 'function') ? (t.updatedAt as { toDate: () => Date }).toDate() : 
                         new Date(t.updatedAt as string | number | Date);
        return updatedAt >= oneWeekAgo && projects.find(p => p.id === t.projectId)?.teamId === teamId;
    });

    // 2. New Projects
    const newProjects = projects.filter(p => {
        if (p.teamId !== teamId || !p.createdAt) return false;
        const createdAt = p.createdAt instanceof Date ? p.createdAt : 
                         (typeof (p.createdAt as { toDate?: () => Date }).toDate === 'function') ? (p.createdAt as { toDate: () => Date }).toDate() : 
                         new Date(p.createdAt as string | number | Date);
        return createdAt >= oneWeekAgo;
    });

    // 3. Goal Progress
    const goalUpdates = (team.goals || []).map(g => `${g.title}: ${g.progress}%`).join('\n');

    const message = `📊 **Weekly Performance Summary: ${team.name}**\n\n` +
        `✅ **Mission Accomplished:** ${completedTasks.length} tasks secured this week.\n` +
        `🏗️ **New Frontiers:** ${newProjects.length} projects initiated.\n\n` +
        `🚧 **Current Blockers:**\n${allTasks.filter(t => t.isBlocked && projects.find(p => p.id === t.projectId)?.teamId === teamId).map(t => `• ${t.title}`).join('\n') || 'No active blockers reported.'}\n\n` +
        `🎯 **Objective Status:**\n${goalUpdates || 'No active goals tracked.'}\n\n` +
        `*Transmission generated by Hub Intelligence Protocol.*`;

    await sendGoogleChatNotification(team.weeklySummaryWebhook, message, `team_${team.id}_weekly`);
    addToast({ type: 'success', title: 'Weekly Summary Dispatched' });
  }, [teams, allTasks, projects, addToast, sendGoogleChatNotification]);

  const addSubtask = useCallback(async (tid: string, title: string) => {
    await updateDoc(doc(db, 'tasks', tid), { 
      subtasks: arrayUnion(scrubAndConvert({ 
        id: Date.now().toString(), 
        title, 
        isCompleted: false 
      })) 
    });
  }, []);

  const updateSubtask = useCallback(async (tid: string, sid: string, u: Partial<Subtask>) => {
    const task = allTasksRef.current.find(t => t.id === tid);
    if (!task) return;

    const oldSubtask = (task.subtasks || []).find(s => s.id === sid);
    if (oldSubtask && u.assigneeIds && authUser) {
        const newAssignees = u.assigneeIds.filter(uid => !(oldSubtask.assigneeIds || []).includes(uid));
        for (const uid of newAssignees) {
            if (uid !== authUser.id) {
                createNotification(uid, 'assignment', `Assigned you to subtask: ${oldSubtask.title}`, { 
                  taskId: tid, 
                  projectId: task.projectId, 
                  taskTitle: task.title, 
                  link: `view=project&id=${task.projectId}&taskId=${tid}` 
                });
                
                // External Notification
                notifyUserExternally(uid, `🎯 **New Subtask Assignment: ${oldSubtask.title}**\n\nYou have been assigned to this subtask in **${task.title}** by ${authUser.name}.\n\n*Project: ${projects.find(p => p.id === task.projectId)?.name || 'Unknown'}*`, 'assignments');
            }
        }
    }

    await updateDoc(doc(db, 'tasks', tid), {
      subtasks: (task.subtasks || []).map(s => s.id === sid ? { ...s, ...u } : s)
    });
  }, [authUser, projects, createNotification, notifyUserExternally]);

  const deleteSubtask = useCallback(async (tid: string, sid: string) => {
    const task = allTasksRef.current.find(t => t.id === tid);
    if (task) {
      await updateDoc(doc(db, 'tasks', tid), {
        subtasks: (task.subtasks || []).filter(s => s.id !== sid)
      });
    }
  }, []);

  const value = useMemo(() => ({
    currentUser: authUser, allUsers, projects, selectedProject, teams, selectedTeam, tasks: projectTasks, allTasks, dashboardTasks, googleTasks, teamChatMessages, notifications, templates, availabilityBlocks, idealBlocks, habits, habitLogs, checklist, idealWeekSettings, projectDocuments, forms, activeView, projectSubView, isLoading, isGlobalSearchOpen, viewingTask, viewingLead, viewingFile, isFileViewerOpen, editingTask, isCreatingProject, isCreatingTeam, isCreatingLead, isManagingTeamMembers, isSettingAvailability, editingTemplate, templateToApply, templateToApplyToTask, generatingSubtasksForTask, newTaskData, creatingProjectForTeamId, focusState, selectedTaskIds, tableViewConfig, cardVisibilityConfig, archivedProjects, setActiveView, setProjectSubView, selectProject, selectTeam, createProject, updateProject, deleteProject, archiveProject, restoreProject, createTeam, updateTeam, sendTeamChatMessage, createForm, updateForm, deleteForm, fetchFormResponses, createDocument, updateDocument, deleteDocument, addTask, updateTask, recurTask, deleteTask, bulkUpdateTasks, bulkDeleteTasks, toggleTaskSelection, clearTaskSelection, addComment, 
    addAttachment: async (tid: string, att: Attachment) => {
        const task = allTasks.find(t => t.id === tid);
        await updateDoc(doc(db, 'tasks', tid), { attachments: arrayUnion(scrubAndConvert(att)) });
        if (task && task.projectId) {
            const project = projects.find(p => p.id === task.projectId);
            if (project?.teamId || project?.integrations?.googleChatWebhook) {
                triggerTeamAlert(project?.teamId, `📁 **New Asset Deposited: ${att.name}**\n\nA new file has been added to the repository for **${task.title}**.\n\n*Project: ${project?.name}*`, undefined, project?.id);
            }
        }
    }, 
    addSubtask, 
    updateSubtask, 
    deleteSubtask, 
    addBatchSubtasks, openAiSubtaskGenerator: (t: Task) => setGeneratingSubtasksForTask(t), closeAiSubtaskGenerator: () => setGeneratingSubtasksForTask(null), editTask, openCreateLeadModal, closeCreateLeadModal, viewTask, viewLead, closeTaskDetail, closeLeadInfo, closeModals, fetchTaskById, markNotificationsAsRead, clearAllNotifications, openGlobalSearch, closeGlobalSearch, openCreateProjectModal, closeCreateProjectModal, openCreateTeamModal, closeCreateTeamModal, openManageTeamMembersModal, closeManageTeamMembersModal, openSetAvailabilityModal, closeSetAvailabilityModal, updateUserProfile, logHabit, createHabit, addChecklistItem, toggleChecklistItem, removeChecklistItem, clearCompletedChecklistItems,
    viewFile, closeFileViewer,
    addTeamFile: async (tid: string, f: Attachment) => {
        await updateDoc(doc(db, 'teams', tid), { files: arrayUnion(scrubAndConvert(f)) });
        const team = teams.find(t => t.id === tid);
        if (team) {
            triggerTeamAlert(tid, `📁 **New Team Asset: ${f.name}**\n\nA new file has been added to the **${team.name}** shared resources by ${authUser?.name || 'a team member'}.`);
        }
    },
    deleteTeamFile: async (tid: string, fid: string) => { const team = teams.find(t => t.id === tid); if (team) await updateDoc(doc(db, 'teams', tid), { files: (team.files || []).filter(f => f.id !== fid) }); },
    addExpenseToTask, deleteExpenseFromTask, toggleClaimOnSlot: async () => { /* logic */ }, copyTaskDateToGoogleCalendar: async () => { /* logic */ },
    saveTemplate, deleteTemplate, openTemplateModal: (t: Template | 'new') => setEditingTemplate(t), closeTemplateModal: () => setEditingTemplate(null),
    openApplyTemplateModal: (t: Template) => setTemplateToApply(t), closeApplyTemplateModal: () => setTemplateToApply(null), applyTemplate,
    openApplyTemplateToTaskModal: (t: Task) => setTemplateToApplyToTask(t), closeApplyTemplateToTaskModal: () => setTemplateToApplyToTask(null), applyTemplateToTask,
    requestReview,
    sendWeeklySummary,
    syncWithGoogleCalendar: async () => { /* logic */ },
    fetchGoogleTasks,
    generateMissingShareTokens: async () => {
        const batch = writeBatch(db);
        let hasChanges = false;
        let count = 0;

        for (const task of allTasks) {
            if (!task.isPubliclyShareable || !task.shareToken) {
                const shareToken = Math.random().toString(36).substr(2, 9);
                
                // Update task
                const taskRef = doc(db, 'tasks', task.id);
                batch.update(taskRef, { isPubliclyShareable: true, shareToken });
                
                // Create public_checklist
                const checklistRef = doc(db, 'public_checklists', shareToken);
                batch.set(checklistRef, {
                    taskId: task.id,
                    title: task.title,
                    subtasks: task.subtasks || [],
                    shareToken: shareToken,
                    createdAt: serverTimestamp()
                });
                hasChanges = true;
                count++;
            }
        }

        if (hasChanges) {
            await batch.commit();
            addToast({ type: 'success', title: 'Tokens Generated', message: `Generated ${count} share tokens.` });
        } else {
            addToast({ type: 'info', title: 'No Changes', message: 'All tasks already have share tokens.' });
        }
    },
    startFocusSession: (task: Task) => setFocusState({ isActive: true, taskId: task.id, timeLeft: 25 * 60, isPaused: false }),
    updateFocusTime: (timeLeft: number) => setFocusState(prev => ({ ...prev, timeLeft })),
    pauseFocusSession: () => setFocusState(prev => ({ ...prev, isPaused: !prev.isPaused })),
    stopFocusSession: () => setFocusState({ isActive: false, taskId: null, timeLeft: 25 * 60, isPaused: false }),
    setDashboardLayout: () => { /* logic */ },
    backupTeamToDrive: async () => { /* logic */ },
    reorderTasksInColumn: async (statusId: string, taskIds: string[]) => {
      const batch = writeBatch(db);
      taskIds.forEach((id, index) => {
        batch.update(doc(db, 'tasks', id), { order: index });
      });
      await batch.commit();
    },
    setTableViewConfig: (config: TableViewColumnConfig[]) => setTableViewConfig(config),
    setCardVisibilityConfig: (config: { showSubtasks: boolean; showPriority: boolean; showDueDate: boolean; showAssignees: boolean }) => setCardVisibilityConfig(config),
    defaultTableViewConfig: DEFAULT_TABLE_CONFIG,
    updateIdealWeekSettings: async (s: Partial<IdealWeekSettings>) => {
      setIdealWeekSettings(prev => ({ ...prev, ...s }));
    },
    addAvailabilityBlock: async (b: Omit<AvailabilityBlock, 'id'>) => { await addDoc(collection(db, 'availabilityBlocks'), scrubAndConvert({ ...b, createdAt: serverTimestamp() })); },
    deleteAvailabilityBlock: async (id: string) => { await deleteDoc(doc(db, 'availabilityBlocks', id)); },
    addIdealBlock: async (b: Omit<IdealBlock, 'id'>) => { await addDoc(collection(db, 'ideal_weeks'), scrubAndConvert({ ...b, userId: authUser?.id, createdAt: serverTimestamp() })); },
    updateIdealBlock: async (id: string, u: Partial<IdealBlock>) => { await updateDoc(doc(db, 'ideal_weeks', id), scrubAndConvert(u)); },
    deleteIdealBlock: async (id: string) => { await deleteDoc(doc(db, 'ideal_weeks', id)); },
    sendDailyStandup, triggerDailySummary, triggerTeamAlert, notifyUserExternally, createNotification, sendGoogleChatNotification, addToast
  }), [authUser, allUsers, projects, selectedProject, teams, selectedTeam, projectTasks, allTasks, dashboardTasks, googleTasks, teamChatMessages, notifications, templates, availabilityBlocks, idealBlocks, habits, habitLogs, checklist, idealWeekSettings, projectDocuments, forms, activeView, projectSubView, isLoading, isGlobalSearchOpen, viewingTask, viewingLead, viewingFile, isFileViewerOpen, editingTask, isCreatingProject, isCreatingTeam, isCreatingLead, isManagingTeamMembers, isSettingAvailability, editingTemplate, templateToApply, templateToApplyToTask, generatingSubtasksForTask, newTaskData, creatingProjectForTeamId, focusState, selectedTaskIds, tableViewConfig, cardVisibilityConfig, archivedProjects, setActiveView, setProjectSubView, selectProject, selectTeam, createProject, updateProject, deleteProject, archiveProject, restoreProject, createTeam, updateTeam, sendTeamChatMessage, createForm, updateForm, deleteForm, fetchFormResponses, createDocument, updateDocument, deleteDocument, addTask, updateTask, deleteTask, bulkUpdateTasks, bulkDeleteTasks, toggleTaskSelection, clearTaskSelection, addComment, addBatchSubtasks, addSubtask, updateSubtask, deleteSubtask, closeModals, closeTaskDetail, closeLeadInfo, editTask, openCreateLeadModal, closeCreateLeadModal, viewTask, viewLead, fetchTaskById, markNotificationsAsRead, clearAllNotifications, openGlobalSearch, closeGlobalSearch, openCreateProjectModal, closeCreateProjectModal, openCreateTeamModal, closeCreateTeamModal, openManageTeamMembersModal, closeManageTeamMembersModal, openSetAvailabilityModal, closeSetAvailabilityModal, updateUserProfile, logHabit, createHabit, addChecklistItem, toggleChecklistItem, removeChecklistItem, clearCompletedChecklistItems, viewFile, closeFileViewer, addExpenseToTask, deleteExpenseFromTask, applyTemplate, applyTemplateToTask, saveTemplate, deleteTemplate, fetchGoogleTasks, requestReview, sendWeeklySummary, recurTask, sendDailyStandup, triggerDailySummary, triggerTeamAlert, notifyUserExternally, createNotification, sendGoogleChatNotification, addToast]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};