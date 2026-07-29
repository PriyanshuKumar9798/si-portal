// Support data model — ported verbatim from the Franchisee Ops app
// (`Burger Singh Operations Platform 2/src/app/pages/Support.tsx`) so the SI
// Portal Support is a 1:1 mirror. Types, view IDs, category trees, and seed
// data are copied intact; only the render surface differs (RN Web + our
// theme tokens instead of Tailwind).
//
// When wiring the backend, this file (plus `LAYOUTS`) is exactly what a real
// /api/v1/tickets endpoint needs to return — see `NewTicketDraft` at the
// bottom for the POST body.

import type { ComponentType } from 'react';
import {
  IconPhone, IconMail, IconGlobe, IconTwitter, IconFacebook,
  IconMessageCircle, IconUsers, IconMessageSquare, IconInstagram,
  IconSandwich, IconTag,
  IconWrench, IconBarChart3, IconShieldCheck, IconMonitor, IconHammer,
  IconMegaphone, IconBoxes, IconPackage, IconClipboardList, IconTrendingUp,
  IconTruck, IconGraduationCap, IconBriefcase, IconScale, IconCreditCard,
  IconFileText,
} from '../components/icons';

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserStatus = 'open' | 'on-hold' | 'closed';
export type Department = 'BurgerSingh - Live Stores' | 'BurgerSingh - Onboarding Stores';
export type Channel =
  | 'Phone' | 'Email' | 'Web' | 'Twitter' | 'Facebook' | 'Chat'
  | 'Forums' | 'Feedback Widget' | 'Instagram' | 'Burger Singh' | 'Burger Singh Offers';
export type SortKey = 'recentThread' | 'createdTime';
export type DraftBadge = 'Incoming ( Email )' | 'Web' | null;

export interface Reply {
  from: 'You' | 'Corporate';
  authorName?: string;
  channel: Channel;
  whenAbs: string;
  whenRel: string;
  text: string;
  attachments?: string[];
  draftBadge?: DraftBadge;
}

export interface UserTicket {
  id: string;
  subject: string;
  description: string;
  status: UserStatus;
  department: Department;
  channel: Channel;
  complaintCategoryPath: string;
  assignedTo: string;
  raisedByMe: boolean;
  ccMe: boolean;
  secondaryContacts: string[];
  emailRequester: string;
  createdAbs: string;
  createdAt: number;
  lastThreadAt: number;
  overdueAt: number | null;
  replies: Reply[];
}

export type ViewKey =
  | 'myTickets' | 'myOpen' | 'myClosed' | 'myOnHold' | 'myOverdue'
  | 'ccTickets' | 'ccOpen' | 'ccClosed' | 'ccOnHold' | 'ccOverdue';

export interface ViewDef { key: ViewKey; label: string; group: 'my' | 'cc'; viewId: string }

// ─── VIEWS · DEPARTMENTS · CHANNELS ─────────────────────────────────────────
// View IDs match the live Zoho instance so the same router URLs would work.

export const VIEWS: ViewDef[] = [
  { key: 'myTickets',  label: 'My Tickets',           group: 'my', viewId: '125360000000171047' },
  { key: 'myOpen',     label: 'My Open Tickets',      group: 'my', viewId: '125360000000171095' },
  { key: 'myClosed',   label: 'My Closed Tickets',    group: 'my', viewId: '125360000000171143' },
  { key: 'myOnHold',   label: 'My On Hold Tickets',   group: 'my', viewId: '125360000000171191' },
  { key: 'myOverdue',  label: 'My Overdue Tickets',   group: 'my', viewId: '125360000000171242' },
  { key: 'ccTickets',  label: "CC'd Tickets",         group: 'cc', viewId: '125360000000171527' },
  { key: 'ccOpen',     label: "CC'd Open Tickets",    group: 'cc', viewId: '125360000000171572' },
  { key: 'ccClosed',   label: "CC'd Closed Tickets",  group: 'cc', viewId: '125360000000171617' },
  { key: 'ccOnHold',   label: "CC'd On Hold Tickets", group: 'cc', viewId: '125360000000171662' },
  { key: 'ccOverdue',  label: "CC'd Overdue Tickets", group: 'cc', viewId: '125360000000171710' },
];

