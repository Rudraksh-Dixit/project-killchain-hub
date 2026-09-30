import {
  BookOpen,
  FileText,
  Fingerprint,
  LayoutDashboard,
  Library,
  Radar,
  Settings,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'IOC Explorer', to: '/iocs', icon: Fingerprint },
      { label: 'Hunt Library', to: '/hunts', icon: Radar },
    ],
  },
  {
    label: 'Research',
    items: [{ label: 'Knowledge Base', to: '/research', icon: BookOpen }],
  },
  {
    label: 'Arsenal',
    items: [
      { label: 'Tools', to: '/tools', icon: Wrench },
      { label: 'Resources', to: '/resources', icon: Library },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'Reports', to: '/reports', icon: FileText },
      { label: 'Community', to: '/community', icon: Users },
    ],
  },
  {
    label: 'System',
    items: [{ label: 'Settings', to: '/settings', icon: Settings }],
  },
];

const LABELS: Record<string, string> = {
  '': 'Dashboard',
  iocs: 'IOC Explorer',
  hunts: 'Hunt Library',
  research: 'Research',
  tools: 'Tools',
  resources: 'Resources',
  reports: 'Reports',
  community: 'Community',
  settings: 'Settings',
  login: 'Sign in',
};

export function breadcrumbLabel(segment: string): string {
  return LABELS[segment] ?? segment;
}
