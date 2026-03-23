export interface Habit {
  id: string;
  userId: string;
  title: string;
  targetCount: number;
  unit: string; // e.g., "Calls", "Notes", "Minutes"
  color: string;
  frequency: 'daily' | 'weekly';
  createdAt: Date;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  count: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
  createdAt: Date;
}

export interface VendorProfile {
  companyName?: string;
  serviceType?: string;
  website?: string;
  rating?: number;
  bookingUrl?: string; // Phase 4.1
}

export interface ComplianceDocument {
  id: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: Date;
  url: string;
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export interface WorkflowStatus {
  id: string;
  name: string;
  color: string;
}

export interface QuickLink {
  id: string;
  label: string;
  url: string;
  iconType: 'mls' | 'geo' | 'showing' | 'canva' | 'custom';
}

export interface IdealCategory {
  id: string;
  label: string;
  color: string;
  icon: string;
}

export interface NotificationPreferences {
  mentions: boolean;
  assignments: boolean;
  deadlines: boolean;
  goals: boolean;
  forms: boolean;
  handoffs: boolean;
  teamAlerts: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role?: string; 
  employmentType?: 'primary' | 'contractor'; 
  vendorProfile?: VendorProfile;             
  complianceDocs?: ComplianceDocument[];     
  googleCalendarEnabled?: boolean;
  googleDriveEnabled?: boolean;
  googleTasksEnabled?: boolean;
  googleCalendarEmail?: string | null;
  googleDriveEmail?: string | null;
  googleTasksEmail?: string | null;
  selectedTasksListId?: string | null;
  selectedTasksListName?: string | null;
  canvaEnabled?: boolean;
  calendarIntegrationType?: 'google' | 'outlook' | null;
  calendarEmbedUrl?: string | null;
  workingHours?: {
    start: string; 
    end: string;   
    days: number[]; 
  };
  defaultProjectView?: 'kanban' | 'list' | 'gantt' | 'table' | 'docs';
  themePreference?: string;
  googleChatWebhook?: string;
  notificationPreferences?: NotificationPreferences;
  quickLinks?: QuickLink[]; // Phase 1.3
  rootFinanceFolderId?: string; // Phase 4.3
  checklist?: ChecklistItem[]; // New Field for Local Scratchpad
  idealCategories?: IdealCategory[];
  showStrategicOverlay?: boolean;
}

export interface ChatMessage {
  id: string;
  teamId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: Date;
}

export type FormFieldType = 'text' | 'number' | 'email' | 'date' | 'select' | 'checkbox' | 'textarea' | 'file';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export interface FormStyle {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: 'Roboto' | 'Inter' | 'Cormorant Garamond' | 'Courier Prime';
  borderRadius: '0px' | '8px' | '16px' | '24px';
  logoUrl?: string; // Advanced UX
  headerImage?: string; // Advanced UX
}

export interface Form {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
  style?: FormStyle;
  projectId?: string;
  teamId?: string; // Added for Team Collaboration
  memberIds?: string[]; // Added for Team Collaboration Access
  isLeadForm?: boolean;
  isConversational?: boolean; // Advanced UX
  version: number; // Architecture improvement
  webhookUrl?: string; // Data Portability
  leadType?: 'Listing' | 'Consult';
  taskDefaults?: {
    status: string;
    priority: string;
    memberIds: string[];
    autoAssigneeId?: string; // Operational Automation
    autoApplyTemplateId?: string; // Operational Automation
    autoTags?: string[]; // Operational Automation
  };
  automation?: {
    enabled: boolean;
    leadMagnetUrl?: string;
    successMessage?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
  responseCount: number;
}

export interface FormResponse {
  id: string;
  formId: string;
  formTitle: string;
  projectId?: string;
  answers: Record<string, unknown>;
  submittedAt: Date;
  userAgent?: string;
}

export interface Document {
  id: string;
  projectId?: string;
  title: string;
  content: string; 
  authorId: string;
  editors?: string[]; 
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  user: User;
  text: string;
  timestamp: Date;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  fileType: 'drive' | 'link' | 'upload' | 'hub_doc';
  driveFileId?: string;
  iconUrl?: string;
  embedUrl?: string;
  docId?: string; 
  projectId?: string;
}

export interface SubtaskStep {
  id: string;
  title: string;
  isCompleted: boolean;
  link?: string;
  dependsOnStepIds?: string[];
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate?: Date;
  assigneeIds?: string[];
  steps?: SubtaskStep[];
  section?: string;
  notes?: string;
  attachments?: Attachment[];
}

export interface AuditLog {
  id: string;
  user: User;
  action: string;
  details?: string;
  timestamp: Date;
}

export interface JobContact {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  externalIds?: {
    commandId?: string; // Phase 1.2
  };
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: Date;
}

export interface RecruitmentSlot {
  roleId: string;
  roleName: string;
  countNeeded: number;
  filledBy: string[]; 
}

export interface RecruitmentSlot {
  roleId: string;
  roleName: string;
  countNeeded: number;
  filledBy: string[]; 
}

export interface RecruitmentConfig {
  isOpen: boolean;
  slots: RecruitmentSlot[];
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: string;
  priority: TaskPriority;
  startDate: Date;
  dueDate: Date;
  targetDate?: Date;
  eventDate?: Date;
  createdAt: Date;
  updatedAt?: Date;
  assigneeIds: string[];
  assignees: User[]; 
  reporterId?: string;
  tags?: string[];
  location?: string;
  jobValue?: number;
  isBlocked?: boolean;
  isUrgentDismissed?: boolean;
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'none';
  comments: Comment[];
  attachments: Attachment[];
  statusList: Subtask[]; 
  subtasks: Subtask[];
  auditTrail: AuditLog[];
  contacts?: JobContact[];
  expenses?: Expense[];
  recruitment?: RecruitmentConfig;
  customFieldValues?: Record<string, unknown>;
  dependsOn?: string[];
  googleCalendarEventId?: string;
  googleCalendarEventForEventDateId?: string;
  order: number;
  taskType?: 'Showing' | 'Listing' | 'Closing' | 'Consult' | 'General'; // Phase 3.3 / 4.4
  isPubliclyShareable?: boolean;
  shareToken?: string;
  isCompleted?: boolean;
}

export interface SavedFilter {
  id: string;
  name: string;
  filter: {
    keyword?: string;
    assigneeIds?: string[];
    priorities?: TaskPriority[];
  };
}

export interface TableViewColumnConfig {
  id: string;
  name: string;
  isVisible: boolean;
  type?: 'taskProperty' | 'customField';
  customFieldType?: string;
  customFieldOptions?: string[];
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  options?: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  ownerId?: string;
  workflow: WorkflowStatus[];
  customFields?: CustomFieldDefinition[];
  teamId?: string;
  memberIds?: string[];
  team: User[]; 
  isArchived?: boolean;
  complianceLink?: string; // Phase 2.1
  settings?: {
    enableVendorManagement?: boolean;
  };
  integrations?: {
    googleChatWebhook?: string;
  };
  createdAt?: Date;
}

export interface Notification {
  id: string;
  userId: string;
  actorName: string;
  actorAvatarUrl: string;
  message: string;
  type: 'deadline' | 'mention' | 'assignment' | 'goal' | 'form' | 'handoff';
  read: boolean;
  createdAt: Date;
  link?: string;      
  taskId?: string;    
  projectId?: string; 
  teamId?: string;
  taskTitle?: string;
}

export interface TeamGoal {
  id: string;
  title: string;
  progress: number;
  color: string;
  targetDate?: Date;
  status: 'on-track' | 'at-risk' | 'off-track';
  ownerId?: string;
  lastUpdate?: string;
  keyResults?: KeyResult[];
}

export interface KeyResult {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface MemberStatus {
  userId: string;
  status: string;
  updatedAt: Date;
  type: 'working' | 'ooo' | 'celebrating';
}

export interface TeamRole {
  id: string;
  name: string;
  memberIds: string[];
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  members: User[]; 
  statuses?: MemberStatus[];
  goals?: TeamGoal[];
  stakeholders?: JobContact[]; 
  roles?: TeamRole[];
  files?: Attachment[]; 
  dailySummaryWebhook?: string;
  weeklySummaryWebhook?: string;
  backupFolderId?: string;
  backupFolderName?: string;
}

export interface TemplateTask {
  id: string;
  title: string;
  description: string;
  assigneeRole?: string; 
  section?: string;
}

export interface TemplateLink {
  id: string;
  name: string;
  url: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  tasks: TemplateTask[];
  links: TemplateLink[];
  isShared: boolean;
  creatorId: string;
  creatorName?: string;
  teamId?: string;
}

export interface AvailabilityBlock {
  id: string;
  userId: string;
  teamId: string;
  startTime: Date;
  endTime: Date;
  title: string;
  type: 'OOO' | 'Focus Time' | 'Meeting';
}

export interface IdealBlock {
  id: string;
  userId: string;
  dayOfWeek: number; 
  startHour: number;
  duration: number;
  title: string;
  category: string; // References IdealCategory id
  color: string;
}

export interface IdealWeekSettings {
  startHour: number;
  endHour: number;
  showWeekends: boolean;
  weekStartMonday: boolean;
}