export const DEPARTMENTS: Department[] = [
  'BurgerSingh - Live Stores',
  'BurgerSingh - Onboarding Stores',
];

type IconType = ComponentType<{ size?: number; color?: string }>;

export const CHANNELS: { name: Channel; icon: IconType }[] = [
  { name: 'Phone',                icon: IconPhone },
  { name: 'Email',                icon: IconMail },
  { name: 'Web',                  icon: IconGlobe },
  { name: 'Twitter',              icon: IconTwitter },
  { name: 'Facebook',             icon: IconFacebook },
  { name: 'Chat',                 icon: IconMessageCircle },
  { name: 'Forums',               icon: IconUsers },
  { name: 'Feedback Widget',      icon: IconMessageSquare },
  { name: 'Instagram',            icon: IconInstagram },
  { name: 'Burger Singh',         icon: IconSandwich },
  { name: 'Burger Singh Offers',  icon: IconTag },
];
export const channelIcon = (c: Channel): IconType =>
  CHANNELS.find((x) => x.name === c)?.icon ?? IconGlobe;

export const SORT_LABELS: Record<SortKey, string> = {
  recentThread: 'Recent thread',
  createdTime:  'Created time',
};

// ─── Category trees — different per Department (Zoho parity) ─────────────────

export interface CategoryNode { name: string; children?: CategoryNode[] }

export const LIVE_STORES_CATEGORIES: CategoryNode[] = [
  { name: 'Equipment' },
  { name: 'Analytics' },
  { name: 'Audit' },
  { name: 'Finance' },
  { name: 'IT', children: [
    { name: 'POS Hardware Issues' },
    { name: 'Internet not working' },
    { name: 'POS slow/not working' },
    { name: 'CCTV not working' },
    { name: 'DMB/TV Screen not working' },
    { name: 'Transfer out and Add Requests' },
  ]},
  { name: 'Maintenance' },
  { name: 'Marketing' },
  { name: 'Operations' },
  { name: 'Products' },
  { name: 'Projects' },
  { name: 'Revenue and Growth' },
  { name: 'Supply Chain' },
  { name: 'Training' },
  { name: 'Business Development' },
  { name: 'HR' },
];

export const ONBOARDING_CATEGORIES: CategoryNode[] = [
  { name: 'Compliance', children: [{ name: 'Licenses' }] },
  { name: 'Finance', children: [
    { name: 'Bills' },
    { name: 'Company Formation' },
    { name: 'Paytm' },
  ]},
  { name: 'HR' },
  { name: 'IT' },
  { name: 'Legal' },
  { name: 'Management' },
  { name: 'Marketing' },
  { name: 'Projects' },
  { name: 'Supply chain' },
  { name: 'Training' },
  { name: 'TPA' },
  { name: 'Operations' },
];

export type OnboardingPriority = 'Urgent' | 'High' | 'Medium';
export const ONBOARDING_PRIORITIES: OnboardingPriority[] = ['Urgent', 'High', 'Medium'];

export interface LayoutConfig {
  departmentId: string;
  layoutId: string;
  hasCCs: boolean;
  categoryLabel: string;
  categories: CategoryNode[];
  hasPriority: boolean;
  priorityLabel?: string;
  priorityOptions?: string[];
}

export const LAYOUTS: Record<Department, LayoutConfig> = {
  'BurgerSingh - Live Stores': {
    departmentId: '125360000000010772',
    layoutId:     '125360000000011350',
    hasCCs:        true,
    categoryLabel: 'Complaint Category',
    categories:    LIVE_STORES_CATEGORIES,
    hasPriority:   false,
  },
  'BurgerSingh - Onboarding Stores': {
    departmentId: '125360000000010773',
    layoutId:     '125360000000011358',
    hasCCs:        false,
    categoryLabel: 'Onboarding Complaints Category',
    categories:    ONBOARDING_CATEGORIES,
    hasPriority:   true,
    priorityLabel: 'Priority_onboarding',
    priorityOptions: ONBOARDING_PRIORITIES,
  },
};

