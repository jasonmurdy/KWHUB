import { WorkflowStatus } from './types';

export const GOOGLE_CLIENT_ID = '274671963147-tjch7kkhotveudb7gjrhqv9untthl47n.apps.googleusercontent.com';
export const GOOGLE_PROJECT_NUMBER = '274671963147';
export const GOOGLE_PICKER_API_KEY = "AIzaSyDceesZatzsTxoo9xomrqm7QETDkyECfp0";

// Combined Scopes for Calendar, Drive, and Tasks + Identity
export const GOOGLE_API_SCOPES = [
    'openid',
    'profile',
    'email',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/tasks'
].join(' ');

export const PROJECT_COLORS = ['#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1'];

export const DEFAULT_WORKFLOW: WorkflowStatus[] = [
  { id: 'backlog', name: 'Backlog', color: '#94a3b8' },
  { id: 'todo', name: 'To Do', color: '#60a5fa' },
  { id: 'inprogress', name: 'In Progress', color: '#facc15' },
  { id: 'inreview', name: 'In Review', color: '#c084fc' },
  { id: 'done', name: 'Done', color: '#4ade80' },
];

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  workflow: WorkflowStatus[];
}

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'default',
    name: 'Default Kanban',
    description: 'A simple workflow for general purpose projects.',
    workflow: DEFAULT_WORKFLOW,
  },
  {
    id: 'software',
    name: 'Software Development',
    description: 'A workflow tailored for agile software development cycles.',
    workflow: [
      { id: 'backlog', name: 'Backlog', color: '#94a3b8' },
      { id: 'todo', name: 'To Do', color: '#60a5fa' },
      { id: 'inprogress', name: 'In Progress', color: '#facc15' },
      { id: 'codereview', name: 'Code Review', color: '#c084fc' },
      { id: 'testing', name: 'Testing', color: '#fb923c' },
      { id: 'done', name: 'Done', color: '#4ade80' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing Campaign',
    description: 'A workflow for planning and executing marketing campaigns.',
    workflow: [
      { id: 'ideas', name: 'Ideas', color: '#94a3b8' },
      { id: 'planning', name: 'Planning', color: '#60a5fa' },
      { id: 'inprogress', name: 'In Progress', color: '#facc15' },
      { id: 'approval', name: 'For Approval', color: '#c084fc' },
      { id: 'launched', name: 'Launched', color: '#4ade80' },
    ],
  },
  {
    id: 'listing',
    name: 'Real Estate Listing',
    description: 'Manage a property from listing to closing.',
    workflow: [
      { id: 'pre-listing', name: 'Pre-Listing', color: '#a78bfa' },
      { id: 'preparation', name: 'Preparation', color: '#60a5fa' },
      { id: 'live', name: 'Live on Market', color: '#facc15' },
      { id: 'under-contract', name: 'Under Contract', color: '#fb923c' },
      { id: 'closed', name: 'Closed', color: '#4ade80' },
      { id: 'archived', name: 'Archived', color: '#94a3b8' },
    ],
  },
  {
    id: 'buyer-transaction',
    name: 'Buyer Transaction Management',
    description: 'A workflow to guide a home buyer from search to close.',
    workflow: [
      { id: 'new-buyer', name: 'New Buyer', color: '#c084fc' },
      { id: 'searching', name: 'Actively Searching', color: '#60a5fa' },
      { id: 'offer-made', name: 'Offer Submitted', color: '#facc15' },
      { id: 'under-contract', name: 'Under Contract', color: '#fb923c' },
      { id: 'closed', name: 'Closed', color: '#4ade80' },
      { id: 'lost', name: 'Deal Lost', color: '#f87171' },
    ],
  },
  {
    id: 'agent-onboarding',
    name: 'Agent Onboarding',
    description: 'A process for onboarding new real estate agents to the brokerage.',
    workflow: [
      { id: 'candidate', name: 'Candidate', color: '#94a3b8' },
      { id: 'hiring', name: 'Hiring Process', color: '#60a5fa' },
      { id: 'onboarding', name: 'Onboarding & Setup', color: '#facc15' },
      { id: 'training', name: 'Training', color: '#c084fc' },
      { id: 'active', name: 'Active Agent', color: '#4ade80' },
      { id: 'inactive', name: 'Inactive/Offboarded', color: '#ef4444' },
    ],
  },
  {
    id: 'commercial-lease',
    name: 'Commercial Lease Agreement',
    description: 'Manage commercial property leasing from prospect to execution.',
    workflow: [
      { id: 'prospecting', name: 'Prospecting / LOI', color: '#94a3b8' },
      { id: 'due-diligence', name: 'Due Diligence', color: '#60a5fa' },
      { id: 'negotiation', name: 'Lease Negotiation', color: '#facc15' },
      { id: 'execution', name: 'Execution & Handover', color: '#c084fc' },
      { id: 'closed-leased', name: 'Closed / Leased', color: '#4ade80' },
      { id: 'dead-deal', name: 'Deal Fell Through', color: '#ef4444' },
    ],
  },
  {
    id: 'property-management',
    name: 'Property Management Onboarding',
    description: 'Onboard a new property and landlord into your management portfolio.',
    workflow: [
      { id: 'intake', name: 'New Client Intake', color: '#a78bfa' },
      { id: 'inspection', name: 'Property Inspection', color: '#60a5fa' },
      { id: 'listing-setup', name: 'Listing & Marketing Setup', color: '#facc15' },
      { id: 'tenant-screening', name: 'Tenant Screening', color: '#fb923c' },
      { id: 'active', name: 'Active Management', color: '#4ade80' },
      { id: 'offboarded', name: 'Client Offboarded', color: '#94a3b8' },
    ],
  },
  {
    id: 'open-house',
    name: 'Open House Management',
    description: 'Plan, execute, and follow up on a successful open house event.',
    workflow: [
      { id: 'planning', name: 'Planning & Promotion', color: '#c084fc' },
      { id: 'preparation', name: 'Staging & Prep', color: '#60a5fa' },
      { id: 'event-day', name: 'Event Day', color: '#facc15' },
      { id: 'follow-up', name: 'Lead Follow-up', color: '#fb923c' },
      { id: 'complete', name: 'Complete', color: '#4ade80' },
    ],
  },
];