// ─── Category icon map ────────────────────────────────────────────────────
export const CATEGORY_ICON: Record<string, IconType> = {
  'Equipment': IconWrench,
  'Analytics': IconBarChart3,
  'Audit': IconShieldCheck,
  'Finance': IconCreditCard,
  'IT': IconMonitor,
  'Maintenance': IconHammer,
  'Marketing': IconMegaphone,
  'Operations': IconBoxes,
  'Products': IconPackage,
  'Projects': IconClipboardList,
  'Revenue and Growth': IconTrendingUp,
  'Supply Chain': IconTruck,
  'Supply chain': IconTruck,
  'Training': IconGraduationCap,
  'Business Development': IconBriefcase,
  'HR': IconUsers,
  'Compliance': IconShieldCheck,
  'Legal': IconScale,
  'Management': IconBriefcase,
  'TPA': IconCreditCard,
};
export const categoryIcon = (name: string): IconType => CATEGORY_ICON[name] ?? IconFileText;

// ─── Current user ────────────────────────────────────────────────────────
export const ME = { name: 'anandra32', email: 'anandra32@gmail.com', displayName: 'Oultet Anand' };

// ─── Time helpers ────────────────────────────────────────────────────────
// NOW is a frozen reference clock. It matches the SEED data's "days ago"
// numbers so relative timestamps stay stable across reloads (same as the
// Franchisee Support). When we wire the backend, swap NOW → Date.now().
export const NOW = new Date('2026-06-19T12:00:00+05:30').getTime();
export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
const ago = (ms: number) => NOW - ms;

// ─── Seed data — 8 tickets, verbatim from Franchisee Support ─────────────
export const SEED: UserTicket[] = [
  {
    id: '68245',
    subject: 'DMB not working',
    description: 'Checked all the network connection, 1 out of 5 DMBs not working',
    status: 'open',
    department: 'BurgerSingh - Live Stores',
    channel: 'Web',
    complaintCategoryPath: 'IT > DMB/TV Screen not working',
    assignedTo: 'Yaman Bhatia',
    raisedByMe: true, ccMe: false,
    secondaryContacts: ['ankit.sharma'],
    emailRequester: 'anandra32@gmail.com',
    createdAbs: '17 Jun 2026 10:44 AM',
    createdAt: ago(2 * DAY + 1 * HOUR),
    lastThreadAt: ago(2 * DAY),
    overdueAt: null,
    replies: [
      { from: 'Corporate', authorName: 'Apurva Mishra', channel: 'Email', whenAbs: '17 Jun 2026 10:48 AM', whenRel: '2 days ago',
        text: 'Kindly share the video',
        draftBadge: 'Incoming ( Email )' },
    ],
  },
  {
    id: '67872',
    subject: 'Store set up not completed',
    description: 'Construction is delayed. Need an update on next steps from corporate.',
    status: 'on-hold',
    department: 'BurgerSingh - Onboarding Stores',
    channel: 'Web',
    complaintCategoryPath: 'Operations',
    assignedTo: 'Sunil Kumar',
    raisedByMe: true, ccMe: false,
    secondaryContacts: [],
    emailRequester: 'anandra32@gmail.com',
    createdAbs: '12 Jun 2026 4:06 PM',
    createdAt: ago(6 * DAY),
    lastThreadAt: ago(6 * DAY),
    overdueAt: ago(3 * DAY),
    replies: [
      { from: 'Corporate', authorName: 'Sunil Kumar', channel: 'Email', whenAbs: '13 Jun 2026 11:00 AM', whenRel: '6 days ago',
        text: 'Vendor reschedule confirmed for 22 Jun. Will share the timeline by tomorrow.' },
    ],
  },
  {
    id: '67704',
    subject: 'No staff at store',
    description: 'Two team members absent today. Coverage needed for evening peak.',
    status: 'open',
    department: 'BurgerSingh - Onboarding Stores',
    channel: 'Web',
    complaintCategoryPath: 'HR',
    assignedTo: 'unassigned',
    raisedByMe: true, ccMe: false,
    secondaryContacts: [],
    emailRequester: 'anandra32@gmail.com',
    createdAbs: '10 Jun 2026 4:27 PM',
    createdAt: ago(8 * DAY),
    lastThreadAt: ago(8 * DAY),
    overdueAt: ago(7 * DAY),
    replies: [],
  },
  {
    id: '67500',
    subject: 'Damaged Equipment',
    description: 'Fryer #2 stopped heating. Inspection requested.',
    status: 'closed',
    department: 'BurgerSingh - Onboarding Stores',
    channel: 'Web',
    complaintCategoryPath: 'Equipment',
    assignedTo: 'Sushil Kumar',
    raisedByMe: true, ccMe: false,
    secondaryContacts: [],
    emailRequester: 'anandra32@gmail.com',
    createdAbs: '08 Jun 2026 3:35 PM',
    createdAt: ago(10 * DAY),
    lastThreadAt: ago(9 * DAY),
    overdueAt: ago(9 * DAY),
    replies: [
      { from: 'Corporate', authorName: 'Sushil Kumar', channel: 'Email', whenAbs: '09 Jun 2026 11:00 AM', whenRel: '9 days ago',
        text: 'Vendor visited. Element replaced. Closing the ticket.' },
    ],
  },
  {
    id: '67233',
    subject: 'POS not working',
    description: 'POS crashed during lunch peak. Customers waiting outside.',
    status: 'closed',
    department: 'BurgerSingh - Live Stores',
    channel: 'Web',
    complaintCategoryPath: 'IT > POS slow/not working',
    assignedTo: 'Yaman Bhatia',
    raisedByMe: true, ccMe: false,
    secondaryContacts: [],
    emailRequester: 'anandra32@gmail.com',
    createdAbs: '05 Jun 2026 3:34 PM',
    createdAt: ago(13 * DAY),
    lastThreadAt: ago(12 * DAY),
    overdueAt: null,
    replies: [
      { from: 'Corporate', authorName: 'Yaman Bhatia', channel: 'Email', whenAbs: '05 Jun 2026 4:00 PM', whenRel: '13 days ago',
        text: 'Restarting POS server now. Try again in 5 minutes.' },
      { from: 'You', channel: 'Web', whenAbs: '05 Jun 2026 4:18 PM', whenRel: '13 days ago',
        text: 'Working now. Thanks.' },
      { from: 'Corporate', authorName: 'Yaman Bhatia', channel: 'Email', whenAbs: '06 Jun 2026 9:30 AM', whenRel: '12 days ago',
        text: 'Glad it is sorted. Closing this ticket.' },
    ],
  },
  {
    id: '66265',
    subject: 'Invoice not received',
    description: 'Last month invoice not received. Need a copy for accounts.',
    status: 'closed',
    department: 'BurgerSingh - Live Stores',
    channel: 'Phone',
    complaintCategoryPath: 'Finance',
    assignedTo: 'Yaman Bhatia',
    raisedByMe: true, ccMe: false,
    secondaryContacts: [],
    emailRequester: 'anandra32@gmail.com',
    createdAbs: '26 May 2026 3:44 PM',
    createdAt: ago(23 * DAY),
    lastThreadAt: ago(22 * DAY),
    overdueAt: ago(17 * DAY),
    replies: [
      { from: 'Corporate', authorName: 'Yaman Bhatia', channel: 'Email', whenAbs: '27 May 2026 10:00 AM', whenRel: '22 days ago',
        text: 'Sent on email. Please check inbox.' },
    ],
  },
  {
    id: '66124',
    subject: 'Hood cleaning vendor visit',
    description: 'Vendor will visit on 18 Jun for hood cleaning. CC\'ing the franchisee for awareness.',
    status: 'open',
    department: 'BurgerSingh - Live Stores',
    channel: 'Web',
    complaintCategoryPath: 'Maintenance',
    assignedTo: 'Vinod Singh',
    raisedByMe: false, ccMe: true,
    secondaryContacts: ['anandra32'],
    emailRequester: 'outletmgr.cp@burgersingh.com',
    createdAbs: '15 Jun 2026 11:00 AM',
    createdAt: ago(4 * DAY),
    lastThreadAt: ago(3 * DAY),
    overdueAt: null,
    replies: [
      { from: 'Corporate', authorName: 'Vinod Singh', channel: 'Email', whenAbs: '16 Jun 2026 11:00 AM', whenRel: '3 days ago',
        text: 'Vendor confirmed for 18 Jun 10am.' },
    ],
  },
  {
    id: '65894',
    subject: 'Stock yet not on store',
    description: 'Supply truck delayed by 2 days. Outlet running low on essentials.',
    status: 'closed',
    department: 'BurgerSingh - Onboarding Stores',
    channel: 'Web',
    complaintCategoryPath: 'Supply Chain',
    assignedTo: 'SCM Department',
    raisedByMe: true, ccMe: false,
    secondaryContacts: [],
    emailRequester: 'anandra32@gmail.com',
    createdAbs: '22 May 2026 3:49 PM',
    createdAt: ago(27 * DAY),
    lastThreadAt: ago(26 * DAY),
    overdueAt: ago(25 * DAY),
    replies: [
      { from: 'Corporate', authorName: 'SCM Department', channel: 'Email', whenAbs: '23 May 2026 11:00 AM', whenRel: '26 days ago',
        text: 'Backup truck dispatched. Will reach outlet by EOD.' },
    ],
  },
];

// ─── Small utilities used across Support ────────────────────────────────

export function relTime(epoch: number): string {
  const diff = NOW - epoch;
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / HOUR);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / DAY);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} mo ago`;
}

export function fmtAbs(d: Date): string {
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Stable hash → color for user/CC avatars (10-color wheel).
export const AVATAR_COLORS = [
  '#dc2626', '#f97316', '#eab308', '#059669', '#2563eb',
  '#9333ea', '#ec4899', '#0d9488', '#4f46e5', '#0891b2',
];
export function avatarBg(name: string): string {
  const h = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// Predicate — a ticket is overdue if it's not closed and overdueAt is in the past.
export function isOverdueOf(t: UserTicket): boolean {
  return t.status !== 'closed' && t.overdueAt !== null && t.overdueAt < NOW;
}

// Matches a ticket against a canonical view. Copied verbatim from Franchisee.
export function matchesView(t: UserTicket, v: ViewKey): boolean {
  const sideMatches = v.startsWith('cc') ? t.ccMe : t.raisedByMe;
  if (!sideMatches) return false;
  switch (v) {
    case 'myTickets':  return true;
    case 'ccTickets':  return true;
    case 'myOpen':
    case 'ccOpen':     return t.status === 'open';
    case 'myClosed':
    case 'ccClosed':   return t.status === 'closed';
    case 'myOnHold':
    case 'ccOnHold':   return t.status === 'on-hold';
    case 'myOverdue':
    case 'ccOverdue':  return isOverdueOf(t);
  }
}

// ─── New-ticket API contract (backend-integration ready) ────────────────
export interface NewTicketDraft {
  department:    Department;
  categoryPath:  string;
  priority:      string;
  subject:       string;
  description:   string;
  cc:            string[];
  attachments:   string[];
}
export interface DraftError {
  field: keyof NewTicketDraft;
  message: string;
}
export function validateDraft(d: NewTicketDraft, layout: LayoutConfig): DraftError[] {
  const errs: DraftError[] = [];
  if (!d.categoryPath)   errs.push({ field: 'categoryPath', message: `Pick a ${layout.categoryLabel}: it helps route the ticket.` });
  if (!d.subject.trim()) errs.push({ field: 'subject',      message: 'Add a one-line Subject so corporate can spot it.' });
  if (d.subject.length > 120)     errs.push({ field: 'subject',     message: 'Subject is over 120 characters.' });
  if (d.description.length > 2000) errs.push({ field: 'description', message: 'Description is over 2,000 characters.' });
  return errs;
}
